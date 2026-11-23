// Writes the long material of this entry's long tasks: the transcripts of the interviews Pennyjar's research team
// held with Plus subscribers between 6 October and 13 November 2026, one Markdown file each, under
// research/plus-interviews/, as the note-takers tidied them, with no write-up. Deterministic: fixed seeds, no clock,
// no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many interviews to write, the one knob of the material's size. Dates, numbers and personas follow from it. */
const ITEMS = 111;

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
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
/** Picks `n` different items. */
const some = <T>(r: Rand, items: readonly T[], n: number): T[] => shuffle(r, items).slice(0, n);
const weighted = <T>(r: Rand, items: readonly T[], weights: readonly number[]): T => {
	let x = r() * weights.reduce((sum, w) => sum + w, 0);
	for (let i = 0; i < items.length; i++) {
		x -= weights[i]!;
		if (x < 0) return items[i]!;
	}
	return items[items.length - 1]!;
};
const pad = (value: number) => String(value).padStart(2, '0');

// Pennyjar's research team. Ines Duarte ran most sessions; Callum Reid, a product designer, ran some.
const interviewers = [
	{ full: 'Ines Duarte', first: 'Ines', role: 'I work in the research team' },
	{ full: 'Callum Reid', first: 'Callum', role: 'I design parts of the app' }
];
const noteTakers = ['Kofi Asante', 'Mei Lin', 'Rosa Field'];

const participantNames = ['Hannah', 'Deepak', 'Morag', 'Stefan', 'Chidi', 'Bronwen', 'Farah', 'Lewis', 'Oksana', 'Trevor', 'Niamh', 'Rashid', 'Gemma', 'Piotr', 'Yvonne', 'Callie', 'Shreya', 'Desmond', 'Katya', 'Owen', 'Maribel', 'Arjun', 'Lorna', 'Kwame', 'Ingrid', 'Bashir', 'Tamsin', 'Elliot', 'Roisin', 'Hamza', 'Cerys', 'Dominic', 'Ayesha', 'Fergus', 'Linh', 'Rosalind', 'Gareth', 'Delphine', 'Ifeoma', 'Neil', 'Agnieszka', 'Jodie', 'Marcus', 'Precious', 'Conor', 'Leanne', 'Tobias', 'Nkechi', 'Wendy', 'Sunil', 'Bethany', 'Ruairi', 'Charlene', 'Mohammed', 'Sinead', 'Graham', 'Anita', 'Jamie', 'Esther', 'Kayleigh', 'Raj', 'Lucy', 'Darren', 'Abimbola', 'Fiona', 'Kenji', 'Martha', 'Yusuf', 'Polly', 'Craig', 'Imogen', 'Dariusz', 'Tasha', 'Euan', 'Harriet', 'Femi', 'Joanne', 'Wiktor', 'Saoirse', 'Andre', 'Lydia', 'Patrick', 'Zainab', 'Rhys', 'Mandy', 'Tomasz', 'Eleanor', 'Kai', 'Shona', 'Ade', 'Beatrice', 'Ciaran', 'Dionne', 'Faisal', 'Gwen', 'Hassan', 'Iona', 'Jasmine', 'Kofi', 'Lorcan', 'Meera', 'Nathaniel', 'Orla', 'Pradeep', 'Rebecca', 'Seamus', 'Thandiwe', 'Una', 'Vikram', 'Winston', 'Yasmin', 'Zoltan', 'Alistair', 'Bianca', 'Declan', 'Elif', 'Gordon', 'Hollie', 'Ismail', 'Josephine', 'Lachlan', 'Malika'];
const partners = ['Sam', 'Jo', 'Chris', 'Alex', 'Dan', 'Priya', 'Tom', 'Megan', 'Ravi', 'Ellie', 'Josh', 'Aisha', 'Ben', 'Laura', 'Luke', 'Zara', 'Matt', 'Nadia', 'Rob', 'Grace'];
const friends = ['Becky', 'Olu', 'Jess', 'Marcus', 'Sian', 'Tariq', 'Holly', 'Kieran', 'Amy', 'Dev', 'Lauren', 'Femi', 'Katie', 'Jamal', 'Ffion', 'Ryan', 'Nina', 'Ollie'];
const kids = ['Ruby', 'Alfie', 'Isla', 'Noah', 'Maya', 'Leo', 'Ava', 'Arlo', 'Esme', 'Theo', 'Poppy', 'Zach'];
const towns = ['Leeds', 'Bristol', 'Glasgow', 'Cardiff', 'Norwich', 'Sheffield', 'Brighton', 'Nottingham', 'Belfast', 'Plymouth', 'Leicester', 'York', 'Swansea', 'Aberdeen', 'Coventry', 'Hull', 'Derby', 'Exeter', 'Stoke', 'Milton Keynes', 'Bolton', 'Reading', 'Southampton', 'Edinburgh', 'Manchester', 'Liverpool', 'Newcastle', 'Luton', 'Ipswich', 'Lincoln', 'Dundee', 'Wolverhampton'];

// The three things Plus adds to Free (docs/plans.md): unlimited pots, bill splitting and custom categories.
type Feature = 'pots' | 'split' | 'cats';
type Core = Feature | 'none';
/** How much a participant uses a Plus feature. `core` is the one they would keep; it is never written in the file. */
type Att = 'never' | 'rare' | 'used' | 'core';
const level: Record<Att, number> = { never: 0, rare: 1, used: 2, core: 3 };
const features: Feature[] = ['pots', 'split', 'cats'];

/** A persona-specific exchange: the interviewer's question, the participant's answer, and a feature it needs used. */
type Turn = [string, string, Feature?];
interface Persona {
	age: [number, number];
	/** Customer since, as a range of years. */
	since?: [number, number];
	/** Weights of the Plus feature the participant would keep: pots, split, cats, none. */
	keep: [number, number, number, number];
	/** The least each feature is used, because the persona's own text relies on it. */
	min?: Partial<Record<Feature, Att>>;
	pots: string[];
	pots2: string[];
	cats: string[];
	splits: string[];
	amount: [number, number];
	about: string[];
	start: string[];
	month: string[];
	main: string[];
	turns: Turn[];
	/** Longer stories over two exchanges: the question, the story, the interviewer's probe, how it ended. */
	stories: [string, string, string, string][];
	/** Where they would like to be with money a year from now. */
	next: string[];
}

// Slots: {partner}, {friend}, {friend2}, {kid}, {town}, {pot}, {pot2}, {pot3}, {cat}, {cat2}, {split}, {amt}, {n},
// {decoy} (the feature they say they got Plus for), {name}, {I} (the interviewer) and {NT} (the note-taker).
const personas: Persona[] = [
	{
		age: [26, 38],
		keep: [6, 1, 2, 1],
		min: { pots: 'rare' },
		pots: ['House', 'Deposit', 'Flat fund', 'Our place'],
		pots2: ['Car', 'Rainy day', 'Boring stuff', 'Emergencies'],
		cats: ['Viewings', 'Mortgage admin', 'Furniture', 'Takeaways'],
		splits: ['the weekly shop with {partner}', 'the energy bill with {partner}', 'Friday takeaways with {partner}'],
		amount: [150, 600],
		about: [
			"I'm a dental nurse. I live with my partner, {partner}, in a rented flat in {town}, and we're trying to get out of renting. That's more or less the whole plan for the next couple of years.",
			"I work in a call centre for a broadband company, four days a week. {partner} and I have been together six years and we want to buy somewhere. In {town} that's a stretch, but we're trying.",
			"Me and {partner} rent a two-bed. I'm in marketing, {partner} teaches at a primary school. We're careful with money, we just don't earn loads of it."
		],
		start: [
			"A friend at work had it and showed me her pots on her phone. I'd been using a spreadsheet that I updated maybe once a month, so not really using it at all. I went on Plus quite quickly, mainly for {decoy}.",
			"I moved my salary across from my old bank. Before that everything sat in one account and I could never tell what was savings and what was spending money. Plus came a bit later, for {decoy}."
		],
		month: [
			'Pay comes in on the 28th. Rent goes out on the 1st, then the bills over the first week. On payday I move £{amt} into {pot} before I can spend it, and anything left at the end of the month goes in as well, when there is anything.',
			'We both get paid at the end of the month. {partner} sends me half the rent and I pay the landlord. Then we each put money into {pot}. I do mine on payday. {partner} does it whenever, which drives me up the wall.'
		],
		main: [
			'The deposit, really. Everything else in the app is just keeping the lights on so that number keeps growing.',
			'Getting {pot} to where it needs to be. The rest of it is how I stop myself spending what should be going in there.',
			"Saving for the flat. If we weren't saving to buy, I'm not sure I'd look at it half as much."
		],
		turns: [
			['How do you and {partner} keep track of the deposit together?', "We don't have a joint account, so it's my {pot} and {partner}'s {pot}. Every Sunday we add the two up and say the number out loud. It's become a bit of a ritual."],
			['Have there been months where the plan went sideways?', 'In March the car needed a new clutch and it all came out of {pot}. That was grim. After that I made a {pot2} pot, so the deposit stops getting raided every time something breaks.', 'pots'],
			['How do you decide how much goes in each month?', "I look at the budgets in the last week of the month. If we came in under on food and going out, the difference goes into {pot}. It's turned into a competition with {partner}, which helps."],
			['How often do you look at it?', "Too often. Most days. It's the only number in my life that only goes up."],
			['Where are you with the buying side of it?', "We've seen a broker once. She wants three months of statements, so I need to work out how to get those. We think about another year, if nothing big breaks."]
		],
		stories: [
			['Can you remember a moment when the saving nearly fell apart?', 'Last winter {partner} was out of work for two months. Overnight it was one wage, and we stopped paying into {pot} completely.', 'How did you get through it?', "We stopped everything except rent and food, and I made a budget for each of us that was frankly miserable. {partner} found something new in February and we started again from where we'd stopped. It felt like a year lost, but the pot was still there."],
			["What's the best moment you've had with it?", 'When {pot} passed ten thousand. I took a screenshot and sent it to my mum.', 'What did she say?', "She said she was proud of me and asked when she could come and see the house. I said, Mum, it's ten thousand, not a house. But it felt like a house."]
		],
		next: ['Keys in our hands. Or at least an offer accepted.', 'Mortgage approved and {pot} finally emptied, for the right reason.']
	},
	{
		age: [23, 33],
		keep: [1, 6, 1, 0],
		min: { split: 'used' },
		pots: ['Holiday', 'Emergency', 'Moving out', 'Gig tickets'],
		pots2: ['Christmas', 'Birthdays', 'New laptop'],
		cats: ['House stuff', 'Gym', 'Work lunches', 'Gigs'],
		splits: ['the energy bill', 'the broadband', 'the cleaner', 'the big shop for the house'],
		amount: [40, 120],
		about: [
			"I'm a junior pharmacist, and I live in a shared house in {town} with four other people. Five of us, one kitchen, one fridge with a lot of passive-aggressive labels.",
			'I work in IT support for the council. I rent a room in a house with three others I found online, and we get on, mostly.',
			"I'm doing a PhD, so money's tight. I share a house with {friend} and two others, all postgrads."
		],
		start: [
			'I opened it when I moved into the house, because {friend} already had it and said it would make the bills easier. I went to Plus pretty much straight away, for {decoy}.',
			"My old bank's app was awful, and a lot of people at work were on Pennyjar. I signed up for the budgeting, and then Plus a few months later, mainly for {decoy}."
		],
		month: [
			"Rent goes to the landlord by standing order. Everything else, the energy, the broadband, the cleaner, whoever's name it's in pays it and then splits it with the rest of us. Mine's {split}, so on the day it goes out I split it between all of us.",
			"I get paid on the 15th, which nobody else in the house does, so there's always a bit of juggling. I pay {split} and the others pay me back. Then there's the shared shop every couple of weeks, which I split as well."
		],
		main: [
			"Keeping the house money straight. It's not glamorous, but it's the thing that would cause a row if it went off the rails.",
			'Sorting out who owes who in the house, honestly.',
			"The house bills. My own spending I could manage on anything. It's the shared stuff that needs the app."
		],
		turns: [
			['What happens when someone moves out?', "We had that in June. {friend2} left mid-month, so we worked out the days for the energy bill and I did that split by hand. Agreeing the numbers took a while, but the app part was fine.", 'split'],
			['Who decides who pays which bill?', "It sort of happened. Whoever set it up keeps it. I had {split} because I was the one at home when the engineer came. Now it's mine forever, apparently."],
			['Do people pay you back on time?', 'Mostly. {friend} pays within the hour. {friend2} needs a nudge. The request just sits there until they do it, which is a nudge in itself.', 'split'],
			['How do you keep your own money separate from the house money?', "I don't, really, apart from the budgets. I can see what I've spent on myself because the house stuff comes back to me through the splits."],
			['Is there a house group chat?', "Of course. It used to be full of 'who paid the gas?' and now it's mostly pictures of the bins out on the wrong day."]
		],
		stories: [
			['Has there ever been a row about money in the house?', "Once, properly. Someone had been away for six weeks and didn't think they should pay for the heating.", 'How did that get settled?', "We agreed a rule: if you're away more than a month you pay half. I changed the split for those months and that was that. Without the numbers in front of us it would have dragged on for weeks."],
			['What was it like when you first moved in?', 'Chaos. Four people, four different banks, and a landlord who wanted everything in one name.', 'What changed?', "{friend} set up the bills and then we each took one over. Now it's one bill each, split by whoever pays it. It sounds simple, but it took us three months to get there."]
		],
		next: ['Out of the shared house and into a flat with {friend}, ideally.', 'Still in the house, honestly, but with some savings of my own.']
	},
	{
		age: [27, 45],
		keep: [5, 1, 3, 0],
		min: { pots: 'used' },
		pots: ['Tax', 'Tax bill', 'HMRC'],
		pots2: ['Quiet months', 'Buffer', 'Kit', 'Pension top-up'],
		cats: ['Equipment', 'Client lunches', 'Software', 'Travel to shoots'],
		splits: ['the studio rent with {friend}', 'train tickets to a job with {friend}'],
		amount: [1400, 2200],
		about: [
			"I'm a freelance illustrator, mostly books and packaging. I live on my own in {town}. My income goes up and down a lot, which is the main thing to know about my money.",
			"I'm a wedding photographer, so I earn most of the year between May and September and then live off it. Feast and famine.",
			'I do freelance video editing, mostly for agencies. Some months I invoice four grand, some months nothing at all.'
		],
		start: [
			"My accountant suggested keeping tax money somewhere I couldn't see it. Pennyjar was the one my friends used, so I tried it. I went to Plus for {decoy}.",
			"I needed something that showed me what I actually had, not what was sitting in the account waiting for the tax bill. I joined for that and moved to Plus a bit later, for {decoy}."
		],
		month: [
			"There isn't really a normal month. When an invoice gets paid, a quarter goes straight into {pot}, then a chunk into {pot2}, and I pay myself a fixed amount from {pot2} on the 1st, as if it were a salary.",
			'When money comes in I divide it straight away: thirty percent into {pot}, some into {pot2}, and the rest is mine. Then I try to live on the same amount every month, whatever came in.'
		],
		main: [
			"Making an uneven income feel like a salary. That's the whole trick.",
			'Not getting caught out by the tax bill. And second, paying myself the same each month.',
			'Smoothing it out. If I can see that {pot2} has three months in it, I sleep.'
		],
		turns: [
			['How did January go, with the tax bill?', 'Last January was the first time I had the whole amount sitting there. I moved it out of {pot} and paid it. The year before I was on a payment plan with HMRC and it was horrible.'],
			['How do you decide what to pay yourself?', "I worked out my boring costs, rent, bills, food, and rounded up. It's £{amt} a month. If {pot2} gets above three months of that, I let myself have a treat."],
			['Do you mix business and personal?', "Everything goes through this account, which my accountant doesn't love. That's why the categories matter. I have to pull the business things out at the end of the year.", 'cats'],
			["What's the hardest month?", "February. Nothing comes in, the tax has just gone, and every client wants to pay late. Having the buffer means February is boring rather than scary."]
		],
		stories: [
			['Tell me about a month that really tested the system.', 'Last summer a client went bust owing me nearly three thousand. That was two months of pay, gone.', 'What did you do?', "I lived off {pot2} for those two months, exactly the way I'd planned. It was the first time the buffer actually did its job, and I didn't have to touch {pot} at all."],
			['When did you realise you needed to change how you handled money?', "My first year self-employed, I got a tax bill in January for money I'd already spent in the summer.", 'What happened?', "I borrowed from my brother to pay it. I swore never again, and that's when {pot} started. A quarter of everything, the day it comes in."]
		],
		next: ["Six months in {pot2} instead of three. Then I'd stop worrying about February.", "A pension that isn't an embarrassment."]
	},
	{
		age: [18, 24],
		since: [2024, 2025],
		keep: [3, 3, 2, 2],
		min: { pots: 'rare' },
		pots: ['Rent', 'Term 2', 'Loan', 'Summer'],
		pots2: ['Gigs', 'Going home', 'Laptop fund'],
		cats: ['Society stuff', 'Course books', 'Nights out', 'Coffee'],
		splits: ['the flat shop', 'taxis home', "the flat's broadband"],
		amount: [60, 110],
		about: [
			"I'm in my second year doing biomedical science at the uni in {town}. I've got a part-time job in a café at weekends.",
			"I'm a third-year history student. I live in a flat with three others and I work in a bar two nights a week.",
			"Final year of nursing. I'm a bit older than most, I worked for two years first, so I'd got used to having a wage. I do bank shifts now."
		],
		start: [
			"My older sister set it up for me before I started uni because she said I'd blow the loan in a month. She was nearly right. Plus came later, for {decoy}.",
			'Loads of people on my course use it. I got it in freshers week, and I went on Plus in second term, mostly for {decoy}.'
		],
		month: [
			"The loan comes in three times a year, so the month doesn't really exist. It sits in {pot}, and I divide it by the weeks until the next one and move that amount into my balance every Monday. Whatever I earn at work is for fun.",
			"Wages come in every two weeks from work. The loan goes into {pot} and I pull out a set amount each week. When it's gone, it's gone, which has happened once."
		],
		main: [
			'Making the loan last until the next one comes in.',
			"Not running out before the end of term. That's honestly it.",
			'Stopping me spending the whole loan in the first fortnight.'
		],
		turns: [
			['What happened the time it ran out?', "Second year, first term. I'd been out a lot and there was a week left with about twelve pounds. I lived on pasta and my mum sent me forty quid. After that I started the weekly thing."],
			['How do you handle the weekly amount?', "Every Monday I move the week's money from {pot} into my balance. If there's anything left on Sunday it goes into {pot2}. Most weeks there's nothing left.", 'pots'],
			['Do your parents help at all?', "My dad sends something on my birthday and at Christmas. It goes straight out of sight, so I don't treat it as normal money."],
			['What about the summer?', "I'm working full-time at home in July and August, and I want to save enough to start next year without touching the first loan instalment for a few weeks."]
		],
		stories: [
			['What was freshers week like, money-wise?', 'Terrifying, looking back. I spent nearly a third of the first instalment in a fortnight.', 'When did you notice?', "When I opened the app and saw the number. I sat on my bed and did the maths and realised I had eleven weeks to go. That's where the weekly allowance came from."],
			['Have you ever helped a friend out with money?', 'My flatmate ran out in second term and I lent her a hundred pounds.', 'Did that go OK?', "She paid it back in the summer. I wrote it in my notes so neither of us forgot, and I didn't count it as mine until it came back."]
		],
		next: ['Through the year without running out once.', 'Graduated with something in savings, not just a loan.']
	},
	{
		age: [28, 44],
		keep: [1, 5, 2, 0],
		min: { split: 'used' },
		pots: ['Holiday', 'Joint fund', 'House'],
		pots2: ['Birthdays', 'Car insurance', 'Boiler'],
		cats: ['Dog', 'Date nights', 'Gifts', 'Gym'],
		splits: ['the council tax', 'the supermarket shop', 'the energy bill', 'the water bill'],
		amount: [400, 900],
		about: [
			"I'm a project manager in construction. I live with {partner}, we've been together nine years, not married. We've always kept our money separate.",
			"I'm a nurse, {partner} works in a bank. We bought a house last year and we split everything down the middle, which sounds unromantic but it works.",
			"I'm a civil servant. {partner} and I moved in together last spring, and working out money was the first big thing we had to agree."
		],
		start: [
			"When we moved in together we needed some way of sharing the house costs that didn't involve a spreadsheet. {partner} found Pennyjar. I signed up for {decoy}.",
			"I'd had Pennyjar for budgeting for ages. When {partner} moved in, Plus seemed obvious, mostly for {decoy}."
		],
		month: [
			"I pay the mortgage, {partner} pays the bills, and we split as we go so we're never far apart. When {split} goes out, I split it from the payment and {partner} pays me back.",
			"We each pay certain things. Mine are {split} and the car. When something goes out, I split it with {partner} straight away, so we're never more than a few days out."
		],
		main: [
			'Keeping things fair with {partner} without having to talk about it every week.',
			'Sharing the house costs so neither of us feels we are carrying the other.',
			"Sharing costs with {partner} without a joint account. That's what we use it for."
		],
		turns: [
			['Have you thought about a joint account?', "We've talked about it. Neither of us wants to give up our own account, and as long as the splitting works, we don't need one."],
			['Do you split everything fifty-fifty?', '{partner} earns more, so the bills are sixty-forty. I change the amounts on the split each time. It takes a few seconds.', 'split'],
			['Does it ever cause friction?', "Less than it used to. Before, we'd have a tense conversation every couple of months about who owed what. Now the numbers are just there."],
			['What about bigger things, like holidays?', "Holidays go in {pot}. We both pay in every month, and we've agreed nobody touches it without asking.", 'pots']
		],
		stories: [
			['Was there a moment money nearly caused a real problem between you?', "Before we had a system, yes. I thought I'd been paying more, {partner} thought the same, and we were both a bit right.", 'How did you sort it out?', 'We sat down with three months of statements and a pot of tea. After that we agreed the sixty-forty and started splitting everything as it happened. It has been calm since.'],
			['What happens when one of you has a tight month?', '{partner} had a big dentist bill in the summer and asked if we could go fifty-fifty for a month instead.', 'And?', "Fine. I changed the splits that month. That's the nice thing, it bends without anyone needing to make a speech about it."]
		],
		next: ["Maybe a joint account, maybe not. As long as it stays fair, I don't mind.", "A bigger holiday fund. We'd like to go somewhere far next year."]
	},
	{
		age: [27, 40],
		keep: [3, 1, 3, 2],
		pots: ['Baby', 'Nursery', 'Maternity leave', 'Time off'],
		pots2: ['Christmas', 'Car', 'Birthday presents'],
		cats: ['Nappies', 'Baby stuff', 'Childcare', 'Formula'],
		splits: ['the nursery deposit with {partner}', 'the baby group with friends'],
		amount: [250, 450],
		about: [
			"I'm on parental leave at the moment. Our baby, {kid}, is seven months. Normally I'm a store manager for a supermarket. {partner} works shifts at the hospital.",
			"I'm on shared parental leave until January. Our first, {kid}, is ten months. I'm an accountant, which is a bit embarrassing to admit in a money interview.",
			"I'm a hairdresser, self-employed, and our first, {kid}, came in the spring. I'm not working until the new year, so the money changed overnight."
		],
		start: [
			"I had it before the baby, mostly for budgeting. When we knew {kid} was coming I went on Plus, for {decoy}, because I knew we'd need to plan properly.",
			'Somebody in our antenatal group recommended it. I moved my account over and went on Plus soon after, for {decoy}.'
		],
		month: [
			"My pay dropped to the statutory amount last month, so now it's very tight. I've got £{amt} for food and baby things for the month and I check it every couple of days.",
			"{partner}'s pay comes in on the 20th, mine on the last day. The nursery goes out on the 1st, which is the big one. Everything else fits round that."
		],
		main: [
			'Getting through my time off without going into debt.',
			'Seeing where the baby money goes. Before {kid}, I had no idea what a month of nappies came to.',
			"Planning for the drop in pay while I'm off. That's what I set it all up for."
		],
		turns: [
			['How did you prepare for the drop in income?', 'For a year before, I put money into {pot} every month. The plan is to top my pay back up from it each month until I go back.', 'pots'],
			['What surprised you about having a baby, money-wise?', 'The small things. Nobody warns you about the hundred little purchases. I ended up with a category just for that, because it was swallowing my food budget.', 'cats'],
			['How do you find time to look at the app?', 'Night feeds. Honestly, three in the morning, phone in one hand, baby in the other. I do my budgets then.'],
			['Are you and {partner} doing money together now?', 'More than before. We sit down on the 1st, look at what went out, and decide if anything needs to change. Ten minutes, mostly.']
		],
		stories: [
			['What was the hardest week since the baby came?', 'The week the statutory pay started. My pay basically halved and the car insurance renewed in the same week.', 'How did you handle it?', "I'd been warned, so there was money set aside, but I still sat at the kitchen table at midnight moving numbers around. We dropped two streaming services and cut the food budget, and it balanced. Just."],
			['Has anything gone better than you expected?', 'Second-hand. We got the pram, the cot and most of the clothes from a local group for almost nothing.', 'How much difference did that make?', "Hundreds. I'd budgeted for new, so the difference went into savings for when I go back part-time."]
		],
		next: ['Back at work and the nursery bills not hurting.', 'Through my leave without touching the credit card.']
	},
	{
		age: [24, 42],
		since: [2024, 2025],
		keep: [2, 0, 3, 3],
		pots: ['Card payoff', 'Debt', 'Freedom'],
		pots2: ['Emergency', 'Christmas', 'Buffer'],
		cats: ['Card repayments', 'Impulse buys', 'Takeaways', 'Online shopping'],
		splits: ['a meal with {friend}'],
		amount: [300, 700],
		about: [
			"I'm a sales rep for a drinks company. Two years ago I had about six grand on credit cards and I'd had enough. I'm down to about a thousand now.",
			"I'm a teaching assistant. I've been paying off a credit card from when I was younger and sillier, and that's what got me into budgeting.",
			'I work in a call centre, nights. I got into a mess with a credit card and buy-now-pay-later stuff during a bad year, and I have been climbing out since.'
		],
		start: [
			'I watched a lot of debt videos online and they all said: see where the money goes. I opened Pennyjar to do that. Plus came later, for {decoy}.',
			"My sister uses it and she's annoyingly good with money. I wanted to be more like her. I went on Plus after a few months, for {decoy}."
		],
		month: [
			"On payday the card payment goes first, the minimum plus whatever extra I decided at the start of the month. Then rent and bills. Then I've got £{amt} for everything else and I watch it like a hawk.",
			'I pay the card the day after payday, because if I wait I will spend it. Then the budgets do the rest. When I go over on one, I take it off another, never off the card payment.'
		],
		main: ['Paying off the card. Everything in the app is pointed at that.', 'Getting out of debt and staying out.', "Seeing where it goes so I don't end up back where I was."],
		turns: [
			['How do you feel about money now compared to two years ago?', "I used to not open my banking app for weeks because I was scared of it. Now I look every day. That's the big change."],
			["What's been hardest?", "Saying no to things. Friends' birthdays, weekends away. I've got better at saying I'm saving rather than I can't afford it."],
			['How do you keep track of the card balance?', "The card's with another bank, so I keep a note of the balance and update it when I pay. I'd love to see it in Pennyjar, honestly."],
			['Do you have any buffer?', "A small one, in {pot2}. Before I had it, any surprise went on the card and I'd go backwards. Now there's a few hundred for that.", 'pots']
		],
		stories: [
			['What was the moment you decided to deal with the card?', 'A Sunday night. I added up everything I owed on the back of an envelope and it was more than I earn in two months.', 'What did you do the next day?', 'Moved my salary to Pennyjar, set up budgets, and put the card payment first. I also told my sister, which was the hardest bit and probably the most useful.'],
			['Have you had a wobble since?', 'In the summer I booked a festival on the card without thinking. Two hundred pounds.', 'How did that feel?', "Awful for about a day. Then I worked out it put me back three weeks, cut going out for a month, and got back on track. A year ago I'd have given up completely."]
		],
		next: ['Debt-free. Properly. And a buffer of a thousand pounds.', 'The card cut up and savings that actually grow.']
	},
	{
		age: [25, 37],
		keep: [5, 2, 3, 0],
		min: { pots: 'used' },
		pots: ['Wedding', 'The big day', 'Venue'],
		pots2: ['Honeymoon', 'Dress', 'Suits', 'Rings'],
		cats: ['Wedding admin', 'Hen and stag', 'Gifts for others'],
		splits: ['the hen do with the bridesmaids', 'the stag weekend', 'the venue deposit with {partner}'],
		amount: [300, 500],
		about: [
			"I'm a primary school teacher. I'm getting married next August to {partner}, and that's eaten my life for the last year.",
			"I work in HR. {partner} and I got engaged last Christmas and we're paying for the wedding ourselves, so everything is about that right now.",
			"I'm a physio. We're getting married in the spring, small do, but it still adds up."
		],
		start: [
			"I had it for a while just for my own spending. When we got engaged I went on Plus, for {decoy}, because one pot wasn't going to cover a wedding.",
			'{partner} had it first. When we started planning, I joined and went on Plus straight away, mainly for {decoy}.'
		],
		month: [
			"We both put £{amt} into {pot} on payday. Then there are the smaller pots, {pot2} and so on, which get topped up when something's coming.",
			"Every month we pay the next supplier deposit out of {pot}, so I'm always looking at what's due next and whether we're ahead. {pot2} has its own pot too."
		],
		main: ['The wedding. Paying for it without a loan.', 'Getting to the day without borrowing anything.', 'Saving for the wedding. After that, probably a house.'],
		turns: [
			['How are you and {partner} sharing the costs?', 'Equal, mostly. Both of us pay into {pot}. For the things that are more one of ours, like the dress, it comes out of our own pot.'],
			['How do you keep track of supplier payments?', 'I keep a list in my notes app of who needs paying when. The money side is the pots, the list side is my phone. I wish they were one thing.'],
			["What's been the biggest surprise?", "How fast the little things add up. Favours, chair covers, postage on the invites. That's why {pot2} exists, so the small stuff stays out of the main pot."],
			['Is anyone helping with money?', "{partner}'s parents gave us a bit, which went straight into {pot} so we didn't think of it as spending money."]
		],
		stories: [
			['Has anything thrown the wedding budget off?', 'The venue changed hands and the new owners wanted another eight hundred for the same date.', 'What did you do?', 'We negotiated for a fortnight and got it down to four hundred. Then we took the rest off the flowers and the cake. Seeing every bit of it in front of us made that conversation easier.'],
			['Have you and {partner} disagreed on spending for it?', 'The photographer. {partner} wanted the expensive one.', 'Who won?', "{partner}, but we took it off the honeymoon. Everything's a trade-off when you can see the whole lot."]
		],
		next: ['Married, and nothing owed to anyone for it.', 'Married, and starting to save for a house instead.']
	},
	{
		age: [29, 55],
		keep: [3, 0, 4, 1],
		min: { pots: 'rare' },
		pots: ['Tax', 'Self-assessment', 'Tax money'],
		pots2: ['Tools', 'Holiday', 'Quiet weeks', 'Van'],
		cats: ['Van', 'Materials', 'Tools', 'Diesel'],
		splits: ['the materials on a job with {friend}'],
		amount: [500, 900],
		about: [
			"I'm an electrician, self-employed for five years now. My business account's elsewhere, and Pennyjar is my personal one, but I pay myself into it.",
			"I'm a plasterer. Sole trader. My other half does the books for the business, but my own money is on me.",
			"I fit kitchens. Mostly on my own, sometimes with a mate. I'm not a numbers person, but I've had to learn."
		],
		start: [
			'My accountant said I needed to stop mixing things up. I opened Pennyjar for the personal side, and Plus a bit later for {decoy}.',
			'My apprentice had it. I saw him moving money about on his phone in the van and thought, I should do that. Plus I got for {decoy}.'
		],
		month: [
			"I pay myself every Friday from the business account, the same amount unless it's been a bad week. Then I set some aside in {pot}, and the rest is rent and living.",
			"It comes in weekly from the business. I've got the mortgage, the kids' stuff, and I try to put something into {pot} so the tax isn't a shock."
		],
		main: [
			"Keeping my own money separate from the business money, so I know what's mine.",
			"Knowing what I can actually spend after tax. That's the big one when you're self-employed.",
			'Not getting stung at tax time.'
		],
		turns: [
			['How does the van fit in?', "Van's through the business, but I use it at weekends too. So some diesel goes on my personal card and I have to pull it out at the end of the year.", 'cats'],
			['What happens in a quiet week?', "I don't pay myself the full amount, and I take it out of {pot2}. That's what it's there for. January's always quiet.", 'pots'],
			['How do you find the app when you are on site?', "I check it in the van at lunch. It's quick, which is what I need. I haven't got time to read things."],
			['Do you use the notifications?', "Yes. I like seeing the payment go through when I'm at the wholesaler. It means I know what I've spent before I've driven off."]
		],
		stories: [
			["What's the worst tax year you've had?", "My second year. I didn't put anything by, and in January I owed four grand I didn't have.", 'How did you get out of it?', 'Payment plan with HMRC, and a lot of weekend work. Now a bit goes into {pot} every Friday without fail, and January is just a normal month.'],
			['Has a job ever left you short?', 'A builder I subcontracted for paid sixty days late. Twice.', 'What did you do?', "I stopped working for him. And I keep a few weeks of wages back now, so one slow payer doesn't put the mortgage at risk."]
		],
		next: ["A tax bill that doesn't make me nervous, and the next van paid for in cash.", "Paying into a pension, which I've never done."]
	},
	{
		age: [64, 79],
		since: [2023, 2025],
		keep: [2, 1, 2, 4],
		pots: ['Grandchildren', 'Holidays', 'Car'],
		pots2: ['Boiler', 'Christmas', 'House repairs'],
		cats: ['Grandchildren', 'Garden', 'Church', 'Bowls club'],
		splits: ['the coach trip with my sister', 'lunch with the bowls club'],
		amount: [80, 200],
		about: [
			"I'm retired from the civil service. I live on my own in {town}. My granddaughter set the app up for me.",
			"I'm retired, I used to be a postman. My other half and I live in {town} and we've got four grandchildren who keep us busy and skint.",
			"Retired head teacher. I'm on two pensions and I like to know exactly where I stand."
		],
		start: [
			"My grandson put it on my phone and said, you'll love this. I did, eventually. He put me on Plus as well, for {decoy}, and I've kept it.",
			'I was fed up with my old bank closing branches. A friend at the bowls club had Pennyjar. I went on Plus after a few months, for {decoy}.'
		],
		month: [
			'The state pension comes on a Thursday every four weeks, and the work pension on the 25th. I know to the pound what goes out, so I can tell you what I can spend on the grandchildren.',
			"Pensions come in, then the direct debits. Council tax, the water, the TV licence, the car insurance which I pay monthly. What's left is mine and the grandchildren's."
		],
		main: ['Knowing where I stand on a fixed income. No surprises.', 'Making the pension stretch, and having something put by for the grandchildren.', "Keeping an eye on it. I've got the time, so I like to."],
		turns: [
			['How did you find learning the app?', "Slow at first. My granddaughter wrote the steps on a card for me. I still have the card, but I don't need it now."],
			['Who else helps with your money?', "Nobody, and I'd like to keep it that way. My son offers to look, but I'm perfectly capable."],
			['What do you put by for the grandchildren?', "Birthdays and Christmas, mostly. I put a bit into {pot} every month so December doesn't hurt.", 'pots'],
			['Do the grandchildren know about the app?', 'The eldest does. She thinks it is very funny that I have an app at my age.']
		],
		stories: [
			['What changed most when you retired, money-wise?', "Knowing exactly what was coming in, and that it wasn't going to go up much.", 'How did you adjust?', "I wrote down every direct debit and asked myself whether I needed it. I got rid of about sixty pounds a month of things I'd stopped using."],
			['Have you ever been caught out?', 'The boiler, two winters ago. Nine hundred pounds, in January.', 'What happened?', "I paid it from my savings, but it gave me a fright. Now there's money put by each month for the house, so the next one won't."]
		],
		next: ['Exactly where I am, with a bit more put by for the grandchildren.', 'The same, but with the house repairs done.']
	},
	{
		age: [24, 50],
		keep: [3, 1, 3, 1],
		min: { pots: 'rare' },
		pots: ['Overtime', 'Holiday', 'Car'],
		pots2: ['Rainy day', 'Christmas', 'Uniform and kit'],
		cats: ['Hospital parking', 'Night shift food', 'Taxis home', 'Coffee'],
		splits: ['a taxi home with {friend} after nights', "the ward's leaving present"],
		amount: [150, 400],
		about: [
			"I'm a staff nurse on an acute ward in {town}. Twelve-and-a-half-hour shifts, a mix of days and nights.",
			"I'm a paramedic. I do a lot of overtime when it's offered, so my pay is all over the place.",
			"I'm a healthcare assistant in a care home. Shifts, lots of weekends, and overtime at Christmas."
		],
		start: [
			'A colleague on nights showed me. We were on a break at four in the morning and she was sorting her pots. I joined that week. Plus I got for {decoy}.',
			"I'd tried other budgeting apps and given up. This one stuck. I went on Plus after about six months, for {decoy}."
		],
		month: [
			"Base pay comes in on the 25th, and the overtime from two months ago comes with it, so I never really know the total until the payslip. I try to live on the base pay and put the overtime in {pot}.",
			'My pay changes every month with the shifts. I set my budgets on the base pay, and anything extra goes into {pot}.'
		],
		main: ['Living on my base pay and saving the overtime.', 'Making a messy wage predictable.', 'Keeping the overtime separate so it actually turns into something.'],
		turns: [
			['What does the app look like on a night shift?', "I check it on breaks. It's when I do all my admin, honestly. Nobody else is awake."],
			["Where do you spend money you don't expect to?", "Food on nights. The canteen's shut, so it's the vending machine or a takeaway on the way home. I made a category for it because I couldn't believe the total.", 'cats'],
			["What's the overtime for?", "This year, a proper holiday. Last year it went on the car. I like having it in {pot} where it's not mixed up with bills."],
			['How do you feel about payday?', "It's always a bit of a surprise, because of the overtime. A good surprise, usually."]
		],
		stories: [
			["What's the best thing the overtime has paid for?", 'A week in Crete in May. First holiday abroad in four years.', 'How did it feel?', 'Brilliant. And it was all paid for before I went. I came back to no credit card bill, which has never happened before.'],
			['Has the shift pattern ever upset your money?', 'When they changed the rota in the spring, I lost most of my nights, and nights pay more.', 'What did you do?', "Cut my budgets for two months until I got some nights back. It's the base pay thing again: if I'd been spending the overtime, I'd have been in trouble."]
		],
		next: ['Another holiday paid for by overtime, and fewer nights.', "Enough saved that I can say no to overtime when I'm tired."]
	},
	{
		age: [28, 46],
		keep: [3, 1, 3, 1],
		pots: ['School', 'Uniform', 'Holiday club'],
		pots2: ['Christmas', 'Birthdays', 'Car'],
		cats: ['School trips', 'Kids clothes', 'Clubs', 'Packed lunches'],
		splits: ['the birthday party with another family', 'the school trip coach with {friend}'],
		amount: [40, 90],
		about: [
			"I'm a single parent of two, {kid} and the little one. I work part-time as a receptionist at a GP surgery.",
			"I'm on my own with {kid} most of the week. I work for a delivery company in the warehouse.",
			'I have three kids and I work as a carer. Their dad pays some maintenance, when he remembers.'
		],
		start: [
			'Another parent at the school gate told me about it. I was always running out the week before payday. I signed up and went on Plus quite soon, for {decoy}.',
			"I'd been meaning to sort myself out for years. I opened Pennyjar in the summer holidays when I had a bit of time, and Plus a few months after, for {decoy}."
		],
		month: [
			"Wages, child benefit and maintenance come in on different days, so there's a little calendar in my head. Rent and bills first. Then food, then whatever the kids need that month.",
			'I get paid fortnightly. Each payday I put £{amt} away for the school stuff, because September and Christmas are the killers.'
		],
		main: [
			'Making sure the kids have what they need without me panicking at the end of the month.',
			'Getting to the end of the month without borrowing from my mum.',
			'Planning for the big expensive bits of the year, like September.'
		],
		turns: [
			["What's September like?", "Uniform, shoes, bags, trips, all in one go. I used to go overdrawn every September. This year I'd put it aside in {pot} from January, and it was fine.", 'pots'],
			['How do you keep track of school costs?', "Everything for school goes into one category, so I can see what the year comes to. It's more than I thought.", 'cats'],
			['Do the kids know about the budgeting?', '{kid} does, and likes to check how the money for the next birthday party is doing. I think it is good for kids to see it.'],
			['Where do you get stuck?', "When the maintenance doesn't come. Then the plan goes out of the window for a week or two."]
		],
		stories: [
			['Tell me about a month that went really well.', "August. Holiday club, a week away at my mum's caravan, and I didn't go overdrawn once.", 'What made the difference?', 'Planning since January. A little bit each payday. It sounds boring, but the boring bit is what made August fun.'],
			["What happens when the kids need something you didn't expect?", '{kid} needed glasses in October, and frames for kids are not cheap.', 'How did you manage?', "I took it out of the Christmas money and told myself I'd make it up by December. I'm about halfway there."]
		],
		next: ['A Christmas without stress. That would be enough.', "A small emergency fund, so one bad month doesn't knock everything over."]
	},
	{
		age: [24, 48],
		keep: [3, 1, 2, 2],
		min: { pots: 'rare' },
		pots: ['Home', 'Family', 'Mum and Dad', 'Flights'],
		pots2: ['Emergency', 'Christmas', 'Visa renewal'],
		cats: ['Money home', 'Phone top-ups', 'Groceries from home', 'Church'],
		splits: ['the flat shop with {friend}', 'a birthday cake for a colleague'],
		amount: [150, 400],
		about: [
			'I came to the UK three years ago. I work as a care assistant, and every month I send money home to my mum and my younger brothers.',
			"I'm a nurse here, and most of my family is still back home, so a part of every pay goes to them.",
			'I moved here six years ago. I drive for a supermarket. My parents are getting older, so I help them.'
		],
		start: [
			'When I arrived it was hard to get a bank account because I had no history here. A friend from church said Pennyjar was easy to open. Later I went on Plus, for {decoy}.',
			'My first bank here was fine but the app was confusing. I moved to Pennyjar and went on Plus after a while, for {decoy}.'
		],
		month: [
			"On payday the first thing is the money for home. I keep it in {pot} until the transfer goes. Then rent, then the phone, then food. What's left I save for flights.",
			"I get paid on the 28th. I move £{amt} into {pot} for home, the same day, so I'm not tempted. Then I live on the rest."
		],
		main: ['Making sure the money for home is always there, and then saving to visit.', 'Supporting my family back home and still living here.', 'Keeping the family money separate from my own.'],
		turns: [
			['How do you send the money home?', 'I use a transfer service. It is separate. But I keep the money in Pennyjar until the day I send it, so I never touch it.'],
			['When did you last visit?', "Two Christmases ago. I'm saving for next summer. It's a big pot, flights are a lot in July.", 'pots'],
			['Does your family use any apps for money?', 'My brother does, at home. We compare sometimes. He thinks mine is very organised.'],
			['What would you change about how you do it?', "I'd like to send straight from the app. Now it's two apps and I copy the amounts across."]
		],
		stories: [
			['Has your family ever needed money urgently?', 'Last year my mother was in hospital. They needed money for the bill that week.', 'What did you do?', 'I sent what I had saved for flights. I was glad it was there. It meant I could help straight away and not borrow.'],
			['What did you find hardest when you first came here?', 'Everything was new. No credit history, no bank, no idea how council tax works.', 'How did you learn?', 'From friends at church, and from making a budget for every single thing. Now I explain it to new people when they arrive.']
		],
		next: ['A visit home paid for, and my brothers through school.', 'Enough saved to bring my mother here for a holiday.']
	},
	{
		age: [25, 39],
		keep: [1, 6, 1, 0],
		min: { split: 'used' },
		pots: ['Holidays', 'Lisbon', 'Ski trip'],
		pots2: ['Festival', 'Birthdays'],
		cats: ['Travel', 'Trips', 'Eating out'],
		splits: ['the villa for the group holiday', "the cottage for {friend}'s birthday weekend", 'the festival tickets'],
		amount: [600, 1800],
		about: [
			"I'm the organiser in my friendship group. If there's a holiday or a weekend away, I'm the one booking it, which means I'm the one out of pocket.",
			'I work in events, so I suppose it is not surprising that I end up planning all the trips with friends as well.',
			"I'm a software tester. I've got a big group of friends from uni and we do two trips a year. I always end up booking."
		],
		start: [
			'We went to Lisbon, eight of us, and I paid for the whole villa. Getting the money back took three months and a lot of awkward messages. {friend} told me about Pennyjar. I went on Plus for {decoy}.',
			"I'd had the account for the budgeting. The group trips are what got me to Plus, mostly for {decoy}."
		],
		month: [
			"It depends on whether there's a trip coming. When there is, I pay the deposit, split it from the payment, and everyone pays me back over a few weeks.",
			"My own spending is pretty steady. The chaos comes from trips. Right now I've just paid £{amt} for {split}, so I'm waiting on six people."
		],
		main: ['Getting paid back for the trips I organise.', 'Organising the group stuff without losing money or friends.', 'Splitting the trips. My own money I could handle anywhere.'],
		turns: [
			['How many people did the last trip involve?', 'Nine. Four of them have Pennyjar, five got the link. Everyone had paid within two weeks, which is a record.', 'split'],
			['What did you do before?', "A spreadsheet with everyone's names and red and green cells. I'd post a screenshot in the group chat every week. People hated it."],
			["Is there anyone who never pays?", "There's always one. With the request sitting there, it's harder for him to pretend he forgot.", 'split'],
			['Do you save for your own trips as well?', 'Yes, I put something aside each month so the next one is less of a hit.']
		],
		stories: [
			["What's the most complicated trip you've organised?", "A ski trip last February. Twelve people, three chalets, a minibus, and two people who dropped out after I'd paid.", 'How did you handle the dropouts?', 'We found one replacement and shared the other place between everyone. I changed all the splits, everyone grumbled a bit, and everyone paid. A few years ago that would have been a disaster.'],
			['Has anyone ever not paid you back?', 'One person, years ago, before Pennyjar. Two hundred pounds.', 'What happened?', "Never got it. We're not really friends any more. That's why I'm so strict about it now."]
		],
		next: ['Somebody else organising a trip, for once.', 'The same number of trips and nobody owing me anything.']
	},
	{
		age: [24, 52],
		keep: [2, 0, 5, 1],
		pots: ['Vet', 'Dog', 'Pet emergencies'],
		pots2: ['Holiday', 'Christmas'],
		cats: ['Dog', 'Dog walker', 'Vet bills', 'Pet food'],
		splits: ['the dog walker with {partner}', 'the dog sitter for the weekend'],
		amount: [90, 220],
		about: [
			"I'm a graphic designer, I work from home, and I've got a spaniel called Biscuit who spends more than I do.",
			'I have a rescue greyhound and I work as a veterinary receptionist, which is a bit ironic.',
			"I'm a lab technician. I live with {partner} and our whippet, who is nervous about everything except food."
		],
		start: [
			'When we got the dog I wanted to know what he actually cost us. Pennyjar seemed the easiest way. I went on Plus for {decoy}.',
			"I'd been with Pennyjar a while. I upgraded when we got the dog, mostly for {decoy}."
		],
		month: [
			"Food, insurance, the walker three days a week. It's about £{amt} a month, and that's before the vet. I check it on the 1st when the summary comes.",
			'The insurance goes out on the 5th, food is every three weeks, and then there are the random things, toys and treats, which add up more than I would admit.'
		],
		main: ['Knowing what the dog actually comes to. It is a lot.', 'Keeping the pet money visible so we can plan for vet bills.', 'Tracking the dog, honestly. Everything else is fine.'],
		turns: [
			['What happened the last time there was a big vet bill?', "The dog ate a sock in June. The insurance covered most of it, but there's an excess, and I'd been putting money into {pot} for exactly that. It was the first time I felt organised.", 'pots'],
			['How do you track what the dog costs?', "Everything for the dog goes into one category. Food, toys, insurance, the walker. At the end of the year I'll know the real number.", 'cats'],
			["Who looks after the dog when you're away?", "A sitter. We pay her by transfer and I split it with {partner} if we're both going."],
			['Would you get another?', "{partner} would. I've seen the numbers, so I'm less sure."]
		],
		stories: [
			["What's the biggest pet bill you've had?", "Dental work for the dog. Nearly a thousand, and the insurance didn't cover teeth.", 'How did you deal with it?', "Half from savings and half spread over three months of not going out. That's when I started tracking every penny of it."],
			["How did you decide on the dog's budget?", 'We tracked everything for three months and then rounded up.', 'Do you stick to it?', "Mostly. The treats are the problem. It's always the treats."]
		],
		next: ['A proper vet fund, so the next big bill is boring.', 'Maybe another dog. If the numbers allow it.']
	},
	{
		age: [26, 50],
		keep: [1, 1, 5, 1],
		min: { pots: 'rare' },
		pots: ['New bike', 'Race entries', 'Bike fund'],
		pots2: ['Holiday', 'Car'],
		cats: ['Cycling', 'Bike bits', 'Café stops', 'Club'],
		splits: ['the van to a race with club mates', 'the club dinner'],
		amount: [90, 250],
		about: [
			"I work in logistics, I live with {partner}, and I'm a cyclist, which is an expensive way of being tired.",
			"I'm an engineer. My main hobby is cycling, road and gravel, and it's the thing I spend most on that isn't rent.",
			"I'm a postman and I race bikes at the weekend. Amateur, but serious."
		],
		start: [
			'I wanted to know how much the bikes were costing me, because {partner} kept asking. Pennyjar seemed easiest. I went on Plus for {decoy}.',
			"Someone in my cycling club mentioned it on a ride. I'd been meaning to sort my money out. I went on Plus after a while, for {decoy}."
		],
		month: [
			"Normal bills, then the club, the café stops, and whatever's broken on the bike that month. Something always is. Anything left over goes into {pot}.",
			"Bills first, then I've got a set amount for the bike. If I go over, I take it out of {pot}, which hurts, so I try not to."
		],
		main: ["Keeping the cycling under control so it doesn't eat everything else.", 'Knowing what the hobby really comes to, so {partner} can stop worrying.', 'Seeing my spending properly. The bike stuff is the bit that matters.'],
		turns: [
			['How much does cycling come to, roughly?', 'About £{amt} a month on average, once you count everything. I only know that because it has its own category.', 'cats'],
			['What made you start tracking it?', "{partner} asked how much I'd spent on the bike that year. I said 'not much'. Then I looked."],
			['Do you save up for big purchases?', "Yes, there's a pot for the next bike. I'm about halfway."],
			['Do you split things with club mates?', "Sometimes, for {split}. It's easy enough.", 'split']
		],
		stories: [
			["Tell me about the most you've spent on cycling in one go.", 'A new bike last spring. Three thousand.', 'How did you save for it?', "Eighteen months, a bit every payday. When I bought it there was nothing on a card, and {partner} couldn't say a word, because they'd watched it build up."],
			['Has the hobby ever caused a row at home?', 'Once, over a set of wheels.', 'What happened?', "I'd said they were 'not that much'. They were six hundred. Now I keep the bike spending where {partner} can see it whenever they want. No more rows."]
		],
		next: ['New bike, paid for, and {partner} still speaking to me.', 'Spending a bit less on the bike and a bit more on holidays.']
	},
	{
		age: [24, 60],
		keep: [6, 0, 2, 0],
		min: { pots: 'used' },
		pots: ['MOT', 'Car insurance', 'Tyres', 'Servicing'],
		pots2: ['Road tax', 'Breakdown cover', 'Next car'],
		cats: ['Fuel', 'Parking', 'Car wash'],
		splits: ['fuel on the car share to work'],
		amount: [120, 260],
		about: [
			"I'm a community nurse. I drive all day for work, so the car is everything. If it breaks, I can't work.",
			"I'm a sales rep. I drive about twenty thousand miles a year. The car's mine, so the running of it is mine too.",
			"I live in a village with one bus a day, so the car isn't optional. I work in admin at a school."
		],
		start: [
			'The car bills used to land like a bomb. MOT, insurance, tyres, all at once. Someone on a forum mentioned using pots for it. I joined and went on Plus for {decoy}.',
			'I had Pennyjar for budgeting first. I went on Plus a while later, for {decoy}, when I realised I needed more than one pot.'
		],
		month: [
			"I've worked out what the car needs over a year and divided by twelve. That goes into the car pots on payday. Then when something's due, the money's sitting there.",
			"Every payday I top up {pot}, {pot2} and a couple of others. It's maybe £{amt} in all. Then when the MOT comes round, it's just paid."
		],
		main: ['Keeping the car on the road without a big bill landing on me.', 'Spreading the car bills over the year.', 'Not being caught out by the car. That is it, really.'],
		turns: [
			["What's the worst car bill you've had?", "The clutch went two years ago. Eight hundred pounds. That's what started the whole pot system."],
			['How did you work out how much to put by?', 'I went through a year of statements with a highlighter. It took an evening. Then it was just maths.'],
			['Do you track fuel?', 'Fuel has its own budget. It is the one that moves the most.'],
			['What about replacing the car one day?', "There's a pot for that too, but it's very small. It's more of an intention than a plan."]
		],
		stories: [
			['Tell me about the clutch.', 'Two years ago, on the motorway. It just went. Tow truck, garage, eight hundred pounds.', 'How did you pay for it?', "Credit card, and it took me most of a year to clear it. That's when I sat down and worked out what a car really needs over a year."],
			['Has the system ever not been enough?', 'Last winter I needed four tyres at once instead of two.', 'What happened?', '{pot} only had enough for two, so I topped it up from {pot2} and put more in for a few months. It all came out even by the summer.']
		],
		next: ["A pot for the next car that's more than an intention.", 'Every car bill paid without thinking about it, like this year.']
	},
	{
		age: [30, 58],
		keep: [6, 1, 2, 1],
		min: { pots: 'used' },
		pots: ['Christmas', 'Birthdays', 'Presents'],
		pots2: ['Weddings', 'Secret Santa', "Mum's birthday"],
		cats: ['Presents', 'Cards and wrapping', 'Kids parties'],
		splits: ['a group present for {friend}', 'the office leaving present'],
		amount: [60, 150],
		about: [
			"I'm an office manager for a firm of solicitors. I've got a big family, nine nieces and nephews, and Christmas used to break me every year.",
			"I'm a dental hygienist. I love buying presents, which is lovely in theory and a disaster in January.",
			'I work at a building society, funnily enough. Big family, lots of birthdays.'
		],
		start: [
			"One January I added up what I'd spent on Christmas and nearly fell over. I joined Pennyjar after that and went on Plus for {decoy}.",
			"A friend showed me her Christmas pot in about March and I thought, that's genius. I went on Plus a bit later, for {decoy}."
		],
		month: [
			'Every payday, £{amt} goes into {pot}, and smaller amounts into {pot2}. When a birthday comes, I pay from that pot and never think about it.',
			'There is a list of birthdays in my calendar, and each month I put enough away for the ones coming up, in {pot2}. Christmas gets a bit in {pot} every month all year.'
		],
		main: ['Christmas and birthdays. Making them not hurt.', "Putting money aside for presents so January isn't a disaster.", 'Spreading the present buying over the year.'],
		turns: [
			['What happened last Christmas?', "First year I didn't go overdrawn. Everything came out of {pot}, and there was even a bit left for the sales."],
			['How many pots do you have for this?', 'Probably too many. One for Christmas, one for birthdays, one for weddings because there were four this year.'],
			['Do you go in on group presents?', 'All the time, at work and with family. Someone pays and the rest of us pay them back.', 'split'],
			['Do you set a limit per person?', 'Roughly. Kids get more than adults. My brother gets a bottle of something and is happy.']
		],
		stories: [
			['What was Christmas like before?', "I'd put it all on a card in December and pay it off until about April.", 'And now?', "Now December is the easiest month of the year, because the money's already there. I do my shopping in November, from {pot}, and January is just January."],
			['Do you ever go over on a present?', "My niece's eighteenth. I spent twice what I'd planned.", 'How did that work out?', "I took it from the next month's birthdays. It's all swings and roundabouts as long as it's in the pots."]
		],
		next: ['Christmas paid for by October.', 'The same system, with fewer weddings.']
	},
	{
		age: [20, 40],
		keep: [2, 1, 3, 2],
		min: { pots: 'rare' },
		pots: ['Tax', 'Scooter repairs', 'Insurance'],
		pots2: ['Holiday', 'Rainy day'],
		cats: ['Fuel', 'Phone', 'Scooter parts', 'Food on shift'],
		splits: ['the flat bills with {friend}'],
		amount: [40, 120],
		about: [
			'I deliver food on a scooter, mostly evenings. Some weeks I do sixty hours, some weeks twenty.',
			'I do deliveries on a scooter for two of the apps. Self-employed. Paid weekly, and it depends how many drops I do.',
			"I'm doing my Master's and I do deliveries on a scooter to pay the rent. It's very up and down."
		],
		start: [
			'The delivery app pays weekly and I was spending it by Tuesday. A guy at the restaurant pick-up told me to get Pennyjar. I went on Plus for {decoy}.',
			'I needed something simple. I opened Pennyjar on my phone in about ten minutes and later went on Plus, for {decoy}.'
		],
		month: [
			'Money comes in every Wednesday. Straight away I move some into {pot}, because nobody takes tax off for me. Then the scooter, then rent at the end of the month.',
			"Every week is different. I try to put £{amt} into {pot} each week whatever happens, so the end of the month isn't scary."
		],
		main: ['Turning a weekly, up-and-down pay into rent on time.', 'Keeping money back for tax and the scooter.', "Not spending the week's money before the next week starts."],
		turns: [
			["What's a good week like?", 'Rainy weeks are the best, everyone orders. I can make double. That is when I fill up {pot}.'],
			['What goes on the scooter?', 'A tyre, a chain, a new battery. I made a pot for it because every time it broke I lost a week of work.', 'pots'],
			['Do you look at the app on shift?', 'Between orders, yes. The notification when the money lands on Wednesday is my favourite moment of the week.'],
			['Have you thought about tax?', 'Yes, a friend helped me with the self-assessment. Now I know roughly what to keep back.']
		],
		stories: [
			["What's the worst week you've had?", "Snow in February. Two days I couldn't ride at all, and the scooter got a puncture on the third.", 'How did you manage?', "I had a bit put aside for rent, so rent was fine. Food that week was beans. But I didn't miss the rent, and a year ago I would have."],
			['What does a week have to bring in?', 'About three hundred and fifty, after the scooter.', 'And above that?', 'Above that is savings. Below that, I work an extra night. Knowing the number has made the job less stressful.']
		],
		next: ["Two months of rent saved and a scooter that doesn't break.", 'A steadier job, with the savings habit still there.']
	},
	{
		age: [42, 66],
		keep: [1, 6, 2, 0],
		min: { split: 'used' },
		pots: ["Mum's things", 'Care', "Mum's care"],
		pots2: ['Holiday', 'Car'],
		cats: ["Mum's shopping", 'Prescriptions', "Travel to Mum's"],
		splits: ["Mum's weekly shop", "the cleaner for Mum's house", "Mum's prescriptions"],
		amount: [60, 140],
		about: [
			"My mum's eighty-four and lives on her own in {town}. I do her shopping and pay for most things, and my brother and sister chip in. I work part-time in a library.",
			"I look after my mum, who has dementia. I'm her main carer, and my brother and sister help with money. I'm a bookkeeper, part-time.",
			"I'm a council planning officer, and every weekend I drive to my mum's, do her shopping and sort her post. My brother lives abroad."
		],
		start: [
			'I needed a way to share the costs with my brother and sister without arguing. A friend in a carers group mentioned Pennyjar. I went on Plus for {decoy}.',
			'I had the account already. When things got more complicated at home, I went on Plus, for {decoy}.'
		],
		month: [
			'I pay for things as they come up, mostly the weekly shop and the cleaner. Then I split them three ways and the others pay me back.',
			'Every week I do the shop on my card, about £{amt}. I split it with my brother and sister from the payment, and they pay their share. Once a month there is the cleaner as well.'
		],
		main: ["Sharing Mum's costs fairly with my brother and sister.", "Looking after Mum's money and splitting it with the family.", 'Keeping the care costs fair between the three of us.'],
		turns: [
			['How did it work before?', "I kept receipts in a shoebox and every few months I'd send a photo of a spreadsheet to the family. My sister questioned every line. It was miserable."],
			['Do your brother and sister use Pennyjar?', 'My sister does. My brother gets the link. They both pay within a day or two now.', 'split'],
			['Is it always split equally?', "My brother pays a bit more because he can't help in person. I change the amounts on each split.", 'split'],
			['How do you keep your own spending separate?', "The shop for home goes into its own category, so my own budget doesn't look like I'm eating for two.", 'cats']
		],
		stories: [
			['Was there a moment it got really difficult?', 'When Mum had a fall last year and needed carers coming in. The costs doubled overnight.', 'How did the family handle it?', "We had a proper call, the three of us, and agreed new shares. My brother took a bigger part. I changed the splits and it's been steady since."],
			["What's the hardest part, apart from money?", 'The time. Driving there, the shopping, the phone calls.', 'Does the app help with that?', "A bit. It's one less thing to argue about. When you're tired, not having to chase your sister for twelve pounds matters."]
		],
		next: ['Mum still at home, and the money side still calm.', 'The family sharing the time as well as the money.']
	},
	{
		age: [24, 48],
		keep: [1, 6, 1, 0],
		min: { split: 'used' },
		pots: ['Club kit', 'Tournament', 'Season'],
		pots2: ['Holiday', 'Christmas'],
		cats: ['Football', 'Club costs', 'Netball'],
		splits: ['the weekly booking', 'the end-of-season meal', 'the new kit'],
		amount: [55, 90],
		about: [
			"I run a five-a-side team. Every Tuesday, ten of us, and I book the pitch. I'm a quantity surveyor in real life.",
			"I'm the treasurer of a netball club. Thirty members, and I end up paying for courts and collecting the money.",
			"I organise a Sunday league team. Pitch, referee, kit, all of it. Day job, I'm a mechanic."
		],
		start: [
			'I was always out of pocket on the pitch. Somebody said Pennyjar could split it and send people a link. I went on Plus for {decoy}.',
			'I had the account for myself. When I took over the club money, I went on Plus, for {decoy}.'
		],
		month: [
			'Every week I pay the booking, about £{amt}, and split it between whoever played. Most people pay before we have finished.',
			"Courts are booked monthly. I pay up front and split it between whoever's signed up for that month."
		],
		main: ['Getting everyone to pay their share every week.', 'Running the club money without being the person who chases.', 'Splitting the bookings every week.'],
		turns: [
			['How did you collect money before?', 'Cash in a bag. Half of them never had cash. I was losing about twenty quid a week.'],
			['What happens when someone drops out at the last minute?', 'I take them off the split and change the amounts for the others. It takes a minute.', 'split'],
			['Have you thought about a club account?', 'We should. But it is a faff, and this works.'],
			['Do the players all have Pennyjar?', 'Three or four. The rest pay through the link.', 'split']
		],
		stories: [
			['Has the money side ever caused trouble in the team?', 'One player owed for about six weeks and everyone knew.', 'How did it get sorted?', "The request was just sitting there with his name on it, and someone made a joke in the group chat. He paid that night. I didn't have to say anything."],
			['What happens at the end of the season?', 'We do a meal and a little trophy thing.', 'How do you pay for that?', "I book it, pay the deposit, and split it between whoever's coming. Same as the weekly booking, just bigger."]
		],
		next: ["A club account, finally, so it's not on my card.", 'Someone else taking over as treasurer.']
	},
	{
		age: [21, 26],
		since: [2022, 2024],
		keep: [3, 2, 2, 3],
		min: { pots: 'rare' },
		pots: ['Emergency fund', 'Moving out', 'Flat deposit'],
		pots2: ['Driving lessons', 'Christmas', 'Holiday'],
		cats: ['Work lunches', 'Commute', 'Clothes for work'],
		splits: ['rent with {friend}', 'the flat shop'],
		amount: [300, 700],
		about: [
			"I graduated last year, chemistry, and I've just started my first proper job as a lab analyst. First real salary.",
			"I'm twenty-three. I work in graduate recruitment, which is funny because I was a graduate about five minutes ago.",
			"I'm a trainee accountant, first year. Still living with my parents for now, saving to move out."
		],
		start: [
			'I had Pennyjar at uni. When the first salary came in I went on Plus, for {decoy}, because I wanted to do things properly.',
			'My dad told me to sort out a budget before the first pay came in. I already had Pennyjar from uni and went on Plus after a couple of months, for {decoy}.'
		],
		month: [
			'Pay on the 25th. That is still new. I send rent to my parents, then put £{amt} into {pot}, and live on the rest.',
			"Pay on the 25th. Rent and bills by the 3rd. I've set budgets for food and going out, and whatever's left goes into {pot}."
		],
		main: ['Building an emergency fund and learning to live on a salary.', 'Saving to move out, and not wasting the first proper money I have had.', 'Getting good habits now, while it is easy.'],
		turns: [
			["What's different from being a student?", "There's money every month. It's weirdly harder, because you think it'll keep coming, so you spend it."],
			["What's the emergency fund for?", "Three months of costs. That's what everyone online says. I'm at about one."],
			['Do your parents give advice?', 'Constantly. My dad keeps asking whether I have started a pension. I have, through work.'],
			['What are you saving for?', 'Moving out. I want a flat with {friend} next year.']
		],
		stories: [
			['What did you do with your first pay?', 'I bought my mum flowers and a nice dinner for myself, and then I panicked about the rest.', 'What did you do with the panic?', "Read too many money blogs. Then I picked three things: an emergency fund, moving out, a pension. That's it. The app is set up around those."],
			['Has anything already gone off plan?', "A friend's wedding abroad in September. Flights, hotel, present.", 'How did you deal with it?', 'Took it out of the moving-out money and pushed the move back a month. It felt grown-up, choosing.']
		],
		next: ['Moved out with {friend}, and the emergency fund at three months.', 'Three months saved and driving lessons paid for.']
	},
	{
		age: [22, 45],
		keep: [1, 0, 3, 4],
		pots: ['Fun money', 'Savings', 'Holiday'],
		pots2: ['Christmas', 'Birthdays'],
		cats: ['Online shopping', 'Impulse', 'Takeaways', 'Treats'],
		splits: ['a takeaway with {friend}'],
		amount: [50, 120],
		about: [
			"I have ADHD, and money's always been the hardest bit of adult life. Things just disappear.",
			"I'm a marketing assistant. I'm very bad at noticing what I spend. Tap, tap, tap, and then the month's gone.",
			"I'm an actor, between jobs a lot, and I spend when I'm bored. I know that about myself."
		],
		start: [
			"A therapist suggested I find a way of seeing my spending as it happens. I tried a few apps. Pennyjar was the one that didn't feel like homework. I went on Plus for {decoy}.",
			'My flatmate uses it. I liked that it tells you the second you spend. I went on Plus later, for {decoy}.'
		],
		month: [
			'I have budgets for everything and I check them a lot. The notifications are the main thing, because they catch me in the moment.',
			"Rent and bills go out first. Then I have £{amt} a week. If I go over, I stop. That's the theory."
		],
		main: ["Seeing what I'm spending while I'm spending it.", "Catching myself before the money's gone.", "Keeping track, which my brain doesn't do on its own."],
		turns: [
			['What do the notifications do for you?', "They make the spending real. Without them it's just tapping a phone. With them, there's a little voice saying, that was twelve pounds."],
			["What's the hardest category?", 'Online shopping, at night. I made a category just for it, and seeing the number every week has made me think twice.', 'cats'],
			['Have you turned anything off?', 'I turned the budget warnings off once because they were stressing me out, and spent a fortune that month. They are back on.'],
			['How do you feel about the app?', 'Like a friend who is a bit strict. Not in a bad way.']
		],
		stories: [
			['Can you remember when you first realised money was slipping away?', "At twenty-five I'd never had more than a hundred pounds at the end of the month, and I earned decently.", 'What did you do about it?', "Lots of systems I gave up on. This one works because it doesn't ask me to remember anything. It tells me, in the moment, and that's what my brain needs."],
			['Has there been a week where it really helped?', 'Black Friday. I had three things in my basket.', 'What happened?', 'I looked at the budget, saw it was nearly gone, and closed the tab. That has never happened before.']
		],
		next: ["A month where I don't go over any budget.", "Savings I haven't raided."]
	},
	{
		age: [28, 50],
		keep: [2, 1, 5, 0],
		min: { pots: 'rare' },
		pots: ['Kitchen', 'Bathroom', 'Renovation'],
		pots2: ['Surprises', 'Holiday'],
		cats: ['Kitchen', 'Bathroom', 'DIY', 'Garden'],
		splits: ['the skip with the neighbours', 'the builder with {partner}'],
		amount: [2400, 6800],
		about: [
			"We bought a doer-upper in {town} eighteen months ago, me and {partner}. I'm a probation officer. Every weekend is DIY.",
			"I'm a quantity surveyor, so I should be good at this, but our own renovation has been chaos.",
			"I'm a teacher. We're doing the house up room by room, mostly ourselves, on a tight budget."
		],
		start: [
			'When we bought the house I wanted to know what each room was actually costing us. Pennyjar seemed the easiest. I went on Plus for {decoy}.',
			"I'd been on Pennyjar for a while. When we started the renovation I went on Plus, for {decoy}."
		],
		month: [
			"Mortgage and bills, then whatever's left goes into {pot}. At the moment it's the kitchen. Everything we buy for it gets paid from there, so we know the running total.",
			"We've set a monthly amount for the house. I put it in {pot} and pay for materials out of it. The trips to the builders' merchant are the dangerous bit."
		],
		main: ['Keeping the renovation on budget, room by room.', 'Knowing what the house is costing us.', 'Doing up the house without it running away from us.'],
		turns: [
			['How do you keep track of what each room costs?', 'Every room has its own category. The kitchen is at £{amt} so far, which is more than we said, but at least we know.', 'cats'],
			['Have there been surprises?', "Every week. Rotten floorboards, a wall that wasn't straight. We have a pot for surprises now.", 'pots'],
			['Do you and {partner} disagree about it?', 'About taps, mostly. Not about the money, because we can both see it.'],
			['When will it be finished?', 'Never, apparently. Everyone says that.']
		],
		stories: [
			["What's the most expensive surprise so far?", "The electrics. The survey didn't pick it up, and the whole house needed rewiring.", 'How did you pay for it?', "We'd planned to do the bathroom this year. We did the wiring instead and the bathroom is next year now. Seeing every room separately made it clear what we were trading."],
			['How do you decide what to spend on each room?', 'We cost everything up before we start, then add a third.', 'Does the third cover it?', "Usually. The kitchen went over, but the garden came in under, so overall we're close."]
		],
		next: ['The kitchen done and the bathroom started.', 'The house finished enough to stop living out of boxes.']
	},
	{
		age: [25, 55],
		keep: [4, 0, 2, 2],
		min: { pots: 'rare' },
		pots: ['Season ticket', 'Annual ticket', 'Train'],
		pots2: ['Holiday', 'Christmas'],
		cats: ['Commute', 'Coffee', 'Lunches out'],
		splits: ['a taxi from the station with {friend}'],
		amount: [280, 520],
		about: [
			"I commute into the city three days a week. I'm a paralegal. The train is my biggest outgoing after rent.",
			"I work in the city centre and live an hour out. I'm a civil engineer. The train and parking at the station are huge.",
			"I'm a policy adviser and I commute in by train four days a week. Hybrid, they call it."
		],
		start: [
			'When I worked out what an annual season ticket would save, I needed somewhere to save for it. Pennyjar made sense. I went on Plus for {decoy}.',
			'A colleague showed me on a cold platform one morning. I signed up on the train, and went on Plus a bit later, for {decoy}.'
		],
		month: [
			"Every month I put £{amt} into {pot}, and once a year I buy the annual ticket out of it. It works out cheaper than monthly, but only if you've got the lump sum.",
			"I pay for the train monthly at the moment. I'm saving in {pot} to switch to an annual ticket in the spring."
		],
		main: ['Saving up for the annual season ticket.', 'Keeping the commute under control.', 'The train, basically. Everything else is normal.'],
		turns: [
			['How much does the annual ticket save you?', "About a month's worth. But you need thousands up front, which is the whole problem."],
			['What else goes on the commute?', 'Coffee at the station, lunch in town. I made a category for the commute so I can see the whole of what going in comes to.', 'cats'],
			['Does working from home change things?', 'On the home days I spend almost nothing. It is the office days that add up.'],
			['When do you buy the next one?', "March. I'm on track, just about."]
		],
		stories: [
			['What changed when you went hybrid?', 'My spending on home days dropped to almost nothing. No coffee, no lunch out, no train.', 'What did you do with the difference?', 'I put it towards the annual ticket. Even on three days a week, the annual works out cheaper if you can find the money up front.'],
			['Has the train ever upset your budget?', 'Strike days. I had to get taxis twice in one month.', 'How did you handle it?', 'Took it from the coffee budget for the month. Silly, but it balanced.']
		],
		next: ['The annual ticket bought without touching my savings.', 'Fewer office days, honestly.']
	}
];

// How the participant names the feature they say they got Plus for, early in the interview.
const decoyLines: Record<Feature, string[]> = {
	pots: ["more pots, because one wasn't anywhere near enough", 'the extra pots', 'the pots, so I could have more than one'],
	split: ['the bill splitting', 'being able to split things', 'the splitting'],
	cats: ['the custom categories', "making my own categories, because the standard ones didn't fit", 'my own categories']
};
const featureNames: Record<Feature, string[]> = {
	pots: ['the pots', 'having more pots'],
	split: ['the splitting', 'bill splitting'],
	cats: ['the categories', 'custom categories']
};

// The Plus features, in parts that are combined per interview.
interface Block {
	ask: string[];
	/** Each answer is one sentence from each list, in order; an empty string leaves a part out. */
	answer: Record<Att, string[][]>;
	/** Follow-ups for a participant who uses the feature: the question and answers by attitude. */
	more: { ask: string[]; core: string[]; used: string[] }[];
}
const blocks: Record<Feature, Block> = {
	pots: {
		ask: ["Let's talk about pots. How many have you got at the moment?", "Can you tell me about your pots? What's in there?", 'How do pots fit into all this?', 'Talk me through your pots, if you have any.', 'Could you open the pots screen and tell me what you see?'],
		answer: {
			core: [
				['{n} at the moment.', '{n}, I think. Let me look. Yes, {n}.', 'Too many, probably. {n}.', "Let me count. {n}. That's gone up since the summer."],
				["There's {pot}, {pot2}, {pot3}, and a few small ones for birthdays and the like.", 'The big one is {pot}. Then {pot2} and {pot3}, and one called Misc that I keep meaning to sort out.', '{pot} is the main one, and then {pot2}, which is for anything that comes round once a year, and {pot3}.', '{pot}, {pot2}, {pot3}, and a couple I made for one-off things that are nearly empty now.'],
				["I move money in on payday and almost never take it out, apart from {pot2}, which is meant to be spent.", "I have them set up so a bit goes in every week. I don't think about it, it just happens.", "Every time I get paid I go through them one by one. It takes five minutes and it's the most grown-up thing I do all month.", 'I top them up by hand. I like doing it. It is a little moment of being in charge.'],
				["Seeing the money in separate places is what makes it work for me. In one big balance I'd spend it.", 'Before pots I had savings and spending in the same place and I would slowly eat into it.', "It's the thing that changed how I handle money, honestly.", "If someone asks me why I use Pennyjar, that's what I show them.", '']
			],
			used: [
				['I have {n}.', 'A few. {n}, I think.', 'A handful.'],
				['{pot} and {pot2} are the ones that matter.', '{pot} is the one I actually look after. {pot2} gets whatever is left.', "{pot}, {pot2}, and one I can't remember making."],
				["I put money in when I remember, which is maybe twice a month.", "They're handy, but I wouldn't say they run my life.", 'I use them, but not religiously.', "I'd notice if they went, put it that way."]
			],
			rare: [
				["I've got {pot} and that's it, really.", 'Honestly, just the one that matters, {pot}.', 'Only {pot}.'],
				['I made a couple more once and they are sitting there with nothing in them.', 'I know I can have more. I just never have.', "One's enough for what I do.", '']
			],
			never: [
				["I don't really use pots.", "Pots aren't really my thing.", 'Not much to say there.'],
				["There's one with about forty quid in it from when I first opened the account.", 'I keep my savings with another bank, so pots do not do much for me.', "I'd forgotten they were there, to be honest."]
			]
		},
		more: [
			{ ask: ['Do you ever take money out of a pot early?', 'What happens when you need money from a pot before you planned?'], core: ['Out of {pot}? Never. Out of {pot2}, all the time, but that is what it is for.', 'Once, when the boiler went. I hated it. I put it back over two months.', 'I try not to. If I do, I write myself a note in the pot name, like "{pot} (owe 50)", so I remember to put it back.'], used: ['Sometimes. More often than I should.', "Now and then. It's my money, after all.", 'If I have to. I do not feel guilty about it.'] },
			{ ask: ['Do you use goals on your pots?', 'Have you set goals on any of them?'], core: ["On {pot}, yes. I like the bar filling up. The others don't have goals, they're just buckets.", 'I set one on {pot} and then kept moving it up when I got close, which probably defeats the point.', 'Every single one. If it has no goal I forget why it exists.'], used: ['On {pot}, yes. Not the others.', 'I tried. The number stressed me out, so I took it off.', 'One, I think.'] },
			{ ask: ['How do you name your pots?', 'Where do the pot names come from?'], core: ["Mostly what they're for. {pot} is {pot}. One is called Do Not Touch.", 'I give them silly names so I like opening them. {pot} is the boring exception.', '{partner} named half of them, so some are jokes I no longer understand.'], used: ["Just what they're for.", 'Plainly. {pot} is {pot}.', "I didn't think about it much."] },
			{ ask: ['Do you look at the pots on the home screen or open each one?', 'How do you check on your pots?'], core: ['I open each one. I like seeing the history of what went in.', 'The home screen totals are enough most days. On payday I open them all.', 'I check {pot} every day and the rest on payday.'], used: ['Home screen, mostly.', 'I open them when I move money.', 'Not often.'] },
			{ ask: ['What would happen if you only had one pot?', 'Imagine you could only have one pot. What changes?'], core: ["I'd go back to a spreadsheet, honestly, and I'd stop keeping it up within a month.", "I'd have to open savings accounts somewhere else for each thing, which is what I used to do, and it was a mess.", 'One pot would be {pot}, and everything else would blur back into my balance.'], used: ["It'd be {pot}. I'd manage, but I'd miss {pot2}.", "I'd cope. I'd just be less tidy about it.", "It would be annoying for a while. I'd get used to it."] }
		]
	},
	split: {
		ask: ['What about splitting bills? Do you use that?', 'How about bill splitting?', 'Do you split things in the app?', 'When you pay for something you share, do you split it in Pennyjar?', 'Tell me about splitting, if you use it.'],
		answer: {
			core: [
				["All the time. {split}, and anything else we share.", "That's the big one for me. {split}, mostly, and then random things like takeaways.", 'Yes, constantly. {split}, plus whenever a group of us goes out.', 'Every week. {split} is the regular one.'],
				["I pay, I split it from the payment, and everyone gets a request. I can see who's paid and who hasn't without having to ask.", 'I tap the payment, choose Split, pick who it is with, and that is it. They pay me back by bank transfer.', 'The bit I like is that it sits on the payment itself, so three weeks later I can still see that {friend} owes me for it.', 'It remembers who I split with last time, so for {split} it is two taps.'],
				['It has taken the awkwardness out of it. Nobody has to be the one who chases.', "{friend} used to forget every single month. Now the app reminds them, not me, which has saved our friendship. I'm only half joking.", "It means I'm not the person going round with a notebook. I was that person for years.", ''],
				['Before, we had a group chat and a spreadsheet, and the spreadsheet was always out of date.', 'We used to round things off, and someone always ended up out of pocket, usually me.', '']
			],
			used: [
				["Sometimes, when I'm out with friends and I've paid for the table.", "I've done it a fair few times, mostly for {split}.", 'Now and then. {split}, when it comes up.'],
				['Not every month.', "It works. I just don't need it that often.", "It's useful when I need it."]
			],
			rare: [["I've tried it once, for a birthday meal. It was fine, I just don't need it much.", 'Once or twice. Most of my friends just take turns paying.', "I know it's there. I've used it maybe twice.", 'Hardly. I did it for a leaving present at work once.']],
			never: [
				['No.', 'Never used it.', 'Not really, no.'],
				["I'd feel strange sending my friends a payment request, if I'm honest. We just take turns.", "I didn't know it was a Plus thing, actually.", 'Whoever pays, pays. It evens out in the end.']
			]
		},
		more: [
			{ ask: ['Does everyone you split with have Pennyjar?', 'Are the people you split with on Pennyjar too?'], core: ['No, only {friend}. The others get the link and pay by transfer, which works fine.', 'About half. The ones without it still get a request. It just opens in the browser.', 'None of them, actually. They just get the link.'], used: ['A couple of them do.', 'Not really. They get a link.', "I'm not sure. It works either way."] },
			{ ask: ['Do you ever split unevenly?', 'Is it always equal shares?'], core: ['Yes. For {split} we go by income, so I change the amounts. It remembers the last split, which helps.', 'Not really, we keep it equal to avoid arguments.', 'Sometimes, when someone was not there for part of it. It is a bit fiddly on the phone, but it works.'], used: ["Equal. Life's too short.", 'Once, I think.', 'Usually equal.'] },
			{ ask: ['How do people react when they get a request from you?', 'What do the people you split with think of it?'], core: ["They're used to it now. At first {friend} thought it was a bit much.", "Nobody minds. It's less awkward than me asking in person.", 'A couple of them said it was a relief, because they never knew what they owed.'], used: ['Fine, as far as I know.', 'Nobody has complained.', "They pay, so I assume they're happy."] },
			{ ask: ['Have you ever been on the other end, paying someone else back?', 'Do people split things with you as well?'], core: ['Yes, {friend} sends me requests too. I pay them straight from the link.', 'Now and then. It is nice to be the one who pays quickly for once.', 'All the time. It goes both ways.'], used: ['Once or twice.', 'Rarely.', 'I think so, yes.'] },
			{ ask: ['What would you do if you could not split in the app?', 'Imagine splitting went away tomorrow. What would you do?'], core: ['Go back to chasing people, and I would rather not.', "We'd have to go back to the spreadsheet, and I don't think any of us would keep it up.", "Honestly, I'd probably end up paying for more than my share without noticing."], used: ['Ask people to send me money, like before.', 'Bank transfers and a bit of nagging.', "I'd manage. It'd be more messages."] }
		]
	},
	cats: {
		ask: ['And categories. Have you made any of your own?', 'Do you use the custom categories?', 'Have you made any categories of your own?', 'What about your own categories? Have you set any up?', 'Can we look at categories for a minute? Have you made your own?'],
		answer: {
			core: [
				['Loads. {cat}, {cat2}, and a couple of others.', 'Yes. {cat} is the important one. Then {cat2}, and a couple of others I made for one-off things.', "I've got about {n} of my own. {cat} and {cat2} are the ones I actually look at.", 'Quite a few. {cat} first, then {cat2}.'],
				['The built-in ones are fine for most people, but they lump things together. {cat} would just disappear into Shopping.', "I need to see exactly what goes on {cat}, because that's the bit I'm trying to keep a lid on.", "The standard ones don't match how my life works. Nobody else needs a {cat} category, but I do."],
				['When I move a payment from a shop into {cat}, it remembers, so next time it is already there.', 'I go through the week on a Sunday and move anything that landed in the wrong place. It takes a couple of minutes now it has learnt.', 'I set a budget on {cat} as well, which is the bit that actually changes what I do.'],
				["It's the reason I trust the numbers. When the categories are mine, I believe them.", "Without them the monthly summary would be mostly General, which tells me nothing.", 'This is the nerdy bit I love, honestly.', '']
			],
			used: [
				['A couple. {cat}, mainly.', 'Yes, one or two. {cat} is useful.', 'Just {cat} and {cat2}.'],
				['The rest I leave as they come.', "I wouldn't say I'm obsessive about it.", 'They do the job.']
			],
			rare: [["I made one once, I think it was {cat}. I haven't looked at it since.", 'There is one, {cat}, but I never really kept it up.', 'Barely. The ones it comes with are close enough for me.', "One, {cat}. I'd forgotten about it until now."]],
			never: [
				['No.', "I haven't, no.", 'Not really.'],
				["I didn't know you could.", 'I just look at the totals, not the categories.', 'The standard ones are fine for me.']
			]
		},
		more: [
			{ ask: ['Do you budget on your own categories?', 'Are there budgets on any of them?'], core: ['Yes, {cat} has a budget and it goes amber when I get close, which is about the third week every month.', 'Only on {cat}. The others are just for knowing.', 'All of them. That is the point, for me.'], used: ['Not yet. I keep meaning to.', 'On {cat}, I think.', 'No, they are just for looking.'] },
			{ ask: ['How did you decide what to make a category?', 'Where did your categories come from?'], core: ["Anything I argued with myself about. If I wasn't sure whether something was worth it, it got its own category so I could see.", "Somebody asked how much I spend on {cat} and I couldn't answer, so I made one.", 'I copied what I had in my old spreadsheet, more or less.'], used: ['I just made {cat} one day.', 'Trial and error.', 'They came up as I went.'] },
			{ ask: ['How often do you tidy up the categories?', 'Do you go back and move payments around?'], core: ['Every Sunday, five minutes.', 'Whenever something lands in General. It bothers me.', 'Once a month, when the summary comes, I check that the big ones are right.'], used: ['Hardly ever.', 'When I notice something odd.', 'Now and then.'] },
			{ ask: ["What would you lose if you couldn't have your own categories?", 'Imagine the custom categories went. What would that mean?'], core: ["The whole picture. {cat} would vanish into Shopping and I'd be guessing again.", "I'd stop trusting the budgets. They only work because the categories are mine.", "Most of what I look at, honestly. I'd be left with the totals."], used: ["I'd miss {cat} a bit.", 'Not a lot. A bit of detail.', "I'd be fine, mostly."] }
		]
	}
};

/** The answer of someone who got Plus for a feature and then barely used it. */
const lapsed: Record<Feature, string[]> = {
	pots: ["I made a few when I upgraded. Now there's {pot}, and the rest are sitting there with nothing in them.", 'Fewer than you would think. I made a lot at the start and let them go. {pot} is the only one with money in.'],
	split: ['That was the plan when I upgraded. In the end I have used it a handful of times.', 'I thought I would use it all the time. I did it twice, for {split}, and then life changed.'],
	cats: ['I made a few when I upgraded, {cat} and a couple of others, and then never kept them up.', "There's {cat}, from when I first upgraded. I stopped bothering after a month or two."]
};

// The free parts of the app: budgets, notifications, the monthly summary email and the card.
/** A free part of the app: the question, whole answers, and follow-ups asked only after an answer marked `true`. */
const freeBlocks: { ask: string[]; answer: [string, boolean][]; more: [string, string[]][] }[] = [
	{
		ask: ['Do you use the budgets?', 'Do you use budgets much?', 'Are budgets part of how you do things?'],
		answer: [
			["I've got budgets on food, going out and transport. They're the thing I look at most days, if I'm honest.", true],
			['Budgets are why I joined, really. Seeing the bar go down as I spend is the only thing that stops me.', true],
			['I set them once and mostly leave them, apart from groceries. Food is the one I go over, every month, without fail.', true],
			['I have one for nearly every category. I like the little bars.', true],
			['Not really. I tried them for a month and found them a bit stressful.', false],
			['Food, transport and going out. Going out is the one that teaches me things about myself.', true],
			["I've got six. Groceries is the only one I really watch, the others are more of a guide.", true],
			['They are how I plan the month. I set them on payday and check them most evenings.', true],
			['For the things I overspend on, which is food and clothes. The rest I leave alone.', true],
			["I don't really. I know roughly what I spend, and the budgets made me feel guilty.", false]
		],
		more: [
			['Do you ever change them?', ['Every couple of months, under Budgets, when something changes.', 'When the energy bill moved, yes.', 'Rarely. I set them in January and live with them.', 'Every payday, a little. It depends what is coming up.', 'Only when I have gone over three months running and have to admit it.']],
			['What happens when you go over?', ['I take it from another budget. Going out usually pays for food.', 'Nothing, really. I just feel bad and try harder the next month.', "I stop. If the food budget is gone, it's beans until payday.", 'I look at what pushed it over, and usually it was one weekend.', 'It goes red, I sulk, I carry on.']]
		]
	},
	{
		ask: ['Do you have notifications on?', 'What about notifications? Do you have them on?', 'Do you keep the payment notifications on?'],
		answer: [
			['For every payment, yes. I like knowing straight away.', true],
			['Yes, all of them. It felt like being told off at first. Now it is just normal.', true],
			["Only for payments, not the tips. They've caught a couple of payments I didn't recognise, which was useful.", true],
			['For every payment. {partner} can hear my phone buzz in the shop and gives me a look.', true],
			['I turned them off for a while, then turned them back on. I missed knowing.', false],
			["Yes, every single one. It's like a running commentary on my day.", true],
			['Yes. The one when money comes in is the best one.', true],
			["Payments only. And I've turned the sound off, so it's just a buzz.", true],
			['No, I have most notifications off on my phone. I check the app instead.', false]
		],
		more: [['Have you ever turned them off?', ['Once, on holiday. I missed them.', 'No, never.', 'The tips, yes. The payments, never.', 'For about a day, then I felt blind.', 'At night, with the phone on do not disturb. Otherwise no.']]]
	},
	{
		ask: ['Do you read the monthly summary email?', 'Do you read the summary email on the 1st?', 'Does the email on the 1st get read?'],
		answer: [
			["Yes, on the 1st, usually in bed. It's a nice little reckoning.", true],
			['I glance at it. The total is the bit I look at.', true],
			['Every month, yes. I forward it to {partner} sometimes, when it is a good month.', true],
			['I like seeing the breakdown by category, then I open the app for the detail.', true],
			['Not really, I look in the app instead.', false],
			['I read it with a coffee on the 1st and then forget about it.', true],
			["Mostly. It's the one email from a bank I actually open.", true],
			["It's how I start the month, really. I look at it before I set the new budgets.", true],
			['It goes in a folder. I keep meaning to read them.', false]
		],
		more: [['What do you look at first in it?', ["The total. Then whether it's better than last month.", "The biggest category. It's always food.", 'I scroll straight to the bottom to see what I saved.', 'Eating out, to see how bad it was.', 'The comparison with last month, if I can find it.']]]
	},
	{
		ask: ['How do you mostly pay for things?', 'Card or phone?', 'When you are out, how do you pay?'],
		answer: [
			['Phone, almost always. The virtual card is on my watch too.', true],
			["Apple Pay, mostly. I've only used the plastic card a handful of times since it came.", true],
			['Google Pay on my phone. The physical card only comes out when a machine does not like the phone.', true],
			['The card. I am old-fashioned. I like having something in my hand.', false],
			['Phone for small things, card for anything big, which is silly but it feels safer.', true],
			['Contactless with the card, mostly. My phone is always on low battery.', false],
			["Watch, if I'm honest. I barely take my phone out.", true],
			["Mostly the phone, except at the market, where it's cash.", true]
		],
		more: [['Do you use the virtual card?', ['All the time, on my phone.', 'Only online, for shopping.', "I didn't know I had one.", 'For anything online, so the real card number never goes anywhere.', 'It is the one on my watch, so yes.']]]
	}
];

// Problems a participant raises. `live` problems are still happening and the interviewer offers to pass them on;
// `sorted` ones were dealt with by support earlier; `cleared` ones are cleared up during the session.
interface Problem {
	/** The feature the problem is about; the participant must use it, or for `one`, have at least one pot. */
	needs?: Feature;
	one?: boolean;
	team: string;
	tell: string[];
	/** Questions and the answers to them, paired by position. */
	probe: string[];
	detail: string[];
	live?: string[];
	sorted?: string[];
	cleared?: [string, string][];
}
const problems: Problem[] = [
	{
		needs: 'split',
		team: 'the team that looks after splitting',
		tell: ["There's one thing that annoys me. When {friend} pays me back, the split still says {friend} owes me, sometimes for days.", "Can I mention something? Splits don't always clear. Someone pays and the app still shows them as owing."],
		probe: ['How often does that happen?', 'When did you last see it?'],
		detail: ["Maybe one split in five, usually with the same person. The money's arrived, I can see it in my balance, but the split doesn't tick over.", "Last week. It was {friend}'s share of {split}. I saw the transfer on {friend}'s phone, so I know it was paid."],
		live: ["That's useful, thank you. Would it be OK if I passed this to {team}, with your name, so they can look at that payment? Someone would contact you.", "Thanks. I've written down the date. I'll send it to {team} today and ask them to get in touch with you about it."],
		sorted: ["It's been fine since the last update, to be fair. I haven't seen it for a month.", 'I told support in the summer and they sorted it out within a day. It has not happened since.']
	},
	{
		needs: 'split',
		team: 'the team that looks after splitting',
		tell: ["My flatmates who don't have Pennyjar sometimes can't open the link. It just spins.", "The link I send for a split doesn't always open for people. {friend} has given up and just transfers me."],
		probe: ['What kind of phone do they have?', 'Do you know what they see?'],
		detail: ["Android, I think. {friend} sent me a screenshot. It's a white page with the little circle going round.", 'They say it opens a page and then nothing. It works for the ones with Pennyjar.'],
		live: ["Thank you. If {friend} doesn't mind, could you send me that screenshot after this? I'll pass it to {team} with your details so they can follow it up with you.", "That's really helpful. I'll pass it to {team} straight after this, and they'll contact you."],
		cleared: [["Does {friend} have the Pennyjar app installed, maybe an old version? The link tries to open the app if it's there, and very old versions don't know what to do with it.", "Oh. {friend} had it once and never used it. That'll be it. I'll pass that on."]]
	},
	{
		needs: 'split',
		team: 'the team that looks after splitting',
		tell: ['When I change the amounts on a split, sometimes it goes back to equal shares when I press send.', 'Uneven splits are a bit unreliable for me. The amounts I type in sometimes get reset.'],
		probe: ['Has it happened recently?', 'How often does it happen?'],
		detail: ['Last Tuesday. I did {split}, typed in the amounts, pressed send, and everyone got an equal share. I had to delete it and start again.', 'Two or three times this month. Usually when I change the amounts quickly, one after the other.'],
		live: ["Thanks for walking me through that. Would you be happy for me to send this to {team}, with your name? They'd want to look at those splits with you.", "I'll write that up for {team} today. Is it OK if someone from there gets in touch to see the splits?"],
		sorted: ['I mentioned it to support and they said it was fixed in an update. It has been fine since.']
	},
	{
		needs: 'cats',
		team: 'the categories team',
		tell: ["The categories don't always remember. I move a shop into {cat} and next week it's back where it was.", 'There is one shop that keeps going back to Shopping however many times I put it in {cat}.'],
		probe: ['Which shop is it?', 'How many times have you moved it?'],
		detail: ['A chain, but only the branch near work goes back. The one near home stays in {cat}.', 'At least ten times. I counted, because it was driving me mad.'],
		live: ["That's a good catch. Would it be all right if I passed your account to the categories team so they can see what's happening with that shop? They'd contact you.", "Thanks. I'll pass that to the categories team today, and they'll get back to you about that shop."],
		cleared: [["When you move it, there's a choice at the bottom between just this payment and every payment from that shop. Could you try the second one?", "Oh. I've been pressing the first one. That's embarrassing. I'll try that."], ["Can I check how you move it? If you change it from the payment, there's a switch for all future payments from the same place.", "I didn't know about the switch. That's probably it, then."]]
	},
	{
		needs: 'cats',
		team: 'the categories team',
		tell: ['My budget on {cat} never seems to add up. It says I have spent less than I know I have.', "The amber warning on {cat} didn't come this month, and I was well over."],
		probe: ['How far out is it?', 'Have you compared it with the payments?'],
		detail: ['About forty pounds this month. I added up the payments in {cat} myself and they come to more than the budget says.', "Yes, the payments in the category add up to more than the bar shows. It's like a couple of them don't count."],
		live: ["Thank you, that's really specific. Would you be OK with me passing this to the categories team with your details? Someone would get in touch to look at it with you.", "That's worth looking at properly. I'll pass it to the categories team today, with your name, and they'll be in touch."]
	},
	{
		needs: 'pots',
		one: true,
		team: 'the pots team',
		tell: ['The goal bar on {pot} shows it as nearly full, but I know it is not.', 'There is something odd with my goal on {pot}. The percentage is wrong.'],
		probe: ['What does it say?', 'When did you notice?'],
		detail: ["It says ninety-something percent, but I've only got about half. I think it counts money I moved out as well as in.", 'A few weeks ago, after I took some out for the car. The bar did not go back down.'],
		live: ["That's helpful, thanks. Can I pass this to the pots team with your name, so they can look at {pot}? They'd contact you.", "I'll share that with the pots team today and ask them to get in touch with you."],
		sorted: ['Support looked at it when I messaged. It was right again the next day.', "It's fixed now. I told support and it went back to the right number."]
	},
	{
		needs: 'pots',
		team: 'the pots team',
		tell: ['When I renamed a pot, all its history went. The money was fine, but the list of what went in and out disappeared.', 'I renamed {pot2} last month and lost the history of it.'],
		probe: ['Did the history come back?', 'Did you need it for anything?'],
		detail: ["No, it's still gone. I wanted it because I was working out how much I'd put in over the year.", 'I wanted to see when I had started saving. Now it looks like the pot was born last month.'],
		live: ["Thanks. Would it be OK if I passed this to the pots team so they can see whether that history can be brought back? They'd contact you.", "That's a good one to know about. I'll send it to the pots team today with your name."],
		sorted: ['Support got it back for me in the end. It took them a day.']
	},
	{
		needs: 'pots',
		one: true,
		team: 'the pots team',
		tell: ["When I move money out of a pot, my balance doesn't change straight away.", "Moving money out of {pot} sometimes looks like it hasn't worked."],
		probe: ['How long does it take?', 'What do you see?'],
		detail: ['A minute or two. Long enough that I sometimes do it twice.', 'The pot goes down, but the balance on the home screen stays the same until I close the app.'],
		cleared: [["If you pull down on the home screen, it refreshes the balance straight away. The move itself happens at once.", "Pull down. Right. I'll remember that."], ["The money moves instantly, it's just the home screen that's slow to catch up. Pulling down on it refreshes it.", "So it's just the screen. That's fine, then."]],
		sorted: ['I asked support about it. They explained it was just the screen and the money had moved.']
	},
	{
		team: 'the team that looks after notifications',
		tell: ['The notifications sometimes come late, which rather defeats the point.', 'Every so often a payment notification comes an hour after I have paid.'],
		probe: ['How late?', 'Is it every payment?'],
		detail: ['Last Saturday I paid for lunch and the notification came when I was home. That is two hours.', 'Not every one. Maybe once a week. Usually with contactless on the bus.'],
		live: ["Thanks. Would it be all right to pass this to the team that looks after notifications, with your name? They might want to check your phone settings with you.", "I'll pass that on to the team that looks after notifications, and they'll get in touch if they need anything."],
		sorted: ['Support told me to turn off battery saving for the app, and it has been fine since.']
	},
	{
		team: 'the app team',
		tell: ["The widget on my home screen shows yesterday's balance until I open the app.", "The balance widget doesn't update. It's always a day behind."],
		probe: ['Which phone have you got?', 'Has it always done that?'],
		detail: ['An iPhone, a couple of years old. It started after the last update.', 'Since I got a new phone in September.'],
		live: ["That's helpful. Can I pass this to the app team with your details? They'd get in touch if they need more.", "Thanks. I'll send it to the app team today and they'll contact you."],
		cleared: [["Do you have background refresh turned on for Pennyjar? Without it the widget only updates when the app opens.", "Ah, I turned that off for everything to save battery. I'll turn it back on for this."]]
	},
	{
		team: 'the app team',
		tell: ['Face ID stopped working for the app. I have to type the passcode every time.', 'Since the last update I have to put in my passcode every time instead of using my face.'],
		probe: ['Does Face ID work for other apps?', 'Have you tried turning it off and on in the settings?'],
		detail: ['Yes, everything else is fine. It is just Pennyjar.', 'I tried that. It works once and then goes back to the passcode.'],
		live: ["Thanks. Would you be happy for me to pass this to the app team so they can follow it up with you?", "I'll pass that to the app team after this. Someone will be in touch."],
		sorted: ['Support told me to reinstall the app. That sorted it.']
	},
	{
		team: 'support',
		tell: ['When I lost my card it took a while for the new one to come.', 'The only real problem I have had was a card that did not turn up.'],
		probe: ['What happened?', 'How did you get on without it?'],
		detail: ['It was over a week, so I messaged support. They froze the old one and sent another, and that came in two days.', 'I used the virtual card on my phone in the meantime, so it was not a disaster.'],
		sorted: ["Support sorted it in the end, and I've had no trouble since.", 'It was fine once I messaged. They were quick.']
	},
	{
		team: 'support',
		tell: ['When I moved house, the photo of my bill would not upload.', 'Changing my address was a bit of a palaver.'],
		probe: ['What happened in the end?', 'How did it get sorted?'],
		detail: ['It failed three times in the app. I replied to the support email with the photo attached instead.', 'The photo kept failing. In the end support did it for me by email, within the day.'],
		sorted: ['It was done the same day, in the end.', 'Fine now. The new address is on everything.']
	},
	{
		team: 'the app team',
		tell: ['I tried to download my statements and the file had no payments on it.', 'The statement I downloaded for last month was blank apart from the heading.'],
		probe: ['Which month was it?', 'Did you try again?'],
		detail: ['September. I needed it for a letting agent. I tried three times on my phone and once on my laptop.', 'Yes, twice. Same thing. The balance is on it but the list of payments is empty.'],
		live: ["That's important, thanks. Would it be OK if I passed this to the app team with your name, so they can look at it quickly? They'd contact you directly.", "I'll send that to the app team straight after this call and ask them to get in touch with you today or tomorrow."]
	},
	{
		team: 'the team that looks after the monthly summary',
		tell: ['The monthly summary in October had a funny total. I think it was September again.', "The summary email on the 1st didn't match the app last month."],
		probe: ['Do you still have the email?', 'How far out was it?'],
		detail: ['Yes, I kept it because I was going to ask. It says one total and the app says another, about eighty pounds apart.', 'I think it missed the last two days of the month.'],
		live: ["Could you forward that email to me after this? I'll pass it to the team that looks after the summary, with your name, and they'll contact you.", "Thanks. I'll pass that to the team that looks after the summary email today, and they'll be in touch."],
		sorted: ['November was fine, so I let it go.']
	},
	{
		team: 'the app team',
		tell: ['In dark mode, the text on the budgets screen is very hard to read.', 'I use dark mode, and some of the budget amounts are grey on black.'],
		probe: ['Which bit, exactly?', 'Can you show me?'],
		detail: ["The amount left on each budget. It's dark grey on black. I have to tilt the phone.", 'The remaining amount under each bar. In daylight I cannot read it at all.'],
		live: ["That's really useful. Can I pass a screenshot of that to the app team, with your name? They might want to follow up with you.", "Thanks for showing me. I'll take that to the app team today and they'll get back to you."]
	},
	{
		team: 'the app team',
		tell: ['I use large text on my phone, and the pot names get cut off.', 'With the bigger text setting on, half the screen is cut off in places.'],
		probe: ['Where does it happen?', 'Could you show me?'],
		detail: ['On the pots screen and on the budgets. I can only see the first few letters of each name.', 'The payment list is fine. Pots and budgets are the ones that get cut off.'],
		live: ["Thank you, that matters. Would it be OK to pass this to the app team with your name, so they can look at it with you?", "I'll send this to the app team today. Is it all right if they contact you to see your settings?"]
	},
	{
		team: 'the app team',
		tell: ["I'm colour-blind, and I can't tell the amber on the budgets from the green.", 'The budget colours all look the same to me.'],
		probe: ['What do you go by instead?', 'How do you manage?'],
		detail: ['The numbers. I have to read the amount left on every budget because the colour tells me nothing.', 'I read the numbers. The colours might as well not be there.'],
		live: ["That's really helpful. Would you be happy for me to pass this to the app team, with your details?", "Thanks for telling me. I'll pass it to the app team and they might get in touch to ask more."]
	}
];

// Questions a participant asks the interviewer. `owed`: the interviewer promises to come back to them;
// `answered`: the interviewer answers there and then.
interface Ask {
	ask: string[];
	owed?: [string, string][];
	answered?: [string, string][];
}
const asks: Ask[] = [
	{ ask: ['Can {partner} see my pots? We would love one we both pay into.', 'Is there a way to share a pot with {partner}?'], owed: [["I'm honestly not sure what's possible at the moment. Let me check with the pots team and email you this week.", 'Brilliant, thanks.']], answered: [["Not at the moment. Pots belong to one account. A lot of couples do what you do and keep one each.", "OK. We'll keep doing it our way, then."]] },
	{ ask: ['Where do I get statements from? Someone wants three months of them.', 'How do I get statements out of the app?'], owed: [["I don't want to send you to the wrong place, so I'll check and email you the steps today.", 'Thanks, that would help.']] },
	{ ask: ["Oh, the voucher. I don't think it came.", "Before you go, I never got the voucher email."], owed: [["I'll ask {NT} to resend it after the call. Have a look in your spam folder as well.", 'Will do. Thanks.'], ["I'll resend it as soon as we finish. It should come within the hour.", 'Great, thanks.']] },
	{ ask: ['Can I do more of these?', 'If you do more of these, I would happily come back.'], owed: [["I'll add you to our research panel, and we'll get in touch for the next round.", 'Lovely.'], ["Thank you. I'll put your name on the panel, so you'll hear from us next time.", 'Great.']] },
	{ ask: ['Is there a guide to the custom categories? I feel like I use half of it.', "Is there somewhere I can read about all the features? I'm sure I'm missing things."], owed: [["There's a help article. I'll email you the link after this.", 'Perfect.'], ["I'll send you a couple of links from the help centre after the call.", 'Thank you.']] },
	{ ask: ["My mum wants an account but she hasn't got a smartphone. Can she?", 'Can someone open an account without a smartphone? Asking for my dad.'], owed: [["Good question. I'll find out and let you know by email.", 'Thanks.']] },
	{ ask: ['I got married in the summer. How do I change my name on everything?', 'I need to change my surname on the account. Where do I start?'], owed: [["I'll pass that to support and they'll get in touch with the steps.", 'That would be great.']] },
	{ ask: ['Is there any way to get my categories out into a spreadsheet?', 'Can I export everything to a spreadsheet?'], owed: [["I'll check whether that's possible and get back to you.", 'Thanks.']], answered: [["Not from the app itself at the moment. You can download statements, but not the categories.", "Fair enough. I'll keep copying them across."]] },
	{ ask: ['Could the monthly summary come on my payday instead of the 1st?', 'Can I choose when the summary email comes?'], answered: [["Not at the moment. It goes out on the 1st for everyone. I've noted that you'd like it on payday.", 'OK. It was just a thought.']] },
	{ ask: ['Can the budgets start on my payday instead of the 1st?', 'Is there a way to make the budget month run from payday?'], answered: [["Not at the moment. Budgets run on calendar months. You're not the first person to ask.", 'Good, so maybe one day.']] }
];

// Wishes, noted without a promise.
const wishes = [
	'Being able to reorder the pots. The one I use most is right at the bottom.',
	'Pots with a date as well as a goal, so it tells me how much a month I need to put in.',
	'Seeing my credit card from the other bank in here as well, so it is all in one place.',
	'A calendar of bills, so I can see which days of the month are heavy.',
	"Notes on payments. Sometimes I can't remember what something was.",
	'Attaching a photo of a receipt to a payment.',
	'Splitting one payment across two categories, like a supermarket shop that is half food and half household.',
	'Budgets that roll over, so if I am under one month I get the difference the next.',
	'A heads-up when a direct debit is bigger than last time.',
	'A year view. Everything is monthly, and sometimes I want to see the whole year.',
	'Paying someone back straight from the split request they sent me, without typing in the details.',
	'A watch app with just the budgets on it.',
	'Rounding up payments into a pot. Spend £2.40 and the 60p goes into savings.',
	'A pot that {partner} and I could both see.',
	'Being able to pause a budget for a month when I am away.',
	'Little icons for my own categories, so I can find them faster.'
];
const wishAsks = ['If you could change one thing in the app, what would it be?', 'Is there anything you wish it did?', "What's missing, for you?", 'If you had a magic wand, what would you add?'];
const wishAcks = ["Thanks, I've written that down.", "That's a good one.", 'Noted. That is really clear.', "Thank you, that's useful to hear.", "I've got that."];

const asides = [
	"*[The participant's doorbell rings; back after a minute.]*",
	'*[A dog barks in the background for a while.]*',
	'*[The call drops for about thirty seconds and reconnects.]*',
	'*[A child asks the participant something; short pause.]*',
	'*[{name} shares their phone screen.]*',
	'*[{name} opens the app to check.]*',
	'*[Background noise from a kitchen; {name} moves to another room.]*'
];
const probes = ["That's interesting.", 'Got it.', 'Thanks.', 'OK.', 'Right.', 'That makes sense.', 'Great.', 'I see.', 'Lovely.', 'Thank you.', 'Fair enough.', 'Mm.', '', '', '', '', ''];
const troubleAsks = ['Has anything in the app given you trouble?', 'Is there anything that annoys you about the app?', "Anything that hasn't worked the way you expected?", 'Have you had any problems with it?', 'What about the bits that frustrate you?', 'Is there anything that gets in your way?'];
const sortedAsks = ['Where did that end up?', 'Did it get sorted?', 'And how is it now?', 'What happened in the end?'];
const digressions = [
	"My mum would laugh at me doing this. She's never budgeted in her life.",
	"I sound very organised. I promise I'm not like this about anything else.",
	"{partner} thinks it's hilarious how much I look at the app.",
	"It's funny, I never thought I'd be someone who enjoyed this stuff.",
	"Ten years ago I wouldn't have believed you if you'd told me I'd be doing this.",
	'This is the most I have talked about money with anyone, ever.',
	"I'm aware I'm a bit of a nerd about it.",
	"Anyway. That's probably more than you needed."
];

// Shared sections, each asked in some interviews.
const payments = ['the big shop at Tesco', 'Lidl on Tuesday', 'a meal deal at lunch', 'the bus', 'petrol', 'a coffee on the way in', 'the gym', 'a takeaway on Friday', 'a train ticket', 'the chemist', 'a paperback', 'a birthday card', 'parking in town', 'my phone bill', 'a haircut', 'something from Amazon', 'the window cleaner', 'two cinema tickets', 'a pub lunch', 'a charity shop jumper', 'the launderette', "Sainsbury's on the way home", 'a bacon roll', 'a present for my nephew', 'the dentist', 'a round of drinks', 'a pizza', 'the swimming pool', 'a new phone case', 'the market on Saturday'];
const weekAsks = ['Could you open your payments from the last week and talk me through them?', "Would you mind scrolling through last week's payments and telling me what you see?", "Can we look at the last few days of payments together? Just read me what's there."];
const weekOpens = ['Let me find it. OK.', 'Right, here we go.', 'Hang on. Yes.', 'Give me a second. OK, last week.'];
const weekCloses = ['Pretty normal week, really.', 'Not a very exciting week.', 'That all looks about right.', "Hmm, I'd forgotten about some of those.", 'That is a quiet one for me.', 'And that is about it.', 'Then a couple of small things.', 'Nothing unusual.', 'That is most of it.'];
const weekProbes = ["Anything there you didn't expect?", 'Does any of that surprise you?', 'Is that a typical week?'];
/** Answers to the follow-up; one that names a payment fits only a week that has it. */
const weekAfters: [string, string?][] = [
	['Not really. The coffees add up, but I knew that.', 'a coffee on the way in'],
	['The Friday takeaway. Every week I say it will be the last.', 'a takeaway on Friday'],
	["Amazon. I don't even remember what that was.", 'something from Amazon'],
	["No. If anything it's lower than usual."],
	["It's typical. The weekends are where it goes."],
	['Only that it all looks so small one at a time.'],
	["Not really. It's the big monthly things that matter, not this."],
	["Not really. That's about what I'd have guessed."],
	['No, it was a boring week. I like boring weeks.'],
	["A little. It's more than I'd have said if you'd asked me before I looked."],
	['Not at all. I check it every day, so nothing surprises me any more.'],
	['Nothing big. The weekend will be worse.'],
	['The parking. I forget it costs anything.', 'parking in town'],
	['The pub lunch was meant to be my treat for the month. It was not the only one.', 'a pub lunch']
];
const otherAsks = ['Do you use any other banks or money apps?', 'Is Pennyjar your only account?', 'Where else does your money live?'];
const otherAnswers = [
	'Just a savings account with my old bank, which I never look at. I keep meaning to tidy that up.',
	'Just Pennyjar now. Everything moved over in one go.',
	"I keep a credit card with another bank for emergencies. It's habit more than anything.",
	'My ISA is somewhere else. Everything day to day is here.',
	'My old bank account is still open, because a couple of direct debits still go from it. One day I might move them over.',
	"There's a joint account at another bank for the house bills. Everything else is here.",
	'A pension, obviously, and some premium bonds my nan bought me. Day to day, just Pennyjar.',
	'I still have a building society account from when I was a kid, with about eleven pounds in it.'
];
const talkAsks = ['Who do you talk to about money?', 'Is money something you talk about with anyone?', 'Does anyone else see how you manage your money?'];
const talkAnswers = [
	'{partner}, mostly. We do a little check-in on Sundays, ten minutes with a cup of tea.',
	'My mum, weirdly. She has never used an app in her life, but she is very good with money.',
	"Nobody, really. It's a private thing for me.",
	'A couple of friends at work. We swap tips, and moan.',
	"My sister. She's the one who got me into budgeting in the first place.",
	'My dad, when he asks, which is often. He still thinks I should keep cash in a tin.',
	"{friend}. We're both trying to save, so we keep each other honest.",
	"My brother. He's in finance and has opinions about everything I do.",
	'A group chat with my old school friends. Half of it is memes, half is complaining about rent.'
];
const discoverAsks = ['How did you find out what Plus has in it?', 'When you went on Plus, how did you work out what it gave you?', 'How did you learn your way around the Plus features?'];
const habitAsks = ['When do you usually open the app?', 'How often do you look at Pennyjar?', 'Is there a time of day when you check it?'];
const habitAnswers = ['After the kids are in bed, with a cup of tea.', 'On the loo, honestly. Most of my admin happens there.', 'First thing, in bed, before I have even looked at the news.', "On the bus to work. It's part of the routine now, like checking the weather.", 'Whenever I get a notification, so many times a day.', 'Sunday evenings, properly. The rest of the week I just glance.', 'At lunch, most days. Five minutes with a sandwich.', 'Less than I should. Maybe twice a week.', "Every time I buy something, if I'm honest.", 'Payday, and then whenever I feel nervous about money.'];
const firstAsks = ['What did you think when you first opened the app?', 'Do you remember your first impression?', 'How did the first week go?'];
const firstAnswers = ['I was surprised how quickly it worked out what everything was.', 'I loved the notifications from day one. That was the hook.', 'It felt cleaner than my old bank. Less going on.', 'I was a bit overwhelmed, honestly. Too many colours.', 'I liked that it put my spending into categories straight away without me doing anything.', "I didn't trust it at first. A bank on your phone felt odd. That lasted about a week.", 'I spent a whole evening just looking at where my money had gone. It was eye-opening.', 'I thought it was a bit childish, with the pots and the bars. Now I love the bars.'];
const nextAsks = ['Where would you like to be with money a year from now?', 'Looking ahead, what would a good year look like, money-wise?', "What's the next big thing you're working towards?"];
const discoverAnswers = ['Someone in a money group on Facebook posted a list of everything Plus does.', 'I found most of it by chance, pressing things.', 'Mostly by poking around after I upgraded.', '{friend} showed me the splitting before I had even upgraded.', 'The help pages, a bit, and trial and error.', "Honestly, I'm not sure I know everything that's in it.", 'There was a little tour when I upgraded. I skipped most of it, then went back later.', 'From friends, mainly. Nobody reads instructions.'];

// Openings and closings.
const intros = [
	"Thanks for making the time, {name}. I'm {I}, {role}, and {NT} is on the call taking notes. We're talking to people on Plus about how they use Pennyjar day to day. There are no right answers, and nothing you say changes anything on your account. Is it all right if we record?",
	"Hi {name}, good to meet you. I'm {I}. I'll ask the questions, and {NT} is here to write things down so I don't have to. It's about how you use the app, the Plus parts especially, and it's completely fine to say you don't use something. OK to record?",
	"Hello {name}. Thanks for signing up. My name's {I}, {role}, and {NT} is taking notes. We'd just like to hear how Pennyjar fits into your life. Can we record this? It only goes to the team."
];
const introsAlone = [
	"Thanks for making the time, {name}. I'm {I}, {role}. We're talking to people on Plus about how they use Pennyjar day to day. There are no right answers, and nothing you say changes your account. Is it all right if I record?",
	"Hi {name}. I'm {I}, {role}. It's just me today, so I'll be scribbling as we go. We want to hear how you use the app, the Plus parts especially. OK if I record?"
];
const consents = ['Yes, no problem at all.', "Of course. I've made a cup of tea specially.", "Fine by me. I'm in the car, parked, so it might be a bit echoey.", 'Yes, of course.', "That's fine, go ahead.", "Sure. I've never done one of these, so tell me if I go off on one.", "Yes. I hope I'm useful, I'm not very techy.", "No problem. I've got about forty minutes before the school run.", 'Yes, fine.', 'Go for it.'];
const aboutAsks = ['Great. To start, could you tell me a bit about yourself and how you handle money?', "Let's start easy. Who are you, and what does money look like in your house?", 'First, a bit about you. What do you do, who do you live with, that kind of thing?', 'Could you start by telling me a bit about yourself?'];
const startAsks = ['How did you end up with Pennyjar?', 'And how did you come to Pennyjar, and then to Plus?', 'Do you remember why you opened the account?', 'What brought you to Pennyjar in the first place?'];
const monthAsks = ['Can you walk me through a normal month, money-wise?', 'What happens with your money in a typical month? Start with payday, if that helps.', 'Talk me through a month. What comes in, what goes out, what do you do in the app?', 'What does an ordinary month look like?'];
const mainAsks = ['If you had to say what Pennyjar is for, in your life, what would it be?', "Big picture: what's the main job Pennyjar does for you?", 'Stepping back a bit. What do you mainly use Pennyjar for?', 'If a friend asked you why you use Pennyjar, what would you tell them?'];
const keepAsks = ['Last big one. If you could only keep one thing from Plus, what would it be?', 'Imagine you could keep just one of the Plus features. Which one?', 'If everything in Plus went except one thing, what would you want that one thing to be?'];
const keepAnswers: Record<Core, string[]> = {
	pots: ['The pots. Easily. Everything else is nice, but the pots are the system.', "Pots. If I only had one, I'd be back to guessing what's mine to spend.", 'Has to be the pots. {pot} alone makes the case.', "Pots. I didn't expect to say that, but yes."],
	split: ['Splitting. It is the one that saves me actual arguments.', 'The bill splitting, because of {split}. Nothing else comes close.', "Splitting, no hesitation. I'd be back to the notebook otherwise."],
	cats: ['My own categories. The rest I could live without.', 'Custom categories. Without {cat} the whole picture goes fuzzy.', "The categories. It's not glamorous, but it's the bit I rely on."],
	none: ["Honestly, I'm not sure I'd keep any of it. What I use every day is the budgets, and everyone gets those.", "Probably nothing. I've had Plus a while and I'm not sure I use any of the extra bits any more. It's the budgets that matter to me.", "That's a hard one, because I don't really use them. I'd miss {decoyName} for a week, maybe, and then forget."]
};
const keepWhyAsks = ['Why that one?', 'What makes it that one?', 'Why do you say that?'];
const keepWhy: Record<Core, string[]> = {
	pots: ['Because I can see at a glance what each bit of money is for.', "Because it's the only thing that has actually changed what I do with money.", 'Because the rest I could do on paper. The pots I could not.', 'Because without them my savings and my spending would be one number again.'],
	split: ['Because the money I am owed is real money, and I used to lose track of it.', 'Because it is the bit other people notice. It changes how things go with them, not just with me.', 'Because the alternative is me chasing people, and I am done with that.', 'Because I would use it even if nothing else in the app existed.'],
	cats: ['Because the totals finally match how I think about my money.', 'Because the categories are what make the rest believable.', 'Because everything else I look at is built on them.', "Because without them I'd just be looking at a big total and guessing."],
	none: ["I'm just not sure the extras are doing much for me at the moment.", "Because, honestly, I'd forgotten which bits were Plus until you asked.", "Because the things I use every day aren't the Plus ones.", 'I signed up for one thing and stopped using it. The rest I never really started.']
};
const keepTurns: Record<Feature, string[]> = {
	pots: ["It's funny, I said I got Plus for {decoyName}, but it's the pots. That's what I open the app for.", "I'd have said {decoyName} when we started, but talking it through, it's the pots. Without {pot} and {pot2} I'd be lost."],
	split: ["I came for {decoyName}, but it's the splitting I'd keep. I use it every week without thinking about it.", "Hmm. I'd have said {decoyName} at the start of this call, but it's splitting, isn't it? I've just spent ten minutes talking about {split}."],
	cats: ["I know I said {decoyName}, but it would be the categories. I didn't realise how much I lean on {cat} until you asked.", 'Thinking about it properly, the custom categories. I like {decoyName}, but the categories are what make the budgets make sense.']
};
const anyAsks = ["That's everything from me. Anything you want to ask me?", "Before we finish, is there anything you'd like to ask, or anything I should have asked?", "We're nearly out of time. Anything else on your mind?"];
const nothingElse = ['No, I think I have said plenty.', 'Not really. It was fun, thank you.', "No, I think that's it. It was nice to talk about it, actually.", 'Not really. Just keep the app simple, please.', "No, that's everything. Good luck with it all.", "I don't think so. I'll probably think of something in the shower later.", 'No, I think you covered it.'];
const thanks = ['Thanks so much, {name}. This has been really useful.', 'Brilliant. Thank you for your time, {name}.', 'Great, thank you. Enjoy the rest of your day.', "Thank you, {name}. That's us done."];
const byes = ['Thanks, bye.', "You're welcome. Bye!", 'Cheers. Bye now.', 'Bye!', 'No problem. Take care.'];
const yesPlease = ['Yes, please.', 'That would be great.', 'Sure, if it helps.', 'Yes, go ahead.', 'Please do. It drives me mad.'];

// Dates: weekdays between Tuesday 6 October and Friday 13 November 2026.
const EPOCH = Date.UTC(2026, 9, 6);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const days: Date[] = [];
for (let d = 0; d <= 38; d++) {
	const date = new Date(EPOCH + d * 86400000);
	if (date.getUTCDay() % 6 !== 0) days.push(date);
}
const slots = ['09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30'];
const longDate = (d: Date) => `${dayNames[d.getUTCDay()]} ${d.getUTCDate()} ${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (whole, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for ${whole} in: ${text}`);
		return value;
	});
/** Starts every sentence with a capital, for slots such as {split} that open one. */
const sentences = (text: string) => text.replace(/(^|[.!?] )([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
const compose = (r: Rand, parts: string[][]) => parts.map((part) => pick(r, part)).filter(Boolean).join(' ');

interface Plan {
	persona: Persona;
	number: number;
	date: Date;
	time: string;
	interviewer: (typeof interviewers)[number];
	noteTaker: string | null;
	name: string;
}

const interview = (index: number, plan: Plan): string => {
	const r = mulberry32(7000 + index * 7919);
	for (let i = 0; i < 4; i++) r(); // the first draws of neighbouring seeds are alike
	const p = plan.persona;
	const I = plan.interviewer.first;
	const NT = plan.noteTaker ? plan.noteTaker.split(' ')[0]! : I;

	// What this participant would keep, what they say they got Plus for, and how much they use each feature.
	const core = weighted<Core>(r, ['pots', 'split', 'cats', 'none'], p.keep);
	const att: Record<Feature, Att> = { pots: 'never', split: 'never', cats: 'never' };
	for (const f of features) {
		const floor = level[p.min?.[f] ?? 'never'];
		if (f === core) att[f] = 'core';
		else if (core === 'none') att[f] = floor >= 1 || chance(r, 0.55) ? 'rare' : 'never';
		else att[f] = weighted<Att>(r, ['used', 'rare', 'never'], [4, 3, 2]);
		if (level[att[f]] < floor) att[f] = p.min![f]!;
	}
	const decoy: Feature = core !== 'none' && chance(r, 0.5) ? core : pick(r, features.filter((f) => f !== core));
	if (att[decoy] === 'never') att[decoy] = 'rare';
	const uses = (f: Feature) => level[att[f]] >= 2;

	const pots = shuffle(r, p.pots);
	const pots2 = shuffle(r, p.pots2);
	const cats = shuffle(r, p.cats);
	const [friend, friend2] = some(r, friends, 2);
	const values: Record<string, string> = {
		name: plan.name,
		I,
		NT,
		role: plan.interviewer.role,
		partner: pick(r, partners),
		friend: friend!,
		friend2: friend2!,
		kid: pick(r, kids),
		town: pick(r, towns),
		pot: pots[0]!,
		pot2: pots2[0]!,
		pot3: pots2[1]!,
		cat: cats[0]!,
		cat2: cats[1]!,
		amt: (Math.round(int(r, p.amount[0], p.amount[1]) / 10) * 10).toLocaleString('en-GB'),
		n: pick(r, ['four', 'five', 'six', 'seven', 'eight', 'nine']),
		decoy: pick(r, decoyLines[decoy]),
		decoyName: pick(r, featureNames[decoy])
	};
	values.split = fill(pick(r, p.splits), values);
	const say = (text: string) => sentences(fill(text, values));
	// Shared lines that mention a partner suit only a persona whose own text has one.
	const hasPartner = JSON.stringify(p).includes('{partner}');
	const fits = (text: string) => hasPartner || !text.includes('{partner}');
	const choose = (items: readonly string[]) => pick(r, items.filter(fits));

	// Lines in order; a second line from the same speaker joins the one before it.
	type Line = ['i' | 'p' | 'x', string];
	const lines: Line[] = [];
	const add = (who: 'i' | 'p', text: string) => {
		const last = lines[lines.length - 1];
		if (last && last[0] === who) last[1] = `${last[1]} ${say(text)}`;
		else lines.push([who, say(text)]);
	};
	const ask = (text: string) => add('i', text);
	const answer = (text: string) => add('p', text);
	// A short acknowledgement before the next question, unless the interviewer has just spoken.
	const askLead = (text: string) => ask(lines[lines.length - 1]?.[0] === 'i' ? text : `${pick(r, probes)} ${text}`.trim());

	ask(pick(r, plan.noteTaker ? intros : introsAlone));
	answer(pick(r, consents));
	ask(pick(r, aboutAsks));
	answer(pick(r, p.about));
	ask(pick(r, startAsks));
	answer(pick(r, p.start));
	askLead(pick(r, monthAsks));
	answer(pick(r, p.month));

	// The middle, in an order of its own for each interview.
	const middle: (() => void)[] = [];
	const chosen = some(r, p.turns.filter((t) => !t[2] || uses(t[2])), int(r, 3, 5));
	for (const turn of chosen)
		middle.push(() => {
			askLead(turn[0]);
			answer(turn[1]);
		});
	for (const f of shuffle(r, features)) {
		if (att[f] === 'never' && chance(r, 0.4)) continue;
		middle.push(() => {
			const block = blocks[f];
			askLead(pick(r, block.ask));
			answer(f === decoy && att[f] === 'rare' ? pick(r, lapsed[f]) : compose(r, block.answer[att[f]]));
			if (att[f] === 'core' || att[f] === 'used')
				for (const more of some(r, block.more, att[f] === 'core' ? int(r, 2, 4) : int(r, 0, 2))) {
					ask(pick(r, more.ask));
					answer(choose(att[f] === 'core' ? more.core : more.used));
				}
		});
	}
	const notified = chosen.some((t) => t[0].includes('notification'));
	for (const free of some(r, freeBlocks.filter((b) => !notified || !b.ask[0]!.includes('notification')), int(r, 1, 3)))
		middle.push(() => {
			askLead(pick(r, free.ask));
			const [reply, more] = pick(r, free.answer.filter(([text]) => fits(text)));
			answer(reply);
			if (more && chance(r, 0.5)) {
				const [question, replies] = pick(r, free.more);
				ask(question);
				answer(pick(r, replies));
			}
		});
	const possible = problems.filter((pr) => !pr.needs || level[att[pr.needs]] >= (pr.one ? 1 : 2));
	let raised = 0; // counted as the problems come up in the transcript, not as they are planned
	for (const problem of some(r, possible, chance(r, 0.65) ? (chance(r, 0.2) ? 2 : 1) : 0)) {
		const ends = [problem.live ? 'live' : null, problem.sorted ? 'sorted' : null, problem.cleared ? 'cleared' : null].filter((e): e is string => !!e);
		const end = weighted(r, ends, ends.map((e) => (e === 'live' ? 5 : 3)));
		middle.push(() => {
			askLead(pick(r, raised++ === 0 ? troubleAsks : ['Is there anything else that has given you trouble?', 'Any other problems with it?', 'Anything else that gets in your way?']));
			answer(pick(r, problem.tell));
			const k = int(r, 0, problem.probe.length - 1);
			ask(problem.probe[k]!);
			answer(problem.detail[k]!);
			if (end === 'live') {
				ask(fill(pick(r, problem.live!), { ...values, team: problem.team }));
				answer(pick(r, yesPlease));
			} else if (end === 'sorted') {
				ask(pick(r, sortedAsks));
				answer(pick(r, problem.sorted!));
			} else {
				const [explain, reply] = pick(r, problem.cleared!);
				ask(explain);
				answer(reply);
			}
		});
	}
	for (const wish of some(r, wishes.filter(fits), int(r, 0, 2)))
		middle.push(() => {
			ask(pick(r, wishAsks));
			answer(wish);
			ask(pick(r, wishAcks));
		});
	for (const story of some(r, p.stories, chance(r, 0.5) ? 2 : 1))
		middle.push(() => {
			askLead(story[0]);
			answer(story[1]);
			ask(story[2]);
			answer(story[3]);
		});
	if (chance(r, 0.6))
		middle.push(() => {
			askLead(pick(r, weekAsks));
			const bought = some(r, payments, int(r, 3, 5));
			const transfer = level[att.pots] >= 1 && chance(r, 0.5) ? ` And a transfer into {pot}.` : '';
			answer(`${pick(r, weekOpens)} ${bought.slice(0, -1).join(', ')} and ${bought[bought.length - 1]}.${transfer} ${pick(r, weekCloses)}`);
			ask(pick(r, weekProbes));
			answer(pick(r, weekAfters.filter(([, needs]) => !needs || bought.includes(needs)))[0]);
		});
	if (chance(r, 0.4))
		middle.push(() => {
			askLead(pick(r, otherAsks));
			answer(pick(r, otherAnswers));
		});
	if (chance(r, 0.4))
		middle.push(() => {
			askLead(pick(r, talkAsks));
			answer(choose(talkAnswers));
		});
	for (const [asks, answers] of [[habitAsks, habitAnswers], [firstAsks, firstAnswers]] as const)
		if (chance(r, 0.5))
			middle.push(() => {
				askLead(pick(r, asks));
				answer(pick(r, answers));
			});
	if (chance(r, 0.4))
		middle.push(() => {
			askLead(pick(r, discoverAsks));
			answer(pick(r, discoverAnswers));
		});
	for (const aside of some(r, asides, int(r, 0, 2))) middle.push(() => lines.push(['x', say(aside)]));
	const ordered = shuffle(r, middle);
	// The participant's own summary of what the app is for comes in the second half of the middle.
	const reveal = () => {
		askLead(pick(r, mainAsks));
		answer(pick(r, p.main));
	};
	ordered.splice(int(r, Math.ceil(ordered.length / 2), ordered.length), 0, reveal);
	for (const step of ordered) step();
	if (chance(r, 0.7)) {
		askLead(pick(r, nextAsks));
		answer(pick(r, p.next));
	}

	// The close: the one thing they would keep, then their own question.
	ask(pick(r, keepAsks));
	answer(core !== 'none' && decoy !== core && chance(r, 0.75) ? pick(r, keepTurns[core]) : pick(r, keepAnswers[core]));
	if (chance(r, 0.6)) {
		ask(pick(r, keepWhyAsks));
		answer(pick(r, keepWhy[core]));
	}
	ask(pick(r, anyAsks));
	const own = chance(r, 0.55) ? pick(r, asks.filter((a) => a.ask.every(fits))) : null;
	if (own) {
		answer(pick(r, own.ask));
		const kinds = [own.owed ? 'owed' : null, own.answered ? 'answered' : null].filter((k): k is string => !!k);
		const [reply, back] = pick(r, pick(r, kinds) === 'owed' ? own.owed! : own.answered!);
		ask(reply);
		answer(back);
		if (chance(r, 0.4)) answer(pick(r, ["That's all, I think.", 'That was it, really.', 'Nothing else.']));
	} else answer(pick(r, nothingElse));
	ask(pick(r, thanks));
	if (chance(r, 0.8)) answer(pick(r, byes));
	// A participant sometimes wanders off the point for a sentence.
	for (const digression of some(r, digressions.filter(fits), int(r, 0, 2))) {
		const at = int(r, 8, lines.length - 6);
		if (lines[at]?.[0] === 'p') lines[at]![1] += ` ${say(digression)}`;
	}

	// Timestamps: about one second of talk for every 4.5 characters, plus a pause between turns.
	let seconds = 0;
	const body = lines.map(([who, text]) => {
		const stamp = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
		seconds += Math.round(text.length / 4.5) + int(r, 2, 9);
		if (who === 'x') return text;
		return `[${stamp}] **${who === 'i' ? I : plan.name}:** ${text}`;
	});
	const minutes = Math.ceil(seconds / 60) + int(r, 1, 4);
	const since = int(r, ...(p.since ?? [2021, 2025]));
	const plusSince = int(r, Math.max(since, decoy === 'cats' ? 2023 : 2024), 2026);
	const age = int(r, p.age[0], p.age[1]);
	const header = [
		`# Interview ${plan.number}`,
		'',
		`- Date: ${longDate(plan.date)}, ${plan.time}`,
		`- Session: ${pick(r, ['video call', 'video call', 'video call', 'phone call'])}, ${minutes} minutes`,
		`- Interviewer: ${plan.interviewer.full}`,
		...(plan.noteTaker ? [`- Notes: ${plan.noteTaker}`] : []),
		`- Participant: ${plan.name}, ${age}, ${values.town}. Pennyjar customer since ${since}, on Plus since ${plusSince}.`
	];
	return `${header.join('\n')}\n\n---\n\n${body.join('\n\n')}\n\n*[Recording ends.]*\n`;
};

// Who is interviewed when: personas dealt in rounds, each round in a new order; sessions spread over the weekdays.
const order = mulberry32(20261006);
const deck: Persona[] = [];
const names = shuffle(order, participantNames);
const plans: Plan[] = [];
let number = 100;
const dayOf = (index: number) => Math.floor((index * days.length) / ITEMS);
const perDay = new Map<number, number>();
for (let index = 0; index < ITEMS; index++) perDay.set(dayOf(index), (perDay.get(dayOf(index)) ?? 0) + 1);
const seen = new Map<number, number>();
for (let index = 0; index < ITEMS; index++) {
	if (!deck.length) deck.push(...shuffle(order, personas));
	const day = dayOf(index);
	const nth = seen.get(day) ?? 0;
	seen.set(day, nth + 1);
	const count = perDay.get(day)!;
	number += order() < 0.15 ? 2 : 1;
	const interviewer = interviewers[day % 5 === 3 || day % 7 === 5 ? 1 : 0]!;
	plans.push({
		persona: deck.pop()!,
		number,
		date: days[day]!,
		time: slots[Math.min(slots.length - 1, Math.floor((nth * slots.length) / count) + (count < 4 ? day % 2 : 0))]!,
		interviewer,
		noteTaker: order() < 0.8 ? noteTakers[day % noteTakers.length]! : null,
		name: names[index % names.length]!
	});
}

const folder = join(root, 'research', 'plus-interviews');
mkdirSync(folder, { recursive: true });
plans.forEach((plan, index) => writeFileSync(join(folder, `interview-${plan.number}.md`), interview(index, plan)));
writeFileSync(
	join(folder, 'README.md'),
	`# Plus subscriber interviews, autumn 2026\n\nTranscripts of the interviews the research team held with Plus subscribers between 6 October and\n13 November 2026, one file per interview, numbered in the order they were booked. Participants answered an\nin-app invitation, and each was sent a £20 shopping voucher by email the day before their session.\n\nThe recording tool's transcripts were tidied by the note-taker, or by the interviewer when there was no\nnote-taker: filler words and cross-talk are removed, and participants are named by first name only. Numbers\nmissing from the sequence were sessions that did not take place.\n`
);
