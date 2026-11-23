// Writes the long material of this entry's long tasks: the help-desk tickets that Liftbook's support team passed
// to the API team between late July and October 2026, one Markdown file each, under support/escalations/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, references and the topic mix all follow from it. */
const ITEMS = 375;

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
const num = (value: number) => String(Math.round(value * 100) / 100);
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, ',');

// Training maths, as Liftbook does it.
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const perSide = (total: number, bar = 20) => {
	let rest = (total - bar) / 2;
	const plates: number[] = [];
	for (const plate of PLATES)
		while (rest >= plate) {
			plates.push(plate);
			rest -= plate;
		}
	return plates;
};
const epley = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30) * 2) / 2;
const lbToKg = (lb: number) => Math.round(lb * 0.45359237 * 10) / 10;
const kgToLbShown = (kg: number) => Math.round(kg / 0.45359237);

// Dates. Tickets open between 27 July and 18 October 2026; the last replies land in early November.
const DAY = 86_400_000;
const MINUTE = 60_000;
const BASE = Date.UTC(2026, 6, 27);
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const stampOf = (t: number) => {
	const d = new Date(t);
	return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const dayOf = (t: number) => {
	const d = new Date(t);
	return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
};
const isoOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const weekdayOf = (t: number) => weekdays[new Date(t).getUTCDay()]!;

// People.
const supportTeam = ['Ines', 'Rory', 'Kemi', 'Mateus', 'Bea', 'Sunil', 'Freya'];
const apiTeam = ['Tamsin', 'Oskar', 'Priyanka', 'Lionel'];
const firstNames = ['Dana', 'Marcus', 'Aoife', 'Tomasz', 'Leila', 'Graham', 'Yuki', 'Ben', 'Carys', 'Femi', 'Hugo', 'Ingrid', 'Javier', 'Kirsty', 'Luca', 'Maya', 'Niall', 'Odile', 'Pete', 'Rania', 'Stuart', 'Tess', 'Umar', 'Vera', 'Wes', 'Xin', 'Zara', 'Amelia', 'Bilal', 'Chloe', 'Declan', 'Esme', 'Fraser', 'Gwen', 'Harvey', 'Isla', 'Jonas', 'Keisha', 'Lars', 'Meera', 'Nate', 'Orla', 'Paulo', 'Rosie', 'Sam', 'Theo', 'Uma', 'Vikram', 'Willa', 'Yasmin'];
const surnames = ['Kowalski', 'Hendry', 'Byrne', 'Nowak', 'Haddad', 'Pryce', 'Tanaka', 'Achterberg', 'Lloyd', 'Adeyemi', 'Marchand', 'Solberg', 'Ortega', 'McLeod', 'Ferraro', 'Patel', 'Doherty', 'Lefevre', 'Whitaker', 'Saleh', 'Gunn', 'Reyes', 'Iqbal', 'Novak', 'Brennan', 'Liu', 'Okafor', 'Sinclair', 'Aziz', 'Dufresne', 'Kerr', 'Lindgren', 'Moreau', 'Quinn', 'Rahman', 'Stewart', 'Vance', 'Weller', 'Yilmaz', 'Zielinski'];
const channels = ['the in-app form', 'the in-app form', 'email', 'the help centre form', 'the in-app form'];
const devices = ['iPhone 15, iOS 26.6', 'iPhone 13 mini, iOS 26.5', 'iPhone 16 Pro, iOS 26.6', 'Pixel 8, Android 16', 'Galaxy S23, Android 15', 'Galaxy A54, Android 15', 'OnePlus 12, Android 15', 'iPhone SE, iOS 26.4', 'Pixel 7a, Android 16', 'iPad Air, iPadOS 26.6'];
const appVersions = ['6.3.0', '6.3.1', '6.3.2', '6.3.2', '6.3.4', '6.4.0'];
const zones = ['Europe/London', 'Europe/London', 'Europe/Dublin', 'Europe/Berlin', 'America/New_York', 'America/Toronto', 'Australia/Sydney', 'Europe/Madrid'];

// Training vocabulary.
const mainLifts = ['Back squat', 'Bench press', 'Deadlift', 'Overhead press', 'Front squat', 'Sumo deadlift', 'Paused bench press', 'Close-grip bench press'];
const allLifts = [...mainLifts, 'Romanian deadlift', 'Barbell row', 'Pull-up', 'Chin-up', 'Dip', 'Hip thrust', 'Leg press', 'Lat pulldown', 'Incline dumbbell press', 'Bulgarian split squat', 'Face pull', 'Cable row', 'Goblet squat', 'Kettlebell swing', 'Calf raise', 'Leg curl', 'Lateral raise', 'Hammer curl'];
const routines = ['Strength A', 'Strength B', 'Push Pull Legs', 'Upper/Lower 4-day', 'Hypertrophy B', 'Meet prep block 3', 'Home dumbbells', 'Full body x3', 'Off-season', 'Bench specialisation', 'Deadlift focus', 'Hotel gym', 'Summer cut', 'Minimalist 2-day'];
const templates = ['5x5', 'Full body beginner', 'Push Pull Legs 6-day', 'Upper/Lower 4-day', 'Powerbuilding 12 weeks', 'Kettlebell basics', 'Linear progression', 'Three-day strength', 'Dumbbell only', 'Rowing club strength'];
const oldApps = ['Ironpad', 'RepJournal', 'Barnotes', 'Setkeeper'];
const missing: [string, string][] = [['Belt squat', 'Leg press'], ['Jefferson curl', 'Romanian deadlift'], ['Landmine press', 'Overhead press'], ['Reverse hyper', 'Back extension'], ['Zercher squat', 'Front squat'], ['Pendulum squat', 'Hack squat'], ['Copenhagen plank', 'Side plank'], ['Seal row', 'Barbell row'], ['Meadows row', 'Dumbbell row'], ['Safety bar squat', 'Back squat'], ['Snatch-grip deadlift', 'Deadlift'], ['Nordic curl', 'Leg curl']];
const duplicates: [string, string][] = [['Romanian deadlift', 'RDL'], ['Overhead press', 'Military press'], ['Chin-up', 'Chinup'], ['Hip thrust', 'Barbell hip thrust'], ['Lat pulldown', 'Pulldown'], ['Bulgarian split squat', 'Rear-foot elevated split squat'], ['Pendlay row', 'Dead-stop row']];
const categories: [string, string, string][] = [['Hip thrust', 'Back', 'Legs'], ['Face pull', 'Arms', 'Shoulders'], ["Farmer's carry", 'Arms', 'Full body'], ['Good morning', 'Legs', 'Back'], ['Ab wheel rollout', 'Chest', 'Core'], ['Dip', 'Arms', 'Chest'], ['Shrug', 'Back', 'Shoulders'], ['Kettlebell swing', 'Legs', 'Full body']];

type Outcome = 'answered' | 'owed' | 'fixed' | 'request' | 'waiting' | 'app';
type Art = 'calc' | 'sets' | 'max' | 'volume' | 'routine' | 'catalogue' | 'device';
type Trace = 'slow' | 'dupes' | 'batch' | 'session' | 'plain';
type Quirk = 'units' | 'dupes' | 'typo' | 'zero' | 'nosession' | 'single' | 'highreps' | 'year' | 'position' | 'template' | 'none';
type Slots = Record<string, string>;

interface Topic {
	weight: number;
	/** The member's subject lines: their first guess at what is wrong. */
	subjects: string[];
	/** How the member first puts it. */
	open: string[];
	/** Further facts the member gives later. */
	details: string[];
	/** Support's first reply, before anyone has looked properly. */
	first: string[];
	/** Support's internal note when passing the ticket on. */
	escalate: string[];
	/** The API team's first look: what they see, without a verdict. */
	dev: string[];
	/** More of the member's own context. */
	more: string[];
	/** What support tried on a test account, in order. */
	steps: string[];
	/** What the API team checked. */
	checks: string[];
	/** A question the API team asks the member through support, and the member's answer. */
	probe: [string, string][];
	art: Art;
	quirk: Quirk;
	trace: Trace;
	/** The topic as a quick side question in another ticket, and support's short answer. */
	quick: [string, string];
	exes?: string[];
	calc?: (r: Rand, s: Slots) => Slots;
	/** Outcome texts. A topic only ends in the outcomes it has text for. */
	explain?: string;
	bug?: string;
	fix?: string;
	fixHow?: string;
	wish?: string;
	need?: string;
	app?: string;
	/** Limits the outcomes when a text serves only some of them. */
	only?: Outcome[];
}

const topics: Topic[] = [
	{
		weight: 2,
		subjects: ['Plate calculator blank', 'Calculator shows nothing for warm-ups', 'Plates for the lighter bar?', 'Empty plate list', 'Bug in plate calculator'],
		open: [
			'When I type {light} kg into the plate calculator it shows an empty box. No plates, no message, nothing at all. I use it to plan my warm-up ladder and the first rung is always the bar or less, so I see this every single session.',
			'My gym has a {bar} kg technique bar that the newer members use, and I coach a couple of teenagers on it. I put their total into the calculator, {light} kg, and it gives an empty list. Is the calculator only meant for the 20 kg bar?',
			"Small thing, but it confused one of my clients this week. She entered {light} kg for her first overhead press set and the plates section came back blank. She thought the app had frozen and force-closed it twice before she asked me what was going on."
		],
		details: [
			'It does the same for anything under 20. I tried 19, 17.5 and 10 and got the same blank box each time. At exactly 20 it is also empty, which I suppose is fair, because that is just the bar.',
			'There is no setting for the bar weight that I can find. Our club has 20 kg bars, 15 kg bars and two 10 kg technique bars, so the 20 kg assumption only fits half the platform.',
			'I tried it in pounds as well, 35 lb, and that is blank too.',
			'If I put in {kg} kg it works perfectly and tells me exactly what to load, so it is only the light end that goes blank.'
		],
		first: [
			'I can reproduce this on my test account: any total at or below the bar comes back with no plates and no explanation, and I agree that looks broken.',
			'Thanks for the clear description. I see the same with {light} kg. The calculator works from a 20 kg bar at the moment, so there is nothing to load below that, but a blank box is not a helpful way to say so.'
		],
		escalate: [
			'Plate calculator: totals lighter than the bar give an empty plate list and no message. Member thought the app had crashed. Is it the API answering like that or the app hiding something? Third one of these this month.',
			'Member trains with a {bar} kg bar and gets nothing from the calculator for {light} kg. As far as I can see the app has no bar weight setting at all. Is the blank answer intended?'
		],
		dev: [
			'The answer comes from the API. It takes the bar off the total and splits what is left between the two sides. When what is left is negative no plate ever fits, so it returns an empty list with a 200, exactly as it would for an empty bar. The app has no way to tell the two apart.',
			'On staging, {light} kg returns an empty list and a 200, the same response as exactly 20 kg. The calculation does take a bar weight, defaulting to 20, but the app never sends one.'
		],
		more: ["For context, my squat warm-ups go bar, 40, 60, 80 and then work sets. For the teenagers I coach it is 15, 25, 35 on the light bar. The calculator is brilliant at the heavy end and useless at the start of the ladder, which is exactly where beginners need it.", "The reason I care is that I hand my phone to whoever is next on the platform so they can see what to load. A blank box gets me a puzzled look and an \"is it broken?\" every time."],
		steps: ["Opened the plate calculator on the test account (iOS, 6.4.0).", "Entered {light} kg: plates section blank, no message.", "Entered 20 kg: also blank.", "Entered {kg} kg: correct plates shown.", "Looked for a bar weight setting in the calculator and under Settings: none."],
		checks: ["Ran the calculation directly with {light} kg: empty list, status 200.", "Same with 20 kg: empty list, status 200. The two responses are identical.", "With a bar weight of 10 the same total gives plates, so the maths itself is fine."],
		probe: [["Does the calculator show anything at all for exactly 20 kg, or is that blank as well?", "Blank at 20 as well. At 22.5 it shows 1.25 a side, which is right."], ["Which bar do you load for those light totals?", "The {bar} kg technique bar mostly, and the 15 kg bar for the women's group."]],
		art: 'calc',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, is there a way to make the plate calculator use a 15 kg bar?', "There isn't a bar setting in the app yet, so the calculator always assumes a 20 kg bar."],
		calc: (r) => {
			const bar = pick(r, [15, 15, 10]);
			return { bar: String(bar), light: num(pick(r, [10, 12.5, 15, 17.5, 19, 7.5])) };
		},
		explain: 'The calculator always assumes a 20 kg bar, so below that there is genuinely nothing to load and the list stays empty. For a lighter bar, add the difference before you type the total: for a 15 kg bar and {kg} kg on it, enter {kgplus5} kg and the plates it shows are right for your bar.',
		bug: 'a total lighter than the bar is answered with an empty plate list instead of being refused with an error the app can show',
		wish: 'a bar weight setting for the plate calculator',
		need: 'a screen recording of the calculator and the app version from Settings, About'
	},
	{
		weight: 1,
		subjects: ["Calculator suggests plates I don't have", 'Home gym plates', 'Plate calculator and pounds', 'Can I set my own plates?'],
		open: [
			"I train in my garage and I don't have any 25s. I have pairs of 20, 10, 5 and 2.5, and one pair of 1.25s. The calculator keeps telling me to put a 25 on each side, so I end up doing the maths in my head anyway.",
			"I've set up a small gym in my garage with a second-hand set of plates. The calculator keeps suggesting 25s and 15s, neither of which I have, so I end up working it out on my phone's calculator anyway.",
			'Is there a way to tell the plate calculator which plates I actually have? My home set has no 25s and no 15s, so half of what it suggests is no use to me.'
		],
		details: [
			'For {kg} kg it told me {calcsay} a side. With my plates I would load it quite differently.',
			"I realise this is a niche thing, but most people who train at home have odd plate sets. Mine came second-hand from three different people.",
			"My gym has a few 0.5 kg fractional plates too, which would be lovely to include, but I would settle for not being told to use plates I don't have."
		],
		first: [
			"You're right that the calculator works from a fixed set of plates at the moment. Let me check with the developers whether anything is planned before I give you a proper answer.",
			"Thanks for this. I've tried {kg} kg myself and see the same suggestion. I'll ask the team whether the plate list can be changed anywhere."
		],
		escalate: [
			'Member wants the calculator to use the plates they actually have (no 25s at home). Is the plate list fixed on the server?',
			"Home gym member gets plate suggestions they can't load (no 25s or 15s). Is there anywhere the plate list could be set?"
		],
		dev: [
			'The plate list is fixed in the API: 25, 20, 15, 10, 5, 2.5 and 1.25 kg, heaviest first. There is no per-member list and no pound plates at all. For pounds the app converts the kilo answer, which is why people get suggestions like "20 + 2.5" for a 225 lb bar.',
			'Fixed list, heaviest first, kilos only. Nothing reads a preference, and there is nowhere to store one today.'
		],
		more: ["My plates: two 20s, two 10s, four 5s, two 2.5s and two 1.25s. That gets me to anything up to 105 kg in 2.5 kg steps if you load it sensibly, just never with a 25.", "I know the gym standard is a 25, but loads of people train at home now. Even being able to untick the plates I don't have would do it."],
		steps: ["Calculator on the test account with {kg} kg: suggests {calcsay} a side.", "Switched units to pounds and entered {lb} lb: the suggestion is in kilo plates.", "No plate settings in the calculator or under Settings."],
		checks: ["The plate list is a constant, the same for every request.", "No unit handling on our side: the answer is always in kilo plates."],
		probe: [["Which plates do you have, exactly, and in which unit?", "Pairs of 20, 10, 5 and 2.5, plus one pair of 1.25s, all in kilos. No 25s and no 15s."], ["Do you train in kilos or pounds day to day?", "Kilos at home, but I visit my brother's gym, which is all pounds."]],
		art: 'calc',
		quirk: 'none',
		trace: 'plain',
		quick: ['While I am here, can the plate calculator use pound plates?', "Not yet, I'm afraid. It works in kilo plates and converts."],
		calc: (r, s) => ({ calcsay: perSide(Number(s.kg)).join(' + ') || 'nothing' }),
		explain: "The calculator works from one fixed set of kilo plates, 25 kg down to 1.25 kg, and always picks the heaviest that fits. It can't be changed per person today, so when it suggests a plate you don't have, swap it for the next ones down: two 10s for a 20, or a 20 and a 5 for a 25.",
		wish: 'choosing which plates the calculator may use, pound plates included'
	},
	{
		weight: 2,
		subjects: ['Pounds rounding', 'My weights change after saving', 'History shows the wrong weight in lb', 'Microplate sets rounded up', '100 kg is not 220 lb'],
		open: [
			"I log in pounds. Today I benched {lbhalf} lb, using my 1.25 lb microplates, and the history shows {lbround} lb. It's small, but I'm adding 2.5 lb a week on purpose and the history makes it look like I'm jumping around.",
			"Every weight I enter in pounds that isn't a whole number gets changed after I save it. {lbhalf} became {lbround}. Whole numbers seem fine. Am I doing something wrong?",
			'When I switch to pounds to compare with my old notebook, 100 kg shows as 220 lb. But 100 kg is 220.46 lb, so it should say 220.5 if anything. My records in the notebook are all to the half pound and nothing lines up.'
		],
		details: [
			'I tried {lbhalf2} lb on a test set and it came back as {lbround2} lb as well.',
			"It's only the display, I think. If I switch to kilos the set shows {kgstored} kg, which looks right.",
			'My coach programmes in pounds with half-pound jumps on the presses, so this matters more than it sounds.'
		],
		first: [
			'Thanks for the example. I see the same on my test account: half pounds come back rounded to the whole pound after saving.',
			"I don't think you're doing anything wrong. Weights are stored in kilos and converted back for display, and something in that round trip seems to lose the half pound. I'll ask the developers."
		],
		escalate: [
			'Pounds users lose half pounds after saving: {lbhalf} lb shows as {lbround} lb. The kilo value looks right. Display rounding?',
			'Member says 100 kg shows as 220 lb rather than 220.5. The conversion to pounds seems to round to whole pounds.'
		],
		dev: [
			'Weights are stored in kilograms. Pounds to kilos keeps one decimal, so {lbhalf} lb is stored as {kgstored} kg, which is fine. Kilos to pounds then rounds to a whole pound, so it comes back as {lbround}.',
			'The kilo to pound conversion rounds to the nearest pound, while the pound to kilo one rounds to a tenth of a kilo. The stored values are right; what differs is the display.'
		],
		more: ["My bench has been stuck around this weight for a while, so I moved to small jumps. Seeing 118, 120, 123 in the history when I actually did 117.5, 120, 122.5 makes it look like I'm all over the place, and my coach asked what I was playing at.", "I have tried entering the weight in kilos instead, {kgstored}, and then it shows {lbround}. I just want to see the number I loaded."],
		steps: ["Test account set to pounds. Logged a set at {lbhalf} lb.", "History shows {lbround} lb.", "Switched to kilos: the same set shows {kgstored} kg.", "Logged 135 lb: shows 135, so whole pounds are fine."],
		checks: ["Stored value for the member's set: {kgstored} kg, as expected from {lbhalf} lb.", "Converted back for display: {lbround} lb, a whole pound.", "Nothing else touches the value in between."],
		probe: [["Does it happen with every weight ending in .5 lb, or only some?", "Every one I've tried: {lbhalf2} shows as {lbround2}, and so on."], ["Do you type the weight in pounds, or pick it from the plate buttons?", "I type it. The plate buttons only go in 5 lb steps."]],
		art: 'sets',
		quirk: 'units',
		trace: 'plain',
		quick: ['Also, why does 100 kg show as 220 lb and not 220.5?', 'Pound figures are rounded to the whole pound for display at the moment; the stored kilos are exact.'],
		calc: (r) => {
			const lb = pick(r, [97.5, 112.5, 137.5, 142.5, 147.5, 152.5, 187.5, 202.5, 232.5, 117.5]);
			const lb2 = pick(r, [62.5, 72.5, 82.5, 92.5, 107.5]);
			const kg = lbToKg(lb);
			return { lbhalf: num(lb), kgstored: num(kg), lbround: String(kgToLbShown(kg)), lbhalf2: num(lb2), lbround2: String(kgToLbShown(lbToKg(lb2))) };
		},
		explain: 'Every weight is stored in kilograms, and the pound figure you see is converted back and rounded to the whole pound for display. {lbhalf} lb is saved correctly as {kgstored} kg, so your progression is recorded accurately even where the history shows {lbround}.',
		bug: 'kilos are converted to pounds rounded to the whole pound while pounds to kilos keeps a decimal, so half pounds disappear on display',
		need: 'the exact weights typed for two or three of the affected sets, with their dates'
	},
	{
		weight: 1,
		subjects: ['Weights wrong after switching to lb', 'Did switching units break my history?', 'Strange numbers like 102.1 kg', 'Unit setting'],
		open: [
			'I switched from kilos to pounds last month because I moved to a gym in the US that only has pound plates. Now my old sets show numbers like 309 and 220 lb, and when I switched back to kilos to check, my new sets show things like {kgstored} kg. Did the switch mess up my data?',
			'I flip between kilos and pounds depending on which gym I am in (hotel gyms on work trips are often pounds). My history now has a mix of odd decimals, like {kgstored} kg for a set I did as {lbwhole} lb. Is it storing two versions?',
			'My husband set the app up for me in pounds by mistake. I changed it to kilos but all the sets I had already logged look slightly off now.'
		],
		details: [
			"I'm worried the totals on my volume chart are now mixing units.",
			'Nothing is lost as far as I can see, it just looks messy.',
			'In kilos the set from {date} shows {kgstored}, which is not a number I would ever load.'
		],
		first: [
			"Thanks for writing in. I don't think anything has been lost, but I'd like the developers to confirm how the switch works before I reassure you.",
			'I can see the sets you mean on your account. Let me ask the team exactly what happens to existing sets when the unit changes.'
		],
		escalate: [
			'Member switched kg to lb and back, and now sees odd decimals like {kgstored} kg. Worried data was changed. Can you confirm what the unit switch does?',
			'Unit switching question. Member thinks two versions of each set are stored.'
		],
		dev: [
			'All weights are kept in kilograms, whatever unit the member typed. A set typed as {lbwhole} lb is stored as {kgstored} kg. Nothing on the account changed when the setting did.',
			'The stored weights are all in kilos and were never touched by the setting. {lbwhole} lb typed went in as {kgstored} kg.'
		],
		more: ["I had all my numbers memorised in kilos, and the history flipping between neat numbers and odd ones makes it hard to see at a glance how I'm doing.", "I also noticed my estimated maxes changed slightly after I switched, by a pound or two. Is that the same thing?"],
		steps: ["Test account: logged a set as {lbwhole} lb in pound mode.", "Switched to kilos: it shows {kgstored} kg.", "Switched back to pounds: {lbwhole} lb again.", "Checked the member's volume chart in both modes: same shape, different unit."],
		checks: ["Every stored weight on the account is in kilos, with one decimal at most.", "No set on the account was modified on the day the setting changed."],
		probe: [["Roughly when did you change the unit setting, and how many times?", "Twice, I think: to pounds when I moved, then back to kilos for a week to compare with my old numbers."], ["Which unit is the app set to right now?", "Kilos again, for now."]],
		art: 'sets',
		quirk: 'units',
		trace: 'plain',
		quick: ['Does changing the unit setting change my old sets?', 'No, it only changes how they are shown; everything is stored in kilos.'],
		calc: (r) => {
			const lb = pick(r, [135, 185, 225, 275, 315, 155, 205]);
			const kg = lbToKg(lb);
			return { lbwhole: String(lb), kgstored: num(kg), lbhalf: String(lb), lbround: String(kgToLbShown(kg)) };
		},
		explain: 'Nothing changed in your data. Every set is stored in kilograms, and the unit setting only changes how it is shown. Sets you typed in pounds were converted to kilograms when you saved them, which is why {lbwhole} lb shows as {kgstored} kg in kilo mode. Your volume chart uses one unit throughout.',
		wish: 'showing each set in the unit it was entered in',
		app: 'the unit setting and the way the history formats converted weights are both handled on the phone, and the stored kilos are correct'
	},
	{
		weight: 2,
		subjects: ['Estimated max higher than my actual max', 'Wrong 1RM', 'E1RM for singles', 'Why is my max {est}?', 'One rep max calculation'],
		open: [
			"My estimated max for {ex} says {est} kg, but my best single ever is {kg} kg, done last {day}. How can the estimate be higher than a lift I actually did? Surely a single should just count as itself.",
			"I hit a {kg} kg {ex} single at a mock meet and the max screen now says {est}. I'm planning my openers off these numbers, so I'd like them to be right.",
			'Quick question about the one-rep max screen. When I log a set of one, the estimated max for that set is always a bit higher than the weight. {kg} kg for one shows {est}. That cannot be right?'
		],
		details: [
			'My triple at {kg3} kg shows {est3}, which seems reasonable. It is only singles that look strange.',
			'I checked a few older singles and they all do it: the estimate is roughly three percent above the weight.',
			"I know it's an estimate. But for a single the estimate and the actual lift should surely be the same number."
		],
		first: [
			"Thanks for writing in. You're right that the estimate for a single comes out a little above the weight. I'll check with the developers whether that's intended.",
			"I've had a look at your {ex} sets and can see the {kg} kg single showing as {est} on the max screen. Let me ask the team how singles are meant to be handled."
		],
		escalate: [
			'Estimated max for a single comes out higher than the weight lifted ({kg} kg × 1 shows {est}). Member is planning meet openers from it. Formula?',
			'Another report this month: singles get an estimate about 3% above the actual lift. Expected?'
		],
		dev: [
			'The estimate is Epley\'s formula, weight × (1 + reps / 30), rounded to the nearest half kilo, and it is applied to every set, singles included. One rep adds a thirtieth, so {kg} kg × 1 gives {est}.',
			'Epley for every rep count, with no special case for one. For a single that adds about 3.3% before rounding: {kg} becomes {est}.'
		],
		more: ["I'm competing in {weeks} weeks and my coach picks my attempts as percentages of my best. If the app says {est} when I've only ever done {kg}, the percentages come out a little heavy, and at the top end a little matters.", "I found an explanation of the formula in an old forum post, but I assumed a single would be treated as a single. My spreadsheet just takes the heaviest single as the max when there is one."],
		steps: ["Opened the member's max screen: {ex} shows {est} kg.", "Best set behind it: {kg} kg × 1 on {date}.", "Logged a single on the test account: the estimate also comes out above the weight."],
		checks: ["Estimate for {kg} × 1: {est}.", "Estimate for {kg3} × 3: {est3}.", "Nothing in the calculation treats one rep differently."],
		probe: [["Is the single you mention the heaviest set you have logged for {ex}?", "Yes, {kg} kg for one is my best ever. Everything else is lighter."], ["Which other exercises have a single logged?", "Squat and deadlift, both from the same mock meet. Same thing: the estimate is above the weight."]],
		art: 'max',
		quirk: 'single',
		trace: 'plain',
		exes: mainLifts,
		quick: ['And why does a single show a higher estimated max than the weight?', 'The estimate uses a formula for every set, singles included, so it adds a little even for one rep.'],
		calc: (r, s) => {
			const kg = Math.max(60, Number(s.kg));
			return { kg: num(kg), est: num(epley(kg, 1)), kg3: num(kg - 10), est3: num(epley(kg - 10, 3)), weeks: String(int(r, 3, 12)) };
		},
		explain: "The estimated max is a formula (Epley's) applied to every set, singles included, and for one rep it always comes out a little above the weight. It's meant as a guide to what you might lift on a perfect day, not a record, so the {kg} kg in your history is the number to plan from.",
		bug: "a set of one rep gets Epley's figure instead of its own weight as the estimated max"
	},
	{
		weight: 1,
		subjects: ['Leg press max is silly', 'Estimated max way too high', 'High rep sets mess up my 1RM', 'Choose the 1RM formula?'],
		open: [
			"I did a set of {hreps} on leg press with {kg} kg and my estimated max for it is now {esth} kg. I can't leg press that, nobody at my gym can. Can high-rep sets be left out of the estimate?",
			"My estimated max for {ex} jumped by {jump} kg after a back-off set of {hreps}. My heavy triples haven't changed at all. It makes the progress chart look like I had a breakthrough when I didn't.",
			"Is there a way to choose the formula for the one-rep max? I'm used to Brzycki from my old spreadsheet and the numbers here are higher for anything over about eight reps."
		],
		details: [
			'For lower reps the numbers look sensible. It is only the long sets that throw it.',
			'My coach told me to ignore the max screen entirely, which seems a shame because I like the chart.',
			'I do a lot of rest-pause sets that I log as one long set, so this happens to me most weeks.'
		],
		first: [
			'Thanks for the detail. I can see the {hreps}-rep set on your account and the estimate it produces. Let me ask the developers how the estimate treats long sets.',
			"You're right that long sets give big estimates. I'll check with the team whether there's a way round it before I answer properly."
		],
		escalate: [
			'High-rep sets inflate the estimated max ({hreps} reps at {kg} kg gives {esth}). Member wants them left out or a different formula.',
			'Formula question: member wants Brzycki instead of what we use. Any plans?'
		],
		dev: [
			'Every set gets the same formula, weight × (1 + reps / 30), and the max screen shows the best figure across the sets. A long set at a moderate weight can come out above heavy triples.',
			'The estimate is Epley for all rep counts, and the screen takes the highest value. Nothing caps the reps.'
		],
		more: ["I train for size most of the year and only test heavy singles twice a year, so most of my sets are eight to fifteen reps. The estimated max is the only number that tells me whether I'm getting stronger between tests, and right now it follows whichever day I did the longest set.", "I'd be happy with the estimate ignoring anything above ten reps, or showing which formula it uses so I can make sense of it."],
		steps: ["Member's {ex} max screen: {esth} kg from {kg} kg × {hreps}.", "Their heaviest set of five or fewer gives a much lower estimate.", "No setting for the formula or a rep limit."],
		checks: ["Estimate per set is Epley, and the highest value is shown.", "{kg} kg × {hreps} gives {esth}; each rep adds a thirtieth of the weight, so long sets grow fast."],
		probe: [["How many sets of more than twelve reps do you log in a typical week?", "Two or three most weeks, always the last set of an exercise."], ["Which exercise is affected most?", "{ex}, by a mile. I do a long back-off set every session."]],
		art: 'max',
		quirk: 'highreps',
		trace: 'plain',
		exes: ['Leg press', 'Back squat', 'Bench press', 'Romanian deadlift', 'Hip thrust'],
		quick: ['Also my estimated max went silly after a set of twenty, is that normal?', 'Long sets do produce big estimates; the formula is least reliable above about ten reps.'],
		calc: (r, s) => {
			const hreps = int(r, 15, 25);
			const kg = Number(s.kg);
			return { hreps: String(hreps), esth: num(epley(kg, hreps)), jump: num(epley(kg, hreps) - epley(kg + 20, 3)) };
		},
		explain: 'The estimate uses Epley\'s formula for every set and shows the best result across your sets, so one long set can come out above your heavier, shorter ones. Above about ten reps any formula gets unreliable, so read the max screen from your sets of one to six.',
		wish: 'a choice of one-rep max formula, or leaving sets above ten reps out of the estimate'
	},
	{
		weight: 2,
		subjects: ['Volume chart doubled in January', 'Week 1 volume huge', 'Yearly volume chart wrong', 'Weekly volume not matching my notes', 'Volume chart bug?'],
		open: [
			"I was looking at my volume chart for the whole year to plan next year, and the first week of January is enormous. About twice what I normally do. I definitely didn't train twice as much over New Year, I had flu for half of it.",
			'I copy the weekly numbers into a spreadsheet for my coach every month. This time I picked "all time" and a few weeks came out at double what my log says. Week 1 is the worst, then weeks 2 and 3.',
			'My weekly volume for week {wk} shows {vol} kg, but adding up my sets for that week I get about {volhalf}. Is the chart counting something extra?'
		],
		details: [
			"I've been logging since autumn 2024, so I have two Januaries in the app now.",
			'When I narrow the chart to this year only, the numbers look right again.',
			"It looks like the same week numbers from different years are being added together, but that's just a guess."
		],
		first: [
			'Thanks for spotting this. I can see the jump in week 1 on your account when the chart covers all of your history. Let me get the developers to look.',
			'I think you may be right about the years. When I narrow your chart to 2026 the numbers drop back to normal. I\'ll pass it on.'
		],
		escalate: [
			'Weekly volume over a range longer than a year doubles some weeks, week 1 especially. Member has history from late 2024.',
			'Volume chart: week {wk} shows {vol} kg, member counts about {volhalf}. Narrowing the range fixes it. Something about years?'
		],
		dev: [
			'Weekly volume is grouped by ISO week number. Week 1 of 2026 and week 1 of 2025, which started on 30 December 2024, have the same number, and the member has sets in both.',
			'The volume buckets are keyed by the week number. With two years of history in the range, week {wk} holds sets from two different years.'
		],
		more: ["I use the yearly chart to plan my blocks: heavy in winter, more volume in spring. If January is double what I think it is, I start doubting the rest of the chart too.", "I added it up from my history by hand: {volhalf} kg is what I did that week, give or take a set. The chart has {vol}. The other weeks I checked are fine once I only look at this year."],
		steps: ["Member's chart, range set to all time: week {wk} shows {vol} kg.", "Range set to 2026: week {wk} shows about {volhalf} kg.", "Member has sets from {since} 2024 onwards."],
		checks: ["Grouped the member's sets by week number with and without the year: only the first gives {vol} for week {wk}.", "The same happens on any account with more than a year of history."],
		probe: [["When did you log your first set in Liftbook, roughly?", "In {since} 2024, I think. My first session was a {routine} day."], ["Is the chart set to all time when you see it?", "Yes, all time. With this year only it looks normal."]],
		art: 'volume',
		quirk: 'year',
		trace: 'plain',
		quick: ['Also, the weekly volume chart for last January looks too high.', 'If you have more than a year of history, the all-time view can add up the same week number from different years; a single year shows correctly.'],
		calc: (r) => {
			const wk = int(r, 1, 6);
			const half = int(r, 18, 46) * 500;
			return { wk: String(wk), vol: thousands(half * 2 + int(r, 0, 9) * 100), volhalf: thousands(half), since: pick(r, ['September', 'October', 'November']) };
		},
		bug: 'weekly volume is grouped by week number without the year, so the same week of two different years is added together',
		need: 'the date range selected on the chart and a screenshot of the weeks that look wrong'
	},
	{
		weight: 1,
		subjects: ['Warm-ups counted in volume', 'Volume includes warm-up sets', 'Exclude warm-ups from volume?', 'My volume looks inflated'],
		open: [
			'I log my warm-ups because I like having the whole session in one place, but it means my weekly volume is about a third higher than my working sets. Can warm-up sets be left out of the volume?',
			'My coach sets a volume target for working sets only. The chart in the app counts my warm-ups too, so I can never compare with his spreadsheet.',
			'Is there a way to mark a set as a warm-up? I can\'t find one, and the volume chart counts every empty-bar set I do.'
		],
		details: [
			'On a squat day I do about eight warm-up sets ramping up to {kg} kg, so it adds up quickly.',
			'I could stop logging warm-ups but then I lose track of how I ramped up.',
			'My old app had a little W next to each warm-up set, which did the trick.'
		],
		first: [
			"That's a fair point. As far as I know there's no warm-up marker at the moment, but let me check with the developers how the volume is counted.",
			'Thanks for this. I\'ll ask the team whether the volume chart can tell warm-ups apart.'
		],
		escalate: ['Member wants warm-up sets left out of weekly volume. I don\'t think we have any warm-up flag. Confirm?', 'Warm-ups in volume again. Is this a known request?'],
		dev: ['Volume is reps × weight over every set in the week. A set has no field that says it was a warm-up, so all of them count.', 'Every logged set counts towards volume; there is nothing on a set to mark a warm-up.'],
		more: ["My warm-up for a {kg} kg squat day is bar × 10, 40 × 5, 60 × 3, 80 × 2 and {kgwarm} × 1. That's a fair bit of volume that the chart counts as if it were work.", "I compared one week with my coach's spreadsheet: he has me at about 9,000 kg of working volume, the app says nearly 12,000."],
		steps: ["Member logs warm-ups as ordinary sets.", "The set editor has no warm-up option.", "Last week's volume includes every set."],
		checks: ["Volume sums reps × weight for every set in the week.", "A set has no field for a warm-up."],
		probe: [["How many warm-up sets do you log on a typical day?", "Six to eight before the main lift, two or three before the second one."], ["Do you log warm-ups for every exercise or only the main lifts?", "Only the main lifts. Assistance work goes straight to working sets."]],
		art: 'volume',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, do warm-up sets count in the weekly volume?', 'Yes, every set you log counts; there is no warm-up marker yet.'],
		explain: 'Weekly volume adds up reps × weight for every set you log, warm-ups included, because the app has no way to mark a set as a warm-up. If you want the chart to show working sets only, the simplest way today is to keep warm-ups in the session notes rather than as sets.',
		wish: 'marking sets as warm-ups and leaving them out of the volume'
	},
	{
		weight: 1,
		subjects: ['Pull-ups count as zero volume', 'Bodyweight exercises in volume', 'Volume chart ignores my dips', 'Calisthenics volume'],
		open: [
			'I do a lot of pull-ups and dips, logged with 0 kg because I do them at bodyweight. My weekly volume treats them as nothing at all, so my upper-body days look like rest days on the chart.',
			"I've just started weighted pull-ups. When I log +10 kg the volume counts 10 kg per rep, as if I weighed nothing. Shouldn't my bodyweight be included?",
			'Bodyweight work seems to be invisible in the volume chart. Is that intentional?'
		],
		details: ['I weigh about {bw} kg, if that helps.', 'I log push-ups too, about a hundred a day, and none of it shows.', 'The sets do appear in the exercise history, just not in the volume.'],
		first: ['Thanks for the clear example. Let me check with the developers how bodyweight sets are counted in the volume.', 'I can see your pull-up sets at 0 kg on the account. I\'ll ask the team how they are meant to be treated.'],
		escalate: ['Bodyweight sets logged at 0 kg add nothing to volume. Member expected bodyweight to count. As designed?', 'Weighted pull-ups count only the added weight in volume. Member wants bodyweight included.'],
		dev: ['Volume is reps × the logged weight. A pull-up logged at 0 kg contributes 0, and a weighted one counts only the weight typed in. There is no bodyweight on the account to add.', 'The calculation only knows the weight on the set. Nothing stores the member\'s bodyweight.'],
		more: ["I'm training for my first strict muscle-up, so most of my sessions are pull-ups, dips and rows on rings. The volume chart says I barely train, which is a bit demoralising.", "I know I could type my bodyweight into each set, but then my pull-up history would say I pull {bw} kg, which is a strange way to look at it."],
		steps: ["Member's pull-up sets are logged at 0 kg.", "Weekly volume on those days: nothing from the pull-ups.", "No bodyweight setting anywhere in the app."],
		checks: ["Volume is reps × logged weight; sets at 0 kg add 0.", "Nothing on the account stores bodyweight."],
		probe: [["Do you ever note your bodyweight anywhere in the app, for example in the session notes?", "Only in the notes now and then. Never in the sets."], ["What do you log as the weight for a weighted pull-up: the added weight only?", "Only the added weight, the plate on the belt."]],
		art: 'volume',
		quirk: 'none',
		trace: 'plain',
		exes: ['Pull-up', 'Chin-up', 'Dip'],
		quick: ['Also, why do my pull-ups count as zero in the volume?', 'Volume is reps times the weight you log, so a set at 0 kg adds nothing.'],
		calc: (r) => ({ bw: String(int(r, 58, 104)) }),
		explain: 'Volume is reps × the weight you log, so a pull-up logged at 0 kg adds nothing. If you want bodyweight work to count, log your bodyweight plus anything added, for example {bw} kg for an unweighted pull-up.',
		wish: 'counting bodyweight in the volume of pull-ups, dips and similar exercises'
	},
	{
		weight: 1,
		subjects: ['Session on the wrong day', 'Workout dated tomorrow', 'Late night session date', 'Calendar shows a workout on the wrong day'],
		open: [
			'I train late, after my shift. Last night I started at 23:10 and finished at about 00:40, and the session is dated today, not yesterday. My calendar now shows two sessions on one day and a rest day before it.',
			'I flew from London to Toronto on {date} and did a hotel gym session that evening. It is dated the next day in the app. Is it using UK time?',
			'Every session I start after about eleven at night shows the next day\'s date. It messes up my weekly streak.'
		],
		details: ['It only happens to sessions that run past midnight. Morning sessions are fine.', 'The sets inside the session have the right date, oddly, only the session itself is off.', 'My phone is set to the local time zone automatically.'],
		first: ['Thanks for writing in. I can see the session on your account with the later date. Let me check with the developers how the date is decided.', 'I can see what you mean on your calendar. I\'ll ask the team where the session date comes from.'],
		escalate: ['Session that crossed midnight is dated the second day. Where does the date come from, app or server?', 'Member travelling across time zones gets sessions on the next day. Date set by the app?'],
		dev: ['Sessions keep a date and nothing else, no time and no time zone. The date stored is the one the app sends when it saves the session, and for this one it sent {iso}.', 'The session was saved at {late} and the app sent {iso} as its date. The API stores whatever date it is given.'],
		more: ["The calendar is how I check I've trained three times a week, and with a session landing on the wrong day it looks as if I trained twice on one day and not at all the day before.", "The sets themselves show the time I logged them, which is right. It's only the session that jumps to the next day."],
		steps: ["Member's session from that night is dated {iso}.", "Its first sets were logged before midnight, the last ones after.", "Changed the date of a test session: works, and its sets keep their own dates."],
		checks: ["The session was created with the date {iso}.", "Sessions have no time and no time zone; the date is whatever the app sends."],
		probe: [["Does it happen when you start before midnight and finish after, or also when you start after midnight?", "Only when the session runs over midnight. If I start after midnight it gets that day, which is fair."], ["Is the phone's time zone set automatically?", "Yes, automatic. I haven't touched it."]],
		art: 'device',
		quirk: 'none',
		trace: 'session',
		quick: ['Also, a late session ended up on the next day. Can I change it?', 'Yes, open the session and tap the date at the top to pick another day.'],
		explain: 'A session keeps one date, the day it was saved, and you can change it afterwards: open the session, tap the date at the top and choose the right day. Your sets keep their own dates, so the charts are unaffected.',
		app: 'the app sends the date of the moment a session is finished rather than when it started, and the API stores the date it is given',
		bug: 'a session that runs past midnight is dated by the moment it finishes',
		fix: 'the app now dates a session by the time it was started, from version 6.4.1'
	},
	{
		weight: 1,
		subjects: ['Sets missing from session', 'Widget sets not in my workout', "Quick log doesn't show in history", 'Session count wrong'],
		open: [
			'I use the home screen widget to log sets between meetings (I have a pull-up bar in my office). Those sets show in the exercise history but not in any session, so my session list says I didn\'t train on days I did.',
			'Yesterday I logged three sets from the quick-log widget and the rest inside the session as normal. The session shows {n} sets, not {n3}. The other three are in the exercise history though.',
			'Some of my sets are floating around without a session. They appear under the exercise but not under the workout I did them in.'
		],
		details: ['It is always the ones I log from the widget.', 'They still seem to count in my weekly volume.', 'I had the session open in the app at the time, if that matters.'],
		first: ['Thanks for explaining. I can see the sets in your exercise history that have no session next to them. Let me ask the developers why.', 'I can see the {n3} sets for that day, three of them without a session. I\'ll pass this to the team.'],
		escalate: ['Widget sets are saved without a session, so they don\'t show in the session view. Expected?', 'Member\'s quick-log sets have no session even with a session open.'],
		dev: ['The sets from the widget have no session attached. A set doesn\'t need one, so they show in the exercise history and not under any session.', 'Three sets on {date} with no session, logged from the widget. The other {n} have the session.'],
		more: ["I do little sets of pull-ups through the working day, five at a time. I use the widget because opening a session for a set of five is silly. But at the end of the week my sessions list says three sessions when I trained every day.", "If there were a way to add those sets to that day's session afterwards, I'd do it every evening."],
		steps: ["Member's widget sets show no session in the console.", "Logged a set from the widget on the test account with a session open: saved without the session.", "No option to add an existing set to a session."],
		checks: ["The widget's sets are saved without a session; the field is optional.", "Sets logged inside the session on the same day carry it as expected."],
		probe: [["Do you have a session open when you use the widget?", "Sometimes yes, sometimes no. It makes no difference; the widget sets never end up in it."], ["Which widget do you use: the small one or the large one with the timer?", "The small one, with the plus button."]],
		art: 'sets',
		quirk: 'nosession',
		trace: 'plain',
		quick: ['Also, why do my widget sets not show in the session?', 'The widget saves sets without a session, so they only appear in the exercise history.'],
		calc: (r) => {
			const n = int(r, 9, 16);
			return { n: String(n), n3: String(n + 3) };
		},
		explain: 'Sets logged from the widget are saved without a session, so they appear in the exercise history but not in the session list. They still count in your charts. To have them in a session, log them from inside the session instead.',
		wish: 'attaching quick-logged sets to a session afterwards',
		app: 'the widget never sends the open session with the sets it saves, though the API would keep it if it did'
	},
	{
		weight: 2,
		subjects: ['Sets saved twice', 'Duplicate sets', 'Every set appears three times', 'Sync duplicates', 'Too many sets in my history'],
		open: [
			'My gym is in a basement with almost no signal. When I log a set it spins for a while, and later I find the same set two or three times in my history. Today\'s {ex} shows nine sets instead of three.',
			'Since last week some of my sets are duplicated. Same weight, same reps, logged seconds apart. It is throwing my volume off.',
			'I keep finding doubled sets. I delete the extras by hand but it is getting tedious and I worry I will delete the wrong one.'
		],
		details: ['It only seems to happen at the gym, never at home.', 'When I look at the times they are about ten seconds apart.', 'The duplicates also appear on my tablet, so they are really saved, not just a display thing.'],
		first: ['Sorry about this. I can see the repeated sets on your account, logged a few seconds apart. Let me get the developers to look at what happened.', 'Thanks for reporting it. I can see the duplicates for {date}. I\'ll pass it on with the details.'],
		escalate: ['Duplicate sets seconds apart, member trains with poor signal. Is the app saving twice?', 'Sets doubled and tripled on {date}. Console view below.'],
		dev: ['The server received the same set {k} times within a few seconds, each as its own request, each answered with a 201. So they are separate rows.', 'Each copy arrived as a separate save, seconds apart, and was stored as a new set.'],
		more: ["I train at {gymname}. The app spins for five or ten seconds on each set and then shows a tick. I don't touch anything while it spins. Later the set is there two or three times.", "I've deleted about forty duplicate sets so far this month. My volume chart was showing my best week ever when it was actually a deload."],
		steps: ["Member's sets for {date}: several logged twice or three times, about ten seconds apart.", "Couldn't make it happen on the office wifi.", "With the test phone's network throttled, a set logged once appeared twice."],
		checks: ["The copies arrived as separate saves, each a few seconds after the last.", "Each save took between four and ten seconds to answer on the member's connection."],
		probe: [["When the set spins, do you tap the tick again or leave it?", "I leave it. I learned early on not to tap twice."], ["Does the app ever show an error when it spins, or always a tick in the end?", "Always a tick in the end. Never an error."]],
		art: 'sets',
		quirk: 'dupes',
		trace: 'dupes',
		quick: ['Also I sometimes get a set saved twice, is that known?', 'It can happen on a poor connection; you can delete the extra copy from the exercise history.'],
		calc: (r) => ({ k: pick(r, ['two', 'three', 'two']), gymname: pick(r, ['a basement gym under the station', 'a gym in an old bunker', 'the university gym, which is in the basement', 'a cellar gym with thick walls', 'a gym under a multi-storey car park']) }),
		need: 'the app version and roughly what time the doubled sets were logged',
		app: 'the app sends a save again when the first answer is slow, and each copy is stored as a new set',
		bug: 'a slow save is sent again by the app and the set is stored twice',
		fix: 'app version 6.4.1 waits for the first save to finish before it tries again'
	},
	{
		weight: 1,
		subjects: ['Exercises in the wrong order', 'Routine order keeps changing', 'My routine shuffles itself', 'Reorder not saving'],
		open: [
			'I dragged face pulls to after rows in my {routine} routine and saved. Next time I opened it, face pulls and {ex} had swapped. It happens every few days, never the same pair.',
			'The order of exercises in my routine changes on its own. I always want squats first, and some days they come up third.',
			'Is there a bug with reordering? I put my exercises in order, and the next week two of them are the other way round.'
		],
		details: ['It is always two exercises that swap, never the whole list.', 'I have rebuilt the routine once already and it started again after a week.', 'It is the same on my tablet as on my phone.'],
		first: ['Thanks for the detail. I can see the routine and the positions of each exercise on your account. Let me ask the developers.', 'Sorry about this, it sounds frustrating. I\'ll get the team to look at your routine.'],
		escalate: ['Routine exercises swapping places. Member reorders, order doesn\'t stick.', 'Order of exercises in {routine} changes between visits. Console view below shows two with the same position.'],
		dev: ['Each exercise in a routine has a position number. In this routine two entries both have position {pos}, and with equal positions the order they come back in isn\'t fixed.', 'Two of the routine\'s exercises share position {pos}. Everything else is numbered in sequence.'],
		more: ["I run the routine as written, top to bottom, with a printed copy on the rack. When the app order changes I end up logging face pulls against the row and the other way round, and my history is a mess.", "I made the routine on my tablet and edited it on my phone, if that matters."],
		steps: ["Member's {routine} routine has two exercises at position {pos}.", "Moved an exercise in a test routine: only that exercise's number changed.", "Opened the member's routine several times: the two at position {pos} swap now and then."],
		checks: ["Positions in the routine: two exercises at {pos}, the rest in sequence.", "The list is ordered by position only, with nothing to break a tie."],
		probe: [["Did you move exercises by dragging them, or by deleting and re-adding them?", "Only by dragging, always."], ["Does the routine have any exercise added since you first made it?", "Yes, I added face pulls a month ago."]],
		art: 'routine',
		quirk: 'position',
		trace: 'plain',
		quick: ['Also, the order of my routine changed by itself last week.', 'That can happen when two exercises share a position; moving each one once usually fixes it.'],
		calc: (r) => ({ pos: String(int(r, 2, 5)) }),
		explain: 'Two exercises in your routine had the same position number, so there was nothing to say which came first. If you move each exercise once, top to bottom, they all get their own number and the order sticks.',
		bug: 'exercises that share a position in a routine have no fixed order between them',
		fix: 'the app now renumbers every exercise in a routine when one is moved, from version 6.4.1'
	},
	{
		weight: 1,
		subjects: ['Supersets?', 'Grouping exercises', 'How do I set up a superset', 'Circuit training in routines'],
		open: [
			'I run supersets in most of my sessions, curls with triceps, rows with presses. In the routine they are just separate exercises one after the other, and when I log I have to jump between them. Is there a way to group them?',
			'Can a routine have a circuit? I do five exercises back to back, three rounds, and logging it is a lot of scrolling.',
			'How do people set up supersets in Liftbook? I can\'t find anything.'
		],
		details: ['At the moment I put "SS" in the exercise name, which is a bodge.', 'My programme from my coach has A1/A2 pairs everywhere.', 'It is mainly the logging that is awkward, the routine itself I can live with.'],
		first: ['There isn\'t a superset option as far as I know, but let me check with the developers whether there is a better way.', 'Thanks for asking. I\'ll check with the team whether anything is planned for supersets.'],
		escalate: ['Superset grouping request. Anything planned?', 'Member asking for circuits in routines.'],
		dev: ['Routines are a flat list of exercises with positions. There is nothing to group two of them.', 'Nothing in a routine groups exercises; each one stands alone.'],
		more: ["My programme is built on pairs: A1 bench with A2 rows, B1 incline press with B2 pulldowns. I rest between pairs, not between exercises, and logging means jumping up and down the session screen.", "A circuit option would help with my conditioning days too: five exercises, three rounds, a timer between rounds."],
		steps: ["Routine editor: no grouping option.", "Exercises can be placed next to each other and logged alternately."],
		checks: ["A routine is a list of exercises with positions; nothing groups them."],
		probe: [["How do you log a superset at the moment?", "One set of the first, one of the second, back and forth, scrolling each time."], ["Which exercises do you pair most often?", "Rows with bench, and curls with triceps pushdowns."]],
		art: 'routine',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, can I set up supersets?', 'Not as such yet; you can place the two exercises next to each other in the routine.'],
		explain: 'Routines don\'t have supersets as such, but if you place the two exercises next to each other and log one set of each in turn, the history and charts come out exactly the same as a superset would.',
		wish: 'grouping exercises in a routine as supersets or circuits'
	},
	{
		weight: 1,
		subjects: ['Automatic progression', 'Increase weight automatically', 'Routine weights never change', 'Progressive overload feature'],
		open: [
			'My routine has {ex} at {kg} kg for 5 × 5. When I hit all the reps I add 2.5 kg, but I have to go into the routine and change it by hand every time. Could the app do that?',
			'Is there a way to make the planned weights go up on their own? I always forget to edit the routine and end up lifting last week\'s weights.',
			'I would love a setting like "add 2.5 kg when all sets are done". My spreadsheet did it.'
		],
		details: ['I\'m on a linear progression so it is every session for now.', 'For upper body I would want 1.25 kg instead.', 'Twice now I have done the old weight because I didn\'t notice.'],
		first: ['That\'s a good idea. As far as I know the routine only changes when you edit it, but let me check with the developers.', 'Thanks for the suggestion. I\'ll check with the team.'],
		escalate: ['Auto-progression request: add weight to a routine exercise after a successful session.', 'Member wants routine weights to increase automatically.'],
		dev: ['The planned weight of an exercise in a routine only changes when someone edits it. Nothing looks at the sets logged against it.', 'Planned sets, reps and weight are set by hand and never change on their own.'],
		more: ["I'm on a beginner linear progression: if I make 5 × 5 I add 2.5 kg next time, and if I miss I repeat. Three lifts, three sessions a week, so nine edits a week that I mostly forget.", "The plan says {kg} kg this week. I did {kg} last week as well, because I forgot to change it."],
		steps: ["Member's routine: {ex} planned at {kg} kg, last edited weeks ago.", "No setting for automatic increases."],
		checks: ["Planned weights change only when edited.", "Nothing compares the sets logged with the plan."],
		probe: [["How often do you change the planned weight?", "Every session for squat and deadlift, once a week for the presses."], ["Do you ever miss reps and repeat the weight?", "Now and then, on bench mostly."]],
		art: 'routine',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, can the routine add weight for me?', 'Not automatically yet; you can change the planned weight in the routine.'],
		explain: 'Routines keep the planned weight you set until you change it. To move up, open the routine, tap the exercise and change the weight; it applies from your next session.',
		wish: 'automatic weight increases in a routine after a successful session'
	},
	{
		weight: 2,
		subjects: ['Use a template?', 'How do I start the {template} template', 'Templates are view only?', 'Copy a template into my routines', 'What are templates for?'],
		open: [
			"I found the {template} template in the templates list and it's exactly what I want to run. But I can't find any way to actually use it. In the end I made a new routine and added all {n} exercises by hand, typing the sets and reps across from the template.",
			'What is the templates list for if you can\'t start anything from it? I\'ve looked everywhere for a "use this template" button.',
			'I saved my off-season block as a template last year so I could run it again. Now it\'s that time and I want a fresh routine to log against, but the only way I can see is rebuilding it exercise by exercise.'
		],
		details: ['I got two of the rep schemes wrong, which I only noticed in the gym.', "I don't want to change the template itself, just have a routine that starts the same.", 'The template has {n} exercises with different sets and reps for each, so it is a lot of typing.'],
		first: ["You're right, there isn't a way to start a routine from a template yet; the templates list is only there to browse at the moment.", 'Thanks for asking. At the moment templates can be viewed but not turned into a routine, so rebuilding by hand is the only route, sorry.'],
		escalate: ['Yet another request to start a routine from a template. Is that coming, or do we keep telling people to rebuild by hand?', 'Template question again. Member rebuilt {template} by hand and got the rep schemes wrong. Anything I can say about plans?'],
		dev: ['Templates can only be listed for now. Starting a routine from one is the obvious next step and it has been asked for a lot since the templates release.', 'Nothing starts a routine from a template yet; the templates list is read only.'],
		more: ["I liked that the template had the whole block thought out, with a lighter week built in. Rebuilding it meant {n} exercises, each with its own sets, reps and starting weight. It took most of an evening.", "I'd be happy with even a basic version: tap the template, get a routine with the same exercises, and I'll adjust the weights myself."],
		steps: ["Opened the {template} template on the test account: view only, nothing to start it with.", "Created a routine and added the exercises by hand: works, but slow for {n} exercises."],
		checks: ["The templates list is for viewing only; nothing creates a routine from a template yet."],
		probe: [["How many templates have you rebuilt by hand so far?", "Just the one, but I want to try two more after this block."], ["Which template did you rebuild, and how many exercises does it have?", "{template}, with {n} exercises."]],
		art: 'routine',
		quirk: 'template',
		trace: 'plain',
		quick: ['Also, can I start a routine from a template?', 'Not yet; for now you would need to rebuild it by hand.'],
		explain: 'For now the way to run a template is to make a new routine and add the template\'s exercises to it with the same sets, reps and weights. If you open the template on a second device while you do it, it goes quite quickly.',
		wish: 'starting a new routine from a template in one step'
	},
	{
		weight: 2,
		subjects: ['Missing exercise: {missing}', "Can't find {missing}", 'Add exercises?', 'Custom exercises', 'Exercise not in the list'],
		open: [
			'There is no {missing} in the exercise list. I\'ve been logging it as "{proxy}", which messes up my {proxy} history and estimated max.',
			'Could you add {missing}? It\'s a staple in my programme and I have nowhere to log it.',
			"Why can't I add custom exercises? I do {missing} twice a week and it isn't in the list."
		],
		details: ['I searched for "{missingLower}" and a couple of spellings, nothing.', 'My gym has a {missing} station so it is not that unusual.', 'I don\'t mind which name you use as long as I can find it.'],
		first: ["You're right, {missing} isn't in the catalogue yet. Let me check with the developers whether it's on the list for the next update.", 'Thanks for the suggestion. I\'ve checked and it isn\'t there. I\'ll ask the team.'],
		escalate: ['Exercise request: {missing}. Member logging it as {proxy} in the meantime.', 'Catalogue gap: {missing}. Second request I have seen.'],
		dev: ['The catalogue has {catn} exercises and {missing} isn\'t among them. Additions go in with the catalogue updates, roughly monthly.', 'Checked the catalogue: no {missing}, nothing close under another name.'],
		more: ["My physio prescribed {missing} for my lower back and I do it three times a week. Logging it as {proxy} means my {proxy} max is nonsense now, because the weights are nothing alike.", "I'd love to be able to add exercises myself, but if that isn't possible, adding {missing} would cover me."],
		steps: ["Searched the catalogue for \"{missingLower}\": no results.", "Tried other spellings: nothing.", "Member has {n2} sets logged as {proxy} since they started it."],
		checks: ["The catalogue has {catn} entries and none matches.", "The next catalogue update is planned for the start of next month."],
		probe: [["Is there another name you would look for it under?", "Some people call it after the machine's brand, but I'd search for {missingLower}."], ["Have you looked for it in any category, or only by search?", "Both. Search finds nothing, and it isn't under the categories either."]],
		art: 'catalogue',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, could you add {missing} to the exercise list?', "I'll pass that on; additions go in with the catalogue updates."],
		calc: (r) => {
			const [name, proxy] = pick(r, missing);
			return { missing: name, missingLower: name.toLowerCase(), proxy, catn: String(int(r, 311, 348)), n2: String(int(r, 12, 70)) };
		},
		explain: 'The catalogue doesn\'t have {missing} yet. Until it does, pick an exercise you never do otherwise and log it under that, so your {proxy} history stays clean, and use the session notes to say what it really was.',
		wish: 'adding custom exercises to the list',
		bug: '{missing} is missing from the catalogue',
		only: ['answered', 'request', 'fixed'],
		fix: '{missing} was added in the catalogue update on {fixdate}',
		fixHow: 'pull down on the exercise list to refresh it'
	},
	{
		weight: 1,
		subjects: ['{dupB} and {dupA}', 'Two entries for the same exercise', 'My history is split in two', 'Duplicate exercise names'],
		open: [
			'There are two entries in the exercise list, "{dupA}" and "{dupB}", and I\'ve used both at different times. Now my history for the lift is split in two and the max screen only looks at one of them.',
			'Is "{dupB}" different from "{dupA}"? They look like the same exercise to me but they have separate histories.',
			'My {dupA} progress chart has a gap from {gap} to {gap2}. Turns out I was logging it as "{dupB}" in that period.'
		],
		details: ['I would like everything under one name, I don\'t mind which.', 'There are about {n2} sets under the second name.', 'I picked whichever came up first in the search, which is how this happened.'],
		first: ['Thanks for pointing this out. I can see both entries. Let me check with the developers whether they are meant to be different.', 'I can see your sets under both names. I\'ll ask the team.'],
		escalate: ['Two catalogue entries for the same lift: "{dupA}" and "{dupB}". Member\'s history split.', 'Duplicate exercise names in the catalogue again.'],
		dev: ['They are two separate catalogue entries, each with its own sets, added in different updates.', '"{dupA}" and "{dupB}" are separate entries. Sets point at one or the other.'],
		more: ["When I search for the lift both names come up, and I pick whichever is at the top, which apparently depends on what I did last. So I've alternated for months without noticing.", "My max for {dupA} hasn't moved since {gap}, which worried me until I found the sets under the other name."],
		steps: ["Catalogue search shows both \"{dupA}\" and \"{dupB}\".", "Member has sets under both: {n2} under \"{dupB}\".", "History and max screen treat them as two exercises."],
		checks: ["Two catalogue entries, added in different updates, both still in use.", "Several hundred members have sets under both."],
		probe: [["Which of the two names would you expect to keep?", "\"{dupA}\". It's the one everyone uses at my gym."], ["Roughly when did you switch from one name to the other?", "Somewhere around {gap}, I think, when I changed programmes."]],
		art: 'catalogue',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, why are there two entries for {dupA}?', 'They are separate catalogue entries at the moment; using one consistently keeps the history together.'],
		calc: (r) => {
			const [a, b] = pick(r, duplicates);
			return { dupA: a, dupB: b, n2: String(int(r, 14, 90)), gap: pick(r, ['March', 'April', 'May']), gap2: pick(r, ['June', 'July']) };
		},
		explain: 'They are two separate entries, so the history for each only shows the sets logged under it. If you pick one and use it from now on, your older sets under the other name stay in your volume, and the max screen will catch up as you log.',
		bug: '"{dupA}" and "{dupB}" are two catalogue entries for the same lift',
		fix: 'the two entries were merged in the catalogue update on {fixdate}, so sets logged as "{dupB}" now show under "{dupA}"',
		fixHow: 'pull down on the exercise list to refresh it'
	},
	{
		weight: 1,
		subjects: ['{catEx} under {catWrong}?', 'Wrong category', 'Exercise in the wrong muscle group', 'Category filter'],
		open: [
			'{catEx} is listed under {catWrong} in the exercise picker. Surely it should be {catRight}? I only noticed because I couldn\'t find it when filtering by {catRight}.',
			'Small catalogue thing: {catEx} is filed under {catWrong}. Every time I build a routine I look for it in the wrong place.',
			'Who decides the categories? {catEx} in {catWrong} makes no sense to me.'
		],
		details: ['Everything else I use seems to be in the right place.', 'Not a huge deal, just a papercut.', 'I teach a beginners\' class and they get confused by it.'],
		first: ['Thanks for spotting it. Let me check with the developers whether that is deliberate.', 'Good catch. I\'ll pass it to the team who look after the catalogue.'],
		escalate: ['Catalogue: {catEx} is under {catWrong}, member expected {catRight}.', 'Category question for {catEx}.'],
		dev: ['{catEx} is filed under {catWrong} in the catalogue.', 'Checked: {catEx} has category {catWrong}.'],
		more: ["I build my routines by filtering by muscle group, so with {catEx} under {catWrong} I don't see it where I look.", "Not the end of the world, I know where it is now. It just felt worth reporting."],
		steps: ["Exercise picker, filter {catRight}: no {catEx}.", "Filter {catWrong}: {catEx} is there."],
		checks: ["Category on the catalogue entry: {catWrong}."],
		probe: [["Where else would you expect to find {catEx}?", "Under {catRight}, and nowhere else."], ["Do you build routines on the phone or the tablet?", "On the phone, always."]],
		art: 'catalogue',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, {catEx} is in the wrong category.', "Thanks, I'll pass that to the team who look after the catalogue."],
		calc: (r) => {
			const [ex, wrong, right] = pick(r, categories);
			return { catEx: ex, catWrong: wrong, catRight: right };
		},
		explain: 'Categories in the catalogue are broad groups and some exercises fit more than one. {catEx} sits under {catWrong} by design, and the category only affects the filter in the exercise picker, not your history or charts.',
		bug: '{catEx} is filed under {catWrong} instead of {catRight}',
		fix: '{catEx} was moved to {catRight} in the catalogue update on {fixdate}',
		fixHow: 'pull down on the exercise list to refresh it'
	},
	{
		weight: 1,
		subjects: ['Deleted a routine, are my logs gone?', 'History after deleting a routine', 'Old routine name missing', 'Did I lose my spring block?'],
		open: [
			'I tidied up my routines and deleted {routine}, which I ran all spring. Now I\'m worried: are the sets I logged with it gone? The history looks shorter.',
			'After deleting an old routine, the history shows a blank where the routine name used to be for those sessions. Is the data still there?',
			'I deleted {routine} by accident. Can it be restored? I still want the sets I logged with it.'
		],
		details: ['I logged about {n2} sets with that routine.', 'My volume chart for April and May looks the same as before, which is reassuring.', 'I only wanted to clear the list, not lose anything.'],
		first: ['Don\'t worry, let me check exactly what deleting a routine does before I say anything.', 'Thanks for writing in. I\'ll ask the developers what is kept when a routine is deleted.'],
		escalate: ['Member deleted a routine and fears the sets went with it. What happens to sets logged with a deleted routine?', 'Deleted routine: history shows blank routine names. Data still there?'],
		dev: ['The routine and its exercises are gone. The {n2} sets logged with it are all still on the account and still refer to it.', 'Deleting the routine removed the routine and its planned exercises only; every set logged with it is still there.'],
		more: ["That routine was my comeback after a long injury lay-off, so those sessions mean a lot to me. I panicked when the history looked shorter.", "I did get a warning when I deleted it, but it only said the routine would be removed, nothing about the sets."],
		steps: ["Member's routine {routine} no longer exists.", "Their sets from April and May are still in the console, {n2} of them.", "The history screen shows those sets with a blank routine name."],
		checks: ["The {n2} sets are all present and still refer to the deleted routine.", "Nothing was removed apart from the routine and its planned exercises."],
		probe: [["Did you delete anything else at the same time, or just the routine?", "Just the routine. I was tidying the routines list."], ["Was the routine linked to any sessions in the calendar?", "Yes, about two months of sessions."]],
		art: 'sets',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, if I delete an old routine do I lose the sets?', 'No, the sets stay in your history; only the routine and its planned exercises go.'],
		calc: (r) => ({ n2: String(int(r, 120, 640)) }),
		explain: 'Deleting a routine doesn\'t delete the sets you logged with it. They are all still in your history and charts; only the routine itself and its planned exercises are gone, which is why the routine name shows blank next to those sets.',
		bug: 'sets logged with a deleted routine show a blank routine name in the history instead of the routine they were done with',
		app: 'the sets are all still on the server, and it is the history screen in the app that hides them when it is filtered by routine'
	},
	{
		weight: 1,
		subjects: ['Chart ruined by a typo', 'Logged {typo} kg by mistake', 'Fix a wrong set', 'Huge spike in my volume'],
		open: [
			'I mistyped a set of {ex} as {typo} kg instead of {kg} kg on {date}, and now my volume chart has a spike that squashes everything else flat, and my estimated max is {typoest}. How do I fix it?',
			'There is a ridiculous set in my history, {typo} kg × {reps}. Obviously I didn\'t lift that. I tried to change it but the chart still shows the spike.',
			'Help, my charts are broken. One wrong set and the whole thing is useless.'
		],
		details: ['It was meant to be {kg} kg. I think I hit the 0 twice.', 'The rest of my history looks fine; it is just that one set.', 'I don\'t want to delete the set, I did do it, just at a sensible weight.'],
		first: ['That sounds annoying. You should be able to correct the set; let me check with the developers why the chart didn\'t follow.', 'Thanks for the details. I can see the set on your account. I\'ll ask the team.'],
		escalate: ['Member mistyped a set ({typo} kg), edited it, chart still shows the spike.', 'Typo set wrecking a member\'s charts. What\'s the right way to correct it?'],
		dev: ['The set is there as last saved: {current} kg × {reps} on {date}.', 'On the server the set reads {current} kg × {reps}.'],
		more: ["The chart's scale goes up to about {typovol} now, so all my normal weeks are a flat line at the bottom. It was the main thing I looked at after each session.", "My estimated max for {ex} jumped to {typoest}, which made me laugh and then made me want it fixed."],
		steps: ["Member's set on {date}: {ex} {current} kg × {reps}.", "Edited a set on the test account: the history updates at once.", "The charts on the test account follow after reopening the screen."],
		checks: ["The set on {date} reads {current} kg × {reps} on our side.", "The charts are worked out from the stored sets each time they are asked for."],
		probe: [["Did you edit the set on the phone or the tablet, and did you reopen the chart afterwards?", "On the phone, and I went straight back to the chart."], ["What do you see in the history for that set now?", "The history shows the right weight; only the chart is wrong."]],
		art: 'sets',
		quirk: 'typo',
		trace: 'plain',
		quick: ['Also, how do I fix a set I typed wrong?', 'Tap the set in the exercise history, change it and save.'],
		calc: (r, s) => {
			const kg = Number(s.kg);
			const typo = kg * 10;
			return { typo: num(typo), typoest: num(epley(typo, Number(s.reps))), current: pick(r, [num(typo), num(kg)]), typovol: thousands(Math.round((typo * Number(s.reps) * 3) / 1000) * 1000) };
		},
		explain: 'You can correct it: open the exercise history, tap the set from {date}, change the weight and save. The chart and the estimated max are worked out from your sets each time you open them, so they follow straight away.',
		app: 'the corrected weight is saved on the server straight away, and the app keeps drawing the old chart until it is closed and reopened',
		bug: 'editing a set\'s weight doesn\'t redraw the charts until the app is restarted',
		fix: 'app version 6.4.1 redraws the charts as soon as a set is edited'
	},
	{
		weight: 1,
		subjects: ['Export my data', 'CSV export?', 'Can I download my history?', 'Spreadsheet export for my coach'],
		open: [
			'I would like to get all my training history out as a spreadsheet, every set since I started. My coach does her analysis in Excel. Is there an export?',
			'Is there a way to download my logs? I want a backup in case I ever change phones and something goes wrong.',
			'I am writing a dissertation on my own training and need the raw data. How can I get it out of Liftbook?'
		],
		details: ['I have about {sets} sets, so copying by hand isn\'t an option.', 'Even just date, exercise, reps and weight would do.', 'My old app had an export button in the settings.'],
		first: ['As far as I know there isn\'t an export button yet, but let me check with the developers.', 'Thanks for asking. I\'ll check with the team.'],
		escalate: ['Export request: member wants full history as CSV.', 'Another CSV export request.'],
		dev: ['There is no export of any kind today.', 'No export exists. It comes up regularly.'],
		more: ["My coach keeps a spreadsheet of all her athletes' numbers and copies mine in by hand from screenshots I send her. A file would save her an hour a week.", "I'd be happy with the simplest thing: one row per set, with the date, exercise, reps and weight."],
		steps: ["No export option under Settings or in the history screen."],
		checks: ["Nothing exports sets; the history can only be viewed in the app."],
		probe: [["Which columns would you need in the file?", "Date, exercise, reps and weight. The session name would be nice to have."], ["Would a file sent by email be enough, or do you need it inside the app?", "Email is perfect. I just need the file."]],
		art: 'device',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, can I export my history?', "Not yet; there's no export at the moment."],
		calc: (r) => ({ sets: thousands(int(r, 18, 140) * 100) }),
		wish: 'exporting the training history as a spreadsheet file'
	},
	{
		weight: 1,
		subjects: ['Import from my old app', 'Bring my history across', 'Import CSV', 'Moving from {oldapp}'],
		open: [
			'I used {oldapp} for four years before switching. It exports a CSV with every set. Can I import that into Liftbook so my history and estimated maxes start from where I actually am?',
			'Is there any way to import old training data? I have six years in a spreadsheet.',
			'Thinking of moving all my clients over from {oldapp}. The deal-breaker is whether their history can come with them.'
		],
		details: ['The file has date, exercise, set number, reps, weight and a notes column.', 'Some of the exercise names won\'t match yours exactly, I expect.', 'It is about {sets} rows.'],
		first: ['Thanks for asking. I don\'t believe there is an import at the moment, but let me check.', 'I\'ll check with the developers whether anything can be done.'],
		escalate: ['Import request from {oldapp} CSV.', 'Member wants to import a spreadsheet of old sets.'],
		dev: ['There is no import of any kind at the moment; sets only come in one at a time through the app.', 'No import route exists.'],
		more: ["Years of data is a lot to leave behind: records, estimated maxes, the whole history of a squat going from 60 to {kg}. Starting at zero feels like starting again.", "I can tidy the file up myself if you tell me what format you need."],
		steps: ["No import option in the app or under Settings.", "The member's file has about {sets} rows, by their count."],
		checks: ["Sets are created one at a time; there is no import."],
		probe: [["How many different exercise names are in the file, roughly?", "About sixty, I counted once."], ["Which app version of {oldapp} made the export?", "The last version before they stopped updating it, I think from last year."]],
		art: 'device',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, can I import my old history?', 'Not at the moment, I\'m afraid.'],
		calc: (r) => ({ oldapp: pick(r, oldApps), sets: thousands(int(r, 30, 160) * 100) }),
		wish: "importing a training history from another app's export",
		need: 'the first twenty lines or so of the export file, so the developers can see its layout'
	},
	{
		weight: 1,
		subjects: ['Session notes cut off', 'My notes disappeared', 'Notes truncated', 'Lost half my notes'],
		open: [
			'I write fairly long notes after each session: how the lifts felt, sleep, what to change. Today\'s notes got cut off mid-sentence after saving. It was about three paragraphs.',
			'Where did my session notes go? I wrote a lot after {date}\'s session and only the first bit is there.',
			'My session notes stop after a few lines. Is there a limit?'
		],
		details: ['I write them on the bus home, so they are long.', 'Short notes are fine.', 'I copied them from my phone\'s notes app, if that makes a difference.'],
		first: ['Sorry about that. Let me check with the developers whether the notes were saved in full.', 'Thanks for writing in. I\'ll ask the team what happened to the rest of the text.'],
		escalate: ['Long session notes appear truncated. Saved in full?', 'Member\'s notes from {date} cut off. Can you see the full text?'],
		dev: ['The session notes reached the server complete, {notelen} characters, and are stored as sent.', 'The notes for that session are {notelen} characters long on our side.'],
		more: ["I use the notes as a training diary: sleep, food, how each lift moved, what to change next time. Losing half of it means losing the reasoning behind the next session.", "The first part is there and then it just stops, mid-word."],
		steps: ["Member's session on {date}: the notes on the session screen end mid-sentence.", "Wrote about 800 characters of notes on a test session: the screen shows the start only."],
		checks: ["Notes on the server for that session: {notelen} characters, complete."],
		probe: [["Did you type the notes in the app or paste them in?", "Typed them on the bus, straight into the app."], ["Roughly how long were the notes, in lines?", "About fifteen lines, three paragraphs."]],
		art: 'device',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, is there a limit on session notes?', 'Not on the length you can save, though the session screen may shorten what it shows.'],
		calc: (r) => ({ notelen: thousands(int(r, 620, 2400)) }),
		app: 'the notes are stored in full on the server, and the session screen in the app shows only the first 500 characters with no way to expand them',
		bug: 'the session screen cuts long notes off at 500 characters',
		fix: 'app version 6.4.1 shows the whole note, with a "more" link',
		need: 'the date of the session and a copy of the full text, if it still exists anywhere'
	},
	{
		weight: 1,
		subjects: ["Max screen won't load", 'Error on estimated max', 'Logged a missed rep and now an error', 'One-rep max page broken'],
		open: [
			'I missed a {kg} kg {ex} on {date} and logged it as 0 reps so I would remember. Since then the one-rep max screen for {ex} just says "Something went wrong" and won\'t load.',
			'My estimated max page for {ex} gives an error. Other exercises are fine. It started this week.',
			'The max screen has been broken for {ex} since {day}. I have reinstalled the app and it is the same.'
		],
		details: ['I like logging failed attempts, it helps me see when I am overreaching.', 'The volume chart still works for {ex}.', 'I logged a missed rep on bench a while ago too, come to think of it, but I deleted that set.'],
		first: ['Sorry about that. I can see the error on your account too. Let me get the developers to look.', 'Thanks for reporting it. I\'ll pass it on.'],
		escalate: ['Max screen errors for one exercise. Member logged a 0-rep set for a missed attempt.', 'Estimated max fails to load for {ex}.'],
		dev: ['The account has a {ex} set with 0 reps on {date}. The estimate refuses any set with fewer than one rep.', 'There is a 0-rep set on {date}; every other set of {ex} is ordinary.'],
		more: ["I keep a record of my misses because they tell me when I'm overreaching. My old notebook had them with a cross, and logging a 0 seemed the obvious way here.", "The rest of the app works. It's just this one screen, for this one exercise."],
		steps: ["Member's {ex} max screen: error.", "Their other exercises: fine.", "Found a {ex} set with 0 reps on {date}."],
		checks: ["The estimate refuses any set with fewer than one rep.", "The max screen asks for all of an exercise's sets in one go."],
		probe: [["Was that the only set you logged with 0 reps?", "I think so, for that exercise anyway."], ["Do you see the error on another device as well?", "Same on my tablet."]],
		art: 'sets',
		quirk: 'zero',
		trace: 'plain',
		exes: mainLifts,
		quick: ['Also, can I log a missed rep?', 'There is no special way to log a missed attempt; the session notes are the best place for now.'],
		bug: 'one set logged with 0 reps makes the estimated max fail for the whole exercise instead of being left out',
		need: 'the name of the exercise and the date of the set logged with no reps'
	},
	{
		weight: 1,
		subjects: ['History takes forever', 'App slow to load my logs', 'Exercise history spinning', 'Very slow since update'],
		open: [
			'I\'ve logged every set since {since}, about {sets} sets. The history screen now takes 15 to 20 seconds to appear and sometimes gives up. Everything else is quick.',
			'Opening my history is painfully slow. My friend with a newer account says hers is instant.',
			'The logs page spins for ages on mobile data. On wifi it is a bit better but still slow.'
		],
		details: ['It has got gradually worse over the last year.', 'The charts are slow too, but not as bad.', 'I don\'t really need to see 2019 every time, just the last few months.'],
		first: ['Thanks for the detail. You have a lot of history, which may be the reason. Let me ask the developers.', 'Sorry about this. I\'ll get the team to look at what is slow.'],
		escalate: ['Long-time member, {sets} sets, history very slow.', 'History loading slowly for a big account.'],
		dev: ['The account has {sets} sets. Loading the history fetches all of them in one response of about {mb} MB, which took {secs} s on staging before the app could draw anything.', 'Every set comes back in one response, {sets} of them for this account.'],
		more: ["I like having the whole history, it's a record of years of work. But I mostly look at the last few weeks, and waiting for everything since {since} to load each time is painful in the gym.", "On the gym wifi it sometimes gives up altogether and shows an empty history, which gave me a fright the first time."],
		steps: ["Member's history on the test device: about {secs} seconds to appear.", "A newer test account with a few hundred sets: instant."],
		checks: ["History for this account: {sets} sets in one response, about {mb} MB.", "The list of sets has no paging."],
		probe: [["Is it slow everywhere in the app, or only in the history?", "Only the history, and the charts a little."], ["Which screen is slowest: the full history or one exercise's history?", "The full history. One exercise is better but still slow."]],
		art: 'device',
		quirk: 'none',
		trace: 'slow',
		quick: ['Also, the history is slow to open.', "That's usually down to the amount of history; the developers are aware."],
		calc: (r) => {
			const sets = int(r, 90, 210) * 100;
			return { sets: thousands(sets), since: String(int(r, 2017, 2021)), mb: num(Math.round(sets * 0.00021 * 10) / 10), secs: num(Math.round(sets * 0.0006 * 10) / 10) };
		},
		bug: 'the list of sets has no paging, so long histories come back in one very large response',
		need: 'roughly how many years of history the account holds and whether it is slow on wifi as well as on mobile data'
	},
	{
		weight: 1,
		subjects: ['Session linked to the wrong routine', 'Workout shows the wrong programme', 'Wrong routine on my session', 'Did {routine2} twice?'],
		open: [
			'I started a session from my "{routine}" routine but it is saved under "{routine2}". Now the session history says I did {routine2} twice this week.',
			'Two of my sessions this week have the wrong routine attached. I definitely picked the right one.',
			'Why does my session say {routine2}? I did {routine}.'
		],
		details: ['Both times I started from the calendar rather than the routines tab.', 'The sets are right, it is only the routine name.', 'It does not happen when I start from the routine page.'],
		first: ['Thanks for writing in. I can see the session with {routine2} attached. Let me check with the developers how that happened.', 'I can see what you mean. I\'ll pass it to the team.'],
		escalate: ['Session saved with a different routine from the one the member started.', 'Wrong routine on sessions started from the calendar.'],
		dev: ['The session was saved with {routine2} attached. The API keeps whichever routine the app sends.', 'The request that created the session named {routine2}.'],
		more: ["I alternate {routine} and {routine2}, and I check the session list to see which is next. When the wrong routine is attached I get the order wrong.", "It's not a big deal to fix by hand, but it keeps happening."],
		steps: ["Member's session on {date}: attached to {routine2}.", "Started a session from the calendar on the test account: the routine attached was the last one used."],
		checks: ["The session was created with {routine2} in the request."],
		probe: [["Where did you start the session from: the calendar, the routines tab or a notification?", "From the calendar, both times."], ["Has it happened with sessions you started from the routines tab?", "No, only from the calendar."]],
		art: 'device',
		quirk: 'none',
		trace: 'session',
		quick: ['Also, one of my sessions has the wrong routine.', 'You can change it from the session itself: tap the routine name under the date.'],
		explain: 'You can change it: open the session, tap the routine name under the date and choose {routine}. Your sets aren\'t affected either way.',
		app: 'when a session is started from the calendar, the app attaches the routine used last rather than the one picked',
		bug: 'starting a session from the calendar attaches the last routine used instead of the one picked',
		fix: 'app version 6.4.1 attaches the routine you actually start from'
	},
	{
		weight: 1,
		subjects: ['Logged into the wrong workout', 'Move sets to another day', 'Wrong session', 'Two sessions open'],
		open: [
			'I had two sessions open by mistake and logged half of today\'s sets into {day}\'s session. Is there a way to move them across without deleting and re-entering them all?',
			'Can I move sets from one session to another? I put my assistance work into yesterday by mistake.',
			'I logged a whole session into the wrong day. {n} sets. Please tell me I don\'t have to type them again.'
		],
		details: ['It is {n} sets in all.', 'The weights and reps are all right, only the session is wrong.', 'I didn\'t notice until I looked at the calendar the next morning.'],
		first: ['Sorry about that. Let me check with the developers whether there is a way to move them.', 'I can see the two sessions. I\'ll ask the team.'],
		escalate: ['Member wants to move sets between sessions.', 'Sets logged into the wrong session. Any way to move them?'],
		dev: ['The app\'s set editor changes reps, weight and date. Nothing in it moves a set to another session.', 'There is no move in the app.'],
		more: ["I had opened {day}'s session to check my notes and then started logging without noticing. The sets are all correct, they're just in the wrong session.", "Deleting and re-entering {n} sets is doable, but I'd rather not."],
		steps: ["Member has two sessions, {day}'s with {n} extra sets.", "Set editor on the test account: no way to change a set's session."],
		checks: ["The set editor in the app offers reps, weight and date only."],
		probe: [["How many sets are in the wrong session?", "{n}, all from that one day."], ["Were both sessions created on the same day?", "Yes, both that morning."]],
		art: 'sets',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, can I move a set to a different session?', 'Not yet; for now you would delete it and log it again.'],
		explain: 'At the moment the way to do it is to delete those sets from the wrong session and log them again in the right one. Your charts are right either way, because they follow each set\'s own date.',
		wish: 'moving sets from one session to another'
	},
	{
		weight: 1,
		subjects: ['Entering a paper log', 'Faster way to enter past sessions', 'Back-filling two weeks', 'Bulk entry?'],
		open: [
			'I was on a work trip for two weeks with no phone signal in the gym and kept a paper log. Now I have {past} sets to enter. Each one takes four taps and a date change. Is there a faster way?',
			'Is there a way to enter a whole session at once? I train with a notebook and type it up in the evening.',
			'Back from holiday with a fortnight of sets on paper. Typing them in one by one is painful.'
		],
		details: ['It is mostly the same exercises each session.', 'I would happily paste them in as text.', 'Changing the date on every set is the worst part.'],
		first: ['That does sound slow. Let me check with the developers whether there is a quicker route.', 'Thanks for asking. I\'ll check with the team.'],
		escalate: ['Member back-filling a paper log, wants bulk entry.', 'Request to enter a whole past session in one go.'],
		dev: ['Sets go in one at a time, each with its own date.', 'Each set is its own save.'],
		more: ["I wrote everything down: date, exercise, sets, reps, weight, all neat. Typing it in is the problem: {past} sets, each with a date change.", "If I could paste a block of text, or enter a whole session on one screen, it would take ten minutes instead of an hour."],
		steps: ["Logged a back-dated set on the test account: four taps plus a date change.", "Started a session with a past date: its sets take the session's date."],
		checks: ["Each set is saved on its own."],
		probe: [["How many sessions are the sets spread over?", "Eight sessions over the two weeks."], ["Do the sessions all use the same routine?", "Mostly, apart from one deload day."]],
		art: 'sets',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, is there a quick way to enter old sessions?', 'Starting a session with the right date and logging inside it saves changing each set\'s date.'],
		calc: (r) => ({ past: String(int(r, 40, 120)) }),
		explain: 'The quickest way today is to start a session, set its date to the day you trained, and log the sets inside it. Each set then takes the session\'s date, so you change the date once per session rather than once per set.',
		wish: 'entering a whole past session in one go'
	},
	{
		weight: 1,
		subjects: ['Plan vs actual', 'Compare to what was planned', 'Which planned set was this?', 'Session view idea'],
		open: [
			'My routine says 5 × 5 at {kg} kg for {ex}. I would love the session view to show my sets next to the plan, so I can see at a glance that I got 5, 5, 4, 3, 3.',
			'Is there any way to see the planned sets and reps while I log, side by side with what I actually did?',
			'When I review a session I can\'t tell which sets were for which part of the plan, especially when I do two variations of the same lift.'
		],
		details: ['My coach checks this every week by hand.', 'I do {ex} twice in one session sometimes, heavy and then back-off sets.', 'Even a tick next to each planned set would help.'],
		first: ['That\'s a nice idea. Let me check with the developers whether anything like it is planned.', 'Thanks for the suggestion. I\'ll pass it on.'],
		escalate: ['Plan vs actual view request.', 'Member wants each logged set shown against the routine\'s plan.'],
		dev: ['The session screen lists the sets logged. Nothing ties a set to the planned exercise it was done for.', 'A set records exercise, reps, weight and date, plus the session and routine. Not which planned exercise.'],
		more: ["My coach writes \"5 × 5 at {kg}\" and wants to know which sets I made. I tell her in the notes, but it would be nicer to see it.", "Even a simple column of planned reps next to my logged reps would do."],
		steps: ["The session screen lists the logged sets only.", "The routine screen shows the plan; nothing connects the two."],
		checks: ["Sets record exercise, reps, weight, date, session and routine, but not the planned exercise."],
		probe: [["Do you change the routine during a session, or always follow it as written?", "Always as written; my coach is strict about that."], ["Would you want the plan shown while logging, or only when reviewing afterwards?", "While logging, ideally."]],
		art: 'routine',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, could the session show my plan next to my sets?', "Not yet, but I'll pass the idea on."],
		wish: 'showing each logged set against the planned sets of the routine'
	},
	{
		weight: 1,
		subjects: ['Rest timer stops in background', "Timer doesn't alert", 'Rest timer', 'No sound when rest ends'],
		open: [
			'The rest timer stops when my phone screen locks. I put the phone down, and three minutes later I realise it never buzzed.',
			'My rest timer doesn\'t make a sound any more. It used to.',
			'The timer resets to zero when I switch to my music app.'
		],
		details: ['Do Not Disturb is off.', 'Battery saver is on most of the time, if that matters.', 'It started after the last update.'],
		first: ['Sorry about this. I\'ll check with the developers.', 'Thanks for reporting it. I\'ll pass it on.'],
		escalate: ['Rest timer not firing in the background. Ours or the app\'s?', 'Rest timer problem, possibly misrouted.'],
		dev: ['Nothing about the rest timer reaches the server, so there is nothing to see on our side.', 'The timer never talks to the API.'],
		more: ["I rest three minutes on heavy sets and rely on the buzz. Without it I either sit too long or keep checking the phone, which defeats the point.", "It used to work fine with the screen locked."],
		steps: ["Rest timer on the test phone: alerts with the screen on.", "With the screen locked: no alert on the Android test phone."],
		checks: ["No requests from the timer at all."],
		probe: [["Is battery saver on when it happens?", "Yes, most of the time it is."], ["Which phone do you use?", "{device}."]],
		art: 'device',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, my rest timer stops when the screen locks.', "I'll mention that to the app team."],
		app: 'the rest timer runs entirely on the phone and never talks to the server',
		bug: 'the rest timer stops when the screen locks',
		fix: 'app version 6.4.1 keeps the timer running with the screen locked',
		need: 'the phone model and whether battery saver was on at the time'
	},
	{
		weight: 1,
		subjects: ['Watch sets missing', 'Watch app not syncing', 'Sets from my watch arrive late', 'Watch log delay'],
		open: [
			'I log on my watch at the gym and the sets only appear on my phone hours later, sometimes the next day.',
			'Half of yesterday\'s sets from my watch are missing. The other half are there.',
			'The watch app says "saved" but the sets don\'t show up in the history until I open the phone app.'
		],
		details: ['The phone is in my locker during the session.', 'It worked fine until about a month ago.', 'They do eventually turn up, all at once.'],
		first: ['Thanks for writing in. Let me check with the developers when the sets reached us.', 'I\'ll get the team to look at the timings.'],
		escalate: ['Watch sets arriving hours late.', 'Watch sync delay. Can you see when the sets arrived?'],
		dev: ['The sets reached the server in one batch at {late}, about {hrs} hours after the times on them. No failed requests in between.', 'All of {date}\'s sets arrived together at {late}.'],
		more: ["I leave my phone in the locker and log everything on the watch. When I get home the sets aren't there; they turn up when I open the app the next morning.", "If I forget to open the app, my weekly volume is wrong until I do."],
		steps: ["Member's sets from {date}: all arrived at {late}.", "Logged on the test watch with the phone app closed: the sets arrived when the app was opened."],
		checks: ["The sets arrived in one batch, all within a minute.", "No failed requests from the member's phone in between."],
		probe: [["Is the phone near the watch while you train?", "No, it stays in the locker on the other side of the gym."], ["Which watch is it, and is its app up to date?", "The one I bought in the spring, and yes, it updates by itself."]],
		art: 'device',
		quirk: 'none',
		trace: 'batch',
		quick: ['Also, my watch sets show up late.', 'They are sent through the phone app, so opening it usually brings them in.'],
		calc: (r) => ({ hrs: String(int(r, 3, 19)) }),
		app: 'the watch hands its sets to the phone, and the phone only sends them on when the app is opened',
		bug: 'sets logged on the watch wait on the phone until the app is opened',
		fix: 'app version 6.4.1 sends watch sets in the background as soon as the phone receives them',
		need: 'the watch model, its app version, and the time of one set that arrived late'
	},
	{
		weight: 1,
		subjects: ['Sessions in the wrong order', 'Back-dated session at the top', 'Session list order', 'History order confusing'],
		open: [
			'I added a session from last week that I had forgotten to log, and it appears at the top of my session list as if it were the newest.',
			'My session list isn\'t in date order. Some older sessions are above newer ones.',
			'The sessions list is a mess since I back-filled a few days from my notebook.'
		],
		details: ['The dates on the sessions themselves are right.', 'It is only the ones I added later.', 'The calendar view is fine, only the list.'],
		first: ['Thanks for explaining. Let me check how the list is ordered.', 'I\'ll ask the developers why the list isn\'t in date order.'],
		escalate: ['Session list not in date order after back-filling.', 'Back-dated sessions appear at the top of the list.'],
		dev: ['Sessions come back from the API in the order they were created. The back-dated one was created last.', 'The list is in creation order, not by date.'],
		more: ["I like scrolling the list to see the last few weeks. With back-filled sessions at the top, the list looks like I trained on dates in the past, which of course I did, but they should be further down.", "The calendar is right; only the list is off."],
		steps: ["Member's session list: the back-dated session is at the top.", "Created a back-dated session on the test account: same."],
		checks: ["Sessions are returned in the order they were created."],
		probe: [["Did you add the back-dated session from the calendar or from the sessions list?", "From the calendar, by tapping the day."], ["Does it also happen for sessions you create on the day itself?", "No, only the ones I add afterwards."]],
		art: 'device',
		quirk: 'none',
		trace: 'plain',
		quick: ['Also, my sessions list is out of order.', 'It follows the order sessions were added in; the calendar view goes by date.'],
		bug: 'sessions are listed in the order they were created rather than by date',
		app: 'the app shows sessions in the order the API returns them instead of sorting them by date'
	}
];


// Typical working weights in kilograms, per lift: lowest, highest and the step they move in.
const liftRange: Record<string, [number, number, number]> = {
	'Back squat': [60, 200, 2.5], 'Bench press': [40, 140, 2.5], Deadlift: [80, 240, 2.5], 'Overhead press': [30, 90, 2.5], 'Front squat': [50, 160, 2.5], 'Sumo deadlift': [80, 230, 2.5],
	'Paused bench press': [40, 130, 2.5], 'Close-grip bench press': [40, 120, 2.5], 'Romanian deadlift': [50, 180, 2.5], 'Barbell row': [40, 120, 2.5], 'Pull-up': [0, 30, 2.5], 'Chin-up': [0, 30, 2.5],
	Dip: [0, 40, 2.5], 'Hip thrust': [60, 220, 2.5], 'Leg press': [100, 320, 5], 'Lat pulldown': [35, 90, 2.5], 'Incline dumbbell press': [14, 44, 2], 'Bulgarian split squat': [10, 60, 2],
	'Face pull': [10, 35, 2.5], 'Cable row': [35, 100, 2.5], 'Goblet squat': [16, 40, 2], 'Kettlebell swing': [16, 40, 4], 'Calf raise': [40, 140, 5], 'Leg curl': [20, 70, 2.5], 'Lateral raise': [6, 16, 1], 'Hammer curl': [10, 26, 2]
};
const liftKg = (r: Rand, lift: string) => {
	const [low, high, step] = liftRange[lift] ?? [20, 100, 2.5];
	return Math.round((low + r() * (high - low)) / step) * step;
};

const story = (r: Rand, s: Slots) => {
	const parts = shuffle(r, allLifts).slice(0, int(r, 2, 3)).map((lift) => `${lift.toLowerCase()} ${int(r, 3, 5)} × ${int(r, 3, 10)} at ${num(liftKg(r, lift))} kg, which ${pick(r, feelings)}`);
	const joined = parts.length > 2 ? `${parts.slice(0, -1).join('; ')}; and ${parts.at(-1)}` : parts.join(', then ');
	return fill(pick(r, storyFrames), { ...s, parts: joined });
};

// Parts any ticket may use. {m} is the member's first name, {agent} the support agent, {dev} the API developer.
const memberHello = ['Hi,', 'Hello,', 'Hi there,', 'Hi Liftbook team,', 'Hey,', 'Hello support,', 'Hi folks,', 'Dear Liftbook,'];
const memberByeLater = ['{m}', 'Cheers,\n{m}', 'Thanks,\n{m}', 'Thanks again,\n{m}', '{M}'];
const memberBye = ['Thanks,\n{m}', 'Cheers,\n{m}', 'Many thanks,\n{M}', '{m}', 'Thanks in advance!\n{m}', 'Best,\n{M}', 'Ta,\n{m}', 'Thanks for any help,\n{m}', '{M}\nSent from my phone'];
const backstories = [
	"I'm eleven weeks out from my first powerlifting meet, so I'm watching the numbers more closely than usual.",
	"I've used Liftbook since 2023 and this is the first time I've had to write in, so well done on that front.",
	"Coming back from knee surgery, so the logs are how I show my physio I'm progressing.",
	"I train at six in the morning before work, so I'm usually half asleep when I log, to be fair.",
	'I run the strength sessions for our rowing club and get the juniors to log everything in the app.',
	'Not a big deal in the grand scheme of things, but I like my data tidy.',
	"I'm in my sixties and fairly new to lifting, so forgive me if I'm missing something obvious.",
	"I moved over from a paper notebook in the spring and I've been really happy with the app otherwise.",
	'Training for a novice strongman competition in December, so every session counts at the moment.',
	"I'm a personal trainer and recommend Liftbook to my clients, so I get asked about this a lot.",
	'I log every set, warm-ups included, which I gather is unusual.',
	'My wife uses the app too and has seen the same thing on her phone.',
	"I'm doing a twelve-week block from a coach who sends me spreadsheets, and I copy them into the app.",
	"Deadlifts are my thing; everything else is assistance work as far as I'm concerned.",
	"I train in a small club gym that's open till midnight, and I'm often the last one there.",
	'I travel a lot for work and train in whatever hotel gym I can find.',
	"I've just finished a cut and I'm trying to keep my strength while I eat a bit more.",
	'Apologies for the long message, I wanted to give you everything at once.',
	"I'm not very technical, so I hope this makes sense.",
	'My gym is in a converted mill and the signal inside is patchy at best.',
	'Started lifting at forty-five and loving it; the app has been a big part of keeping me consistent.',
	'I teach PE and use the app to plan the sixth-form strength club.',
	'Six months into my first proper programme, so still learning the ropes.',
	'I compete in masters weightlifting and use Liftbook for my strength days.',
	'I came to lifting from running, after one injury too many, and the app is how I keep myself honest.',
	"I'm a firefighter and our station gym has a whiteboard that everyone copies into the app after shifts."
];
const memberAsides = [
	"Sorry for the slow reply, it's been a busy week at work.",
	'Thanks for getting back to me so quickly.',
	'I tried logging out and back in, as the help page suggests, and nothing changed.',
	"I've also updated the app since I first wrote, in case that matters.",
	'I checked on my tablet as well and it looks the same there.',
	'Happy to test anything if it helps.',
	'I asked a friend at the gym and his app does the same thing.',
	'Sorry, I meant to send this yesterday.',
	"I've had a proper look this time rather than in the gym between sets."
];
const supportHello = ['Hi {m},', 'Hello {m},', 'Hi {m}, thanks for getting in touch.', 'Thanks for writing in, {m}.', 'Hi {m}, and thanks for the detail.', 'Hello {m}, sorry for the slow reply, the queue has been long this week.', 'Hi {m}, thanks for your message.'];
const supportHelloAgain = ['Hi {m},', 'Hello {m},', 'Hi again {m},', 'Hi {m}, a quick update.', 'Hello again {m},'];
const supportBye = ['Best wishes,\n{agent}', '{agent}\nLiftbook support', 'Thanks,\n{agent}', 'Kind regards,\n{agent} (Liftbook support)', 'Speak soon,\n{agent}', 'All the best,\n{agent}'];
const supportAsks: [string, string][] = [
	['Could you tell me roughly when you first noticed it, and whether it happens every time?', 'I first noticed it around {date}, and it has happened every time I have looked since.'],
	["Which version of the app are you on? It's under Settings, About.", "It says {ver}. I haven't changed anything else recently."],
	['Could you give me the date of one session where you saw this, so I can find it on your account?', 'The clearest one is {day} {date}.'],
	['Is it the same on wifi and on mobile data?', 'Same on both, as far as I can tell.']
];
const passOn = [
	"I've passed this to our developers with your examples so they can take a proper look. I'll come back to you as soon as I hear from them.",
	"This needs someone who knows the server side, so I've sent it to the API team with everything you've told me.",
	"I'd rather not guess, so I've asked the developers. Bear with me.",
	"I've sent this on to the team that looks after the data side of Liftbook; they usually answer within a couple of working days.",
	"I've raised it with the developers and linked your message so they have the full picture."
];
const passOnAck = ['Thanks, that helps.', 'Understood.', 'Fair point, and thanks for the extra detail.', "Thanks, that's everything I need."];
const notePrefix = ['Passing to the API team.', 'For the API team:', 'Escalating.', 'Over to the API team.'];
const noteRemarks = ['Member is patient, but this is the second time they have written about it.', 'Low priority for the member, but we keep getting this one.', 'We have no help centre article on this.', 'Linked a similar ticket from last month.', 'Nothing on the status page for that day.', 'Member has been with us since 2022.', 'Member is a coach and several of their clients use the app.'];
const stepIntro = ['Tried on the test account:', 'What I did on the test account:', 'Steps I followed:', 'Reproduction attempt:'];
const checkIntro = ['What I checked:', 'Checked:', 'Looked at:'];
const devAsks: [string, string][] = [
	['Do we know which app version they were on at the time?', 'They were on {ver} when they wrote in, according to the diagnostics.'],
	['Is this the only report, or have others come in?', 'I know of two others this month. Linked them.'],
	['Is the member on one device, or phone and tablet?', 'Phone only, as far as the diagnostics show.'],
	['Has the member reinstalled the app recently?', 'The diagnostics say this install dates from {joined}.']
];
const memberChase = ['Any news on this one?', 'Just checking in on this. Still seeing it.', 'It happened again this morning, in case that helps.', "Any update? No rush, just making sure it hasn't fallen through the cracks.", 'Is there anything I can do in the meantime?'];
const supportHolding = ["No news yet, sorry. It's still with the developers and I've nudged them.", "Still with the API team. They've had a busy week with a release, but it's on their list.", "Thanks for your patience. I've asked for an update and will let you know.", "Sorry for the wait. I've chased the developers this morning."];
const sideBack = ['Unrelated to the main thing, but about my other question:', 'One more on the side question from my first message:', 'Going back to the other thing I asked:'];
const sideSplit = ["On your second question, I've opened a separate ticket for it, {ref}, so it gets its own look and doesn't get lost in this one.", "For the other question, I've split it into its own ticket, {ref}. You'll hear about it there."];
const storyFrames = ["For what it's worth, it was a {routine} day: {parts}.", "This morning's session was {parts}.", 'Last {day} I did {parts}.', 'I noticed it after a decent session: {parts}.', 'Context, in case it helps: today was {parts}.'];
const feelings = ['felt heavy', 'moved well', 'flew up', 'was a grind', 'felt better than last week', 'was slow off the floor', 'felt smooth', 'nearly stalled on the last rep', 'went fine', 'left a rep or two in the tank'];
const nextSteps = ["Once the developers have had a look I'll write back here, so there's no need to raise it again in the meantime.", 'If anything changes before you hear from me, reply to this message and it will come straight to me.', 'I\'ve added your examples to the ticket so you won\'t have to repeat them.'];
const devRemarks = ["Staging has Monday's copy of production, so the member's data is there to look at.", 'This matches an older ticket from the spring that was closed without a cause.', 'I looked at a handful of other accounts as well and see the same pattern.', 'Nothing in the error logs for that period.', 'No deploys on our side that week.', 'The rest of the account looks ordinary.'];
const answeredExtra = ["I've also asked our help centre team to write this up, since you're not the first to ask.", "I'll keep this ticket open for a few days in case anything else comes up."];
const owedWorkaround: [string, string][] = [['Is there anything I can do in the meantime?', "Not a good workaround, I'm afraid. The fix is what's needed, and I'll let you know when it's out."], ['Should I keep logging as normal?', 'Yes, please carry on as normal. Nothing you log will be lost.']];
const probeAsk = ['Could support ask the member: {q}', 'One question for the member, please: {q}', 'Before I go further, can we find out: {q}'];
const probeRelay = ['One question from the developers: {q}', 'The developers have asked: {q}', 'Quick question from the team looking at this: {q}'];
const followNew: Record<string, string[]> = {
	owed: ['Another one this week, for your collection.', 'It happened again, so here is a fresh example.', 'Adding another example in case it helps.'],
	app: ['It happened again, so here is a fresh example.', 'Adding another example in case it helps.'],
	request: ['One more thought on this, for the request:', 'Another reason this would help:', 'Adding to my request, if that is useful:']
};
const followReply: Record<string, string[]> = {
	owed: ["Thanks, I've added this example to the developers' report.", "Thank you, that's attached to the bug report now."],
	app: ["Thanks, I've passed this one to the app team as well.", "Thank you, I've added it to what the app team already has."],
	request: ["Thanks, I've added that to your request.", "Noted on the request, thank you."]
};
const tried = ['Restarted the app', 'Logged out and back in', 'Reinstalled the app', 'Restarted the phone', 'Checked on my tablet', 'Turned wifi off and used mobile data', 'Updated the app from the store', 'Cleared the app cache in the phone settings'];
const devLooking = ['At first sight this looks like ours. I will dig in properly tomorrow.', 'Looks like a fault on our side; I will confirm once I have reproduced it.', 'This may be ours. Leave it with me.'];

// How tickets end. Each outcome has the API team's verdict, support's message to the member and the member's reply.
const answeredDev = ['Not a fault, as far as I can tell. {explain}', 'This is working as it should. {explain}', "Had a proper look and I don't think anything is broken. {explain}"];
const answeredDevCorrection = ['Correction to my note above: not a bug after all. {explain}', 'Scratch what I said earlier. Having reproduced it properly, nothing is wrong. {explain}'];
const answeredSupport = ["I've heard back from the developers. {explain} I hope that clears it up; do write back if it doesn't.", 'Good news: nothing is wrong with your account. {explain}', "The developers have looked into it and explained what's going on. {explain}"];
const answeredMember = ["That makes sense, thank you. I'll stop worrying about it.", 'Ah, understood. Thanks for taking the time to explain.', "OK, that's fine then. Thanks both.", 'Right, got it. Mystery solved.', 'Perfect, that works. Thanks for the quick help.'];
const owedDev = ["Confirmed, this is ours: {bug}. I've added it to the API backlog. It won't make this sprint.", 'Reproduced. {Bug}. It is on the list now, behind the release work.', 'Yes, a real bug: {bug}. Logged for the API team; no date yet.'];
const owedSupport = [
	"The developers have confirmed the problem, so it isn't anything you're doing. It's now on their list to fix. I can't give you a date, but your ticket is linked, so I'll hear when it changes.",
	'Thank you for reporting this. The API team agree it is a bug and have logged it. I will let you know when there is a fix.',
	"I've had confirmation from the developers that this is a fault on our side. It is logged and waiting for a fix; I'll keep this ticket open and update you."
];
const owedMember = ["Thanks. As long as it's known about.", "Fair enough, thanks for confirming I'm not going mad.", "OK. I'll live with it for now.", 'Good to know, thanks for chasing it.'];
const pushback = ["That doesn't quite explain it, I'm afraid. {detail}", "Thanks, but I don't think that's it. {detail}", 'I follow, but something still seems off. {detail}'];
const fixedDev = ['Confirmed: {bug}.', 'Reproduced: {bug}. Picking it up.'];
const fixedNews = ['This one is done: {fix}.', 'Fixed: {fix}.'];
const fixedSupport = ['Good news: {fix}. Could you {fixHow} and let me know whether it looks right now?', 'A fix has gone out: {fix}. If you {fixHow}, it should be sorted.'];
const fixedMember = ['Just tried it and it works now. Thanks!', 'All good now, thank you.', 'Confirmed, fixed on my side. Thanks for sorting it.'];
const fixedStill = ['Still the same here, sorry.', "Hmm, I'm still seeing it."];
const fixedAgain = ['Could you {fixHow}? The change only shows once you have.', 'Thanks for trying. Please {fixHow} first; the fix only appears after that.'];
const requestDev = ["This is a feature request rather than a fault: {wish}. I've added it to the requests list with this ticket linked.", "Nothing is broken here; the app simply doesn't offer {wish} yet. Logging it as a request.", "We don't support that today. {Wish} is already on the requests list; I've added this member to it."];
const requestDevCorrection = ["Correction: this isn't a bug, it's working as designed. What the member is after is {wish}, which is a request. Logged.", "Having looked properly, nothing is broken. It needs {wish}, which we don't have. Request logged."];
const requestSupport = [
	"I've spoken to the developers. This isn't something Liftbook can do yet, but I've recorded your request for {wish}, and requests like yours count when they plan the next releases.",
	"Thanks for the suggestion. It isn't possible at the moment, and I've added your vote for {wish}. I can't promise when, or whether, it will happen, but it has been noted."
];
const requestMember = ['Shame, but thanks for passing it on.', 'OK. Please do push for it!', 'Understood, thanks.', 'Fingers crossed it makes it in.'];
const waitingDev = ["I can't reproduce this on staging with what we have. Could support ask the member for {need}?", "Nothing obvious on the account. I'd need {need} before I can say whether this is ours or the app's.", 'Hard to say from here. Can we get {need}?'];
const waitingSupport = ['To look into this further the developers need {need}. Could you send that when you get a moment?', 'One more thing from the developers: could you send {need}? That will tell them where to look.'];
const waitingMember = ['Will do, I will get that to you at the weekend.', "Sure, I'll send it after my next session.", "OK, I'll dig it out."];
const appDev = ['The API is answering correctly here: {app}. This one is for the app team.', "Not ours, I'm afraid. {App}. Passing it to the app team."];
const appDevCorrection = ['Correction to my note above: our side is fine. {App}. Handing it to the app team.', 'Update: the requests and responses are all correct. {App}. Moving it to the app team.'];
const appSupport = [
	"The developers have traced this to the app itself rather than our servers, so I've passed it to the app team, who track their own fixes. I'll update you if I hear from them.",
	'This turns out to be in the app rather than in your data. It is with the app team now, and they have the details.'
];
const appMember = ['Thanks for the update.', 'OK, thanks for passing it along.', 'Understood. Hope they get to it soon.'];

// Pasted output.
const setsTable = (r: Rand, topic: Topic, s: Slots, before: number): string => {
	const lifts = shuffle(r, topic.exes ?? allLifts).slice(0, 4);
	if (!lifts.includes(s.ex!)) lifts[0] = s.ex!;
	const head =
		topic.quirk === 'units'
			? ['| Date | Exercise | Reps | Typed | Stored (kg) | Shown |', '| --- | --- | ---: | ---: | ---: | ---: |']
			: topic.quirk === 'dupes'
				? ['| Date | Saved at | Exercise | Reps | Weight (kg) |', '| --- | --- | --- | ---: | ---: |']
				: ['| Date | Exercise | Reps | Weight (kg) | Session |', '| --- | --- | --- | ---: | --- |'];
	const rows: string[] = [];
	let t = before - int(r, 6, 12) * DAY;
	for (let d = int(r, 2, 4); d > 0; d--) {
		t += int(r, 1, 3) * DAY;
		const iso = isoOf(t);
		for (const lift of shuffle(r, lifts).slice(0, int(r, 2, 3))) {
			const weight = lift === s.ex ? Number(s.kg) : liftKg(r, lift);
			for (let k = int(r, 2, 4); k > 0; k--) {
				const reps = int(r, 3, 10);
				if (topic.quirk === 'units') {
					const lb = Math.round(weight / 0.45359237 / 2.5) * 2.5;
					const stored = lbToKg(lb);
					rows.push(`| ${iso} | ${lift} | ${reps} | ${num(lb)} lb | ${num(stored)} | ${kgToLbShown(stored)} lb |`);
				} else if (topic.quirk === 'dupes') {
					const hh = int(r, 6, 20);
					const mm = int(r, 0, 59);
					const copies = r() < 0.35 ? int(r, 2, 3) : 1;
					for (let c = 0; c < copies; c++) rows.push(`| ${iso} | ${pad(hh)}:${pad(mm)}:${pad(int(r, 0, 9) + c * 11)} | ${lift} | ${reps} | ${num(weight)} |`);
				} else rows.push(`| ${iso} | ${lift} | ${reps} | ${num(weight)} | ${topic.quirk === 'nosession' && r() < 0.3 ? '(none)' : iso} |`);
			}
		}
	}
	if (topic.quirk === 'dupes') rows.sort();
	const shown = rows.slice(0, 24);
	if (topic.quirk === 'typo') shown.splice(int(r, 0, shown.length), 0, `| ${isoOf(before - 2 * DAY)} | ${s.ex} | ${s.reps} | ${s.current} | ${isoOf(before - 2 * DAY)} |`);
	if (topic.quirk === 'zero') shown.splice(int(r, 0, shown.length), 0, `| ${isoOf(before - 3 * DAY)} | ${s.ex} | 0 | ${s.kg} | ${isoOf(before - 3 * DAY)} |`);
	return [...head, ...shown].join('\n');
};

const maxTable = (r: Rand, topic: Topic, s: Slots, at: number): string => {
	const rows = ['| Exercise | Best set | Date | Estimated max (kg) |', '| --- | --- | --- | ---: |'];
	const lifts = shuffle(r, topic.exes ?? mainLifts).slice(0, int(r, 4, 5));
	if (!lifts.includes(s.ex!)) lifts[0] = s.ex!;
	for (const lift of lifts) {
		let weight = liftKg(r, lift);
		let reps = int(r, 2, 8);
		if (lift === s.ex && topic.quirk === 'single') [weight, reps] = [Number(s.kg), 1];
		if (lift === s.ex && topic.quirk === 'highreps') [weight, reps] = [Number(s.kg), Number(s.hreps)];
		rows.push(`| ${lift} | ${num(weight)} kg × ${reps} | ${dayOf(at - int(r, 1, 120) * DAY)} | ${num(epley(weight, reps))} |`);
	}
	return rows.join('\n');
};

const volumeTable = (r: Rand, topic: Topic, s: Slots, at: number): string => {
	const rows = ['| Week | Starts | Sets | Volume (kg) |', '| ---: | --- | ---: | ---: |'];
	const yearView = topic.quirk === 'year';
	const weeks = int(r, 9, 14);
	const firstMonday = Date.UTC(2025, 11, 29);
	const current = Math.floor((at - firstMonday) / (7 * DAY)) + 1;
	const startWeek = yearView ? 1 : current - weeks + 1;
	const typical = yearView ? Number(s.volhalf!.replace(/,/g, '')) : int(r, 9, 30) * 1000;
	const doubled = yearView ? Math.max(3, Number(s.wk)) : 0;
	for (let w = startWeek; w < startWeek + weeks; w++) {
		const sets = int(r, 38, 96);
		let volume = typical + int(r, -40, 40) * 100;
		if (w <= doubled) volume = volume * 2 + int(r, -20, 20) * 100;
		const shown = yearView && String(w) === s.wk ? s.vol! : thousands(volume);
		rows.push(`| ${w} | ${isoOf(firstMonday + (w - 1) * 7 * DAY)} | ${w <= doubled ? sets * 2 - int(r, 0, 9) : sets} | ${shown} |`);
	}
	return rows.join('\n');
};

const routineTable = (r: Rand, topic: Topic, s: Slots): string => {
	const template = topic.quirk === 'template' && r() < 0.8;
	const rows = [template ? `Template "${s.template}"` : `Routine "${s.routine}"`, '', '| Position | Exercise | Sets | Reps | Weight (kg) |', '| ---: | --- | ---: | ---: | ---: |'];
	const lifts = shuffle(r, allLifts).slice(0, template ? Number(s.n) : int(r, 5, 9));
	const row = (position: number, lift: string) => `| ${position} | ${lift} | ${pick(r, [3, 3, 4, 5, 5])} | ${pick(r, [5, 5, 6, 8, 10, 12])} | ${num(liftKg(r, lift))} |`;
	lifts.forEach((lift, i) => {
		rows.push(row(i + 1, lift));
		if (topic.quirk === 'position' && String(i + 1) === s.pos) rows.push(row(i + 1, pick(r, allLifts.filter((name) => !lifts.includes(name)))));
	});
	return rows.join('\n');
};

const calcBlock = (r: Rand, s: Slots): string => {
	const totals = [...new Set(shuffle(r, [Number(s.light ?? 15), 20, 40, 60, Number(s.kg), 82.5, 102.5, 140, 17.5, 12.5]).slice(0, int(r, 4, 7)))].sort((a, b) => a - b);
	const rows = ['| Total (kg) | Bar | Each side |', '| ---: | ---: | --- |'];
	for (const total of totals) {
		const plates = perSide(total);
		rows.push(`| ${num(total)} | 20 | ${plates.length ? plates.map(num).join(' + ') : '(blank)'} |`);
	}
	return rows.join('\n');
};

const sessionsTable = (r: Rand, s: Slots, before: number): string => {
	const rows = ['| Date | Routine | Sets | Started | Notes |', '| --- | --- | ---: | --- | ---: |'];
	let t = before - int(r, 14, 28) * DAY;
	const plan = [s.routine!, s.routine2!, pick(r, routines)];
	for (let i = int(r, 6, 12); i > 0 && t < before; i--) {
		t += int(r, 1, 4) * DAY;
		rows.push(`| ${isoOf(t)} | ${r() < 0.12 ? '(none)' : pick(r, plan)} | ${int(r, 9, 28)} | ${pad(int(r, 6, 21))}:${pad(int(r, 0, 59))} | ${r() < 0.5 ? `${int(r, 20, 900)} chars` : '-'} |`);
	}
	return rows.join('\n');
};

const liftCategory: Record<string, string> = {
	'Back squat': 'Legs', 'Bench press': 'Chest', Deadlift: 'Back', 'Overhead press': 'Shoulders', 'Front squat': 'Legs', 'Sumo deadlift': 'Back', 'Paused bench press': 'Chest', 'Close-grip bench press': 'Arms', 'Romanian deadlift': 'Legs', 'Barbell row': 'Back',
	'Pull-up': 'Back', 'Chin-up': 'Back', Dip: 'Chest', 'Hip thrust': 'Legs', 'Leg press': 'Legs', 'Lat pulldown': 'Back', 'Incline dumbbell press': 'Chest', 'Bulgarian split squat': 'Legs', 'Face pull': 'Shoulders', 'Cable row': 'Back', 'Goblet squat': 'Legs',
	'Kettlebell swing': 'Full body', 'Calf raise': 'Legs', 'Leg curl': 'Legs', 'Lateral raise': 'Shoulders', 'Hammer curl': 'Arms', 'Back extension': 'Back', 'Hack squat': 'Legs', 'Side plank': 'Core', 'Dumbbell row': 'Back', 'Pendlay row': 'Back'
};
const searchHits = (term: string, first: string[]) => [...first, ...allLifts.filter((name) => name.toLowerCase().includes(term) && !first.includes(name))].slice(0, 4);
const catalogueBlock = (r: Rand, s: Slots): string => {
	const lines = ['```text'];
	const row = (name: string, category = liftCategory[name] ?? 'Legs') => `  ${name.padEnd(32)}${category}`;
	if (s.missing) {
		const term = s.proxy!.toLowerCase().split(' ')[0]!;
		lines.push(`Exercise picker, search "${s.missing.toLowerCase()}"`, '  No exercises found.', '', `Exercise picker, search "${term}"`, ...searchHits(term, [s.proxy!]).map((name) => row(name)));
	} else if (s.dupB) {
		const term = s.dupA!.toLowerCase().split(/[ -]/)[0]!;
		const category = liftCategory[s.dupA!] ?? 'Back';
		lines.push(`Exercise picker, search "${term}"`, row(s.dupA!, category), row(s.dupB!, category), ...searchHits(term, [s.dupA!]).slice(1, 3).map((name) => row(name)));
	} else
		lines.push(`Exercise picker, filter "${s.catRight}"`, ...shuffle(r, allLifts.filter((name) => liftCategory[name] === s.catRight && name !== s.catEx)).slice(0, int(r, 3, 6)).map((name) => `  ${name}`), '', `Exercise picker, search "${s.catEx!.toLowerCase()}"`, row(s.catEx!, s.catWrong));
	lines.push('```');
	return lines.join('\n');
};

const deviceBlock = (r: Rand, s: Slots, at: number): string =>
	[
		'```text',
		`App: Liftbook ${s.ver} (${/iOS|iPad/.test(s.device!) ? 'iOS' : 'Android'})`,
		`Device: ${s.device}`,
		`Units: ${s.units}`,
		`Time zone: ${s.zone}`,
		`Last sync: ${isoOf(at)} ${pad(int(r, 6, 22))}:${pad(int(r, 0, 59))}`,
		`Queued changes: ${pick(r, [0, 0, 0, 1, 3])}`,
		`Installed: ${s.joined}`,
		'```'
	].join('\n');

const traceBlock = (r: Rand, topic: Topic, s: Slots, at: number): string => {
	const lines: string[] = ['```text'];
	let second = int(r, 6, 20) * 3600 + int(r, 0, 3599);
	const clock = () => `${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}.${String(int(r, 0, 999)).padStart(3, '0')}`;
	const line = (method: string, path: string, status: number, rest: string) => lines.push(`${isoOf(at)} ${clock()}  ${method.padEnd(5)} ${path.padEnd(20)} ${status}  ${rest}`);
	const counts: Record<string, () => number> = { '/api/logs/': () => int(r, 300, 15000), '/api/sessions/': () => int(r, 20, 1500), '/api/routines/': () => int(r, 2, 20), '/api/exercises/': () => int(r, 311, 348), '/api/templates/': () => int(r, 6, 40), '/api/slot-entries/': () => int(r, 10, 140) };
	if (topic.trace === 'slow') {
		line('GET', '/api/logs/', 200, `${s.sets} items  ${thousands(Math.round(Number(s.secs) * 1000))} ms  ${s.mb} MB`);
		second += Math.ceil(Number(s.secs));
		line('GET', '/api/sessions/', 200, `${thousands(int(r, 600, 1900))} items  ${int(r, 400, 1400)} ms`);
		line('GET', '/api/routines/', 200, `${int(r, 4, 20)} items  ${int(r, 20, 80)} ms`);
	} else if (topic.trace === 'dupes') {
		for (let i = int(r, 3, 6); i > 0; i--) {
			for (let c = r() < 0.6 ? int(r, 2, 3) : 1; c > 0; c--) {
				line('POST', '/api/logs/', 201, `${thousands(int(r, 4100, 9800))} ms`);
				second += int(r, 8, 13);
			}
			second += int(r, 90, 300);
		}
	} else if (topic.trace === 'batch') {
		second = int(r, 0, 3) * 3600 + int(r, 0, 3599);
		for (let i = int(r, 8, 15); i > 0; i--) {
			line('POST', '/api/logs/', 201, `${int(r, 30, 140)} ms`);
			if (r() < 0.6) second += 1;
		}
	} else if (topic.trace === 'session') {
		line('POST', '/api/sessions/', 201, `${int(r, 40, 160)} ms  date ${s.iso}`);
		second += int(r, 2, 6);
		for (let i = int(r, 2, 5); i > 0; i--) {
			line('POST', '/api/logs/', 201, `${int(r, 30, 140)} ms`);
			second += int(r, 1, 4);
		}
	} else
		for (const path of shuffle(r, Object.keys(counts)).slice(0, int(r, 3, 5))) {
			line('GET', path, 200, `${thousands(counts[path]!())} items  ${int(r, 20, 900)} ms`);
			second += int(r, 0, 3);
		}
	lines.push('```');
	return lines.join('\n');
};

const snapshots = new Map<string, string>();
const art = (r: Rand, topic: Topic, s: Slots, at: number): string => {
	// A routine, a chart or a search looks the same each time it is pasted into one ticket; sets and diagnostics change.
	const key = `${s.ref}:${topic.art}`;
	if (topic.art !== 'sets' && topic.art !== 'device' && snapshots.has(key)) return snapshots.get(key)!;
	const text = freshArt(r, topic, s, at);
	snapshots.set(key, text);
	return text;
};
const freshArt = (r: Rand, topic: Topic, s: Slots, at: number): string =>
	topic.art === 'calc'
		? calcBlock(r, s)
		: topic.art === 'sets'
			? setsTable(r, topic, s, at)
			: topic.art === 'max'
				? maxTable(r, topic, s, at)
				: topic.art === 'volume'
					? volumeTable(r, topic, s, at)
					: topic.art === 'routine'
						? routineTable(r, topic, s)
						: topic.art === 'catalogue'
							? catalogueBlock(r, s)
							: deviceBlock(r, s, at);

const artIntroMember = ['This is what I see:', "Here's what the screen shows:", 'Copied from the app:', 'For reference:', 'Screenshot typed out, since the form would not take the image:'];
const artIntroSupport: Record<Art, string[]> = {
	sets: ['From the support console:', 'Their recent sets, from the console:', 'Console view:'],
	routine: ['The routine, from the console:', 'From the support console:', 'Console view of the routine:'],
	calc: ['On the test account, the calculator gives:', 'Calculator on the test account:'],
	max: ['Their max screen, from the console:', 'Console view of the estimates:'],
	volume: ['Their weekly volume, from the console:', 'Console view of the volume chart:'],
	catalogue: ['Catalogue search on the test account:', 'From the exercise picker on the test account:'],
	device: ['Diagnostics the app sent with the ticket:', 'From the diagnostics:']
};
const artIntroDev = ['From the request log, staging copy:', "Requests from the member's app around that time:", 'What reached us:'];

const deck = topics.flatMap((topic) => Array.from({ length: topic.weight }, () => topic));
const cycle: Outcome[] = ['owed', 'answered', 'request', 'waiting', 'app', 'fixed', 'owed', 'request', 'waiting', 'app', 'fixed', 'answered'];
const allows = (topic: Topic, outcome: Outcome) =>
	(!topic.only || topic.only.includes(outcome)) &&
	(outcome === 'answered' ? !!topic.explain : outcome === 'owed' ? !!topic.bug : outcome === 'fixed' ? !!(topic.bug && topic.fix) : outcome === 'request' ? !!topic.wish : outcome === 'waiting' ? !!topic.need : !!topic.app);

const fill = (text: string, s: Slots) =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const lower = key.charAt(0).toLowerCase() + key.slice(1);
		const value = s[key] ?? s[lower];
		if (value === undefined) throw new Error(`no slot ${key}`);
		return s[key] === undefined ? cap(value) : value;
	});
const lower = (text: string) => (/^I\b/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1));
const refOf = (index: number, r: Rand) => `LB-${41180 + index * 37 + int(r, 0, 36)}`;

const ticket = (index: number): { name: string; text: string } => {
	const r = mulberry32(0x71c3e000 + index * 7919);
	const topic = deck[(index * 11 + int(r, 0, 2)) % deck.length]!;
	const start = (index * 3 + int(r, 0, cycle.length - 1)) % cycle.length;
	let outcome: Outcome = 'request';
	for (let i = 0; i < cycle.length; i++) {
		const candidate = cycle[(start + i) % cycle.length]!;
		if (allows(topic, candidate)) {
			outcome = candidate;
			break;
		}
	}
	const twist = r() < 0.4;
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const agents = shuffle(r, supportTeam);
	const opened = BASE + Math.floor((index * 84) / ITEMS) * DAY + (int(r, 6, 22) * 60 + int(r, 0, 59)) * MINUTE;
	const reference = refOf(index, r);
	const ex = pick(r, topic.exes ?? mainLifts);
	const recent = opened - int(r, 1, 6) * DAY;
	const s: Slots = {
		ref: reference,
		m: first,
		M: `${first} ${last}`,
		agent: agents[0]!,
		dev: pick(r, apiTeam),
		ex,
		kg: num(Math.max(40, liftKg(r, ex))),
		reps: String(int(r, 3, 10)),
		lb: String(5 * int(r, 27, 81)),
		n: String(int(r, 5, 9)),
		routine: pick(r, routines),
		template: pick(r, templates),
		date: dayOf(recent),
		day: weekdayOf(recent),
		iso: isoOf(recent),
		late: `${pad(int(r, 0, 1))}:${pad(int(r, 0, 59))}`,
		ver: pick(r, appVersions),
		appnew: '6.4.1',
		device: pick(r, devices),
		units: topic.quirk === 'units' ? 'lb' : 'kg',
		zone: pick(r, zones),
		joined: `${int(r, 2021, 2025)}-${pad(int(r, 1, 12))}-${pad(int(r, 1, 28))}`
	};
	s.routine2 = pick(r, routines.filter((name) => name !== s.routine));
	Object.assign(s, topic.calc?.(r, s) ?? {});
	s.kgplus5 = num(Number(s.kg) + 5);
	s.kgwarm = num(Number(s.kg) - 10);
	s.fixHow = fill(topic.fixHow ?? 'update the app to {appnew}', s);
	const F = (text: string) => fill(text, s);
	for (const key of ['explain', 'bug', 'wish', 'need', 'app'] as const) if (topic[key]) s[key] = F(topic[key]!);

	// The other matter some members raise in the same ticket.
	const side = r() < 0.5 ? pick(r, topics.filter((other) => other !== topic)) : undefined;
	const sideFirst = !!side && r() < 0.4;
	const sideSlots: Slots = { ...s };
	if (side) Object.assign(sideSlots, side.calc?.(r, sideSlots) ?? {});
	const sideQ = side ? fill(side.quick[0], sideSlots) : '';
	const sideA = side ? fill(side.quick[1], sideSlots) : '';

	let when = opened;
	const posts: string[] = [];
	const sigs = new Map<string, string>();
	const greeted = new Set<string>();
	const memberBye1 = F(pick(r, memberBye));
	const memberBye2 = F(pick(r, memberByeLater));
	let memberPosts = 0;
	const keep = (items: (string | false | undefined)[]) => items.filter((item): item is string => !!item);
	const post = (who: string, paragraphs: (string | false | undefined)[], gapMinutes: number) => {
		when += gapMinutes * MINUTE;
		posts.push(`**${who}** · ${stampOf(when)}\n\n${keep(paragraphs).join('\n\n')}`);
	};
	const system = (text: string, gapMinutes: number) => {
		when += gapMinutes * MINUTE;
		posts.push(`*${stampOf(when)} · ${text}*`);
	};
	const member = (paragraphs: (string | false | undefined)[], gap: number, bye: boolean) => post(s.M!, [r() < 0.45 && F(pick(r, memberHello)), ...paragraphs, bye && (memberPosts++ === 0 ? memberBye1 : memberBye2)], gap);
	const agentSays = (who: string, paragraphs: (string | false | undefined)[], gap: number) => {
		const local = { ...s, agent: who };
		if (!sigs.has(who)) sigs.set(who, fill(pick(r, supportBye), local));
		const hello = fill(pick(r, greeted.has(who) ? supportHelloAgain : supportHello), local);
		greeted.add(who);
		post(`${who} (support)`, [hello, ...paragraphs, sigs.get(who)], gap);
	};
	const note = (paragraphs: (string | false | undefined)[], gap: number) => post(`Internal note · ${s.agent} (support)`, paragraphs, gap);
	const devNote = (paragraphs: (string | false | undefined)[], gap: number) => post(`Internal note · ${s.dev} (API team)`, paragraphs, gap);
	const list = (items: string[], ordered: boolean) => items.map((item, i) => `${ordered ? `${i + 1}.` : '-'} ${F(item)}`).join('\n');

	const details = shuffle(r, topic.details).map(F);
	const more = shuffle(r, topic.more).map(F);
	const subject = sideFirst && r() < 0.5 ? fill(pick(r, side!.subjects), sideSlots) : F(pick(r, topic.subjects));
	const memberArtFirst = r() < 0.5 && topic.art !== 'catalogue';
	const faultLike = !!(topic.bug || topic.app);
	const troubleshoot = !!topic.app || topic.trace !== 'plain' || ['dupes', 'typo', 'zero', 'position', 'nosession'].includes(topic.quirk);

	// The member writes in.
	member(
		[
			sideFirst && `Two things, if that's all right. First, ${lower(sideQ.replace(/^(also|and|while i am here),? /i, ''))}`,
			sideFirst ? `The main thing: ${F(pick(r, topic.open))}` : F(pick(r, topic.open)),
			r() < 0.85 && more[0],
			r() < 0.65 && pick(r, backstories),
			r() < 0.7 && details[0],
			r() < 0.45 && story(r, s),
			memberArtFirst && `${pick(r, artIntroMember)}\n\n${topic.art === 'device' || r() < 0.4 ? deviceBlock(r, s, when) : art(r, topic, s, when)}`,
			troubleshoot && r() < 0.35 && `${pick(r, ['What I have tried so far:', 'Things I tried before writing:', 'Already tried:'])}\n\n${shuffle(r, tried).slice(0, int(r, 2, 4)).map((step) => `- ${step}`).join('\n')}`,
			side && !sideFirst && sideQ
		],
		0,
		r() < 0.75
	);

	// Support's first reply. In some tickets that end in a confirmed bug, or in silence, support first explains it away.
	const explainedFirst = (outcome === 'owed' || outcome === 'waiting') && twist && !!topic.explain;
	const asks = !explainedFirst && faultLike && r() < 0.45 ? pick(r, supportAsks) : undefined;
	if (r() < 0.2) system(`Reassigned from ${agents[1]} to ${s.agent}.`, int(r, 20, 400));
	agentSays(
		s.agent!,
		[sideFirst && `To take your first question: ${lower(sideA)}`, explainedFirst ? `I've looked into it. ${s.explain}` : F(pick(r, topic.first)), !explainedFirst && r() < 0.35 && `${pick(r, ['On my test account I went through it step by step:', 'Here is what I tried on a test account:', 'I tried it myself first:'])}\n\n${list(topic.steps.slice(0, 3), false)}`, asks && asks[0], !explainedFirst && !asks && pick(r, passOn), side && !sideFirst && `${pick(r, ['On your other question: ', 'As for your second question: ', 'And on the other thing you asked: '])}${lower(sideA)}`, !explainedFirst && !asks && r() < 0.5 && pick(r, nextSteps)],
		int(r, 40, 1500)
	);
	if (explainedFirst) {
		member([pick(r, pushback).replace('{detail}', details[1] ?? details[0]!), r() < 0.5 && more[1], r() < 0.5 && `${pick(r, artIntroMember)}\n\n${art(r, topic, s, when)}`], int(r, 120, 2600), r() < 0.5);
		agentSays(s.agent!, [`${pick(r, passOnAck)} ${pick(r, passOn)}`], int(r, 60, 900));
	} else if (asks) {
		member([F(asks[1]), details[1], r() < 0.7 && more[1], r() < 0.25 && story(r, s), r() < 0.5 && !memberArtFirst && `${pick(r, artIntroMember)}\n\n${art(r, topic, s, when)}`], int(r, 90, 2400), r() < 0.5);
		agentSays(s.agent!, [`${pick(r, passOnAck)} ${pick(r, passOn)}`], int(r, 60, 900));
	} else if (r() < 0.95) {
		member([r() < 0.5 && pick(r, memberAsides), details[1] ?? details[0], r() < 0.7 && more[1], r() < 0.3 && story(r, s), r() < 0.65 && !memberArtFirst && `${pick(r, artIntroMember)}\n\n${art(r, topic, s, when)}`, r() < 0.4 && details[2]], int(r, 90, 2400), r() < 0.5);
	}

	// Support passes it on, and the API team has a first look.
	system(`Passed to the API team queue by ${s.agent}.`, int(r, 5, 120));
	const steps = topic.steps.filter(() => r() < 0.75);
	note(
		[
			`${pick(r, notePrefix)} ${F(pick(r, topic.escalate))}`,
			r() < 0.8 && steps.length > 1 && `${pick(r, stepIntro)}\n\n${list(steps, true)}`,
			r() < 0.5 && pick(r, noteRemarks),
			(topic.art === 'sets' || topic.art === 'routine' || r() < 0.65) && (topic.art === 'device' && r() < 0.5 ? `${pick(r, ['Their requests around that time:', 'From the request log:'])}\n\n${traceBlock(r, topic, s, when)}` : `${pick(r, artIntroSupport[topic.art])}\n\n${art(r, topic, s, when)}`),
			r() < 0.4 && `${pick(r, ['Their recent sessions:', 'Sessions on the account, most recent last:', 'Session list from the console:'])}\n\n${sessionsTable(r, s, when)}`
		],
		int(r, 1, 30)
	);
	const devTwist = twist && faultLike && (outcome === 'answered' || outcome === 'app' || outcome === 'request');
	if (outcome === 'waiting' && !twist) devNote([F(pick(r, waitingDev))], int(r, 200, 3000));
	else if (outcome !== 'waiting')
		devNote(
			[F(pick(r, topic.dev)), r() < 0.75 && `${pick(r, checkIntro)}\n\n${list(topic.checks, false)}`, r() < 0.4 && pick(r, devRemarks), devTwist && pick(r, devLooking), r() < 0.65 && `${pick(r, artIntroDev)}\n\n${traceBlock(r, topic, s, when)}`],
			int(r, 200, 3000)
		);
	const probes = shuffle(r, topic.probe).slice(0, outcome === 'waiting' ? 0 : r() < 0.5 ? 2 : r() < 0.8 ? 1 : 0);
	for (const [question, answer] of probes) {
		const q = lower(F(question));
		devNote([pick(r, probeAsk).replace('{q}', q)], int(r, 10, 900));
		agentSays(s.agent!, [pick(r, probeRelay).replace('{q}', q)], int(r, 20, 600));
		member([F(answer), r() < 0.35 && pick(r, memberAsides), r() < 0.35 && `${pick(r, artIntroMember)}\n\n${art(r, topic, s, when)}`], int(r, 60, 2400), r() < 0.4);
	}
	if (r() < 0.3) {
		const other = pick(r, apiTeam.filter((name) => name !== s.dev));
		post(`Internal note · ${other} (API team)`, [`${pick(r, ['Adding to this:', 'One more data point:', 'Agree with the above.'])} ${pick(r, devRemarks)}`, r() < 0.5 && `- ${F(pick(r, topic.checks))}`], int(r, 30, 1200));
	}
	if (r() < 0.4) {
		const [q, a] = pick(r, devAsks);
		devNote([q], int(r, 10, 600));
		note([F(a)], int(r, 20, 600));
	}

	// A wait, a chase, the side question, a hand-over.
	if (r() < 0.5) {
		member([pick(r, memberChase)], int(r, 2500, 6000), false);
		agentSays(s.agent!, [pick(r, supportHolding)], int(r, 60, 900));
	}
	if (side && r() < 0.6) {
		member([`${pick(r, sideBack)} ${lower(fill(pick(r, side.open), sideSlots))}`], int(r, 300, 3000), false);
		agentSays(s.agent!, [side.explain && r() < 0.6 ? fill(side.explain, sideSlots) : pick(r, sideSplit).replace('{ref}', refOf(index + int(r, 2, 6), r))], int(r, 60, 1200));
	}
	if (r() < 0.3) {
		const merged = refOf(Math.max(0, index - int(r, 1, 9)), r);
		system(`Merged ${merged} into this ticket (same member, same question).`, int(r, 30, 600));
		note([`${merged} was the same member writing in again before we had answered. Their message there, for the record:`, `> ${F(pick(r, topic.open))}\n>\n> ${more[1] ?? details[2] ?? details[0]}`], int(r, 1, 20));
	}
	if (r() < 0.15) {
		s.agent = agents[1]!;
		system(`Reassigned to ${s.agent} (rota change).`, int(r, 30, 900));
	}

	// The ending.
	if (outcome === 'answered') {
		devNote([F(pick(r, devTwist ? answeredDevCorrection : answeredDev))], int(r, 300, 2800));
		agentSays(s.agent!, [F(pick(r, faultLike ? answeredSupport : answeredSupport.filter((line) => !line.includes('nothing is wrong')))), r() < 0.3 && pick(r, answeredExtra)], int(r, 60, 900));
		if (r() < 0.75) member([pick(r, faultLike ? answeredMember : answeredMember.filter((line) => !line.includes('worrying')))], int(r, 60, 2000), r() < 0.4);
	} else if (outcome === 'owed') {
		devNote([F(pick(r, owedDev))], int(r, 300, 2800));
		agentSays(s.agent!, [pick(r, owedSupport)], int(r, 60, 900));
		if (r() < 0.35) {
			const [q, a] = pick(r, owedWorkaround);
			member([pick(r, owedMember), q], int(r, 60, 2400), r() < 0.4);
			agentSays(s.agent!, [a], int(r, 60, 900));
		} else if (r() < 0.6) member([pick(r, owedMember)], int(r, 60, 2400), r() < 0.4);
	} else if (outcome === 'fixed') {
		devNote([F(pick(r, fixedDev))], int(r, 300, 2400));
		agentSays(s.agent!, [pick(r, owedSupport)], int(r, 60, 900));
		s.fixdate = dayOf(when + int(r, 3, 10) * DAY);
		s.fix = F(topic.fix!);
		devNote([F(pick(r, fixedNews))], int(r, 4000, 12000));
		agentSays(s.agent!, [F(pick(r, fixedSupport))], int(r, 60, 900));
		if (twist) {
			member([pick(r, fixedStill)], int(r, 60, 1500), false);
			agentSays(s.agent!, [F(pick(r, fixedAgain))], int(r, 30, 600));
		}
		member([pick(r, fixedMember)], int(r, 60, 1800), r() < 0.4);
	} else if (outcome === 'request') {
		devNote([F(pick(r, devTwist ? requestDevCorrection : requestDev))], int(r, 300, 2800));
		agentSays(s.agent!, [F(pick(r, requestSupport)), topic.explain && r() < 0.35 && `In the meantime: ${s.explain}`], int(r, 60, 900));
		if (r() < 0.6) member([pick(r, requestMember)], int(r, 60, 2000), r() < 0.4);
	} else if (outcome === 'waiting') {
		if (twist) devNote([F(pick(r, waitingDev))], int(r, 200, 3000));
		agentSays(s.agent!, [F(pick(r, waitingSupport))], int(r, 60, 900));
		if (r() < 0.4) member([pick(r, waitingMember)], int(r, 60, 1500), false);
		system('Automatic reminder sent to the member after 5 days without a reply.', 5 * 1440);
		system('No reply for 10 days. The ticket was closed automatically; a reply from the member reopens it.', 5 * 1440);
	} else {
		devNote([F(pick(r, devTwist ? appDevCorrection : appDev))], int(r, 300, 2800));
		system(`Copied to the app team's board by ${s.agent}.`, int(r, 10, 300));
		agentSays(s.agent!, [pick(r, appSupport)], int(r, 30, 900));
		if (r() < 0.5) member([pick(r, appMember)], int(r, 60, 2000), false);
	}

	if ((outcome === 'owed' || outcome === 'app' || outcome === 'request') && r() < 0.45) {
		member([pick(r, followNew[outcome]!), details[2] ?? details[0], topic.art !== 'catalogue' && r() < 0.6 && art(r, topic, s, when)], int(r, 2000, 8000), r() < 0.4);
		agentSays(s.agent!, [pick(r, followReply[outcome]!)], int(r, 60, 900));
	}

	const header = `Opened ${stampOf(opened)} by ${s.M} through ${pick(r, channels)} · Liftbook ${s.ver} on ${s.device}`;
	const text = [`# ${reference}: ${subject}`, header, ...posts.map((p) => `---\n\n${p}`)].join('\n\n') + '\n';
	return { name: `${isoOf(opened)}-${reference.toLowerCase()}.md`, text };
};

const folder = join(root, 'support', 'escalations');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Escalated tickets\n\nThe ${ITEMS} help-desk tickets that support passed to the API team between 27 July and 18 October 2026,\none file each, exported with their whole conversation and the internal notes. The export did not keep\ntags, queues or statuses. Tables and blocks in a ticket are as the member, support or the API team\npasted them.\n`
);
