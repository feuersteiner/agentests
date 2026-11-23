// Writes the long material of this entry's long tasks: the reports filed in the Gatehouse team's
// scoring-reports queue from July to November 2026, one Markdown file each, under docs/scoring-reports/.
// Each report is a case of one of the topics below; its thread runs from the report to where it ended.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * How many reports to write. Everything else follows from it. Up to the number of cases below (95) every report is
 * a different case; past that, cases come round again as later reports from another person of the same team.
 */
const ITEMS = 95;

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
const hex = (r: Rand, length: number) => Math.floor(r() * 16 ** length).toString(16).padStart(length, '0');

// Dates are plain YYYY-MM-DD strings; Date is only used with an explicit argument, to count days.
const addDays = (date: string, days: number): string => {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const toWeekday = (date: string) => (weekday(date) === 6 ? addDays(date, 2) : weekday(date) === 0 ? addDays(date, 1) : date);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (date: string) => `${Number(date.slice(8))} ${monthNames[Number(date.slice(5, 7)) - 1]}`;
const LAST_DAY = '2026-11-20';

// The features as the export has carried them. `from` and `until` are the days a change reached the scorer, which
// reads the export when it starts, so a change goes live with the next deploy. The last seven are today's export.
type Headers = Record<string, string>;
interface Feature {
	name: string;
	header: string;
	contains: string;
	from?: string;
	until?: string;
}
const features: Feature[] = [
	{ name: 'ua_headless', header: 'user-agent', contains: 'headlesschrome' },
	{ name: 'ua_python_requests', header: 'user-agent', contains: 'python-requests' },
	{ name: 'ua_curl', header: 'user-agent', contains: 'curl/' },
	{ name: 'ua_go_http', header: 'user-agent', contains: 'go-http-client', from: '2026-07-23' },
	{ name: 'ua_okhttp', header: 'user-agent', contains: 'okhttp', until: '2026-08-06' },
	{ name: 'lang_wildcard', header: 'accept-language', contains: '*' },
	{ name: 'accept_any', header: 'accept', contains: '*/*' },
	{ name: 'accept_enc_identity', header: 'accept-encoding', contains: 'identity', until: '2026-09-03' },
	{ name: 'via_squid', header: 'via', contains: 'squid', until: '2026-10-08' },
	{ name: 'conn_close', header: 'connection', contains: 'close' }
];
/** edge-scorer 1.4.0: header names matched without regard to case, and matched names in the answer. */
const RELEASE_1_4 = '2026-10-28';
const activeOn = (date: string) => features.filter((f) => (!f.from || date >= f.from) && (!f.until || date < f.until));
/** What the scorer answered on `date`: values compared exactly, as it still does. */
const scoreOn = (date: string, headers: Headers) => {
	const lookup: Headers = {};
	for (const [name, value] of Object.entries(headers)) lookup[date >= RELEASE_1_4 ? name.toLowerCase() : name] = value;
	const matched = activeOn(date)
		.filter((f) => lookup[f.header] !== undefined && lookup[f.header]!.includes(f.contains))
		.map((f) => f.name);
	return { score: matched.length, matched, bot: matched.length >= 2 };
};

// Request headers.
const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
const chrome = (r: Rand) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${int(r, 118, 130)}.0.0.0 Safari/537.36`;
const safari = (r: Rand) => `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.${int(r, 1, 6)} Safari/605.1.15`;
const firefox = (r: Rand) => {
	const v = int(r, 119, 132);
	return `Mozilla/5.0 (X11; Linux x86_64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`;
};
const iphone = (r: Rand) => {
	const m = int(r, 3, 6);
	return `Mozilla/5.0 (iPhone; CPU iPhone OS 17_${m} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.${m} Mobile/15E148 Safari/604.1`;
};
const languages = ['en-GB,en;q=0.9', 'en-GB', 'en-US,en;q=0.9', 'en-GB,en-US;q=0.9,en;q=0.8', 'cy-GB,en-GB;q=0.8', 'en-IE,en;q=0.9'];
const browser = (r: Rand, extra: Headers = {}): Headers => ({
	'user-agent': pick(r, [chrome, chrome, safari, firefox, iphone])(r),
	accept: BROWSER_ACCEPT,
	'accept-language': pick(r, languages),
	'accept-encoding': 'gzip, deflate, br',
	...extra
});
const headless = (r: Rand) => `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/${int(r, 118, 130)}.0.0.0 Safari/537.36`;
const titleCase = (headers: Headers): Headers =>
	Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.replace(/(^|-)([a-z])/g, (_, dash: string, c: string) => dash + c.toUpperCase()), value]));

// People, by team.
const people: Record<string, string[]> = {
	Gatehouse: ['Ilse Marsh', 'Kofi Mensah', 'Dagny Holm', 'Rui Saldanha'],
	'Bot pipeline': ['Mira Castellane', 'Oren Tadmor', 'Bea Kowalski'],
	Edge: ['Tamsin Rook', 'Hal Petrov'],
	'Support desk': ['Jo Baptiste', 'Ravi Menon', 'Ama Owusu'],
	Storefront: ['Lucía Ferro', 'Tom Hadley'],
	Checkout: ['Wendell Achebe', 'Saskia Brandt'],
	'Help Centre': ['Noor Haddad', 'Elin Svensson'],
	'Partner API': ['Sander Visser', 'Priya Raman'],
	SRE: ['Gwen Talbot', 'Marek Zielinski'],
	Mobile: ['Yuki Arai', 'Dev Malhotra'],
	Search: ['Pavel Dvorak', 'Anouk Peeters'],
	Accounts: ['Femi Adeyemi', 'Hana Novak'],
	Marketing: ['Clara Moss', 'Josh Whitfield'],
	Data: ['Ines Duarte', 'Callum Reid'],
	'Retail ops': ['Bryn Pugh', 'Kit Ashworth'],
	'Trade accounts': ['Odile Fournier', 'Sam Okoro'],
	Orders: ['Matteo Ricci', 'Lena Vogt']
};

/** One report: who filed it, about what, the requests behind it and which of its topic's endings it reaches. */
interface Case {
	team: string;
	who: string;
	site: string;
	paths: string[];
	/** A noun phrase for what sends the requests, such as "the monitor". */
	client: string;
	/** The days the report can be filed on. */
	when: [string, string];
	title: string;
	body: string;
	/** A second paragraph of the report. */
	context: string;
	/** The customer's own words, for reports from the desk. */
	quote?: string;
	/** A detail the reporter adds once asked. */
	more?: string;
	headers: (r: Rand) => Headers;
	end: number;
	note?: string;
	probe?: string;
	/** True when the story puts the first log lines on the day before the report. */
	yesterday?: true;
	/** True for a report about one customer, where "more contacts" would not fit. */
	single?: true;
	/** The hour (UTC) its log lines start at, when the story fixes one. */
	hour?: number;
	/** Exchanges particular to this case, after the topic's own. */
	extra?: Line[];
}
type Outcome = 'export' | 'proxy' | 'sender' | 'service' | 'handed' | 'declined' | 'waiting';
/** [who, text, the day it cannot come before]. Who is gate, analyst, edge, reporter or a team's name. */
type Line = [string, string, string?];
interface Topic {
	/** What the reports turn out to be: people taken for bots, bots let through, or something other than scoring. */
	kind: 'flagged' | 'missed' | 'other';
	/** Whether the replay also shows the user agent in lower case, for a feature the exact comparison misses. */
	lowerDemo?: true;
	/** How the proxy log shows the case's requests. */
	log: 'scored' | 'ratelimit' | 'timeout' | 'unscored' | 'country' | 'loop' | 'cached' | 'solved' | 'origin' | 'none';
	table?: boolean;
	explain?: Record<string, string>;
	probe: string[];
	note?: string | ((date: string) => string);
	analyst?: string;
	guess?: [string, string];
	/** A second wrong guess and its answer. */
	guess2?: [string, string];
	edge?: string;
	/** The options, talked over once the cause is known. */
	weigh?: Line[];
	/** Further exchanges particular to the topic. */
	extra?: Line[];
	/** False when the situation lasted only days, so daily figures, later log lines and updates would not fit it; its thread then moves within a day or two. */
	stats?: false;
	/** True when each report is about a one-off event, so a later look at the log would show nothing new. */
	once?: true;
	/** Pasted output of its own, for a topic whose requests never reach the scorer. */
	art?: (r: Rand, c: Case, date: string) => string;
	endings: [Outcome, Line[]][];
	cases: Case[];
}

const topics: Topic[] = [
	// Monitors and checkers built on curl.
	{
		kind: 'flagged',
		log: 'scored',
		explain: { accept_any: 'accept_any, because curl sends Accept: */* unless told otherwise' },
		probe: [
			'Checkers like this are very often curl underneath, and curl with its default user agent matches two features on its own: ua_curl, and accept_any, because it sends Accept: */*. Two is the bot line. Can you find out what user agent {CLIENT} sends?',
			'My first guess is the user agent. Can you paste a few proxy log lines for the failing requests?'
		],
		note: 'Nothing else in the request matches; it is a plain curl request.',
		analyst: 'For context on ua_curl: curl with its default user agent is about a third of everything we score as a bot on the shop, nearly all of it price and stock scraping. We would rather not touch the feature for {CLIENT}, which is a few requests an hour.',
		guess: ["Could it be where the requests come from? They run in a cloud provider's address ranges, and we had trouble with those last year.", 'The scorer never sees addresses, only the forwarded headers. If the ranges matter anywhere, it is in the proxy.'],
		edge: 'For what it is worth, the proxy can skip scoring for a list of source ranges. It is a config change, and those go out in the Wednesday morning window.',
		weigh: [['gate', 'As I see it there are three ways out: the client stops looking like curl, the proxy stops scoring it, or we drop or weaken ua_curl. I would rule out the last; it would let a third of the shop\'s scrapers through for the sake of a few requests an hour.'], ['analyst', 'Agreed on leaving ua_curl alone. Of the other two, a different user agent is the cleanest, if whoever runs the client can change it.']],
		extra: [['reporter', 'In the meantime every failed check is noise for us, and we have started ignoring it, which defeats the point of running it.'], ['gate', 'For the record, ua_curl alone would be a score of 1 and harmless. It is the pair with accept_any that tips it, and since curl always sends Accept: */*, in practice ua_curl decides.']],
		guess2: ['Could the checks be failing because they come too often, every minute from several places?', 'The scorer does not count requests; it sees each one alone. Frequency would matter to the proxy\'s rate limit, and that answers 429, not our page.'],
		endings: [
			['proxy', [
				['gate', 'Agreed with Edge that this belongs in the proxy rather than in the features. The monitor publishes its source ranges, so they can skip scoring.'],
				['edge', "The monitor's published ranges went on the skip list in this morning's change window. Its requests no longer reach the scorer."],
				['reporter', 'All six regions green since the change. Thanks, all.']
			]],
			['sender', [
				['gate', "We are not going to change the features for one partner's check. The fix that costs least is on their side: any user agent other than curl's default takes them down to a score of 1."],
				['reporter', 'Passed on. Brightwater say they will change the runner in their next release.'],
				['reporter', 'Brightwater changed the runner to send its own user agent, "BrightwaterSynthetics/1.0". No failures in their dashboard since, and a replay scores 1.']
			]],
			['declined', [
				['gate', 'Talked this over with Mira. The scorer is doing what it should: a script with curl\'s default user agent fetching hundreds of pages in a few minutes is what ua_curl is for. We will not add an exception for the link checker. It could run against the origin directly, without the proxy, but that is your call.'],
				['reporter', 'Understood, though I do not love it. We will look at it after the release.'],
				['gate', 'Closing this as not something we will change.']
			]]
		],
		cases: [
			{
				team: 'SRE', who: 'Gwen Talbot', site: 'status', paths: ['/', '/api/summary.json', '/history'], client: 'the monitor', when: ['2026-07-02', '2026-07-16'], end: 0,
				title: 'External uptime monitor reports the status page as down',
				context: 'Nothing changed on the status page itself; its last deploy was a fortnight ago. Pausing and restarting the checks made no difference.',
				body: 'Our uptime provider checks the status page and the shop\'s home page every minute from six regions. Since this morning four of the regions report both as down, while the pages are fine in a browser. The response body the monitor stored is our "checking your browser" page, so it looks as if the bot check is catching it.',
				more: 'One detail that may matter: the two regions that still pass run the provider\'s older agent. The provider says their new agent, rolled out region by region this week, is built on curl.',
				headers: (r) => ({ 'user-agent': `curl/${pick(r, ['7.88.1', '8.4.0', '8.5.0'])}`, accept: '*/*' })
			},
			{
				team: 'Partner API', who: 'Priya Raman', site: 'api', paths: ['/v2/stock/ping'], client: "Brightwater's curl runner", when: ['2026-08-11', '2026-09-25'], end: 1,
				title: "A marketplace's synthetic check on the stock endpoint gets HTML back",
				context: 'Brightwater pause our listings when their check fails twice in a row, so each failure takes our products off their site for a while.',
				body: 'Brightwater, one of the marketplaces on the partner API, checks GET /v2/stock/ping every five minutes from two runners. The checks from their curl-based runner fail with an HTML page; the ones from their browser-based runner pass. They have opened a ticket with us and sent the exact command they run.',
				more: 'Their command is a bare `curl -s -o /dev/null -w "%{http_code}"` against the ping URL, nothing else set. They see 403 from it and 200 from the other runner within the same minute.',
				headers: (r) => ({ 'user-agent': `curl/${pick(r, ['7.81.0', '8.2.1'])}`, accept: '*/*' })
			},
			{
				team: 'Help Centre', who: 'Elin Svensson', site: 'help', paths: ['/articles/returns-and-refunds', '/articles/delivery-times', '/articles/change-your-address', '/articles/gift-cards'], client: 'the link checker', when: ['2026-10-05', '2026-11-06'], end: 2,
				title: 'Nightly link check says every help article is broken',
				context: 'The build marks a release as failed when the checker reports broken links, so we have switched the check off to publish anything.',
				body: 'The help centre build runs a link checker over the published site each night. For the last few nights it has reported nearly every article as answering 403. The checker is a short shell script around curl, run from the build servers, and it fetches the articles one after another as fast as it can.',
				more: 'It fetches about 900 articles in four minutes. The first thirty or so come back fine each night and then it is 403 all the way down, if that tells you anything.',
				headers: (r) => ({ 'user-agent': `curl/${pick(r, ['8.4.0', '8.6.0'])}`, accept: '*/*' })
			}
		]
	},
	// The Android app's okhttp user agent.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'Anything built on okhttp says so in its user agent, and the export has a feature for that, ua_okhttp. With an Accept: */* on top, that makes two. Can you get me the headers of one request that failed?',
			'Can you get a request id or two from a phone that saw it? I suspect the user agent.'
		],
		note: 'Nothing else matches.',
		analyst: 'ua_okhttp went into the export in the spring, when most of the scripted basket traffic came from okhttp. That traffic moved to other clients in June, so the feature now catches far less than it did. I would not miss it.',
		guess: ["Is it the app's certificate pinning? The pinned certificates were changed in June.", 'That would fail before the request ever reached the proxy. These requests reach the proxy and get scored, so it is not the pinning.'],
		edge: 'From the proxy\'s side these are ordinary challenged requests: a score of 2, so the challenge page is served. Nothing unusual in the proxy itself.',
		weigh: [['gate', 'Options: drop ua_okhttp from the export, or ask every okhttp client to change its headers. The second is not realistic; we do not control the clients, and there are many.'], ['analyst', 'Dropping it is fine by us. Let us check what it still catches before we decide.']],
		extra: [['gate', 'For the record, ua_okhttp alone would be a score of 1 and harmless. It is the Accept: */* on top that makes it 2.']],
		guess2: ['Could it be the mobile networks? Some of them put many phones behind one address.', 'The scorer never sees addresses, so sharing one makes no difference to the score.'],
		endings: [
			['export', [
				['analyst', 'We have taken ua_okhttp out of the export. The 16:00 export on 5 August is the first without it.', '2026-08-05'],
				['gate', "The scorer reads the export when it starts, so the change reaches production with Thursday's deploy on 6 August.", '2026-08-05'],
				['reporter', 'Images loading again on every Android phone we have. Thanks.', '2026-08-06']
			]],
			['export', [
				['gate', 'Same cause as the image problem the Mobile team reported: ua_okhttp plus accept_any. The analysts are taking ua_okhttp out of the export.'],
				['analyst', 'Done: the export of 5 August at 16:00 no longer has ua_okhttp. It goes live with the next deploy.', '2026-08-05'],
				['reporter', "No Android contacts about this since Thursday's deploy. Closing from our side.", '2026-08-07']
			]],
			['export', [
				['analyst', 'ua_okhttp is gone from the export from 5 August, 16:00. It was catching mostly real apps by then.', '2026-08-05'],
				['gate', 'Live since the deploy on 6 August.', '2026-08-06'],
				['reporter', "Fennick confirm the drivers' status updates all go through now."]
			]]
		],
		cases: [
			{
				team: 'Mobile', who: 'Yuki Arai', site: 'shop', paths: ['/images/p/48213/medium.webp', '/images/p/30518/medium.webp', '/api/app/basket'], client: 'the Android app', when: ['2026-07-03', '2026-07-20'], end: 0,
				title: 'Product images missing in the Android app',
				context: 'Our error reports show the image requests answered with a 403 and an HTML body. The app treats a failed image as missing, so users see no error.',
				body: 'Since the weekend, Android users have been sending screenshots of product pages with grey boxes where the images should be. The app gets an HTML page instead of the image for some of them. iOS is fine. We have not released the Android app since 3 June, so nothing has changed in the app itself.',
				more: 'It is worse on mobile data than on wifi, but it happens on both. Logged-in or not makes no difference.',
				extra: [['reporter', 'For the analysts: the app has used okhttp since its first release in 2021. If ua_okhttp is new, that would explain why this only started now.'], ['analyst', 'It is not new, it went in back in April. What changed is the image loader you added in June, which sends Accept: */* on every image.']],
				headers: (r) => ({ 'user-agent': `okhttp/4.${pick(r, ['11.0', '12.0'])}`, accept: '*/*', 'accept-encoding': 'gzip', connection: 'Keep-Alive' })
			},
			{
				team: 'Support desk', who: 'Jo Baptiste', site: 'shop', paths: ['/api/app/basket', '/api/app/checkout'], client: 'the Android app', when: ['2026-07-06', '2026-07-24'], end: 1,
				title: 'Android customers asked to prove they are human at checkout',
				context: 'The contacts come from different parts of the country and different phone makes. Nobody on iPhone or on the website has reported it.',
				body: 'Eleven contacts this week from customers using the Android app who get a "verify you are human" screen when they tap Checkout. The screen does not work inside the app, so they cannot get past it. Several abandoned their orders. One of them sent this:',
				quote: 'I have bought from you for years and today your app tells me to prove I am a human. There is a box to tick but nothing happens when I tick it. I gave up and bought the lamp somewhere else.',
				headers: (r) => ({ 'user-agent': `okhttp/4.${pick(r, ['11.0', '12.0'])}`, accept: '*/*', 'accept-encoding': 'gzip', connection: 'Keep-Alive' })
			},
			{
				team: 'Partner API', who: 'Sander Visser', site: 'api', paths: ['/v2/deliveries/assigned', '/v2/deliveries/42817/status', '/v2/deliveries/42822/status'], client: "Fennick Couriers' driver app", when: ['2026-07-13', '2026-07-24'], end: 2,
				title: "Courier partner's driver app cannot update delivery status",
				context: 'Fennick retry each failed update every five minutes, so the same updates go round all day.',
				body: "Fennick Couriers say their drivers' Android app gets an HTML page back when it posts a delivery status, so parcels show as out for delivery long after they have arrived. Their app is built on okhttp and they say nothing has changed on their side for months.",
				more: 'Fennick have about 140 drivers on our deliveries. Customers are ringing us to ask where parcels are that were delivered hours ago.',
				headers: (r) => ({ 'user-agent': `okhttp/${pick(r, ['3.14.9', '4.9.3'])}`, accept: '*/*', 'content-type': 'application/json', 'accept-encoding': 'gzip' })
			}
		]
	},
	// Built-in browsers in the iOS apps that send no language.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'The built-in browser of an iOS app does not always send a language. If it sends Accept-Language: * that is lang_wildcard, and its Accept header ends in */* like every browser, which is accept_any. Can you get the headers of one request?',
			'Can you get one request id from a device where it happens? I have a suspicion about the language header.'
		],
		explain: { accept_any: "accept_any on the browser's usual Accept header, which ends in */*" },
		note: 'The user agent itself matches nothing.',
		analyst: 'lang_wildcard is one of our better features on its own: real browsers almost never send a bare *. Built-in browsers in apps are the exception, and we had very few of those in the traffic we built it from.',
		guess: ["Could it be the app's user agent? It does not say Safari.", 'Checked: the user agent matches no feature at all. It is only the language and the Accept header.'],
		edge: 'The challenge needs cookies and a script, and built-in browsers in apps often block one or the other. That is why these users are stuck rather than briefly delayed.',
		weigh: [['gate', 'This can be fixed in two places: the app can send a language, or the scorer can count lang_wildcard for less once it uses weights. The app is quicker where a release is coming anyway.'], ['analyst', 'lang_wildcard should stay in the export either way: on its own it catches a lot of scripts.']],
		extra: [['analyst', 'For what it is worth, lang_wildcard on its own is 1, and so is accept_any. It is always the pair.'], ['reporter', 'How do we tell which customers are affected? We only hear from the ones who write in.'], ['gate', 'Every request from that built-in browser is affected. There is nothing more selective than that in the headers.']],
		guess2: ['Is it because the built-in browser does not keep cookies between sessions?', 'Cookies only matter after the challenge. The score comes first, from the headers alone.'],
		endings: [
			['sender', [
				['gate', "The fix that helps most is in the app: send the device's language, as Safari does. Then only accept_any matches."],
				['Mobile', 'Agreed. It is in 6.13, which goes to review this week.'],
				['Mobile', '6.13 is out, and its built-in browser sends the device language. The help screen opens articles without the challenge now.']
			]],
			['sender', [
				['gate', 'This is the app\'s built-in browser sending Accept-Language: *. Mobile are changing it to send the device language.'],
				['Mobile', 'Released in 6.13 this morning. Most customers update within a few days.'],
				['reporter', 'No more contacts about the returns article since the release. Closing from the desk.']
			]],
			['waiting', [
				['analyst', 'Since 4 November the export carries a weight for each feature, and lang_wildcard and accept_any together come to 0.75, well under the bot line. That only helps once the scorer uses the weights, which it does not yet.', '2026-11-04'],
				['gate', 'Using the weights is on our list but not started. Until then the store finder will keep tripping it.'],
				['reporter', 'OK. We are not changing the iPad app before January, so we are waiting on the scorer.']
			]]
		],
		cases: [
			{
				team: 'Help Centre', who: 'Noor Haddad', site: 'help', paths: ['/articles/track-your-order', '/articles/returns-and-refunds', '/articles/delivery-times'], client: "the iOS app's built-in browser", when: ['2026-09-08', '2026-10-02'], end: 0,
				title: 'Help articles opened from the iOS app show the challenge page',
				context: 'About 14% of help article views come from the app, and returns contacts to the desk have gone up since 6.12.',
				body: 'When a customer taps Help in the iOS app, the article opens in the app\'s built-in browser, and since 6.12 shipped many of them see the "checking your browser" page instead. The same article opens fine in Safari. The built-in browser cannot complete the challenge.',
				more: '6.12 moved Help from a native screen to the built-in browser, which is probably why it started with that release.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 17_${int(r, 4, 6)} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`, accept: BROWSER_ACCEPT, 'accept-language': '*', 'accept-encoding': 'gzip, deflate, br' })
			},
			{
				team: 'Support desk', who: 'Ama Owusu', site: 'help', paths: ['/articles/returns-and-refunds'], client: 'the iOS app', when: ['2026-09-10', '2026-10-09'], end: 1,
				title: 'Customers on iPhone cannot read the returns article',
				context: 'We have started pasting the article text into chat instead of sending the link, which takes the agents much longer.',
				body: 'We send customers a link to the returns article from chat. Customers on iPhone who open it from the app\'s messages screen get stuck on a verification page. On a laptop the same link works. Typical message:',
				quote: 'The link you sent goes to a page that says it is checking my browser and then nothing. I have tried four times.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 17_${int(r, 4, 6)} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`, accept: BROWSER_ACCEPT, 'accept-language': '*', 'accept-encoding': 'gzip, deflate, br' })
			},
			{
				team: 'Mobile', who: 'Dev Malhotra', site: 'shop', paths: ['/stores', '/stores/leeds', '/stores/bristol'], client: "the iPad app's store finder", when: ['2026-10-26', '2026-11-09'], end: 2,
				title: 'Store finder in the iPad app stuck on the verification page',
				context: 'The store finder gets about 3,000 visits a week from the iPad app, mostly people checking opening hours before a visit.',
				body: 'The store finder in the iPad app is a web page in a built-in browser, and some users see the verification page there. The iPad app is a separate codebase from the phone app, and its next release is not until January.',
				more: 'I checked, and the iPad app\'s built-in browser was never given the language fix the phone app got in the autumn.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (iPad; CPU OS 17_${int(r, 4, 6)} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`, accept: BROWSER_ACCEPT, 'accept-language': '*', 'accept-encoding': 'gzip, deflate, br' })
			}
		]
	},
	// Office and campus web gateways.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'Office and campus networks usually go through a web gateway, and gateways tend to add a Via header and force Connection: close. Both have features. Can you get the headers of one request from inside the network?',
			'Can you ask them for the time of one attempt, to the minute? I will find it in the proxy log.'
		],
		explain: { accept_any: "accept_any on the browser's ordinary Accept header", conn_close: 'conn_close, because the gateway forces Connection: close' },
		analyst: 'via_squid went in when a scraping operation ran through rented Squid gateways. It also catches every office and campus that uses Squid, which we underestimated.',
		guess: ['Could their gateway be stripping cookies, so the challenge never completes?', 'Possibly, but they would not be challenged in the first place without the score. The cookies would only explain why they cannot get past it.'],
		edge: 'We can add a customer\'s egress addresses to the skip list, but every exception is one more thing nobody remembers in a year. I would rather the features were right.',
		weigh: [['gate', 'For gateways the choices are always the same: change the features, skip-list the network at the proxy, or ask the network\'s IT to change the gateway. None of them is free.'], ['edge', 'From our side the skip list is the easiest to do and the hardest to keep tidy.']],
		extra: [['gate', 'For anyone reading later: a browser anywhere scores at least 1, because accept_any matches every normal page load. So any gateway that adds one more feature puts everyone behind it on the line.']],
		guess2: ['Could it be that everyone shares one address and looks like one very busy client?', 'That would be the proxy\'s rate limit, which answers 429. These are challenges, which only come from the score.'],
		endings: [
			['proxy', [
				['analyst', 'We have dropped via_squid from the export as of 7 October; it goes live with the deploy on 8 October.', '2026-10-07'],
				['reporter', 'Hollin & Wray say they still get the page after Thursday.', '2026-10-09'],
				['gate', 'Expected, sorry, I should have said: conn_close and accept_any still match, and two is enough. Without via_squid they score 2 instead of 3.'],
				['edge', "Hollin & Wray's two egress addresses are on the skip list since this morning's window."],
				['reporter', 'Confirmed working from their office. Thanks.']
			]],
			['sender', [
				['analyst', 'via_squid is out of the export from 7 October, live from the 8th.', '2026-10-07'],
				['gate', 'That takes the college to 2, not below it: conn_close and accept_any still match. The other half has to come from their gateway, which forces Connection: close.'],
				['reporter', "The college's IT team turned off the forced Connection: close on their gateway yesterday. The customer says the shop works from every machine now."]
			]],
			['waiting', [
				['gate', 'via_squid has been out of the export since October, so what is left is conn_close and accept_any, exactly 2.'],
				['analyst', 'With the weights the export carries since 4 November, those two come to 0.5. Once the scorer uses the weights this goes away.', '2026-11-04'],
				['gate', 'Which it does not yet. Leaving this open until the scorer uses the weights.'],
				['reporter', 'The library service asked whether there is a date. I have told them there is not.']
			]]
		],
		cases: [
			{
				team: 'Trade accounts', who: 'Odile Fournier', site: 'trade', paths: ['/catalogue', '/orders/new', '/catalogue/fixings'], client: "Hollin & Wray's office network", when: ['2026-09-07', '2026-09-28'], end: 0,
				title: 'Staff at Hollin & Wray cannot place trade orders from their office',
				context: 'Hollin & Wray order about £40,000 a month through the portal, nearly all of it from the office. Their buyers have started phoning orders through to our trade desk.',
				body: 'Hollin & Wray is one of our larger trade accounts. For the last few days their buyers have got the verification page on the trade portal from the office, every time, on every page. From home or on their phones it works. Their IT team says their web gateway has not changed.',
				more: 'Their IT team sent me this from the gateway\'s settings page: "Squid 5.7, Via header on, persistent connections off". I do not know what any of it means.',
				headers: (r) => browser(r, { via: `1.1 hw-gw0${int(r, 1, 3)} (squid/5.7)`, connection: 'close' })
			},
			{
				team: 'Support desk', who: 'Ravi Menon', site: 'shop', paths: ['/', '/c/stationery', '/c/art-supplies'], client: "the college's network", when: ['2026-09-14', '2026-09-28'], end: 1,
				title: 'Students at a college get the verification page on the shop',
				context: 'The college orders its art and stationery supplies at the start of each term, and its next order is due soon.',
				body: 'A customer who orders for Larkfield College says every computer on the college network gets "checking your browser" on our shop and never gets past it. She has to order from her phone. This is the third contact from the college this month.',
				quote: 'Every PC in the college shows your checking page, staff and students alike. It is fine on my phone. We spend a lot with you each term, so I hope someone can look at it.',
				headers: (r) => browser(r, { via: '1.1 proxy.larkfield.ac.uk (squid/4.15)', connection: 'close' })
			},
			{
				team: 'Help Centre', who: 'Elin Svensson', site: 'help', paths: ['/articles/delivery-times', '/articles/assembly-service'], client: 'the county library network', when: ['2026-10-12', '2026-11-05'], end: 2,
				title: 'Library computers in Westmere stuck on the challenge page',
				context: 'The libraries use our help articles in their digital skills sessions, so the problem shows up in front of a room of people.',
				body: 'The county library service says the public computers in its branches cannot open help articles: they sit on the verification page. Their network goes out through one central web gateway for all eighteen branches.',
				more: 'The library\'s IT contact says their gateway must close every connection for their filtering to work, and they will not change that for one site.',
				headers: (r) => browser(r, { via: '1.1 webgw.westmere-libraries.gov.uk (squid/6.1)', connection: 'close' })
			}
		]
	},
	// Our own headless renderers.
	{
		kind: 'flagged',
		lowerDemo: true,
		log: 'scored',
		probe: [
			"It is headless Chrome, so my first thought is ua_headless. Can you get me the headers of one of {CLIENT}'s requests?",
			'Can you send a request id from one of the bad ones?'
		],
		note: 'ua_headless does not match, although this is headless Chrome: the user agent says HeadlessChrome, with capitals, and the scorer compares values exactly. What tips it over is Connection: close, which {CLIENT} sends on every request.',
		analyst: 'Interesting that ua_headless is not what caught it. We look at conn_close in our reviews mainly for old scripts; I did not expect a modern browser to send it.',
		guess: ['So should we be asking for ua_headless to be fixed first? It is clearly not catching what it is meant to.', 'That is a separate problem, and fixing it would make this one worse, not better: these requests would then match three features instead of two.'],
		edge: 'Internal services that render our own pages should not go through the public proxy at all. They can call the origin directly on the internal network.',
		weigh: [['gate', 'Our own services have no reason to go through the public proxy. Where they can reach the origin directly, that is the fix; where they cannot, the proxy can skip their internal addresses.'], ['edge', 'Internal addresses are the one kind of skip-list entry I do not mind, because they do not move.']],
		extra: [['reporter', 'How did this ever work, then? It has been running for a long time.'], ['gate', 'My guess is that closing the connection after every page came with a library upgrade. Before that it would have scored 1, like any browser.']],
		guess2: ['Could it be fetching pages too quickly one after another, and that is what gives it away?', 'The scorer has no sense of speed; it scores each request\'s headers on their own.'],
		endings: [
			['sender', [
				['gate', 'Suggest the renderer fetches the page from the origin on the internal network rather than through the proxy. Nothing is scored there.'],
				['reporter', "Done in today's release: the renderer opens receipts on the internal origin. Fifty PDFs checked, all of them receipts."]
			]],
			['proxy', [
				['reporter', 'We cannot point the generator at the origin; the campaign pages are assembled at the edge.'],
				['edge', "Then the skip list it is: the generator's internal egress range is on it from this morning's change window."],
				['reporter', 'New previews look right. Thanks.']
			]],
			['declined', [
				['gate', 'We would rather not add an exception for a job that can run without the proxy. The comparison can run against the origin, as the receipt renderer does.'],
				['reporter', "The origin does not have the edge's banners, so the comparison would miss half of what it is for. Disappointing."],
				['gate', 'Understood. Still a no from us on an exception; closing.']
			]]
		],
		cases: [
			{
				team: 'Orders', who: 'Matteo Ricci', site: 'shop', paths: ['/orders/58213/receipt', '/orders/58240/receipt', '/orders/58301/receipt'], client: 'the receipt renderer', when: ['2026-07-20', '2026-08-28'], end: 0,
				title: 'Receipt PDFs contain the verification page instead of the receipt',
				context: 'The bad PDFs are a few percent of all receipts, but a customer who gets one tends to get it on every retry for a while.',
				body: 'Customers can download a PDF receipt from their order page. The PDF is made by our renderer, which opens the receipt page in headless Chrome and prints it. For the last week some of the PDFs have contained our "checking your browser" page instead. Customers have noticed, and two accountants have complained.',
				more: 'The renderer runs in our own cluster but goes out through the public address of the shop, because that is where the receipt pages are.',
				headers: (r) => ({ 'user-agent': headless(r), accept: BROWSER_ACCEPT, 'accept-language': 'en-GB', 'accept-encoding': 'gzip, deflate', connection: 'close' })
			},
			{
				team: 'Marketing', who: 'Clara Moss', site: 'www', paths: ['/campaigns/autumn-sale', '/campaigns/winter-lighting'], client: 'the social preview generator', when: ['2026-09-21', '2026-10-20'], end: 1,
				title: 'Social preview images show the challenge page',
				context: 'The networks cache a preview for days once they have fetched it, so a bad one cannot easily be replaced.',
				body: 'We generate the preview image for each campaign page by taking a screenshot of it. Three of this week\'s previews are a picture of the verification page, and one went out on social media before anyone noticed.',
				more: 'The generator is a small service the agency built for us. It runs headless Chrome and, according to its settings file, closes the connection after every page.',
				headers: (r) => ({ 'user-agent': headless(r), accept: BROWSER_ACCEPT, 'accept-language': 'en-GB,en;q=0.9', 'accept-encoding': 'gzip, deflate, br', connection: 'close' })
			},
			{
				team: 'Data', who: 'Ines Duarte', site: 'shop', paths: ['/', '/c/garden', '/c/lighting', '/basket'], client: 'the visual comparison job', when: ['2026-10-14', '2026-11-10'], end: 2,
				title: 'Visual comparison job gets the challenge page on half its screenshots',
				context: 'The job has caught three real layout breaks this year before customers saw them, so we would like it back.',
				body: 'Our nightly job takes screenshots of forty shop pages and compares them with the night before, to catch layout breaks. Half the screenshots are now of the verification page, so the comparison is useless.',
				more: 'It is the same headless Chrome setup as the receipt renderer, borrowed from Orders last year.',
				headers: (r) => ({ 'user-agent': headless(r), accept: BROWSER_ACCEPT, 'accept-language': 'en-GB', 'accept-encoding': 'gzip, deflate', connection: 'close' })
			}
		]
	},
	// Partners' Python integrations.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'A Python script using the requests library says python-requests in its user agent, and it sends Accept: */* by default. That is ua_python_requests plus accept_any. Can you check with them?',
			'Could you get the exact user agent {CLIENT} sends?'
		],
		note: 'Nothing else matches; these are the library defaults.',
		analyst: 'ua_python_requests is the single strongest feature for scraping on the shop. Partners that call the API with the library defaults are collateral; the feature was never meant for the API host.',
		guess: ['Could the partner be sending too many requests, and this is the rate limit?', 'A rate limit answers 429 with a short message. These are 403s with the challenge page, which only the bot check serves.'],
		edge: 'We could skip scoring for listed partner addresses on the api host. It works, but the list only ever grows.',
		weigh: [['gate', 'For partners the answer is nearly always the same: send a user agent of your own. Where a partner cannot change anything, the proxy can skip their addresses.'], ['reporter', 'Some of our partners are very small, and their integrations were written by a contractor years ago. "Change your code" is not always an option.']],
		extra: [['reporter', 'Is there a list somewhere of what a partner should avoid sending? I would rather tell new partners up front.'], ['gate', 'Not a public one, and we would rather not publish the features. "Set your own user agent" covers nearly every case.']],
		guess2: ['Is it the partner\'s address? Some of these run in cloud regions we do not usually see.', 'Addresses never reach the scorer. Only the headers do.'],
		endings: [
			['sender', [
				['gate', 'Simplest is for Kellbrook to set their own user agent; then only accept_any matches.'],
				['reporter', 'Kellbrook deployed the change this morning: "KellbrookStockSync/3.2". The sync has run four times without an error.']
			]],
			['proxy', [
				['gate', 'Settlement jobs run at night, unattended, and Tallis Pay have told us they cannot change the library before the new year. Edge\'s skip list is the quickest way.'],
				['edge', "Tallis Pay's two addresses skip scoring on api since Wednesday's window."],
				['reporter', "Last night's reconciliation completed. Finance has its report."]
			]],
			['waiting', [
				['gate', 'We asked the affiliate network to send their own user agent; that is the only change needed.'],
				['reporter', 'They say it is on their list. No date.'],
				['reporter', 'Still nothing from the affiliate network. Their fetcher has not changed and our products are still missing from the two partner sites.']
			]]
		],
		cases: [
			{
				team: 'Partner API', who: 'Sander Visser', site: 'api', paths: ['/v2/stock', '/v2/stock/changes?since=2026-07-01T00:00:00Z'], client: "Kellbrook's stock sync", when: ['2026-07-06', '2026-08-14'], end: 0,
				title: "Kellbrook's stock sync gets the challenge page instead of JSON",
				context: 'While the sync fails, Kellbrook carry on showing the stock figures they had before, so they are selling items we no longer have.',
				body: 'Kellbrook, a marketplace that lists about 4,000 of our products, syncs stock from the partner API every ten minutes. Their sync has been failing since the weekend; the responses are HTML. Their engineer says the job is a Python script and has not changed in a year.',
				more: 'Their engineer says the script sets no headers at all, it uses whatever the library sends.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.28.2', '2.31.0'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Partner API', who: 'Priya Raman', site: 'api', paths: ['/v2/payments/settlements?date=2026-08-30', '/v2/payments/settlements?date=2026-08-31&page=2'], client: "Tallis Pay's reconciliation job", when: ['2026-08-17', '2026-09-30'], end: 1,
				title: 'Settlement reconciliation from Tallis Pay fails overnight',
				context: 'Finance reconcile card settlements against orders every morning; without the report they do it by hand, which takes most of a day.',
				body: "Tallis Pay pulls the previous day's settlements from the partner API at 02:00. For the last three nights the job has failed after a few pages with a 403 and an HTML body. Finance noticed because the morning report had no figures in it.",
				more: 'Tallis Pay say the job is a Python service on their side that they inherited and cannot easily change.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.25.1', '2.26.0'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Marketing', who: 'Josh Whitfield', site: 'www', paths: ['/feeds/products.xml', '/feeds/products-uk.xml'], client: "the affiliate network's feed fetcher", when: ['2026-10-01', '2026-11-05'], end: 2,
				title: 'Affiliate network cannot fetch our product feed',
				context: 'Affiliate sales were about 4% of online revenue last month, and the two partner sites in question are the network\'s largest.',
				body: 'Our affiliate network fetches the product feed twice a day. For about a week their fetch has failed, and our products have disappeared from two of their partner sites. They say their fetcher is a small Python service.',
				more: 'The feed is about 30 MB and the network fetches it at 06:00 and 18:00.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.31.0', '2.32.3'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			}
		]
	},
	// A reading service and similar relays.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'A service that fetches pages on its own servers is a client like any other to us. Can you get me one of its requests?',
			'Can they tell us the user agent their service sends?'
		],
		note: 'The user agent matches no feature.',
		analyst: 'Three features at once is unusual for anything with a person behind it. This is a legitimate client that looks like a scraper from ten years ago.',
		guess: ['Does their user agent look like a crawler? It says "compatible".', 'The user agent matches no feature. It is the language, the Accept header and Connection: close.'],
		edge: 'Services like this usually publish the addresses their servers use, so a skip-list entry would be easy.',
		weigh: [['gate', 'Services like this are built cheaply and send whatever their library sends. Either they change what they send, or the proxy skips them, or weak features have to count for less.'], ['analyst', 'All three of these features are weak. If the export gave features weights, they would add up to far less than two.']],
		extra: [['reporter', 'For context, our accessibility statement promises that the site works with assistive services, so this is more than an inconvenience.']],
		guess2: ['Is it because the service fetches pages so quickly one after another?', 'Speed plays no part in the score. Each request is scored on its headers alone.'],
		endings: [
			['proxy', [
				['gate', 'We should not make a charity reading service change its software for us.'],
				['edge', "ClearPage's published addresses are on the skip list since this morning."],
				['reporter', 'The charity confirms articles read out properly again.']
			]],
			['sender', [
				['gate', "We would rather fix this at the source than keep a list of addresses: ClearPage sends Accept-Language: * and Connection: close on every request. We asked the charity whether it could send the listener's language instead."],
				['reporter', "The charity's developer changed both last week. The customer has written again to say product pages read out properly."]
			]],
			['waiting', [
				['analyst', 'With the weights in the export since 4 November, these three come to 1.0, under the bot line. The scorer does not use the weights yet.', '2026-11-04'],
				['reporter', 'Dotline say they cannot change their requests before the spring.'],
				['gate', 'Then this waits on us: the scorer has to start using the weights. Not started yet.']
			]]
		],
		cases: [
			{
				team: 'Help Centre', who: 'Noor Haddad', site: 'help', paths: ['/articles/returns-and-refunds', '/articles/accessibility', '/articles/track-your-order'], client: 'ClearPage', when: ['2026-07-27', '2026-09-04'], end: 0,
				title: 'Reading service for people with sight loss cannot open help articles',
				context: 'The charity says around 1,200 of its users have read our help pages through ClearPage in the past year.',
				body: 'ClearPage, a charity\'s service that reads web pages aloud for people with sight loss, fetches each page on its own servers and reads it out. Users tell the charity our help articles read out as "checking your browser". The charity contacted our accessibility lead, who passed it to me.',
				more: 'The charity publishes the four addresses its servers use on its website, if that helps.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (compatible; ClearPage Reader/3.${int(r, 2, 5)}; +https://clearpage.org.uk/reader)`, accept: 'text/html,*/*;q=0.5', 'accept-language': '*', connection: 'close' })
			},
			{
				team: 'Support desk', who: 'Jo Baptiste', site: 'shop', paths: ['/p/30518', '/p/41207', '/c/kitchen'], client: 'the reading service', when: ['2026-09-07', '2026-10-15'], end: 1,
				title: 'Customer using a screen reading service cannot read product pages',
				single: true,
				context: 'She says she has started asking a neighbour to order for her, which she should not have to do.',
				body: 'A customer who is blind wrote to say that our product pages read out as a verification message through the reading service she uses. She has shopped with us for years. Her email:',
				quote: 'Since the summer every product page on your website reads out to me as "checking your browser, this will only take a moment". It does not take a moment. I use ClearPage for all my shopping and yours is the only site that does this.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (compatible; ClearPage Reader/3.${int(r, 6, 7)}; +https://clearpage.org.uk/reader)`, accept: 'text/html,*/*;q=0.5', 'accept-language': '*', connection: 'close' })
			},
			{
				team: 'Help Centre', who: 'Elin Svensson', site: 'help', paths: ['/articles/accessibility', '/articles/contact-us'], client: "Dotline's braille relay", when: ['2026-10-26', '2026-11-12'], end: 2,
				title: 'Braille display relay gets the verification page on every article',
				context: 'Dotline has a few hundred users, many of them long-standing customers who order by phone when the site fails them.',
				body: 'Dotline runs a relay that turns web pages into text for refreshable braille displays. Their users report that our help centre shows them only the verification message. Dotline fetches the pages on its servers, much like ClearPage did.',
				more: 'Dotline\'s engineer says their relay is old and they are rewriting it, so they would rather not touch the current one.',
				headers: (r) => ({ 'user-agent': `DotlineRelay/1.${int(r, 2, 4)} (+https://dotline.org/relay)`, accept: 'text/html, */*', 'accept-language': '*', connection: 'close' })
			}
		]
	},
	// curl against the partner API.
	{
		kind: 'flagged',
		log: 'scored',
		explain: { accept_any: 'accept_any, because curl sends Accept: */*' },
		probe: [
			"These are curl commands, so I expect ua_curl and accept_any, which is exactly the bot line. Can you paste the proxy's view of one?",
			'Can you get a request id for one of these calls?'
		],
		note: 'The partner key in the request makes no difference to the scorer; it only sees headers it has features for.',
		analyst: 'On the api host, ua_curl catches mostly partners testing, because scrapers do not bother with the API. We have talked about scoring the API host differently, but nothing is planned.',
		guess: ['Is it because the key is sent as a header the scorer does not know?', 'Unknown headers are ignored. Only headers that a feature looks at can add to the score.'],
		edge: 'Requests to api go through the same scoring as the shop. Nobody decided that on purpose, as far as I know; it is how the proxy was set up.',
		weigh: [['gate', 'The API is a different case from the shop: everyone who calls it is a program, so a feature that says "this is a program" tells us nothing there. We should probably not score the api host the way we score the shop, but that is not a decision for this report.'], ['edge', 'Agreed. Today the proxy scores every host the same way; changing that is a design question.']],
		extra: [['reporter', 'Partners judge the API by their first five minutes with it. This is the worst possible first impression.']],
		guess2: ['Is the API host stricter than the shop?', 'No, it is scored exactly the same way. The difference is that nearly everything that calls it is a program.'],
		endings: [
			['sender', [
				['gate', 'The quickest fix is in the docs: give every example its own user agent, for example `-A "partner-docs-example"`. Then only accept_any matches.'],
				['reporter', 'Docs updated this morning, every example now sets a user agent. Tried all twelve; JSON every time.']
			]],
			['declined', [
				['gate', 'We will not exempt curl on the api host; ua_curl is doing its job there too. The developer can set his own user agent, as the docs now show.'],
				['reporter', 'I have sent him the docs page. Closing this from the desk.']
			]],
			['waiting', [
				['edge', 'We have proposed skipping scoring for requests to api that carry a partner key. It is on the agenda of the architecture review next week.'],
				['gate', 'We support it. Until the review decides, Quarry\'s suite will keep failing unless they set a user agent, which they say they cannot do quickly.'],
				['reporter', 'Waiting on the architecture review, then.']
			]]
		],
		cases: [
			{
				team: 'Partner API', who: 'Priya Raman', site: 'api', paths: ['/v2/products?page=1', '/v2/products/30518', '/v2/stock?sku=30518'], client: 'the curl examples in the partner docs', when: ['2026-07-13', '2026-08-21'], end: 0,
				title: 'Every curl example in the partner docs returns HTML',
				context: 'Two new partners gave up during onboarding this month, though I cannot prove this was the reason.',
				body: 'New partners try the examples in our API docs first. All of them are curl commands, and for the last week every one returns the verification page instead of JSON. Two partners have asked whether the API is down.',
				more: 'The examples are copied straight from the docs, with a test key. Nothing else is added.',
				headers: (r) => ({ 'user-agent': `curl/${pick(r, ['8.1.2', '8.4.0', '7.88.1'])}`, accept: '*/*', 'x-partner-key': `pk_test_${hex(r, 12)}` })
			},
			{
				team: 'Support desk', who: 'Ravi Menon', site: 'api', paths: ['/v2/products?page=1', '/v2/categories'], client: "the developer's terminal", when: ['2026-09-01', '2026-10-20'], end: 1,
				title: 'Partner developer says the API blocks him when testing',
				single: true,
				context: 'He is due to go live in a fortnight and is worried his integration will not work in production either.',
				body: 'A developer at a small retailer, onboarding to the partner API, writes that every call he makes from his terminal comes back as a web page asking him to verify he is human. He thinks his account is blocked. His message:',
				quote: 'Every request I send to your API returns an HTML page about checking my browser. I am not using a browser. Is my key blocked? I followed your getting-started guide exactly.',
				headers: (r) => ({ 'user-agent': 'curl/7.81.0', accept: '*/*', 'x-partner-key': `pk_live_${hex(r, 12)}` })
			},
			{
				team: 'Partner API', who: 'Sander Visser', site: 'api', paths: ['/v2/orders', '/v2/orders/91822', '/v2/stock?sku=41207'], client: "Quarry & Co's integration tests", when: ['2026-10-19', '2026-11-12'], end: 2,
				title: "Quarry & Co's integration tests fail against our API",
				context: 'Quarry & Co are one of our larger marketplaces and say they will pause their integration work until this is sorted.',
				body: 'Quarry & Co run their integration tests against our API on every build. The tests are shell scripts around curl, and since they added more of them, most calls get the verification page. They are asking us to whitelist their build servers, which have no fixed addresses.',
				more: 'Their builds run on a hosted CI service, so the addresses change every run.',
				headers: (r) => ({ 'user-agent': `curl/${pick(r, ['8.5.0', '8.9.1'])}`, accept: '*/*', 'x-partner-key': `pk_live_${hex(r, 12)}` })
			}
		]
	},
	// Download managers asking for identity encoding.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'Downloads on Android are handed to the system download manager, which sends its own headers. Can you get me the headers of one failing download?',
			'Can you get the time of one failed download, to the minute?'
		],
		note: 'The user agent is an ordinary Android browser and matches nothing.',
		analyst: 'accept_enc_identity was meant for scrapers that cannot handle compressed responses. Download managers ask for identity on purpose, so that they can resume a download, and that is what we are seeing.',
		guess: ['Is it the Range header? Resumable downloads send one.', 'No feature looks at Range. It is Accept-Encoding: identity, plus the Accept header.'],
		edge: 'The proxy serves the challenge for any path, PDFs included; it cannot tell a download from a page.',
		weigh: [['analyst', 'accept_enc_identity was always a weak feature. We kept it because it cost nothing. If it costs customers their downloads, it should go.'], ['gate', 'Agreed. Let us check what else it catches first.']],
		extra: [['gate', 'One thing worth knowing: the proxy challenges PDFs like any other path, so a download manager saves the challenge page as if it were the file. That is why people see a broken file rather than a page.']],
		guess2: ['Could it be that the PDFs are large and the download times out?', 'A timeout would leave part of a PDF, not a small HTML file containing our page.'],
		endings: [
			['export', [
				['analyst', 'accept_enc_identity is out of the export from 2 September, 12:00. It catches very little else.', '2026-09-02'],
				['gate', 'Live with the deploy on 3 September.'],
				['reporter', 'Invoices download properly on the two tablets we tested.', '2026-09-03']
			]],
			['export', [
				['gate', 'Same cause as the invoice downloads: accept_enc_identity, with accept_any.'],
				['analyst', 'We are taking it out of the export; the change is in the export of 2 September and goes live the next day.', '2026-09-02'],
				['reporter', 'Customers confirm the guides download since the 3rd.', '2026-09-04']
			]],
			['export', [
				['analyst', 'Done: accept_enc_identity left the export on 2 September.', '2026-09-02'],
				['gate', 'And it reached the scorer with the deploy on 3 September.'],
				['reporter', 'The warehouse says the handhelds print pick lists again. Thanks.', '2026-09-03']
			]]
		],
		cases: [
			{
				team: 'Orders', who: 'Lena Vogt', site: 'shop', paths: ['/orders/61377/invoice.pdf', '/orders/61402/invoice.pdf'], client: 'Android download managers', when: ['2026-07-09', '2026-08-21'], end: 0,
				title: 'Invoice downloads on Android tablets save the challenge page',
				context: 'Business customers need the invoices for their VAT returns, and the quarter ends soon. Many use cheap Android tablets in their vans.',
				body: 'Business customers download VAT invoices from their order history. On some Android tablets the downloaded file is a small HTML file, not the PDF. When opened it shows our verification page.',
				more: 'Our own test tablet reproduces it every time. In Chrome on the same tablet, the invoice opens fine when it is viewed rather than downloaded.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (Linux; Android ${pick(r, ['9', '10', '11'])}; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${int(r, 110, 126)}.0.0.0 Safari/537.36`, accept: '*/*', 'accept-encoding': 'identity', range: 'bytes=0-' })
			},
			{
				team: 'Help Centre', who: 'Noor Haddad', site: 'help', paths: ['/downloads/assembly-guide-ks200.pdf', '/downloads/assembly-guide-wardrobe-3d.pdf'], client: "the tablets' download manager", when: ['2026-07-21', '2026-08-21'], end: 1,
				title: 'Assembly guide PDFs fail to download on some tablets',
				context: 'The guides are the only copy of the assembly instructions for some furniture since we stopped printing them in the box.',
				body: 'Our assembly guides are PDFs linked from the help centre. Customers on Android tablets say the download "finishes" instantly and the file will not open. It is mostly the wardrobe guides, which are the large ones.',
				more: 'The wardrobe guide is 48 MB, so it is always handed to the download manager. The smaller guides open in the browser.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (Linux; Android ${pick(r, ['10', '12'])}; Lenovo TB-X606F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${int(r, 112, 126)}.0.0.0 Safari/537.36`, accept: '*/*', 'accept-encoding': 'identity', range: 'bytes=0-' })
			},
			{
				team: 'Orders', who: 'Matteo Ricci', site: 'shop', paths: ['/warehouse/picklists/2026-08-12-A.pdf', '/warehouse/picklists/2026-08-12-B.pdf'], client: 'the warehouse handhelds', when: ['2026-08-03', '2026-08-21'], end: 2,
				title: 'Warehouse handhelds download the challenge page instead of pick lists',
				context: 'Without the pick lists the night shift works from paper copies printed in the office, which slows them down by about a third.',
				body: 'The handheld scanners in the Daventry warehouse download each shift\'s pick lists from the shop host. Since the start of the week the night shift has been getting a small file that the scanners cannot print.',
				more: 'The handhelds run an old Android build that the vendor no longer updates. Their downloads go through the system download manager.',
				headers: (r) => ({ 'user-agent': 'Mozilla/5.0 (Linux; Android 8.1.0; TC52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36', accept: '*/*', 'accept-encoding': 'identity', 'x-device': `TC52-${int(r, 100, 999)}` })
			}
		]
	},
	// Showroom kiosks.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'Kiosk software is often an old embedded browser with odd defaults. Can you get me one request from a kiosk?',
			'Do you know what browser the kiosks run? A request id would tell me the rest.'
		],
		note: 'The old Chrome version in the user agent matches nothing.',
		analyst: 'To be fair to the features, an embedded browser with no language set and a forced Connection: close is the profile of a cheap scraping farm.',
		guess: ['Is it the old Chrome version? It is years out of date.', 'No feature looks at the browser version. It is the language, the Accept header and Connection: close.'],
		edge: 'Showrooms have fixed addresses, so the skip list is straightforward for them.',
		weigh: [['gate', 'For kiosks the proxy\'s skip list works when the address is fixed; otherwise the kiosk software has to send more ordinary headers.'], ['reporter', 'We control the software on our own kiosks, but every supplier sets things up differently.']],
		extra: [['reporter', 'Customers order a lot from the kiosks: about a tenth of showroom sales go through them.']],
		guess2: ['Is it the network at the venue blocking something?', 'The proxy log shows the requests arriving and being challenged, so the network gets them to us fine.'],
		endings: [
			['proxy', [
				['edge', 'All showroom addresses are on the skip list since this morning.'],
				['reporter', 'Leeds and Bristol kiosks working; the signs have come down.']
			]],
			['sender', [
				['gate', 'The trade fair has no fixed address, so the skip list will not help. The kiosk software can set a language and stop forcing Connection: close; then only accept_any matches.'],
				['reporter', 'Changed the kiosk profile on all eight tablets. The shop loads on every one.']
			]],
			['waiting', [
				['edge', 'We can add Glasgow to the showroom skip list once we know its addresses. The supplier has not told us yet.'],
				['reporter', 'Chased the supplier twice.'],
				['reporter', 'Still no addresses from the supplier, so the Glasgow kiosks still show the verification page.']
			]]
		],
		cases: [
			{
				team: 'Retail ops', who: 'Bryn Pugh', site: 'shop', paths: ['/c/garden', '/p/48213', '/c/sofas'], client: 'the showroom kiosks', when: ['2026-08-03', '2026-09-18'], end: 0,
				title: 'Showroom kiosks show the verification page',
				context: 'The kiosks are locked down so that staff cannot change their settings; the supplier manages them remotely.',
				body: 'Each showroom has two kiosks where customers browse the shop and order for delivery. Since the weekend the kiosks in Leeds and Bristol show "checking your browser" and never get past it. Staff have put paper signs on them.',
				more: 'The other showrooms\' kiosks are the same model and are fine, as far as I know. Leeds and Bristol had their network kit replaced last month.',
				headers: () => ({ 'user-agent': 'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.187 Safari/537.36 KioskShell/2.1', accept: BROWSER_ACCEPT, 'accept-language': '*', connection: 'close' })
			},
			{
				team: 'Retail ops', who: 'Kit Ashworth', site: 'shop', paths: ['/', '/c/kitchen', '/p/52011'], client: 'the trade fair tablets', when: ['2026-10-05', '2026-11-02'], end: 1,
				title: 'Tablets on the trade fair stand cannot open the shop',
				context: 'The show runs for four days, and we expect several thousand visitors to the stand.',
				body: 'We are at the Harrogate home show next month with eight tablets running the same kiosk software as the showrooms. In testing today every one of them gets the verification page.',
				more: 'The tablets will be on the show\'s public wifi, so they will not have a fixed address.',
				headers: () => ({ 'user-agent': 'Mozilla/5.0 (Linux; Android 11; KioskShell/2.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Safari/537.36', accept: BROWSER_ACCEPT, 'accept-language': '*', connection: 'close' })
			},
			{
				team: 'Retail ops', who: 'Bryn Pugh', site: 'shop', paths: ['/c/beds', '/p/60117'], client: 'the new kiosks in Glasgow', when: ['2026-11-02', '2026-11-11'], end: 2,
				title: 'New Glasgow showroom kiosks challenged',
				context: 'Glasgow is our first showroom in Scotland, and the kiosks are part of the launch publicity.',
				body: 'The Glasgow showroom opened this week with kiosks from a new supplier. They are not on the list Edge keeps for the other showrooms, and they get the verification page.',
				more: 'The supplier\'s kiosks run their own browser. I have asked them what it sends.',
				headers: () => ({ 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.61 Safari/537.36 Lumen/4.0', accept: BROWSER_ACCEPT, 'accept-language': '*', connection: 'close' })
			}
		]
	},
	// Headless Chrome that ua_headless never matches.
	{
		kind: 'missed',
		lowerDemo: true,
		log: 'scored',
		table: true,
		probe: ['That should be ua_headless. Can you paste the user agent from one of these requests?', 'Headless Chrome ought to be caught. Can you get me a request id?'],
		note: 'ua_headless does not match: the feature looks for "headlesschrome" and the user agent says "HeadlessChrome". The scorer compares header values exactly, case included, so the feature has never matched a real headless Chrome.',
		analyst: 'That explains a number in our reviews: ua_headless has had almost no matches since it went in, which we put down to scrapers hiding their user agents. They were not hiding anything.',
		guess: ['Could they be passing the challenge? Headless browsers can run scripts.', 'They are never challenged in the first place. The proxy log shows a score of 1 on every one.'],
		edge: 'The proxy forwards the user agent exactly as received; we do not change the case of header values.',
		weigh: [['gate', 'Changing the comparison is easy to write and hard to judge: every feature would start matching more, not only ua_headless. Before we change it we want the analysts to tell us what else would change.'], ['analyst', 'We can replay a day of traffic with both kinds of matching and compare.']],
		extra: [['gate', 'For the record, every feature is affected the same way: values are compared exactly, case included, and most real clients write their names with capitals.']],
		guess2: ['Is the proxy perhaps not sending us the user agent?', 'It is in the forwarded headers, exactly as the client sent it.'],
		endings: [
			['waiting', [
				['gate', 'The fix is in the scorer: compare values without regard to case. It is a small change, but it changes what every feature matches, so we want the analysts to look at the effect first.'],
				['analyst', 'We will replay a day of traffic with matching that ignores case and report back.'],
				['gate', 'Still waiting on the analysts\' replay; nothing changes in the scorer until then.']
			]],
			['proxy', [
				['edge', 'We have put a rate limit on /search for the time being: 120 requests a minute per client address.'],
				['reporter', 'Last night search stayed under 1,000 requests an hour. Good enough for me, so I am closing this one; the case problem in the scorer is tracked elsewhere.']
			]],
			['handed', [
				['gate', 'Before we go further: the sessions all come from three addresses in our own cloud account.'],
				['SRE', 'Those are ours. The performance tests run Lighthouse in headless Chrome against the shop every few minutes, since 14 October.'],
				['reporter', 'Mystery solved, and not a bot problem at all. We are filtering those addresses out of analytics on our side.']
			]]
		],
		cases: [
			{
				team: 'Storefront', who: 'Lucía Ferro', site: 'shop', paths: ['/c/power-tools?page=3', '/p/30518', '/c/power-tools?page=4', '/p/30533'], client: 'the scraper', when: ['2026-07-15', '2026-08-31'], end: 0,
				title: 'Competitor scraping prices with headless Chrome, not challenged',
				hour: 5.2,
				context: 'The comparison site undercuts us within the hour every time we change a price, which the pricing team says costs us real sales.',
				body: 'The pricing team found our whole power tools category reproduced on a comparison site within an hour of a price change. The proxy log shows a burst of requests from headless Chrome at the time, and none of them was challenged. I thought headless Chrome was exactly what the bot check catches.',
				more: 'The burst comes every day between 06:00 and 07:00, about 2,400 pages, always the same categories.',
				headers: (r) => ({ 'user-agent': headless(r), accept: BROWSER_ACCEPT, 'accept-language': 'en-US,en;q=0.9', 'accept-encoding': 'gzip, deflate, br' })
			},
			{
				team: 'Search', who: 'Pavel Dvorak', site: 'shop', paths: ['/search?q=drill', '/search?q=ladder', '/search?q=paint+roller', '/search?q=hinges'], client: 'the headless browsers', when: ['2026-09-02', '2026-10-15'], end: 1,
				title: 'Search results hammered by headless browsers overnight',
				hour: 1.5,
				context: 'The search servers are sized for daytime traffic; the overnight burst used about three times their usual capacity.',
				body: 'Between 01:00 and 04:00 search requests went from the usual few hundred an hour to over 30,000, all from headless Chrome according to the user agent. Search latency for real customers doubled. None of the requests was scored as a bot.',
				more: 'The queries walk our autocomplete list in alphabetical order, which no customer does.',
				headers: (r) => ({ 'user-agent': headless(r), accept: BROWSER_ACCEPT, 'accept-language': 'en-GB', 'accept-encoding': 'gzip, deflate, br' })
			},
			{
				team: 'Data', who: 'Ines Duarte', site: 'shop', paths: ['/', '/c/garden', '/c/lighting'], client: 'the headless sessions', when: ['2026-10-19', '2026-11-10'], end: 2,
				title: 'Thousands of headless Chrome sessions in analytics are not challenged',
				context: 'The sessions come in steady waves every few minutes, day and night, which is not how people shop.',
				body: 'Our analytics show about 9,000 sessions a day from headless Chrome since the middle of October, with no time on page. They are not challenged. If they are bots, they are skewing our conversion numbers.',
				more: 'Every session loads the home page and two categories, and nothing else.',
				headers: (r) => ({ 'user-agent': headless(r), accept: BROWSER_ACCEPT, 'accept-language': 'en-GB', 'accept-encoding': 'gzip, deflate, br', connection: 'keep-alive' })
			}
		]
	},
	// Go's default client, which ua_go_http never matches.
	{
		kind: 'missed',
		lowerDemo: true,
		log: 'scored',
		probe: [
			"The export has had ua_go_http since July, so Go's default client should score at least 1. Can you paste one request?",
			'Can you get me the exact user agent? There is a feature for Go clients.'
		],
		note: 'ua_go_http does not match: it looks for "go-http-client" and the user agent says "Go-http-client", with a capital G. The scorer compares values exactly, so the feature has never matched Go\'s default client. There is no Accept header at all, so accept_any does not match either.',
		analyst: "Go's default client is almost never a person. ua_go_http has been in the export since July, and our reviews show it has matched nothing, which we took to mean the scrapers had moved on.",
		guess: ['Could the requests be coming in over HTTP/2, so the headers look different to the scorer?', 'The proxy forwards the same header names and values either way. The user agent arrives intact; the feature just does not match it.'],
		edge: 'We pass the user agent through untouched.',
		weigh: [['gate', 'The export has the right feature; it is the scorer\'s exact comparison that stops it working.'], ['reporter', 'Is there anything we can do in the meantime?'], ['edge', 'The proxy can block or slow a path for a while. It is a blunt tool, but a quick one.']],
		extra: [['reporter', 'How many other features have never matched anything because of this?'], ['analyst', 'We are going through them: every feature whose text is all lower case while real clients write it with capitals.']],
		guess2: ['Is the user agent perhaps cut short by the proxy, so the feature cannot see all of it?', 'No, it arrives whole. The feature fails on the capital G, nothing else.'],
		endings: [
			['waiting', [
				['gate', 'It needs the scorer to compare values without regard to case, the same change the headless Chrome reports are waiting for. We want the analysts\' replay of a day\'s traffic before we change matching for every feature.'],
				['reporter', 'So we wait. Leaving this open.'],
				['gate', 'No change yet: still waiting on the replay before the case change goes in.']
			]],
			['proxy', [
				['edge', 'As a stopgap we block Go-http-client outright on /account/register at the proxy. No customer registers with Go.'],
				['reporter', 'No more fake registrations overnight. Closing; the proxy rule does the job.']
			]],
			['waiting', [
				['analyst', 'The replay with matching that ignores case was put off for the weights work and is running now. Early numbers: ua_go_http would match about 40,000 requests a day, nearly all of them scripted.'],
				['gate', 'We will change the matching once the replay is finished and the analysts are happy. Until then, this is waiting on them.']
			]]
		],
		cases: [
			{
				team: 'Search', who: 'Pavel Dvorak', site: 'api', paths: ['/v2/products/search?q=a&page=118', '/v2/products/search?q=a&page=119', '/v2/products/search?q=b&page=2'], client: 'the Go scraper', when: ['2026-07-27', '2026-08-20'], end: 0,
				title: 'Product search API scraped by a Go client',
				context: 'Reads on the search API need no partner key, so anyone can do this. It takes about a fifth of the API\'s capacity.',
				body: 'Someone is walking the whole catalogue through the public product search endpoint, 50 results a page, around the clock. The user agent is Go\'s default HTTP client. Not one request is challenged, which surprised me, because the analysts said recently that they had added a feature for Go.',
				more: 'It is about 30,000 requests a day, and it has been going on since at least the middle of July.',
				headers: (r) => ({ 'user-agent': `Go-http-client/${pick(r, ['1.1', '2.0'])}`, 'accept-encoding': 'gzip' })
			},
			{
				team: 'Accounts', who: 'Femi Adeyemi', site: 'www', paths: ['/account/register'], client: 'the sign-up script', when: ['2026-08-10', '2026-09-30'], end: 1,
				title: 'Fake accounts registered by a script, none challenged',
				context: 'Registration sends a welcome email, so the fake registrations also meant 2,000 bounces and a warning from our mail provider.',
				body: 'About 2,000 accounts were registered overnight with random names and addresses at a throwaway mail domain. According to the proxy log the registrations came from Go\'s default HTTP client, and none of them was challenged.',
				more: 'Every registration has the same password pattern and a postcode that does not exist.',
				headers: () => ({ 'user-agent': 'Go-http-client/1.1', 'content-type': 'application/x-www-form-urlencoded', 'accept-encoding': 'gzip' })
			},
			{
				team: 'Partner API', who: 'Sander Visser', site: 'partners', paths: ['/login'], client: 'the login script', when: ['2026-10-05', '2026-11-08'], end: 2,
				title: 'Password guessing on the partner portal from a Go client',
				context: 'The attempts come from about 900 addresses, a few attempts each, so the portal\'s own lockout never triggers.',
				body: "The partner portal's login saw 14,000 failed attempts yesterday across 300 partner accounts. Every attempt has the user agent Go-http-client/2.0. None was challenged, although I can see ua_go_http in the feature list the analysts circulate.",
				more: 'No account was broken into, as far as we can tell. Partners with two-step sign-in are fine; the rest worry me.',
				headers: () => ({ 'user-agent': 'Go-http-client/2.0', 'content-type': 'application/json', 'accept-encoding': 'gzip' })
			}
		]
	},
	// Requests that copy a real browser exactly.
	{
		kind: 'missed',
		log: 'scored',
		table: true,
		probe: ['Can you paste the headers of one of these? If they look like a real browser, there may be nothing for the features to find.', 'Could you get a few request ids from the worst hour?'],
		note: 'The headers cannot be told from a real Chrome: only accept_any matches, as it does for nearly every browser.',
		explain: { accept_any: 'accept_any on the ordinary browser Accept header' },
		analyst: 'From headers alone we cannot tell these from customers; they copy a real browser exactly. What gives them away is behaviour over time, which the scorer does not see: it scores one request\'s headers at a time.',
		guess: ['Should we lower the bot line to 1?', 'Then nearly every browser on the site would be treated as a bot: accept_any matches the Accept header of every page load.'],
		edge: 'The proxy has per-path rate limits for exactly this kind of thing. They are blunt, but they work.',
		weigh: [['gate', 'When requests copy a browser this well, the scorer is the wrong tool. The useful signals are rate and behaviour over time, which belong to the proxy or to the service under attack.'], ['analyst', 'We are looking at client-hint headers, which automation tools often get slightly wrong. It is research for now.']],
		extra: [['reporter', 'Is there really nothing in the headers? They come from data-centre addresses, if that helps.'], ['gate', 'The scorer sees headers only, never addresses. That is on purpose; addresses are the proxy\'s business.']],
		guess2: ['Could we look at the order of the headers? Scripts often send them in an odd order.', 'The scorer receives the headers as names and values, without their order.'],
		endings: [
			['declined', [
				['gate', "There is nothing for the scorer to do here: the requests carry no sign it can see. Accounts' own login throttle is the right place."],
				['reporter', 'Agreed. We have tightened the throttle on our side. Closing this here.']
			]],
			['proxy', [
				['edge', 'Rate limit on /checkout/payment, ten attempts per address per ten minutes, live since this morning.'],
				['reporter', 'No card-testing runs since. The payments provider is happy.']
			]],
			['waiting', [
				['analyst', 'We are building features on the client-hint headers, which these sign-ups get subtly wrong. Not before December.'],
				['reporter', 'And until then?'],
				['gate', 'Until then nothing changes in the scorer. This waits on the analysts\' new features.']
			]]
		],
		cases: [
			{
				team: 'Accounts', who: 'Hana Novak', site: 'www', paths: ['/account/login'], client: 'the login attempts', when: ['2026-07-20', '2026-09-10'], end: 0,
				title: 'Credential stuffing on customer login not caught',
				context: 'The attempts come from thousands of addresses, a handful each, with a different Chrome version on nearly every request.',
				body: 'Failed customer logins jumped from about 3,000 a day to 180,000 yesterday. It looks like a list of stolen passwords being tried. The requests look like ordinary Chrome on Windows, and none was scored as a bot.',
				more: 'About 400 logins succeeded out of the 180,000, which is roughly what you would expect from a list of reused passwords. We have reset those accounts.',
				headers: (r) => browser(r, { 'user-agent': chrome(r), 'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"', 'sec-ch-ua-platform': '"Windows"', connection: 'keep-alive' })
			},
			{
				team: 'Checkout', who: 'Saskia Brandt', site: 'shop', paths: ['/checkout/payment'], client: 'the card testing', when: ['2026-09-14', '2026-10-30'], end: 1,
				title: 'Card testing at checkout passes the bot check',
				context: 'The provider says that if declines stay this high they will review our account.',
				body: 'Our payments provider warned us about a run of small payments with stolen cards: 1,400 attempts in two hours, most of them declined. The requests came through the proxy as ordinary browsers and scored 1.',
				more: 'Each attempt is a single item under £2, with a different card each time. The provider charges us for every decline.',
				headers: (r) => browser(r, { 'user-agent': chrome(r), 'sec-ch-ua-platform': '"Windows"', connection: 'keep-alive' })
			},
			{
				team: 'Marketing', who: 'Clara Moss', site: 'www', paths: ['/newsletter/subscribe'], client: 'the sign-ups', when: ['2026-10-12', '2026-11-12'], end: 2,
				title: 'Newsletter sign-ups from a bot are flooding the list',
				context: 'The sign-ups arrive at a steady rate of about one a second, around the clock.',
				body: 'We have 26,000 new newsletter subscribers since Friday, nearly all of them at addresses that bounce. The sign-up form is behind the proxy and none of these was challenged.',
				more: 'The bounces are hurting our sender reputation; the mail provider has warned us twice.',
				headers: (r) => browser(r, { 'user-agent': chrome(r), 'sec-ch-ua': '"Chromium";v="118", "Not=A?Brand";v="99"', 'sec-ch-ua-platform': '"Linux"' })
			}
		]
	},
	// The proxy upgrade that forwarded header names as written, until Edge put lower-casing back.
	{
		kind: 'missed',
		log: 'scored',
		table: true,
		stats: false,
		probe: ['A score of 0 for curl is not possible if the scorer sees its user agent. Can you paste a few log lines? I will look at exactly what the proxy forwards, header names included.'],
		note: 'And that is the bug: since the upgrade the proxy forwards header names as the client wrote them, "User-Agent" rather than "user-agent", and the scorer looks names up exactly. It never sees a user agent at all.',
		analyst: "Our dashboards show the same: from 13 October every feature's match count falls to zero at once. Features do not fail together like that unless their input changed.",
		guess: ['Did the analysts change something in the export that week?', 'Nothing changed in the export after 7 October. And a change to the features would not take every one of them to zero at once.'],
		edge: 'The upgrade changed how header names are passed on; the old version lower-cased them. We can switch that back, but the scorer ought to cope with either.',
		weigh: [['gate', 'The scorer should not care how header names are spelled; HTTP says they are not case-sensitive. We will fix that on our side whatever Edge decides.']],
		extra: [['gate', 'How did this get through the upgrade testing?'], ['edge', 'Our tests check that headers arrive, not how their names are spelled. We are adding a test for that.']],
		guess2: ['Is the scorer even receiving requests? Maybe the proxy stopped calling it.', 'It is: the scorer\'s own request count is the same as last week. It answers every one with 0.'],
		endings: [
			['proxy', [
				['edge', 'We have put the old behaviour back on every node: header names are lower-cased again before they go to the scorer. Scores are back to normal since 09:20.', '2026-10-15'],
				['gate', 'Thanks. We will make the scorer match names without regard to case anyway, so that the upgrade can go ahead again later.'],
				['reporter', 'The scrapers are challenged again. Thanks.']
			]],
			['proxy', [
				['gate', 'Found it, see above. Can Edge put the lower-casing back until the scorer copes with either?'],
				['edge', 'Done on all eight nodes this morning. Bot share back to 6.1% on the shop within the hour.', '2026-10-15'],
				['gate', 'For the record, the scorer side followed in 1.4.0 on 28 October, which matches header names without regard to case.', '2026-10-28']
			]]
		],
		cases: [
			{
				team: 'Storefront', who: 'Tom Hadley', site: 'shop', paths: ['/api/stock?sku=30518', '/api/stock?sku=30533', '/api/stock?sku=41207'], client: 'the stock scrapers', when: ['2026-10-14', '2026-10-14'], end: 0,
				title: 'Stock scrapers back since yesterday, nothing challenged',
				context: 'Storefront has not deployed since last week, so nothing changed on our side.',
				body: 'The python-requests scrapers that the bot check used to stop have been back on the stock pages since yesterday morning, and none of them is challenged. I checked the proxy log and they score 0. Even curl scores 0.',
				more: 'I tried it myself with curl from my laptop: score 0, straight through.',
				headers: (r) => titleCase({ 'user-agent': `python-requests/${pick(r, ['2.31.0', '2.32.3'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Edge', who: 'Hal Petrov', site: 'shop', paths: ['/', '/c/garden', '/api/stock?sku=30518'], client: 'every request', when: ['2026-10-14', '2026-10-14'], end: 1,
				title: 'Bot share dropped to zero after the proxy upgrade',
				context: 'The upgrade went to all eight nodes between 06:00 and 07:40 yesterday, as planned. Nothing else changed in the proxy.',
				body: 'Since the proxy upgrade yesterday morning the share of requests scored as bots has been 0.0% on every host. Before it was around 6%. I suspect something in how the new proxy forwards headers, but our debug output looks the same to me.',
				more: 'Every host, every hour, exactly zero. Not a single score above 0 since 07:40 yesterday, which is when the last node was upgraded.',
				headers: () => titleCase({ 'user-agent': 'curl/8.4.0', accept: '*/*' })
			},
			{
				team: 'Search', who: 'Anouk Peeters', site: 'shop', paths: ['/search?q=wall+tiles', '/search?q=grout', '/search?q=tile+cutter'], client: 'the search scrapers', when: ['2026-10-14', '2026-10-14'], end: 0,
				title: 'Search scrapers stopped being challenged overnight',
				context: 'They ran for about five hours instead of being turned away within minutes.',
				body: 'The scrapers on search that are challenged every night went straight through last night. They look identical to before: same user agents, same queries.',
				more: 'The ones I checked are the usual python-requests and curl clients.',
				headers: (r) => titleCase({ 'user-agent': `python-requests/${pick(r, ['2.28.1', '2.31.0'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate' })
			}
		]
	},
	// Python libraries no feature covers.
	{
		kind: 'missed',
		log: 'scored',
		probe: ['Which library does it say it is? If the user agent names one we have no feature for, that would explain it. Can you paste one request?', 'Could you paste a few lines of the proxy log for these?'],
		note: 'Only accept_any matches. The user agent is not one any feature covers.',
		analyst: 'We could add a feature for this library tomorrow and they could switch library the day after. We have stopped adding features for single libraries; the next model looks at combinations of headers instead.',
		guess: ['Can we not add every Python library to the export?', 'There are dozens, and each one is a feature that someone has to remove when it catches a partner.'],
		weigh: [['gate', 'Without a feature for this library there is nothing for the scorer to match. The choice is between a feature per library, which the analysts do not want, and waiting for features that look at combinations.'], ['reporter', 'Or a rate limit at the proxy, presumably.'], ['edge', 'Possibly, depending on the path.']],
		guess2: ['Could the scraper be passing the challenge somehow?', 'It is never challenged: the log shows a score of 1 on every request.'],
		endings: [
			['declined', [
				['analyst', "Decision from Monday's review: no feature for httpx. We are not chasing libraries one at a time."],
				['reporter', 'Disappointing, but I understand. The pricing team will live with it.']
			]],
			['waiting', [
				['analyst', 'The combination features are in testing. The earliest they can be in the export is the first week of December.'],
				['reporter', 'OK. Leaving this open until then.']
			]],
			['proxy', [
				['edge', 'Rate limit on the unauthenticated /v2/products endpoints, 60 requests a minute per address, since this morning.'],
				['reporter', 'The aiohttp client gave up within the hour. Closing.']
			]]
		],
		cases: [
			{
				team: 'Storefront', who: 'Lucía Ferro', site: 'shop', paths: ['/api/stock?sku=30518', '/api/stock?sku=48213', '/api/stock?sku=52011'], client: 'the stock scraper', when: ['2026-08-24', '2026-10-09'], end: 0,
				title: 'Stock scraper switched user agent and gets through',
				context: 'It polls about 3,000 stock pages every 15 minutes, which is more traffic than those pages get from customers.',
				body: 'The scraper that polls our stock levels used to be challenged. For about a week it has been back at the same rate, and it is not challenged. The paths and timing are identical, so I think it is the same people.',
				more: 'Same paths, same order, every 15 minutes, as before.',
				extra: [['reporter', 'They are clearly the same operation as before, going by the paths and the timing.'], ['gate', 'Very likely. The scorer has no memory of who sent what, though; it sees one request at a time.']],
				headers: () => ({ 'user-agent': 'python-httpx/0.27.0', accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Search', who: 'Pavel Dvorak', site: 'shop', paths: ['/search?q=kettle', '/search?q=kettle+descaler', '/search?q=key+cabinet'], client: 'the search scraper', when: ['2026-10-20', '2026-11-12'], end: 1,
				title: 'New Python scraper on search not scored as a bot',
				context: 'The autocomplete list has about 40,000 terms, so it fetches the lot once a day.',
				body: 'A client calling itself python-httpx is pulling search results for every term in our autocomplete list, around 40,000 requests a day. It scores 1 and is never challenged.',
				more: 'It started the day after we published the new autocomplete list.',
				headers: () => ({ 'user-agent': 'python-httpx/0.27.2', accept: '*/*', 'accept-encoding': 'gzip, deflate, br', connection: 'keep-alive' })
			},
			{
				team: 'Partner API', who: 'Priya Raman', site: 'api', paths: ['/v2/products?page=12', '/v2/products?page=13'], client: 'the aiohttp client', when: ['2026-07-13', '2026-09-01'], end: 2,
				title: 'Unknown client walking the product catalogue on the API',
				context: 'The product endpoints are cached, so the cost is small, but it shows that anyone can copy the catalogue.',
				body: 'Something without a partner key is paging through /v2/products day and night. Its user agent is Python\'s aiohttp. It is not challenged, and the product endpoints are public, so it gets everything.',
				more: 'It requests a page every half second, which is more than any partner does.',
				headers: () => ({ 'user-agent': 'Python/3.11 aiohttp/3.9.1', accept: '*/*', 'accept-encoding': 'gzip, deflate' })
			}
		]
	},
	// The proxy's timeout on the call to the scorer.
	{
		kind: 'other',
		log: 'timeout',
		table: true,
		probe: ['If it only happens at peak, I would look at the proxy\'s call to us before the features. Can you paste a few log lines from the evening?', 'Can you get me log lines from inside the window and from outside it?'],
		note: 'The scorer says bot, as it should. So the features are fine; the question is why the proxy did not act on it.',
		analyst: 'Nothing on our side: the features matched as usual. Our numbers only show the requests the scorer answered.',
		guess: ['Could the scrapers be passing the challenge in the evening?', 'They are not challenged at all in that window; the log says the score never arrived.'],
		edge: 'The proxy gives the scorer 50 milliseconds. If no answer comes, the request goes through unscored, because holding up customers whenever the scorer is slow would be worse.',
		weigh: [['gate', 'Two things can change: how long the proxy waits for the scorer, and how quickly the scorer answers at peak. The first is a setting; the second means giving the scorer hosts of its own.'], ['SRE', 'Dedicated hosts are possible, but there is a queue for them.']],
		extra: [['gate', 'Our own numbers: the scorer answered every one of these, but some answers took longer than the proxy waits.']],
		guess2: ['Could the scorer be turning requests away when it is busy?', 'It never turns anything away; it answers late. The proxy gives up waiting before the answer arrives.'],
		endings: [
			['proxy', [
				['gate', 'The scorer answers in under 5 ms at the median, but at peak its slowest answers take 70 ms, because its hosts are shared with the search indexer.'],
				['edge', "We have raised the proxy's timeout for the scorer to 150 ms in this morning's window."],
				['reporter', 'Last night the scrapers were challenged right through the peak.']
			]],
			['waiting', [
				['gate', "Same cause as the evening scrapers Storefront reported in the summer: the scorer's hosts are shared, and at peak its slowest answers miss even the longer deadline. The real fix is dedicated hosts."],
				['SRE', 'The move to dedicated hosts is planned for the second half of November. Until then the timeouts at peak will continue.']
			]]
		],
		cases: [
			{
				team: 'Storefront', who: 'Tom Hadley', site: 'shop', paths: ['/api/stock?sku=30518', '/c/power-tools', '/api/stock?sku=41207'], client: 'the scrapers', when: ['2026-08-03', '2026-09-10'], end: 0,
				title: 'Scrapers get through at the evening peak',
				context: 'The evening is when the pricing team sets the next day\'s prices, which is exactly what the scrapers are after.',
				body: 'Between about 19:00 and 21:00 every evening, python-requests scrapers that are challenged the rest of the day get straight through. It has happened every evening this week.',
				more: 'Same scrapers, same headers, morning and evening. Only the time changes.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.31.0', '2.32.3'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'SRE', who: 'Marek Zielinski', site: 'shop', paths: ['/', '/c/sofas', '/api/stock?sku=52011'], client: 'the calls to the scorer', when: ['2026-10-05', '2026-11-04'], end: 1,
				title: 'Proxy logs a scorer timeout on 2% of requests at peak',
				context: 'Most of the unscored requests are ordinary customers, but about 6% of them would have scored 2 or more.',
				body: "The proxy's own metrics show the call to the scorer timing out on about 2% of requests between 18:00 and 22:00. When the call times out the proxy lets the request through unscored, by design.",
				more: 'The share has crept up since the timeout was raised, from almost nothing to 2%.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.31.0', '2.32.3'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate' })
			},
			{
				team: 'Storefront', who: 'Lucía Ferro', site: 'shop', paths: ['/c/lighting', '/api/stock?sku=60117'], client: 'the scrapers', when: ['2026-11-09', '2026-11-13'], end: 1,
				title: 'Evening scraping back on the lighting pages',
				context: 'The promotion pages are also being indexed by search at the same hours, on the same shared hosts.',
				body: 'The evening scraping Tom reported in the summer is back: between 18:30 and 21:30 the lighting pages are scraped without a single challenge.',
				more: 'It started on the first evening of the lighting promotion, which is our busiest week of the year for those pages.',
				headers: (r) => ({ 'user-agent': `curl/${pick(r, ['8.4.0', '8.5.0'])}`, accept: '*/*' })
			}
		]
	},
	// The proxy's rate limit.
	{
		kind: 'other',
		log: 'ratelimit',
		probe: ['What exactly does the page say? Our challenge says "checking your browser"; a different message would point somewhere else.', 'Can you paste a few log lines? I want to see the status code.'],
		note: 'And the log shows 429, which the bot check never sends.',
		analyst: 'Not ours: the features see a normal browser.',
		guess: ['Could the challenge page be cached and served as a 429?', 'No, the challenge is always a 403 with our page. A 429 with "slow down" is the proxy\'s rate limit.'],
		edge: 'Yes, that is the per-address rate limit, 300 requests a minute. Everyone behind one address shares it.',
		weigh: [['edge', 'The limit is per address, so offices, call centres and mobile networks that put many people behind one address hit it first. We can raise it for a path or exempt an address, but not everywhere.'], ['gate', 'Nothing for Gatehouse to change in any case: the scorer never takes these requests for bots.']],
		extra: [['reporter', 'Could the rate-limit page at least not look like a bot check? People cannot tell the two apart.'], ['edge', 'Fair point. We have asked for the rate-limit page to say plainly what it is.']],
		guess2: ['Could it be our own servers struggling and the proxy protecting them?', 'The origin was fine throughout. The 429s are the per-address limit, nothing else.'],
		endings: [
			['proxy', [
				['edge', 'We have raised the limit on /checkout and /basket to 1,000 a minute on sale days.'],
				['reporter', 'No complaints during this Saturday\'s sale. Thanks.']
			]],
			['proxy', [
				['edge', "The Cork office's address is left out of the rate limit since this morning."],
				['reporter', 'The agents confirm no more error pages.']
			]],
			['declined', [
				['edge', 'We do not want to raise the limit on the trade portal; it protects the order system. The portal has a bulk upload for large orders.'],
				['reporter', 'I have passed that on. He is not delighted.'],
				['gate', 'Nothing for Gatehouse here either; closing.']
			]]
		],
		cases: [
			{
				team: 'Checkout', who: 'Wendell Achebe', site: 'shop', paths: ['/checkout/payment', '/basket', '/checkout/delivery'], client: 'the customers', when: ['2026-07-08', '2026-08-28'], end: 0,
				title: 'Customers blocked at checkout on sale day',
				hour: 9.5,
				context: 'Sale days bring about five times the usual traffic, and many customers come through mobile networks that share addresses.',
				body: 'During Saturday\'s sale, customers reported "too many requests, slow down" at the payment step. Checkout conversion fell by a third for two hours. People assume it is the bot check.',
				more: 'The worst of it was between 10:00 and 12:00, when the sale email went out.',
				headers: (r) => browser(r, { connection: 'keep-alive' })
			},
			{
				team: 'Support desk', who: 'Ama Owusu', site: 'help', paths: ['/articles/returns-and-refunds', '/contact', '/articles/missing-parts', '/articles/delivery-times'], client: 'our outsourced support agents', when: ['2026-09-01', '2026-10-20'], end: 1,
				title: 'Our own support agents get blocked on the help centre',
				context: 'All forty agents work behind one address, so the whole floor shares whatever allowance there is.',
				body: 'The agents at our outsourced support centre in Cork keep getting an error page on the help centre while they are on calls with customers. They open dozens of articles an hour. They think the bot check has decided they are robots.',
				quote: 'From the Cork team lead: "It says too many requests, please slow down. We have forty agents on the floor and it happens to all of them at once, usually mid-morning."',
				headers: (r) => browser(r)
			},
			{
				team: 'Trade accounts', who: 'Sam Okoro', site: 'trade', paths: ['/orders/new', '/orders/new/lines', '/catalogue/search?q=m8+bolt'], client: "Pellow Builders' buyer", when: ['2026-10-12', '2026-11-10'], end: 2,
				title: 'Trade customer blocked while entering a large order',
				context: 'Pellow Builders spend about £25,000 a month with us and usually enter their large orders on Monday mornings.',
				body: 'A buyer at Pellow Builders was entering a 300-line order on the trade portal and got blocked halfway, twice. He believes he was taken for a bot because he works fast.',
				more: 'Each line he adds is a search and a save, so two requests a line, and he types quickly.',
				headers: (r) => browser(r, { connection: 'keep-alive' })
			}
		]
	},
	// The payments provider's fraud screening.
	{
		kind: 'other',
		once: true,
		log: 'scored',
		probe: ['"Could not be verified" is not our wording. Can you get the time of an attempt so I can find it in the proxy log?', 'What does the message say, word for word?'],
		note: 'And the proxy log shows the payment requests answered by checkout, not challenged. Whatever stopped the payment came after us.',
		analyst: 'Nothing in our numbers for checkout that week.',
		guess: ['Is it the proxy change on Monday?', 'The Monday change was a skip-list entry for one partner; it cannot touch payments.'],
		edge: 'The proxy saw nothing unusual: no challenges and no 429s on /checkout.',
		weigh: [['gate', 'The proxy log is the quickest way to tell: a challenged request is a 403 with our page. A payment that fails after checkout has answered is between checkout and the provider.']],
		guess2: ['Could a browser extension be interfering with the payment page?', 'Possibly for one customer, but the proxy shows the payment page served normally every time.'],
		endings: [
			['handed', [
				['gate', "This is the payments provider's fraud screening declining the card. Handing to Checkout, who own that relationship."],
				['Checkout', "We have it. The provider's screening flagged the card's billing address; the customer has paid with another card."]
			]],
			['handed', [
				['gate', 'Not the bot check: every one of these was answered by checkout, and the declines come from the provider.'],
				['reporter', 'You are right: the provider changed its fraud rules on Monday. We have raised it with them and taken it off this queue.']
			]],
			['handed', [
				['gate', 'The proxy shows the payment page served normally, then a call to the card issuer\'s security step that failed. That is between Checkout and the provider.'],
				['Checkout', 'Taking it. The issuer\'s security step does not open in some banking apps; we are working on it with the provider.']
			]]
		],
		cases: [
			{
				team: 'Support desk', who: 'Jo Baptiste', site: 'shop', paths: ['/checkout/payment', '/checkout/payment/confirm'], client: 'the customer', when: ['2026-07-14', '2026-09-15'], end: 0,
				title: 'Customer says the bot check stops her paying',
				single: true,
				context: 'She is ordering a £1,400 sofa and says she will go elsewhere if this is not sorted today.',
				body: 'A customer has tried four times to pay for a sofa and each time is told the payment "could not be verified". She is convinced our site thinks she is a robot.',
				quote: 'I am not a robot. I have tried four times with the same card and your site keeps saying it could not be verified. My bank says there is nothing wrong with the card.',
				extra: [['reporter', 'Is there any way for the desk to tell these apart from the bot check without asking you?'], ['gate', 'The bot check only ever shows "checking your browser". Any other wording comes from somewhere else.']],
				headers: (r) => browser(r, { 'user-agent': iphone(r) })
			},
			{
				team: 'Checkout', who: 'Saskia Brandt', site: 'shop', paths: ['/checkout/payment', '/checkout/payment/confirm'], client: 'the declined payments', when: ['2026-10-05', '2026-11-10'], end: 1,
				title: 'Spike in failed payments since Monday, bot check suspected',
				context: 'The rise is the same on the website and in the apps, and for new and returning customers alike.',
				body: 'Failed payments rose from 3% to 9% on Monday morning and have stayed there. The rise started the same morning as a proxy change, so we suspect the bot check.',
				more: 'The failures are spread across every card type and every device.',
				headers: (r) => browser(r, { connection: 'keep-alive' })
			},
			{
				team: 'Support desk', who: 'Ama Owusu', site: 'shop', paths: ['/checkout/payment', '/checkout/3ds/return'], client: 'the customers', when: ['2026-08-17', '2026-10-20'], end: 2,
				title: 'Customers told a "security check" failed at payment',
				context: 'Most of them bank with the same two banks, and all of them were paying on a phone.',
				body: 'Several customers this week say a "security check" failed when they tried to pay, and they read that as our bot check. Most were on phones.',
				quote: 'It said the security check failed and to try again. I tried again three times. Is your website blocking me?',
				headers: (r) => browser(r, { 'user-agent': iphone(r) })
			}
		]
	},
	// A cached challenge page.
	{
		kind: 'other',
		once: true,
		log: 'cached',
		table: true,
		probe: ['Everybody at once is not something the scorer does: it scores each request on its own headers. Is it possible the page was served from a cache?', 'Can you get me log lines from the window when everyone saw it?'],
		note: 'A normal browser scores 1 here, so the scorer would not have challenged these visitors.',
		analyst: 'No change in the export on that day.',
		guess: ['Did the export change at that time?', 'The export changes the features; it cannot challenge everyone at once. And no export changed that day.'],
		edge: 'Found it: the cache rule for these pages also cached the challenge response. The first visitor to be challenged got the page cached for everyone, for the cache lifetime.',
		weigh: [['edge', 'Challenge responses say they must not be stored, but the cache rule for these pages overrides what responses say, and to the cache the challenge is a response like any other.'], ['gate', 'So nothing in the scorer could prevent this. It is purely the cache rule.']],
		extra: [['gate', 'The scorer was not involved: these visitors were never scored as bots. The page came out of a cache.']],
		guess2: ['Could it have been a burst of real bots that tipped everyone over?', 'The scorer scores each request on its own, so other people\'s bots cannot change anyone else\'s score.'],
		endings: [
			['proxy', [
				['edge', 'The cache rule now leaves challenge responses out. The change went out this morning.'],
				['reporter', 'The next campaign email went out without trouble.']
			]],
			['proxy', [
				['edge', 'The fix from the summer was lost in last week\'s config rollback. Reapplied this morning, with a test so that it cannot be lost again.'],
				['reporter', 'Thanks. Not seen since.']
			]],
			['proxy', [
				['edge', 'A new cache rule was added for the Black Friday article without the exclusion for challenge responses. Corrected this morning.'],
				['reporter', 'Confirmed; the article is fine for everyone.']
			]]
		],
		cases: [
			{
				team: 'Marketing', who: 'Clara Moss', site: 'www', paths: ['/campaigns/summer-garden'], client: 'everyone', when: ['2026-07-02', '2026-08-12'], end: 0,
				title: 'Everyone sees the verification page on the summer campaign page',
				context: 'The email had a single link, to that page, so the people who saw the verification page were exactly the people we wanted.',
				body: 'For about twenty minutes after the campaign email went out, every visitor to the summer garden campaign page got "checking your browser". Then it cleared by itself. 40,000 people opened that email.',
				more: 'People in the office saw it too, on their own laptops, which I thought could not happen.',
				headers: (r) => browser(r)
			},
			{
				team: 'Storefront', who: 'Tom Hadley', site: 'shop', paths: ['/c/lighting'], client: 'shoppers', when: ['2026-09-07', '2026-10-25'], end: 1,
				title: 'Lighting category showed the challenge page to everybody for ten minutes',
				hour: 10.2,
				context: 'The lighting category is the second most visited page on the shop in the autumn.',
				body: 'Between 11:10 and 11:20 this morning the lighting category page showed the verification page to every visitor, on every device, including people in the office.',
				more: 'It cleared at 11:20 exactly, without anyone doing anything.',
				headers: (r) => browser(r)
			},
			{
				team: 'Help Centre', who: 'Elin Svensson', site: 'help', paths: ['/articles/black-friday-delivery'], client: 'readers of the article', when: ['2026-11-02', '2026-11-12'], end: 2,
				title: 'Black Friday delivery article shows the challenge page to everyone',
				context: 'The article was linked from the home page banner, so most visitors that morning tried to open it.',
				body: 'Our new Black Friday delivery article showed the verification page to everyone for a quarter of an hour this morning, just after we linked it from the home page.',
				more: 'Every reader I asked saw it, on any device.',
				headers: (r) => browser(r)
			}
		]
	},
	// A partner's client that fails before any request is made.
	{
		kind: 'other',
		log: 'none',
		probe: ['If it fails at the handshake, it never reaches the proxy\'s scoring at all. Do we see any of their requests in the proxy log?', 'Can they send the full error, not only the first line?'],
		analyst: 'We have nothing from them in our numbers since it started, which fits a connection that never gets as far as a request.',
		edge: 'Nothing from their addresses in the proxy log since the day it started: the connections fail before any request is made, so there is nothing to score.',
		art: (r, c) =>
			[
				'```text',
				`${pick(r, ['ERROR', 'WARN'])} [sync-worker-${int(r, 1, 6)}] ${pick(r, ['GET', 'POST'])} ${c.paths[0]} failed`,
				`javax.net.ssl.SSLHandshakeException: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target`,
				`\tat java.base/sun.security.ssl.Alert.createSSLException(Alert.java:131)`,
				`\tat java.base/sun.security.ssl.TransportContext.fatal(TransportContext.java:${int(r, 360, 380)})`,
				`\tat java.base/sun.security.ssl.CertificateMessage$T13CertificateConsumer.checkServerCerts(CertificateMessage.java:${int(r, 1300, 1360)})`,
				`\tat com.${c.client.split(/['\s]/)[0]!.toLowerCase()}.integration.ApiClient.send(ApiClient.java:${int(r, 80, 240)})`,
				`retrying in ${int(r, 30, 300)}s (attempt ${int(r, 2, 40)})`,
				'```'
			].join('\n'),
		weigh: [['edge', 'The certificate renewal on api changed the intermediate certificate, as the provider announced. Clients that bundle an old chain fail.'], ['reporter', 'We did send the notice to partners a month ahead, for what it is worth.']],
		extra: [['reporter', 'For next time: is there a quick way to tell a handshake failure from a bot block?'], ['gate', 'A bot block is always an HTTP answer with our page. If there is no HTTP answer at all, it is not us.']],
		guess2: ['Could our certificate itself be wrong?', 'Browsers and every other partner connect fine with it; only clients with an old certificate chain fail.'],
		endings: [
			['sender', [
				['gate', 'Their client does not trust the new intermediate certificate. Nothing to do with scoring.'],
				['reporter', 'Ostler updated their trust store this morning; orders are flowing again.']
			]],
			['waiting', [
				['gate', "Same as Ostler Home's integration a while back: their client does not have the new intermediate certificate."],
				['reporter', 'Marlow say their platform team will update the trust store in their next maintenance window. Waiting on them.']
			]],
			['sender', [
				['gate', 'Their Java runtime is old enough that it does not know our new certificate chain. It never gets as far as the bot check.'],
				['reporter', 'Greystone upgraded the runtime on their integration servers. The feed has run cleanly since yesterday.']
			]]
		],
		cases: [
			{
				team: 'Partner API', who: 'Sander Visser', site: 'api', paths: ['/v2/orders'], client: "Ostler Home's integration", when: ['2026-07-20', '2026-09-25'], end: 0,
				title: "Ostler Home's integration says it is blocked by our bot protection",
				context: 'Ostler send us about 300 orders a day through the integration, so a day without it means a lot of orders keyed in by hand.',
				body: "Ostler Home's order integration has failed since Sunday. Their engineer says our \"bot protection\" is blocking them, because the error mentions a handshake and a security check.",
				headers: () => ({})
			},
			{
				team: 'Partner API', who: 'Priya Raman', site: 'api', paths: ['/v2/stock'], client: "Marlow Direct's stock import", when: ['2026-10-01', '2026-11-12'], end: 1,
				title: 'Marlow Direct blocked since the certificate change',
				context: 'Marlow import stock four times a day; without it they are selling from figures that are days old.',
				body: 'Marlow Direct\'s stock import stopped on the day our API certificate was renewed. Their message says they "assume the new bot rules are blocking" them.',
				headers: () => ({})
			},
			{
				team: 'Partner API', who: 'Sander Visser', site: 'api', paths: ['/v2/products'], client: "Greystone's product feed", when: ['2026-08-24', '2026-09-28'], end: 2,
				title: 'Greystone says our bot check blocks their product feed',
				context: 'Greystone use the feed to keep the prices on their site in line with ours.',
				body: 'Greystone pull our product data every hour. Their job has failed for two days and their support desk told them it is "the customer\'s bot protection".',
				headers: () => ({})
			}
		]
	},
	// Accounts' login throttle.
	{
		kind: 'other',
		once: true,
		log: 'scored',
		probe: ['"Unusual activity" and an hour\'s lockout are not ours: the bot check only ever shows the challenge page. Can you get the time of one attempt?', 'What did the message say, exactly?'],
		note: 'Not a bot, for the scorer. The proxy passed these login requests through.',
		analyst: 'The scorer\'s answers for the login pages look normal all week: almost nothing scores 2.',
		edge: 'The proxy passed every one of these login requests through to the accounts service; the lockout comes from there.',
		weigh: [['Accounts', 'For background: our throttle counts failed logins per account, not per device, and locks the account for an hour after five. It has nothing to do with the bot check.']],
		extra: [['gate', 'For whoever reads this later: the bot check never locks anyone out. It only shows the challenge page, and nothing it does outlasts the request.']],
		guess2: ['Could the app or the browser be sending something odd that the bot check dislikes?', 'The scorer gave these requests a 1, an ordinary browser or app. It played no part.'],
		endings: [
			['handed', [
				['gate', "This is Accounts' login throttle, not us. Handing over."],
				['Accounts', 'Confirmed: five failures lock an account for an hour. Working as intended; we have sent the customer a reset link.']
			]],
			['handed', [
				['gate', 'Passed to Accounts: the lockout is theirs.'],
				['Accounts', 'Found it: 6.14 retries a failed login three times by itself, so one wrong password counts as four. Mobile are fixing the retry in 6.15. Nothing for Gatehouse.']
			]]
		],
		cases: [
			{
				team: 'Support desk', who: 'Ravi Menon', site: 'www', paths: ['/account/login'], client: 'the customer', when: ['2026-08-03', '2026-10-01'], end: 0,
				title: 'Customer locked out after the bot check, she says',
				single: true,
				context: 'She has been a customer for nine years and has asked for her complaint to go to a manager.',
				body: 'A customer says she was "treated as a bot" and locked out of her account for an hour after mistyping her password a few times. She is upset and asked to escalate.',
				quote: 'Your website decided I was a robot and locked me out for an hour. I mistyped my password, that is all. This is no way to treat a customer.',
				headers: (r) => browser(r)
			},
			{
				team: 'Mobile', who: 'Yuki Arai', site: 'www', paths: ['/account/login', '/api/app/session'], client: "the app's login", when: ['2026-10-10', '2026-11-10'], end: 1,
				title: 'iOS app users locked out at login, bot check suspected',
				context: '6.14 went to all iOS users at once, so the affected group is large.',
				body: 'Since the 6.14 release some iOS users are locked out after one login attempt, with a message about "unusual activity". We thought the bot check might be treating the app as a bot.',
				more: 'It only affects users who get their password wrong at least once.',
				headers: (r) => ({ 'user-agent': `Homeward/6.14 (iPhone; iOS 17.${int(r, 4, 6)}; Scale/3.00)`, accept: 'application/json', 'accept-language': 'en-GB;q=1.0', 'accept-encoding': 'gzip, deflate, br' })
			},
			{
				team: 'Support desk', who: 'Jo Baptiste', site: 'www', paths: ['/account/login'], client: 'the customer', when: ['2026-10-05', '2026-11-12'], end: 0,
				title: 'Customer says our robot check locked him out before an order deadline',
				single: true,
				context: 'He had booked a delivery slot for a fridge, and the slot was released while he was locked out.',
				body: 'A customer missed the order deadline for a delivery slot because, he says, our robot check locked him out. He wants compensation.',
				quote: 'I was trying to log in to change my delivery and your security locked me out for an hour as if I was a hacker. By the time it let me in the slot had gone.',
				headers: (r) => browser(r)
			}
		]
	},
	// Our site search provider's crawler, and other crawlers we want.
	{
		kind: 'other',
		log: 'scored',
		probe: ['Can you paste the user agent? Some crawlers are ones we want.', 'Do you have the user agent and an address or two?'],
		note: 'Nothing matches, and that is right: SiteSearchBot is the crawler of our own site search provider.',
		analyst: 'We deliberately have no feature for crawlers that say who they are.',
		edge: 'The addresses belong to the company the user agent names, which is a good sign.',
		weigh: [['analyst', 'A crawler that says who it is and fetches politely is not what the features are for. The ones we care about pretend to be browsers.']],
		extra: [['reporter', 'Is there a list of the crawlers we allow on purpose?'], ['edge', 'There is one in the proxy config. We can share it.']],
		guess2: ['Should crawlers be challenged by default?', 'Not the ones we want. The challenge would stop our own search provider from indexing the shop.'],
		endings: [
			['declined', [
				['Search', 'That is our site search provider\'s crawler, re-indexing after the catalogue import. It is meant to get through.'],
				['reporter', 'Good to know. Nothing to do, then; closing.']
			]],
			['handed', [
				['Search', 'That is our search provider\'s nightly crawl. I have asked them to spread it over the night instead of one hour.'],
				['Search', 'The provider has spread the crawl from 01:00 to 05:00 since Tuesday.']
			]],
			['declined', [
				['Marketing', 'RankLens is the SEO agency we hired in September. They crawl the site once a month for their audit, with our blessing.'],
				['reporter', 'Then nothing to do. Closing.']
			]]
		],
		cases: [
			{
				team: 'Data', who: 'Ines Duarte', site: 'shop', paths: ['/p/30518', '/p/30533', '/p/41207', '/p/48213'], client: 'the crawler', when: ['2026-07-27', '2026-09-30'], end: 0,
				title: 'Unchallenged crawler fetching every product page',
				context: 'It took almost a day to fetch the 80,000 pages each time.',
				body: 'A crawler calling itself SiteSearchBot has fetched every product page on the shop twice this week, about 80,000 pages each time. It is not challenged. Is it copying our catalogue?',
				more: 'It is polite, I will give it that: it fetches a page a second and never more.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (compatible; SiteSearchBot/2.${int(r, 1, 4)}; +https://sitesearch.io/bot)`, accept: 'text/html', 'accept-encoding': 'gzip', connection: 'keep-alive' })
			},
			{
				team: 'Storefront', who: 'Lucía Ferro', site: 'shop', paths: ['/p/52011', '/p/60117', '/p/30518'], client: 'the crawler', when: ['2026-10-05', '2026-11-12'], end: 1,
				title: 'Bot fetching product pages at 3 a.m. gets through',
				hour: 2.5,
				context: 'Night-time customers are few, but they are mostly abroad, and the slow pages show in our international figures.',
				body: 'Something fetches product pages very fast between 03:00 and 04:00 every night and is never challenged. It slows the shop down for the few night-time customers we have.',
				more: 'Page times at 03:30 are three times what they are at midnight.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (compatible; SiteSearchBot/2.${int(r, 5, 6)}; +https://sitesearch.io/bot)`, accept: 'text/html', 'accept-encoding': 'gzip', connection: 'keep-alive' })
			},
			{
				team: 'Data', who: 'Callum Reid', site: 'www', paths: ['/campaigns/autumn-sale', '/about', '/campaigns/winter-lighting'], client: 'the crawler', when: ['2026-10-12', '2026-11-12'], end: 2,
				title: 'Crawler called RankLens not challenged',
				context: 'The marketing site is small, so 12,000 pages means it fetched most pages several times.',
				body: 'RankLens fetched about 12,000 pages of the marketing site over the weekend. It is not challenged. I cannot find it on any list of crawlers we allow.',
				note: 'Nothing matches: RankLens sends an honest crawler user agent, without any of the habits the features look for.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (compatible; RankLens/4.${int(r, 0, 2)}; +https://ranklens.co/crawler)`, accept: 'text/html,application/xhtml+xml', 'accept-encoding': 'gzip, br' })
			}
		]
	},
	// The proxy's country rule.
	{
		kind: 'other',
		log: 'country',
		probe: ['Our challenge says "checking your browser"; "access denied" is a different page. Can you get a request id?', 'Which page exactly? A screenshot of the wording would do.'],
		note: 'The 403 in the log is the proxy\'s country rule, not the challenge.',
		analyst: 'Nothing in our numbers: these requests were never scored as bots.',
		edge: 'That is the proxy\'s country rule.',
		weigh: [['edge', 'The country list is kept by Legal and applied by us. We change it only on their instruction.']],
		extra: [['reporter', 'Could the access denied page say why? It reads as if we are blocking the person.'], ['edge', 'We will look at the wording.']],
		guess2: ['Could the customer\'s browser be the problem?', 'The same page appears in every browser on that connection; it depends only on where the request comes from.'],
		endings: [
			['proxy', [
				['edge', 'Norway was added to the blocked list by mistake last month, when the list was rebuilt. Removed this morning.'],
				['reporter', 'Customers confirm they can order again.']
			]],
			['declined', [
				['edge', 'Iceland is blocked on purpose: we do not ship there, and Legal asked for the shop to be closed to countries we cannot sell to. We are not changing it.'],
				['reporter', 'Understood; we will answer the posts with that.']
			]],
			['sender', [
				['gate', 'His VPN gives him an address in a country the proxy blocks. Nothing we would change.'],
				['reporter', 'He switched his VPN to a UK location and has placed his order.']
			]]
		],
		cases: [
			{
				team: 'Support desk', who: 'Ama Owusu', site: 'shop', paths: ['/', '/c/outdoor'], client: 'customers in Norway', when: ['2026-08-10', '2026-09-30'], end: 0,
				title: 'Customers in Norway cannot reach the shop',
				context: 'Norway is a small market for us, but a loyal one: these customers mostly order garden furniture in the spring.',
				body: 'Three customers in Norway this week say the shop shows an "access denied" page. They have ordered from us before. They think our bot check has blocked them.',
				quote: 'I have ordered garden furniture from you every spring for four years. Now I only see "access denied". Have you stopped selling to Norway?',
				headers: (r) => browser(r, { 'accept-language': 'nb-NO,nb;q=0.9,en;q=0.8' })
			},
			{
				team: 'Storefront', who: 'Tom Hadley', site: 'shop', paths: ['/', '/c/garden'], client: 'visitors from Iceland', when: ['2026-10-12', '2026-11-12'], end: 1,
				title: 'Visitors from Iceland see access denied',
				context: 'The journalist writes for a travel site and asked us for a comment by the end of the day.',
				body: 'We are seeing complaints from Iceland on social media: "access denied" on the shop. One of them is a journalist.',
				more: 'I tried with a browser on a test machine in our Reykjavik-region cloud and got the same page.',
				headers: (r) => browser(r, { 'accept-language': 'is-IS,is;q=0.9,en;q=0.8' })
			},
			{
				team: 'Support desk', who: 'Ravi Menon', site: 'shop', paths: ['/', '/basket'], client: 'the customer', when: ['2026-07-06', '2026-08-07'], end: 2,
				title: 'UK customer gets access denied on the shop',
				single: true,
				context: 'He says it started a few days ago and that nothing has changed at home.',
				body: 'A customer in Manchester says the shop shows him "access denied" on every page, at home and only at home. He is sure we have blocked him as a bot.',
				quote: 'I live in Manchester and I cannot use your website from my own house. It says access denied. My wife can use it on her phone.',
				headers: (r) => browser(r)
			}
		]
	},
	// New hosts that the proxy challenges in full.
	{
		kind: 'other',
		log: 'loop',
		probe: ['If people in the office get in and everyone else goes round in circles, I would check whether the proxy treats the new host differently. Can you paste a few log lines?', 'Can you get log lines for the new host from the last hour?'],
		note: 'Not a bot, for the scorer. Yet the log shows the challenge on every request to the new host, whatever the score.',
		analyst: 'Our numbers for the new host look like any other host\'s: almost nothing there scores 2.',
		edge: 'Found it: new hosts start on "challenge everything" until someone sets them up, and the challenge cookie is set for the main domain only, so it never sticks on the new host. The office addresses skip the challenge, which is why you could get in.',
		weigh: [['gate', 'Nothing in the scorer could cause this: it never sees the host, only the headers, and these headers score 1.']],
		extra: [['reporter', 'Is there any check before a new host goes live that would have caught this?']],
		guess2: ['Could the new host\'s pages be too slow, so the challenge gives up?', 'The challenge page itself loads fine; it is the cookie that never sticks.'],
		endings: [
			['proxy', [
				['edge', 'The kitchen planner host now uses the normal rule, and the challenge cookie covers the subdomain. Fixed this morning.'],
				['reporter', 'The planner is open to everyone. Thanks.']
			]],
			['proxy', [
				['edge', 'Same as the kitchen planner in the autumn: a new host left on "challenge everything". Fixed, and the step is now on the checklist for new hosts.'],
				['reporter', 'Confirmed fixed.']
			]]
		],
		cases: [
			{
				team: 'Storefront', who: 'Lucía Ferro', site: 'kitchens', paths: ['/', '/planner', '/planner/new'], client: 'visitors to the kitchen planner', when: ['2026-09-14', '2026-10-09'], end: 0,
				title: 'Endless verification loop on the new kitchen planner',
				context: 'The planner is the launch feature of the new kitchen range, and the campaign for it starts next week.',
				body: 'The kitchen planner launched on its own subdomain this week. Visitors get the verification page, it refreshes, and they get it again, forever. Nobody has got in except people in the office.',
				more: 'In the office it works on every machine, which is why we did not catch it before launch.',
				headers: (r) => browser(r)
			},
			{
				team: 'Help Centre', who: 'Noor Haddad', site: 'community', paths: ['/', '/t/assembly-tips', '/t/delivery'], client: 'forum visitors', when: ['2026-10-19', '2026-11-12'], end: 1,
				title: 'Community forum visitors stuck on the verification page',
				context: 'The forum has about 20,000 active members, and a lot of help between customers happens there.',
				body: 'The community forum moved to its own subdomain last week. Since then a lot of visitors are stuck going round the verification page.',
				more: 'The forum\'s own logs show sign-ins down by nine tenths since the move.',
				headers: (r) => browser(r)
			},
			{
				team: 'Marketing', who: 'Josh Whitfield', site: 'offers', paths: ['/', '/winter'], client: 'visitors to the offers site', when: ['2026-11-02', '2026-11-12'], end: 1,
				title: 'Nobody outside the office can open the new offers site',
				context: 'The offers site is meant to take the winter campaign traffic off the shop.',
				body: 'The winter offers microsite went live on its own subdomain yesterday. Visitors from outside see "checking your browser" again and again and never get to the offers.',
				more: 'The campaign email with links to it goes out on Monday.',
				headers: (r) => browser(r)
			}
		]
	},
	// The proxy's health check on the scorer, before /healthz.
	{
		kind: 'other',
		log: 'unscored',
		probe: ['A share of requests at a time sounds like the scorer being taken out of the path rather than the features. Can you paste log lines that show which proxy nodes they went through?', 'Can you get me the node name from a few of these lines?'],
		note: 'The scorer itself says bot for these headers. The log shows them unscored, so the proxy never asked.',
		analyst: 'Our numbers show the same thing: the requests we score fell by about a quarter from 17 August.',
		edge: 'Our new health check calls GET /score, the only path of the scorer we knew, and treats the 404 it gets as a failure. Two nodes have the new check, so those two mark the scorer unhealthy and send it nothing. We did not want to roll the new check back; it catches real failures elsewhere.',
		weigh: [['gate', 'Two ways out: Edge points the check at something that answers 200, or we give them a proper health endpoint. We have wanted the second for a while.'], ['edge', 'We would much prefer a real health endpoint to a workaround.']],
		guess2: ['Could the scorer be slow on those two nodes?', 'The scorer is the same for every node. The two nodes simply never ask it.'],
		endings: [
			['service', [
				['gate', 'edge-scorer 1.3.0 adds GET /healthz for exactly this. It was released this morning, 15 September.', '2026-09-15'],
				['edge', 'Both nodes point their check at /healthz since the release. The scorer is healthy everywhere.', '2026-09-15']
			]],
			['service', [
				['gate', 'The two nodes in question mark us unhealthy because their check calls a path we do not have. 1.3.0 adds GET /healthz, released on 15 September.', '2026-09-15'],
				['edge', 'Checks moved to /healthz.'],
				['reporter', 'Scrapers challenged on every request again since the 15th.']
			]]
		],
		cases: [
			{
				team: 'Edge', who: 'Tamsin Rook', site: 'shop', paths: ['/', '/c/garden', '/api/stock?sku=30518'], client: "the proxy's health check", when: ['2026-08-18', '2026-09-04'], end: 0,
				title: 'Two proxy nodes mark the scorer unhealthy',
				context: 'The other six nodes, still on the old health check, are fine and score as usual.',
				body: 'Since the new health checks went out to two of the eight proxy nodes, those two nodes have marked the scorer unhealthy and sent it nothing. Requests through them are not scored at all. I am filing it here because the fix may be on either side.',
				more: 'The two nodes are edge-07 and edge-08.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.31.0', '2.32.3'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Storefront', who: 'Tom Hadley', site: 'shop', paths: ['/api/stock?sku=30518', '/api/stock?sku=41207'], client: 'the scrapers', when: ['2026-08-20', '2026-09-04'], end: 1,
				title: 'About a quarter of scraper requests get through unchallenged',
				context: 'It started on the same day for every scraper we track.',
				body: 'For the last few days roughly one in four requests from the python-requests scrapers on the stock pages gets through unchallenged. The rest are challenged as before. Same scrapers, same headers.',
				more: 'No pattern by time of day that I can see; it is a steady quarter.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.31.0', '2.32.3'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			}
		]
	},
	// Mail scanners that fetch every link.
	{
		kind: 'other',
		log: 'scored',
		probe: ['Clicks within the first minute are usually not people. Can you paste a few of the requests?', 'Can you get me log lines from the first minute after sending?'],
		note: 'The scorer is right about these: they are mail scanners that fetch every link in an email before it reaches the inbox.',
		analyst: 'Link scanners are a large share of the traffic on email links in the first minutes after sending. They are bots, and harmless ones.',
		edge: 'They come from the address ranges of the big mail security providers.',
		guess: ['Could these be real readers on a corporate network?', 'Not within seconds of sending, and not all with the same python-requests user agent. Real readers come later and look like browsers.'],
		weigh: [['gate', 'No harm is being done: the scanners get the challenge page, scan it and move on. The person who reads the email later is a different request and scores like any browser.']],
		extra: [['reporter', 'So our click numbers have been inflated by scanners all along?'], ['analyst', 'For the first minutes after sending, yes, quite a lot.']],
		guess2: ['Are our emails perhaps landing in spam because of this?', 'The scanners decide that before they fetch the links; the challenge page cannot affect it.'],
		endings: [
			['declined', [
				['gate', 'Nothing to change: these are mail scanners, and being challenged costs them nothing. The real readers come later and are not challenged.'],
				['reporter', 'Makes sense. We will leave the first-minute clicks out of the report. Closing.']
			]],
			['declined', [
				['gate', 'Mail scanners, as with the campaign clicks. The scorer is right and nobody is harmed. Nothing to change.'],
				['reporter', 'Fine. Closing.']
			]]
		],
		cases: [
			{
				team: 'Marketing', who: 'Clara Moss', site: 'www', paths: ['/campaigns/autumn-sale?utm_source=email', '/campaigns/autumn-sale/sofas?utm_source=email'], client: 'the clicks', when: ['2026-09-21', '2026-10-30'], end: 0,
				title: 'Campaign email clicks are being challenged',
				context: 'The email went to 380,000 subscribers.',
				body: 'In the first minute after the autumn email went out, about 6,000 clicks on its links were challenged. Our email tool counts them as clicks, so either real readers are being blocked or our numbers are wrong.',
				more: 'The click rate in the first minute was higher than for any email we have sent.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.28.1', '2.31.0'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate' })
			},
			{
				team: 'Checkout', who: 'Wendell Achebe', site: 'shop', paths: ['/orders/track?o=58213', '/orders/track?o=58240'], client: 'the clicks', when: ['2026-10-12', '2026-11-12'], end: 1,
				title: 'Links in order confirmation emails challenged within seconds of sending',
				context: 'Customers have not complained; it is our order-tracking figures that look wrong.',
				body: 'The "track your order" link in confirmation emails is opened and challenged within seconds of every email going out, often before the customer could possibly have read it.',
				more: 'About one email in five shows it, mostly to business addresses.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.27.1', '2.31.0'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate' })
			},
			{
				team: 'Help Centre', who: 'Elin Svensson', site: 'help', paths: ['/survey/after-contact?c=7731', '/survey/after-contact?c=7802'], client: 'the clicks', when: ['2026-07-13', '2026-09-01'], end: 1,
				title: 'Survey links in follow-up emails challenged',
				context: 'The survey tool counts every visit as a response started, so our completion rate looks much worse than it is.',
				body: 'The link to the satisfaction survey in our follow-up emails gets challenged within a few seconds of each email being sent. The survey tool records a visit with no answers.',
				more: 'It happens most with customers at large companies.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.25.1', '2.28.1'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate' })
			}
		]
	},
	// Bots the scorer catches that get through the challenge.
	{
		kind: 'other',
		log: 'solved',
		probe: ['If the log shows the challenge first, the scorer has done its part. Can you paste the lines for one address, the challenge and what came after?', 'Can you get me a run of log lines for one of these addresses?'],
		note: 'So the scorer is right about these. What happens after the challenge is up to the proxy.',
		analyst: 'The "passed the challenge" column in our review has been creeping up for months. The scorer flags them; the challenge does not stop them.',
		edge: 'The challenge is a script that a real browser runs in a second or two, and browser automation runs it too. We have a stricter mode that asks for more work, at some cost to real customers on slow phones.',
		guess: ['Should the analysts make the features stricter, so these score higher?', 'A higher score changes nothing: anything at 2 or more gets the same challenge.'],
		weigh: [['gate', 'The scorer cannot do more than flag a request; what happens after the flag is up to the proxy. The question for Edge is whether the challenge should be harder on these paths.'], ['reporter', 'Harder for everyone on those paths, presumably, our customers included.']],
		extra: [['reporter', 'So "challenged" in the log does not mean "stopped"?'], ['edge', 'Right. It means asked to prove itself. A cleared line after it means it did.']],
		guess2: ['Could the challenge be broken on these paths?', 'It works for real customers, who pass it in a second or two. It is just as easy for automation.'],
		endings: [
			['proxy', [
				['edge', "The sale pages use the stricter challenge mode since this morning's window."],
				['reporter', 'The scrapers gave up on the sale pages within a day.']
			]],
			['waiting', [
				['edge', 'The stricter mode hurts sign-ups on slow phones, so we will not use it on registration. We move to a new challenge provider in December, which should handle this.'],
				['reporter', 'So we wait for December.'],
				['edge', 'Still December for the new provider. Nothing changes before then.']
			]],
			['declined', [
				['gate', 'We discussed it with Edge: the challenge slows them down to a few pages a minute, and search can take that. We are not changing anything.'],
				['reporter', 'Fair enough. Closing.']
			]]
		],
		cases: [
			{
				team: 'Storefront', who: 'Tom Hadley', site: 'shop', paths: ['/sale', '/sale/garden', '/sale/lighting?page=2'], client: 'the sale-page scrapers', when: ['2026-07-20', '2026-09-25'], end: 0,
				title: 'Scrapers on the sale pages get past the challenge',
				hour: 5.05,
				context: 'The sale prices change every morning at 06:00, and the scraped prices appear on comparison sites by 06:30.',
				body: 'The scrapers on the sale pages are challenged, as the log shows, but a few seconds later the same addresses fetch the pages normally. It looks as if they get through the challenge.',
				more: 'They come back exactly six seconds after each challenge, which no person does.',
				headers: (r) => ({ 'user-agent': chrome(r), accept: BROWSER_ACCEPT, 'accept-language': '*', 'accept-encoding': 'gzip, deflate, br' })
			},
			{
				team: 'Accounts', who: 'Hana Novak', site: 'www', paths: ['/account/register'], client: 'the sign-up bots', when: ['2026-10-05', '2026-11-12'], end: 1,
				title: 'Sign-up bots pass the verification page',
				context: 'The fake accounts are not used for anything yet that we can see, which worries Accounts more, not less.',
				body: 'Fake registrations are back. The proxy log shows each one challenged and then, a few seconds later, let through with the challenge cleared.',
				more: 'About 600 a night, all at throwaway mail domains.',
				headers: (r) => ({ 'user-agent': chrome(r), accept: BROWSER_ACCEPT, 'accept-language': '*', 'accept-encoding': 'gzip, deflate, br', 'content-type': 'application/x-www-form-urlencoded' })
			},
			{
				team: 'Search', who: 'Anouk Peeters', site: 'shop', paths: ['/search?q=shelf', '/search?q=shelf+brackets', '/search?q=shed'], client: 'the search scrapers', when: ['2026-09-07', '2026-10-30'], end: 2,
				title: 'Challenged search scrapers carry on after a short pause',
				context: 'Search can take the load, but it is still a scraper reading our whole search index every week.',
				body: 'The search scrapers are challenged and then carry on after a pause of five or six seconds. Is the challenge doing anything at all?',
				more: 'Before the challenge they made a request a second. After it they manage one every ten seconds or so.',
				headers: (r) => ({ 'user-agent': chrome(r), accept: BROWSER_ACCEPT, 'accept-language': '*', 'accept-encoding': 'gzip, deflate, br' })
			}
		]
	},
	// The sites' own holding pages during deploys.
	{
		kind: 'other',
		log: 'origin',
		probe: ['What does the page say? The wording would tell us whose page it is.', 'Can you get me the time to the minute? I would like to see what the proxy answered.'],
		note: 'Not a bot, for the scorer. The log shows 503s from the origin, which is a page of the site itself, not the challenge.',
		analyst: 'Nothing unusual in our numbers at those times.',
		edge: 'The 503s come from the origin, not the proxy. The proxy passed the requests through and relayed the answer.',
		weigh: [['reporter', 'Then how do we tell the two apart in future?']],
		extra: [['gate', 'For whoever reads this later: our challenge is always a 403 and always says "checking your browser". A 503 is the site behind the proxy.']],
		guess2: ['Could the proxy be serving that page when the site is busy?', 'The proxy has no such page. A 503 like this comes from the site itself.'],
		endings: [
			['handed', [
				['gate', "That is Storefront's holding page, shown while the shop is deployed in the evening window. Handing over."],
				['Storefront', 'Yes, the deploy window. We are moving to deploys without a holding page later this year; until then we have asked the desk to tell customers it lasts a few minutes.']
			]],
			['handed', [
				['gate', 'The origin answered 503 with the "back in a moment" page. That is a deploy of the marketing site, not the bot check.'],
				['reporter', 'Confirmed with our agency: they deployed at 09:58. Taking it up with them; nothing for Gatehouse.']
			]],
			['handed', [
				['gate', "Not us: the 503s come from the help centre's own servers while content is published."],
				['Help Centre', 'Our platform contractor is changing publishing so that it does not take the site down. Taking this off the queue.']
			]]
		],
		cases: [
			{
				team: 'Support desk', who: 'Jo Baptiste', site: 'shop', paths: ['/', '/basket', '/c/sofas'], client: 'the customers', when: ['2026-07-27', '2026-10-01'], end: 0,
				title: 'Customers say the robot check stops them some evenings',
				context: 'It is always for a few minutes, and it never happens during the day.',
				body: 'Several customers say they are "checked for being a robot" some evenings and cannot shop for a while. One of them described the page:',
				quote: 'At about eight in the evening your website sometimes shows a page saying it will be back shortly and asking me to wait. Then it starts again. Why does your robot check only work at night?',
				hour: 19,
				headers: (r) => browser(r)
			},
			{
				team: 'Marketing', who: 'Josh Whitfield', site: 'www', paths: ['/campaigns/winter-lighting'], client: 'visitors to the campaign page', when: ['2026-10-12', '2026-11-12'], end: 1,
				title: 'Campaign landing page showed a holding page during the launch',
				context: 'The page looked nothing like the usual verification page, but nobody on the team had seen our verification page before.',
				body: 'At 10:00 on launch day the campaign landing page showed a "back in a moment" page for about six minutes. We assumed the bot check had kicked in because of the traffic.',
				more: 'The launch email went to 210,000 people at 10:00 sharp.',
				hour: 9.95,
				headers: (r) => browser(r)
			},
			{
				team: 'Help Centre', who: 'Noor Haddad', site: 'help', paths: ['/', '/articles/delivery-times'], client: 'readers', when: ['2026-08-10', '2026-09-30'], end: 2,
				title: 'Help centre shows a waiting page for a few minutes most mornings',
				context: 'Readers have started emailing the desk to ask whether the help centre is broken.',
				body: 'Most mornings, for two or three minutes around 07:30, the help centre shows readers a page asking them to wait. We have been told it is the bot check warming up.',
				more: 'It is always between 07:25 and 07:40, and never at weekends.',
				hour: 6.4,
				headers: (r) => browser(r)
			}
		]
	},
	// Co-browsing and tour relays that fetch the page again on their own servers.
	{
		kind: 'flagged',
		log: 'scored',
		probe: [
			'Co-browsing tools usually fetch the page again from their own servers to show it to the agent, and those servers send their own headers. Can you get me one of their requests?',
			'Can you find out which company runs the relay servers? A request id would also do.'
		],
		explain: { accept_any: "accept_any, because the relay sends Accept: */* rather than a browser's Accept header" },
		note: "The customer's own browser is not challenged; only the relay's copy of the page is.",
		analyst: 'Relays like this send a bare * as the language because they do not know whose language to send. It is the same pattern as the reading services.',
		guess: ['Is it because the agent and the customer load the same page at the same moment?', "No; the scorer has no idea that two requests belong together. It is the relay's headers, request by request."],
		edge: 'Vendors like this usually publish the addresses of their relays, and they change rarely.',
		weigh: [['gate', "Either the vendor passes the customer's language through, or the proxy skips their relays. The first is better, but it depends on their release cycle."], ['reporter', 'Their account manager says feature requests take a quarter at least.']],
		extra: [['reporter', 'For context, these sessions are used on a lot of the longer calls, mostly for returns and for orders with several deliveries.']],
		guess2: ['Could the agents\' own browsers be the problem?', 'Their browsers are not involved: the page they see is fetched by the relay, and the relay is what is challenged.'],
		endings: [
			['proxy', [
				['edge', "Mirrorly's relay addresses are on the skip list since this morning's window."],
				['reporter', 'Agents confirm the co-browsing view shows the real page again.']
			]],
			['sender', [
				['reporter', "Mirrorly brought the language change forward after we told them two other customers of theirs had the same problem. Their relays now pass on the customer's language."],
				['gate', "Replayed one of today's requests: only accept_any matches now, a score of 1."]
			]],
			['waiting', [
				['gate', 'The tours vendor says it will pass on the language in its spring release.'],
				['reporter', 'Edge would rather not skip-list another vendor, so we are waiting on the spring release.']
			]]
		],
		cases: [
			{
				team: 'Support desk', who: 'Ravi Menon', site: 'shop', paths: ['/orders/58213', '/returns/new', '/basket'], client: 'the co-browsing relay', when: ['2026-07-06', '2026-09-11'], end: 0,
				title: 'Co-browsing sessions show agents the challenge page',
				context: 'It makes the calls longer: the agents end up asking customers to read out what is on their screen.',
				body: 'When an agent starts a co-browsing session to help a customer through a return, the agent\'s view of the customer\'s screen often shows our "checking your browser" page, while the customer sees the real page. One agent wrote:',
				quote: 'The customer could see her order, I could only see the robot page. We did the whole return with her reading it out to me.',
				headers: (r) => ({ 'user-agent': `${chrome(r)} Mirrorly/3.${int(r, 1, 4)}`, accept: '*/*', 'accept-language': '*', 'accept-encoding': 'gzip' })
			},
			{
				team: 'Trade accounts', who: 'Odile Fournier', site: 'trade', paths: ['/catalogue', '/orders/new', '/catalogue/timber'], client: 'the co-browsing relay', when: ['2026-09-14', '2026-10-30'], end: 1,
				title: 'Account managers cannot co-browse the trade portal with customers',
				context: 'The new trade price list goes live soon, and the account managers have twenty walkthroughs booked for it.',
				body: 'Our account managers use the same co-browsing tool as the desk to walk trade customers through the portal. For the past week their side of the session has shown the verification page on every portal page.',
				more: "The customer's side always looks right. Only our side shows the verification page.",
				headers: (r) => ({ 'user-agent': `${chrome(r)} Mirrorly/3.${int(r, 5, 6)}`, accept: '*/*', 'accept-language': '*', 'accept-encoding': 'gzip' })
			},
			{
				team: 'Help Centre', who: 'Elin Svensson', site: 'help', paths: ['/articles/returns-and-refunds', '/tours/returns', '/tours/returns/step-1'], client: "the tours vendor's relay", when: ['2026-10-19', '2026-11-11'], end: 2,
				title: 'Guided tours in the help centre stall on the verification page',
				context: 'The returns tour was meant to cut returns contacts before Christmas.',
				body: 'The guided tours in the help centre are run by a vendor whose servers fetch each page to draw the tour over it. Since we added the returns tour, most tours stop at the first step with the verification page behind them.',
				more: 'The vendor\'s relay works the same way as the co-browsing tool, as far as I can tell.',
				headers: (r) => ({ 'user-agent': `Mozilla/5.0 (compatible; Tourwise-Render/1.${int(r, 6, 9)})`, accept: '*/*', 'accept-language': '*', 'accept-encoding': 'gzip, deflate' })
			}
		]
	},
	// Our own small scripts that call public hosts with library defaults.
	{
		kind: 'flagged',
		log: 'scored',
		probe: ['Is the script Python? If it uses the requests library with its defaults, that is two features straight away.', 'Can you paste a line from the proxy log for one of its requests?'],
		note: "These are the requests library's defaults, nothing more.",
		analyst: 'Internal scripts are a small share of what ua_python_requests catches, but they are the share that files reports.',
		guess: ['Should our own scripts not be recognised as ours, since they run on our own network?', 'The scorer cannot tell; it never sees addresses. The proxy could, if the script runs from a fixed internal address.'],
		edge: 'Internal tools calling public hosts are a habit we would like to break. Every one of these services has an internal address.',
		weigh: [['gate', 'Three choices: set a user agent in the script, run it against the internal address, or skip its address at the proxy. The first two are a line each.'], ['reporter', 'Some of these run on boxes we do not control, but we will see what we can do.']],
		extra: [['gate', "For the record, this is the library's default user agent, which is the commonest scraper signature we see on the shop."]],
		guess2: ['Could the script be too fast, firing requests back to back?', 'The scorer has no idea of speed; each request is scored on its headers.'],
		endings: [
			['sender', [
				['reporter', 'We set a user agent of our own in the script, "showroom-stock-check/1.0". Every lookup works again.'],
				['gate', 'Confirmed in the log: a score of 1 now, accept_any only.']
			]],
			['proxy', [
				['reporter', 'The label script runs on a box we cannot easily update; the printer supplier has it locked.'],
				['edge', "The returns printer's internal address skips scoring since this morning."],
				['reporter', 'Labels printing again.']
			]],
			['declined', [
				['gate', 'We would rather not exempt a script that can run against the internal host. Please point it there; nothing is scored there.'],
				['reporter', 'It runs from my laptop at home on Fridays, so the internal host is not an option without the VPN. I will live with it.'],
				['gate', 'Closing as not something we will change.']
			]]
		],
		cases: [
			{
				team: 'Retail ops', who: 'Kit Ashworth', site: 'shop', paths: ['/api/stock?sku=48213', '/api/stock?sku=52011', '/api/stock?sku=60117'], client: 'the showroom stock checker', when: ['2026-07-13', '2026-09-04'], end: 0,
				title: 'Showroom staff stock checker fails with a web page',
				context: 'Staff have gone back to phoning other showrooms to ask what they have.',
				body: 'Showroom staff check stock in other showrooms with a small script on their tablets. For a few days it has failed on nearly every lookup with what looks like a web page.',
				more: 'The script is a few lines of Python someone in the team wrote last year.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.28.1', '2.31.0'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Orders', who: 'Lena Vogt', site: 'shop', paths: ['/returns/label?r=7731', '/returns/label?r=7802', '/returns/label?r=7815'], client: 'the returns label script', when: ['2026-08-24', '2026-10-16'], end: 1,
				title: 'Returns desk cannot print return labels',
				context: 'The desk handles about 400 returns a day, and parcels without labels pile up.',
				body: 'The returns desk prints a label for each returned parcel through a script that fetches the label from the shop. Today most of the labels came out as a page of text about checking a browser.',
				more: "The script runs on the label printer's own small computer.",
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.22.0', '2.25.1'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Data', who: 'Callum Reid', site: 'shop', paths: ['/api/prices/export?week=44', '/api/prices/export?week=45'], client: 'the weekly price export', when: ['2026-10-19', '2026-11-12'], end: 2,
				title: 'Weekly price export script gets HTML back',
				context: "The pricing team compares our prices with competitors' on Mondays, so they need the export by the end of Friday.",
				body: 'Every Friday I pull our prices for the pricing team with a short Python script. The last two Fridays it got the verification page back instead of the prices.',
				more: 'It sends no headers of its own.',
				headers: (r) => ({ 'user-agent': `python-requests/${pick(r, ['2.31.0', '2.32.3'])}`, accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			}
		]
	},
	// Scrapers that copy the user agent of a client we let through.
	{
		kind: 'missed',
		log: 'scored',
		probe: ['A user agent anyone can copy is no proof of who sent the request. Can you paste a few lines with the addresses?', 'Can you check the addresses against the ones we know for that client?'],
		note: 'The scorer is doing what it does: it sees a user agent that matches no feature.',
		analyst: "Copying the user agent of a client that gets through is the oldest trick there is. The features cannot catch it, because the headers are the same as the real client's.",
		guess: ['Can we add a feature for the copied user agent?', 'Then we would challenge the real client too. Its headers are identical.'],
		edge: "Addresses are the only thing that tells the real client from the copy, and addresses are the proxy's business, not the scorer's.",
		weigh: [['gate', 'This needs something the copy cannot fake: the source address, or a key. Neither is something the scorer sees.']],
		extra: [['reporter', 'So anything we tell partners to put in their user agent can be copied the next day?'], ['gate', 'Yes. A user agent is a courtesy, not a credential.']],
		guess2: ['Could the real client be sending these, only more of them?', 'Not from those addresses. The real client\'s addresses are known, and hardly any of the traffic comes from them.'],
		endings: [
			['handed', [
				['gate', "The real fix is to require a partner key on the stock endpoints, which is Partner API's decision, not ours. Handing it back to you."],
				['Partner API', 'Agreed. Keys will be required on /v2/stock from the next API version; until then the copies get through.']
			]],
			['proxy', [
				['edge', "Requests that call themselves SiteSearchBot from anywhere but the provider's published addresses are now blocked at the proxy."],
				['reporter', 'The fake one has been turned away since this morning.']
			]],
			['proxy', [
				['edge', "Crawlers that claim to be Googlebot are now blocked at the proxy unless they come from Google's published addresses."],
				['reporter', 'The fake Googlebot traffic stopped this morning.']
			]]
		],
		cases: [
			{
				team: 'Partner API', who: 'Priya Raman', site: 'api', paths: ['/v2/stock', '/v2/stock/changes?since=2026-10-01T00:00:00Z'], client: 'the copied Kellbrook user agent', when: ['2026-09-07', '2026-10-30'], end: 0,
				title: "Someone is using Kellbrook's user agent to scrape stock",
				context: 'Their own sync still runs every ten minutes from two addresses. Everything else is someone else.',
				body: "The stock endpoints are getting about ten times the traffic Kellbrook ever sent, all with Kellbrook's user agent, KellbrookStockSync/3.2. Kellbrook say most of it is not theirs.",
				more: "The copies come from hundreds of addresses, none of them Kellbrook's.",
				headers: () => ({ 'user-agent': 'KellbrookStockSync/3.2', accept: '*/*', 'accept-encoding': 'gzip, deflate', connection: 'keep-alive' })
			},
			{
				team: 'Storefront', who: 'Tom Hadley', site: 'shop', paths: ['/api/stock?sku=30518', '/api/stock?sku=41207', '/api/stock?sku=48213'], client: 'the fake SiteSearchBot', when: ['2026-10-05', '2026-11-10'], end: 1,
				title: "Scraper pretending to be our search provider's crawler",
				context: 'The real SiteSearchBot only fetches product pages, politely, at night.',
				body: 'Something calling itself SiteSearchBot is fetching stock pages, which the real crawler never does, at about fifty a second. It is never challenged.',
				more: "The addresses are all over the place, nothing like the provider's.",
				headers: () => ({ 'user-agent': 'Mozilla/5.0 (compatible; SiteSearchBot/2.6; +https://sitesearch.io/bot)', accept: 'text/html', 'accept-encoding': 'gzip', connection: 'keep-alive' })
			},
			{
				team: 'Search', who: 'Anouk Peeters', site: 'shop', paths: ['/search?q=sofa', '/search?q=sofa+bed', '/search?q=sofa+cover'], client: 'the fake Googlebot', when: ['2026-10-19', '2026-11-12'], end: 2,
				title: 'Search scraped by something claiming to be Googlebot',
				context: 'It fetches about 20,000 search pages a day, all for furniture.',
				body: "A client with Googlebot's user agent is fetching search result pages, which we ask real search engines not to crawl. It scores 1 and is never challenged.",
				more: 'None of the addresses belong to Google, as far as I can check.',
				headers: () => ({ 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', accept: '*/*', 'accept-encoding': 'gzip, deflate, br' })
			}
		]
	},
	// Our own load tests.
	{
		kind: 'other',
		once: true,
		log: 'scored',
		probe: ['Can you paste the user agent? A sudden flood that is never challenged is sometimes one of ours.', 'Can you get me a few log lines from the spike?'],
		note: 'Nothing matches: k6 is a load-testing tool, and it says so in its user agent.',
		analyst: 'There is no feature for load-testing tools; nobody has asked for one.',
		edge: 'The addresses are in our own cloud account.',
		guess: ['Is it an attack? It looks like one on the graphs.', 'An attack would not announce itself as a load-testing tool, from our own addresses.'],
		weigh: [['gate', 'Nothing for the scorer to do if this is ours. The only questions are who ran it and whether they meant to run it against production.']],
		guess2: ['Should the scorer have challenged it?', 'It had nothing to go on: a tool that names itself honestly, with no feature for it. And it turns out to be ours.'],
		endings: [
			['handed', [
				['SRE', 'That was our capacity test before the sale. We should have announced it; sorry. We will post the dates in #engineering from now on.'],
				['reporter', 'Thanks. We will take that hour out of the figures.']
			]],
			['handed', [
				['SRE', 'Ours: the search capacity test, run against production instead of staging by mistake. It will not happen again; the script now refuses the production host.'],
				['reporter', 'Good. Closing from our side.']
			]],
			['handed', [
				['SRE', 'That was the checkout load test. It uses test cards that the provider declines, which is why the figures looked like card testing.'],
				['reporter', 'That explains it. We have asked for a warning next time.']
			]]
		],
		cases: [
			{
				team: 'Data', who: 'Ines Duarte', site: 'shop', paths: ['/', '/c/garden', '/search?q=parasol', '/basket'], client: 'the spike', when: ['2026-07-20', '2026-09-25'], end: 0, hour: 21, yesterday: true,
				title: 'Huge unchallenged traffic spike last night',
				context: 'The spike hit every kind of page, from the home page to the basket.',
				body: 'Between 22:00 and 23:00 last night the shop took about four times its usual peak traffic, from a few dozen addresses, and none of it was challenged. Our analytics are ruined for the day.',
				more: 'The addresses look like cloud servers.',
				headers: (r) => ({ 'user-agent': `k6/0.${int(r, 47, 50)}.0 (https://k6.io/)`, accept: 'text/html,application/json', 'accept-encoding': 'gzip' })
			},
			{
				team: 'Search', who: 'Pavel Dvorak', site: 'shop', paths: ['/search?q=lamp', '/search?q=bed', '/search?q=desk'], client: 'the overnight load', when: ['2026-09-14', '2026-11-05'], end: 1, hour: 2,
				title: 'Search flooded overnight by a client nobody recognises',
				context: 'It searched for the same twenty terms over and over.',
				body: 'Search took 90,000 requests in an hour overnight from a few dozen addresses, all with a user agent I do not recognise. None of it was challenged, and search was slow for everyone for that hour.',
				more: 'The user agent starts with k6, whatever that is.',
				headers: (r) => ({ 'user-agent': `k6/0.${int(r, 50, 52)}.0 (https://k6.io/)`, accept: 'application/json', 'accept-encoding': 'gzip' })
			},
			{
				team: 'Checkout', who: 'Saskia Brandt', site: 'shop', paths: ['/checkout/payment', '/basket'], client: 'the declined payments', when: ['2026-10-12', '2026-11-12'], end: 2, hour: 14, yesterday: true,
				title: 'Burst of declined payments from unchallenged clients',
				context: 'The payments provider has not warned us this time, which is odd if it was card testing.',
				body: 'Yesterday afternoon checkout saw about 2,000 payment attempts in twenty minutes, nearly all declined, from clients that were never challenged. It looks like card testing.',
				more: 'All the attempts are for the same test product.',
				headers: (r) => ({ 'user-agent': `k6/0.${int(r, 52, 53)}.0 (https://k6.io/)`, accept: 'application/json', 'content-type': 'application/json', 'accept-encoding': 'gzip' })
			}
		]
	}
];

// Shared parts of a thread.
const openings = [
	'Filing this here because the edge dashboard only shows totals.',
	'Raised at our stand-up this morning; I said I would put it in the queue.',
	'Not sure this is yours, but the page people see is the bot check\'s, so starting here.',
	'Writing this down properly, since it has come up more than once.',
	'Passing this on from our on-call, who saw it overnight.',
	'Low urgency, but it is not going away on its own.',
	'Could someone take a look? Details below.',
	'Apologies if this is known already; I searched the queue and found nothing.',
	'Opening a report as suggested in #gatehouse.',
	'Flagging this before the weekend in case it gets worse.',
	'Writing this up while it is fresh.',
	'This one came to us first, but I think it ends with you.'
];
const closings = [
	'Happy to pull more examples.',
	'I can give you access to our dashboard if that helps.',
	'Tell me what else you need.',
	'I am around all week.',
	'Thanks in advance.',
	'I will keep an eye on it in the meantime.'
];
const acks = ['Thanks, taking this.', 'Picked up.', 'Looking.', 'Thanks for the detail.', 'I have this one.', 'On it today.', 'Thanks.'];
const samplesToday = ['Here are some from earlier today:', 'From the proxy log viewer, all from the same hour:', 'Pulled these just now, from before I filed this:', 'Lines from the proxy log, trimmed a little:'];
const samplesYesterday = ['A handful from yesterday:', "From yesterday's log, all in the same hour:", 'These are from yesterday, trimmed a little:'];
const deskTimes = [
	'The customer gave me a time: about {TIME} on {DATE}. I cannot see the proxy log from the desk.',
	'She says it happened at about {TIME} on {DATE}, and every time she tried after that.',
	'I asked. The customer says {DATE}, a little after {TIME}.',
	'The best I have is {DATE}, around {TIME}, from the customer\'s own notes.'
];
const foundLog = ['Found them in the proxy log:', 'Here they are in the proxy log:', 'These are the requests from that time:', 'Matching lines from the proxy log:'];
const reproIntro = ['Replayed one of them against the scorer on staging:', 'The same headers, sent straight to the scorer:', 'I took the forwarded headers of {REQ} and sent them to the scorer:', 'Reproduced on staging with the headers from the log:'];
const prefixPre = ['The answer does not say which features matched, so I sent the headers again one at a time.', 'Our answer only gives the score, so I worked out the features by leaving out one header at a time.'];
const prefixPost = ['Since 1.4.0 the answer lists what matched, which saves a lot of guessing.', '', ''];
const laterLooks = ['Same picture later on:', 'Still the same today:', 'For comparison, a later hour:', 'More of the same, from a different hour:', 'Checked again; nothing has changed:'];
const impact: Record<string, string[]> = {
	flagged: ['Still happening: {N} more challenged requests from {CLIENT} since yesterday, going by the proxy log.', 'For the record, the proxy log shows {N} challenges for {CLIENT} in the last 24 hours.', 'Another {N} challenged requests today. Is there anything we can do in the meantime?'],
	missed: ['Another {N} requests from {CLIENT} overnight, none of them challenged.', 'Still going: {N} requests in the last day, every one scored under 2.', 'The numbers since I filed this: about {N} requests a day, all let through.'],
	desk: ['Another {M} contacts about this since yesterday.', '{M} more customers have been in touch about this today.', 'Still coming in: {M} contacts this morning alone.']
};
const replyToReplay: Record<string, string[]> = {
	flagged: ['That matches what we see. Thanks for the quick look.', 'Makes sense, though I would never have guessed it was that header.', 'Thanks. So it is the combination, not any one thing.'],
	missed: ['So as far as the scorer is concerned, these are customers. Not what I hoped to hear.', 'Thanks. That explains why nothing happens to them.', 'Understood. Then what would it take for these to score?'],
	other: ['So the scorer is not the problem. Then what is?', 'Interesting. That rules out one thing, at least.', 'Thanks. I had assumed it was the bot check all along.']
};
const wrapUps: Record<Outcome, string[]> = {
	export: ["Closing. The change is in the export's history, and the analysts will note it in Monday's review.", 'Closing this; nothing left for Gatehouse.'],
	proxy: ["Closing on our side. The change is Edge's and is in their change log.", 'Nothing for the scorer here in the end; closing.'],
	sender: ['Closing, since the change was made where the requests come from. Nothing changed in the scorer or the export.', 'Closing. Nothing changed on our side.'],
	service: ["Closing; the fix is in the scorer's changelog.", 'Closing this one.'],
	handed: ['Closing here, since it now sits with the team that owns it.', 'Closing on the Gatehouse side.'],
	declined: ['Closed as not something we will change.', 'Closing.'],
	waiting: ['Leaving this open.', 'Keeping this open until then.']
};
const logNotes: Record<string, string[]> = {
	flagged: ['The challenged lines are the ones from {CLIENT}; the rest are ordinary customers for comparison.', 'Every line with action=challenge is {CLIENT}. I left a few customer lines in so you can compare.', 'You can pick out {CLIENT} by the user agent; all of those were challenged.'],
	missed: ['The lines from {CLIENT} all passed, as you can see; I left some customer lines in for comparison.', 'Every request from {CLIENT} went straight through.', 'You can pick out {CLIENT} by the user agent and the paths.'],
	other: ['I have left in a few lines that have nothing to do with it, for comparison.', 'Not sure what to look for in these, to be honest.', '']
};
const deskWraps: Record<string, string[]> = {
	closed: ['I have let the customer know and closed the contact on our side.', 'Passed the outcome on to the customer, who was glad to hear it.', 'Customer told; our contact is closed.'],
	open: ['I have told the customer we are still waiting and will come back to them.', 'Customer told that it is not fixed yet. We will keep the contact open.']
};
const gateNotes = [
	"Brought this to the analysts' Monday review, so they have seen it.",
	"Linked from this week's Gatehouse notes so that it does not get lost.",
	'For anyone joining late: the request ids and the replays are in the comments above.',
	'Mentioned this at our stand-up; nobody had seen it before.'
];
const thanks = ['Thanks, everyone.', 'Thanks for sorting this out.', 'Appreciated.', ''];
const bumps = ['Any news on this?', 'Is there a date for this?', 'Bumping; it is still happening as of this morning.', 'Checking in, since nothing seems to have moved.'];
const asides = [
	'Unrelated: the edge dashboard is showing local time again, so the hours in it may be off by one from the log.',
	'Side note, the proxy log viewer is slow this week; Edge know about it.',
	'I am at the offsite until Thursday, so replies may be slow.',
	'For whoever reads this later: the chat discussion is pinned in #gatehouse, but everything that matters should be here.',
	'Sorry, I replied to the wrong report a minute ago and deleted it.',
	'Reminder that proxy changes go out in the Wednesday morning window.',
	'Back from leave and working through the queue from the oldest, so apologies for the wait.',
	'Could we keep request ids in the report rather than screenshots in chat? Much easier to search later.',
	"The analysts' weekly review is on Mondays at 14:00, if anyone wants to bring this in person.",
	'Out tomorrow; someone else from Gatehouse will pick up anything urgent.'
];
const words = ['no', 'one', 'two', 'three', 'four', 'five'];
const defaultExplain: Record<string, string> = {
	ua_headless: 'ua_headless on the user agent',
	ua_python_requests: 'ua_python_requests on the python-requests user agent',
	ua_curl: "ua_curl on curl's default user agent",
	ua_go_http: 'ua_go_http on the user agent',
	ua_okhttp: 'ua_okhttp on the okhttp user agent',
	lang_wildcard: 'lang_wildcard on Accept-Language: *',
	accept_any: 'accept_any, because the Accept header contains */*',
	accept_enc_identity: 'accept_enc_identity on Accept-Encoding: identity',
	via_squid: "via_squid on the gateway's Via header",
	conn_close: 'conn_close on Connection: close'
};

const readout = (r: Rand, s: ReturnType<typeof scoreOn>, explain: Record<string, string>): string => {
	const parts = s.matched.map((name) => explain[name] ?? defaultExplain[name]!);
	if (s.score === 0) return pick(r, ['Nothing matches at all: a score of 0.', 'No feature matches. Score 0, not a bot.']);
	if (s.score === 1) return pick(r, [`Only ${parts[0]}. That is a score of 1, under the bot line.`, `One feature matches, ${parts[0]}, so a score of 1 and not a bot.`]);
	const list = parts.length === 2 ? `${parts[0]}, and ${parts[1]}` : `${parts.slice(0, -1).join('; ')}; and ${parts.at(-1)}`;
	return pick(r, [`${cap(words[s.score]!)} features match: ${list}. That makes ${s.score}, and 2 is the bot line.`, `It scores ${s.score}: ${list}. That is a bot by our rules.`]);
};

// Pasted output.
const block = (lines: string[], lang = 'text') => '```' + lang + '\n' + lines.join('\n') + '\n```';
const address = (r: Rand) => pick(r, [`203.0.113.${int(r, 2, 254)}`, `198.51.100.${int(r, 2, 254)}`, `192.0.2.${int(r, 2, 254)}`, `2001:db8:${hex(r, 4)}::${hex(r, 2)}`]);
const sitePaths: Record<string, string[]> = {
	shop: ['/', '/c/garden', '/c/lighting', '/p/30518', '/basket', '/c/sofas', '/search?q=lamp', '/p/41207'],
	help: ['/', '/articles/delivery-times', '/articles/returns-and-refunds', '/contact'],
	api: ['/v2/products?page=1', '/v2/stock?sku=30518', '/v2/orders'],
	www: ['/', '/about', '/campaigns/autumn-sale', '/stores'],
	trade: ['/', '/catalogue', '/orders'],
	status: ['/', '/history'],
	partners: ['/', '/login', '/dashboard'],
	kitchens: ['/', '/planner'],
	community: ['/', '/latest'],
	offers: ['/', '/winter']
};
const time = (seconds: number) => `${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
interface LogLine {
	req: string;
	headers: Headers;
}
/** Proxy log lines for the case's requests, with a few unrelated ones mixed in. Returns the text and one own request. */
const proxyLog = (r: Rand, topic: Topic, c: Case, date: string, count: number, before = 24 * 3600): { text: string; own: LogLine } => {
	const lines: string[] = [];
	let second = c.hour !== undefined ? Math.round(c.hour * 3600) + int(r, 0, 600) : topic.log === 'timeout' ? int(r, 19 * 3600, 20 * 3600) : int(r, 6 * 3600, Math.max(6 * 3600, Math.min(17 * 3600, before - 1200)));
	let own: LogLine | undefined;
	const capNames = Object.keys(c.headers(r)).some((name) => /[A-Z]/.test(name));
	for (let i = 0; i < count; i++) {
		second += int(r, 0, 30);
		const mine = r() < 0.72 || (i === count - 1 && !own);
		const headers = mine ? c.headers(r) : capNames ? titleCase(browser(r)) : browser(r);
		const s = scoreOn(date, headers);
		const req = hex(r, 8);
		if (mine && !own) own = { req, headers };
		const site = c.site;
		const path = mine ? pick(r, c.paths) : pick(r, sitePaths[site] ?? sitePaths.shop!);
		let status = s.bot ? 403 : 200;
		let score = String(s.score);
		let action = s.bot ? 'challenge' : 'pass';
		let node = `edge-0${int(r, 1, 8)}`;
		if (mine && topic.log === 'ratelimit' && r() < 0.7) [status, action] = [429, 'ratelimit'];
		if (mine && topic.log === 'timeout' && r() < 0.6) [status, score, action] = [200, '-', 'pass-timeout'];
		if (topic.log === 'unscored' && r() < 0.5) node = pick(r, ['edge-07', 'edge-08']);
		if ((node === 'edge-07' || node === 'edge-08') && date >= UNHEALTHY[0] && date < UNHEALTHY[1]) [status, score, action] = [200, '-', 'pass-unscored'];
		if (mine && topic.log === 'country') [status, action] = [403, 'country'];
		if (topic.log === 'loop') [status, action] = [403, 'challenge-all'];
		if (topic.log === 'cached' && r() < 0.8) [status, score, action] = [403, '-', 'cache-hit'];
		if (mine && topic.log === 'solved' && r() < 0.5) [status, action] = [200, 'cleared'];
		if (mine && topic.log === 'origin' && r() < 0.8) status = 503;
		const ua = headers['user-agent'] ?? headers['User-Agent'] ?? '-';
		lines.push(`${date}T${time(second)}Z ${node} host=${site} ${pick(r, mine && /login|register|payment|subscribe|status$/.test(path) ? ['POST'] : ['GET'])} ${path} ${status} score=${score} action=${action} ip=${address(r)} req=${req} ua="${ua}"`);
	}
	return { text: block(lines), own: own! };
};
/** The days two proxy nodes marked the scorer unhealthy and scored nothing, until /healthz in 1.3.0. */
const UNHEALTHY = ['2026-08-17', '2026-09-15'];
const headersPaste = (headers: Headers) => block([JSON.stringify(headers, null, 2)], 'json');
const scorePaste = (r: Rand, date: string, line: LogLine): string => {
	const s = scoreOn(date, line.headers);
	const answer = date >= RELEASE_1_4 ? JSON.stringify(s) : JSON.stringify({ score: s.score, bot: s.bot });
	const body = JSON.stringify({ headers: line.headers });
	const command = body.length < 170 ? `$ curl -s http://edge-scorer.staging.internal:8080/score -d '${body}'` : `$ curl -s http://edge-scorer.staging.internal:8080/score -d @req-${line.req}.json`;
	return block([command, answer]);
};
const hourTable = (r: Rand, kind: 'up' | 'flat' | 'zero', date: string): string => {
	const start = int(r, 0, 15);
	const rows = [`Hourly figures for ${longDate(date)} from the edge dashboard:`, '', '| Hour (UTC) | Requests | Scored 2 or more | Challenged | Passed the challenge |', '| --- | ---: | ---: | ---: | ---: |'];
	const peak = int(r, 2, 4);
	for (let h = 0; h < int(r, 6, 8); h++) {
		const busy = Math.abs(h - peak) <= 1;
		const requests = int(r, 18000, 26000) + (busy ? int(r, 9000, 40000) : 0);
		const scored = kind === 'zero' ? 0 : kind === 'up' && busy ? Math.round(requests * (0.2 + r() * 0.2)) : Math.round(requests * (0.04 + r() * 0.03));
		const challenged = Math.round(scored * (0.93 + r() * 0.06));
		rows.push(`| ${pad((start + h) % 24)}:00 | ${thousands(requests)} | ${thousands(scored)} | ${thousands(challenged)} | ${thousands(Math.round(challenged * r() * 0.03))} |`);
	}
	return rows.join('\n');
};
const featureTable = (r: Rand, date: string): string => {
	const ranges: Record<string, [number, number]> = {
		ua_headless: [0, 9], ua_python_requests: [60000, 140000], ua_curl: [40000, 90000], ua_go_http: [0, 0], ua_okhttp: [8000, 15000],
		lang_wildcard: [3000, 9000], accept_any: [2100000, 2900000], accept_enc_identity: [1500, 4000], via_squid: [5000, 12000], conn_close: [20000, 45000]
	};
	const rows = [`Yesterday's matches, from our daily review (${longDate(addDays(date, -1))}):`, '', '| Feature | Matched | In a request scored 2 or more | Passed the challenge |', '| --- | ---: | ---: | ---: |'];
	for (const f of activeOn(date)) {
		const [low, high] = ranges[f.name]!;
		const matched = int(r, low, high);
		const scored = f.name === 'accept_any' ? int(r, 150000, 260000) : Math.round(matched * (0.55 + r() * 0.4));
		rows.push(`| ${f.name} | ${thousands(matched)} | ${thousands(scored)} | ${thousands(Math.round(scored * (0.002 + r() * 0.03)))} |`);
	}
	return rows.join('\n');
};

// One report's thread.
interface Item {
	topic: Topic;
	c: Case;
	/** 0 the first time a case is used; more when ITEMS exceeds the number of cases. */
	round: number;
	index: number;
	date: string;
}
/** Days the proxy forwarded header names as written (13 October, until Edge restored lower-casing on the 15th). */
const NAME_CASE_DAYS = ['2026-10-13', '2026-10-14', '2026-10-15'];
const fill = (text: string, values: Record<string, string>) => text.replace(/\{([A-Z]+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);

const report = (item: Item, number: number, earlier: number | undefined): string => {
	const r = mulberry32(0x6a7e0000 + item.index * 7919);
	const { topic, c } = item;
	const team = people[c.team]!;
	const reporter = item.round === 0 ? c.who : team.find((name) => name !== c.who) ?? c.who;
	const desk = c.team === 'Support desk';
	const [owner, second] = shuffle(r, people.Gatehouse!) as [string, string];
	const analyst = pick(r, people['Bot pipeline']!);
	const edge = pick(r, people.Edge!.filter((name) => name !== reporter));
	const teamPerson = (name: string) => (name === c.team ? team.find((p) => p !== reporter) ?? reporter : pick(r, people[name]!));
	const values = { CLIENT: c.client };

	let day = item.date;
	let minute = int(r, 8 * 60 + 30, 16 * 60);
	const opened = `${day} at ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
	const comments: string[] = [];
	// A report filed late in the period has a thread that moves faster, so that it ends by LAST_DAY.
	const tight = daysBetween(item.date, LAST_DAY) < 21;
	let last = `${day} ${minute}`;
	const advance = (sameDay: number, most: number) => {
		if (tight) [sameDay, most] = [Math.max(sameDay, 0.7), 1];
		if (topic.stats === false) [sameDay, most] = [Math.max(sameDay, 0.93), 1];
		if (r() < sameDay || day >= LAST_DAY) minute += int(r, 5, tight || topic.stats === false ? 45 : 140);
		else {
			day = addDays(day, int(r, 1, most));
			minute = int(r, 8 * 60, 17 * 60);
		}
		if (minute >= 19 * 60 && day < LAST_DAY) {
			day = addDays(day, 1);
			minute = int(r, 8 * 60, 11 * 60);
		}
		day = toWeekday(day);
	};
	const say = (who: string, label: string, paragraphs: string[], at?: string, sameDay = 0.55, most = 2) => {
		advance(sameDay, most);
		if (at && at > day) {
			day = at;
			minute = int(r, 9 * 60, 16 * 60);
		}
		if (day > LAST_DAY) day = LAST_DAY;
		const [lastDay, lastMinute] = last.split(' ') as [string, string];
		if (day < lastDay || (day === lastDay && minute <= Number(lastMinute))) [day, minute] = [lastDay, Math.min(Number(lastMinute) + int(r, 3, 25), 23 * 60 + 59)];
		last = `${day} ${minute}`;
		const text = paragraphs.filter(Boolean).map((p) => fill(p, values)).join('\n\n');
		comments.push(`**${who}** (${label}) · ${day} ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}\n\n${text}`);
	};
	const by = (role: string): [string, string] =>
		role === 'gate' ? [owner, 'Gatehouse'] : role === 'analyst' ? [analyst, 'Bot pipeline'] : role === 'edge' ? [edge, 'Edge'] : role === 'reporter' ? [reporter, c.team] : [teamPerson(role), role];
	const aside = () => (r() < 0.25 ? pick(r, asides) : '');
	/** The hour the story puts the case's requests at, when it is later than the morning. */
	const lateHour = c.hour !== undefined ? c.hour * 3600 : topic.log === 'timeout' ? 19 * 3600 : 0;

	// The report itself.
	const body: string[] = [];
	if (item.round > 0) body.push('Raising this for my team as well, in case it is not the same as what was reported before.');
	else if (r() < 0.9) body.push(pick(r, openings));
	body.push(c.body);
	if (c.quote) body.push(`> ${c.quote}`);
	body.push(c.context);
	if (topic.table && !desk) body.push(hourTable(r, topic.stats === false ? 'zero' : topic.log === 'cached' ? 'up' : 'flat', item.date));
	if (r() < 0.75) body.push(pick(r, closings));

	// First look.
	const probe = c.probe ?? pick(r, topic.probe);
	say(owner, 'Gatehouse', [`${pick(r, acks)} ${probe}`, earlier !== undefined && r() < 0.6 ? `Possibly related to #${earlier}.` : ''], undefined, 0.7, 1);

	const note = c.note ?? (typeof topic.note === 'function' ? topic.note(item.date) : topic.note ?? '');
	if (topic.log === 'none') {
		say(edge, 'Edge', [topic.edge ?? '']);
		say(reporter, c.team, ['Their error, as they sent it:', topic.art!(r, c, item.date), aside()]);
	} else {
		// The first lines come from before the report was filed: earlier that day, or the day before when the story's hour is later.
		const openedSecond = Number(opened.slice(14, 16)) * 3600 + Number(opened.slice(17, 19)) * 60;
		const logDay = c.yesterday || lateHour + 1800 > openedSecond ? addDays(item.date, -1) : item.date;
		const log = proxyLog(r, topic, c, logDay, int(r, 9, 11), logDay === item.date ? openedSecond : 24 * 3600);
		/** A second replay: one header made ordinary, or the user agent in lower case. */
		const variant = (line: LogLine): string[] => {
			const s = scoreOn(day, line.headers);
			const ua = line.headers['user-agent'];
			if (topic.lowerDemo && ua && r() < 0.8) {
				const lowered = { ...line.headers, 'user-agent': ua.toLowerCase() };
				const t = scoreOn(day, lowered);
				return [`For comparison, the same request with the user agent written in lower case scores ${t.score}:`, scorePaste(r, day, { req: `${line.req}-lower`, headers: lowered })];
			}
			if (s.matched.length === 0 || r() < 0.35) return [];
			const name = pick(r, s.matched);
			const header = features.find((f) => f.name === name)!.header;
			const plain: Headers = { 'user-agent': chrome(r), accept: 'text/html', 'accept-language': 'en-GB', 'accept-encoding': 'gzip, deflate, br' };
			const changed = { ...line.headers };
			if (plain[header]) changed[header] = plain[header]!;
			else delete changed[header];
			const t = scoreOn(day, changed);
			const what = plain[header] ? `with an ordinary ${header} header` : `without the ${header} header`;
			return [`And the same request ${what}:`, scorePaste(r, day, { req: `${line.req}-b`, headers: changed }), `That is ${t.score}, ${t.bot ? 'still a bot' : 'not a bot'}.`];
		};
		const repro = (lead: string[]) => {
			const body = JSON.stringify({ headers: log.own.headers });
			const intro = fill(pick(r, reproIntro), { REQ: log.own.req });
			const pastes = body.length < 170 ? [intro, scorePaste(r, day, log.own)] : [`The forwarded headers of ${log.own.req}:`, headersPaste(log.own.headers), intro, scorePaste(r, day, log.own)];
			const prefix = pick(r, day >= RELEASE_1_4 ? prefixPost : prefixPre);
			say(owner, 'Gatehouse', [...lead, ...pastes, `${prefix} ${readout(r, scoreOn(day, log.own.headers), topic.explain ?? {})}`.trim(), note, ...variant(log.own)]);
		};
		if (desk) {
			const t = log.text.match(/T(\d\d:\d\d)/)![1]!;
			say(reporter, c.team, [fill(pick(r, deskTimes), { TIME: t, DATE: longDate(logDay) })]);
			repro([pick(r, foundLog), log.text]);
		} else {
			say(reporter, c.team, [pick(r, logDay === item.date ? samplesToday : samplesYesterday), log.text, r() < 0.7 ? pick(r, logNotes[topic.kind]!) : '', c.more ?? '']);
			repro([]);
		}
	}

	// The middle of the thread, in an order of its own.
	const middle: (() => void)[] = [];
	if (topic.analyst) middle.push(() => say(analyst, 'Bot pipeline', [topic.analyst!, topic.log !== 'none' && topic.stats !== false && r() < 0.65 ? featureTable(r, day) : '', aside()], undefined, 0.4, 2));
	if (topic.edge && topic.log !== 'none') middle.push(() => say(edge, 'Edge', [topic.edge!, aside()], undefined, 0.5, 2));
	for (const guess of [topic.guess, topic.guess2]) {
		if (!guess) continue;
		const raiser: [string, string] = r() < 0.6 && team.length > 1 ? [team.find((p) => p !== reporter)!, c.team] : r() < 0.6 ? [reporter, c.team] : [second, 'Gatehouse'];
		const answerer: [string, string] = r() < 0.6 ? [owner, 'Gatehouse'] : [analyst, 'Bot pipeline'];
		middle.push(() => {
			say(raiser[0], raiser[1], [guess[0]]);
			say(answerer[0], answerer[1], [guess[1], aside()]);
		});
	}
	if (r() < 0.75) middle.push(() => say(owner, 'Gatehouse', [pick(r, gateNotes)], undefined, 0.3, 3));
	if (topic.log !== 'none' && topic.stats !== false && !topic.once && r() < 0.7 && !NAME_CASE_DAYS.includes(day))
		middle.push(() => {
			const [who, label] = desk || r() < 0.5 ? [owner, 'Gatehouse'] : [reporter, c.team];
			advance(0.3, 2);
			const earlier = lateHour + 1800 > minute * 60;
			say(who, label, [pick(r, laterLooks), proxyLog(r, topic, c, earlier ? addDays(day, -1) : day, int(r, 5, 7), earlier ? 24 * 3600 : minute * 60).text], undefined, 1, 1);
		});
	if ((topic.kind !== 'other' || desk) && topic.stats !== false && !c.single && r() < 0.75)
		middle.push(() => say(reporter, c.team, [fill(pick(r, impact[desk ? 'desk' : topic.kind]!), { N: thousands(topic.kind === 'missed' ? int(r, 3000, 60000) : int(r, 120, 4800)), M: String(int(r, 2, 9)) }), aside()], undefined, 0.2, 2));
	if (!desk && topic.log !== 'none' && r() < 0.8) say(reporter, c.team, [pick(r, replyToReplay[topic.kind]!)], undefined, 0.7, 1);
	for (const step of shuffle(r, middle)) step();
	for (const [role, text, at] of [...(topic.weigh ?? []), ...(topic.extra ?? []), ...(c.extra ?? [])]) {
		const [who, label] = by(role);
		say(who, label, [text], at);
	}

	// How it ended.
	const [outcome, lines] = topic.endings[c.end]!;
	lines.forEach(([role, text, at], i) => {
		if (outcome === 'waiting' && i === lines.length - 1 && r() < 0.6 && role !== 'reporter') say(reporter, c.team, [pick(r, bumps)], undefined, 0, 9);
		const [who, label] = by(role);
		const afterDated = i > 0 && lines[i - 1]![2] !== undefined;
		say(who, label, [text], at, i === 0 ? 0.2 : afterDated ? 0.75 : 0.4, i === 0 ? 4 : afterDated ? 1 : 3);
	});
	if (outcome !== 'waiting' && lines.at(-1)![0] !== 'reporter' && r() < 0.4) say(reporter, c.team, [pick(r, thanks.filter(Boolean))]);
	if (desk && r() < 0.7) say(reporter, c.team, [pick(r, deskWraps[outcome === 'waiting' ? 'open' : 'closed']!)], undefined, 0.6, 1);
	if (lines.at(-1)![0] !== 'gate' && r() < 0.65) say(owner, 'Gatehouse', [pick(r, wrapUps[outcome])], undefined, 0.6, 1);

	return [
		`# Report ${number}: ${c.title}`,
		`Filed by ${reporter} (${c.team}) on ${opened} · site: ${c.site} · ${comments.length} comments`,
		...body,
		...comments.map((comment) => `---\n\n${comment}`)
	].join('\n\n') + '\n';
};

// Which cases make up the reports: every topic's first case, then every topic's second, and so on.
const cases: { topic: Topic; c: Case }[] = [];
for (let j = 0; j < Math.max(...topics.map((t) => t.cases.length)); j++) for (const topic of topics) if (topic.cases[j]) cases.push({ topic, c: topic.cases[j]! });

const items: Item[] = [];
for (let index = 0; index < ITEMS; index++) {
	const { topic, c } = cases[index % cases.length]!;
	const r = mulberry32(0xda7e0000 + index * 104729);
	const span = daysBetween(c.when[0], c.when[1]);
	let date = toWeekday(addDays(c.when[0], int(r, 0, span)));
	if (date > c.when[1]) date = addDays(c.when[1], weekday(c.when[1]) === 0 ? -2 : weekday(c.when[1]) === 6 ? -1 : 0);
	if (NAME_CASE_DAYS.includes(date) && !NAME_CASE_DAYS.includes(c.when[0])) date = '2026-10-16';
	items.push({ topic, c, round: Math.floor(index / cases.length), index, date });
}

const folder = join(root, 'docs', 'scoring-reports');
mkdirSync(folder, { recursive: true });
const order = mulberry32(20260701);
const lastByTopic = new Map<Topic, number>();
let number = 3104;
for (const item of [...items].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.index - b.index))) {
	number += int(order, 1, 6);
	writeFileSync(join(folder, `report-${number}.md`), report(item, number, lastByTopic.get(item.topic)));
	lastByTopic.set(item.topic, number);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Scoring reports\n\nThe ${ITEMS} reports filed in the scoring-reports queue between July and November 2026, one file each, with its\nthread as it stood when the queue was exported. The queue's form asked for the site and a description and nothing\nelse, so a report's cause and outcome are only in its thread. Log lines, tables and command output are as their\nwriters pasted them.\n`
);
