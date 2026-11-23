// Writes the long material of this entry's long task: the tickets Copperleaf members sent to support between
// 28 September and 13 November 2026, one Markdown file each, under support/tickets/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 278;

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
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
};
const pad = (value: number) => String(value).padStart(2, '0');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

// ---------------------------------------------------------------------------------------------------------
// Dates. Copperleaf opened in March 2026; the export ran on 20 November.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (ms: number) => new Date(ms);
const clock = (ms: number) => `${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}`;
const stamp = (ms: number) => `${WD[utc(ms).getUTCDay()]} ${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]} 2026, ${clock(ms)}`;
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const weekday = (ms: number) => WDL[utc(ms).getUTCDay()]!;
const midnight = (ms: number) => ms - (ms % DAY);
const LAUNCH = Date.UTC(2026, 2, 2);
const SLUGS = Date.UTC(2026, 9, 14); // 0.4.0: links made from titles, and bios
const APP25 = Date.UTC(2026, 9, 16); // the apps show bios from 2.5.0
const FIRST_DAY = Date.UTC(2026, 8, 28);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20);
const days: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) days.push(day);

/** How the API makes a post's link from its title, as it stands. */
const slugNow = (title: string) => title.trim().toLowerCase().replace(/\s+/g, '-');
const encodeSlug = (slug: string) =>
	[...slug].map((c) => (/[a-z0-9-]/.test(c) ? c : [...new TextEncoder().encode(c)].map((b) => `%${b.toString(16).toUpperCase().padStart(2, '0')}`).join(''))).join('');

// ---------------------------------------------------------------------------------------------------------
// People and things.
const firstNames = ['Marisol', 'Tobias', 'Ngozi', 'Henrik', 'Aoife', 'Rahul', 'Yusra', 'Callum', 'Ingrid', 'Desmond', 'Lucía', 'Femi', 'Hollis', 'Saoirse', 'Mateus', 'Keiko', 'Bronwen', 'Arjun', 'Petra', 'Olumide', 'Greta', 'Linus', 'Farah', 'Dominic', 'Esme', 'Kwame', 'Theodora', 'Ravi', 'Annika', 'Joaquín', 'Maeve', 'Idris', 'Céline', 'Bartek', 'Zainab', 'Rhys', 'Liesel', 'Omari', 'Thandiwe', 'Niall', 'Signe', 'Emre'];
const surnames = ['Etxeberria', 'Lindqvist', 'Okonkwo', 'Brannigan', 'Achterberg', 'Venkataraman', 'Haddad', 'Pryce', 'Solberg', 'Mwangi', 'Ferrante', 'Oyelaran', 'Castellano', 'Whitlock', 'Nakashima', 'Llewellyn', 'Desai', 'Kowalczyk', 'Abernethy', 'Moreau', 'Talbot', 'Rautio', 'Quigley', 'Mensah', 'Dufresne', 'Halloran', 'Ibsen', 'Varela', 'Thorne', 'Adebayo', 'Strand', 'MacAskill'];
const penNames = ['The Night Gardener', 'quietfox', 'Paper Lantern', 'Moth and Moon', 'R. Vance', 'Saltmarsh', 'inkandoats', 'The Reluctant Poet', 'Northbound', 'Bracken Hollow', 'Tidewrack', 'M. J. Hale', 'Small Hours', 'Fieldnotes', 'Lark Rising', 'Dry Stone'];
const mailDomains = ['mailbox.example', 'postbox.example', 'inkwell.example', 'letterhead.example', 'quillmail.example', 'webpost.example', 'homemail.example', 'fastpost.example'];
const orgs = [['Northgate University', 'northgate-uni.example'], ['Harlow & Finch Solicitors', 'harlowfinch.example'], ['Bexley Borough Council', 'bexley-council.example'], ['St Columba Hospital', 'stcolumba.example'], ['Meridian Logistics', 'meridianlog.example'], ['Calder Valley College', 'caldervalley.example']] as const;
const scanners = ['Mimecast', 'Microsoft Defender', 'Proofpoint', 'Barracuda'];
const readers = ['NVDA', 'JAWS', 'VoiceOver'];
const browsers = ['Firefox', 'Chrome', 'Safari', 'Edge'];
const agents = ['Wren', 'Bas', 'Odile'];
const apiDevs = ['Inés', 'Callum'];
const devices = { iOS: ['iPhone 12', 'iPhone 13 mini', 'iPhone 14', 'iPhone 15', 'iPhone SE', 'iPad Air'], Android: ['Pixel 7', 'Pixel 8a', 'Samsung Galaxy A54', 'Samsung Galaxy S23', 'Motorola G84', 'Nokia G42'] } as const;
const osVersions = { iOS: ['iOS 17.6', 'iOS 18.0', 'iOS 18.1'], Android: ['Android 13', 'Android 14', 'Android 15'] } as const;
const oldDevices = ['iPhone 8', 'Galaxy S9', 'iPhone XR', 'Moto G7', 'Pixel 3'];
const chatApps = ['WhatsApp', 'Signal', 'our writing group’s Discord', 'Messenger', 'Slack'];
const titles = ['Notes from a Night Shift', 'Ten Things My Grandmother Knew', 'What the River Said', 'Small Hours', 'The Year I Stopped Running', 'A Poem for Tuesday', 'Moving House, Moving On', 'Twenty-Six', 'Unsent', 'Field Notes: October', 'How to Lose a Garden', 'Salt', 'The Long Way Round', '100 Words a Day', 'Letters to My Younger Sister', 'The Lighthouse Keeper', 'Learning to Swim at Forty', 'Inventory of a Kitchen Drawer', 'The Bus Stop Regulars', 'Second Draft of a Love Letter', 'Allotment Diaries', 'My Father’s Hands', 'Winter Light', 'On Not Finishing Things', 'The Night Ferry', 'Things I Found in a Library Book', 'Blackberry Season', 'A Short History of My Bicycle', 'Overheard on the 7:42', 'Grief, Week Three', 'Hospital Coffee', 'The Woman Who Fed the Crows', 'Rain on a Tin Roof', 'Three Haiku for November', 'Home Is a Verb', 'Why I Write at Dawn', 'The Quiet Carriage', 'Postcards from Nowhere', 'Bread and Patience', 'A Field Guide to Aunts'];
const breakTitles = [['Why Do I Still Write?', '?'], ['Is Anyone Out There?', '?'], ['What Would You Keep?', '?'], ['Where Did the Summer Go?', '?'], ['Who Were We Then?', '?'], ['My #1 Rule for First Drafts', '#'], ['Notes on Draft #4', '#'], ['Kites!', '!'], ['We Moved House!', '!'], ['Finally Finished!', '!'], ['It Was Not a Good Year.', '.'], ['Goodbye to All That.', '.']] as const;
const punctNames: Record<string, string> = { '?': 'question mark', '#': '# sign', '!': 'exclamation mark', '.': 'full stop' };
const uglyTitles = [['Bread & Butter, Again', 'an ampersand and a comma'], ['Rain, Rain, Rain', 'commas'], ['Mum’s Recipe Box', 'a curly apostrophe'], ['On Walking: Part Two', 'a colon'], ['“Good Enough” Is Good', 'curly quotation marks'], ['Salt, Smoke & Silence', 'an ampersand and a comma'], ['Letters (Unsent)', 'brackets']] as const;
const clashTitles = ['Morning Pages', 'Sunday Notes', 'Untitled Poem', 'Week in Review', 'Haiku', 'Daily Pages', 'Gratitude List', 'Dream Journal', 'Monday Thoughts', 'Notes to Self'];
const spamTitles = ['My Secret to Feeling Calm Every Day', 'How I Finally Fixed My Sleep', 'The One Habit That Changed Everything', 'Why I Stopped Paying Full Price', 'Read This Before You Buy Anything'];
const attackTitles = ['A Word About Certain Writers Here', 'Some People Should Not Be Allowed to Write', 'An Open Letter to a Fraud', 'Plagiarists Among Us', 'You Know Who You Are'];
const spamThings = ['a supplement shop', 'an essay-writing service', 'cheap phone cases', 'a trading course', 'a dating site'];
const typoPairs = [['The Lighthosue Keeper', 'The Lighthouse Keeper'], ['Recieving Line', 'Receiving Line'], ['Untill the Tide Turns', 'Until the Tide Turns'], ['A Seperate Peace of Mind', 'A Separate Peace of Mind'], ['Wierd Weather', 'Weird Weather'], ['The Libary at Night', 'The Library at Night']] as const;
const weirdBios = ['I like turtles.', 'Professional napper. Amateur everything else.', 'hello hello hello', 'This account is run by a cat.', 'Bio coming soon!!!'];
const farPlaces = [['Auckland', 'Pacific/Auckland', '13:00'], ['Sydney', 'Australia/Sydney', '11:00'], ['Brisbane', 'Australia/Brisbane', '10:00'], ['Tokyo', 'Asia/Tokyo', '09:00'], ['Perth', 'Australia/Perth', '08:00']] as const;
const providerTips = [
	[`Some mail apps file mail from new senders under a separate tab, often called Other or Updates, which is easy to miss on a phone.`, 'the Other tab'],
	[`Some providers hold mail from senders they haven't seen before in a quarantine, and send a summary once a day of what they're holding.`, 'the quarantine summary'],
	[`Some providers keep a held folder that only shows in the web version of the mailbox, not in phone apps.`, 'the held folder on the web version'],
	[`If you have a filter or rule set up in your mailbox, it might be moving them into a folder automatically.`, 'a folder one of my old rules sends things to']
] as const;
const bioParts = [
	['I write short fiction and the occasional poem.', 'Mostly memoir, some flash fiction, too many lists.', 'Poems about weather, buses and my mother.', 'Essays on work, rest and the bits in between.'],
	['By day I teach maths; by night I try to finish things.', 'I work nights on a ward and write on the way home.', 'Retired librarian, still shelving things in my head.', 'I fix bicycles for a living and sentences for fun.'],
	['Currently working on a novel set on a ferry.', 'Writing one post a week until the end of the year.', 'Slowly turning my grandmother’s letters into stories.', 'Trying to write about home without getting sentimental.']
];

type Area = 'account' | 'profile' | 'writing' | 'reading' | 'other';
type Outcome = 'sorted' | 'workaround' | 'change' | 'team' | 'member';
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;
/** One exchange: the member's message, the reply, and optionally a pasted artifact, on the member's message unless
 * the fourth element puts it on the reply. */
type Turn = [string, string, Art?, 'a'?];
interface End {
	/** The member's message before the reply, if any. */
	pre?: string;
	/** An internal note from the API team before the reply. */
	note?: string;
	agent?: string;
	art?: Art;
	member: string[];
}
type TeamKey = 'mobile' | 'web' | 'community' | 'privacy' | 'product';
interface Topic {
	key: string;
	area: Area;
	weight: number;
	after?: number;
	/** Only ever the main matter of a ticket. */
	solo?: boolean;
	/** The member writes from another address than the one on the account. */
	fromAlt?: boolean;
	/** The member can't be writing from the app. */
	noApp?: boolean;
	/** Support settles it before anything else comes up. */
	urgent?: boolean;
	/** Only for a member who joined before this day. */
	joinedBefore?: number;
	/** Other matters that can't come up in the same ticket. */
	avoid?: string[];
	avoidAreas?: Area[];
	subjects: string[];
	open: string[];
	/** More the member may add to the first message. */
	detail: [string, string];
	quick: [string, string];
	/** The first reply, which asks for `need`. */
	reply: string;
	need: string;
	turns: Turn[];
	team?: TeamKey;
	handover?: string;
	/** The team's internal note when the fault turns out to be in the API. */
	bounce?: string;
	/** The team's message when it fixes the matter itself. */
	teamFix?: string;
	ends: Partial<Record<'sorted' | 'workaround' | 'change', End>>;
	outcomes: Outcome[];
	prep?: (r: Rand, s: Slots, open: number) => void;
}

const teams: Record<TeamKey, { name: string; label: string; who: string }> = {
	mobile: { name: 'the mobile team', label: 'mobile team', who: 'Tomasz' },
	web: { name: 'the web team', label: 'web team', who: 'Juno' },
	community: { name: 'the community team', label: 'community team', who: 'Delphine' },
	privacy: { name: 'Hattie, who looks after account closures and privacy', label: 'accounts and privacy', who: 'Hattie' },
	product: { name: 'Hattie, who keeps the list of feature requests', label: 'product', who: 'Hattie' }
};

// ---------------------------------------------------------------------------------------------------------
// Pasted artifacts.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const shot = (lines: string[]) => lines.map((line) => (line ? `> ${line}` : '>')).join('\n');
const num = (s: Slots, key: string) => Number(s[key]);
const SITE = 'https://copperleaf.example/posts/';

/** A member's recent posts, as the admin tool lists them, with the given rows first. */
const postRows = (r: Rand, s: Slots, firstRows: string[][]) => {
	const rows = [...firstRows];
	const seen = new Set(rows.map((row) => row[0]));
	let at = num(s, 'openMs') - int(r, 3, 8) * DAY;
	for (let i = int(r, 2, 4); i > 0 && at > num(s, 'joinedMs') + DAY; i--) {
		const title = pick(r, titles);
		if (seen.has(title)) continue;
		seen.add(title);
		rows.push([title, dayMonth(at - int(r, 0, 6) * DAY), dayMonth(at)]);
		at -= int(r, 6, 20) * DAY;
	}
	const links = num(s, 'openMs') >= SLUGS;
	return table(links ? ['Title', 'Link', 'Started', 'Published'] : ['Title', 'Started', 'Published'], rows.map(([title, started, published]) => (links ? [title!, `/posts/${slugNow(title!)}`, started!, published!] : [title!, started!, published!])));
};

const arts: Record<string, Art> = {
	lookupSpace: (r, s) =>
		fence([`Members › search › email is "${s.email}"`, `No members found.`, ``, `Members › search › display name is "${s.display}"`, `1 member found`, `  Display name   ${s.display}`, `  Email          "${s.email} "`, `  Joined         ${s.joined} 2026`, `  Posts          ${s.posts} published, ${s.drafts} drafts`]),
	twoAccounts: (r, s) =>
		table(['Display name', 'Email, as saved', 'Joined', 'Published', 'Drafts'], [[s.display!, `"${s.email} "`, `${s.joined} 2026`, s.posts!, s.drafts!], [s.display2!, `"${s.email}"`, `${s.date2} 2026`, '0', '0']]),
	mailLog: (r, s) => {
		const base = num(s, 'pastMs');
		let at = base;
		const rows = Array.from({ length: int(r, 3, 5) }, () => {
			const row = [stamp(at).replace(' 2026', ''), s.email!, `mx${int(r, 1, 3)}.${s.emailDomain}`, `accepted, ${int(r, 1, 4)} s`];
			at -= int(r, 4, 30) * MIN;
			return row;
		});
		return table(['Requested', 'Sent to', 'Handed to', 'Result'], rows);
	},
	mailLogBio: (r, s) => {
		const d = num(s, 'date2Ms');
		const rows = [
			[`${dayMonth(d - int(r, 4, 9) * DAY)}, ${pad(int(r, 8, 21))}:${pad(int(r, 0, 59))}`, 'accepted'],
			[`${dayMonth(d)}, 03:10`, 'accepted'],
			[`${dayMonth(d)}, ${pad(int(r, 9, 20))}:${pad(int(r, 0, 59))}`, 'accepted']
		];
		return `Sign-in links sent to ${s.email}, last 30 days:\n\n${table(['Sent', 'Result'], rows)}`;
	},
	profileShot: (r, s) =>
		shot([`[Screenshot: the Profile screen in Copperleaf for ${s.platform} ${s.appv}]`, ``, s.display!, s.platform === 'iOS' ? 'Joined Invalid Date' : 'Joined', `${s.posts} posts`, ``, `[Posts]  [About]`]),
	bioText: (r, s) => `Their bio as saved:\n\n${fence([pick(r, bioParts[0]!), '', pick(r, bioParts[1]!), '', pick(r, bioParts[2]!)])}`,
	postsDraft: (r, s) => postRows(r, s, [[s.dtitle!, dayMonth(num(s, 'openMs') - DAY), 'draft']]),
	postsPublished: (r, s) => postRows(r, s, [[s.dtitle!, dayMonth(num(s, 'openMs') - int(r, 2, 9) * DAY), `${s.openDate}, ${s.pubtime}`]]),
	postsOld: (r, s) => {
		const rows = Array.from({ length: Number(s.n) }, (_, i) => [pick(r, titles), dayMonth(Date.UTC(2026, 8, 3 + i * int(r, 5, 8))), 'draft']).reverse();
		rows.push([pick(r, titles), '24 August', '24 August']);
		return table(['Title', 'Started', 'Published'], rows);
	},
	postDates: (r, s) => fence([`Post        "${s.dtitle}"`, `Started     ${s.started}, ${pad(int(r, 19, 23))}:${pad(int(r, 0, 59))}`, `Published   ${s.openDate}, ${s.pubtime}`, `Shown as    ${s.started}`]),
	linkCompare: (r, s) => fence([`Shared:   ${SITE}${s.bslug}`, `Opens:    ${SITE}${s.bcut}`, `          We couldn't find that page.`]),
	encodedLink: (r, s) => fence([`${SITE}${s.uencoded}`]),
	clashConsole: (r, s) => fence([`POST https://api.copperleaf.example/posts 500 (Internal Server Error)`, `Response: {"error":"Internal Server Error"}`, `Uncaught (in promise) Error: Couldn't save your draft`, `    at saveDraft (editor-${pick(r, ['a81f', '3c07', 'e92b'])}.js:1:${int(r, 2000, 9000)})`]),
	formatShot: (r, s) =>
		shot([`[Screenshot: "${s.title}" in Copperleaf for ${s.platform} ${s.appv}]`, ``, pick(r, ['The kettle *still* warm,', 'You said *later*,', 'We were _so_ young then,']), pick(r, ['the chair turned *towards* the window,', 'and later never came,', 'and the town was _so_ small,']), pick(r, ['and nobody *home*.', 'not *once*.', 'that we _ran_ everywhere.'])]),
	feedPages: (r, s) => {
		const pool = shuffle(r, titles).slice(0, 9);
		const shifted = int(r, 2, 4);
		const [t5, t6] = [`21:${pad(int(r, 0, 15))}`, `21:${pad(int(r, 20, 45))}`];
		const page5 = pool.slice(0, 5).map((title, i) => [`Page 5, loaded ${t5}`, String(16 + i), title]);
		const page6 = [...pool.slice(5 - shifted, 5), ...pool.slice(5)].slice(0, 6).map((title, i) => [`Page 6, loaded ${t6}`, String(1 + i), title]);
		return table(['Page', 'Place on the page', 'Title'], [...page5, ...page6]);
	},
	curlOut: (r, s) =>
		fence([`$ curl -s -A "weekly-ebook" "https://api.copperleaf.example/posts?page=1&limit=500" | jq length`, `500`, `$ curl -s -A "weekly-ebook" "https://api.copperleaf.example/posts?page=1&limit=100" | jq length`, `100`, `$ ./make-ebook.sh`, `Fetched 500 posts, ${int(r, 600, 900)} pages, wrote copperleaf-${s.openDate!.replace(' ', '-').toLowerCase()}.epub`]),
	tzCompare: (r, s) => table(['Where', `"${s.title}"`], [['Website', `Published ${dayMonth(num(s, 'date2Ms') - DAY)}`], ['App', `Published ${s.date2}`]]),
	reportQueue: (r, s) => {
		const d = num(s, 'openMs');
		return table(['Post', 'By', 'Published', 'Reports'], [[s.rtitle!, s.rname!, `${dayMonth(d - DAY)}, 22:${pad(int(r, 10, 59))}`, String(int(r, 2, 7))], [s.rtitle2!, s.rname!, `${dayMonth(d - DAY)}, 23:${pad(int(r, 10, 59))}`, String(int(r, 1, 4))], [s.rtitle3!, s.rname!, `${dayMonth(d - 2 * DAY)}, 22:${pad(int(r, 10, 59))}`, String(int(r, 1, 3))]]);
	},
	crashReport: (r, s) =>
		s.platform === 'iOS'
			? fence([`Copperleaf ${s.appv} (iOS), test phone, iPhone 13`, `Termination reason: memory limit exceeded`, `Thread 0:`, `0  CopperleafUI   PostBodyView.layoutParagraphs(_:)`, `1  CopperleafUI   PostBodyView.render(post:)`, `2  CopperleafUI   PostScreen.viewDidAppear(_:)`, `3  UIKitCore      -[UIViewController _setViewAppearState:isAnimating:]`])
			: fence([`Copperleaf ${s.appv} (Android), test phone, Pixel 7`, `java.lang.OutOfMemoryError: Failed to allocate a ${int(r, 40, 90)} MB allocation`, `    at com.copperleaf.app.post.PostBodyRenderer.layout(PostBodyRenderer.kt:${int(r, 180, 260)})`, `    at com.copperleaf.app.post.PostScreen.onBind(PostScreen.kt:${int(r, 60, 120)})`, `    at androidx.recyclerview.widget.RecyclerView.onLayout(RecyclerView.java:4593)`]),
	exportHead: (r, s) => fence([`Copperleaf posts by ${s.display}, exported ${s.openDate} 2026`, ``, `== ${s.title} ==`, `Started ${s.date1} · Published ${s.date1}`, ``, pick(r, ['It was the kind of morning that', 'My grandmother kept a tin of buttons and', 'Nobody tells you that the night bus']) + ' …']),
	unsubList: (r, s) => {
		const from = Math.max(Date.UTC(2026, 8, 1), num(s, 'joinedMs') + DAY);
		const unsubscribed = dayMonth(from + int(r, 0, Math.max(0, Math.floor((Date.UTC(2026, 8, 28) - from) / DAY))) * DAY);
		return table(['Address', 'Added to the newsletter', 'Unsubscribed'], [[s.email!, `with the account, ${s.joined}`, unsubscribed], [s.email2!, 'launch sign-up page, February', '']]);
	}
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Slots in braces are filled per ticket.
const topics: Topic[] = [
	{
		key: 'space',
		area: 'account',
		weight: 3,
		subjects: ['Says there is no account with my email', 'Cannot sign in', "Sign-in link won't send", 'Help!! Locked out'],
		open: [
			`I've been on Copperleaf since {joined} and today, when I asked for a sign-in link, the page told me there's no account with my email address. I typed it very carefully, twice. Have I been deleted? I have {posts} posts on there that I really don't want to lose.`,
			`I got a new phone last week and now I can't get back in. Every time I put my email in, it says it can't find an account with that address. It's the address I signed up with, I'm sure of it: your welcome email is still in my inbox.`
		],
		detail: [`I've tried on my laptop as well as my phone, and get the same message.`, `I even checked for typos by copying the address out of your welcome email.`],
		quick: [`Can I be signed in on my phone and my laptop at the same time?`, `Yes. Each device keeps its own sign-in, so asking for a link on your laptop doesn't sign your phone out.`],
		reply: `Sorry for the fright. As far as I can tell your account and your posts haven't gone anywhere. Could you tell me exactly which address you're typing, and on which device you first signed up? That helps me find the right account.`,
		need: `the address you're typing and the device you signed up on`,
		turns: [
			[`It's {email}. I signed up on my old phone, {anOldDevice}, from a link in a newsletter I think.`, `Thanks. I can see an account with your posts on it, created on {joined}, so it's there. The odd thing is that searching for your address doesn't find it, but searching for your display name does. Give me a few minutes to work out why the two don't match.`, arts.lookupSpace, 'a'],
			[`That's a relief at least. Is it something I did?`, `Not really. The address on your account was saved with a space at the end, most likely added by your old phone's keyboard when it filled the address in for you. When you type it now, without the space, our side treats it as a different address and finds nothing.`],
			[`So should I type a space at the end every time?`, `That would work, but you shouldn't have to, and most phones tidy the space away before you can even send it.`],
			[`Could the same thing have happened to my partner? We signed up on the same evening, from the same newsletter.`, `If it was on the same phone, possibly. If they have any trouble, ask them to write in from their address and mention this ticket, and I'll check straight away.`]
		],
		ends: {
			sorted: {
				agent: `I've corrected the address on your account, so it no longer has the space at the end. Could you ask for a sign-in link again, typing the address as normal? It should arrive within a minute or two.`,
				member: [`It worked! I'm in, and all my posts are there. Thank you so much.`, `The link arrived straight away and I'm back in. What a relief, thanks.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'member']
	},
	{
		key: 'twoaccounts',
		area: 'account',
		weight: 2,
		solo: true,
		avoid: ['displayname', 'copy', 'reads', 'export'],
		avoidAreas: ['writing'],
		subjects: ['All my posts are gone', 'Empty profile??', 'Where are my posts', 'Lost everything'],
		open: [
			`I signed in this morning and my profile is completely empty. No posts, no drafts, nothing. Yesterday I had {posts} posts. Please tell me they're not gone.`,
			`My posts have disappeared! My profile says I joined on {date2} and have written nothing, but I've been writing here since {joined}. Has there been some kind of reset?`
		],
		detail: [`I haven't changed anything. I only asked for a new link because I'd been signed out on my new phone.`, `I've checked the website and the app, and both look empty.`],
		quick: [`If I change my display name, do my old posts change too?`, `Yes. The name sits on your account, so every post you've written shows the new one.`],
		reply: `I understand how alarming that is. Posts don't vanish on their own, so let's find them. Could you tell me the address you sign in with and the title of one of your posts?`,
		need: `the address you sign in with and the title of one of your posts`,
		turns: [
			[`I sign in with {email}. One of my posts is "{title}".`, `Thank you. That post is safe and still published. It belongs to an account with your address as well, but on that account the address was saved with a space at the end. The account you're signed in to now was created on {date2}: when you asked for a link, the address you typed didn't match the old one, so a new, empty account was made for you.`, arts.twoAccounts, 'a'],
			[`So I have two accounts? I don't remember signing up twice.`, `You wouldn't: asking for a sign-in link with an address we don't recognise creates a new account, so from your side it looked like an ordinary sign-in. You didn't do anything wrong.`],
			[`Will my posts keep their links? I've shared a few of them.`, `Yes. A link points at the post, not at the account, so whatever we do with the accounts, the links keep working.`],
			[`Which name will show on my posts afterwards?`, `Whatever the account they end up on says. The old account says "{display}" and the new one "{display2}", so tell me if you'd rather keep the new one.`]
		],
		ends: {
			sorted: {
				agent: `I've moved things round: your old account now has {email} on it without the space, and the empty account from {date2} is closed. Ask for a new sign-in link and you'll land on the account with all your posts.`,
				member: [`Everything's back, every post and every draft. Thank you, I was close to tears this morning.`, `That's done it. I'm on my old account with all my posts again. Thanks for sorting it so quickly.`]
			},
			change: {
				note: `Two accounts for this person: the original, saved as "{email} " with a trailing space, and the empty one from {date2} with the clean address. The admin tool won't put an address on one account while another has it, and we don't want support moving posts between accounts by hand. We'll build a proper way to merge two accounts; it's on the list. Please don't hand-edit these meanwhile.`,
				agent: `I've checked with our developers. Your posts are safe on the old account, but joining the two accounts needs a change on their side that isn't built yet, and doing it by hand risks muddling things. It's on their list now, and I'll write as soon as it's ready. Until then, please don't delete anything from either account.`,
				member: [`OK. Frustrating, but as long as nothing is lost I can wait.`, `Thanks for being straight with me. Please let me know when it's done.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'change', 'change', 'member']
	},
	{
		key: 'spam',
		area: 'account',
		weight: 2,
		subjects: ['Sign-in emails not arriving', 'No link', 'Still waiting for the email', 'Emails very slow'],
		open: [
			`I've asked for a sign-in link four times this evening and nothing has come. I've checked the address. It worked fine last week.`,
			`Your sign-in emails take ages to arrive, sometimes half an hour, and by the time they do I've given up. Is something wrong at your end?`
		],
		detail: [`Nothing in spam either, as far as I can see.`, `A friend tried just now and hers arrived straight away, so I don't know what's going on.`],
		quick: [`How long does a sign-in link last?`, `Thirty minutes from when it's sent, and it works once. If it has expired, ask for a new one; the old one stops working as soon as you do.`],
		reply: `Sorry about that. Let me check what our mail service did with them. Which address are you asking for links with, and roughly when did you ask for the last one?`,
		need: `the address you use and roughly when you last asked for a link`,
		turns: [
			[`It's {email}, and the last one was at about {pastTime} on {pastday}.`, `Thanks. Our mail service says each of those links was handed to your provider within seconds and accepted, so they reached your mailbox's servers. Something on that side is holding them or filing them away.`, arts.mailLog, 'a'],
			[`I've looked in spam and there's nothing there either.`, `Some mailboxes have a second place that isn't the spam folder. {providerTip}`],
			[`Can't you send the link by text message instead?`, `Not at the moment, I'm afraid: email is the only way we sign people in.`],
			[`Is it something about my address? Friends with the same provider get your emails fine.`, `It can depend on the mailbox rather than the provider: each mailbox learns what its owner treats as junk, so two people at the same provider can see different things.`]
		],
		ends: {
			sorted: {
				agent: `If you find them there, add our sending address, no-reply@mail.copperleaf.example, to your contacts or safe senders. That usually brings future links straight to the inbox.`,
				member: [`Found them, all of them, in {where}! I've added you to my contacts and the next link came in seconds. Thanks.`, `There they were, in {where}. I've marked you as safe and it's instant now. Thank you.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'member']
	},
	{
		key: 'typo',
		area: 'account',
		weight: 1,
		solo: true,
		fromAlt: true,
		avoid: ['displayname', 'reads', 'export', 'copy', 'tz', 'newsletter'],
		avoidAreas: ['writing', 'profile'],
		subjects: ['Wrong email address on my account', 'I made a typo', 'Please change my email'],
		open: [
			`I signed up a while ago and only now realised I typed my email wrong: {typo} instead of {email}. I haven't been able to sign in since that first day, because the links go to an address that doesn't exist. Can you fix it?`,
			`My sign-in links never come, and I've just worked out why: I spelled my own email address wrong when I signed up. It should be {email}, but I think I put {typo}.`
		],
		detail: [`I only noticed because I looked at the welcome email and saw the address it was sent to.`, `I've been reading on the website without signing in, but I miss being able to write.`],
		quick: [`Can I have more than one account?`, `You can, with different email addresses, but your posts stay with the account they were written on.`],
		reply: `That's easily done, and fixable. Before I change an address I need to be sure the account is yours: could you tell me the display name on it, and the title of something you've written or started?`,
		need: `the display name on the account and the title of a post or draft`,
		turns: [
			[`The name is "{display}" and I've got a draft called "{dtitle}". I started it on my phone the day I signed up.`, `That matches. One more thing, since I can't write to the misspelt address: could you reply from {email}, the address you want on the account? Then I know it's really yours.`],
			[`I am writing from it, aren't I? Oh, wait, this is my other address. Sending from the right one now.`, `Got it, that one came from {email}. Thank you.`],
			[`While you're there, could you change my display name to "{display3}"?`, `Of course. Display names can be changed whenever you like; only the address needs these checks.`],
			[`Will my draft still be there once you've changed it?`, `Yes. Changing the address doesn't touch anything you've written.`]
		],
		ends: {
			sorted: {
				agent: `All done: the account now has {email} on it, and the display name is "{display3}". Ask for a sign-in link with that address and it'll come straight to you.`,
				member: [`I'm in, and my draft is still there. Thanks so much.`, `Worked first time. Thank you for being so patient with me.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'member'],
		prep: (r, s) => {
			Object.assign(s, { posts: '0', drafts: '1', panelEmail: s.typo });
		}
	},
	{
		key: 'changeemail',
		area: 'account',
		weight: 2,
		avoid: ['newsletter'],
		solo: true,
		subjects: ['Changing my email address', 'New email', 'Moving my account to another address'],
		open: [
			`I'm leaving {org} at the end of the month and my email there will stop working. How do I move my Copperleaf account to my personal address, {email2}?`,
			`Can I change the email address on my account? I can't find anywhere in the settings to do it. I signed up with my address at {org}, and I'd like to use {email2} from now on.`
		],
		detail: [`I'd rather not lose my posts, so I want to get this right before the old address closes.`, `I've looked under Settings in the app and on the website and couldn't see anything.`],
		quick: [`Does changing my email address change my display name?`, `No, the two are separate. Your display name stays exactly as it is.`],
		reply: `There isn't a setting for it yet, but I can change it for you. I just need to know both addresses are yours: could you reply to this email from {email2} and mention this ticket's number?`,
		need: `a reply from {email2}`,
		turns: [
			[`Done, this one is from {email2}.`, `Thanks, that came through from the new address. Before I swap them: does anyone else use your current address, a shared mailbox for instance?`],
			[`No, it's just mine.`, `Good. Once I've made the change, sign-in links go only to {email2}, and the old address stops working on Copperleaf straight away.`],
			[`Will I have to sign in again on my phone?`, `No. Devices you're already signed in on stay signed in. You'd only need the new address next time you ask for a link.`],
			[`And my posts will still show the same name?`, `Yes. Your display name doesn't change, and your email address is never shown to other members either way.`]
		],
		ends: {
			sorted: {
				agent: `Done: {email2} is now the address on your account. Next time you ask for a sign-in link, use that one.`,
				member: [`Perfect, I've just signed in on my laptop with the new address. Thanks!`, `Brilliant, the link came to my personal inbox. Thank you.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'member'],
		prep: (r, s) => {
			s.email = `${s.local}@${s.orgDomain}`;
		}
	},
	{
		key: 'linkexpired',
		area: 'account',
		weight: 2,
		avoid: ['newsletter'],
		solo: true,
		subjects: ['Link expired straight away', 'Sign-in link says it has already been used', 'Can’t sign in from work'],
		open: [
			`Every sign-in link I get says it has expired or has already been used, even when I click it the moment it arrives. I haven't clicked it anywhere else.`,
			`I'm trying to sign in on my work laptop. The email comes, I click the link, and I get "This link has expired or has already been used". I've tried five times now.`
		],
		detail: [`It works fine on my phone with my personal email, but that isn't the address on my account.`, `I've tried pasting the link into a different browser, and it's the same.`],
		quick: [`Is there a way to sign in with a password instead of a link?`, `Not at the moment: Copperleaf only signs you in with a link sent to your email address.`],
		reply: `Sorry, that's maddening. A link works once, so something may be opening it before you do. Is the address a work or school one, and do you know whether your organisation checks the links in incoming email?`,
		need: `whether it's a work or school address and whether links in your email are checked`,
		turns: [
			[`Yes, it's my work address at {org}. I've no idea about checking, but all the links in our email go through something called {scanner}.`, `That would explain it. {scanner} visits every link in an incoming email to make sure it's safe, before the email reaches you, and for us that visit counts as the link's one use. By the time you click, it's already spent.`],
			[`That's ridiculous. So I just can't use Copperleaf with my work address?`, `Not reliably at the moment, I'm afraid. I've seen the same thing with a few other organisations that use link checkers.`],
			[`Can't you make the link work twice?`, `Not from my side. How links behave is decided in our sign-in service, so it's one for the developers.`],
			[`Does that mean someone else could have signed in as me?`, `No. The checker only opens the page to look at it; it doesn't keep a sign-in, and nothing else happened on your account.`]
		],
		ends: {
			change: {
				note: `Confirmed: {scanner} fetches the link on delivery, and sign-in marks a link used on its first visit. We'll have the link open a page with a "Sign in" button, so a checker's visit doesn't use it up. On the list.`,
				agent: `Our developers have confirmed it: {scanner}'s check uses up the link. They're changing sign-in so that the link opens a page with a button for you to press, which a checker won't press for you. I'll let you know here when that's live.`,
				member: [`OK, thanks. I'll wait for that.`, `Thanks for finding out. Please do tell me when it's changed.`]
			},
			workaround: {
				agent: `Until that changes, the simplest way round it is to put a personal address on your account. If you reply from that address, I'll switch it over, and you can switch back later.`,
				member: [`Fine, I'm writing from {email2} now. Please use that for the moment; I'd like to move back to my work address once the links are fixed.`, `OK, let's do that for now. This is my personal address, {email2}.`]
			}
		},
		outcomes: ['change', 'change', 'workaround', 'member'],
		prep: (r, s) => {
			s.email = `${s.local}@${s.orgDomain}`;
		}
	},
	{
		key: 'closeaccount',
		area: 'account',
		weight: 1,
		avoid: ['export', 'reads'],
		avoidAreas: ['writing', 'profile', 'reading'],
		solo: true,
		subjects: ['Close my account', 'Delete my account please', 'Leaving Copperleaf'],
		open: [
			`Please close my account and take down everything I've written. I don't want my posts online any more.`,
			`How do I delete my Copperleaf account? I can't find the option anywhere. I've enjoyed it, but I'm stepping back from writing online.`
		],
		detail: [`Nothing has gone wrong; I just want a clean slate.`, `Please let me know once it's done.`],
		quick: [`If I stop posting for a while, does my account get closed?`, `No. Accounts stay open however long you're away, and your posts stay up.`],
		reply: `I'm sorry to see you go. There's no button for it yet, so we'll do it from here. Would you like a copy of your posts first? Once the account is closed they can't be brought back.`,
		need: `whether you'd like a copy of your posts first`,
		turns: [
			[`Yes, a copy would be good, actually. Just the published ones.`, `Of course. I'll send them as one file with each post's title, date and text, and close the account once you've checked it.`],
			[`Will they disappear straight away, or will they still turn up on Google?`, `They come off Copperleaf as soon as the account closes. Search engines drop pages that no longer exist the next time they visit, which usually takes from a few days to a few weeks.`],
			[`And my email address, do you keep it?`, `No. When the account closes the address goes with it, so you could even sign up again with it one day.`],
			[`Could I come back later and have my posts put back?`, `No, I'm afraid. Once an account is closed its posts are gone for good, which is why I'd like you to have the copy first.`]
		],
		team: 'privacy',
		handover: `Member wants the account closed and the posts taken down, after a copy of the published ones. Writing from the account's own address. Over to you for the closure.`,
		ends: {
			sorted: {
				agent: `Here's your file, {exportName}, with all {posts} published posts. As agreed, I've now closed your account and taken your posts down.`,
				member: [`Got it, thank you, and thanks for making it painless.`, `Received. Thank you for everything, and good luck with Copperleaf.`]
			}
		},
		outcomes: ['sorted', 'team', 'member']
	},
	{
		key: 'joined',
		area: 'profile',
		weight: 2,
		subjects: ['Profile says Invalid Date', 'Bug on my profile', 'App profile looks broken', 'Join date missing'],
		open: [
			`Small thing, but it bugs me: on my profile in the app, under my name, there's no proper join date. On the website it says I joined on {joined}, which is right.`,
			`My profile in the {platform} app looks broken where the join date should be. My friend's looks the same on her phone, so maybe it's everyone?`
		],
		detail: [`It's been like that since I installed the app, I think.`, `Not urgent at all, I just thought you'd want to know.`],
		quick: [`Can other members see my email address on my profile?`, `No. Your profile shows your display name, your bio and your posts; your email address is never shown to other members.`],
		reply: `Thanks for spotting it, and for checking the website too. Which version of the app are you on? It's at the bottom of the Settings screen. A screenshot of the profile would help as well.`,
		need: `your app version and a screenshot of the profile`,
		turns: [
			[`Settings says {appv}, on {aDevice}. Screenshot attached.`, `Thanks. I've opened your profile in the same version on our test phone and I see exactly the same, so it isn't your phone. Every profile I try looks like that in the app.`, arts.profileShot],
			[`So it's broken for everybody?`, `In the app, it looks that way for every profile. The website shows the date properly.`],
			[`Does it matter? Will it break anything else?`, `It's only the join date. Your profile, your posts and your bio are all fine.`],
			[`My friend says hers shows a date on her other phone. Is it only some phones?`, `I've seen it on both iPhone and Android, so I'd rather not guess. It may depend on the version of the app.`]
		],
		team: 'mobile',
		handover: `Join date on profiles is blank or "Invalid Date" in the {platform} app ({appv}), for every profile I tried; the website shows it fine. Can you take a look?`,
		bounce: `Had a look. The app reads the join date from createdAt, the same name it reads on posts. The profile response from the API calls it joinedAt, so the app finds nothing there and shows what the member saw. Nothing to fix in the app, so passing back.`,
		ends: {
			change: {
				note: `Yes: posts send createdAt, profiles send the same kind of date as joinedAt, and the apps expect createdAt in both places. We'll rename it on our side so the apps can read it. On the list.`,
				agent: `Our developers found it: the app looks for the date under one name and our servers send it under another. They're changing the server side to match, so the date will appear without you needing to update the app. I'll update this ticket when it's done.`,
				member: [`Ha, good to know it wasn't me. Thanks!`, `Thanks for explaining. No rush on my side.`]
			}
		},
		outcomes: ['change', 'change', 'team', 'member']
	},
	{
		key: 'bio',
		area: 'profile',
		weight: 2,
		after: APP25 + DAY,
		subjects: ['Bio not showing', 'Where is the bio?', 'Profile question', 'New bio feature'],
		open: [
			`I read in your newsletter that we can add a bio now. I've written one on the website and it shows there, but on my phone my profile looks exactly the same as before.`,
			`Where do I add a bio? Everyone's talking about them, but I can't see the option anywhere in the app.`
		],
		detail: [`I spent ages on it, so I'd like people to see it!`, `I've tried closing the app and opening it again.`],
		quick: [`How long can a bio be?`, `There's no strict limit, but a few lines works best: longer bios get cut short on small screens, with a "more" link to read the rest.`],
		reply: `Bios came in on 14 October, and the apps show them from version 2.5.0. Which version does the bottom of your app's Settings screen show?`,
		need: `the version at the bottom of the app's Settings screen`,
		turns: [
			[`It says {appv}.`, `That's the reason: bios appear from 2.5.0, and your phone has {appv}. Updating from the {store} should bring it in, and your bio will appear on its own, since it's saved on our side.`],
			[`While I'm at it, can people on older versions see my bio?`, `Not in the app, no: anyone on a version before 2.5.0 sees profiles without bios. Everyone on the website sees it.`],
			[`Can I put a link to my blog in it?`, `You can type one in, and it shows as text; it isn't clickable yet.`],
			[`Is there anything else new in 2.5.0 I should know about?`, `Bios are the main thing. There are a few smaller fixes too, mostly in the editor.`]
		],
		ends: {
			sorted: {
				agent: `So updating the app is the one thing to do. If the {store} doesn't offer the update, let me know which {platform} version your phone has.`,
				member: [`Updated, and there's my bio, and the button to edit it too. Thanks!`, `That was it. Updated the app and it's all there now.`]
			},
			workaround: {
				agent: `If the {store} won't offer the update, your phone is probably on an older {platform} version that 2.5.0 doesn't support, which would mean bios only on the website for that phone. Your bio is saved either way, and everyone reading on the website or a newer phone sees it.`,
				member: [`Right, the {store} says it's up to date, so it must be my old phone. I'll manage my profile on the website then. Thanks for explaining.`, `No update offered, so I'll stick to the website for the bio. That's fine.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'workaround', 'member']
	},
	{
		key: 'bioformat',
		area: 'profile',
		weight: 1,
		after: APP25 + DAY,
		subjects: ['Line breaks in my bio', 'Bio formatting', 'My bio is one long paragraph'],
		open: [
			`I wrote my bio in three short paragraphs, and when I look at it on the website everything has run together into one block. Is there a way to keep the line breaks?`,
			`My bio has turned into one long line. I typed it with a blank line between the bit about me and the bit about what I write, and the blank line is gone.`
		],
		detail: [`It's not a big deal, but it reads oddly as one block.`, `I've tried typing it again, and the same thing happens.`],
		quick: [`Can I add a photo to my profile?`, `Not yet. Profiles have your display name, your bio and your posts for now.`],
		reply: `Thanks for letting me know. Where did you write it, on the website or in the app, and where are you seeing it run together?`,
		need: `where you wrote the bio and where it runs together`,
		turns: [
			[`I typed it in the app, and I'm looking at it on the website.`, `Thanks. Your bio is saved with the line breaks, I can see them on our side, so nothing has been lost. The website just shows a bio as one paragraph at the moment, while the app keeps the breaks.`, arts.bioText, 'a'],
			[`So in the app it looks right?`, `It should, from version 2.5.0. Readers on the website see it as one paragraph.`],
			[`Can I use italics in it?`, `Not yet: bios are plain text everywhere.`]
		],
		team: 'web',
		handover: `The website shows bios as one paragraph and drops the line breaks the member typed; they're saved with the bio, and the app shows them. Can the profile page keep them?`,
		teamFix: `The profile page now keeps the line breaks in bios, so yours shows as you wrote it. Thanks for reporting it.`,
		ends: {
			sorted: { member: [`Just looked and it's perfect now, three paragraphs. Thank you!`, `It shows properly on the website now. Thanks to you both.`] },
			workaround: {
				agent: `Until the website keeps them, some members separate the parts with a slash or a dash on one line, which reads fine in both places.`,
				member: [`I'll go with slashes for now. Thanks.`, `Fair enough, a dash it is until then.`]
			}
		},
		outcomes: ['team', 'sorted', 'workaround', 'member']
	},
	{
		key: 'displayname',
		area: 'profile',
		weight: 2,
		urgent: true,
		subjects: ['Changing my name', 'Pen name', 'Display name change'],
		open: [
			`I'd like to change my display name from "{display}" to "{display3}". I've started writing under a pen name and want my posts to match.`,
			`How do I change my name on Copperleaf? I signed up as "{display}" and I'd rather people saw "{display3}".`
		],
		detail: [`I've looked in Settings and on my profile and can't see where to do it.`, `No rush, but I'd like it done before my next post goes up on Saturday.`],
		quick: [`Does my display name have to be unique?`, `No, two members can have the same display name. Your posts belong to your account, not to the name.`],
		reply: `Happy to help. There's no setting for it in the app yet, so I'll change it from here. Just to check: it's the account with {email}, the address you're writing from?`,
		need: `confirmation that it's the account with {email}`,
		turns: [
			[`Yes, that's the one.`, `Thanks. Before I change it: the new name shows on all your posts, old ones included, as soon as it's saved. Is that what you'd like?`],
			[`All of them, please. I'd like a clean break.`, `That's how it works in any case: the name sits on your account, and every post shows whatever the account says.`],
			[`Will people who've bookmarked my posts lose them?`, `No. Links to your posts don't include your name, so bookmarks keep working.`],
			[`Can I change it back if I don't like it?`, `Of course. Write in again any time and I'll change it.`]
		],
		ends: {
			sorted: {
				agent: `Done. Your display name is now "{display3}". It can take a minute to show in the app; pulling down on your profile refreshes it.`,
				member: [`There it is, on every post. Thank you!`, `Lovely, it's changed everywhere. Thanks for doing it so quickly.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'sorted', 'member']
	},
	{
		key: 'copy',
		area: 'other',
		weight: 1,
		subjects: ['Someone copied my post', 'Plagiarism', 'Stolen post'],
		open: [
			`A member called "{rname}" has copied my post "{title}" word for word and published it as their own, two days after mine.`,
			`I've just found my post "{title}" on Copperleaf under someone else's name, "{rname}". They haven't even changed the title. What can be done?`
		],
		detail: [`I still have my original draft with its dates, if that helps.`, `I'm honestly quite upset about it.`],
		quick: [`Can I hide my posts from people who aren't signed in?`, `Not at the moment: published posts can be read by anyone.`],
		reply: `Thank you for reporting it, and I'm sorry; that's a horrible thing to find. Could you tell me roughly when you published yours, so the community team can compare the two?`,
		need: `roughly when you published your post`,
		turns: [
			[`Mine went up on {date1}, in the evening.`, `Thanks. I can see both: yours was published on {date1}, the other on {copyDate}, and the text is the same apart from the last line.`],
			[`What happens to them now?`, `The community team look at reports like this against our guidelines and decide what to do. They don't share what happens to another member's account, but they do act on copies like this.`],
			[`Will my post be affected?`, `No. Yours stays exactly as it is.`],
			[`Should I put a note on my post saying it's the original?`, `You can if you'd like, but there's no need: the community team can see when each post was published.`]
		],
		team: 'community',
		handover: `Reported copy: "{title}" by {display}, published {date1}, republished word for word by "{rname}" on {copyDate}. Same title, same text bar the last line.`,
		teamFix: `We've looked at both posts and taken the copy down. Thank you for reporting it, and sorry it happened.`,
		ends: { sorted: { member: [`It's gone. Thank you, that was quick.`, `Thank you both. I really appreciate how seriously you took it.`] } },
		outcomes: ['team', 'team', 'sorted', 'member']
	},
	{
		key: 'bioedit',
		area: 'profile',
		weight: 2,
		after: SLUGS + 5 * DAY,
		solo: true,
		subjects: ['Someone changed my bio', 'Has my account been hacked?', 'Security worry'],
		open: [
			`My bio has changed and I didn't change it. It now says "{weirdBio}". I'm worried someone has got into my account.`,
			`I think my account has been hacked. My bio is different, it says "{weirdBio}", and I never wrote that.`
		],
		detail: [`I don't share my devices as far as I know.`, `Nothing else looks different, but I haven't checked everything.`],
		quick: [`Can I see which devices I'm signed in on?`, `Not yet. If you're unsure about a device, signing out on it is the surest way.`],
		reply: `I understand the worry, so let's check. Have you signed in anywhere new lately, or shared a device with anyone? And when did you last see your bio as you wrote it?`,
		need: `where you've signed in lately and when you last saw your bio as you wrote it`,
		turns: [
			[`Only my phone and my laptop. I last looked at it on {pastday} and it was fine then.`, `Thanks. I can see your bio was saved again on {date2}, but not from which device or by whom: we keep the bio itself, not a history of changes to it. What I can see is when sign-in links were sent to your address.`, arts.mailLogBio, 'a'],
			[`Those times are odd. I was asleep at 03:10.`, `Asking for a link doesn't sign anyone in: the link only ever goes to your inbox. So unless someone can read your email, a request like that one couldn't get anybody in.`],
			[`Should I be worried about my email then?`, `It's worth a look. Most email services list recent sign-ins in their security settings, and anything you don't recognise there is worth acting on.`],
			[`Is there anything else that stays signed in?`, `Any phone, tablet or computer you've signed in on stays signed in until you sign out on it. So anyone using one of those would be signed in as you.`]
		],
		team: 'privacy',
		handover: `Member says their bio changed without them doing it. Sign-in link requests on {date2} include one at 03:10. Nothing else odd that I can see. Could you take a closer look at the account?`,
		ends: {
			sorted: {
				agent: `So the next step is to check who uses your laptop and your phone, and to sign out on any device you're not sure of. Your email's security page is worth a look too.`,
				member: [`Mystery solved, and I'm a bit embarrassed. My son used my laptop and thought it would be funny. I've changed it back and signed out on the laptop. Sorry for the fuss!`, `Found it: my niece was staying and borrowed my tablet. Bio changed back, tablet signed out. Thanks for being so calm about it.`]
			}
		},
		outcomes: ['sorted', 'team', 'member']
	},
	{
		key: 'draft',
		area: 'writing',
		weight: 3,
		urgent: true,
		subjects: ['My post is missing', 'Post not showing in the feed', 'Did my post go through?', 'Feed not updating'],
		open: [
			`I wrote a post last night, "{dtitle}", and it isn't in the feed. My friend can't see it either. It's definitely saved, because I can see it when I'm signed in.`,
			`Is something wrong with the feed? My new post hasn't appeared, even after several hours. I've refreshed the app a dozen times.`
		],
		detail: [`It's the first thing I've written in months, so I was quite excited to share it.`, `I've written posts before and they've always appeared.`],
		quick: [`How many posts does the feed show at once?`, `Twenty at a time, newest first. Scrolling to the bottom loads the next twenty.`],
		reply: `Let's find out. Could you tell me the title of the post, and whether you wrote it in the app or on the website?`,
		need: `the post's title and where you wrote it`,
		turns: [
			[`It's "{dtitle}", written in the app on my {device}.`, `Thanks. I can see it on your account. It's saved, but as a draft, and drafts are only visible to you, which is why you can see it and your friend can't.`, arts.postsDraft, 'a'],
			[`But I pressed Done! Isn't that publishing?`, `In the app, Done saves the post and closes the editor; it stays a draft until you press Publish, at the top right of the post. Since the end of August every new post starts as a draft, so you can come back to it before anyone sees it.`],
			[`Can I publish it from the website too?`, `Yes. Open it from Drafts on your profile and press Publish; it's the same post either way.`],
			[`Will my friends get told when I publish?`, `No, Copperleaf doesn't send notifications about new posts. It'll simply appear in the feed for anyone who opens it.`]
		],
		ends: {
			sorted: {
				agent: `So the fix is to open the draft and press Publish. Once you do, it goes to the top of the feed straight away.`,
				member: [`Published, and there it is at the top. I feel silly now, thanks.`, `Done, it's up. Apparently I've been pressing Done for weeks!`]
			}
		},
		outcomes: ['sorted', 'sorted', 'sorted', 'member']
	},
	{
		key: 'postdate',
		area: 'writing',
		weight: 3,
		subjects: ['Wrong date on my post', 'Post dated weeks ago', 'Date bug', 'Why is my new post old?'],
		open: [
			`I published "{dtitle}" today, and it's at the top of the feed, but it says it was posted on {started}. That's when I started the draft, not when I published it. People will think it's old.`,
			`Why does my new post show a date from weeks ago? I published "{dtitle}" this morning, and the date on it is {started}.`
		],
		detail: [`It's annoying, because I worked on it for weeks to get it right.`, `I've checked my phone's date and time, and they're correct.`],
		quick: [`Can I see the drafts I started on my phone when I'm on the website?`, `Yes. Drafts are saved on our side rather than on the phone, so they show up wherever you're signed in.`],
		reply: `Thanks for the detail. Is that the date you see on the website, in the app, or both?`,
		need: `where you see the wrong date`,
		turns: [
			[`Both. The website says {started} and so does the app.`, `Thanks. I can see the post: it was started on {started} and published on {openDate}, so we do have the right date. The post just shows the other one.`, arts.postDates, 'a'],
			[`So it's a bug?`, `It is. The date shown on a post comes from when it was first saved, and for a post that sat in your drafts for a while, that's the wrong one to show.`],
			[`Does the feed go by the wrong date too?`, `No, the feed is in order of publishing, which is why yours is at the top. Only the date printed on the post is off.`],
			[`Are my older posts affected too? Some of them sat in drafts for weeks.`, `Yes: any post that spent time as a draft shows the day it was started. Posts you published straight away look right, since the two days are the same.`]
		],
		team: 'web',
		handover: `Posts show the day the draft was started rather than the day they were published, on the website and in the app. Example: "{dtitle}", started {started}, published {openDate}. Can you check what the post page prints?`,
		bounce: `The website prints the date the API gives it, and for posts the API only sends createdAt; there's no publishing date in the response for us to use. Same in the apps, I checked with Tomasz. Passing back.`,
		ends: {
			change: {
				note: `Confirmed: the post response has createdAt but no publishedAt at all, so the website and the apps have nothing to show but the draft's date. We'll add publishedAt (empty for drafts) to the response, and web and mobile will switch to it. On the list.`,
				agent: `Our developers have confirmed it: our servers don't yet send the publishing date to the website and the apps, only the date the post was first saved. They're adding it, and once that's out the right date will show without you doing anything. I'll update this ticket when it lands.`,
				member: [`Thanks, glad it's not just me.`, `OK, that makes sense. Thanks for chasing it.`]
			}
		},
		outcomes: ['change', 'change', 'change', 'team', 'member']
	},
	{
		key: 'slugbreak',
		area: 'writing',
		weight: 3,
		after: SLUGS + DAY,
		subjects: ['Link to my post is broken', 'Page not found when I share my post', 'Shared link goes nowhere', 'Broken link'],
		open: [
			`When I share my post "{btitle}", people get "Page not found". If I open it from my own profile it's fine. I've shared it in two groups already and it's embarrassing.`,
			`The link to my newest post doesn't work when I paste it into {chatApp}. My other posts work fine. It's "{btitle}".`
		],
		detail: [`I've checked, and it's the same link I copied from the address bar.`, `It's only this one post, as far as I can tell.`],
		quick: [`Does a post keep the same link if its title changes?`, `Yes. The link is made from the title when the post is first saved, and it stays the same afterwards.`],
		reply: `Sorry about that. Could you paste the link exactly as you shared it, and the address your friends end up on?`,
		need: `the link as you shared it and the address your friends end up on`,
		turns: [
			[`The first one is what I shared. A friend sent me the second, where she lands.`, `Thanks, that shows it. Your post's link ends in "{bslug}", with the {punctName} from the title, and {why}. There's no post at the shorter address, hence the error.`, arts.linkCompare],
			[`So it's because of my title?`, `Yes, the {punctName}. Since the update on 14 October, a post's link is made from its title, and at the moment punctuation in the title is kept in the link.`],
			[`Will it happen to my other posts?`, `Only to posts with punctuation in their titles. I've looked through yours and {otherCheck}.`],
			[`Can I change the title and get a new link that way?`, `Changing the title doesn't change the link: the link is fixed when the post is first saved.`]
		],
		ends: {
			change: {
				note: `Yes: slugify lowercases and swaps spaces for dashes but keeps everything else, so "{btitle}" became "{bslug}". We'll have it drop punctuation and trim dashes from the ends for new posts. On the list.`,
				agent: `Our developers have confirmed it, and they're changing how links are made so that punctuation is left out. I'll let you know here when it's done.`,
				member: [`Thanks. I'll hold off sharing it until then.`, `OK, thanks for finding out what it was.`]
			},
			sorted: {
				agent: `I've changed your post's link by hand, so it now ends in "{bfixed}", without the {punctName}. Could you try sharing it again?`,
				member: [`The new link works everywhere, even in {chatApp}. Thank you!`, `Shared it again and my friends can open it now. Thanks.`]
			},
			workaround: {
				agent: `Until that changes, there's a way round it: share the post with the Share button in the app instead of copying the address. It sends the link in a form that {chatApp} and browsers don't cut short.`,
				member: [`The Share button version works. Slightly annoying, but fine for now.`, `Tried the Share button and it opens properly. I'll use that.`]
			}
		},
		outcomes: ['change', 'change', 'sorted', 'workaround', 'member']
	},
	{
		key: 'slugugly',
		area: 'writing',
		weight: 1,
		after: SLUGS + DAY,
		subjects: ['Messy link', 'Strange characters in my post link', 'Can the link be tidied up?'],
		open: [
			`The web address of my post "{utitle}" has {uglyBits} in it, and it looks broken when I put it in my newsletter. Can it be tidied up?`,
			`Why does the link to "{utitle}" look so odd? It has {uglyBits} in it, and my newsletter tool turns them into codes.`
		],
		detail: [`It's a small thing, but my newsletter goes to a couple of hundred people.`, `The other posts in the same issue had perfectly tidy links.`],
		quick: [`Can I see all my drafts in one place?`, `Yes: your profile has a Drafts tab, visible only to you, with every draft, newest first.`],
		reply: `Thanks for the example. Does the link work when people click it, or does it only look odd?`,
		need: `whether the link works when people click it`,
		turns: [
			[`It works, it just looks messy. This is how it shows in my newsletter editor:`, `Thanks. The link is made from the title, and punctuation in the title, like your {uglyBits}, is kept in it at the moment. Your newsletter tool turns those characters into codes, which is why it looks like that.`, arts.encodedLink],
			[`Could I just change the title?`, `Changing the title wouldn't change the link, since the link is fixed when the post is first saved. I can change the link by hand, though, if you'd like.`],
			[`Will my older posts have the same problem?`, `Only the ones with punctuation in their titles. The rest have plain links.`]
		],
		ends: {
			sorted: {
				agent: `I've changed it by hand, so the link now ends in "{ufixed}". The old link stops working, so if you've already sent it out, let me know and we'll think again.`,
				member: [`Much better, thank you. It hasn't gone out yet, so no harm done.`, `Lovely and tidy now. Thanks!`]
			},
			change: {
				note: `Same as the other link tickets: punctuation stays in the slug. The fix for new posts is on the list.`,
				agent: `Our developers are changing how links are made, so that punctuation is left out of new ones. I'll let you know here when that's live.`,
				member: [`Then I'll leave this one as it is and wait for the change. Thanks.`, `Don't change this one; I'll wait for the proper fix.`]
			},
			workaround: {
				agent: `In the meantime, most newsletter tools let you put the link behind words, so readers see "read the post" rather than the address. That hides the codes.`,
				member: [`I'll do that, readers won't see it. Good idea.`, `Putting it behind a "read more" works for me. Thanks.`]
			}
		},
		outcomes: ['sorted', 'change', 'workaround', 'member']
	},
	{
		key: 'clash',
		area: 'writing',
		weight: 2,
		after: SLUGS + DAY,
		subjects: ["Can't save my draft", 'Error when saving', 'Something went wrong', 'App won’t save'],
		open: [
			`Every time I try to save a new draft called "{ctitle}", I get "Something went wrong, please try again". I've tried for two days. Other titles save fine.`,
			`I'm trying to start a post called "{ctitle}" and the app keeps saying something went wrong. I've restarted my phone and tried on wifi and on mobile data.`
		],
		detail: [`I've written about half of it already, so I really don't want to lose it.`, `I've even tried updating the app.`],
		quick: [`Does the app save while I'm typing, or only when I press Done?`, `It saves every few seconds while you type, as long as you're online, and again when you press Done.`],
		reply: `Sorry, that's frustrating. Could you tell me the exact title you're using, and whether the same thing happens on the website?`,
		need: `the exact title and whether the website does the same`,
		turns: [
			[`The title is exactly "{ctitle}". The website says the same. My partner opened the browser console and this is what it showed:`, `Thanks, that narrows it down. Another post on Copperleaf already has exactly that title: "{ctitle}" by {cother}, published on {date1}. Two posts can't share a link, and the link is made from the title, so the second one can't be saved.`, arts.clashConsole],
			[`But it's such a common title! Lots of people must write something called that.`, `You're right, and you're not the first to run into it. Before 14 October links weren't made from titles, so it never came up.`],
			[`Is what I've written lost?`, `It shouldn't be: your text is still in the editor. Copy it somewhere safe before you close it, just in case.`],
			[`Can I read the other post with the same title?`, `Of course, it's published, so anyone can read it: it's on {cother}'s profile.`]
		],
		ends: {
			workaround: {
				agent: `Until it's fixed, adding something to the title, like the date or a number, lets it save. "{ctitle} {n}" would work, for example.`,
				member: [`Added the week number and it saved first time. Fine for now.`, `Put a number on the end and it saved. A bit clunky, but it works.`]
			},
			change: {
				note: `createPost fails on the unique slug when another post already has the same title, and the error comes back as a plain 500. We'll add a number to repeated slugs so the post saves. On the list.`,
				agent: `Our developers have confirmed it: they're changing it so that a repeated title gets a number added to its link, and the post saves normally. I'll write when that's live.`,
				member: [`I'll keep it in my notes app until then.`, `Thanks. I'd rather keep the title, so I'll wait.`]
			}
		},
		outcomes: ['workaround', 'workaround', 'change', 'change', 'member']
	},
	{
		key: 'unpublish',
		area: 'writing',
		weight: 2,
		urgent: true,
		subjects: ['Published by mistake', 'Unpublish?', 'Please hide my post', 'Post went live too early'],
		open: [
			`I published "{dtitle}" by mistake. It was half finished and I meant to save it. Can I turn it back into a draft?`,
			`My draft "{dtitle}" has gone public, and I'm sure I didn't press Publish. Can you take it down while I finish it?`
		],
		detail: [`A couple of people may already have read it, which is mortifying.`, `I'd like to keep the text, just not have it public yet.`],
		quick: [`Can I see who has read my posts?`, `Not at the moment: Copperleaf doesn't show readers or count reads.`],
		reply: `Let's sort that out. There's no unpublish button yet, but I can put it back into your drafts from here. Could you confirm the title, so I take the right one?`,
		need: `the post's title`,
		turns: [
			[`It's "{dtitle}". It went up this morning, I think around {roughTime}.`, `Thanks, found it. It was published at {pubtime} on {openDate}, from your account. I can't see where from: we keep the time a post goes out, but not which device or button it came from.`, arts.postsPublished, 'a'],
			[`Then how do I know it wasn't someone else?`, `Publishing needs someone signed in as you, so it came from a phone, tablet or computer that's signed in to your account. On phones the Publish button sits just above where the keyboard closes, and a few members have tapped it by accident.`],
			[`Will anyone have been notified?`, `No. Copperleaf doesn't send notifications about new posts, so it was only seen by anyone who opened the feed in that time.`],
			[`Can I stop it happening again?`, `Taking care near the top of the screen when the keyboard closes is the best I can suggest for now. A draft only goes out when Publish is pressed.`]
		],
		ends: {
			sorted: {
				agent: `I've put "{dtitle}" back into your drafts. It's off the feed, and when you publish it again it'll go out as new.`,
				member: [`It's back in drafts. Thank you so much.`, `Phew. Thanks for sorting it so fast.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'sorted', 'member']
	},
	{
		key: 'edit',
		area: 'writing',
		weight: 2,
		after: SLUGS + DAY,
		subjects: ['Typo in my title', 'Edit a published post?', 'Correction needed'],
		open: [
			`There's a typo in the title of my published post: "{typoTitle}". I can edit drafts, but there's no edit button on published posts. How do I fix it?`,
			`I spotted a mistake in a post I published yesterday, right there in the title: "{typoTitle}". Is there any way to correct it?`
		],
		detail: [`It's been read a few times already, which is why I'd like it fixed quickly.`, `I can't believe I didn't notice before publishing.`],
		quick: [`Can I write a post with someone else, under both our names?`, `Not yet: each post belongs to one member's account.`],
		reply: `Sorry about that. Published posts can't be edited at the moment, but I can correct a title from here. What should it say?`,
		need: `the corrected title`,
		turns: [
			[`It should say "{fixedTitle}".`, `Thanks. One thing to know before I change it: the post's link was made from the title when it was first saved, and changing the title won't change the link, so the link keeps the old spelling.`],
			[`Hmm. Does anyone see the link?`, `Only in the address bar, or if you share it. The title on the page and in the feed will be the corrected one.`],
			[`There's a typo in the third paragraph too.`, `I can make small corrections in the text as well, if you send me the sentence and what it should say. For anything bigger it's best to wait until editing published posts is possible.`],
			[`Could you take it down so I can publish it again with the right title?`, `I could, but the new post would get a new link and a new date, and anyone who saved the old link would find nothing there. Correcting the title is gentler.`]
		],
		ends: {
			sorted: {
				agent: `Done: the title now reads "{fixedTitle}", and I've fixed the sentence in the third paragraph as you asked.`,
				member: [`Perfect, thank you. Nobody will ever know.`, `Looks right now. Thanks for fixing both.`]
			},
			change: {
				pre: `Actually, leave it. I'd rather wait until I can edit posts myself, and the link would look wrong anyway.`,
				agent: `Fair enough. Editing published posts is on our developers' list, and I'll let you know here when it arrives.`,
				member: [`Thanks. Please do.`, `Great, I'll wait for that.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'change', 'member']
	},
	{
		key: 'lostdraft',
		area: 'writing',
		weight: 2,
		subjects: ['Lost my writing', 'App crashed and my draft is gone', 'Two hours of work lost'],
		open: [
			`The app crashed while I was writing and I've lost about two hours of work. The draft is there, but it only has the first paragraph. Is there any way to get the rest back?`,
			`I wrote most of a chapter on the train this morning, and when I opened the draft tonight only the first part was there. Where has the rest gone?`
		],
		detail: [`I know it's probably my fault for writing offline, but I'm gutted.`, `It was the best thing I've written all year, of course.`],
		quick: [`Is there a limit on how long a post can be?`, `Not one you're likely to reach: members have posted pieces of well over ten thousand words.`],
		reply: `I'm so sorry. Let's see what we can find. Were you online the whole time you were writing, and which version of the app are you on?`,
		need: `whether you were online and your app version`,
		turns: [
			[`I was on a train, so probably offline for most of it. The app says {appv}.`, `Thanks. The app sends your draft to us every few seconds while it has a connection. The last version that reached us arrived at {pastTime}, and it's the one with only the first part.`],
			[`So the rest only ever existed on my phone?`, `Yes. While you're offline, the app keeps your typing on the phone and sends it once it's back online. If the app closed before it could, the text may still be in the phone's copy, so please don't delete or reinstall the app for now.`],
			[`Why did it crash in the first place?`, `I don't know yet. The mobile team see the app's crash reports and can usually tell.`],
			[`Is there a version history I could look through?`, `Not for drafts, I'm afraid: we keep the latest version that reached us, not the earlier ones.`]
		],
		team: 'mobile',
		handover: `Member wrote offline in the {platform} app ({appv}, {device}); the app closed, and the draft on our side only has the first part, last saved at {pastTime}. Can you help them get the phone's copy back?`,
		teamFix: `Thanks for holding off on reinstalling. If you open the app with the phone in airplane mode and go to Drafts, there should be a banner saying "Unsent changes". Tap it, then turn airplane mode off, and the app will send the rest of your draft.`,
		ends: {
			sorted: { member: [`IT'S BACK. The banner was there and the whole chapter came through. I could hug you both.`, `That worked: the banner was there, and the full draft is back. Thank you so much.`] },
			workaround: {
				pre: `I'm afraid I'd already deleted the app and put it back on before I wrote to you.`,
				agent: `Then I'm afraid what reached us is all there is this time. For longer pieces written offline, copying your text out every so often, or writing on the website when you can, keeps it safe.`,
				member: [`Sad, but OK. I'll write in my notes app and paste it in from now on.`, `Lesson learned. I'll copy it out as I go.`]
			}
		},
		outcomes: ['team', 'sorted', 'workaround', 'member']
	},
	{
		key: 'format',
		area: 'writing',
		weight: 2,
		subjects: ['Asterisks in my posts', 'Italics not working in the app', 'Formatting problem'],
		open: [
			`My posts look fine on the website, with italics where I put them, but in the app every italic word has asterisks round it. It makes my poems look awful.`,
			`Readers have told me my posts are full of stars and underscores in the app. On the website they look exactly as I meant them to.`
		],
		detail: [`I use italics a lot for emphasis, so it's noticeable.`, `It's been like this for as long as I can remember.`],
		quick: [`Can I add pictures to a post?`, `Not yet: posts are text only for now.`],
		reply: `Thanks for telling us. Could you send me a screenshot from the app, and tell me which version you're on?`,
		need: `a screenshot from the app and its version`,
		turns: [
			[`Screenshot attached. The app says {appv}.`, `Thanks. On the website, a word between asterisks is shown in italics. The {platform} app at {appv} shows the asterisks as you typed them instead.`, arts.formatShot],
			[`Is it the same on iPhone and Android?`, `{fmtPlatform}`],
			[`Should I stop using italics then?`, `Your text is stored exactly as you wrote it, so nothing is wrong with your posts. It's only how the app shows them.`],
			[`Will my readers have to update too?`, `Yes. Once there's a fix, each reader's app needs the update to show italics properly.`]
		],
		team: 'mobile',
		handover: `The {platform} app ({appv}) shows asterisks and underscores as typed instead of as italics; the website renders them. The member's poems are affected. Can you look?`,
		teamFix: `Thanks for the screenshot. The app shows italics properly from the update that went out this week, so once your phone has it, your posts should look as they do on the website.`,
		ends: { sorted: { member: [`Updated, and my poems look right in the app now. Thank you!`, `The update fixed it, italics everywhere. Thanks.`] } },
		outcomes: ['team', 'team', 'sorted', 'member']
	},
	{
		key: 'schedule',
		area: 'writing',
		weight: 1,
		subjects: ['Scheduling posts?', 'Can I publish later?', 'Feature question'],
		open: [
			`Is there a way to schedule a post? I'd like my weekly piece to go out on Sunday morning at eight without my having to be up.`,
			`Can I set a post to publish at a certain time? I write in the evenings but most of my readers are online at breakfast.`
		],
		detail: [`I know it's a small thing, but it would make my weekends easier.`, `I looked for a date setting on the post but couldn't find one.`],
		quick: [`Is there a word count anywhere in the editor?`, `Not yet. Plenty of members paste their draft into a word processor to check.`],
		reply: `Not yet, I'm afraid: a post goes out the moment you press Publish. When do you usually write, and when would you like it to go out?`,
		need: `when you write and when you'd like posts to go out`,
		turns: [
			[`I write on Saturday evenings and I'd like it out at eight on Sunday.`, `Thanks. Plenty of members write on Saturdays, so you're in good company.`],
			[`Is scheduling on the way?`, `It has come up a few times. It needs work on our servers, since a post would have to go out without anyone pressing anything.`],
			[`Could my partner publish it for me if I leave my tablet signed in?`, `Anyone with your signed-in tablet can press Publish, so yes, that would work.`],
			[`When is the feed busiest, out of interest?`, `Evenings from about seven, and Sunday mornings.`]
		],
		ends: {
			workaround: {
				agent: `Until then, the nearest thing is to leave it as a draft on Saturday and publish it when you're up on Sunday. The feed is in order of publishing, so it'll be at the top whenever you do.`,
				member: [`That's what I'll do then. Thanks for the quick answer.`, `Fine, I'll publish it over breakfast.`]
			},
			change: { agent: `I've added your request to our developers' list for scheduled posts, and I'll let you know here if it's built.`, member: [`Thanks, I'd use it every week.`, `Great, please do.`] }
		},
		outcomes: ['workaround', 'change', 'member']
	},
	{
		key: 'oldapp',
		area: 'writing',
		weight: 1,
		joinedBefore: Date.UTC(2026, 7, 20),
		subjects: ['Nobody can see my posts', 'Have I been hidden?', 'My posts are not in the feed'],
		open: [
			`I've written {n} posts since the start of September and not one of them shows up in the feed. Before that, my posts appeared straight away. Have I been hidden or blocked?`,
			`Nobody in my writing group has seen my recent posts; they say they can't find them in the feed. They're all on my profile when I look.`
		],
		detail: [`I've checked my profile and they're all there, so at least they're not lost.`, `I'm starting to think nobody wants to read me, to be honest.`],
		quick: [`How do I know if my app is up to date?`, `The version is at the bottom of the Settings screen, and the {store} lists any update waiting for your phone.`],
		reply: `You haven't been hidden, I promise. Could you tell me which version of the app you're using? It's at the bottom of the Settings screen.`,
		need: `your app version`,
		turns: [
			[`It says {appv}.`, `That explains it. Since the end of August every new post starts as a draft until it's published, and the Publish button arrived in version 2.3.0. Your version is older, so your posts have been saved as drafts with no way to publish them from the app.`, arts.postsOld, 'a'],
			[`So {n} posts nobody has seen. Great.`, `I'm sorry. That's not what we wanted for anyone on an older app.`],
			[`If I publish them now, what dates will they show?`, `They'll go to the top of the feed in the order you publish them, and each shows the day you started writing it.`],
			[`Why didn't the app tell me to update?`, `Versions before 2.3.0 can't tell you about updates, I'm afraid, which is partly why this went unnoticed.`]
		],
		ends: {
			sorted: {
				agent: `Updating the app from the {store} brings the Publish button, and your drafts will be waiting under Drafts on your profile.`,
				member: [`Updated, and published all {n}. Thank you, and I'll stop sulking now.`, `Done, they're all up. Thanks for working it out.`]
			},
			workaround: {
				agent: `If your phone won't take the update, you can publish your drafts from the website: sign in, open Drafts on your profile, and press Publish on each.`,
				member: [`The phone's too old to update, so the website it is. Thanks.`, `Done it from my laptop. I'll keep using the website for publishing.`]
			}
		},
		outcomes: ['sorted', 'workaround', 'member']
	},
	{
		key: 'dupes',
		area: 'reading',
		weight: 2,
		subjects: ['Same posts twice in the feed', 'Feed repeating itself', 'Feed bug'],
		open: [
			`When I scroll down the feed in the app I keep seeing the same posts twice. Yesterday "{title}" came up three times.`,
			`After the first few pages, the feed starts showing me posts I've already scrolled past, and I think I'm missing some in between.`
		],
		detail: [`It's not a disaster, just irritating when I'm trying to catch up.`, `I've tried closing the app and opening it again.`],
		quick: [`Can I see only posts from the last week?`, `Not with a filter, but the feed is newest first, so the last week is at the top.`],
		reply: `Thanks for describing it. Roughly how far back do you scroll, and does it happen more at busy times, like evenings?`,
		need: `how far you scroll and when it happens`,
		turns: [
			[`I usually scroll back a day or so, five or six pages. And yes, it's worse in the evenings. I made a note of the last two pages last night:`, `That fits what I suspected. The feed loads twenty posts at a time, counted from the newest. If new posts are published while you're scrolling, everything moves down, so the next twenty begin with posts you've already seen.`, arts.feedPages],
			[`That explains the repeats. And the ones I think I miss?`, `Usually they're the same posts that moved down. They tend to turn up again further on, a page later than you'd expect.`],
			[`Is it my phone?`, `No, it happens on every phone and on the website, and the further you scroll, the more you notice it.`],
			[`Would it help to scroll faster?`, `Honestly, a little: the less time between pages, the fewer new posts slip in at the top.`]
		],
		team: 'mobile',
		handover: `Member sees repeated posts when scrolling back through the feed in the app, worse in the evenings. Pages shift as new posts come in. Could the app skip posts it has already shown?`,
		ends: {
			workaround: {
				agent: `Until that changes, pulling down at the top of the feed before you start scrolling gives you a fresh start, which makes repeats less likely, though not impossible on a busy evening.`,
				member: [`OK, I'll refresh first. Not perfect, but better.`, `Pull to refresh it is. Thanks for explaining what's going on.`]
			},
			change: {
				note: `Yes, page-numbered requests shift whenever posts are published mid-scroll. We'll change the feed to page by publishing time instead of page number. On the list.`,
				agent: `Our developers have confirmed what's going on, and they're changing how the feed loads its pages so that new posts don't push older ones along. I'll let you know when that's out.`,
				member: [`Great, thanks for looking into it properly.`, `Thanks. Looking forward to it.`]
			}
		},
		outcomes: ['workaround', 'change', 'change', 'team', 'member']
	},
	{
		key: 'script',
		area: 'reading',
		weight: 1,
		subjects: ['Question about downloading the feed', 'Making an ebook of the feed', 'Is this allowed?'],
		open: [
			`I read Copperleaf on an e-reader, so I wrote a small script that downloads the newest posts and turns them into an ebook each week. It asks for 500 posts at a time and that works, but your help page says a page holds at most 100. Is my script going to break?`,
			`Quick technical question. I've got a little script that pulls the feed once a week so I can read it offline. If I ask for a limit of 500 I get 500 posts back. Is that intended, or should I be asking for fewer?`
		],
		detail: [`It's a hobby thing, nothing commercial.`, `I'm happy to change the script if you'd prefer a different way.`],
		quick: [`Is there an RSS feed?`, `Not at the moment, I'm afraid.`],
		reply: `Thanks for asking before it breaks rather than after! Could you tell me how often the script runs and what it asks for, so I can check with our developers?`,
		need: `how often the script runs and what it asks for`,
		turns: [
			[`Once a week, on Sunday night. Here's what it does, more or less:`, `Thanks, that's very light use, nothing to worry about on our side. I'll check the page size with the developers.`, arts.curlOut],
			[`Should I be identifying the script somehow?`, `A short note in the user agent, like your display name and "weekly ebook", is a kind thing to do, so we know who to ask if anything looks odd.`],
			[`Is there anything else I should know, like how often I can ask?`, `Once a week is nothing. If you ever ran it more often than hourly, we'd appreciate a word first.`]
		],
		ends: {
			sorted: {
				note: `The documented cap of 100 per page isn't applied at the moment, which is why 500 works. We're going to apply it, so scripts should ask for 100 and page through.`,
				agent: `I've checked with our developers: pages are meant to hold at most 100 posts, and that limit will be applied soon, so a request for 500 will come back with 100. If your script asks for page 1, 2, 3 and so on with a limit of 100, it'll keep working after the change.`,
				member: [`Perfect, I've changed it to five pages of 100 and it works. Thanks!`, `Easy fix, done. Thanks for checking.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'member']
	},
	{
		key: 'reads',
		area: 'other',
		weight: 2,
		subjects: ['How many people read my posts?', 'Read counts', 'Stats?'],
		open: [
			`Is there any way to see how many people have read my posts? I've written {posts} of them and I have no idea whether anyone reads them at all.`,
			`I'd love some kind of number on my posts, even just how many times they've been opened. Writing into silence is hard.`
		],
		detail: [`Even a rough idea would help me know what's working.`, `I'm not after likes or anything, just whether anyone is out there.`],
		quick: [`Can I write under two different names?`, `Each account has one display name, so you'd need a second account with another email address.`],
		reply: `Not yet, I'm afraid: Copperleaf doesn't count reads at the moment. Can I ask what you'd want to see, so I can pass it on properly? A number for each post, or something more?`,
		need: `what you'd want to see`,
		turns: [
			[`Just a number for each post would be lovely. Maybe how many read to the end, but that's greedy.`, `Not greedy at all, and you're one of several members who've asked for exactly that.`],
			[`Don't you even know yourselves?`, `Honestly, no. We know when a post was published, but we don't keep a record of who opened it or how often.`],
			[`Would it show who read it, or just how many?`, `If it's built, I'd expect just how many. Members haven't asked to see each other's reading, and plenty would rather they couldn't.`],
			[`Do other writing sites do this?`, `Some do. We'd rather do it well than quickly, which is why it isn't there yet.`]
		],
		team: 'product',
		handover: `Another request for read counts on posts, a number per post at least. Adding it to the pile.`,
		ends: {
			change: { agent: `I've added your request to our developers' list for read counts on posts, and I'll update this ticket if it's built.`, member: [`Thank you. Fingers crossed.`, `Thanks for listening, really.`] }
		},
		outcomes: ['change', 'change', 'team']
	},
	{
		key: 'follow',
		area: 'reading',
		weight: 2,
		subjects: ['Following writers', 'Can I follow someone?', 'Notifications for new posts'],
		open: [
			`Is there a way to follow particular writers? I love {rname}'s posts and I keep missing them in the feed.`,
			`I'd like to be told when certain writers publish something new. Is that possible? The feed moves so fast that I miss things.`
		],
		detail: [`There are four or five writers I never want to miss.`, `I looked for a search, but there doesn't seem to be one either.`],
		quick: [`Can I save a post to read later?`, `Not inside Copperleaf yet, but every post has its own link, so a bookmark works.`],
		reply: `There's no follow button yet. In the meantime, each writer's profile lists all their published posts, newest first. Would a bookmark to their profile do for now?`,
		need: `whether a bookmark to a writer's profile would do`,
		turns: [
			[`A bookmark might work, I suppose. How do I get to a writer's profile?`, `Tap their name at the top of any of their posts. On the website you can bookmark the page; in the app, the Share button on a profile lets you add it to your home screen.`],
			[`Will there ever be notifications for new posts?`, `It's been asked for a lot. It needs changes on our servers and in the apps, so it isn't a quick one.`],
			[`Can writers see that I've been reading their posts?`, `No. Nothing tells a writer who has read their work.`],
			[`Can I see a list of every writer on Copperleaf?`, `Not as a list, no. Writers' profiles are reached from their posts.`]
		],
		ends: {
			workaround: {
				agent: `So for now, a bookmark on each writer's profile is the nearest thing.`,
				member: [`Bookmarks it is. I've made a little folder of my favourite writers. Thanks!`, `I've added three profiles to my home screen. Good enough for now.`]
			},
			change: { agent: `I've added your vote to our developers' list for following writers, and I'll let you know here if it's built.`, member: [`Thanks, please do.`, `Lovely, thank you.`] }
		},
		outcomes: ['workaround', 'workaround', 'change']
	},
	{
		key: 'tz',
		area: 'reading',
		weight: 1,
		subjects: ['Wrong day on my posts', 'Dates are off by a day', 'Time zone?'],
		open: [
			`I'm in {farCity}. When I publish in the morning, the website says my post went up the day before. It's a small thing, but I write daily posts with the date in the title, so it looks wrong.`,
			`Every post I publish before lunch shows yesterday's date on the website. I live in {farCity}, if that matters.`
		],
		detail: [`Not a big deal, but I thought you should know.`, `My friend in London says it looks right for her.`],
		quick: [`Does Copperleaf work in other languages?`, `The apps and the website are in English only for now, but you can write your posts in any language.`],
		reply: `Thanks. Which time zone is your computer set to, and does the app show the same date as the website?`,
		need: `your computer's time zone and whether the app agrees`,
		turns: [
			[`It's on {farTz}. The app shows the right day; it's only the website. Here's my post from {date2}:`, `Thanks, that's the clue. The app turns dates into your local time, while the website shows them in UTC, which is still the day before in {farCity} for much of your morning.`, arts.tzCompare],
			[`So everyone in my part of the world sees the wrong day?`, `On the website, yes, for anything published before {cut} your time.`],
			[`Would changing my computer's time zone fix it?`, `No: the website doesn't use your computer's time zone for dates at the moment, so changing it makes no difference.`]
		],
		team: 'web',
		handover: `The website shows post dates in UTC; for a member in {farCity} ({farTz}) morning posts show the previous day. The app gets it right. Can the website use the reader's time zone?`,
		teamFix: `The website now shows dates in your own time zone, so this morning's posts should show today's date. Thanks for spelling it out so clearly.`,
		ends: { sorted: { member: [`Today's post shows today's date. Thank you!`, `Fixed. My daily posts finally line up with their titles.`] } },
		outcomes: ['team', 'team', 'sorted']
	},
	{
		key: 'report',
		area: 'other',
		weight: 2,
		subjects: ['Reporting a post', 'Spam posts', 'Abusive posts', 'Please look at this account'],
		open: [
			`I want to report a post called "{rtitle}" by "{rname}". It's an advert for {spamThing} dressed up as a post, and there are more like it from the same account.`,
			`A member keeps publishing posts that attack another writer by name. The latest is "{rtitle}" by "{rname}". This isn't what Copperleaf is for.`
		],
		detail: [`I didn't want to just ignore it.`, `I'm not the only one who's noticed; a few people in my writing group mentioned it.`],
		quick: [`Can I block a member so I don't see their posts?`, `Not yet. If someone's posts break our guidelines, report them to us and the community team will look.`],
		reply: `Thank you for flagging it. Could you send me the titles of the other posts too, if you have them, so the community team can see the whole picture?`,
		need: `the titles of the other posts`,
		turns: [
			[`The others are "{rtitle2}" and "{rtitle3}". All in the last couple of days.`, `Thanks. I can see all three, from the same account, each published late in the evening.`, arts.reportQueue, 'a'],
			[`What happens next?`, `The community team review reports against our guidelines, usually within a day, and decide what happens to the posts and the account. They don't share the details of what they do with another member's account.`],
			[`Will they know it was me who reported them?`, `No. Reports are never shared with the member reported.`],
			[`Should I report each post separately next time?`, `No need. One message with all the titles, like this one, is ideal.`]
		],
		team: 'community',
		handover: `Report about "{rname}": "{rtitle}", "{rtitle2}" and "{rtitle3}". The reporter says {reportWhy}. All three still up.`,
		teamFix: `Thanks for reporting these. We've reviewed them against the guidelines, taken all three down and dealt with the account.`,
		ends: { sorted: { member: [`Thank you. Good to know someone's keeping an eye on things.`, `Gone already. Thanks, that was quick.`] } },
		outcomes: ['team', 'team', 'sorted', 'member'],
		prep: (r, s, open) => {
			const pool = shuffle(r, open === 0 ? spamTitles : attackTitles);
			[s.rtitle, s.rtitle2, s.rtitle3] = [pool[0]!, pool[1]!, pool[2]!];
			s.reportWhy = open === 0 ? 'they are adverts made to look like posts' : 'they attack another writer by name';
		}
	},
	{
		key: 'crash',
		area: 'other',
		weight: 2,
		subjects: ['App keeps closing', 'Crash when opening a post', 'App crash'],
		open: [
			`The {platform} app closes itself every time I open "{title}" by {rname}. Every other post opens fine.`,
			`There's one post I can't read in the app: as soon as I tap it, the app shuts down. It's "{title}". I've restarted my phone.`
		],
		detail: [`It's a piece I've been looking forward to reading.`, `It happens on wifi and on mobile data.`],
		quick: [`Does the app work offline?`, `Partly: posts you've already opened stay readable, and drafts you write offline are sent when you're back online.`],
		reply: `Sorry about that. Which version of the app are you on, and on which phone?`,
		need: `your app version and phone`,
		turns: [
			[`{appv} on {aDevice}, {os}.`, `Thanks. I opened the same post on our test phone with {appv} and it closed for me too, so it isn't your phone. The post is very long, with a lot of unusual characters in it, which may be what upsets the app.`, arts.crashReport, 'a'],
			[`Can you fix the post?`, `The post itself is fine; it opens on the website. It's the app that struggles with it, so the fix belongs in the app.`],
			[`Can I read it somewhere in the meantime?`, `Yes, on the website, or from the app with Share and then Open in browser.`],
			[`Will reinstalling the app help?`, `I wouldn't bother: it closed on our test phone too, and that's a fresh install.`]
		],
		team: 'mobile',
		handover: `{platform} app {appv} closes when opening "{title}" (very long, lots of unusual characters). Reproduced on the test phone; crash report above.`,
		teamFix: `Thanks for the report. We found it: laying out very long lines made the app use more memory than the phone allows. The fix is in the update that went out today, so once you have it, the post should open.`,
		ends: {
			sorted: { member: [`Updated and it opens. Thanks, all.`, `Works now, thank you.`] },
			workaround: { agent: `Until the app can cope with it, reading that post in the browser is the way round it.`, member: [`Browser it is. Thanks for checking it wasn't just me.`, `OK, I'll read it on my laptop.`] }
		},
		outcomes: ['team', 'team', 'sorted', 'workaround']
	},
	{
		key: 'export',
		area: 'other',
		weight: 1,
		subjects: ['Download my posts?', 'Backup of my writing', 'Export'],
		open: [
			`Is there a way to download all my posts? I'd like a backup, and maybe to put them together into a little book for my family.`,
			`Can I get a copy of everything I've written on Copperleaf? I don't trust myself to keep it all in one place otherwise.`
		],
		detail: [`I've had a scare with a laptop before, so I'd like to be safe.`, `It would be lovely to have them all in one place.`],
		quick: [`Can I print a post nicely?`, `Printing from the website works best: the post page prints without the menus.`],
		reply: `There's no download button yet, but I can send you a file with all your posts. Would you like your drafts included, or only published posts?`,
		need: `whether you'd like your drafts included`,
		turns: [
			[`Published ones, and the drafts too, actually. Some of them are nearly done.`, `Of course. You'll get one file with each post's title, the day you started it, the day it was published (or "draft"), and the text.`],
			[`What format will it be in?`, `A plain text file, one post after another, which opens in any word processor.`],
			[`Will my italics survive?`, `They'll come out as you typed them, with asterisks, since that's how they're stored.`],
			[`How long will it take?`, `Not long. It comes as an attachment to this email.`]
		],
		ends: {
			sorted: {
				agent: `Here it is: {exportName}, with your {posts} published posts and {drafts} drafts. This is how it starts:`,
				art: arts.exportHead,
				member: [`Got it, it's all there. My mum is going to love this. Thank you!`, `Downloaded and saved in three places. Thanks so much.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'member']
	},
	{
		key: 'lostphone',
		area: 'account',
		weight: 1,
		avoid: ['draft', 'crash', 'lostdraft', 'joined'],
		urgent: true,
		noApp: true,
		subjects: ['Lost my phone', 'Phone stolen, please help', 'Sign me out everywhere?'],
		open: [
			`I left my phone on the train yesterday and it hasn't been handed in. Copperleaf is signed in on it. Can you sign me out so nobody can get into my account?`,
			`My phone was stolen at the weekend. I'm worried about my Copperleaf account, since the app was open on it with a half-written post. What should I do?`
		],
		detail: [`The phone has a passcode, but I'd still rather be safe.`, `I've already reported it to my phone company.`],
		quick: [`Do I need to sign in again after updating the app?`, `No. Updating keeps you signed in.`],
		reply: `I'm sorry, that's a horrible feeling. I can end the sign-in on that phone from here. To make sure I end the right one, could you tell me roughly when you last used Copperleaf on it, and which phone it was?`,
		need: `roughly when you last used Copperleaf on the phone, and which phone it was`,
		turns: [
			[`{ADevice}. I last opened the app on {pastday} evening, I think, before I lost it.`, `Thanks. Your account is signed in on two devices at the moment: {aDevice} and a computer. I'll end the sign-in on the {device} and leave the computer alone, unless you'd like me to end both.`],
			[`Just the phone, please. Could someone have read my drafts?`, `Only if they could unlock the phone. Drafts sit on our side, and the app shows them only while it's signed in, so once I end that sign-in the app on that phone shows nothing.`],
			[`What about the post I was halfway through?`, `Anything the app had already sent us is in your drafts, and you'll see it when you sign in on your new phone. Anything typed while the phone was offline would only be on the lost phone, I'm afraid.`],
			[`Will the person with my phone get an email or anything?`, `No. Ending a sign-in doesn't send anything to the device; the app simply asks for an email address next time it's opened.`]
		],
		ends: {
			sorted: {
				agent: `Done: the {device} is signed out, and the computer is still signed in. When you have a new phone, ask for a sign-in link as usual and you'll find your drafts waiting.`,
				member: [`Thank you, that's a weight off. New phone arrives tomorrow.`, `Brilliant, thanks. One less thing to worry about.`]
			},
			change: {
				pre: `Could I do this myself next time, without having to email you?`,
				agent: `Not yet, but it's a fair ask: a page listing where you're signed in, with a button to sign out of each, is on our developers' list. For now I've signed the phone out for you, so you're safe either way.`,
				member: [`Thanks, both for doing it and for passing that on.`, `Great. Thanks for the quick help.`]
			}
		},
		outcomes: ['sorted', 'sorted', 'member']
	},
	{
		key: 'a11y',
		area: 'reading',
		weight: 1,
		subjects: ['Screen reader problem', 'Accessibility', 'Website hard to use with VoiceOver'],
		open: [
			`I'm blind and use {reader} with the website. The feed reads fine, but on a post page, after the title, it just says "button, button, button" and I can't tell which one goes back to the feed.`,
			`I read Copperleaf with {reader}. Since a few weeks ago, the buttons under each post are read out as "button" with no name, so I have to guess which one is which.`
		],
		detail: [`Otherwise I love the site; the posts themselves read beautifully.`, `I'm happy to test anything you change.`],
		quick: [`Can I make the text bigger on the website?`, `Yes: your browser's zoom works on every page, and the layout adjusts to it.`],
		reply: `Thank you for telling us, and sorry it's been hard going. Which browser do you use with {reader}, and does it happen on every post or only some?`,
		need: `the browser you use and whether it happens on every post`,
		turns: [
			[`{browser}, and every post as far as I can tell.`, `Thanks. I've tried it with {reader} here and hear the same: the three buttons under a post, for sharing, going back and reporting, are announced without names. They're icons with no text behind them.`],
			[`Is that something you can fix quickly?`, `It's usually a small change to the page, but it's one for the web team, so I don't want to promise a date.`],
			[`Is the app any better?`, `The apps label those buttons, so if you use a phone with a screen reader, the app may be easier until the website is fixed.`],
			[`Will you let me know when it's done? I'd like to check it.`, `Of course, and thank you for offering to check it.`]
		],
		team: 'web',
		handover: `Post page buttons (share, back, report) are announced as "button" with no name in {reader} with {browser}. Member relies on the screen reader. Can they get labels?`,
		teamFix: `Thanks for reporting this so clearly. The buttons under each post now have names, so {reader} should read them as Share, Back to the feed and Report. If anything still reads oddly, tell us and we'll look again.`,
		ends: {
			sorted: { member: [`Just tried it: Share, Back to the feed, Report. Perfect. Thank you both.`, `It reads properly now. That makes a real difference, thank you.`] },
			workaround: {
				agent: `Until the website is fixed, the order is always the same: the first button shares the post, the second goes back to the feed, and the third reports it.`,
				member: [`Knowing the order helps a lot. I'll manage with that for now, thanks.`, `Second button for back. Got it, thank you.`]
			}
		},
		outcomes: ['team', 'sorted', 'workaround']
	},
	{
		key: 'newsletter',
		area: 'other',
		weight: 1,
		joinedBefore: Date.UTC(2026, 8, 20),
		subjects: ['Still getting the newsletter', 'Unsubscribe not working', 'Newsletter'],
		open: [
			`I unsubscribed from your newsletter in September and I'm still getting it. The last one came on {date2}.`,
			`How do I stop the Copperleaf newsletter? I clicked unsubscribe weeks ago and it keeps coming.`
		],
		detail: [`It's not a huge problem; I'd just rather not get it.`, `I've clicked the link at the bottom of the email twice.`],
		quick: [`How often does the newsletter go out?`, `Once a month, usually in the first week.`],
		reply: `Sorry about that. Which address is the newsletter arriving at? It may not be the one on your account.`,
		need: `the address the newsletter arrives at`,
		turns: [
			[`It comes to {email2}, my old address. My account uses {email}.`, `That explains it. The newsletter list is kept separately from accounts, so unsubscribing while signed in took {email} off, but your old address was still on the list from before.`, arts.unsubList, 'a'],
			[`How did my old address get on it?`, `Most likely from the sign-up page we had before Copperleaf opened in March, where people could leave an address to hear when we launched.`],
			[`Will I still get emails about my account?`, `Yes. Sign-in links and anything about your account still come to {email}; only the newsletter is affected.`]
		],
		ends: {
			sorted: { agent: `I've taken {email2} off the list as well, so that was the last one.`, member: [`Thanks, that's a relief. Nothing against the newsletter!`, `Great, thank you.`] }
		},
		outcomes: ['sorted', 'sorted', 'member']
	}
];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`I've been writing on Copperleaf since {joinedMonth}, mostly short fiction.`,
	`I joined after a friend from my writing group recommended you, and I post most weeks.`,
	`I'm not very technical, so forgive me if this is obvious.`,
	`I mostly use the app on my phone, on the bus to work.`,
	`Copperleaf is the only place I post my poems, so this matters to me.`,
	`I run a small writing group and several of us post here.`,
	`I'm a retired teacher and I've been posting memoir pieces since {joinedMonth}.`,
	`English isn't my first language, so sorry for any mistakes.`,
	`I love the site, and this is the first time I've had to write in.`,
	`I write every morning before work and usually post at weekends.`,
	`I'm a nurse on nights, so I do most of my writing at odd hours.`,
	`I'm doing a creative writing course and our tutor asked us all to post here.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Copperleaf team,', 'Hi support,', 'Dear Copperleaf,', ''];
const replyGreetings = ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},', 'Hi {agent},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}', 'Cheers,\n{first}', 'Best wishes,\n{first}', '{first}', 'Kind regards,\n{full}', 'Thank you!\n{first} ({display} on Copperleaf)'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Dear {first},'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hi {first}, thanks for getting back to me.', 'Hello {first},', '{first},', 'Hi again {first},', 'Hi {first},'];
const agentGreetingsAgain = ['Hi {first},', 'Hello {first},', 'Hello again {first},', '{first},'];
const agentSignoffs = ['Best,\n{agent}\nCopperleaf Support', 'Thanks,\n{agent}', 'All the best,\n{agent} | Copperleaf Support', 'Happy writing,\n{agent}', 'Kind regards,\n{agent}\nCopperleaf Support'];
const agentClosers = [`If anything else comes up, reply here and it comes straight back to me.`, `Let me know if that doesn't match what you're seeing.`, `Do shout if any of that is unclear.`];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for the clear description; it helps a lot.`, `Sorry for the slow reply, it's been a busy few days in the inbox.`, `Thanks for being part of Copperleaf, and for telling us when something gets in the way.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Great, thanks.`];
const vagueSubjects = ['Help please', 'A few questions', 'Problem', '(no subject)', 'Quick question', 'Copperleaf', 'Hello', 'Re: Welcome to Copperleaf'];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something with a colleague before I answer, so bear with me.`, `Got it, thank you. I'll have a proper look and come back to you.`];
const notes = [
	`Account looks normal otherwise: {display}, joined {joined}, {posts} published, {drafts} drafts.`,
	`Long-standing member; posts most weeks.`,
	`No earlier tickets from this address.`,
	`Checked the help pages: nothing that covers this well.`,
	`Nothing unusual on the account otherwise.`
];
const passLines = [
	`I've passed this to {teamName}, who can look into it more closely than I can. They'll reply on this ticket, so you'll hear from them by email.`,
	`This one needs {teamName}, so I've handed it over with everything above. You'll hear from them here.`,
	`I've asked {teamName} to take a look. Their reply will come to you on this ticket.`
];
const mateAcks = [`Hi {first}, {mate} here ({teamLabel}). I've picked this up and will be in touch once I've had a proper look.`, `Hello {first}, this is {mate} ({teamLabel}). Thanks for your patience; I'm looking into it and will update you here.`];
const mateNotes = [`Picked this up. Will reply to the member once I know more.`, `On my list for this week. Looks like one we've seen before; checking.`];
const waitLines = [`Thanks, I'll wait to hear from them.`, `OK, thank you.`, `Thanks for passing it on.`];
const laterLines = [`I'll have to check that when I'm home and get back to you.`, `Let me look tonight and I'll send it over.`, `I'm away this week, so I'll send it when I'm back.`];
const leadFirst = [`I'll check that and come back to you. In the meantime, something else:`, `I'll have to dig that out, so give me a day or so. Meanwhile, a different question:`, `I'll find that for you. While I do, one more thing:`];
const leadAside = [`Thanks. While I have you, something else:`, `That's useful to know. A different question in the meantime:`, `OK. Before I forget, another thing:`];
const resumeLines = [`Back to my first question:`, `Going back to my original problem:`, `On the first thing again:`];
const leadNext = [`Another thing while I'm here.`, `Next question, if that's all right:`, `Something else has come up as well.`];
const closings = [`Great to hear. I'll close this, but reply any time if it comes back.`, `Glad that did it!`, `Brilliant, thanks for letting me know.`, `Good news. Happy writing!`];
const nudges1 = [`Just checking in: when you have a moment, I still need {need} to get any further.`, `Following up on my last message. Could you send me {need}? No rush; I just want to make sure it didn't get lost.`, `I don't want this to slip through the cracks. If you can send me {need}, I'll pick it straight back up.`];
const nudges2 = [`I haven't heard back, so I'll leave this here for now. If it's still a problem, reply with {need} and I'll take it from there.`, `One last nudge from me. Whenever you're ready, reply to this email and the ticket comes straight back to me.`];

// ---------------------------------------------------------------------------------------------------------
// One ticket.
type Who = 'm' | 'a' | 'note' | 'api' | 'mate' | 'mnote';
type Gap = 'hold' | 'team' | 'api' | 'nudge' | 'nudge2';
interface Msg {
	who: Who;
	paras: string[];
	art?: string;
	gap?: Gap;
	at?: number;
}

const weighted = (r: Rand, ok: (topic: Topic) => boolean) => {
	const pool = topics.filter(ok);
	let left = r() * pool.reduce((sum, topic) => sum + topic.weight, 0);
	for (const topic of pool) if ((left -= topic.weight) < 0) return topic;
	return pool.at(-1)!;
};

/** Names, titles and dates a single matter of the ticket uses, drawn again for every matter. */
const drawLocal = (r: Rand, s: Slots) => {
	const openDay = midnight(num(s, 'openMs'));
	const joinedMs = num(s, 'joinedMs');
	const earliest = Math.max(joinedMs + 2 * DAY, openDay - 25 * DAY);
	const d1 = earliest + int(r, 0, Math.max(0, Math.floor((openDay - 4 * DAY - earliest) / DAY))) * DAY;
	const d2 = d1 + int(r, 1, Math.max(1, Math.floor((openDay - DAY - d1) / DAY))) * DAY;
	const past = openDay - int(r, 1, 3) * DAY + int(r, 9 * 60, 22 * 60) * MIN;
	const pub = num(s, 'openMs') - int(r, 40, 300) * MIN;
	const [btitle, punct] = pick(r, breakTitles);
	const bslug = slugNow(btitle);
	const [utitle, uglyBits] = pick(r, uglyTitles);
	const [typoTitle, fixedTitle] = pick(r, typoPairs);
	const [farCity, farTz, cut] = pick(r, farPlaces);
	const [providerTip, where] = pick(r, providerTips);
	const otherBreak = pick(r, breakTitles.filter(([title]) => title !== btitle));
	Object.assign(s, {
		title: pick(r, titles),
		dtitle: pick(r, titles),
		rname: pick(r, [...penNames, `${pick(r, firstNames)} ${pick(r, surnames)}`].filter((name) => name !== s.display)),
		rtitle: pick(r, titles),
		rtitle2: pick(r, titles),
		rtitle3: pick(r, titles),
		date1: dayMonth(d1),
		date2: dayMonth(d2),
		date2Ms: String(d2),
		copyDate: dayMonth(d1 + 2 * DAY),
		started: dayMonth(Math.max(joinedMs + DAY, openDay - int(r, 9, 26) * DAY)),
		pubtime: clock(pub),
		roughTime: `${utc(pub).getUTCHours() % 12 || 12}${pick(r, ['', '-ish', ' or so'])}`,
		pastMs: String(past),
		pastTime: clock(past),
		pastday: weekday(past),
		btitle,
		bslug,
		punctName: punctNames[punct]!,
		bcut: punct === '#' ? bslug.slice(0, bslug.indexOf('#')) : bslug.slice(0, -1),
		bfixed: bslug.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''),
		why: { '?': 'a question mark in a web address marks the start of something else, so browsers drop it and look for the address without it', '#': 'a web address stops at a # sign as far as finding the page goes, so everything from the # on is dropped', '!': '{chatApp} leaves a final exclamation mark out of the link it makes, so your friends end up at the address without it', '.': '{chatApp} leaves a final full stop out of the link it makes, taking it for the end of your sentence' }[punct]!,
		otherCheck: chance(r, 0.5) ? 'the others are fine' : `"${otherBreak[0]}" has ${/^[aeiou]/.test(punctNames[otherBreak[1]]!) ? 'an' : 'a'} ${punctNames[otherBreak[1]]} in its title too, so its link may give people the same trouble`,
		chatApp: pick(r, chatApps),
		utitle,
		uglyBits,
		uencoded: encodeSlug(slugNow(utitle)),
		ufixed: slugNow(utitle).replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''),
		ctitle: pick(r, clashTitles),
		cother: pick(r, penNames.filter((name) => name !== s.display)),
		n: String(int(r, 2, 5)),
		typoTitle,
		fixedTitle,
		farCity,
		farTz,
		cut,
		providerTip,
		where,
		weirdBio: pick(r, weirdBios),
		spamThing: pick(r, spamThings),
		reportWhy: 'the posts are not what Copperleaf is for',
		exportName: `copperleaf-posts-${s.local}.txt`
	});
	s.why = s.why!.replace('{chatApp}', s.chatApp!);
	if (s.dtitle === s.title) s.dtitle = pick(r, titles.filter((title) => title !== s.title));
};

/** Writes ticket `index`. `pace` shortens the gaps between messages, for a ticket that would otherwise run past the
 * export. */
const compose = (index: number, pace: number) => {
	const r = mulberry32(0x0c0ffee + index * 7919);
	const rt = mulberry32(0x7135 + index * 104729);
	const openDay = days[Math.floor((index * days.length) / ITEMS)]!;
	const openMs = openDay + int(r, 7 * 60 + 30, 23 * 60 + 15) * MIN;
	const number = 2400 + index * 2 + ((index * 5) % 3 === 0 ? 1 : 0);
	const joinedMs = LAUNCH + int(r, 3, Math.max(4, Math.floor((openDay - 20 * DAY - LAUNCH) / DAY))) * DAY;
	const fits = (topic: Topic) => !(topic.after && openDay < topic.after) && !(topic.joinedBefore && joinedMs >= topic.joinedBefore);
	const main = weighted(r, fits);
	const outcome = pick(r, main.outcomes);
	const viaTeam = outcome === 'sorted' && !!main.teamFix;
	const bounce = outcome === 'change' && !!main.bounce && chance(r, 0.5);
	const partial = outcome === 'team' || outcome === 'member' || viaTeam || bounce;
	const channel = main.noApp ? pick(r, ['email', 'web'] as const) : pick(r, ['email', 'email', 'email', 'app', 'app', 'web'] as const);

	// Who.
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const local = pick(r, [`${first}.${last}`, `${first}${int(r, 10, 99)}`, `${first[0]}${last}`, `${first}.${last[0]}`])
		.toLowerCase()
		.normalize('NFD')
		.replace(/[^a-z0-9.]/g, '');
	const emailDomain = pick(r, mailDomains);
	const [org, orgDomain] = pick(r, orgs);
	const platform = pick(r, ['iOS', 'iOS', 'Android'] as const);
	const display = pick(r, [`${first} ${last}`, `${first} ${last[0]}.`, `${first[0]}. ${last}`, pick(r, penNames), `${first.toLowerCase()}writes`]);
	const agent = pick(r, agents);
	const typoLocal = local.length > 4 ? local.slice(0, 2) + local[3] + local[2] + local.slice(4) : `${local}x`;
	const s: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		local,
		email: `${local}@${emailDomain}`,
		emailDomain,
		email2: `${pick(r, [first.toLowerCase(), `${first[0]}${last}`.toLowerCase(), `${last}.${first[0]}`.toLowerCase()]).normalize('NFD').replace(/[^a-z0-9.]/g, '')}@${pick(r, mailDomains.filter((domain) => domain !== emailDomain))}`,
		typo: `${typoLocal}@${emailDomain}`,
		org,
		orgDomain,
		scanner: pick(r, scanners),
		reader: pick(r, readers),
		browser: pick(r, browsers),
		display,
		display2: first,
		display3: pick(r, penNames.filter((name) => name !== display)),
		agent,
		apiDev: pick(r, apiDevs),
		platform,
		store: platform === 'iOS' ? 'App Store' : 'Play Store',
		device: pick(r, devices[platform]),
		aDevice: '',
		ADevice: '',
		os: pick(r, osVersions[platform]),
		oldDevice: pick(r, oldDevices),
		appv: openDay >= APP25 && chance(r, 0.7) ? `2.5.${int(r, 0, 2)}` : `2.4.${int(r, 0, 3)}`,
		fmtPlatform: platform === 'iOS' ? `The Android app shows italics properly; it's the iPhone app that doesn't.` : `The iPhone app shows italics properly; it's only the Android app.`,
		joined: dayMonth(joinedMs),
		joinedMonth: MONL[utc(joinedMs).getUTCMonth()]!,
		joinedMs: String(joinedMs),
		posts: String(int(r, 3, 64)),
		drafts: String(int(r, 0, 9)),
		openMs: String(openMs),
		openDate: dayMonth(openDay),
		need: ''
	};
	const F = (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	const setTeam = (key: TeamKey | undefined) => {
		const team = teams[key ?? 'mobile'];
		Object.assign(s, { teamName: team.name, teamLabel: team.label, mate: team.who });
	};
	s.aDevice = `${/^(i|[AEIOU])/.test(s.device!) ? 'an' : 'a'} ${s.device}`;
	s.ADevice = s.aDevice.charAt(0).toUpperCase() + s.aDevice.slice(1);
	s.anOldDevice = `${/^i/.test(s.oldDevice!) ? 'an' : 'a'} ${s.oldDevice}`;
	drawLocal(r, s);
	const openIndex = int(r, 0, main.open.length - 1);
	main.prep?.(r, s, openIndex);
	setTeam(main.team);
	s.need = F(main.need);

	// Other matters: a quick question, and up to three smaller matters discussed in full.
	const used = new Set<Topic>([main]);
	const clash = (x: Topic, y: Topic) => !!(x.avoid?.includes(y.key) || y.avoid?.includes(x.key) || x.avoidAreas?.includes(y.area) || y.avoidAreas?.includes(x.area));
	const areas = new Set<Area>([main.area]);
	const take = (side: boolean) => {
		const pool = topics.filter((topic) => !topic.solo && !used.has(topic) && ![...used].some((other) => clash(other, topic)) && !(side ? areas.has(topic.area) : topic.area === main.area) && fits(topic));
		if (!pool.length) return undefined;
		const topic = pick(r, pool);
		used.add(topic);
		if (side) areas.add(topic.area);
		return topic;
	};
	const takeSide = () => take(true);
	const quick = chance(r, 0.7) ? take(false) : undefined;
	const quick2 = chance(r, 0.35) ? take(false) : undefined;
	const roomDays = (EXPORT - openMs) / DAY;
	const sideCount = Math.min(partial ? pick(r, [2, 3, 3, 3]) : pick(r, [1, 2, 2, 3, 3]), roomDays < 8 ? 2 : 3);
	const sides = Array.from({ length: sideCount }, takeSide).filter((topic): topic is Topic => !!topic);
	const sidesEarly = !main.urgent && (partial || chance(r, 0.45));
	// One app version for the whole ticket, old enough for the matters that need an old one.
	if (used.has(topics.find((topic) => topic.key === 'oldapp')!)) s.appv = `2.${int(r, 1, 2)}.${int(r, 0, 4)}`;
	else if (used.has(topics.find((topic) => topic.key === 'bio')!)) s.appv = `2.4.${int(r, 0, 3)}`;

	// The conversation. Each message gets its time as it is written, so that a matter raised later in the ticket
	// talks about the days around it. Replies come in working hours; a ticket that starts late keeps its gaps short
	// enough to end before the export.
	const msgs: Msg[] = [];
	const [opens, closes] = pace < 0.6 ? [7, 22] : [8, 19];
	const work = (ms: number) => {
		const hour = (ms % DAY) / HOUR;
		if (hour < opens) return midnight(ms) + opens * HOUR + int(rt, 0, 100) * MIN;
		if (hour > closes) return midnight(ms) + DAY + opens * HOUR + int(rt, 0, 100) * MIN;
		return ms;
	};
	let now = openMs;
	const push = (msg: Msg) => {
		if (msgs.length) {
			const span = (low: number, high: number) => Math.round(int(rt, low, high) * pace) * MIN;
			if (msg.gap === 'nudge') now = work(now + span(72 * 60, 100 * 60));
			else if (msg.gap === 'nudge2') now = work(now + span(96 * 60, 140 * 60));
			else if (msg.gap === 'team') now = work(now + span(20 * 60, 70 * 60));
			else if (msg.gap === 'api') now = work(now + span(3 * 60, 40 * 60));
			else if (msg.gap === 'hold') now = work(now + span(2 * 60, 26 * 60));
			else if (msg.who === 'note' || msg.who === 'api' || msg.who === 'mnote') now += int(rt, 3, 35) * MIN;
			else if (msg.who === 'm') {
				now += span(25, 30 * 60);
				if ((now % DAY) / HOUR < 7) now = midnight(now) + 7 * HOUR + int(rt, 0, 150) * MIN;
			} else now = work(now + span(40, 18 * 60));
		}
		msg.at = now;
		msgs.push(msg);
	};
	/** Dates a matter talks about are drawn around the moment it is raised. */
	const raise = () => {
		s.openMs = String(now);
		s.openDate = dayMonth(now);
		drawLocal(r, s);
	};
	let carry: string[] = [];
	const m = (paras: string[], art?: string) => {
		push({ who: 'm', paras: [...carry, ...paras], art });
		carry = [];
	};
	const a = (paras: string[], art?: string, gap?: Gap) => push({ who: 'a', paras, art, gap });
	/** A reply that follows straight on from the agent's last message is part of it. */
	const aMore = (paras: string[], art?: string) => {
		const last = msgs.at(-1);
		if (last?.who === 'a' && !last.art) {
			last.paras.push(...paras);
			last.art = art;
		} else a(paras, art);
	};
	let resume = false;
	const turn = (pair: Turn, extra?: [string, string]) => {
		const art = pair[2] ? pair[2](r, s) : undefined;
		const onAgent = pair[3] === 'a';
		const back = resume ? [pick(r, resumeLines)] : [];
		resume = false;
		m([...(!carry.length && !back.length && chance(r, 0.3) ? [pick(r, custAcks)] : []), ...back, F(pair[0]), ...(extra ? [`Unrelated, but ${lowerFirst(F(extra[0]))}`] : [])], onAgent ? undefined : art);
		a([F(pair[1]), ...(extra ? [`And on your other question: ${F(extra[1])}`] : [])], onAgent ? art : undefined);
	};
	const handOver = (topic: Topic) => {
		push({ who: 'note', paras: [`Passing to ${F('{teamName}')}: ${F(topic.handover!)}`] });
		a([F(pick(r, passLines))]);
	};
	const side = (topic: Topic, lead: string) => {
		const saved = { ...s };
		raise();
		const oi = int(r, 0, topic.open.length - 1);
		topic.prep?.(r, s, oi);
		setTeam(topic.team);
		m([lead, F(topic.open[oi]!), ...(chance(r, 0.5) ? [F(pick(r, topic.detail))] : [])]);
		a([F(topic.reply)]);
		topic.turns.slice(0, int(r, Math.max(2, topic.turns.length - 1), topic.turns.length)).forEach((pair) => turn(pair));
		const end = topic.ends.sorted?.agent ? topic.ends.sorted : topic.ends.workaround?.agent ? topic.ends.workaround : topic.ends.change?.agent ? topic.ends.change : undefined;
		if (end) {
			if (end.pre) m([F(end.pre)]);
			(end.pre ? a : aMore)([F(end.agent!)], end.art?.(r, s));
			carry = [F(pick(r, end.member))];
		} else {
			handOver(topic);
			carry = [pick(r, waitLines)];
		}
		for (const key of Object.keys(s)) if (!(key in saved)) delete s[key];
		Object.assign(s, saved);
	};
	const doSides = (asked: boolean) => {
		sides.forEach((topic, position) => side(topic, pick(r, position > 0 ? leadNext : asked ? leadFirst : leadAside)));
		resume = sides.length > 0 && chance(r, 0.85);
	};

	const opening = () => [...(chance(r, 0.5) ? [F(pick(r, backstories))] : []), F(main.open[openIndex]!), ...(chance(r, 0.65) ? [F(pick(r, main.detail))] : [])];
	let quickDone = !quick;
	if (quick && chance(r, 0.35)) {
		quickDone = true;
		if (chance(r, 0.5)) {
			m([`Two things, if I may. First, a quick one: ${F(quick.quick[0])}`, `The bigger one:`, ...opening()]);
			a([`On your quick question: ${F(quick.quick[1])}`, `On the bigger one: ${F(main.reply)}`]);
		} else {
			m([F(quick.quick[0])]);
			a([F(quick.quick[1])]);
			const keep = { rtitle: s.rtitle, rtitle2: s.rtitle2, rtitle3: s.rtitle3, reportWhy: s.reportWhy, rname: s.rname, title: s.title, dtitle: s.dtitle };
			raise();
			Object.assign(s, keep);
			m([pick(r, [`Thanks! While I have you, the real reason I got in touch:`, `Great, thanks. The other thing, and really why I wrote:`, `Perfect. Now the thing that's actually been bothering me.`]), ...opening()]);
			a([F(main.reply)]);
		}
	} else {
		m(opening());
		a([...(!main.reply.startsWith('Thanks') && chance(r, 0.5) ? [pick(r, agentIntros)] : []), F(main.reply)]);
	}
	if (chance(r, 0.5)) {
		const head = ['Display name', 'Joined', 'Published', 'Drafts', ...(openDay >= SLUGS ? ['Bio'] : [])];
		const row = [s.display!, `${s.joined} 2026`, s.posts!, s.drafts!, ...(openDay >= SLUGS ? [pick(r, ['none', 'set'])] : [])];
		push({ who: 'note', paras: [`Account for ${s.panelEmail ?? s.email}, from the admin tool:`], art: table(head, [row]) });
	} else if (chance(r, 0.3)) push({ who: 'note', paras: [F(pick(r, notes))] });
	if (s.posts !== '0' && !main.turns.some((pair) => pair[2] && /^posts/.test(Object.keys(arts).find((key) => arts[key] === pair[2]) ?? '')) && chance(r, 0.35))
		push({ who: 'note', paras: [pick(r, [`Their latest posts, for reference:`, `Recent posts on the account:`, `What they've written lately:`])], art: postRows(r, s, []) });

	const [given, cause, ...rest] = main.turns;
	const quickLater = !quickDone && chance(r, 0.7) ? quick!.quick : undefined;
	if (outcome === 'member') {
		if (sides.length) doSides(true);
		if (quick2) {
			m([pick(r, [`One small thing before I forget: `, `Also, a quick one: `, `By the way, `]) + lowerFirst(F(quick2.quick[0]))]);
			a([F(quick2.quick[1])]);
		} else if (quickLater) {
			m([F(quickLater[0])]);
			a([F(quickLater[1])]);
		}
		if (chance(r, 0.4)) m([pick(r, laterLines)]);
		a([F(pick(r, nudges1))], undefined, 'nudge');
		if (chance(r, 0.6)) a([F(pick(r, nudges2))], undefined, 'nudge2');
	} else {
		if (sidesEarly) doSides(true);
		turn(given!, quickLater);
		if (outcome === 'team' || bounce) {
			handOver(main);
			if (outcome === 'team') {
				push(chance(r, 0.6) ? { who: 'mate', paras: [F(pick(r, mateAcks))], gap: 'team' } : { who: 'mnote', paras: [pick(r, mateNotes)], gap: 'team' });
				if (chance(r, 0.35)) m([pick(r, waitLines)]);
			} else {
				push({ who: 'mnote', paras: [F(main.bounce!)], gap: 'team' });
				const end = main.ends.change!;
				push({ who: 'api', paras: [F(end.note!)], gap: 'api' });
				a([F(end.agent!)]);
				if (chance(r, 0.7)) m([F(pick(r, end.member))]);
			}
		} else {
			if (chance(r, 0.3)) {
				m([F(cause![0])], cause![2] && cause![3] !== 'a' ? cause![2](r, s) : undefined);
				a([pick(r, holdings)]);
				a([F(cause![1])], cause![2] && cause![3] === 'a' ? cause![2](r, s) : undefined, 'hold');
			} else turn(cause!, quick2?.quick);
			if (!sidesEarly && !main.urgent) doSides(false);
			const more = rest.slice(0, int(r, Math.max(1, rest.length - 1), rest.length));
			if (more.length >= 2 && !resume && chance(r, 0.35)) {
				m([F(more[0]![0]), F(more[1]![0])]);
				a([F(more[0]![1]), F(more[1]![1])]);
				more.slice(2).forEach((pair) => turn(pair));
			} else more.forEach((pair) => turn(pair));
			const end = main.ends[outcome as 'sorted' | 'workaround' | 'change']!;
			if (viaTeam) {
				handOver(main);
				push({ who: 'mate', paras: [F(`Hi {first}, {mate} here ({teamLabel}).`), F(main.teamFix!)], gap: 'team' });
			} else {
				if (end.pre) m([F(end.pre)]);
				if (end.note) push({ who: 'api', paras: [F(end.note)], gap: 'api' });
				(end.note || end.pre ? a : aMore)([F(end.agent!)], end.art?.(r, s));
			}
			if (outcome !== 'change' || chance(r, 0.7)) m([F(pick(r, end.member))]);
			if (outcome === 'sorted' && chance(r, 0.5)) a([pick(r, closings)]);
			if (main.urgent) {
				doSides(false);
				if (carry.length) m([]);
			}
		}
	}
	const limit = EXPORT - 6 * HOUR;
	const end = msgs.at(-1)!.at!;
	if (end > limit) for (const msg of msgs.slice(1)) msg.at = openMs + Math.round(((msg.at! - openMs) * (limit - openMs)) / (end - openMs));
	const times = msgs.map((msg) => msg.at!);

	// The file.
	const from = main.fromAlt ? s.email2! : s.email!;
	let subject: string;
	if (channel === 'app' || channel === 'web') {
		const words = msgs[0]!.paras[0]!.split(/\s+/);
		subject = words.length > 9 ? `${words.slice(0, 8).join(' ')}…` : words.join(' ');
	} else subject = quickDone && quick && msgs[0]!.paras[0]!.startsWith(F(quick.quick[0])) ? F(pick(r, quick.subjects)) : chance(r, 0.2) ? pick(r, vagueSubjects) : F(pick(r, main.subjects));
	const lines: string[] = [`# Ticket ${number}: ${subject}`, '', '| Field | Value |', '| --- | --- |'];
	lines.push(`| Received | ${stamp(openMs)}, ${channel === 'email' ? 'by email to help@' : channel === 'app' ? 'from the contact form in the app' : 'from the contact form on the website'} |`);
	lines.push(`| From | ${s.full} <${from}> |`);
	if (channel === 'app') lines.push(`| Sent from | Copperleaf for ${s.platform} ${s.appv}, ${s.device}, ${s.os} |`);
	lines.push('', '## Conversation');
	let memberCount = 0;
	let agentCount = 0;
	msgs.forEach((msg, i) => {
		const when = stamp(times[i]!);
		const body: string[] = [];
		if (msg.who === 'm') {
			const form = i === 0 && channel !== 'email';
			lines.push('', `### ${s.full} · ${when}`, '');
			if (!form) body.push(F(pick(r, memberCount === 0 ? firstGreetings : replyGreetings)));
			body.push(...msg.paras);
			if (msg.art) body.push(msg.art);
			if (!form) body.push(F(pick(r, memberCount === 0 ? custSignoffs : replySignoffs)));
			memberCount++;
		} else if (msg.who === 'a') {
			lines.push('', `### ${agent}, Copperleaf Support · ${when}`, '');
			const answering = msgs.slice(0, i).reverse().find((other) => other.who === 'm' || other.who === 'a')?.who === 'm';
			body.push(F(pick(r, agentCount === 0 ? agentGreetings : answering ? agentGreetingsLater : agentGreetingsAgain)), ...msg.paras);
			if (msg.art) body.push(msg.art);
			if (chance(r, 0.15)) body.push(pick(r, agentClosers));
			body.push(F(pick(r, agentSignoffs)));
			agentCount++;
		} else {
			const head =
				msg.who === 'note' ? `Internal note · ${agent}` : msg.who === 'api' ? `Internal note · ${s.apiDev}, API` : msg.who === 'mnote' ? `Internal note · ${s.mate}, ${s.teamLabel}` : `${s.mate}, ${s.teamLabel}`;
			lines.push('', `### ${head} · ${when}`, '');
			body.push(...msg.paras);
			if (msg.art) body.push(msg.art);
			if (msg.who === 'mate') body.push(s.mate!);
		}
		lines.push(body.filter((para) => para !== '').join('\n\n'));
	});
	return { name: `ticket-${number}.md`, text: `${lines.join('\n')}\n`, opened: openMs, span: end - openMs };
};
const ticket = (index: number) => {
	let pace = 1;
	let made = compose(index, pace);
	for (let tries = 0; tries < 6 && made.span > EXPORT - 8 * HOUR - made.opened; tries++) {
		pace *= ((EXPORT - 8 * HOUR - made.opened) / made.span) * 0.9;
		made = compose(index, pace);
	}
	return made;
};

// ---------------------------------------------------------------------------------------------------------
const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets\n\nThe ${ITEMS} tickets Copperleaf members sent to support between 28 September and 13 November 2026, one file\neach, as the old help desk exported them on 20 November. Tickets came in by email to help@, from the contact form\nin the apps and from the contact form on the website. Each file holds the whole conversation, with the notes the\nsupport team, the developers and the other teams left on it. The export does not keep the help desk's tags or\nstatuses.\n`
);
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
