// Writes the long material of this entry's long task: the tickets Pinwheel's member support handled between
// 28 September and 13 November 2026, one Markdown file each, under support/tickets/, as the old help desk exported
// them, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 223;

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
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, ',');

// Time is kept in minutes since 00:00 on 1 September 2026, UK local time. The clocks went back at 02:00 on Sunday
// 25 October, so UK time is an hour ahead of UTC before that and equal to it after.
const DAY = 1440;
const EPOCH = Date.UTC(2026, 8, 1);
const CLOCKS_BACK = 54 * DAY + 120;
const FIRST_DAY = 27; // Monday 28 September
const LAST_DAY = 73; // Friday 13 November
const LAST_MESSAGE = 80 * DAY + 17 * 60; // Friday 20 November, 17:00
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const shortDate = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}`;
const longDate = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!}`;
const dayDate = (minutes: number) => `${weekday(minutes)} ${longDate(minutes)}`;
const stampShort = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${shortDate(minutes)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${dayDate(minutes)} 2026, ${clock(minutes)}`;
const toUtc = (minutes: number) => minutes - (minutes < CLOCKS_BACK ? 60 : 0);
const isoUtc = (minutes: number) => at(toUtc(minutes)).toISOString().slice(0, 19) + 'Z';
const utcShort = (minutes: number) => at(toUtc(minutes)).toISOString().slice(0, 16).replace('T', ' ');
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const minuteOfDay = (minutes: number) => ((minutes % DAY) + DAY) % DAY;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
/** The first day at or after `minutes` that falls on `day` (0 for Sunday). */
const nextDay = (minutes: number, day: number) => {
	let m = startOfDay(minutes);
	while (at(m).getUTCDay() !== day) m += DAY;
	return m;
};
/** Post and image ids come from one counter that started at 1 on 4 August and grows by about 260 a day. */
const idAt = (minutes: number, r: Rand) => 7_600 + Math.floor(((minutes + 28 * DAY) / DAY) * 262) + int(r, -40, 40);

// People at Oriole who handle tickets.
const agents = ['Nell', 'Rafael', 'Joanna', 'Kwesi', 'Imogen'];
const apiTeam = ['Dara Quinn', 'Sunil Varma', 'Hattie Brooks'];
const appsTeam = ['Leon Fischer', 'Maya Sandberg'];
const accountsTeam = ['Tariq Hussain', 'Elin Rowe'];
const safetyTeam = ['Bea Ogunleye', 'Callum Reid'];
const dataLead = 'Martin Kerrigan';
const communityLead = 'Rosa Delgado';

// The groups whose organisers and members write in.
interface Kind {
	names: string[];
	roles: [string, string][];
	events: string[];
	posts: string[];
	items: string[];
}
const kinds: Kind[] = [
	{
		names: ['the Larch Road Allotment Society', 'the Mill Lane Allotments', 'the Hillside Plotholders’ Association'],
		roles: [['the secretary of', 'Secretary'], ['a plot rep at', 'Plot rep'], ['the chair of', 'Chair']],
		events: ['the seed swap', 'the autumn work party', 'the bonfire and soup evening'],
		posts: ['Water to the north plots goes off for the winter on Monday, so fill your butts this weekend.', 'Spare courgettes and runner beans on the bench by the gate, help yourselves.', 'Seed swap at the pavilion, 10 till 12. Bring envelopes and a pen.', 'Someone has left a wheelbarrow by plot 31 for a week. Is it yours?', 'Manure delivery on Saturday morning. Barrows at the ready.'],
		items: ['a greenhouse frame', 'a box of seed trays', 'two water butts']
	},
	{
		names: ['the Victoria Terrace Residents’ Association', 'the Ashgrove Residents’ Association', 'the Canal Side Residents’ Group'],
		roles: [['the chair of', 'Chair'], ['the secretary of', 'Secretary'], ['the treasurer of', 'Treasurer']],
		events: ['the open meeting', 'the AGM', 'the street clean-up'],
		posts: ['Open meeting on Thursday at 7pm in St Mary’s hall. Parking on the agenda again.', 'The council say the broken street light outside number 40 will be fixed next week.', 'Minutes of last week’s meeting are on the noticeboard by the post office.', 'Bin collection moves to Tuesdays from next month, says the council.', 'Thank you to everyone who came to the AGM. New committee below.'],
		items: ['a set of folding chairs', 'a laminator', 'a filing cabinet']
	},
	{
		names: ['the Brook Street Litter Pickers', 'the Wharf Street Clean Team', 'the Foundry Lane Litter Pick'],
		roles: [['one of the organisers of', 'Organiser'], ['the coordinator of', 'Coordinator']],
		events: ['the Sunday litter pick', 'the towpath clean-up', 'the big autumn tidy'],
		posts: ['Litter pick on Sunday, 11am at the bridge. Gloves and grabbers provided.', 'Thirty-two bags last weekend. Thank you all!', 'Lost a grabber on the towpath near the lock. Grey handle.', 'Children welcome at the litter pick, with a grown-up.', 'Someone has dumped a mattress by the recycling bins again.'],
		items: ['a box of hi-vis vests', 'some spare litter grabbers', 'a sack truck']
	},
	{
		names: ['the Station Road Community Fridge', 'the Orchard Close Community Larder', 'Hillside Food Share'],
		roles: [['the coordinator of', 'Coordinator'], ['a volunteer at', 'Volunteer'], ['one of the organisers of', 'Organiser']],
		events: ['the half-term opening', 'the volunteer rota meeting', 'the Saturday collection'],
		posts: ['The fridge is full of bread and veg from the market today. Come and help yourself.', 'Half-term opening hours: 10 till 2 every day, closed Sunday.', 'We need two more volunteers for Saturday collections from the supermarket.', 'Please don’t leave opened food in the fridge. Sealed only, thank you.', 'Big thanks to the bakery on Station Road for this week’s donation.'],
		items: ['a chest freezer', 'a stack of crates', 'a set of cool boxes']
	},
	{
		names: ['the Chapel Row Repair Café', 'the Mill Lane Fix-It Club', 'the Ashgrove Repair Café'],
		roles: [['one of the organisers of', 'Organiser'], ['a volunteer fixer at', 'Volunteer fixer']],
		events: ['the repair café', 'the bike repair morning', 'the sewing session'],
		posts: ['Repair café on Saturday, 10 till 1 at the community centre. Bring your broken toasters.', 'We fixed 41 things last month, including a 1970s record player.', 'Looking for someone who can sharpen knives and scissors.', 'Sewing session next week: bring trousers that need taking up.', 'The bike repair morning is moving to the scout hut for the winter.'],
		items: ['a soldering station', 'a sewing machine', 'a box of spare bike inner tubes']
	},
	{
		names: ['the St Mary’s Toddler Group', 'Little Larks Stay and Play', 'the Brook Street Parents’ Group'],
		roles: [['one of the organisers of', 'Organiser'], ['the treasurer of', 'Treasurer'], ['a volunteer at', 'Volunteer']],
		events: ['the stay-and-play session', 'the toy swap', 'the Christmas party'],
		posts: ['Stay and play is on as usual on Tuesday, 9.30 in the church hall.', 'Toy swap next week. Clean toys only please, and nothing with small parts.', 'We’re short of volunteers for the snack table. Any grown-up welcome.', 'Found: a small blue welly in the hall car park.', 'Christmas party tickets are £2 per child, payable on the day.'],
		items: ['a cot', 'a double buggy', 'a bag of baby clothes']
	},
	{
		names: ['the Canal Side Community Choir', 'the Rosemary Gardens Singers', 'the Wharf Street Wednesday Choir'],
		roles: [['the secretary of', 'Secretary'], ['the musical director of', 'Musical director'], ['a member of', 'Member']],
		events: ['the open rehearsal', 'the Christmas concert', 'the carol singing round the estate'],
		posts: ['Open rehearsal on Wednesday at 7.30. No auditions, just come and sing.', 'Christmas concert tickets are on sale now, £5 or £3 concessions.', 'Tenors wanted! We have two and they are tired.', 'Carol singing on the estate on the 12th, meeting at the shops at 6.', 'Rehearsal cancelled tonight because the hall heating is broken.'],
		items: ['an electric piano', 'a box of music stands', 'some choir folders']
	},
	{
		names: ['the Foundry Lane Tool Library', 'the Larch Road Tool Share'],
		roles: [['a volunteer at', 'Volunteer'], ['the coordinator of', 'Coordinator']],
		events: ['the Saturday drop-in', 'the ladder safety talk', 'the tool amnesty'],
		posts: ['New in the tool library: a carpet cleaner and a wallpaper steamer.', 'Please return the hedge trimmer, there’s a waiting list of six.', 'Saturday drop-in is 10 till 12 in the old bank.', 'Can anyone donate a decent spirit level?', 'The pressure washer is back from repair and ready to borrow.'],
		items: ['a workbench', 'a step ladder', 'a box of drill bits']
	},
	{
		names: ['Ashgrove Juniors FC', 'the Hillside Under-11s', 'the Canal Side Colts'],
		roles: [['a coach at', 'Coach'], ['the welfare officer of', 'Welfare officer'], ['the secretary of', 'Secretary']],
		events: ['the home match', 'the presentation evening', 'the kit swap'],
		posts: ['Home match on Saturday, kick-off 10am at the rec. Parents please park on the road, not the grass.', 'Training is cancelled tonight because the pitch is waterlogged.', 'Kit swap after training on Thursday. Outgrown boots especially welcome.', 'Well done to the under-9s, three wins in a row!', 'We need a volunteer to run the line on Saturday.'],
		items: ['a bag of football boots', 'a set of goal nets', 'a box of training bibs']
	},
	{
		names: ['the Canal Side Joggers', 'the Mill Lane Running Club'],
		roles: [['one of the run leaders at', 'Run leader'], ['the secretary of', 'Secretary']],
		events: ['the Thursday group run', 'the 5K fun run', 'the couch-to-5K taster'],
		posts: ['Thursday group run, 6.30 from the lock. Head torches from now on, please.', 'Fun run entries close on Friday. All ages welcome.', 'Couch-to-5K starts again in January. Beginners very welcome.', 'Lost: a black running glove somewhere along the towpath.', 'Thank you to the marshals at Sunday’s run.'],
		items: ['a box of race numbers', 'some hi-vis bibs', 'a stopwatch set']
	},
	{
		names: ['the Friends of Brook Park', 'the Friends of Larch Wood', 'the Friends of Victoria Gardens'],
		roles: [['the chair of', 'Chair'], ['a volunteer with', 'Volunteer'], ['the secretary of', 'Secretary']],
		events: ['the bulb planting', 'the bat walk', 'the tree planting day'],
		posts: ['Bulb planting on Sunday morning. Trowels provided, bring gloves.', 'The pond is being cleared next week, so the path will be closed.', 'Bat walk on Friday at dusk, meeting at the bandstand.', 'Thank you to the 30 volunteers who planted 2,000 crocuses!', 'Please keep dogs on leads near the wildflower meadow.'],
		items: ['some spare trowels', 'a garden bench', 'a box of bird boxes']
	},
	{
		names: ['the Chapel Row Lunch Club', 'the Thursday Lunch Club at St Mary’s'],
		roles: [['the organiser of', 'Organiser'], ['a volunteer at', 'Volunteer'], ['the cook at', 'Cook']],
		events: ['the Thursday lunch', 'the Christmas lunch', 'the quiz afternoon'],
		posts: ['Thursday lunch: shepherd’s pie and apple crumble, £4. All welcome.', 'We need drivers to bring a few of our regulars to lunch.', 'Christmas lunch is on the 17th. Please put your name down by the 10th.', 'Quiz afternoon was a triumph. Well done to the Table 3 team.', 'Lunch club is closed next week while the hall kitchen is repaired.'],
		items: ['a hostess trolley', 'a set of tablecloths', 'a large slow cooker']
	},
	{
		names: ['the Rosemary Gardens Street Party Committee', 'the Orchard Close Street Party'],
		roles: [['one of the organisers of', 'Organiser'], ['the treasurer of', 'Treasurer']],
		events: ['the Bonfire Night get-together', 'the planning meeting', 'the winter street party'],
		posts: ['Bonfire Night get-together on the green, 6pm. Sparklers for the children, no rockets please.', 'Planning meeting for the winter party at number 12 on Tuesday.', 'We raised £340 for the hospice at the summer party. Thank you!', 'Road closure for the party is confirmed by the council.', 'Can anyone lend a gazebo for the 19th?'],
		items: ['a gazebo', 'some trestle tables', 'a box of bunting']
	},
	{
		names: ['Station Road Mutual Aid', 'the Ashgrove Good Neighbours', 'Hillside Helping Hands'],
		roles: [['the coordinator of', 'Coordinator'], ['a volunteer with', 'Volunteer']],
		events: ['the winter warm space', 'the volunteer meeting', 'the prescription run rota'],
		posts: ['Warm space at the library every weekday afternoon from November. Tea and biscuits.', 'Can anyone help Mrs P on Elm Street with a shopping run on Fridays?', 'Volunteer meeting on Monday at 7 in the café.', 'We have a spare electric heater for anyone who needs one this winter.', 'Prescription runs are covered for this week, thank you all.'],
		items: ['an electric heater', 'a box of blankets', 'a wheelchair']
	},
	{
		names: ['the Wharf Street Book Club', 'the Library Corner Readers'],
		roles: [['the organiser of', 'Organiser'], ['a member of', 'Member']],
		events: ['the November meeting', 'the book swap', 'the author evening'],
		posts: ['November’s book is “The Lamplighter’s Year”. Meeting at the Ship, upstairs room.', 'Book swap in the library foyer on Saturday morning.', 'Author evening with a local crime writer on the 20th, free but please book.', 'Has anyone got a spare copy of last month’s book?', 'We’re full for now, but you can join the waiting list.'],
		items: ['a bookcase', 'two boxes of paperbacks', 'a reading lamp']
	},
	{
		names: ['the Foundry Lane Community Garden', 'the Orchard Close Growing Space'],
		roles: [['a volunteer at', 'Volunteer'], ['the coordinator of', 'Coordinator'], ['the treasurer of', 'Treasurer']],
		events: ['the apple pressing', 'the composting workshop', 'the Saturday work morning'],
		posts: ['Apple pressing on Saturday. Bring your windfalls and a bottle.', 'Composting workshop with the council’s recycling officer next week.', 'The raised beds need weeding before the frost. Work morning on Saturday.', 'Thank you to whoever left the bags of leaves for the leaf mould bin.', 'The garden gate code has changed. Ask a volunteer.'],
		items: ['a wheelbarrow', 'a pile of scaffold boards', 'a compost bin']
	}
];
/** Events that fall on a fixed day, in days since 1 September; the others fall a few days after the ticket opens. */
const fixedEvents: Record<string, number> = {
	'the half-term opening': 55,
	'the Bonfire Night get-together': 65,
	'the November meeting': 78,
	'the author evening': 80,
	'the Christmas concert': 102,
	'the carol singing round the estate': 102,
	'the Christmas party': 105,
	'the Christmas lunch': 107,
	'the winter street party': 109
};
const streets = ['Elm Street', 'Larch Road', 'Victoria Terrace', 'Mill Lane', 'Canal Side', 'Orchard Close', 'Hillside Road', 'Ashgrove', 'the Crescent', 'Brook Street', 'Station Road', 'Chapel Row', 'Foundry Lane', 'Rosemary Gardens', 'Wharf Street', 'Kingfisher Way', 'Paradise Row', 'Tanner’s Yard'];
const firstNames = ['Deepak', 'Morag', 'Chidi', 'Bronwen', 'Stefan', 'Farah', 'Lewis', 'Oksana', 'Trevor', 'Niamh', 'Rashid', 'Gemma', 'Piotr', 'Yvonne', 'Callum', 'Shreya', 'Desmond', 'Katya', 'Owen', 'Maribel', 'Arjun', 'Lorna', 'Kwame', 'Ingrid', 'Bashir', 'Tamsin', 'Elliot', 'Roisin', 'Hamza', 'Cerys', 'Dominic', 'Ayesha', 'Fergus', 'Linh', 'Rosalind', 'Gareth', 'Delphine', 'Ifeoma', 'Neil', 'Agnieszka', 'Pauline', 'Winston', 'Saoirse', 'Mohammed', 'Hilary', 'Joyce', 'Barry', 'Precious', 'Wendy', 'Jasper'];
const surnames = ['Whitlock', 'Banerjee', 'Okonkwo', 'Prentice', 'Kowalczyk', 'Haldane', 'Mistry', 'Trevelyan', 'Abara', 'Farrow', 'Qureshi', 'Dunmore', 'Nakamura', 'Ellery', 'Castellanos', 'Brathwaite', 'Sorensen', 'Achebe', 'Marchetti', 'Pike', 'Gallagher', 'Osei', 'Rowntree', 'Varga', 'McAllister', 'Doyle', 'Ahmed', 'Penhaligon', 'Szabo', 'Lister', 'Harcourt', 'Mensah', 'Fairweather', 'Iqbal', 'Nowak', 'Bellamy'];
const neighbourNames = ['Jean', 'Sheila', 'Pat', 'Carol', 'Magda', 'Brenda', 'Kemi', 'Rita', 'Lesley', 'Dorota', 'Viv', 'Maureen', 'Gloria', 'Anjali', 'Shirley', 'Nadia', 'Teresa', 'Joan', 'Halima', 'Bernie'];
const nicknames = ['Bev', 'Jim', 'Mags', 'Kit', 'Sal', 'Ollie', 'Tash', 'Bob', 'Liz', 'Fran'];
const providers = ['mailbox.example', 'postbox.example', 'inbox.example', 'letterbox.example'];
const devices: [string, string, string][] = [
	['iPhone', 'iPhone 13 mini', 'iOS 26.0.1'],
	['iPhone', 'iPhone 15', 'iOS 26.1'],
	['iPhone', 'iPhone SE', 'iOS 26.0'],
	['iPhone', 'iPhone 12', 'iOS 18.7'],
	['Android', 'Pixel 7a', 'Android 16'],
	['Android', 'Galaxy A15', 'Android 15'],
	['Android', 'Moto G54', 'Android 15'],
	['Android', 'Galaxy S21', 'Android 15'],
	['web', 'Windows laptop', 'Edge 142'],
	['web', 'iPad (9th generation)', 'Safari 26']
];

// Topics. A ticket follows one path of one topic. Nothing about the topic, its area or its outcome is written into
// the file except through the messages themselves.
type Who = 'c' | 'a' | 'n' | 'k' | 'K' | 'w' | 'm' | 'M' | 't' | 'T' | 'd' | 'D' | 'g' | 'G' | 's';
type Msg = [Who, string];
type Paste =
	| 'member'
	| 'blankMember'
	| 'blankOther'
	| 'twoMembers'
	| 'posts'
	| 'postsOther'
	| 'signin'
	| 'uploads413'
	| 'uploads415'
	| 'uploadsBig'
	| 'apiLong'
	| 'apiDup'
	| 'apiRequired'
	| 'apiName'
	| 'apiNameOther'
	| 'boardApi'
	| 'reportsOther'
	| 'reportsSelf'
	| 'reportsNew'
	| 'crash'
	| 'board'
	| 'appinfo'
	| 'recent'
	| 'none';
interface Path {
	/** The first and last day a ticket can take this path, in days since 1 September. */
	since?: number;
	until?: number;
	/** The post the ticket is about, when it is not one of the group's ordinary posts. */
	snippets?: string[];
	/** The openings of the topic this path fits, by index; all when left out. */
	opens?: number[];
	detail: string[];
	/** Pasted by the member under the detail. */
	paste?: Paste;
	look: string[];
	lookWho?: Who;
	/** Pasted under the note; `member` when left out. */
	lookPaste?: Paste;
	/** Pasted under the note after `lookPaste`. */
	extra?: Paste;
	ends: Msg[][];
	/** Whom support waits on, if it sends a holding reply. */
	team?: string;
	/** The ticket may end with a satisfaction survey. */
	happy?: boolean;
}
interface Topic {
	/** The first and last day a ticket on this topic can be opened, in days since 1 September. */
	since?: number;
	until?: number;
	/** Pasted by the member in the first message. */
	shows?: Paste;
	/** Pasted under the note as well as the path's own paste. */
	extra?: Paste;
	/** The post the ticket is about, when it is not one of the group's ordinary posts. */
	snippets?: string[];
	/** The app versions a member on this topic can have; otherwise the current one or the one before. */
	apps?: string[];
	/** The kinds of device a member on this topic can use. */
	platforms?: string[];
	/** More of the member's situation, for the first message. */
	background: string[];
	/** A question support may ask after the member's answer, and the member's reply. */
	probe: [string, string][];
	/** What the member has already tried, for the first message. */
	tried: string[];
	/** What other people have said about it, for the first message. */
	heard: string[];
	subjects: string[];
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}

const topics: Topic[] = [
	// Locked out.
	{
		heard: ['{neighbour} from {groupShort} has been putting my notices up for me in the meantime, but I can’t keep asking her.', 'My grandson says every app has a reset button these days and I should just press it, but I can’t find one.'],
		tried: ['I’ve tried the passwords I use for other things, and the one my daughter usually sets, but none of them work.', 'I deleted the app and put it back on, in case that helped, but it didn’t.'],
		background: ['I’ve had the same email for years, so I don’t think anything has changed on my side. The only thing I can think of is that I set up a new phone in September and let it fill in passwords for me.', 'Normally I only open Pinwheel on a Sunday evening to see what’s on in the week, so it could be months since I last typed the password in.', 'I wrote the password down in the back of my diary, but either I wrote it wrong or I changed it afterwards, because that doesn’t work either.'],
		probe: [['Just to check: are you seeing this on the app, on the web, or both?', 'Both. The same message on the phone and on the laptop.'], ['Has anyone else, a family member for example, ever signed in to Pinwheel with your email on their device?', 'Not that I know of. It’s only ever been on my phone.']],
		subjects: ['Can’t sign in', 'Locked out of Pinwheel', 'password??', 'Forgotten my password', 'App says wrong password'],
		open: [
			'I can’t get into Pinwheel on my phone. It keeps saying the email or password is wrong, and I’m sure the email is right because it’s the only one I use. I may have changed the password when I got my new phone and then forgotten it. I can’t see a “forgotten password” button anywhere.',
			'I haven’t signed in since the summer and now my password isn’t accepted. I’ve tried every version I can think of, with and without capitals. I need to put a notice up about {event} before {day}.',
			'My daughter set Pinwheel up for me and I don’t know what password she chose. She’s away until {day} and not answering her phone. Can you help me get back in?'
		],
		more: [
			'It’s not urgent, but I’d like to be back on before the weekend.',
			'The message on the screen says: “That email and password don’t match.”',
			'I’ve tried on the computer as well as my phone, and it’s the same on both.'
		],
		ask: [
			'Password resets are done by our accounts team at the moment. So that we reset the right account, could you confirm the email you signed up with and roughly when you last managed to sign in?',
			'I can help with that. Could you tell me the email on your account and the name you go by on the board? We ask everyone, so we know we’re talking to the account’s owner.'
		],
		paths: [
			{
				detail: ['It’s {email}, and on the board I’m {full}. I last got in during August, I think.', 'The email is {email}. I post as {full}, mostly about {group}.'],
				look: ['{id} on {email}, joined {joined}. {fails} failed sign-ins since {wday}, last good one {lastSeen}. Asked accounts to send a reset.', 'Found {id}. Nothing odd, just {fails} wrong passwords this week. Over to accounts for the reset.'],
				lookPaste: 'signin',
				team: 'accounts team',
				ends: [
					[['k', 'Reset email sent to {email} for {id}. Valid for an hour.'], ['a', 'The accounts team have sent a reset email to {email}. The button in it works for an hour, so if it hasn’t arrived in ten minutes, have a look in your junk folder.'], ['c', 'Got it, and I’m back in. Thank you so much!']]
				],
				happy: true
			},
			{
				detail: ['It should be {email}, but I might have used my old work email when I joined. I post as {full}.'],
				look: ['Nothing on {email}. Searched on {surname}: one account, {id}, under the same name on an email ending {pers}, joined {joined}.'],
				ends: [[['a', 'There’s no account on {email}, but there is one in your name on an email ending {pers}. Could that be it? Try signing in with that and your usual password.'], ['c', 'Yes! That was my old work email, and the password worked first time. Sorry to have bothered you.'], ['a', 'No bother at all, it happens a lot. Glad you’re in.']]],
				happy: true
			},
			{
				detail: ['{email}, I think. I’m not sure which name I used, possibly just my first name.'],
				look: ['No account on {email}, and nothing under {surname} that fits. Probably signed up with another email.'],
				lookPaste: 'none',
				ends: [
					[['a', 'I can’t find an account on {email}. Could you have signed up with a different email? If you search your inbox for anything from Pinwheel from when you joined, that will show which one we have.'], ['c', 'I’ll have a look tonight and get back to you.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']],
					[['a', 'That email isn’t on any account, I’m afraid. Is there another you might have used? Once I know which, I can ask the accounts team to send a reset to it.'], ['c', 'I have an old one I hardly use. I’m away until {day}, so I’ll check then and let you know.']]
				]
			},
			{
				detail: ['It’s {email}. I’m {full} on the board.'],
				look: ['{id} on {email}, fine to reset. Passed to accounts.'],
				lookPaste: 'signin',
				team: 'accounts team',
				ends: [[['k', 'Reset sent for {id}.'], ['a', 'A reset email is on its way to you; it works for an hour.'], ['c', 'Thanks, I’m in. Honestly though, could the app not have a “forgotten password” button like everything else does? I can’t be the only one who has to email you.'], ['a', 'You’re not, and the accounts team know: a reset button in the app is on their list. I’ve added your ticket to that request so you hear when it arrives.']]]
			}
		]
	},
	// A shared tablet signed in as someone else.
	{
		heard: ['{neighbour} said three people stopped her in the street to ask about my notice, and she had no idea what they meant.', 'One of our members asked whether {neighbour} had taken over the group, which made everyone laugh except {neighbour}.'],
		tried: ['I’ve looked at the post on my own phone and it definitely shows {neighbour}’s name.', 'I asked the other volunteers, and none of them changed anything on the tablet.'],
		background: ['The tablet lives in a drawer in the office and whoever is on duty uses it to put up notices. We’ve never had a problem before.', 'We bought the tablet with a small grant last year so that volunteers without smartphones could still post for the group.', '{neighbour} and I share the job of posting for {groupShort}, so we use the same devices, but we each have our own account.'],
		probe: [['Do you know whether the tablet was restarted or updated recently?', 'Not as far as I know. It just sits in the drawer.'], ['Is it the Pinwheel app on the tablet, or the web version in a browser?', 'The app, I think. It has the pinwheel logo on the home screen.']],
		subjects: ['My posts show the wrong name', 'Name wrong on my post', 'Posted as someone else?', 'Wrong name on my posts'],
		open: [
			'I posted about {event} from the tablet at the community centre this morning, and the post has gone up under {neighbourFull}’s name instead of mine. {neighbour} is furious because people are messaging her about it. How has that happened?',
			'Something odd: my last two posts show {neighbourFull} as the author, not me. I did them on the shared laptop in the {groupShort} office. Is the board mixing people up?',
			'People are asking {neighbour} about my notice for {event}, because it’s got her name on it. I definitely wrote it. Can you change the name on the post?'
		],
		more: ['We have one tablet that all the volunteers use for the board.', 'It’s caused a bit of an atmosphere, so I’d like it fixed quickly.'],
		ask: [
			'Sorry for the muddle. The board shows whoever was signed in on the device at the time, so could you check who is signed in on the shared one? In the app it’s under Profile, at the top.',
			'Thanks for explaining. Posts go up under the account that’s signed in, so my guess is the shared device was still signed in as {neighbour}. Could you have a look under Profile on it and tell me whose name you see?'
		],
		paths: [
			{
				detail: ['You’re right, it was signed in as {neighbour} from last week. I’ve signed her out and signed in as me. Can you move the posts over to me?', 'It says {neighbourFull}. She must have used it last and not signed out.'],
				look: ['Posts {post} and {post2} were made from {neighbourId}’s account, from the same device she used on {wday}. Can’t move authors; removing at the poster’s request.'],
				lookPaste: 'postsOther',
				ends: [
					[['a', 'We can’t change who a post belongs to, but I’ve removed both posts from {neighbour}’s account so you can post them again as yourself. For next time, it’s worth signing out on the shared tablet after each use.'], ['c', 'Reposted under my own name. I’ve stuck a note on the tablet saying “sign out!”. Thanks.']]
				],
				happy: true
			},
			{
				detail: ['It says {neighbourFull}. To be honest it would be easier if the tablet just had a {groupShort} account that we all use. Can we have one?'],
				look: ['Tablet signed in as {neighbourId}. Organiser asking for a shared group account. Asked the community team what we tell groups.'],
				lookWho: 'n',
				lookPaste: 'postsOther',
				team: 'community team',
				ends: [[['g', 'We don’t do group accounts: posts need to show a real person, so members know who to talk to. Suggest each volunteer signs in as themselves and mentions the group in the post.'], ['a', 'I’ve removed the two posts so you can put them up as yourself. On a shared account for {groupShort}: we ask everyone to post as themselves, so members always know who they’re talking to, and to mention the group in the post. Signing out of the tablet after each use avoids this happening again.'], ['c', 'Fair enough. We’ll do it that way.']]]
			},
			{
				detail: ['I haven’t been back to the centre since. I’ll check when I’m in on {day}.'],
				look: ['Posts {post} and {post2} are on {neighbourId}, made from a tablet that has used that account since {joined}. Waiting to hear back.'],
				lookPaste: 'postsOther',
				ends: [[['a', 'No problem. When you’re there, check who is signed in under Profile. If it’s {neighbour}, sign her out and let me know, and I’ll take the two posts down so you can repost them as yourself.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// Two accounts.
	{
		heard: ['{neighbour} said she sent a message to the wrong me and never heard back.', 'A neighbour asked whether I had a twin, which is how I noticed.'],
		tried: ['I tried signing in with the old email but I can’t remember that password either.', 'I looked for a way to link the two in the app’s settings but couldn’t find one.'],
		background: ['When I changed phones I couldn’t remember my password, so I just signed up again with my other email. I didn’t realise it would make a whole new account.', 'Some of my neighbours follow my posts about {group}, and they’ve been confused about which one is really me.', 'I’m not even sure which account has which posts any more. It was much simpler when I only had one.'],
		probe: [['Do you still use both accounts, or only the newer one?', 'Mostly the newer one. I haven’t signed in to the old one for weeks.'], ['Is anyone else using either account, a partner for example?', 'No, they’re both just me.']],
		subjects: ['Two accounts', 'Signed up twice by mistake', 'Merge my accounts?', 'Old posts missing'],
		open: [
			'I think I’ve ended up with two Pinwheel accounts. I joined in August with my old email, then signed up again on my new phone with another one. All my old posts about {group} are on the first account. Can you join them together?',
			'My posts from the summer have disappeared from my profile. I’ve just realised I might be signed in to a second account I made by accident. Is there a way to have everything in one place?',
			'Two of me are on the board: {full} and {full}. One is old and one is new. People don’t know which to contact. Can you delete one?'
		],
		more: ['I’d like to keep the newer one, as that’s my current email.', 'It’s not urgent, it’s just untidy.'],
		ask: [
			'Thanks for flagging it. Could you tell me the two emails, and which account you’d like to keep? We need to hear from both addresses before we change anything, so please send one line from each.',
			'Let me look into it. Which two emails are involved, and which one do you use now?'
		],
		paths: [
			{
				detail: ['The old one is {otherEmail}, the new one is {email}. Sending this from the new one, and I’ll send a line from the old one too.'],
				look: ['Two accounts: {id} on {email} and an older one on {otherEmail}. Can’t merge posts between accounts. Asked accounts to close the old one once confirmed from both emails.'],
				lookPaste: 'twoMembers',
				team: 'accounts team',
				ends: [[['c', 'This is me writing from the old email, confirming.'], ['k', 'Old account closed. Its {count} posts stay on the board under the old account’s name, as agreed with the member.'], ['a', 'Thanks for confirming from both emails. We can’t move posts between accounts, but the accounts team have closed the old one. Its posts stay on the board under your name, and everything new goes on {id}.'], ['c', 'That’s fine, thank you. Much tidier.']]],
				happy: true
			},
			{
				detail: ['The new one is {email}. The old one was {otherEmail}, but I can’t get into that inbox any more, the provider closed it.'],
				look: ['Two accounts, {id} and an old one on {otherEmail}. Member can’t reach the old inbox, so we can’t confirm ownership from it. Asked accounts.'],
				lookPaste: 'twoMembers',
				team: 'accounts team',
				ends: [[['k', 'Without the old inbox we can’t be sure it’s the same person. We can close it if the member answers the questions on file for that account: the name they gave and roughly when they joined.'], ['a', 'Because you can’t reach the old inbox, we need another way to be sure the old account is yours. Could you tell me the name you gave when you joined with it and roughly when that was?'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			},
			{
				detail: ['Honestly I don’t mind having two, I just want people to stop messaging the old one. Could I just change its name to say “use my other account”?'],
				look: ['Two accounts, both active this month. Member happy to keep both.'],
				lookPaste: 'twoMembers',
				ends: [[['a', 'You can: on the old account, go to Profile, then Edit, and change the bio to say which account you use now. Anyone who looks will see it. If you ever want the old one closed, write from both emails and we’ll do it.'], ['c', 'Done, I’ve put a note in the old bio. That will do for now.']]]
			}
		]
	},
	// The board lists the oldest posts first.
	{
		heard: ['One of our members said to me, “Is the board broken? Nobody posts any more.”', '{neighbour} told me she gave up looking because it was always the same summer posts at the top.'],
		tried: ['I’ve closed the app and opened it again, and restarted the phone, and it’s the same.', 'I asked my neighbour to look on her phone and she sees the same old posts at the top.'],
		background: ['I put the post up just after breakfast, and by lunchtime two people had asked me whether {eventName} was still happening because they couldn’t see anything about it.', 'We have a lot of older members who only look at the first few posts. If they can’t see anything new, they assume nothing is happening.', 'When I first joined in August, the board was short enough that it didn’t matter. Now there are pages and pages.'],
		probe: [['Does it look the same on the web version, if you’ve tried it?', 'I tried on my laptop and yes, the same thing.'], ['When you open the board, what’s the date on the very first post you see?', 'Early August. It must be one of the first posts anyone made.']],
		shows: 'board',
		subjects: ['Board not updating', 'Where has my post gone?', 'Nothing new on the board', 'Old posts at the top', 'Board shows September'],
		open: [
			'I posted about {event} this morning and now I can’t find it anywhere. The board just shows posts from the summer at the top. Has it been deleted?',
			'Is the board broken? When I open it I see the same old posts from weeks ago, and nobody seems to have posted anything new, which can’t be right for our street.',
			'Every time I open Pinwheel I have to scroll and scroll to get to anything recent. Is there a setting to see the newest posts first? My neighbours say the same.'
		],
		more: ['Several people at {group} have said the same, so it isn’t just me.', 'It wasn’t like this when we started, or maybe there were just fewer posts then.', 'I use the {platform} app.'],
		ask: [
			'Thanks for getting in touch. I don’t think anything has been deleted. Could you scroll right to the bottom of the board and tell me whether your post is there?',
			'Sorry for the confusion. Could you tell me which app you use (iPhone, Android or the web) and whether you see recent posts if you scroll all the way down?'
		],
		paths: [
			{
				detail: ['You’re right, it’s at the very bottom. So the newest posts go last? That seems backwards for a noticeboard.', 'Found it, right at the bottom under everything else. I use the {platform} app, if that matters.'],
				look: ['Confirmed: the board list comes back oldest first, and the apps show it in that order, so on a board this size the latest posts are a long way down. Flipping it to newest first is small; it’s on our list for the next release.'],
				lookWho: 'w',
				lookPaste: 'boardApi',
				ends: [[['a', 'You’ve found a real problem: the board lists posts oldest first, so the newest end up at the bottom. The API team are changing it so the newest come first, and I’ll let you know when that’s live. Until then, the quickest way to today’s posts is to scroll to the end.'], ['c', 'Thanks for explaining. I’ll tell the others to scroll down for now.']]]
			},
			{
				detail: ['Yes, there it is at the bottom. Is there a way to jump straight there? It takes ages on my phone.'],
				look: ['Same as the others: board order is oldest first. API team have it on their list; no date yet.'],
				lookPaste: 'boardApi',
				ends: [[['a', 'There is: in the phone apps, tapping the word Board at the top of the screen twice jumps to the end, and on the web the End key does the same. We’re also changing the order so the newest posts come first, but I don’t have a date for that yet.'], ['c', 'Tapping twice works, that will do me. Thank you.']]],
				happy: true
			},
			{
				detail: ['No, I scrolled to the very end and it isn’t there either. The newest one is from yesterday afternoon.'],
				look: ['No post from {id} today. The app’s attempts this morning were all turned away as too long, so it never went up.'],
				lookPaste: 'apiLong',
				ends: [[['a', 'I’ve found what happened: your post never went up, because it was over the 500-character limit, and the app’s message about it is easy to miss. If you trim it a little, or split it into two posts, it will go straight up. You’ll find it at the bottom of the board, where the newest posts are for now.'], ['c', 'Ah, I didn’t see any message. Cut it down and it’s there now. Thank you.']]]
			}
		]
	},
	// The 500-character limit.
	{
		heard: ['Our chair says the old paper newsletter never had this problem, which isn’t helping.', 'Members keep asking me for the details, so I need to get it up.'],
		tried: ['I’ve tried taking out the line breaks and the bullet points, but it’s still too long.', 'I tried posting it from the computer instead of my phone in case that made a difference. It didn’t.'],
		background: ['There’s a lot of information people need, and I don’t want anyone missing out because it was cut.', 'I’ve already cut out the greetings and thank-yous, but there’s only so much I can lose before it stops making sense.', 'The poster we print for the noticeboard has all the details, and I wanted the post to match it.'],
		probe: [['Are you typing it straight into the app, or pasting it in from somewhere else?', 'Pasting it from a document on my computer.'], ['Do you see any message when it fails, or does it just not post?', 'A little red message appears for a second, then goes.']],
		subjects: ['Post won’t send', 'Character limit', 'Error when posting', 'Too long?', 'Can’t get my post up'],
		open: [
			'{Iam}, and I try to post a summary of our meetings on the board. Every time I paste it in and press Post, I get an error saying the text is longer than 500 characters. 500 characters is nothing! Is there a way round it?',
			'I wrote a long post about {event} with all the details, the times and what to bring, and the app won’t let me post it. It just says it’s too long. How long can a post be?',
			'My post keeps failing. It’s a list of opening times over half term. Is there a limit on posts that I don’t know about?'
		],
		more: ['I’ve tried on the computer and on my phone.', 'Our members aren’t on email, so the board is the only way to reach them.'],
		ask: [
			'Posts on the board can be up to 500 characters, which keeps the board easy to read on a phone. Could you tell me roughly how long your post is and what it needs to cover? There are usually ways to make it fit.',
			'Sorry about that. There’s a limit of 500 characters per post. How long is the post you’re trying to put up?'
		],
		paths: [
			{
				detail: ['It’s about 1,400 characters, I think. I can’t really cut it without losing something important.', 'About three times the limit, I should think. Every part of it matters.'],
				paste: 'none',
				look: ['{id}: several attempts turned away as too long, about {minutes} minutes apart.'],
				lookPaste: 'apiLong',
				ends: [[['a', 'Two things people do: split it into parts and post them one after another, starting each with “1 of 3” and so on, or post the key points and say where the full version is, for example on the noticeboard in the hall.'], ['c', 'I’ve done it in three parts, numbered. It looks fine actually. Thanks.']], [['a', 'The simplest way is to post it in parts, numbered so people read them in order. A shorter summary with the date of the next meeting also works well, since most people only read the first lines.'], ['c', 'I’ll do a short version with just the essentials. That’s probably better anyway.'], ['a', 'Sounds good. Let me know if you hit any other trouble.']]],
				happy: true
			},
			{
				detail: ['It’s around 900 characters. Could you not just raise the limit? Other groups must have the same trouble.'],
				look: ['{id} hit the limit several times this week. Second organiser asking for longer posts this month. Asked the community team whether the limit is up for discussion.'],
				lookPaste: 'apiLong',
				team: 'community team',
				ends: [[['g', 'Happy to look at it. I’ll bring the limit to the next product review with the examples we’ve had, but no promises: short posts are a big part of why the board stays readable.'], ['a', 'I’ve passed your request to our community team, who decide things like the post length. They’re taking it to their next review with the other requests we’ve had. In the meantime, splitting the post into numbered parts works.'], ['c', 'Thanks. Please do let me know what they decide.']]]
			},
			{
				detail: ['It’s 420 words, which I thought was well under.'],
				look: ['Member counting words, not characters. 420 words is about 2,300 characters.'],
				lookPaste: 'apiLong',
				ends: [[['a', 'Ah, I see the confusion: the limit is 500 characters, which is letters and spaces, not words. 420 words is about 2,300 characters, so the post would need to be in five parts, or cut down to the essentials.'], ['c', 'Oh dear. I’ll cut it to the essentials and put the full thing on the noticeboard.'], ['a', 'That sounds like a good plan.']]]
			}
		]
	},
	// No way to edit a post.
	{
		heard: ['{neighbour} spotted it before I did, which was embarrassing.', 'My neighbour says on other apps you just press and hold and edit, so I feel a bit silly.'],
		tried: ['I tried pressing and holding the post, which is how you edit things in other apps, but nothing happened.', 'I looked under my profile in case my posts were listed there with an edit option.'],
		background: ['I typed it on my phone while waiting for the bus, which is never a good idea.', 'I noticed it straight after posting, but by then people had already seen it.', 'I read it through twice before posting, and still the mistake got through. Typical.'],
		probe: [['Has anyone posted about it since, as far as you know?', 'One or two people have mentioned it, yes.'], ['Did you post it from your phone or from a computer?', 'From my phone.']],
		subjects: ['How do I edit a post?', 'Typo!!', 'Change my post please', 'Mistake in notice', 'Mistake in my post'],
		open: [
			'I put the wrong date in my post about {event}. It says Saturday the {wrongDate} and it should be the {rightDate}. How do I edit it? I can’t see an edit button anywhere.',
			'I’ve made a mistake in a post: the time should be 2pm, not 12pm, and people are going to turn up at the wrong time. Please help!',
			'Is it possible to edit a post once it’s up? I spelt a neighbour’s name wrong in my thank-you post and I feel terrible about it.'
		],
		more: ['I’ve looked on my phone and on the computer.', 'It went up on {wday}.'],
		ask: [
			'There isn’t a way to edit a post yet, I’m sorry. What I can do is take the post down for you, so you can put up a corrected one. Could you tell me which post it is? The first few words and the day you posted are enough.',
			'Sorry, posts can’t be edited at the moment. If you tell me which post it is, I can remove it so you can post it again with the right details.'
		],
		paths: [
			{
				detail: ['It’s the one that starts “{snippet}”, from {wday}.', 'It starts “{snippet}”. Posted on {wday} evening.'],
				look: ['Post {post} found. Removed at the member’s request.'],
				lookPaste: 'posts',
				ends: [
					[['a', 'Done: I’ve removed the post, so you can put up the corrected one whenever you’re ready.'], ['c', 'Reposted with the right details. Thanks for being so quick.']]
				],
				happy: true
			},
			{
				detail: ['It starts “{snippet}”. Actually, please leave it up: a few people have already posted about it since. I’ll post a correction instead. But can I ask you to add an edit button? It seems so basic.'],
				look: ['Post {post}. Member keeping it and posting a correction. Another vote for editing posts, which the API team have on their list.'],
				lookPaste: 'posts',
				ends: [[['a', 'That makes sense. Editing posts is something the API team plan to add, and I’ve added your request to it; I’ll let you know when it’s there. A correction post is a good idea in the meantime.'], ['c', 'Correction posted. Thanks, and I look forward to the edit button.']]]
			},
			{
				detail: ['I’m not sure which one it is now, I’ve posted a few this week. I’ll find it and come back to you.'],
				look: ['{id} has {few} posts since {wday}. Waiting for the member to say which.'],
				lookPaste: 'posts',
				ends: [[['a', 'No problem. I can see you’ve posted a few times this week. Once you know which one it is, reply here with its first few words and I’ll take it down.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// Removing a post.
	{
		heard: ['My neighbour said she’d had the same trouble and gave up trying to delete hers.', '{neighbour} told me she saw it shared in a group chat, which made me want it gone all the more.'],
		tried: ['I tried swiping the post to the left, which deletes things in my email, but nothing happened.', 'I’ve looked in the settings and under my profile.'],
		background: ['At the time it seemed sensible, but I didn’t think about how many people would see it.', 'I’m a bit embarrassed, as I thought I’d be able to tidy up my own posts.', 'It’s nothing dramatic, but I’d rather old posts weren’t hanging around now things have changed.'],
		probe: [['Is the email you’re writing from the one on your Pinwheel account?', 'Yes, it is.'], ['Are you happy for the post to go completely? Once removed, it can’t be brought back.', 'Yes, completely.']],
		subjects: ['Please delete my post', 'Remove post', 'Can you remove a post?', 'How do I delete?', 'Taking posts down'],
		open: [
			'I posted my mobile number on the board so people could text me about {event}, and now I’m getting messages from people I don’t know. Can you take the post down? I can’t find a delete button.',
			'How do I delete a post? {Item} I was giving away has gone, and people keep asking about it.',
			'I’d like all my posts from the summer taken down. I’ve moved away from {street} and don’t want them up any more.'
		],
		more: ['Sorry if this is obvious, I’ve looked everywhere.', 'Please could it be done today?'],
		ask: [
			'Members can’t delete posts themselves yet, so we do it for you. Could you tell me which post or posts you mean?',
			'Of course. There’s no delete button yet, so support removes posts on request. Which ones would you like taken down?'
		],
		paths: [
			{
				opens: [0, 1],
				detail: ['The one that starts “{snippet}”.', 'Just the one from {wday}, starting “{snippet}”.'],
				look: ['Post {post} removed at the member’s request.'],
				lookPaste: 'posts',
				ends: [[['a', 'That post has been removed. If anyone keeps texting you, you can block their number on your phone, and if any of them were unpleasant, tell me and I’ll pass it to our trust and safety team.'], ['c', 'Thank you, that’s a relief.']], [['a', 'Done, the post is gone from the board.'], ['c', 'Brilliant, thanks. Is a delete button coming? I’d rather not have to email you each time.'], ['a', 'It is on the API team’s list, along with editing posts. Until then we’re happy to do it for you.']]],
				happy: true
			},
			{
				opens: [2],
				detail: ['All of them, please. And actually, could you close my account too? I won’t be using it now I’ve moved.'],
				look: ['{id}: {count} posts removed. Account closure is a data protection request, so passed to Martin.'],
				lookPaste: 'posts',
				team: 'data protection team',
				ends: [[['d', 'Closing {id} and deleting its details as asked. Done within the month; I’ll write to the member when it’s complete.'], ['a', 'I’ve removed your posts, and our data protection lead, Martin, is closing your account and deleting your details. He’ll write to you when that’s done, within the month.'], ['c', 'Thank you. It’s been a lovely board, I’ll miss it.']]]
			},
			{
				opens: [0, 1],
				detail: ['It starts “{snippet}”. Someone posted something quite nasty about it afterwards, too, so I want it gone.'],
				look: ['Post {post} removed. The member mentions a nasty post about it from another member; passed to trust and safety.'],
				lookPaste: 'posts',
				team: 'trust and safety team',
				ends: [[['a', 'Your post has been removed. I’m sorry about the unpleasant post: I’ve passed it to our trust and safety team, who will look at it and decide what to do. They may write to you directly.'], ['t', 'Looking at the post made about {post}. Will contact the poster.']]]
			}
		]
	},
	// Duplicate posts.
	{
		heard: ['{neighbour} posted asking whether it was really happening three times!', 'One of our members said she thought it was spam at first.'],
		tried: ['I tried pressing and holding one of the copies to delete it, but there doesn’t seem to be a way.', 'I’ve moved nearer the window in case the signal was the problem.'],
		background: ['The little circle kept spinning, and I assumed it hadn’t worked.', 'I was standing at the end of the garden where the signal is best, and it still took forever.', 'One of my neighbours said I must be very keen on {eventName}, which made me laugh but also cringe.'],
		probe: [['Did the app show an error at any point, or just keep loading?', 'It just kept loading, then went back to the board.'], ['Were you on mobile data or wifi at the time?', 'Mobile data. The wifi doesn’t reach that far.']],
		platforms: ['iPhone', 'Android'],
		subjects: ['Duplicate post', 'My post appeared more than once', 'Sorry, double post', 'Too many copies of my notice'],
		open: [
			'The signal on our road is terrible. I pressed Post on my notice about {event} and nothing happened, so I pressed it again, and again. Now it’s on the board three times and people are teasing me. Can you remove the extra ones?',
			'My post about {event} has appeared twice. I only pressed the button once, I’m sure of it, although the app did hang for a while.',
			'Could you take down two copies of my post? It’s there three times. Embarrassing!'
		],
		more: ['I was on the bus, if that makes a difference.', 'I’m on the {platform} app.'],
		ask: [
			'Not at all embarrassing, it happens. Let me find them. Could you tell me the first words of the post so I remove the right ones?',
			'Happy to tidy that up. Which post is it? The first few words are enough.'
		],
		paths: [
			{
				detail: ['It starts “{snippet}”.'],
				look: ['Three copies within a minute, {post} the first. Removed the later two.'],
				lookPaste: 'apiDup',
				ends: [[['a', 'Done: I’ve kept the first copy and removed the other two.'], ['c', 'Thank you! I’ll be more patient next time.']]],
				happy: true
			},
			{
				detail: ['“{snippet}”, posted on {wday}. Could the app not stop you pressing it twice?'],
				look: ['Copies of {post} a few seconds apart. Removed the extras. Telling apps.'],
				lookPaste: 'apiDup',
				team: 'apps team',
				ends: [[['m', 'The Post button stays live while the post is sending, so a second tap sends it again. We’re greying it out after the first tap in 2.9.'], ['a', 'I’ve removed the extra copies. You’re right about the button, too: the apps team are changing it so that it can only be pressed once while a post is sending, in the next version of the app.'], ['c', 'Great, thanks for passing it on.']]]
			}
		]
	},
	// Photo-only posts.
	{
		heard: ['{neighbour} managed to post a photo last week, so I’m not sure what I’m doing differently.', 'Another member told me she’d given up and just posts words now.'],
		tried: ['I tried twice more and got the same message each time.', 'I checked whether the photo was too big, but it’s small.'],
		background: ['I thought the picture would speak for itself.', 'I know it sounds silly, but a caption feels like it spoils the photo.', 'I tried typing a space, but that didn’t work either.'],
		probe: [['Did the photo itself go up, as far as you could tell?', 'I think so, it showed in the post box before I pressed Post.'], ['Was it on your phone or on a computer?', 'On my phone, straight from the camera.']],
		subjects: ['Can’t post a photo', 'Photo won’t post', 'Error: text is required', 'Just want to share a picture'],
		open: [
			'I wanted to share a photo of the mural the children painted on the underpass, without writing anything, because the picture says it all. The app says “text is required”. Why do I have to write something?',
			'I keep getting “Text is required” when I try to post a photo of the lost cat we found. I don’t know the cat’s name, there isn’t much to say!',
			'Posting a picture of the {groupShort} stall from today’s fair. The app won’t let me post it on its own. Bug?'
		],
		more: ['The photo itself uploads fine, it’s the post that fails.', 'I tried twice.'],
		ask: [
			'At the moment every post needs at least a line of text, even when it has a photo. Would a short caption work for you, or is there a reason you’d rather post the photo on its own?',
			'Not a bug, but I can see why it’s annoying: every post needs some text. Is a caption a problem?'
		],
		paths: [
			{
				detail: ['A caption is fine. I just didn’t know.', 'I suppose I can say where it was taken.'],
				look: ['{id}: post turned away for missing text, photo uploaded fine just before.'],
				lookPaste: 'apiRequired',
				ends: [[['a', 'A caption is all it needs: even a few words, like where the photo was taken, will let it through.'], ['c', 'Posted with a caption. Thanks!']]],
				happy: true
			},
			{
				detail: ['I’d rather not. Some things don’t need words. Could you change it?'],
				look: ['Posts need text in the API. Photo-only posts would mean changing how posts and photos fit together; noted for the API team’s list.'],
				lookWho: 'w',
				lookPaste: 'apiRequired',
				ends: [[['a', 'I’ve passed it to the API team, who would need to make the change: posts currently have to have text. It’s on their list now, but I can’t say when. Until then, even one word lets the post through.'], ['c', 'Fine, I’ll put a full stop. Please do change it.']]]
			}
		]
	},
	// Pinning a post.
	{
		heard: ['{neighbour} suggested I post the same thing every morning, but that seems like spamming the board.', 'A neighbour says other noticeboard apps can keep a post at the top, and asked why we can’t.'],
		tried: ['I’ve looked through the menus on the post but can’t see anything like pinning.', 'I asked a neighbour, and she didn’t know either.'],
		background: ['We’ve put posters up on lamp posts as well, but most people on our road are on the board.', 'Most people round here check the board, so it’s the best way to reach them.', 'I don’t want to keep reposting the same thing and annoy people.'],
		probe: [['Roughly how many people do you need to reach?', 'Everyone on the board, really.'], ['Have you put a photo with the post?', 'Yes, there’s a photo.']],
		subjects: ['Pin a post?', 'Keep my post at the top', 'Can a post stay at the top?', 'Sticky post'],
		open: [
			'Our dog got out this morning near {street}. I’ve posted on the board but it gets buried under everything else. Can you pin it so everyone sees it?',
			'Is there a way to pin a post? I’d like the details of {event} to stay where people can see them for the next fortnight.',
			'{Iam}, and every week I repost our meeting details because they drop out of sight. A pinned post would save me a lot of trouble.'
		],
		more: ['Please, anything you can do.', 'Other boards I’ve used let organisers do this.'],
		ask: [
			'There isn’t a way to pin a post at the moment, I’m sorry. Could you tell me which post it is, and how long it needs to stay visible?',
			'I’m afraid posts can’t be pinned yet. Which post is it, and when is it for?'
		],
		paths: [
			{
				opens: [1],
				detail: ['It’s the one starting “{snippet}”. Just until {eventDay}.'],
				look: ['No pinning. Suggested reposting closer to the date.'],
				lookPaste: 'posts',
				ends: [[['a', 'Most organisers repost a short reminder a day or two before, which brings it back where people look. It’s not as good as pinning, I know.'], ['c', 'I’ll do a reminder post on {day}. Not ideal but fine.']]]
			},
			{
				opens: [0],
				snippets: ['LOST DOG near {street}, brown terrier called Biscuit, very friendly', 'Please look in your sheds and garages, our terrier Biscuit is missing'],
				detail: ['Our dog, Biscuit, a brown terrier. Please, we’re desperate.'],
				look: ['Lost dog post {post}. Nothing we can pin. Shared it on our own social channel instead.'],
				lookPaste: 'posts',
				ends: [[['a', 'I’m so sorry. Posts can’t be pinned, but I’ve shared your post on Pinwheel’s own social media pages for the area, and it’s worth reposting with a photo every few hours today.'], ['c', 'He’s home! A neighbour on {street} found him in her shed. Thank you for sharing.'], ['a', 'That’s wonderful news. Give him a pat from us.']]],
				happy: true
			},
			{
				opens: [2],
				detail: ['It’s our weekly details, starting “{snippet}”. Will pinning ever be possible?'],
				look: ['Organiser wanting pinned posts for regular details. Logged against the request for pinning; it would need the API team.'],
				lookPaste: 'posts',
				ends: [[['a', 'It’s on the API team’s list, along with a few other organiser requests, and I’ve added your vote. Until then, reposting weekly is the way, I’m afraid.'], ['c', 'OK. Thanks for adding my vote.']]]
			}
		]
	},
	// Images refused as too big although they are under 5 MB.
	{
		heard: ['{neighbour} had the same thing with a photo of her garden last week.', 'My son had a look and says the file is a perfectly normal size.'],
		tried: ['I’ve tried on the computer as well as on my phone, with the same result.', 'I tried a couple of other photos from the same day and they were refused too.'],
		background: ['I’m not very good with computers, so I may be missing something obvious.', 'It’s holding up everything we wanted to post about {eventName}.', 'Photos worked fine a few weeks ago, so I wonder whether something has changed.'],
		probe: [['Does it happen with smaller photos too, or only with this one?', 'Small ones seem to go up fine. It’s just the bigger ones.'], ['Which format is the file, as far as you know? JPEG, PNG?', 'JPEG, I think. It ends in .jpg.']],
		subjects: ['Photo too big?', 'Says my image is over 5 MB but it isn’t', 'Can’t upload picture', 'Upload error', 'Can’t post my photo'],
		open: [
			'I’m trying to put up the poster for {event}. It’s a JPEG of {size} according to my computer, and the help page says images can be up to 5 MB, but the app says “Images can be at most 5 MB.” Am I missing something?',
			'Every photo I take with my new phone gets rejected as too big. They’re about {size} each. My old phone was fine.',
			'I can’t post anything with a photo any more. It says the image is too large. I’ve checked, and the file is only {size}.'
		],
		more: ['I’ve tried three different photos.', 'It’s the first time this has happened to me.'],
		ask: [
			'Thanks for the details. Could you tell me which app you’re using and roughly when you last tried? I’d like to look at what happened to the upload.',
			'That does sound wrong. When did you last try, and on which device? I’ll check what we received.'
		],
		paths: [
			{
				detail: ['The {platform} app, at about {hhmm} on the day I wrote to you.', 'On my {device}, just before I wrote to you.'],
				look: ['Confirmed. The size check runs on the upload as the app sends it, which is about a third bigger than the photo itself, so anything over roughly 3.7 MB is turned away. Fix is on our list.'],
				lookWho: 'w',
				lookPaste: 'uploads413',
				ends: [[['a', 'You’ve found a bug: the limit is being applied to the photo after the app has packaged it for sending, which makes it about a third bigger, so photos over about 3.7 MB are turned away even though the limit is 5 MB. The API team are fixing it. Until then, a photo under about 3.5 MB goes through; most phones can share a smaller copy.'], ['c', 'Shared it at a smaller size, {small}, and it went straight up. Thanks for explaining!']]],
				happy: true
			},
			{
				detail: ['The {platform} app, yesterday evening. I don’t know how to make photos smaller, and I shouldn’t have to.'],
				look: ['Same as the others: photos between about 3.7 and 5 MB are turned away because of how the size is counted. Fix is with the API team; no date.'],
				lookPaste: 'uploads413',
				ends: [[['a', 'You’re right, you shouldn’t have to: the limit is being counted wrongly, so photos over about 3.7 MB are turned away although the limit is 5 MB. The API team are fixing it, and I’ll let you know as soon as it’s done.'], ['c', 'Thanks. I’ll wait for the fix then.']]]
			},
			{
				opens: [0, 2],
				detail: ['On the {platform} app, at about {hhmm} on the day I wrote. It’s a scan of our printed poster.'],
				look: ['This one really is over: the scan is {big}. Nothing wrong at our end.'],
				lookPaste: 'uploadsBig',
				ends: [[['a', 'I’ve looked, and this file really is too big: the scan is {big}, over the 5 MB limit. Scanning at a lower quality, or taking a photo of the poster with your phone, will give a much smaller file.'], ['c', 'Took a photo of it instead and it worked. Thanks!']]],
				happy: true
			}
		]
	},
	// iPhone photos in HEIC.
	{
		heard: ['{neighbour}, who has an Android phone, posts photos with no trouble at all.', 'My grandson had a look and said the photos are “a funny format”, but couldn’t say more.'],
		tried: ['I’ve tried different photos, old and new, and none of them will go.', 'I updated the app this morning in case that was it.'],
		background: ['I take lots of photos at {eventName} and the board is the obvious place to share them.', 'Screenshots go up fine, which makes it even more confusing.', 'I’ve tried turning the phone off and on again, which is my usual fix for everything.'],
		probe: [['Do photos other people have sent you, on WhatsApp for example, go up?', 'Yes, those seem to work.'], ['Are the photos ones you took with the phone’s own camera?', 'Yes, all of them.']],
		platforms: ['iPhone'],
		subjects: ['Photos from my iPhone won’t upload', 'Wrong image format?', 'Image error on iPhone', 'Can’t add a picture', 'PNG, JPEG, GIF or what?'],
		open: [
			'Whenever I try to add a photo from my iPhone to a post I get “Images must be PNG, JPEG, GIF or WebP.” They’re just normal photos from the camera!',
			'I can upload screenshots but not photos. The error says something about PNG and JPEG. I have no idea what format my photos are.',
			'Since I got a new iPhone I can’t add pictures to my posts about {group}. It worked on my old Android.'
		],
		more: ['I’m not technical, so please explain simply.', 'My husband’s phone has the same problem.'],
		ask: [
			'Thanks for writing. Could you tell me what kind of phone you have and which version of the Pinwheel app (it’s at the bottom of the Profile screen)?',
			'That error usually means the photo is in a format we can’t take yet. Which phone and app version are you using?'
		],
		paths: [
			{
				detail: ['{device}, app {app}.'],
				paste: 'appinfo',
				look: ['Uploads arriving as image/heic, which we don’t accept. Suggesting the camera setting.'],
				lookPaste: 'uploads415',
				ends: [[['a', 'iPhones save photos in a format called HEIC by default, which we can’t accept yet. You can change that on your phone: Settings, then Camera, then Formats, and choose “Most Compatible”. New photos will then upload fine.'], ['c', 'Changed it and the next photo uploaded straight away. Thank you!']]],
				happy: true
			},
			{
				detail: ['It’s an {device}, Pinwheel {app}.'],
				paste: 'appinfo',
				look: ['image/heic again. Apps team say they can convert photos on the phone before upload; asked when.'],
				lookPaste: 'uploads415',
				team: 'apps team',
				ends: [[['m', 'Converting HEIC to JPEG before upload is in 2.9, which should go out in December.'], ['a', 'Your phone saves photos as HEIC, a format we don’t accept yet. The apps team are adding a conversion so it just works, in the version due in December. Until then, choosing “Most Compatible” under Settings, Camera, Formats on your phone avoids the problem.'], ['c', 'I’d rather not change my camera settings, I’ll wait for the update.']]]
			},
			{
				detail: ['It’s an iPhone. Not sure which version of the app.'],
				look: ['Probably HEIC, but no uploads from {id} in the log this week. Asked which app version.'],
				lookPaste: 'none',
				ends: [[['a', 'Thanks. I can’t see any recent uploads from your account, so could you try once more and then send me the app version from the bottom of the Profile screen? That will tell me exactly what’s going on.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// Photos the wrong way up.
	{
		heard: ['{neighbour} said she has the same problem with her phone.', 'Someone posted asking whether I’d been standing on my head, which was funny the first time.'],
		tried: ['I tried rotating the picture before posting, but then it came out the other way.', 'I deleted the app and put it back on, which didn’t help.'],
		background: ['I’ve taken the photo again holding the phone the other way, and it still comes out wrong.', 'It’s a shame, because the photos of {eventName} were lovely.', 'My neighbour posts photos from the same kind of phone without any trouble, which is odd.'],
		probe: [['Do they look right when you open them in your phone’s Photos app?', 'Yes, perfectly normal there.'], ['Have you tried posting the same photo from a computer?', 'No, I only use my phone.']],
		platforms: ['iPhone', 'Android'],
		subjects: ['Photo is sideways', 'Picture upside down', 'Image rotated wrong', 'Why is my photo on its side?'],
		open: [
			'Every photo I post comes out on its side, although it looks right on my phone. The poster for {event} is now sideways and people have to tilt their heads.',
			'My photos are upside down on the board. Is it something I’m doing?',
			'I took a photo of the {groupShort} noticeboard and it shows sideways on Pinwheel but the right way up everywhere else.'
		],
		more: ['It only started recently.', 'I use the {platform} app.'],
		ask: [
			'Sorry about that. Which phone and app version are you on? And does it happen with every photo, or only some?',
			'Thanks for flagging it. Could you tell me your phone and app version, and whether the photos were taken in the Pinwheel app or chosen from your gallery?'
		],
		paths: [
			{
				detail: ['{device}, app {app}. Chosen from the gallery, every one of them.'],
				paste: 'appinfo',
				look: ['Rotation from the phone isn’t applied when photos come from the gallery. Known to apps.'],
				lookPaste: 'member',
				team: 'apps team',
				ends: [[['m', 'Known: gallery photos lose the phone’s rotation in {app}. Fixed in the next release.'], ['a', 'The apps team know about this one: photos chosen from the gallery lose their rotation in your version. It’s fixed in the next update. Until then, if you rotate the photo in your phone’s Photos app and save it, it comes out the right way.'], ['c', 'Rotating and saving works. Thanks.']]],
				happy: true
			},
			{
				opens: [1, 2],
				detail: ['{device}, {app}. Only some of them, it seems random.'],
				paste: 'appinfo',
				look: ['Can’t reproduce. Passed to apps with the member’s details.'],
				team: 'apps team',
				ends: [[['m', 'Need example photos to look at this; could the member send two that came out sideways?'], ['a', 'The apps team would like to look at a couple of examples. Could you reply with two of the photos that came out sideways, as attachments?'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// A photo that shows too much.
	{
		heard: ['A neighbour pointed it out to me, otherwise I wouldn’t have known.', '{neighbour} said she thought it should never have gone up in the first place.'],
		tried: ['I’ve reported the post in the app as well.', 'I looked for a way to contact the person who posted it, but there isn’t one.'],
		background: ['I’m not someone who complains, but this matters to me.', 'I don’t want to make a fuss with anyone, I’d just like it dealt with.', 'Lots of people look at the board, so I’d like it sorted soon.'],
		probe: [['Do you know roughly when it was posted?', 'Earlier this week, I think.'], ['Has the photo been shared anywhere else that you know of?', 'Not that I know of.']],
		subjects: ['Photo needs removing', 'Please take a photo down', 'Photo on the board', 'Remove a picture please'],
		open: [
			'Someone has posted a photo from {event} that shows my son’s face clearly. I didn’t give permission and I’m not happy about it. Can it be removed?',
			'A post about parking on {street} has a photo of my front door, with the house number and my car registration showing. I’d like it taken down.'
		],
		more: ['Please treat this as urgent.', 'It’s been up for a couple of days already.'],
		ask: [
			'Thanks for telling us. Could you let me know which post it is (the first words, or who posted it and when)? Our trust and safety team look at these quickly.',
			'Of course. Which post has the photo? I’ll get it looked at today.'
		],
		paths: [
			{
				opens: [0],
				detail: ['It was posted by {neighbourFull} on {wday}, starting “{snippet}”.'],
				look: ['Post {post} by {neighbourId}, photo shows a child clearly. Over to trust and safety.'],
				lookPaste: 'postsOther',
				team: 'trust and safety team',
				ends: [[['t', 'Removed {post} under the guideline on photos of children. Wrote to {neighbourId} to explain.'], ['T', 'Hello {first}, I’m {tnsFirst} from Pinwheel’s trust and safety team. I’ve removed the post with the photo and written to the person who posted it. Thank you for letting us know.'], ['c', 'Thank you, that was quick.']]],
				happy: true
			},
			{
				detail: ['It was posted by {neighbourFull}, I think on {wday}. It starts “{snippet}”.'],
				look: ['Post {post} by {neighbourId}. Passed to trust and safety.'],
				lookPaste: 'postsOther',
				team: 'trust and safety team',
				ends: [[['t', 'Asked {neighbourId} to take the photo down; they did within the hour and apologised.'], ['a', 'Our trust and safety team contacted the person who posted it, and they’ve taken the photo down and apologised. Thank you for letting us know.'], ['c', 'Thank you, that’s a relief.']]],
				happy: true
			},
			{
				opens: [1],
				snippets: ['This is what parking on {street} looks like every evening', 'Again! Blocking the pavement outside the shop on {street}'],
				detail: ['Posted by {neighbourFull}, I think on {wday}. It starts “{snippet}”.'],
				look: ['Post {post}: photo of a front door, number visible. Passed to trust and safety to decide.'],
				lookPaste: 'postsOther',
				team: 'trust and safety team',
				ends: [[['t', 'Photo shows the house number and a number plate. Asking the poster to replace it with one that doesn’t; will remove it if they don’t within two days.'], ['a', 'Our trust and safety team have asked the person who posted it to take it down and use a photo that doesn’t show your house or car. If they haven’t within two days, the team will remove it themselves.']]]
			}
		]
	},
	// A member with a blank name.
	{
		heard: ['{neighbour} asked me whether it was some kind of hacker.', 'Two people have already asked in the group who it is.'],
		tried: ['I tried tapping on the gap to see who it is, but the profile has no name either.', 'I’ve asked around in the group, and nobody seems to know.'],
		background: ['It’s been like it for a few days now.', 'On the board it just shows the post with a gap above it, which looks very odd.', 'I wondered at first whether it was a glitch on my phone, but my neighbour sees the same.'],
		probe: [['Does the gap show on every post, or only the recent ones?', 'Every one I’ve looked at.'], ['Is it the same on the web version?', 'Yes, I checked on the computer.']],
		subjects: ['Blank name on posts', 'No name showing', 'Name missing', 'Empty name on the board'],
		open: [
			'Someone has been posting on the board about {event} and there’s no name above their posts at all, just a blank. People are asking who it is. Is that allowed?',
			'My name has vanished from my posts. Above each one there’s just an empty space. I was changing my name to add my surname and I think I deleted it by mistake and pressed Save.',
			'There’s a member on our board with no name: their posts just show a gap where the name should be. One of our older members thinks it’s a scam. Can you look?'
		],
		more: ['It looks a bit sinister, to be honest.', 'I’d like to know before {day}.'],
		ask: [
			'Thanks for flagging it. Could you tell me which post or posts you mean? The first words are enough, and I’ll look up the account.',
			'Let me look into it. Which post is it? With that I can find the account and see what’s happened.'
		],
		paths: [
			{
				opens: [1],
				detail: ['It’s mine, starting “{snippet}”. I just want my name back.', 'One of mine, from {wday}: “{snippet}”.'],
				look: ['{id}’s name is set to spaces since {wday}. Put it back by hand. Profile updates accept a blank name; API team have that on their list.'],
				lookPaste: 'blankMember',
				extra: 'apiName',
				ends: [[['a', 'I’ve put your name back as {full}. What happened is that the name box was left with only spaces in it, and the app saved that. The API team are changing it so a blank name can’t be saved. If you want to add your surname in future, change the name and check it before saving.'], ['c', 'There it is again. Thank you so much.']]],
				happy: true
			},
			{
				opens: [0, 2],
				detail: ['It’s the post starting “{snippet}”, from {wday}.'],
				look: ['Post {post} is by {neighbourId}, whose name is blank since {wday}: the profile update accepted a name of spaces. Wrote to the member asking what name they’d like.'],
				lookPaste: 'blankOther',
				extra: 'apiNameOther',
				ends: [[['a', 'Nothing sinister: the member’s name was accidentally saved as blank when they edited their profile. I’ve written to them to ask what name they’d like. The API team are also changing things so that a blank name can’t be saved in the first place.'], ['c', 'That’s a relief. Thanks for checking.']]]
			},
			{
				opens: [0, 2],
				detail: ['I think it starts “{snippet}”, but there have been a few.'],
				look: ['{neighbourId} has a blank name. Can’t change another member’s name without asking them. Wrote to them; no reply yet.'],
				lookPaste: 'blankOther',
				ends: [[['a', 'It’s a real member whose name was saved as blank by mistake. I’ve written to them to ask what name they’d like shown, and I’ll let you know when it’s sorted.'], ['c', 'Thanks. Do keep me posted.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// Changing one's name.
	{
		heard: ['{neighbour} changed hers last month, so I know it can be done.', 'My neighbour said she thought it was under Settings, but it isn’t on mine.'],
		tried: ['I tried tapping on my name at the top of the board, but nothing happened.', 'I had a look in my phone’s settings for the app too.'],
		background: ['I’ve had a look round the app but the menus confuse me.', 'I’d also like to know whether changing it affects my old posts.', 'It’s a small thing, but it matters to me.'],
		probe: [['Would you like the change to show on your old posts too?', 'Yes, ideally on everything.'], ['Which device are you using?', 'My phone, mostly.']],
		apps: ['2.4.1', '2.5.0', '2.5.2'],
		platforms: ['iPhone', 'Android'],
		subjects: ['Change my name', 'Name change', 'How do I update my name?', 'Changing my name on the board'],
		open: [
			'I got married in the summer and I’d like my posts to show my new surname. How do I change it?',
			'Everyone knows me as {nick}, not {first}. Is it allowed to use a nickname on the board?',
			'I want to change the name on my profile but I can’t see where. I’ve looked under Settings.'
		],
		more: ['It’s not urgent.', 'I’m on the {platform} app.'],
		ask: [
			'You can change your name yourself: go to Profile, then Edit, change the name and press Save. Let me know if you don’t see the Edit button.',
			'Good question. Names can be changed under Profile, then Edit. Does that work for you?'
		],
		paths: [
			{
				opens: [0, 2],
				detail: ['Found it, thanks. Done.', 'Oh, it was there all along. Thank you.'],
				paste: 'none',
				look: ['{id} changed their name on {wday}. Nothing else needed.'],
				ends: [[['a', 'Glad that worked.'], ['c', 'Thanks again!']]],
				happy: true
			},
			{
				opens: [0, 2],
				detail: ['There’s no Edit button on my Profile screen. My app says {app}.'],
				paste: 'appinfo',
				look: ['{id} on an old app version without profile editing. Suggested updating.'],
				ends: [[['a', 'That version of the app is a little old and doesn’t have profile editing. If you update it from the app store, the Edit button appears on the Profile screen.'], ['c', 'Updated, and there it is. Name changed. Thanks.']]],
				happy: true
			},
			{
				opens: [1],
				detail: ['But is a nickname all right? I don’t want to break any rules.'],
				look: ['Nickname question. Asked the community team what we say.'],
				team: 'community team',
				ends: [[['g', 'Nicknames are fine as long as they’re a name people know you by, not a business or a joke.'], ['a', 'A nickname is fine, as long as it’s what people know you by. Change it under Profile, then Edit.'], ['c', 'Lovely, thanks. I’m {nick} now.']]]
			}
		]
	},
	// Profile photos.
	{
		heard: ['{neighbour} says she’d recognise more people if there were photos.', 'Several of our older members have asked me who people are from their names alone.'],
		tried: ['I tried tapping the space next to my name, but nothing happened.', 'I looked through the settings on my phone and on the computer.'],
		background: ['On other apps I can put a little photo by my name, and it helps people recognise me.', 'Our street has a lot of people with the same first name, so it gets confusing.', 'I’m not very good with these things, so it may be there and I’ve missed it.'],
		probe: [['Are you using the app or the web version?', 'The app on my phone.'], ['Is it so people recognise you, or for something else?', 'Mostly so people know who I am.']],
		subjects: ['Profile picture?', 'Photo on my profile', 'Avatar', 'Profile photo question'],
		open: [
			'How do I add a profile picture? I can’t find the option.',
			'I tried to add a photo of myself to my profile and it ended up as a post on the board instead! Can you take it down and tell me how to do it properly?',
			'Would it be possible to have profile photos? With a hundred people on the board it’s hard to know who’s who.'
		],
		more: ['Everyone else seems to manage, so I feel silly asking.', 'I’ve looked under Settings and Profile.'],
		ask: [
			'Profiles don’t have photos at the moment: just your name and a short bio. Is there something in particular you were hoping to do?',
			'Thanks for asking. There aren’t profile photos yet. What were you trying to do?'
		],
		paths: [
			{
				opens: [0, 2],
				detail: ['Just to have a photo, like on other apps. Will it come?'],
				look: ['Profile photos: on the list for the API team and apps team together. No date.'],
				ends: [[['a', 'Profile photos are on the list for the API and apps teams, and I’ve added your vote, but I don’t have a date yet.'], ['c', 'OK, I’ll keep an eye out.']]]
			},
			{
				opens: [1],
				snippets: ['Hello everyone, this is me so you know who I am', 'Me at the summer fair, trying out my profile photo'],
				detail: ['The photo of me went up as a post on {wday}, it starts “{snippet}”. Please remove it.'],
				look: ['Post {post}, a selfie with a short caption. Removed.'],
				lookPaste: 'posts',
				ends: [[['a', 'I’ve removed that post. Profiles don’t have photos yet, which is why it went on the board instead. If you’d like people to recognise you, you could mention your street or group in your bio.'], ['c', 'Thanks for sorting it. I’ll add my street to my bio.']]],
				happy: true
			}
		]
	},
	// What other members see.
	{
		heard: ['A friend told me someone on another site found her address from her profile, so I’m nervous.', '{neighbour} told me she could see my bio, and I wasn’t sure what was in it.'],
		tried: ['I tried looking at my own profile, but I wasn’t sure whether others see the same.', 'I read the help pages but didn’t find an answer.'],
		background: ['I had a bad experience on another site where my details were passed around, so I’m cautious.', 'My son filled in the profile and I’m not sure what he put.', 'I’d just like to understand it before I post anything.'],
		probe: [['Do you know what’s in your bio at the moment?', 'Not exactly, I haven’t looked properly.'], ['Are you using the app or a computer?', 'The app.']],
		subjects: ['Who can see my profile?', 'Can people see my email?', 'What do others see?', 'Profile question'],
		open: [
			'I’ve just joined and I’m a bit nervous about what other people can see. Can everyone on the board see my email and where I live?',
			'A neighbour said she could see things about me on Pinwheel. What exactly is shown on my profile?',
			'Before I put my details in, I’d like to know who sees them. My bio has my phone number in it, should it?'
		],
		more: ['I’m quite careful about these things.', 'My son set it up for me.'],
		ask: [
			'Good question. Other members see your name and your bio, and any posts you make. Your email is never shown. Is there anything on your profile you’d like to change?',
			'Thanks for asking. Members can see your name, bio and posts. We never show your email. Shall I look at your profile with you?'
		],
		paths: [
			{
				opens: [2],
				detail: ['That’s reassuring. And the phone number in my bio?'],
				look: ['{id}: bio contains a phone number. Suggested removing it.'],
				ends: [[['a', 'Your bio is visible to every member, so I’d take your phone number out unless you’re happy for anyone on the board to have it. You can edit your bio under Profile, then Edit.'], ['c', 'I’ve taken it out. Thank you for explaining.']]],
				happy: true
			},
			{
				opens: [1],
				detail: ['Please look, yes. My neighbour said she could see my address.'],
				look: ['{id}: bio says “{street}, number {houseNo}”. That’s what the neighbour saw.'],
				ends: [[['a', 'I’ve found it: your bio includes your street and house number, which is what your neighbour saw. You can take the number out under Profile, then Edit. Your email isn’t shown anywhere.'], ['c', 'My son must have put that in. I’ve removed it, thanks.']]]
			},
			{
				opens: [0],
				detail: ['I’d like to look myself first and come back to you.'],
				look: ['Nothing unusual on {id}’s profile.'],
				ends: [[['a', 'Of course. Take your time and reply here if anything looks wrong.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// Harassment.
	{
		heard: ['{neighbour} said she’s seen the posts too and thinks they’re out of order.', 'A couple of members have told me they’ve stopped posting because of it.'],
		tried: ['I’ve reported the posts in the app, but I don’t know whether anyone has seen the reports.', 'I’ve kept a note of the dates and what was said.'],
		background: ['It’s been going on for a few weeks now.', 'I’ve tried to ignore it, but people have started talking about it.', 'I don’t want to make it worse by replying on the board.'],
		probe: [['Have you reported the posts in the app as well?', 'Yes, a couple of them.'], ['Is anyone in danger, or has anything happened away from the board?', 'No, nothing like that. It’s just the posts.']],
		snippets: ['Whoever leaves their bins out all week on {street} should be ashamed', 'Some people on this street think the rules don’t apply to them', 'Funny how the same car is always parked across the dropped kerb', 'Not again. The same group announcing the same thing nobody asked for'],
		subjects: ['Complaint about a member', 'Nasty posts', 'Being targeted', 'Unpleasant posts about me', 'Please do something'],
		open: [
			'One member, {neighbourFull}, keeps posting about me. Last week it was about my bins, this week about my car, and now about my children. I feel like I’m being targeted. What can you do?',
			'{Iam}, and one person keeps posting rude comments about our group every time we announce something. Several members have asked me to do something.',
			'I don’t want to make a fuss, but {neighbourFull} has posted things about me that aren’t true and I’m upset. I’ve reported the posts in the app but nothing has happened.'
		],
		more: ['I’ve kept screenshots.', 'It’s making me not want to use the board at all.'],
		ask: [
			'I’m sorry you’re dealing with this. Could you point me to the posts (the first few words, or roughly when they went up)? Our trust and safety team will look at them.',
			'Thank you for telling us, and I’m sorry. Which posts do you mean? I’ll pass them to our trust and safety team today.'
		],
		paths: [
			{
				opens: [0, 2],
				detail: ['The latest started “{snippet}”, posted on {wday}. There are others before it.'],
				look: ['{neighbourId}: {reports} reports in a fortnight, posts about one neighbour. Passed to trust and safety.'],
				lookPaste: 'reportsOther',
				team: 'trust and safety team',
				ends: [[['t', 'Removed four posts by {neighbourId} under the guideline on posts about individuals; final warning sent.'], ['T', 'Hello {first}, I’m {tnsFirst} from trust and safety. I’ve removed the posts about you and given the member a final warning. If anything else like this appears, report it and it will come straight to us.'], ['c', 'Thank you. I feel much better.']]],
				happy: true
			},
			{
				opens: [1],
				detail: ['They come every time we post. The last was on {wday}, just after our notice about {eventName}, starting “{snippet}”.'],
				look: ['Rude posts after each group announcement. {reports} reports. Over to trust and safety.'],
				lookPaste: 'reportsOther',
				team: 'trust and safety team',
				ends: [[['t', 'Read them all. They’re rude about the group’s decisions but don’t break the guidelines: no threats, nothing about individuals. No action. Will keep watching.'], ['T', 'Hello {first}, I’m {tnsFirst} from trust and safety. I’ve read the posts. They’re critical of the group, sometimes rudely, but they don’t break the board’s guidelines, so we won’t remove them. We’ll keep an eye on things, and please report anything that becomes personal.'], ['c', 'Disappointing, but I understand. We’ll report anything personal.']]]
			},
			{
				opens: [0, 2],
				detail: ['There are lots. {neighbourFull} posted the latest one on {wday}.'],
				look: ['{reports} reports against {neighbourId} this month. Passed to trust and safety; they’re reviewing the history.'],
				lookPaste: 'reportsOther',
				team: 'trust and safety team',
				ends: [[['a', 'I’ve passed everything to our trust and safety team. They’re reading back through the member’s posts, which takes a little time, and will write to you directly with what they decide.'], ['c', 'Thank you. I’ll wait to hear.'], ['t', 'Reviewing {neighbourId}’s posts since August. Will reply to the member by Friday.']]]
			}
		]
	},
	// Spam and adverts.
	{
		heard: ['{neighbour} said she nearly fell for one of the offers.', 'Several members have told me they’re thinking of leaving the board because of it.'],
		tried: ['I’ve reported several of the posts in the app.', 'I tried to find a way to hide them, but there isn’t one.'],
		background: ['It started a couple of days ago, and it’s getting worse.', 'Our board is meant for neighbours helping each other, not for selling.', 'I don’t mind the odd local advert, but this is too much.'],
		probe: [['Have you had any messages from the account directly?', 'No, it just posts.'], ['Roughly how many posts are we talking about?', 'Too many to count.']],
		subjects: ['Spam on the board', 'Adverts everywhere', 'Someone selling things', 'Is this allowed?', 'Business posting'],
		open: [
			'A new member has posted the same advert for gutter cleaning about ten times today. Can you remove them? It’s drowning out everything else.',
			'Is it allowed for businesses to advertise on the board? Someone keeps posting offers for their takeaway, and some people are annoyed.',
			'There’s an account posting “earn money from home” messages. It looks like a scam and some of our older members might fall for it.'
		],
		more: ['I’ve reported them in the app.', 'I don’t want to be a killjoy, but it’s every day.'],
		ask: [
			'Thanks for letting us know. Which account is it? The name shown on the posts is enough.',
			'Sorry about that. Could you tell me the name on the posts, and roughly when they went up?'
		],
		paths: [
			{
				opens: [0],
				snippets: ['Gutters cleared from £30, call today, no job too small', 'Gutter and roof cleaning, best prices in town, call now'],
				detail: ['The name is “{spammer}”. The posts started this morning.'],
				look: ['Account joined today, {count} posts of the same advert. Passed to trust and safety.'],
				lookPaste: 'reportsNew',
				team: 'trust and safety team',
				ends: [[['t', 'Closed the account and removed its posts.'], ['a', 'Our trust and safety team have closed the account and removed all its posts. Thanks for reporting it.'], ['c', 'Gone already. Thank you!']]],
				happy: true
			},
			{
				opens: [1],
				snippets: ['Two pizzas for £12 every Tuesday, collection only', 'Free garlic bread with every order over £15 this week'],
				detail: ['It’s the takeaway on {street}, posting as {neighbourFull}. About twice a week.'],
				look: ['A local business posting offers twice a week. Asked the community team about the guidelines.'],
				lookPaste: 'postsOther',
				team: 'community team',
				ends: [[['g', 'Local businesses may post once a week, and it has to be a real local offer. Twice a week is over; I’ll write to them.'], ['a', 'Local businesses are allowed to post once a week, as long as it’s a genuine local offer. This one has been posting more than that, so our community team have written to them to explain.'], ['c', 'That seems fair. Thanks.']]]
			},
			{
				opens: [2],
				snippets: ['Earn £500 a week from home, message me to find out how', 'Work from your sofa and earn more than your boss, ask me how'],
				detail: ['The account calls itself “{scammer}”. There are a lot of posts.'],
				look: ['Scam-looking account. {count} posts, {reports} reports. Trust and safety looking now.'],
				lookPaste: 'reportsNew',
				team: 'trust and safety team',
				ends: [[['t', 'Account closed; posts removed. Blocked the email it signed up with.'], ['a', 'That account has been closed and its posts removed. Well spotted, and thank you for looking out for your members.']]]
			}
		]
	},
	// A post removed after reports.
	{
		heard: ['{neighbour} told me she saw the post before it went, and she didn’t think there was anything wrong with it.', 'A neighbour asked me why I’d deleted it, and I hadn’t.'],
		tried: ['I’ve checked my email, including the junk folder, and there’s nothing from you about it.', 'I looked for it under my profile and it’s not there either.'],
		background: ['It took me a while to write and I was careful with my words.', 'Several neighbours agreed with me, so I don’t understand who would object.', 'If there’s a rule I broke, I’d like to know what it is.'],
		probe: [['Did you get any email from us about it?', 'No, nothing at all.'], ['Do you remember whether anyone responded to it?', 'A few people posted afterwards agreeing.']],
		snippets: ['The people at number 12 have let their hedge grow over the path again', 'Look at the state of the play area on {street} again', 'Whoever lets their dog foul the path by the school, we know who you are', 'Has anyone else noticed the council has done nothing about'],
		subjects: ['My post has gone', 'Why was my post deleted?', 'Post disappeared', 'Censorship?', 'Missing post'],
		open: [
			'My post from {wday} has disappeared. I didn’t delete it. Who did, and why?',
			'I posted on {wday} about something that’s been bothering the whole street, and now it’s gone. Was it removed? Nobody told me.',
			'Why has my post been taken down? It was a perfectly reasonable complaint.'
		],
		more: ['I’d like an explanation.', 'Other people post much worse.'],
		ask: [
			'Let me find out what happened. Could you tell me roughly when you posted it and how it started?',
			'Sorry for the confusion. I’ll look into it. When did you post it?'
		],
		paths: [
			{
				detail: ['On {wday}. It started “{snippet}”.'],
				look: ['Post {post} removed by trust and safety after {reports} reports: it named a neighbour.'],
				lookPaste: 'reportsSelf',
				team: 'trust and safety team',
				ends: [[['T', 'Hello {first}, I’m {tnsFirst} from trust and safety. Your post was removed because it named a neighbour and accused them directly, which the guidelines don’t allow. You’re welcome to post about the problem itself without naming anyone. We should have told you when we removed it, and I’m sorry we didn’t.'], ['c', 'Fair enough, I hadn’t thought of it like that. I’ll repost without the name.']]]
			},
			{
				detail: ['It was on {wday}, starting “{snippet}”. I don’t see what was wrong with it.'],
				look: ['Post {post} removed automatically after three reports. On reading it, it doesn’t break the guidelines. Asked trust and safety to review.'],
				lookPaste: 'reportsSelf',
				team: 'trust and safety team',
				ends: [[['t', 'Reviewed. Reports were from people who disagreed, not a breach. Restored {post}.'], ['a', 'Our trust and safety team have looked at it again and agree it doesn’t break any rules. It was taken down automatically after several reports, and it’s now back on the board. Sorry for the trouble.'], ['c', 'Thank you. I appreciate you looking again.']]],
				happy: true
			},
			{
				detail: ['A few days ago. I can’t remember the exact words.'],
				look: ['Two posts by {id} removed after reports this week. Need to know which one the member means.'],
				lookPaste: 'reportsSelf',
				ends: [[['a', 'I can see two of your posts were removed this week. Could you tell me which one you mean, roughly what it was about? Then I can tell you why and whether it can go back up.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// Someone pretending to be somebody else.
	{
		heard: ['{neighbour} rang me to ask why I’d posted it, which is how I found out.', 'Members have been messaging me all morning asking what’s going on.'],
		tried: ['I’ve reported the account in the app.', 'I posted to say it isn’t me, but I don’t know how many people saw it.'],
		background: ['I only found out because a neighbour asked me about something I’d never said.', 'We’ve worked hard to build trust, and this undoes it.', 'It’s very upsetting, and I don’t know who would do this.'],
		probe: [['Do you have any idea who might be behind it?', 'Not really.'], ['Has the account contacted anyone, as far as you know?', 'Not that I know of. Just posts.']],
		subjects: ['Fake account', 'Impersonation', 'Account pretending to be someone else', 'This account isn’t real'],
		open: [
			'Someone has made an account with my name, {full}, and is posting as if they were me, about {group}. People think it’s me! Please remove it.',
			'There’s an account called “{groupShort}” that isn’t ours. It posted that {event} was cancelled, which it isn’t. Help!',
			'I’ve just noticed a second {full} on the board, and it isn’t me. It’s posting odd things.'
		],
		more: ['I’m very worried about this.', 'Please act quickly.'],
		ask: [
			'That’s worrying, and thank you for telling us quickly. Could you point me to one of its posts? Our trust and safety team will look today.',
			'I’m sorry. Which posts are from the other account? The first words of one are enough.'
		],
		paths: [
			{
				opens: [0, 2],
				snippets: ['Hello all, new bank details for subscriptions below', 'Important: please send donations to the new account below', 'Can anyone lend me £50 until Friday, will pay back'],
				detail: ['It posted this morning, starting “{snippet}”.'],
				look: ['Account joined {wday}, same name as {id}, posts about the group. Passed to trust and safety.'],
				lookPaste: 'reportsNew',
				team: 'trust and safety team',
				ends: [[['t', 'Closed the copycat account; removed its posts.'], ['a', 'Our trust and safety team have closed the other account and removed its posts. If you see anything like it again, let us know straight away.'], ['c', 'Thank you so much.']]],
				happy: true
			},
			{
				opens: [1],
				snippets: ['Message from the committee: due to unforeseen circumstances {eventName} is cancelled', 'Sorry everyone, {eventName} is cancelled this time'],
				detail: ['The cancellation post, starting “{snippet}”.'],
				look: ['Account named after the group, joined {wday}. Over to trust and safety.'],
				lookPaste: 'reportsNew',
				team: 'trust and safety team',
				ends: [[['t', 'Turns out it’s a former committee member who set it up last year. Asked them to stop using the group’s name; they agreed and changed it. Cancellation post removed.'], ['T', 'Hello {first}, I’m {tnsFirst}. The account belongs to a former member of your committee. They’ve agreed to change its name, and I’ve removed the post about the cancellation. You may want to post that {event} is still on.'], ['c', 'Oh, I know who that will be. Thanks for sorting it. I’ve posted that it’s still on.']]]
			}
		]
	},
	// Times an hour out after the clocks went back.
	{
		heard: ['{neighbour} thought I’d posted at midnight and asked whether I was all right.', 'Someone turned up an hour late to a pick-up because of the time on a post.'],
		tried: ['I’ve restarted my phone and checked that its clock is set automatically.', 'I checked with a friend on another phone and hers is the same.'],
		background: ['It’s confusing when someone posts that they’re leaving something out “now” and the post says an hour later.', 'I checked my phone settings and the time zone is right.', 'Everything else on my phone shows the right time.'],
		probe: [['Are the dates right, or only the times wrong?', 'The dates are fine, it’s just the hour.'], ['Did you notice it before the clocks changed?', 'No, it was fine before.']],
		since: 55,
		until: 70,
		apps: ['2.8.0', '2.8.1'],
		platforms: ['iPhone', 'Android'],
		subjects: ['Times are wrong', 'Post times an hour out', 'Clock wrong on the board', 'Why does it say 3pm?'],
		open: [
			'Since the clocks went back, every post on the board shows the wrong time: an hour later than it really was. My post from 2pm says 3pm. Is it my phone?',
			'The times on the board have gone funny. People think I posted in the middle of the night!',
			'Something’s wrong with the times. A post my neighbour made at breakfast shows as 09:15 when it was 08:15.'
		],
		more: ['My phone’s clock is right.', 'It’s confusing people about when things are happening.'],
		ask: [
			'Thanks for flagging it. Which app are you on, and which version (it’s at the bottom of the Profile screen)?',
			'Sorry about that. Could you send me the app version from the bottom of your Profile screen?'
		],
		paths: [
			{
				until: 63,
				detail: ['{device}, Pinwheel {app}.'],
				paste: 'appinfo',
				look: ['Known: 2.8.0 and 2.8.1 show times in summer time after the clocks went back. Fixed in 2.8.2, out on Wednesday 4 November.'],
				lookWho: 'm',
				lookPaste: 'none',
				team: 'apps team',
				ends: [[['a', 'It’s not your phone: the app is still showing summer time since the clocks went back. The apps team have fixed it in the next update, 2.8.2, due on Wednesday 4 November. Once it’s out, update the app and the times will be right.'], ['c', 'Good to know it isn’t my phone. I’ll update when it comes out.']]]
			},
			{
				until: 63,
				detail: ['It’s the {platform} app, {app}.'],
				paste: 'appinfo',
				look: ['Same as the others: the summer time bug in {app}. Fix is in 2.8.2, in review with the app stores.'],
				lookWho: 'm',
				lookPaste: 'none',
				team: 'apps team',
				ends: [[['a', 'The apps team know about it: since the clocks went back, the app shows times an hour ahead. The fix is in the next version, which is going through the app stores now. I’ll write when it’s available.'], ['c', 'Thanks. Is there anything I can do in the meantime?'], ['a', 'Only to remember that the dates are right and the times are an hour ahead. Sorry for the bother.']]]
			},
			{
				since: 64,
				detail: ['{device}, Pinwheel {app}.', 'The {platform} app. It says {app} at the bottom.'],
				paste: 'appinfo',
				look: ['{app} has the summer time bug; 2.8.2, out since Wednesday 4 November, fixes it. Member hasn’t updated.'],
				lookPaste: 'none',
				ends: [[['a', 'Your version of the app still shows summer time since the clocks went back. The fix came out on Wednesday 4 November in version 2.8.2, so if you update the app from the app store, the times will be right.'], ['c', 'Updated and the times are right now. Thanks!']]],
				happy: true
			}
		]
	},
	// Android app crashing when choosing a photo.
	{
		heard: ['{neighbour} says hers does the same since the update.', 'My son had a look and couldn’t see anything wrong with the phone.'],
		tried: ['I’ve uninstalled the app and put it back on, but it still crashes.', 'I tried smaller photos and it still closes.'],
		background: ['It used to work fine. I posted photos of {eventName} a while ago without any trouble.', 'I’ve tried clearing some space and restarting the phone.', 'It’s only when I add a picture. Text posts work.'],
		probe: [['Does it happen with every photo, or only some?', 'Every photo from the gallery.'], ['Does the phone show any message when it closes?', 'It just closes and goes back to the home screen.']],
		until: 41,
		apps: ['2.7.3'],
		platforms: ['Android'],
		subjects: ['App crashes', 'Pinwheel keeps closing', 'Crash when adding a picture', 'App shuts down'],
		open: [
			'Every time I try to add a photo to a post, the app closes completely. I’ve restarted my phone twice.',
			'The Android app crashes the moment I choose a picture from my gallery. Posting without pictures works.',
			'Since the last update, Pinwheel shuts as soon as I tap the photo button. I need to post the poster for {event}!'
		],
		more: ['I have plenty of space on my phone.', 'My husband’s phone does the same.'],
		ask: [
			'Sorry about this. Could you tell me which phone you have and the app version from the bottom of the Profile screen?',
			'That sounds frustrating. Which phone and app version are you using?'
		],
		paths: [
			{
				until: 37,
				detail: ['{device}, version 2.7.3.'],
				look: ['Known crash in 2.7.3 with large gallery photos on Android. Fixed in 2.7.4, out on Friday 9 October.'],
				lookWho: 'm',
				lookPaste: 'crash',
				ends: [[['a', 'It’s a fault in that version of the app with large photos from the gallery. The apps team have fixed it in 2.7.4, out on Friday 9 October. Until then, taking the photo with the camera button inside the post screen usually works.'], ['c', 'Taking the photo from inside the app works. Thanks for the tip.']]],
				happy: true
			},
			{
				until: 37,
				detail: ['A {device}, 2.7.3.'],
				look: ['2.7.3 crash again. Fix in 2.7.4.'],
				lookWho: 'm',
				lookPaste: 'crash',
				team: 'apps team',
				ends: [[['a', 'The apps team have found the cause: large photos from the gallery crash this version. The fixed version, 2.7.4, should be in the Play Store by Friday 9 October. I’ll let you know when it’s there.'], ['c', 'OK, I’ll wait for Friday then. Thanks.']]]
			},
			{
				since: 38,
				detail: ['A {device}. It says 2.7.3.', '{device}, Pinwheel 2.7.3.'],
				look: ['Still on 2.7.3, which has the gallery crash. 2.7.4 has been out since Friday 9 October.'],
				lookPaste: 'crash',
				ends: [[['a', 'That version has a fault with large photos from the gallery. It’s fixed in 2.7.4, which has been in the Play Store since Friday 9 October, so updating the app should sort it.'], ['c', 'Updated and it works. Thank you.']]],
				happy: true
			}
		]
	},
	// A screen reader.
	{
		heard: ['Her support worker had a look as well and couldn’t find a way round it.', '{neighbour}, who helps her, says the buttons don’t say what they do.'],
		tried: ['We’ve tried turning the screen reader off and on, and restarting the phone.', 'We tried the computer version too, but it was just as hard to find the post button.'],
		background: ['Everything else on the phone works well with the screen reader.', 'We really want the board to work for everyone.', 'Reading posts is fine; it’s only adding one that goes wrong.'],
		probe: [['Is the screen reader the one built into the phone?', 'Yes, the built-in one.'], ['Does reading the board itself work, post by post?', 'Yes, reading is fine.']],
		platforms: ['iPhone', 'Android'],
		subjects: ['Screen reader', 'Accessibility', 'Screen reader problem', 'Can’t post with a screen reader'],
		open: [
			'I’m registered blind and use {reader} on my phone. I can read posts, but the button to make a new post just says “button”, and I can’t find where to type.',
			'{Iam}, and one of our members uses a screen reader. She says she can’t post on Pinwheel at all. Can someone help her?',
			'My father uses {reader} on his phone. He can hear the posts but can’t work out how to add one.'
		],
		more: ['Everything else on the phone works fine with it.', 'We’d really like to include everyone.'],
		ask: [
			'Thank you for telling us. Could you tell me the phone, the app version, and exactly where things stop making sense?',
			'Thanks for raising this. Which phone and screen reader are being used, and where does it go wrong?'
		],
		paths: [
			{
				detail: ['{device}, app {app}. The post button and the photo button both just say “button”.'],
				look: ['Unlabelled buttons on the post screen. Passed to apps.'],
				team: 'apps team',
				ends: [[['m', 'Confirmed: the new-post and photo buttons have no labels. Labels added for 2.9; can send a test build if wanted.'], ['a', 'The apps team have confirmed the buttons are missing their labels, and they’ve fixed it for the next version. They can send a test version to try sooner, if that would help.'], ['c', 'Yes please, that would be great.']]]
			},
			{
				opens: [1, 2],
				detail: ['I’ll get the details and come back to you.'],
				look: ['Waiting for details from the organiser.'],
				lookPaste: 'none',
				ends: [[['a', 'Thank you. When you have them, the phone, the app version and the point where she gets stuck will tell the apps team where to look.'], ['s', 'Automatic reminder sent to the member after five days without a reply.']]]
			}
		]
	},
	// Notifications.
	{
		heard: ['{neighbour} said she found out about the meeting from a poster on a lamp post.', 'Some of our members only check the board when someone tells them something is on it.'],
		tried: ['I’ve looked in my phone’s notification settings, and Pinwheel is allowed to send them.', 'I checked the app’s own settings too and couldn’t see anything.'],
		background: ['I’m only on the app once a week or so, and things move fast.', 'My neighbours were all at the meeting and I had no idea it was on.', 'I don’t want to be pinged every five minutes, just for important things.'],
		probe: [['Is it posts from one group you most want to hear about, or everything?', 'Mainly my group’s posts.'], ['Do you get other app notifications on your phone?', 'Yes, from WhatsApp and the like.']],
		subjects: ['No notifications', 'How do I get alerts?', 'Email me new posts?', 'Missed an important post'],
		open: [
			'I missed the post about {event} because I didn’t open the app that week. Is there a way to be told when something new is posted?',
			'Can Pinwheel email me a summary of new posts? I’m not one for checking apps.',
			'My phone never tells me about new posts. Have I turned notifications off somewhere?'
		],
		more: ['Most apps do this.', 'I’d hate to miss something important again.'],
		ask: [
			'There aren’t notifications for new posts at the moment, so it isn’t a setting you’ve missed. What would be most useful to you: a notification on your phone, or an email?',
			'Thanks for asking. Pinwheel doesn’t send notifications for new posts yet. Would an email summary or a phone alert suit you better?'
		],
		paths: [
			{
				detail: ['An email once a week would be perfect.', 'A notification on my phone, please.'],
				look: ['Another request for notifications. Apps team have them planned; added the vote.'],
				team: 'apps team',
				ends: [[['m', 'Push notifications are planned for the new year. Weekly email is on the list but further off.'], ['a', 'The apps team are planning notifications for the new year, and I’ve added your request. Until then, checking the board once a day is the surest way not to miss anything.'], ['c', 'I’ll set myself a reminder. Thanks.']]]
			},
			{
				detail: ['Either. I just want to know when my group posts.'],
				look: ['Notifications request, specifically for one group’s posts. Noted for apps.'],
				ends: [[['a', 'Notifications aren’t available yet. In the meantime, some groups ask a member to text round when there’s something important. I’ve passed your request on.'], ['c', 'We do have a phone tree, I’ll ask them to use it for big announcements.']]]
			}
		]
	},
	// A copy of one's data, or deleting one's account.
	{
		heard: ['A friend told me I had the right to ask, so I’m asking.', 'I’ve done the same with a few other services this month.'],
		tried: ['I couldn’t find a way to do this myself in the app.', 'I looked for a form on the website but couldn’t find one.'],
		background: ['I’m tidying up my accounts across lots of sites.', 'I’d like to see what has been kept about me over the months.', 'Please confirm in writing.'],
		probe: [['Is there anything in particular you’re looking for?', 'No, just everything.'], ['Would you like the reply to come to this email?', 'Yes, this one.']],
		subjects: ['My data', 'Copy of everything you hold', 'Delete my account', 'Data request'],
		open: [
			'Please send me a copy of all the information Pinwheel holds about me.',
			'I would like my account deleted and all my details removed. I’m leaving the area.',
			'Under data protection law I’d like to know what you store about me and who you share it with.'
		],
		more: ['Please confirm when this has been done.', 'I’d like it by email.'],
		ask: [
			'Of course. Requests like this go to our data protection lead, Martin. Could you confirm the email on your account, so we know we’re dealing with the right one?',
			'Thanks. I’ll pass this to Martin, who handles data requests. Is the email you’re writing from the one on your account?'
		],
		paths: [
			{
				opens: [0],
				detail: ['Yes, it’s {email}.'],
				look: ['{id} on {email}. Passed to Martin.'],
				lookWho: 'n',
				team: 'data protection team',
				ends: [[['D', 'Hello {first}, Martin here. I’ve attached a copy of everything we hold about your account: your profile, your posts and photos, and the dates you signed in. We don’t share it with anyone. Let me know if you have questions.'], ['c', 'Thank you, that’s very clear.']]],
				happy: true
			},
			{
				opens: [1],
				detail: ['Yes, {email}. Please delete everything.'],
				look: ['{id} asking for deletion. Passed to Martin.'],
				lookWho: 'n',
				team: 'data protection team',
				ends: [[['d', 'Deleting {id}. Posts removed, profile deleted, sign-in records anonymised. Done.'], ['D', 'Hello {first}, your account and details have now been deleted. Thank you for being part of the board.'], ['c', 'Thank you.']]]
			},
			{
				opens: [2],
				detail: ['It’s {email}. Who do you share it with, though?'],
				look: ['Passed to Martin. Member asking about sharing.'],
				lookWho: 'n',
				team: 'data protection team',
				ends: [[['d', 'Will prepare the copy this week. We share nothing beyond our hosting provider.'], ['a', 'Martin is preparing a copy of what we hold and will send it to you within the month. On sharing: we don’t share your details with anyone, apart from the company that hosts the board for us.'], ['c', 'Good to know. I’ll look out for it.']]]
			}
		]
	},
	// New posts somewhere else.
	{
		heard: ['Our older members keep asking for the board “on paper or on the website”.', '{neighbour}, who builds our website, says it would save her a lot of copying.'],
		tried: ['We’ve tried copying the posts by hand into our newsletter, but it takes hours.', 'We’ve looked in the app’s settings for anything like this, and asked other organisers.'],
		background: ['Our volunteer who does the copying is lovely, but it takes her an hour every evening.', 'Not everyone in our area has a smartphone, and some won’t ever join an app.', 'We’ve been asked about this at the last two meetings.'],
		probe: [['Which kinds of posts would matter most: events, lost and found, everything?', 'Events mostly, but everything would be easiest.'], ['Roughly how many people would see them there?', 'A couple of hundred, I’d guess.']],
		subjects: ['New posts outside Pinwheel?', 'Sharing posts outside the app', 'Question about new posts', 'Getting posts from the board'],
		open: [
			'{Iam}. We have our own website, and we’d love the latest posts from the board to appear on it, so people who aren’t on Pinwheel still see them. At the moment one of our volunteers copies them over by hand every evening. Is that possible?',
			'Our community centre has a big screen in the foyer, and we’d like it to show what’s new on the board. Is there a way?',
			'I put together a weekly email newsletter for {street}, and half of it is me copying posts from the board. Could Pinwheel send me the new posts somehow, so I don’t have to retype them?'
		],
		more: ['It would save us hours.', 'Lots of our older members aren’t on the app.'],
		ask: [
			'Thanks, that’s a lovely idea. Could you tell me a little more about what you’d need: all the posts, or only some, and how quickly?',
			'Good question. Which posts would you want, and how often?'
		],
		paths: [
			{
				opens: [0, 2],
				detail: ['Ideally everything from our street, as soon as it goes up. Weekly would do at a push.', 'Just new posts, really, whenever they appear.'],
				look: ['Third group this month asking for something like this. On the API team’s list for this quarter, no date yet.'],
				lookWho: 'g',
				lookPaste: 'none',
				ends: [[['a', 'There isn’t a way to do this yet, but the API team are working on ways for groups to receive new posts in their own sites and tools, and I’ve added {groupShort} to the list of groups asking. I’ll let you know when there’s something to try.'], ['c', 'Brilliant, thank you. We’ll keep copying by hand until then.']]]
			},
			{
				opens: [1],
				detail: ['Everything, all day. It’s for the screen in the foyer.'],
				look: ['For a screen, the web app does the job. Suggested it.'],
				lookPaste: 'none',
				ends: [[['a', 'For a screen, the simplest option is to open the web app on the screen’s computer, signed in as one of your volunteers, and leave it on the board. Most browsers can show a page full-screen with F11.'], ['c', 'We tried it and it works well enough. Thanks!']]],
				happy: true
			},
			{
				opens: [2],
				detail: ['It’s for the council’s weekly bulletin as well, actually, so it’s quite a lot of posts.'],
				look: ['Council bulletin wanting board posts. That’s a partnership conversation; over to Rosa.'],
				lookPaste: 'none',
				team: 'community team',
				ends: [[['G', 'Hello {first}, I’m Rosa from Pinwheel’s community team. I look after our work with councils. Could we have a call next week about the bulletin? I’d like to understand what you need before we promise anything.'], ['c', 'Yes, happy to. I’m free on {day} afternoon.']]]
			}
		]
	},
	// A council or charity wanting a badge.
	{
		heard: ['Residents have asked us how they can tell our posts from someone pretending to be us.', 'A colleague in another area says their residents asked the same.'],
		tried: ['I’ve looked through the app and the help pages but can’t see anything about organisations.', 'We tried making an account in the organisation’s name, but it asked for a person’s name.'],
		background: ['At the moment people don’t know whether to trust posts that say they’re from us.', 'We used to use a mailing list, but most residents are on Pinwheel now.', 'Other groups have asked how they can tell genuine notices from fake ones.'],
		probe: [['Would the posts be updates only, or would you also answer questions?', 'Mostly updates.'], ['Does your organisation post anywhere else at the moment?', 'A newsletter and a noticeboard.']],
		subjects: ['Official account?', 'Verified badge', 'Council notices', 'Posting as an organisation'],
		open: [
			'I work for the council’s neighbourhood team, and we’d like to post updates about bin collections and road works. Can we have an official account, so people know it’s really us?',
			'We’re a registered charity, {group}, and we’d like a badge or something to show our posts are genuine.',
			'Can organisations have their own accounts on the board, or does it have to be a person?'
		],
		more: ['People are wary of fake accounts.', 'We have about five people who would post.'],
		ask: [
			'Thanks for getting in touch. Accounts belong to people at the moment, but our community team do work with councils and charities. Could you tell me a bit more about your organisation and what you’d post?',
			'Good question. Who would be posting, and roughly how often?'
		],
		paths: [
			{
				detail: ['A small team of us, a few times a week. Nothing controversial.'],
				look: ['Organisation asking for an official account. Passed to Rosa.'],
				lookPaste: 'none',
				team: 'community team',
				ends: [[['G', 'Hello {first}, Rosa here from the community team. We’re trying a “verified organisation” label with a few councils this winter. I’ll add you to the list and be in touch in December.'], ['c', 'Thanks, Rosa. That sounds good.']]]
			},
			{
				detail: ['Just me, to begin with. Once a week.'],
				look: ['One person, weekly. Suggested posting as themselves.'],
				lookPaste: 'none',
				ends: [[['a', 'For now, the best way is to post as yourself and say in your bio that you post for {groupShort}. Members tend to trust a real name.'], ['c', 'That works. I’ve updated my bio.']]]
			}
		]
	},
	// Young members.
	{
		heard: ['{neighbour} mentioned it to me, so I thought I’d better check.', 'Another parent asked me about it at the school gate.'],
		tried: ['I looked through the help pages but couldn’t find anything about ages.', 'I checked the sign-up screen and it doesn’t ask for a date of birth.'],
		background: ['I couldn’t find anything in the app about ages.', 'I want to keep everyone safe without being heavy-handed.', 'I’d like to get it right before it becomes a problem.'],
		probe: [['Is this about a particular account, or a general question?', 'A bit of both.'], ['Have you spoken to anyone else about this?', 'Only my partner.']],
		subjects: ['Age limit?', 'Young members', 'Teenagers on the board', 'Under 16'],
		open: [
			'My daughter is 14 and wants to post about her babysitting. Is she allowed to have an account?',
			'{Iam}, and some of our young players want to join the board. Is there an age limit?',
			'I think a child has joined the board. They’re posting about school. Is that allowed?'
		],
		more: ['I want to do the right thing.', 'I couldn’t find anything about it.'],
		ask: [
			'Thanks for asking. Members need to be 16 or over. Could you tell me a little more about the situation?',
			'Members must be 16 or older. Is there an account you’re concerned about?'
		],
		paths: [
			{
				opens: [0],
				detail: ['It’s my daughter. OK, I’ll post for her.'],
				look: ['Parent asking about a 14-year-old. Explained the age limit.'],
				lookPaste: 'none',
				ends: [[['a', 'Thanks for checking. Posting for her is fine. Just be careful not to share where she lives or her phone number on the board.'], ['c', 'Will do, thank you.']]]
			},
			{
				opens: [2],
				snippets: ['Does anyone know if the bus to the school is running tomorrow', 'Year 9 maths homework is so hard, can anyone help'],
				detail: ['The account is “{neighbourFull}”, posts about school and homework.'],
				look: ['Possible under-16 member. Passed to trust and safety.'],
				lookPaste: 'postsOther',
				team: 'trust and safety team',
				ends: [[['t', 'Account suspended pending confirmation of age. Wrote to the account’s email.'], ['a', 'Thanks for telling us. Our trust and safety team have suspended the account while they check the member’s age.'], ['c', 'Thanks for taking it seriously.']]]
			},
			{
				opens: [1],
				detail: ['Some of our players are 14 and 15. Their parents could post for them, I suppose.'],
				look: ['Organiser asking about young players. Explained the age limit.'],
				lookPaste: 'none',
				ends: [[['a', 'That’s the best way: members need to be 16 or over, so parents or coaches posting for the team works well. It’s worth keeping players’ surnames and photos off the board too.'], ['c', 'Understood, we’ll do it that way. Thanks.']]],
				happy: true
			}
		]
	}
];

// Asides in a first message, with support's answer to them.
const tangents: [string, string][] = [
	['Sorry if this is the wrong place to ask. I couldn’t find a phone number.', 'This is exactly the right place, so no need to apologise.'],
	['I should say I’m 81 and not very good with phones, so please keep it simple.', 'I’ll keep it as simple as I can, and do say if anything doesn’t make sense.'],
	['By the way, the board has been brilliant for our street. We found a lost tortoise through it last month!', 'And thank you, that’s lovely to hear. I’ve passed it on to the team.'],
	['I looked in the help pages first but couldn’t find anything.', 'Thanks for checking the help pages first; this one isn’t covered there yet.'],
	['Apologies for the long message, I wanted to give you everything.', 'Thanks for all the detail, it really helps.'],
	['Excuse any typos, I’m doing this on my phone at the bus stop.', 'No typos that I could see, and thanks for writing.'],
	['I’ve recommended Pinwheel to two other groups, so I hope you can sort this!', 'Thank you for recommending us, it means a lot.']
];
// A second matter raised on the way, the answer support gives in its next reply, and the member's thanks.
const sides: { q: string; a: string; then: string }[] = [
	{ q: 'Unrelated, but is there a way to make the text bigger in the app? My eyes aren’t what they were.', a: 'On text size: the app follows your phone’s own text size, so making it bigger in your phone’s display settings makes Pinwheel’s text bigger too.', then: 'The bigger text is much better, too.' },
	{ q: 'Also, can I see who has read my posts?', a: 'On who has read your posts: Pinwheel doesn’t record that, for you or anyone else.', then: '' },
	{ q: 'While I have you, is Pinwheel free? A neighbour asked me and I didn’t know what to say.', a: 'And yes, Pinwheel is free for members and for groups.', then: 'I’ll tell my neighbour it’s free.' },
	{ q: 'Is there a way to message another member directly?', a: 'On messaging: there’s no direct messaging on Pinwheel at the moment. Most people say in their post how they’d like to be contacted.', then: '' },
	{ q: 'Also my husband wants to join. Can we share my account?', a: 'On your husband: everyone needs their own account, so posts show who wrote them. He can sign up from the app with his own email.', then: 'My husband has signed up now too.' },
	{ q: 'The app asked me to update yesterday. Do I need to?', a: 'On the update: yes, please do. Each one fixes things, and older versions can stop working properly after a while.', then: 'And I’ve updated the app.' },
	{ q: 'Do you have a dark mode? The white screen is very bright at night.', a: 'On dark mode: the app follows your phone’s dark mode setting, so turning that on will switch Pinwheel too.', then: 'Dark mode is lovely, thank you.' },
	{ q: 'Is there a computer version? I’d rather type on a keyboard.', a: 'And yes, you can use Pinwheel in a web browser on a computer: sign in on the web app with the same email and password as on your phone.', then: 'I’m typing this on the computer version now!' },
	{ q: 'Can I hide my posts from people outside my street?', a: 'On who sees posts: everything on the board is seen by every member, so it’s best not to post anything you’d want to keep to your street.', then: '' },
	{ q: 'One more thing: my mum reads Polish better than English. Any plans for other languages?', a: 'On languages: the app is English only for now. The apps team have Welsh and Polish on their list, and I’ve added your vote.', then: '' },
	{ q: 'Also, how do I stop seeing posts from one person? They post constantly.', a: 'On hiding someone’s posts: there isn’t a way yet. If their posts break the board guidelines, report them and our trust and safety team will look.', then: '' },
	{ q: 'Lastly, can I schedule a post to go up on a particular day?', a: 'On scheduling: not at the moment, posts go up when you press Post.', then: '' },
	{ q: 'Was the board down on Saturday evening? Nothing would load.', a: 'On Saturday: you weren’t imagining it. The board was unavailable for about forty minutes while the API team moved to a new database, and it’s been fine since.', then: 'Good to know it wasn’t me on Saturday.' },
	{ q: 'Could you add a “like” button? People want to show support without writing a whole post.', a: 'On likes: there’s nothing like that yet, but the apps team keep a list of requests and I’ve added yours.', then: '' },
	{ q: 'How long do posts stay on the board?', a: 'On how long posts stay: until the person who posted them asks us to remove them. There’s no expiry.', then: '' },
	{ q: 'Is there a way to print the board for neighbours who aren’t online?', a: 'On printing: there’s no print view, but on the web app your browser’s print option works reasonably well for recent posts.', then: 'Printing from the computer worked, by the way.' },
	{ q: 'Is there a limit to how many photos I can post?', a: 'On photos: there’s no limit to how many, only to the size of each one, and they need to be PNG, JPEG, GIF or WebP.', then: '' },
	{ q: 'How do I change the email I sign in with?', a: 'On your email: the accounts team change those for now. Reply from the new email with the old one in the message and I’ll pass it on.', then: '' },
	{ q: 'Can a group have its own page on Pinwheel?', a: 'On group pages: not yet. Most organisers post as themselves and mention the group in the post.', then: '' },
	{ q: 'Also, someone told me there’s a Pinwheel for the next town over. Can I see their board too?', a: 'On other boards: each area’s board is separate, and you’d need to join that one with its own sign-up.', then: '' },
	{ q: 'By the way, the app is very slow on my old phone. Anything I can do?', a: 'On the slowness: closing the app fully and reopening it helps on older phones, as does keeping it updated.', then: 'It’s a bit quicker since I restarted it, too.' },
	{ q: 'Do you need my date of birth? The sign-up didn’t ask.', a: 'On your date of birth: we don’t need it. We only ask members to confirm they’re 16 or over.', then: '' }
];
// A second, smaller matter a member raises in passing: what they write, what support notes and pastes, what support
// answers, and the topics it would not fit.
const riders: { q: string; note: string; paste?: Paste; a: string; skip: string[] }[] = [
	{ q: 'While you’re there, my name only shows as “{first}”. Can you add my surname?', note: 'Also: {id}’s name is just “{first}”. They can change it themselves.', a: 'On your name: you can add your surname yourself under Profile, then Edit, and it will show on all your posts straight away.', skip: ['Change my name', 'Blank name on posts'] },
	{ q: 'Could you also take down my post about {item}? It’s gone now.', note: 'Also removed {post2} ({item}) as asked.', a: 'I’ve also taken down your post about {item}, as you asked.', skip: ['Please delete my post'] },
	{ q: 'Oh, and a photo I tried to add on {wday} was refused as too big, though it’s only {size}.', note: 'Also: the photo on {wday} hit the size problem (the limit is counted on the upload as sent, so anything over about 3.7 MB is turned away).', paste: 'uploads413', a: 'On the photo: that’s a known fault in how the size is counted, which the API team are fixing. A photo under about 3.5 MB will go through for now.', skip: ['Photo too big?', 'Photos from my iPhone won’t upload'] },
	{ q: 'Also, there’s an account posting adverts for driveway cleaning every day. Is that allowed?', note: 'Also passed the driveway advert account to trust and safety.', a: 'On the adverts: I’ve passed that account to our trust and safety team to look at.', skip: ['Spam on the board'] },
	{ q: 'Also, I’ve changed my email to {otherEmail}. Can you update it?', note: 'Email change asked for, to {otherEmail}. Needs a line from the new address first.', a: 'On your email: we can change it once we’ve heard from the new address. Could you send one line from {otherEmail}?', skip: ['Two accounts', 'Can’t sign in'] },
	{ q: 'My bio seems to have lost its line breaks, too. Is that normal?', note: 'Bio line breaks: the apps show the bio as one paragraph. On the apps team’s list.', a: 'On your bio: the app shows it as one paragraph at the moment, so line breaks don’t appear. The apps team know about it.', skip: ['Who can see my profile?'] },
	{ q: 'And why are the newest posts always at the bottom? I nearly missed a post about {event}.', note: 'Also the board order (oldest first). API team have it on their list.', a: 'On the order of the board: you’re right, it lists the oldest posts first at the moment. The API team are changing it so the newest come first.', skip: ['Board not updating'] },
	{ q: 'Oh, and one of my posts from {wday} went up twice. Could you remove the second one?', note: 'Also removed a duplicate, {post2}.', paste: 'apiDup', a: 'I’ve also removed the second copy of your post from {wday}.', skip: ['Duplicate post'] },
	{ q: 'Also, someone posted something unkind about my last notice. I’ve reported it.', note: 'Reported post by {neighbourId} passed to trust and safety.', a: 'On the unkind post: our trust and safety team have it now and will decide what to do.', skip: ['Complaint about a member', 'My post has gone', 'Please delete my post'] },
	{ q: 'Is there any way to add an event from a post to my calendar?', note: '', a: 'On calendars: not yet. Putting the date and time clearly in the post is the best way for now.', skip: [] },
	{ q: 'Sadly one of our members, {neighbourFull}, died last month. Her family have asked whether her account can be closed.', note: 'Bereavement: asked Martin to close {neighbourId} on the family’s behalf.', a: 'I’m so sorry to hear about {neighbour}. I’ve passed this to our data protection lead, Martin, who will close her account with care and may write to you about it.', skip: ['My data'] },
	{ q: 'Also, I can’t seem to post from my laptop. It just sits there after I press Post.', note: 'Also: no web posts from {id} at all this week; the browser may be blocking something. Asked for the browser name.', a: 'On posting from your laptop: which browser do you use? I can’t see any attempts from it on our side, which usually means the page never sent the post.', skip: [] }
];
const greetings = ['Hi', 'Hello', 'Hi there', 'Good morning', 'Morning', 'Hiya', 'Hello Pinwheel', 'Dear Pinwheel team', 'Good evening'];
const custSign = ['Thanks, {first}', 'Many thanks\n{full}', '{first}', 'Cheers, {first}', 'Best wishes,\n{full}\n{title}, {groupShort}', 'Thank you!\n{first}', 'Kind regards\n{full}', 'Thanks\n{first} ({id} on the board)'];
const footers = ['Sent from my iPhone', 'Sent from Outlook for Android', '{GroupShort} is run entirely by volunteers.', 'Please excuse brevity, sent from my phone.', 'Get Outlook for iOS'];
const agentSign = ['Best wishes,\n{signer}', '{signer}\nPinwheel member support', 'Thanks,\n{signer}', 'Kind regards,\n{signer} at Pinwheel', 'All the best,\n{signer}'];
const acks = ['Thanks for getting in touch.', 'Thanks for writing in.', 'Sorry to hear that.', 'Thanks for letting us know.', ''];
const closings = ['Let me know if anything isn’t clear.', 'Shout if you have any questions.', 'Do reply here if you need anything else.', 'Hope that helps.'];
const holding = [
	'Thanks. I’ve passed this to our {team} and will come back to you as soon as I hear from them.',
	'I’m checking this with our {team} and will update you here.',
	'Thanks for bearing with us. This is with our {team} now, and I’ll write again when I know more.',
	'Just to let you know I haven’t forgotten you: I’m waiting to hear back from our {team}.'
];
const chasers = ['Any news on this?', 'Just checking you got my last message.', 'Sorry to chase, but {event} is coming up.', 'It’s been a few days. Is there any news?', 'Any update? People keep asking me.', 'Is there anything I need to do in the meantime?'];
const surveys: [string, string][] = [['Great', 'Quick and friendly.'], ['Good', 'Sorted in the end, thanks.'], ['Great', '{agent} was brilliant.'], ['OK', 'Took a while but got there.'], ['Good', 'Clear answers.'], ['Great', 'Really helpful, thank you.'], ['Good', ''], ['Great', 'Lovely people.']];
const contexts = ['I’m not very techy, so bear with me.', 'I mostly use Pinwheel on my phone.', 'We use the board for nearly everything now.', 'I’ve lived on {street} for twenty years and the board has been a real help.', 'I joined in the summer when {neighbour} told me about it.', 'Our group has about {members} members on the board.'];
const situations = ['The timing isn’t great, as {eventName} is on {eventDay}.', 'I’d be grateful for a quick reply.', 'I’m away from {day} for a week, so ideally before then.', 'No rush, but I didn’t want to forget.', 'I’m around all day if it helps to talk it through.'];
const spammers = ['Gutter Pro Services', 'Driveway Kings', 'AllClean Exteriors', 'Roofline Repairs'];
const scammers = ['Quick Cash Today', 'Home Earner', 'Easy Money Mum', 'Sofa Income'];

// App releases, by the day they reached the app stores.
const releases: [number, string][] = [[-10, '2.6.2'], [24, '2.7.3'], [38, '2.7.4'], [49, '2.8.0'], [56, '2.8.1'], [64, '2.8.2']];
const appOn = (r: Rand, day: number) => {
	const current = releases.filter(([from]) => from <= day).length - 1;
	return releases[Math.max(0, current - (r() < 0.3 ? 1 : 0))]![1];
};

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});

/** Keeps a message inside the hours its writer works; Oriole's staff work 08:30 to 17:30 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 17 * 60 + 30) m = startOfDay(m) + DAY + 8 * 60 + 30 + int(r, 0, 90);
	if (minuteOfDay(m) < 8 * 60 + 30) m = startOfDay(m) + 8 * 60 + 30 + int(r, 0, 90);
	while (isWeekend(m)) m += DAY;
	return m;
};
const waking = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 22 * 60 + 30) m = startOfDay(m) + DAY + 6 * 60 + 40 + int(r, 0, 200);
	if (minuteOfDay(m) < 6 * 60 + 30) m = startOfDay(m) + 6 * 60 + 40 + int(r, 0, 200);
	return m;
};
const slug = (text: string) => text.normalize('NFD').toLowerCase().replace(/[^a-z]+/g, '');
const words = (text: string, count: number) =>
	text
		.split(' ')
		.slice(0, count)
		.join(' ')
		.replace(/[,.:;!?]+$/, '');
const clip = (text: string, length: number) => (text.length <= length ? text : `${text.slice(0, length).replace(/\s+\S*$/, '')}…`);

interface Plan {
	topic: Topic;
	path: Path;
	open: number;
}

const ticket = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x5eed0000 + index * 7919);
	const { topic, path, open } = plan;
	const day = Math.floor(open / DAY);
	const kind = kinds[(index * 5 + int(r, 0, 4)) % kinds.length]!;
	const first = pick(r, firstNames);
	const surname = pick(r, surnames);
	const full = `${first} ${surname}`;
	const lower = slug(first);
	const id = pick(r, [lower, `${lower}${slug(surname).charAt(0)}`, `${lower}.${slug(surname).slice(0, 3)}`, `${lower}${int(r, 2, 89)}`, `${lower}_${slug(surname)}`]);
	const [provider, otherProvider] = shuffle(r, providers);
	const email = r() < 0.6 ? `${lower}.${slug(surname)}@${provider}` : `${lower}${int(r, 1, 99)}@${provider}`;
	const otherEmail = `${lower.charAt(0)}${slug(surname)}${int(r, 60, 99)}@${otherProvider}`;
	const group = pick(r, kind.names);
	const groupShort = group.replace(/^the /, '');
	const [rolePhrase, title] = pick(r, kind.roles);
	const neighbourPool = shuffle(r, neighbourNames);
	const neighbour = neighbourPool[0]!;
	const neighbourFull = `${neighbour} ${pick(r, surnames)}`;
	const neighbourId = `${slug(neighbour)}${pick(r, ['', '.' + slug(neighbourFull.split(' ')[1]!).slice(0, 4), String(int(r, 2, 70))])}`;
	const reporters = neighbourPool.slice(1).map((name) => `${slug(name)}${pick(r, ['', String(int(r, 2, 70)), '.' + slug(pick(r, surnames)).slice(0, 3)])}`);
	const [platform, device, os] = pick(r, topic.platforms ? devices.filter(([kindOfDevice]) => topic.platforms!.includes(kindOfDevice)) : devices);
	const app = topic.apps ? pick(r, topic.apps) : appOn(r, day);
	const item = pick(r, kind.items);
	const eventName = pick(r, kind.events.filter((name) => fixedEvents[name] === undefined || fixedEvents[name]! * DAY >= startOfDay(open) + 2 * DAY));
	const named = dayNames.findIndex((name) => eventName.includes(name));
	const later = startOfDay(open) + int(r, 3, 16) * DAY;
	const eventDate = fixedEvents[eventName] !== undefined ? fixedEvents[eventName]! * DAY : named >= 0 ? nextDay(later, named) : later;
	const eventDom = at(eventDate).getUTCDate();
	const wdayDate = startOfDay(open) - int(r, 1, 4) * DAY;
	const postTime = wdayDate + int(r, 7 * 60, 21 * 60);
	const post = idAt(postTime, r);
	const post2 = post + int(r, 4, 300);
	const joinedAt = -28 * DAY + int(r, 0, Math.max(1, day - 38)) * DAY + int(r, 8 * 60, 21 * 60);
	const lastSeenAt = topic.subjects[0] === 'Can’t sign in' ? Math.min(waking(r, joinedAt + int(r, 3, 30) * DAY), open - 7 * DAY) : Math.min(waking(r, open - int(r, 60, 4000)), open - int(r, 5, 50));
	const photoMb = 3.8 + int(r, 0, 11) / 10;
	const uploadEnd = open - int(r, 5, 90);
	const snippetSource = path.snippets ?? topic.snippets ?? kind.posts;
	const agent = pick(r, agents);
	const tns = pick(r, safetyTeam);
	const values: Record<string, string> = {
		first,
		surname,
		full,
		id,
		email,
		otherEmail,
		pers: `@${otherProvider}`,
		group,
		Group: cap(group),
		groupShort,
		GroupShort: cap(groupShort),
		iam: `I’m ${rolePhrase} ${group}`,
		Iam: `I’m ${rolePhrase} ${group}`,
		title,
		street: pick(r, streets),
		eventName,
		eventDay: dayDate(eventDate),
		event: `${eventName} on ${named >= 0 ? longDate(eventDate) : dayDate(eventDate)}`,
		day: weekday(open + int(r, 2, 6) * DAY),
		wday: weekday(wdayDate),
		neighbour,
		neighbourFull,
		neighbourId,
		item,
		Item: cap(item),
		post: String(post),
		post2: String(post2),
		count: String(int(r, 3, 48)),
		few: String(int(r, 2, 6)),
		joined: `${shortDate(joinedAt)} 2026`,
		lastSeen: stampShort(lastSeenAt),
		fails: String(int(r, 3, 14)),
		size: `${photoMb.toFixed(1)} MB`,
		small: `${(2.1 + int(r, 0, 13) / 10).toFixed(1)} MB`,
		big: `${(5.6 + int(r, 0, 42) / 10).toFixed(1)} MB`,
		app,
		platform,
		device,
		reader: platform === 'iPhone' ? 'VoiceOver' : 'TalkBack',
		hhmm: clock(uploadEnd - (uploadEnd % 5)),
		minutes: String(int(r, 2, 15)),
		agent,
		tnsFirst: tns.split(' ')[0]!,
		nick: pick(r, nicknames),
		rightDate: ordinal(eventDom),
		wrongDate: ordinal(eventDom > 20 ? eventDom - 7 : eventDom + 7),
		reports: String(int(r, 2, 6)),
		spammer: pick(r, spammers),
		scammer: pick(r, scammers),
		houseNo: String(int(r, 2, 140)),
		members: String(int(r, 12, 140))
	};
	const f = (text: string) => fill(text, values);
	const postText = f(pick(r, snippetSource));
	values.snippet = words(postText, int(r, 5, 8));

	// Pasted extracts: the admin console, request logs and the member's own screens.
	const table = (head: string[], rows: string[][], right: number[] = []) =>
		[`| ${head.join(' | ')} |`, `| ${head.map((_, i) => (right.includes(i) ? '---:' : '---')).join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
	const code = (lines: string[]) => ['```', ...lines, '```'].join('\n');
	const memberRow = (who: string, name: string, mail: string, since: number) => [who, name, mail, `${shortDate(since)} 2026`, String(int(r, 2, 80)), String(int(r, 0, 14)), stampShort(lastSeenAt), platform === 'web' ? `web, ${device}` : `${platform} ${app}`];
	const otherPosts = (author: string, before: number, count: number) => {
		const rows: string[][] = [];
		let t = before;
		for (const text of shuffle(r, kind.posts.filter((other) => f(other) !== postText)).slice(0, count)) {
			t = Math.min(waking(r, t - int(r, 300, 5000)), t - 60);
			rows.push([String(idAt(t, r)), stampShort(t), clip(f(text), 64), author === id ? '0' : String(int(r, 0, 1))]);
		}
		return rows;
	};
	const reportRows = (author: string, postId: number, count: number, removed: boolean) => {
		const rows: string[][] = [];
		let t = postTime;
		const reasons = ['about a person', 'harassment', 'spam', 'misleading', 'other', 'about a person'];
		let report = 2400 + Math.floor(postTime / 160);
		for (let i = 0; i < Math.min(count, 6); i++) {
			t = waking(r, t + int(r, 20, 900));
			report += int(r, 1, 9);
			const status = removed && i === Math.min(count, 6) - 1 ? 'removed' : i === 0 ? 'open' : 'joined';
			rows.push([String(report), String(postId), author, reporters[i % reporters.length]!, pick(r, reasons), stampShort(t), status]);
		}
		return table(['Report', 'Post', 'Posted by', 'Reported by', 'Reason', 'When', 'Status'], rows, [0, 1]);
	};
	const logTime = (t: number, seconds = int(r, 0, 59)) => isoUtc(t).replace(/:00Z$/, `:${pad(seconds)}Z`);
	const pasteOf = (paste: Paste | undefined): string => {
		switch (paste) {
			case undefined:
			case 'none':
				return '';
			case 'member': {
				const extra = r() < 0.5 ? `\n\nReports against: ${int(r, 0, 1)} · reports made: ${int(r, 0, 4)} · bio: ${int(r, 0, 180)} characters` : '';
				return table(['Member', 'Name', 'Email', 'Joined', 'Posts', 'Images', 'Last seen', 'App'], [memberRow(id, full, email, joinedAt)], [4, 5]) + extra;
			}
			case 'blankMember':
			case 'blankOther': {
				const own = paste === 'blankMember';
				const name = pick(r, ['`""`', '`" "`', '`"   "`', '`"    "`']);
				return table(['Member', 'Name', 'Email', 'Joined', 'Posts', 'Last profile change'], [[own ? id : neighbourId, name, own ? email : `${slug(neighbour)}@${provider}`, `${shortDate(joinedAt - int(r, 0, 9) * DAY)} 2026`, String(int(r, 2, 40)), stampShort(postTime - int(r, 60, 3000))]], [4]);
			}
			case 'twoMembers': {
				const oldId = id.includes('_') ? lower : `${lower}_${slug(surname)}`;
				const oldJoined = -28 * DAY + int(r, 0, 10) * DAY + 600;
				return table(['Member', 'Name', 'Email', 'Joined', 'Posts', 'Last seen'], [[oldId, full, otherEmail, `${shortDate(oldJoined)} 2026`, values.count!, stampShort(oldJoined + int(r, 20, 40) * DAY)], [id, full, email, `${shortDate(joinedAt + 20 * DAY)} 2026`, String(int(r, 1, 12)), stampShort(lastSeenAt)]], [4]);
			}
			case 'posts':
			case 'postsOther': {
				const author = paste === 'posts' ? id : neighbourId;
				const rows = [[String(post), stampShort(postTime), clip(postText, 64), String(paste === 'posts' ? 0 : int(r, 0, 3))]];
				if (topic.subjects[0] === 'My posts show the wrong name') rows.unshift([String(post2), stampShort(postTime + int(r, 4, 90)), clip(f(pick(r, kind.posts)), 64), '0']);
				return `Posts by ${author}, newest first:\n\n` + table(['Post', 'Posted', 'Text', 'Reports'], [...rows, ...otherPosts(author, postTime, int(r, 3, 5))], [0, 3]);
			}
			case 'signin': {
				const rows: string[][] = [];
				let t = open - int(r, 200, 2000);
				const shown = Math.min(Number(values.fails), int(r, 3, 7));
				for (let i = 0; i < shown; i++) {
					rows.unshift([utcShort(t), 'password sign-in', platform === 'web' ? 'web' : `${platform} ${app}`, 'wrong password']);
					t -= int(r, 2, 900);
				}
				rows.unshift([utcShort(lastSeenAt), 'password sign-in', platform === 'web' ? 'web' : `${platform} ${releases[Math.max(0, releases.findIndex(([, v]) => v === app) - 1)]![1]}`, 'ok']);
				const more = Number(values.fails) > shown ? `\n\n${Number(values.fails) - shown} earlier failed attempts not shown.` : '';
				return table(['When (UTC)', 'Event', 'App', 'Result'], rows) + more;
			}
			case 'uploads413':
			case 'uploadsBig': {
				const lines: string[] = [];
				let t = uploadEnd;
				const tries = int(r, 2, 4);
				for (let i = 0; i < tries; i++) {
					const bytes = paste === 'uploadsBig' ? Math.round(Number(values.big!.split(' ')[0]) * 1e6) + int(r, 0, 9999) : Math.round((photoMb + (i ? int(r, -3, 3) / 10 : 0)) * 1e6) + int(r, 0, 99999);
					lines.unshift(`${logTime(t)}  POST /images  413  member=${id}  image/jpeg  body ${thousands(Math.ceil(bytes / 3) * 4 + int(r, 40, 70))} bytes  "images can be at most 5 MB"`);
					t -= int(r, 1, 40);
				}
				if (r() < 0.5) lines.unshift(`${logTime(t - int(r, 3, 20) * DAY)}  POST /images  201  member=${id}  image/jpeg  body ${thousands(int(r, 900_000, 3_000_000))} bytes  image ${idAt(t - 10 * DAY, r)}`);
				return code(lines);
			}
			case 'uploads415': {
				const lines: string[] = [];
				let t = uploadEnd;
				for (let i = 0; i < int(r, 2, 4); i++) {
					lines.unshift(`${logTime(t)}  POST /images  415  member=${id}  image/heic  body ${thousands(int(r, 1_800_000, 4_200_000))} bytes  "images must be PNG, JPEG, GIF or WebP"`);
					t -= int(r, 1, 60);
				}
				if (r() < 0.6) lines.push(`${logTime(open - int(r, 5, 25))}  POST /images  201  member=${id}  image/png  body ${thousands(int(r, 300_000, 1_400_000))} bytes  image ${idAt(open, r)}`);
				return code(lines);
			}
			case 'apiLong': {
				const lines: string[] = [];
				let t = open - int(r, 5, 90);
				const length = int(r, 540, 2400);
				for (let i = 0; i < int(r, 2, 5); i++) {
					lines.unshift(`${logTime(t)}  POST /posts  400  member=${id}  text ${thousands(length - i * int(r, 0, 40))} characters  "text is longer than 500 characters"`);
					t -= int(r, 1, 30);
				}
				return code(lines);
			}
			case 'apiDup': {
				let second = int(r, 0, 20);
				const lines = [`${logTime(postTime, second)}  POST /posts  201  member=${id}  ${thousands(int(r, 4, 30) * 100 + int(r, 0, 99))} ms  post ${post}`];
				for (let i = 1, n = post; i < int(r, 2, 3) + 1; i++) {
					second += int(r, 3, 12);
					n += int(r, 1, 3);
					lines.push(`${logTime(postTime, second)}  POST /posts  201  member=${id}  ${thousands(int(r, 4, 30) * 100 + int(r, 0, 99))} ms  post ${n}`);
				}
				return code(lines);
			}
			case 'apiRequired': {
				const t = open - int(r, 10, 300);
				const image = idAt(t, r);
				const lines = [`${logTime(t)}  POST /images  201  member=${id}  image/jpeg  body ${thousands(int(r, 700_000, 3_400_000))} bytes  image ${image}`, `${logTime(t + 1)}  POST /posts  400  member=${id}  text 0 characters  "text is required"`];
				if (r() < 0.6) lines.push(`${logTime(t + int(r, 2, 9))}  POST /posts  400  member=${id}  text 0 characters  "text is required"`);
				return code(lines);
			}
			case 'apiName':
			case 'apiNameOther': {
				const who = paste === 'apiName' ? id : neighbourId;
				const t = Math.min(waking(r, postTime - int(r, 60, 3000)), postTime - int(r, 2, 30));
				const blank = pick(r, ['""', '" "', '"   "']);
				return code([`${logTime(t)}  GET /members/${who}  200  member=${who}`, `${logTime(t + int(r, 1, 4))}  PUT /members/${who}  200  member=${who}  {"name": ${blank}}`, `${logTime(postTime)}  POST /posts  201  member=${who}  post ${post}`]);
			}
			case 'boardApi': {
				const total = idAt(open, r) - int(r, 2200, 3400);
				const early = shuffle(r, reporters).slice(0, int(r, 4, 6));
				let t = -28 * DAY + 8 * 60 + int(r, 0, 120);
				const rows = early.map((author, i) => {
					t += int(r, 5, 90);
					return [String(i + 1), String(1 + i * int(r, 1, 3) + i), author, `${at(toUtc(t)).toISOString().slice(0, 17)}${pad(int(r, 0, 59))}+00:00`];
				});
				rows.push(['…', '…', '…', '…'], [thousands(total), String(idAt(open, r)), id, `${at(toUtc(open - int(r, 20, 400))).toISOString().slice(0, 17)}${pad(int(r, 0, 59))}+00:00`]);
				return `GET /posts, ${thousands(total)} posts in ${(1.2 + int(r, 0, 14) / 10).toFixed(1)} s:\n\n` + table(['Position', 'id', 'author', 'created_at'], rows, [0, 1]);
			}
			case 'reportsOther':
				return reportRows(neighbourId, post, Number(values.reports), false);
			case 'reportsSelf':
				return reportRows(id, post, Number(values.reports), true);
			case 'reportsNew':
				return reportRows(slug(values.spammer!).slice(0, 10) + int(r, 1, 9), post, Number(values.reports), false);
			case 'crash': {
				const bytes = int(r, 30, 90) * 1_048_576 + int(r, 0, 999_999);
				return code([
					`Pinwheel 2.7.3 (Android) · ${device} · ${os}`,
					`java.lang.OutOfMemoryError: Failed to allocate a ${bytes} byte allocation with ${int(r, 8, 30) * 1_048_576} free bytes and ${int(r, 10, 40)}MB until OOM`,
					'    at android.graphics.BitmapFactory.nativeDecodeStream(Native Method)',
					'    at android.graphics.BitmapFactory.decodeStream(BitmapFactory.java:790)',
					`    at app.pinwheel.compose.PhotoAttach.load(PhotoAttach.kt:${int(r, 110, 130)})`,
					`    at app.pinwheel.compose.ComposeViewModel$attach$1.invokeSuspend(ComposeViewModel.kt:${int(r, 190, 215)})`,
					`Crashes in 2.7.3 since release: ${thousands(int(r, 600, 2400))} · members affected: ${int(r, 200, 700)}`
				]);
			}
			case 'board': {
				let t = -28 * DAY + 9 * 60 + int(r, 0, 300);
				const entries = shuffle(r, kinds)
					.slice(0, int(r, 3, 5))
					.map((other) => {
						t += int(r, 200, 4000);
						return `${pick(r, firstNames)} ${pick(r, surnames)} · ${shortDate(t)}\n${f(pick(r, other.posts))}`;
					});
				return entries.join('\n\n');
			}
			case 'recent': {
				const lines: string[] = [];
				let t = waking(r, open - int(r, 600, 4000));
				const requests = [() => `GET /posts  200  member=${id}  ${thousands(int(r, 900, 2600))} ms`, () => `GET /members/${pick(r, [id, neighbourId, ...reporters.slice(0, 2)])}  200  member=${id}  ${int(r, 8, 40)} ms`, () => `GET /posts/${idAt(t, r)}  200  member=${id}  ${int(r, 6, 30)} ms`, () => `GET /images/${idAt(t, r)}  200  member=${id}  ${int(r, 20, 160)} ms`];
				for (let i = 0; i < int(r, 4, 8); i++) {
					t = waking(r, t + int(r, 1, 240));
					if (t > open) break;
					lines.push(`${logTime(t)}  ${pick(r, requests)()}`);
				}
				return `Recent requests from ${id}:\n\n` + code(lines);
			}
			case 'appinfo':
				return platform === 'web' ? `Pinwheel web · ${device} · ${os}\nSigned in as ${id}` : `Pinwheel ${app} (${300 + releases.findIndex(([, v]) => v === app) * 23 + (app.length > 4 ? 0 : 1)})\n${device} · ${os}\nSigned in as ${id}`;
		}
	};

	// The thread.
	let t = open;
	const messages: string[] = [];
	const dev = pick(r, apiTeam);
	const appDev = pick(r, appsTeam);
	const acct = pick(r, accountsTeam);
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		a: `**${agent} (Pinwheel support)**`,
		n: `**${agent} (Pinwheel support)** · team note`,
		k: `**${acct} (accounts team)** · team note`,
		K: `**${acct} (accounts team)**`,
		w: `**${dev} (API team)** · team note`,
		m: `**${appDev} (apps team)** · team note`,
		M: `**${appDev} (apps team)**`,
		t: `**${tns} (trust and safety)** · team note`,
		T: `**${tns} (trust and safety)**`,
		d: `**${dataLead} (data protection)** · team note`,
		D: `**${dataLead} (data protection)**`,
		g: `**${communityLead} (community team)** · team note`,
		G: `**${communityLead} (community team)**`,
		s: '**Help desk**'
	};
	const teamNames: Partial<Record<Who, string>> = { K: 'Accounts team', M: 'Apps team', T: 'Trust and safety', D: 'Data protection', G: 'Community team' };
	const signers: Partial<Record<Who, string>> = { a: agent, K: acct.split(' ')[0]!, M: appDev.split(' ')[0]!, T: tns.split(' ')[0]!, D: dataLead.split(' ')[0]!, G: communityLead.split(' ')[0]! };
	const say = (who: Who, body: string) => messages.push(`${labels[who]} · ${stampShort(t)}\n\n${body.trim()}`);
	let held = false;
	const advance = (who: Who) => {
		const before = t;
		if (held && who !== 'a' && who !== 's') {
			t += int(r, 600, 2200);
			held = false;
		}
		if (who === 'c') t = waking(r, t + int(r, 25, 1700));
		else if (who === 's') t = office(r, startOfDay(t) + 5 * DAY + 9 * 60);
		else if (signers[who]) t = office(r, t + int(r, 20, 700));
		else t = office(r, t + int(r, 6, 300));
		if (t > LAST_MESSAGE) t = before + int(r, 4, 30);
	};
	const custBody = (paragraphs: string[], opening: boolean) => {
		const parts: string[] = [];
		const fitting = greetings.filter((greeting) => (minuteOfDay(t) < 12 * 60 || !greeting.includes('orning')) && (minuteOfDay(t) >= 17 * 60 || !greeting.includes('evening')));
		if (r() < 0.8) parts.push(`${pick(r, opening ? fitting : fitting.slice(0, 6))},`);
		const signs = (opening ? custSign : custSign.slice(0, 4)).filter((sign) => !(/^Thank/.test(sign) && /Thank/.test(paragraphs.at(-1)!)));
		parts.push(...paragraphs, f(pick(r, signs)));
		if (opening && r() < 0.3) parts.push(`--\n${f(pick(r, footers))}`);
		return parts.join('\n\n');
	};
	const pendingSide: string[] = [];
	const staffBody = (who: Who, paragraphs: string[], more = false) => {
		const extra = who === 'a' ? pendingSide.splice(0) : [];
		const closing = more && r() < 0.4 ? [pick(r, closings)] : [];
		const hello = /^(Hello|Hi) /.test(paragraphs[0]!) ? [] : [pick(r, [`Hi ${first},`, `Hello ${first},`, `Hi ${first},`, `Dear ${first},`])];
		const sign = who === 'a' ? pick(r, agentSign) : pick(r, ['{signer}', 'Best wishes,\n{signer}', `{signer}\n${teamNames[who]!}, Pinwheel`]);
		return [...hello, ...paragraphs, ...extra, ...closing, fill(sign, { signer: signers[who]! })].join('\n\n');
	};

	// 1. The member writes in.
	const tangent = r() < 0.4 ? pick(r, tangents) : undefined;
	const openText = f(topic.open[path.opens ? pick(r, path.opens) : int(r, 0, topic.open.length - 1)]!);
	const opening = [openText];
	if (r() < 0.5) opening.unshift(f(pick(r, contexts)));
	const background = shuffle(r, topic.background);
	if (r() < 0.85) opening.push(f(background[0]!));
	if (r() < 0.55) opening.push(f(background[1]!));
	if (r() < 0.6) opening.push(f(pick(r, topic.tried)));
	const openAt = opening.indexOf(openText);
	if (r() < 0.5) opening.splice(openAt + 1 + int(r, 0, opening.length - openAt - 1), 0, f(pick(r, topic.heard)));
	if (r() < 0.75) opening.push(f(pick(r, topic.more)));
	if (r() < 0.45) opening.push(f(pick(r, situations)));
	if (tangent) opening.push(tangent[0]);
	if (topic.shows && r() < 0.75) opening.push(`${pick(r, ['This is what I see when I open it:', 'Copied from the top of the board:', 'Here’s the top of the board as it shows on my phone:'])}\n\n${pasteOf(topic.shows)}`);
	say('c', custBody(opening, true));

	// 2. Support asks.
	advance('a');
	const ask = f(pick(r, topic.ask));
	const ack = /^(Thanks|Sorry|Thank you|Of course|Good question|That)/.test(ask) ? '' : pick(r, acks);
	say('a', staffBody('a', [[ack, ask].filter(Boolean).join(' '), ...(tangent ? [tangent[1]] : [])], true));

	// 3. The member answers, and may raise a second matter.
	advance('c');
	const fittingRiders = riders.filter((rider) => !rider.skip.includes(topic.subjects[0]!));
	const rider = r() < 0.5 ? pick(r, fittingRiders) : undefined;
	const side = r() < (rider ? 0.35 : 0.7) ? pick(r, sides) : undefined;
	const answer = [f(pick(r, path.detail)), pasteOf(path.paste)].filter(Boolean);
	if (rider) {
		answer.push(f(rider.q));
		pendingSide.push(f(rider.a));
	}
	if (side) {
		answer.push(rider && side.q.startsWith('Also, ') ? cap(side.q.slice(6)) : side.q);
		pendingSide.push(side.a);
	}
	say('c', custBody(answer, false));

	// 3b. Sometimes support needs one more thing first.
	if (r() < 0.5) {
		const [question, reply] = pick(r, topic.probe);
		advance('a');
		say('a', staffBody('a', [`${pick(r, ['Thanks.', 'Thank you.', 'Thanks, that helps.', 'Got it.'])} ${f(question)}`]));
		advance('c');
		const another = r() < 0.35 ? shuffle(r, sides).find((other) => other !== side) : undefined;
		if (another) pendingSide.push(another.a);
		say('c', custBody([f(reply), ...(another ? [another.q] : [])], false));
	}

	// 4. Someone looks.
	advance('n');
	const lookPaste = path.lookPaste ?? 'member';
	const withMember = lookPaste !== 'member' && lookPaste !== 'none' && (path.lookWho ?? 'n') === 'n' && r() < 0.65;
	const recent = (path.lookWho ?? 'n') === 'n' && r() < 0.5 ? pasteOf('recent') : '';
	say(path.lookWho ?? 'n', [f(pick(r, path.look)), withMember ? pasteOf('member') : '', pasteOf(lookPaste), recent, pasteOf(path.extra ?? topic.extra)].filter(Boolean).join('\n\n'));
	if (rider?.note) {
		advance('n');
		say('n', [f(rider.note), pasteOf(rider.paste)].filter(Boolean).join('\n\n'));
	}

	// 5. Sometimes a wait; always when the second matter would otherwise go unanswered.
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'a');
	const second = shuffle(r, sides).find((other) => other !== side)!;
	const chase = () => {
		advance('c');
		const raise = answered && r() < 0.6;
		say('c', custBody([f(pick(r, chasers)), ...(raise ? [second.q] : [])], false));
		if (raise) pendingSide.push(second.a);
	};
	if ((path.team && r() < 0.7) || (pendingSide.length && !answered)) {
		advance('a');
		held = true;
		say('a', staffBody('a', [fill(pick(r, holding), { team: path.team ?? 'colleagues' })], true));
		if (r() < 0.55) chase();
	} else if (r() < 0.35) chase();

	// 6. The end.
	const thanks = side?.then && r() < 0.6 ? side.then : '';
	end.forEach(([who, body], i) => {
		advance(who);
		const text = f(body);
		if (who === 'c') say('c', custBody(i === end.length - 1 && thanks ? [text, thanks] : [text], false));
		else if (signers[who]) say(who, staffBody(who, [text]));
		else say(who, text);
	});
	if (path.happy && end.at(-1)![0] === 'c' && r() < 0.35) {
		advance('a');
		say('a', staffBody('a', [f(pick(r, ['Glad that’s sorted. I’ll close this ticket now, but reply here any time.', 'Lovely, thanks for letting me know. I’ll close this one now.', 'Great news, thanks for confirming. Have a good week!', 'Thanks for letting me know it worked. I’ll close the ticket.']))]));
	}
	if (path.happy && r() < 0.5) {
		t = Math.min(t + int(r, 30, 2400), Math.max(t + 5, LAST_MESSAGE));
		const [rating, comment] = pick(r, surveys);
		say('s', `Satisfaction survey answered: ${rating}.${comment ? ` “${f(comment)}”` : ''}`);
	}

	const subject = pick(r, topic.subjects);
	const channel = r() < 0.6 ? 'by email' : 'from the Help screen in the app';
	return [`# Ticket ${number}: ${subject}`, `From ${full} <${email}> · member ${id} · ${stampLong(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each ticket follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two tickets on one topic end differently until its paths run out.
const order = mulberry32(20260928);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const day = FIRST_DAY + Math.floor((index * (LAST_DAY - FIRST_DAY + 1)) / ITEMS);
	const open = waking(order, day * DAY + int(order, 7 * 60, 22 * 60));
	const fits = (from?: number, to?: number) => (from === undefined || day >= from) && (to === undefined || day <= to);
	const allowed = (topic: Topic) => fits(topic.since, topic.until) && topic.paths.some((path) => fits(path.since, path.until));
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	const paths = topic.paths.filter((path) => fits(path.since, path.until));
	plans.push({ topic, path: paths[(seen + topics.indexOf(topic)) % paths.length]!, open });
}

const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
let number = 3117;
plans.forEach((plan, index) => {
	number += int(order, 1, 4);
	writeFileSync(join(folder, `ticket-${number}.md`), ticket(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Member support tickets, 28 September to 13 November 2026\n\nThe ${ITEMS} tickets Pinwheel's member support handled in these seven weeks, one file each, exported from the old\nhelp desk before the move. The export kept the messages and team notes but not the tags, statuses or assignees.\nNumbers missing from the sequence were spam or were merged into another ticket. Console and log extracts in team\nnotes are as support pasted them; log times are UTC, message times UK time.\n`
);
