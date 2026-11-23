// Writes the long material of this entry's long task: the tickets Harbor's support desk handled between
// 14 September and 30 October 2026, one Markdown file each, under support/tickets/, as the help desk exported
// them, without tags, statuses or assignees. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 194;

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
/** Dollars and cents, as invoices and the billing system show them. */
const money = (cents: number) => `$${Math.floor(cents / 100).toLocaleString('en-US')}.${pad(cents % 100)}`;
/** An amount as the console's Billing page shows it today. */
const consoleMoney = (cents: number) => `$${Math.floor(cents / 100)}.${cents % 100}`;
const base36 = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[int(r, 0, 35)]).join('');
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');

// Time is kept in minutes since 00:00 on 1 September 2026, support's local time.
const EPOCH = Date.UTC(2026, 8, 1);
const LAST_MESSAGE = 73 * 1440 + 17 * 60; // 13 November, 17:00
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const shortDate = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)} ${at(minutes).getUTCFullYear()}`;
const dayMonth = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}`;
const longDate = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!}`;
const stampShort = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${dayMonth(minutes)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${weekday(minutes)} ${longDate(minutes)} 2026, ${clock(minutes)}`;
const iso = (minutes: number) => at(minutes).toISOString().slice(0, 10);
const isoTime = (minutes: number) => `${iso(minutes)} ${clock(minutes)}:${pad(Math.abs(minutes * 7) % 60)}`;
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
const minuteOfDay = (minutes: number) => ((minutes % 1440) + 1440) % 1440;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
const weekdayFrom = (minutes: number) => {
	let m = minutes;
	while (isWeekend(m)) m += 1440;
	return weekday(m);
};

// Harbor's own dates.
const NODE_DEFAULT = 28 * 1440; // 29 September: Node 22 becomes the build image's default
const NODE18_END = '1 December';
const incidents = [
	{ day: 37 * 1440, from: '13:10', to: '16:40', what: 'a build image update that failed on half of the build hosts' },
	{ day: 51 * 1440, from: '09:25', to: '11:15', what: 'a full disk on the queue database' }
];

// People at Harbor.
const agents = ['Priya', 'Tomás', 'Ines', 'Marcus', 'Keiko'];
const platformTeam = ['Dmitri Volkov', 'Aisha Bello', 'Rafael Ortiz'];
const billingLead = 'Grace Liu';
const legalLead = 'Hannah Okafor';

// Customers: the businesses and groups that host a site or an app on Harbor.
type Fw = 'astro' | 'next' | 'svelte' | 'express' | 'eleventy' | 'hugo' | 'django' | 'flask' | 'rails';
interface Framework {
	name: string;
	node: boolean;
	server: boolean;
	build: string;
	listen?: string;
}
const frameworks: Record<Fw, Framework> = {
	astro: { name: 'Astro', node: true, server: false, build: 'astro build' },
	next: { name: 'Next.js', node: true, server: true, build: 'next build', listen: '  ▲ Next.js 14.2.5\n  - Local:        http://localhost:3000\n ✓ Ready in 812ms' },
	svelte: { name: 'SvelteKit', node: true, server: true, build: 'vite build', listen: 'Listening on 0.0.0.0:3000' },
	express: { name: 'Express', node: true, server: true, build: 'tsc -p tsconfig.build.json', listen: 'Server listening on http://localhost:3000' },
	eleventy: { name: 'Eleventy', node: true, server: false, build: 'eleventy' },
	hugo: { name: 'Hugo', node: false, server: false, build: 'hugo --minify' },
	django: { name: 'Django', node: false, server: true, build: 'python manage.py collectstatic --noinput', listen: '[INFO] Starting gunicorn 22.0.0\n[INFO] Listening at: http://127.0.0.1:8000 (1)\n[INFO] Booting worker with pid: 7' },
	flask: { name: 'Flask', node: false, server: true, build: 'pip install -r requirements.txt', listen: '[INFO] Starting gunicorn 22.0.0\n[INFO] Listening at: http://127.0.0.1:5000 (1)\n[INFO] Booting worker with pid: 8' },
	rails: { name: 'Rails', node: false, server: true, build: 'bundle exec rails assets:precompile', listen: 'Puma starting in single mode...\n* Puma version: 6.4.2\n* Listening on http://127.0.0.1:3000' }
};
interface Kind {
	names: string[];
	fw: Fw;
	intro: string[];
	things: string[];
	roles: string[];
}
const kinds: Kind[] = [
	{ names: ['Maple Street Bakery', 'Rise & Crumb', 'Fennel Bakehouse'], fw: 'astro', intro: ['We’re a two-shop bakery; the website is our menu, opening hours and the wholesale form.', 'We’re a small bakery; the site on Harbor is where people check what’s baked today.'], things: ['holiday hours', 'wholesale form', 'autumn menu'], roles: ['Owner', 'Shop manager'] },
	{ names: ['The Long Field Podcast', 'Night Shift Radio', 'Slow Signal'], fw: 'hugo', intro: ['We make a weekly podcast and the site holds the episode pages and the feed.', 'We’re a small podcast team; Harbor hosts our show notes and the feed the apps read.'], things: ['episode 112 notes', 'guest page', 'feed artwork'], roles: ['Producer', 'Host'] },
	{ names: ['Northpaw Studio', 'Kestrel & Finch Design', 'Brightline Creative'], fw: 'next', intro: ['We’re a small design studio and host a handful of client sites through one project.', 'We’re a small agency; our studio site and the client previews live on Harbor.'], things: ['case study page', 'client preview', 'contact form'], roles: ['Studio director', 'Developer'] },
	{ names: ['Eastside Food Pantry', 'Harvest Share', 'Riverbend Community Fridge'], fw: 'eleventy', intro: ['We’re a volunteer-run food pantry; the site lists opening times and where to drop off donations.', 'We’re a community food project with about forty volunteers and one very small website.'], things: ['volunteer rota page', 'donation drop-off map', 'winter hours'], roles: ['Volunteer coordinator', 'Board member'] },
	{ names: ['Tallyhoe', 'Quillnote', 'Pocketledger'], fw: 'svelte', intro: ['I run a small paid web app on the side, about four hundred subscribers.', 'We’re a tiny team with a subscription app; Harbor runs the whole thing.'], things: ['billing settings page', 'CSV export', 'onboarding flow'], roles: ['Founder', 'Co-founder'] },
	{ names: ['Cobalt Bay Maritime Museum', 'Old Mill Heritage Center', 'Prairie Glass Museum'], fw: 'astro', intro: ['We’re a small museum; the site has our exhibitions, opening times and the ticket page.', 'We’re a volunteer-led museum, and I look after the website among other things.'], things: ['winter exhibition', 'school visits page', 'opening times'], roles: ['Collections manager', 'Operations manager'] },
	{ names: ['Juniper Family Dental', 'Seaview Dental', 'Oak Hollow Dentistry'], fw: 'hugo', intro: ['We’re a dental practice with three dentists; the website is mostly information for patients.', 'We’re a family dental practice; an agency built our site a couple of years ago.'], things: ['new patient forms', 'holiday hours', 'team page'], roles: ['Practice manager', 'Office manager'] },
	{ names: ['Pixel Thistle Games', 'Lanternfish Interactive', 'Moss & Ember'], fw: 'next', intro: ['We’re a small game studio; the site has our press kit and the devlog.', 'We’re an indie studio getting ready for a launch, so the site matters more than usual right now.'], things: ['press kit', 'devlog post', 'trailer page'], roles: ['Producer', 'Technical director'] },
	{ names: ['Westfield Robotics Club', 'Ironbark High Robotics', 'Team Gearbox'], fw: 'hugo', intro: ['I’m a teacher and run our school robotics club; the students built the site.', 'We’re a school robotics team, and I’m the parent who ended up with the website.'], things: ['competition results', 'sponsor page', 'season blog'], roles: ['Club advisor', 'Parent volunteer'] },
	{ names: ['Casa Lumbre', 'The Salt Cellar', 'Pho Real Kitchen'], fw: 'eleventy', intro: ['We’re a restaurant with forty covers; the site has the menu and the booking link.', 'We run a small restaurant; the website is the menu, the hours and private dining.'], things: ['dinner menu', 'private dining page', 'holiday hours'], roles: ['Owner', 'General manager'] },
	{ names: ['The Harlow Ledger', 'Cedar Valley Courier', 'Lakeside Weekly'], fw: 'django', intro: ['We’re a small local newspaper; the site is a Django app our previous developer built.', 'We publish a weekly local paper online, a newsroom of four plus freelancers.'], things: ['election coverage page', 'newsletter signup', 'obituaries section'], roles: ['Editor', 'Managing editor'] },
	{ names: ['Ana Ruiz Photography', 'Golden Hour Studio', 'Field & Frame Photo'], fw: 'astro', intro: ['I’m a wedding photographer and my portfolio and client galleries are on Harbor.', 'I run a small photography studio, and the website is basically my shop window.'], things: ['autumn galleries', 'pricing page', 'booking form'], roles: ['Photographer', 'Owner'] },
	{ names: ['Railyard Labs', 'Stackpine', 'Fieldnote API'], fw: 'express', intro: ['We’re a small startup; our public API and its docs both run on Harbor.', 'We’re a small team running an API that a couple of hundred customers call.'], things: ['rate limit headers', 'webhooks endpoint', 'API docs'], roles: ['CTO', 'Backend lead'] },
	{ names: ['St. Columba Community Hall', 'Grace Street Chapel', 'Hillcrest Community Center'], fw: 'hugo', intro: ['We’re a community hall run by volunteers, and the site lists events and room bookings.', 'We’re a small community center; I’m one of the trustees and the website is one of my jobs.'], things: ['events calendar', 'room hire page', 'newsletter archive'], roles: ['Trustee', 'Volunteer'] },
	{ names: ['Woolgather Yarns', 'Tidewater Tea Co.', 'Copper & Clay Ceramics'], fw: 'next', intro: ['We’re a small online shop; the storefront is a Next.js site on Harbor.', 'We sell online, about a hundred orders a week, and the shop runs on Harbor.'], things: ['product pages', 'checkout page', 'gift card page'], roles: ['Owner', 'Operations lead'] },
	{ names: ['Hale & Moreno LLP', 'Brightwater Legal', 'Okafor Law Group'], fw: 'eleventy', intro: ['We’re a law firm of twelve; our website is hosted with you.', 'We’re a small law practice, and our marketing site was set up on Harbor by a contractor.'], things: ['attorney profiles', 'practice areas page', 'office hours'], roles: ['Office manager', 'Operations director'] },
	{ names: ['Kessler Lab', 'Coastal Ecology Lab', 'Vision & Language Group'], fw: 'flask', intro: ['We’re a university research group; Harbor runs our lab site and a small data browser.', 'I’m a postdoc, and somehow I’m the one who looks after our lab’s web app.'], things: ['publications list', 'dataset browser', 'people page'], roles: ['Postdoc', 'Lab manager'] },
	{ names: ['Pine Hollow Public Library', 'Elm Grove Library', 'Brookfield Library Friends'], fw: 'django', intro: ['We’re a small public library, and our events and reading list site is a Django app.', 'We’re the Friends of our local library, with a small site for book sales and events.'], things: ['book sale page', 'story time schedule', 'reading lists'], roles: ['Branch librarian', 'Volunteer'] },
	{ names: ['Spokes Collective', 'Chainline Co-op', 'Freewheel Bike Kitchen'], fw: 'rails', intro: ['We’re a bike co-op; members book repair slots through a little Rails app on Harbor.', 'We’re a volunteer bike workshop, and our booking app was written by a member years ago.'], things: ['repair booking page', 'membership form', 'workshop hours'], roles: ['Coordinator', 'Volunteer'] },
	{ names: ['Still Water Yoga', 'Lotus Loft', 'Heartwood Yoga'], fw: 'svelte', intro: ['We’re a yoga studio, and class bookings run through our own small app.', 'We’re a studio with eight teachers; our timetable and booking app are on Harbor.'], things: ['class timetable', 'teacher pages', 'membership page'], roles: ['Studio owner', 'Studio manager'] },
	{ names: ['Two Rivers Brewing', 'Copperline Ales', 'Gravel Road Brewery'], fw: 'astro', intro: ['We’re a small brewery with a taproom; the site has the tap list and events.', 'We brew and run a taproom, and the website is mostly the tap list and opening hours.'], things: ['tap list', 'events page', 'taproom hours'], roles: ['Taproom manager', 'Co-owner'] }
];
const firstNames = ['Dana', 'Marcus', 'Leilani', 'Owen', 'Rosa', 'Jamal', 'Bettina', 'Kofi', 'Hollis', 'Mira', 'Theo', 'Yusuf', 'Carmen', 'Wren', 'Darius', 'Nadia', 'Felix', 'Imogen', 'Ravi', 'June', 'Silas', 'Amara', 'Grant', 'Lucia', 'Eamon', 'Tessa', 'Viktor', 'Paloma', 'Reggie', 'Sunita', 'Calvin', 'Esme', 'Hector', 'Ingrid', 'Malik', 'Noor', 'Quinn', 'Odette', 'Benji', 'Farida'];
const surnames = ['Whitfield', 'Okoro', 'Halvorsen', 'Delgado', 'Prescott', 'Nakashima', 'Brennan', 'Achterberg', 'Lindgren', 'Mbeki', 'Castellano', 'Fairweather', 'Oyelaran', 'Kowalski', 'Ashdown', 'Reyes', 'Thibodeaux', 'Varga', 'Sundqvist', 'Abernathy', 'Moreau', 'Iqbal', 'Calloway', 'Duarte', 'Pemberton', 'Szabo', 'Whitlock', 'Ferreira', 'Holloway', 'Tran'];
const staffNames = ['Amy', 'Jordan', 'Priscilla', 'Mateo', 'Hana', 'Elliot', 'Simone', 'Kai', 'Beatrix', 'Omar', 'Lena', 'Rory', 'Celeste', 'Ivan', 'Zara', 'Felipe', 'Maya', 'Arlo', 'Nina', 'Tobias'];
const providers = ['mail.example', 'post.example', 'inbox.example', 'fastmail.example'];
const regions = ['us-west', 'us-west', 'us-east', 'eu-central'];
const studios = ['Pine & Pixel', 'Holloway Web', 'Small Hours Studio', 'Ferncliff Digital', 'Eastlight Web Co.'];

const plans = [
	{ name: 'Hobby', cents: 600, memory: '2 GB', bandwidth: 100 },
	{ name: 'Pro', cents: 2400, memory: '4 GB', bandwidth: 1000 },
	{ name: 'Team', cents: 7900, memory: '8 GB', bandwidth: 3000 }
];

// Topics. A ticket follows one path of one topic. Nothing about the topic, its area or its outcome is written into
// the file except through the messages themselves.
type Who = 'c' | 'a' | 'n' | 'p' | 'P' | 'b' | 'B' | 'o' | 'l' | 's';
type Msg = [Who, string];
type Paste = 'panel' | 'mail' | 'deploys' | 'build' | 'health' | 'curlCache' | 'curlCert' | 'dig' | 'cert' | 'claim' | 'consoleBilling' | 'pdf' | 'usage' | 'members' | 'audit' | 'env' | 'queue' | 'payment' | 'none';
interface Path {
	detail: string[];
	paste?: Paste;
	look: string[];
	lookWho?: 'n' | 'p' | 'b';
	/** The project panel when left out. */
	lookPaste?: Paste;
	ends: Msg[][];
	/** The team support hands the ticket to. */
	team?: string;
	/** The ticket may end with a satisfaction survey. */
	happy?: boolean;
	/** The customer's detail already settles the matter, so nobody chases. */
	settled?: boolean;
	/** Which of the topic's openings and first replies fit this path; all when left out. */
	opens?: number[];
	asks?: number[];
}
interface Topic {
	since?: number;
	fits?: (fw: Framework, plan: number) => boolean;
	notify?: 'former' | 'typo' | 'group' | 'freelance' | 'personal';
	mail?: 'bounce' | 'typo' | 'group' | 'quarantine' | 'fine' | 'certWarn';
	build?: 'node' | 'oom' | 'env';
	dig?: 'caa' | 'apex' | 'moved';
	/** The total of the last invoice ends in 1 to 9 cents. */
	oddCents?: boolean;
	/** Pasted in the first message. */
	shows?: Paste;
	/** The shape of the deploy history; taken from `build` or `shows` when left out. */
	history?: 'node' | 'oom' | 'env' | 'health' | 'cache' | 'queue' | 'rollback' | 'plain';
	/** Support answers within the hour. */
	urgent?: boolean;
	/** Who `o` is: the project's owner or the customer's IT contact. */
	other?: 'owner' | 'it';
	subjects: string[];
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}

const topics: Topic[] = [
	// The notification address bounces: it belonged to someone who left.
	{
		notify: 'former',
		mail: 'bounce',
		subjects: ['No more deploy emails?', 'Did you stop sending failure alerts', 'Alerts', 'Not hearing about failed builds', 'Emails from Harbor'],
		open: [
			'Our build failed on {wday} and we only found out because a customer told us the new {thing} wasn’t up. We always used to get an email from Harbor when a deploy failed. Have you stopped sending them, or changed something on your side?',
			'I’ve just realised we haven’t had a single email from Harbor in weeks. Not the deploy failures, not the bandwidth warning, nothing. I know for a fact we had at least two failed builds last week. Is something wrong with our account?',
			'We rely on the failure emails to know when a deploy goes wrong, because nobody sits and watches the deploys. The last one I can find is from {bounceMonth}. Since then, silence, even though {staff} tells me there was a broken build on {wday}.'
		],
		more: ['We’re a small team, so the email really is the only way we find out.', 'I checked spam and the junk folder of the shared inbox. Nothing there either.', 'It isn’t urgent this minute, but I’d like it working before our next release on {day}.'],
		ask: [
			'Nothing has changed about those emails on our side; they still go out for every failed deploy. Which address do you expect them at? I’ll check our mail log for it.',
			'We haven’t changed anything there, so let’s find out where they’re going. Could you tell me which address you’d expect them at? Then I can see what our mail log says.'
		],
		paths: [
			{
				detail: [
					'They should come to… hm. I just looked at the Settings page and it says {notify}. That’s {former}’s address, and {formerFirst} left us in {bounceMonth}. I suppose the mailbox was closed when they went.',
					'The Settings page says the notification email is {notify}. Oh. That’s {former}, who set the project up for us and moved on in {bounceMonth}. I never thought to change it, and I couldn’t anyway: it isn’t editable there.'
				],
				look: [
					'{notify} has hard-bounced since {bounceDate} (mailbox gone) and went on the suppression list after the first bounce, so nothing has been sent to it since. Needs a new address from the customer.',
					'As suspected: user unknown from {bounceDate}, then suppressed. Every alert after that was dropped on our side. Owner is {ownerFull}, so the writer can ask for the change.'
				],
				lookPaste: 'mail',
				ends: [
					[['a', 'That explains it. {notify} started bouncing on {bounceDate}, which means the mailbox no longer exists, and after a bounce like that our mail system stops sending to the address altogether. If you tell me which address you’d like instead, I’ll change it for you.'], ['c', 'Please use {newNotify}. It’s a shared inbox, so this won’t happen again when someone leaves.'], ['a', 'Done: the notification email for {project} is now {newNotify}, and the Settings page shows it. I’ve also sent a test message to it from our side, so you can check it lands in the inbox and not in junk.'], ['c', 'The test arrived, in the inbox. Thanks for sorting it so quickly.']],
					[['a', 'Found it. {notify} has bounced since {bounceDate} because the mailbox is gone, and our mail system stops sending to an address after a bounce like that. The address can’t be changed from the Settings page yet, but I can change it. Where should the alerts go?'], ['c', 'Let’s use {newNotify} for now. And could you make a note somewhere that we’d like to be able to change this ourselves?'], ['a', 'All changed: {newNotify} is now the notification email for {project}, and I sent it a test message a minute ago. I’ve taken the old address off the suppression list too, and passed your request about editing it yourselves on to the console team.'], ['c', 'Got the test. Thank you!']]
				],
				happy: true
			},
			{
				detail: ['The Settings page says {notify}. That would be {former}, who left at the end of {leftMonth}. I’m not sure which address we should use instead. {ownerFirst} decides that sort of thing and is away until {day}.'],
				look: ['{notify}: bounced on {bounceDate}, suppressed since. Waiting for the customer to choose a new address.'],
				lookPaste: 'mail',
				ends: [
					[['a', 'That’s the cause: {notify} has bounced since {bounceDate}, and our mail system stops sending to an address once it bounces like that. Whenever {ownerFirst} has picked a new address, reply here and I’ll change it straight away and send a test to it.'], ['c', 'Will do, thanks. I’ll catch {ownerFirst} when they’re back.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.']],
					[['a', '{notify} has been bouncing since {bounceDate}, so nothing has reached anyone since then. As soon as you know which address to use, let me know and I’ll switch it over.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.'], ['s', 'Ticket closed automatically after fourteen days without a reply.']]
				]
			}
		]
	},
	// Proving that alerts arrive before a launch: the messages sit in a quarantine.
	{
		mail: 'quarantine',
		other: 'it',
		subjects: ['Testing notifications', 'How do we test alerts?', 'Launch checklist question', 'Notification test', 'Are alerts working?'],
		open: [
			'We launch on {day} and our checklist says “confirm deploy failure alerts reach the on-call inbox”. Is there a way to set off a test notification without breaking a build on purpose? I couldn’t find anything in the console.',
			'{ownerFirst} wants proof before the launch that a failed deploy actually emails someone. I can see the notification address on the Settings page, but nothing that sends a test. Do I really have to push a broken commit to find out?',
			'We had a scare last month when a deploy failed and nobody remembers seeing an email. Before anything else I’d like to know whether the alerts reach us at all. Can you send one?'
		],
		more: ['The address on the Settings page is {notify}, which is right.', 'Our IT people are strict about outside email, so I wouldn’t be surprised if something is being caught.', 'Happy to break a build if that’s the only way, but it seems a clumsy test.'],
		ask: [
			'There isn’t a way to send one from the console yet, but I can send a test message from our side to {notify}. Shall I go ahead?',
			'You don’t need to break anything: I can send a test notification from our admin tool. It goes to the address on the Settings page, {notify}. Is that the one you want to check?'
		],
		paths: [
			{
				detail: ['Yes please, go ahead. I’ll keep an eye on the inbox.', 'Yes, that’s the address. Send away.'],
				look: ['Sent a test message to {notify} from the admin tool at {sent}. Their server accepted it (250). If they don’t see it, it’s their filtering.', 'Test sent at {sent}, accepted by the receiving server. Earlier alerts to the same address were all accepted too, so they have been arriving somewhere.'],
				lookPaste: 'mail',
				ends: [
					[['a', 'I sent it at {sent}, and your mail server accepted it, as it has accepted every alert we sent this month. If it isn’t in the inbox, it’s probably being held by a filter on your side. It comes from notifications@harbor.example.'], ['c', 'Not in the inbox. I asked {other} and it was in our quarantine, along with four deploy alerts from {lastMonth} that nobody ever saw. {otherFirst} has allowed notifications@harbor.example now.'], ['a', 'That makes sense of the scare last month too. Shall I send one more so you can see it come straight through?'], ['c', 'Yes please. … And there it is, in the inbox this time. Thank you, that’s a weight off.']],
					[['a', 'Sent at {sent}, and accepted by your mail server. Can you see it? If not, look for anything held from notifications@harbor.example.'], ['o', 'Hello, I look after IT for {biz}. The test and several earlier alerts were held by our mail gateway as bulk mail. I’ve added notifications@harbor.example to the allow list, so they’ll come through from now on.'], ['c', 'Thanks both. I’ve released the old ones too, and there’s the failed deploy from {lastMonth} we never heard about.'], ['a', 'Glad we found it. The alerts will come straight through from now on.']]
				],
				happy: true
			},
			{
				detail: ['Yes, {notify}. Please send it.'],
				look: ['Test sent at {sent}; delivered. Customer is asking for a self-serve test, which is the console request we already track.'],
				lookPaste: 'mail',
				ends: [
					[['a', 'Sent at {sent}. Your mail server accepted it, so it should be with you now.'], ['c', 'Got it, thank you. Here’s my real question though: our on-call inbox changes every quarter when the rota moves, and I don’t want to write to you each time to ask for a test. Can we send these ourselves?'], ['a', 'Not yet, I’m afraid. A test message from the Settings page is something the console team is working on, and I’ve added your ticket to that request so they know who’s waiting. Until it’s out, just write in and we’ll send one whenever you need it.'], ['c', 'Fair enough. We’ll wait for that, then. Please let me know when it’s there.']],
					[['a', 'Done: sent at {sent} and accepted by your server.'], ['c', 'Thanks, it’s here. Is there really no way for us to do this from the console? We change the address whenever someone new joins the rota, and I’d like to check it each time without bothering you.'], ['a', 'There isn’t yet. The console team plans to let you send a test from the Settings page, and your ticket is now linked to that piece of work. I’ll update this ticket when it ships.'], ['c', 'OK, we’ll wait for that.']]
				]
			},
			{
				detail: ['Yes, please send it.'],
				look: ['Test sent at {sent}, accepted by their server. Earlier alerts to this address were accepted too.'],
				lookPaste: 'mail',
				ends: [[['a', 'It went at {sent} and your mail server accepted it. If it isn’t in the inbox, something on your side is holding it. It will be from notifications@harbor.example.'], ['c', 'Nothing in the inbox or junk. I’ve asked {other}, who looks after our email, to check the quarantine, but {otherFirst} is only in on {day}. I’ll let you know.'], ['a', 'Thanks. When {otherFirst} has had a look, reply here and I can send another test to check it comes through.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.']]]
			}
		]
	},
	// Alerts sent to a group address that turns away outside senders.
	{
		notify: 'group',
		mail: 'group',
		other: 'it',
		subjects: ['Group address not receiving', 'Alerts to our team list', 'Notifications stopped after we changed the address', 'Changed email, now nothing arrives'],
		open: [
			'Last month you changed our notification email to {notify} for us, so the whole team gets the alerts. Since then nobody has received anything, and I know at least one deploy failed. Did the change go through?',
			'We moved our alerts to a group address, {notify}, a few weeks ago. Before that they came to me and worked fine. Now, nothing. Can you check whether you’re sending anything at all?'
		],
		more: ['The group definitely exists: I send messages to it myself.', 'Everyone on the team is in the group, I checked the member list.'],
		ask: ['The change did go through, and we have been sending. Let me look at what happened to those messages on the way and come back to you.', 'Yes, {notify} is the address on your project, and alerts have gone out to it. Give me a moment to check the mail log for what the receiving server said.'],
		paths: [
			{
				detail: ['Thanks. For what it’s worth, the group is on our company email, and {other} set it up.'],
				look: ['Every message to {notify} since the change has been refused: 550 5.7.1, the group only accepts mail from its members. Their group settings, not us.', 'Group rejects outside senders (550 5.7.1). Not suppressed, because it’s a policy refusal rather than a dead mailbox, but nothing is getting through.'],
				lookPaste: 'mail',
				ends: [
					[['a', 'I’ve found it. Every alert since the change has been refused by your mail system with “the group only accepts mail from its members”: only people inside the group can post to it, and our alerts come from outside. Whoever manages the group can allow outside senders, or just notifications@harbor.example.'], ['c', 'Ah, that rings a bell. I’ve passed it to {otherFirst}. They say they’ll change it in next week’s maintenance window, because group policy changes go through their change process.'], ['a', 'That’s fine. Once it’s done, reply here and I’ll send a test to check it comes through.']],
					[['a', 'The messages reach your mail system, but it turns them away: the group only accepts mail from its own members, so alerts from notifications@harbor.example are refused. The person who manages the group will need to let outside senders post to it.'], ['c', 'Understood. I’ve raised it with our IT team, but it has to be approved by our security lead, so it might be a little while.'], ['a', 'No problem. When it’s changed, let me know and I’ll send a test.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.']]
				]
			},
			{
				detail: ['OK. While you look: {other} is copied in, since they manage our email.'],
				look: ['550 5.7.1 on every message since the change: the group refuses outside senders. Told them; their IT is on the thread.'],
				lookPaste: 'mail',
				ends: [[['a', 'Thanks for copying {other} in. Every alert since the change was refused with “the group only accepts mail from its members”. The group needs to accept mail from notifications@harbor.example, or from outside senders in general.'], ['o', 'Thanks, that’s clear. I’ve allowed outside senders for that one group. Could you send something to check?'], ['a', 'Sent a test just now, and this time your server accepted it.'], ['c', 'It arrived for all of us. Thanks both!']]],
				happy: true
			}
		]
	},
	// More than one address for the alerts.
	{
		notify: 'personal',
		subjects: ['Alerts to two people', 'More than one notification address?', 'Second email for notifications', 'Notifications question'],
		open: [
			'Can notification emails go to more than one address? I’d like {staff} and me both to get the deploy failure emails, because I’m often away from my desk.',
			'At the moment the alerts only go to {notify}. Is there a way to add a second address? {staff} has taken over half of the deploys and should hear about failures too.',
			'Simple question: the Settings page has one notification email. Can I have two? Or three, ideally: me, {staff} and our freelancer.'
		],
		more: ['I looked on the Settings page, but the address there isn’t something I can edit.', 'If the answer is “use a mailing list”, that’s fine, I just want to know.'],
		ask: [
			'Each project has one notification address at the moment. Most teams point it at a mailing list or a shared alias, so that it reaches several people. Would that work for you?',
			'There’s only one notification address per project today. The usual way round it is a list or group address that forwards to everyone. Can you set one up on your side?'
		],
		paths: [
			{
				detail: ['Yes, we can do that. I’ve made a list called {newNotify}. Can you point the alerts there?', 'A list it is. {newNotify} now forwards to {staff} and me. Please change the address to that.'],
				look: ['Changed notification email from {notify} to {newNotify} at the customer’s request; sent a test, accepted.'],
				lookPaste: 'audit',
				ends: [[['a', 'Done: alerts for {project} now go to {newNotify}, and I’ve sent a test message to it.'], ['c', '{staff} and I both got it. Perfect, thank you.']], [['a', 'All set. {newNotify} is now your notification email, and a test message went to it a moment ago.'], ['c', 'Arrived for both of us. Thanks!']]],
				happy: true
			},
			{
				detail: ['We can’t, unfortunately: our email plan doesn’t include lists or aliases, and changing plans is a whole thing. Is more than one address on your roadmap?'],
				look: ['Customer can’t create lists. Linked the ticket to the console request for several notification addresses.'],
				ends: [[['a', 'I understand. Several notification addresses per project is a request the console team already has, and I’ve added your ticket to it so they know who’s waiting. I can’t promise a date, but I’ll update you here when it changes.'], ['c', 'OK. We’ll manage with one address until then. Thanks for being straight about it.']], [['a', 'Sorry, there’s nothing on our side today. I’ve added you to the console team’s request for more than one notification address, which is where this would be built.'], ['c', 'Thanks. Please do let me know when that’s possible.']]]
			},
			{
				detail: ['I’ll ask {staff} whether we can set up a list. Back to you soon.'],
				look: ['Suggested a list address; waiting for the customer.'],
				lookPaste: 'none',
				ends: [[['a', 'Sounds good. When you have a list address, send it over and I’ll change it.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.'], ['s', 'Ticket closed automatically after fourteen days without a reply.']]]
			}
		]
	},
	// A typo in the notification address since sign-up; the customer asks about bandwidth.
	{
		notify: 'typo',
		mail: 'typo',
		subjects: ['Bandwidth warning?', 'Never got the usage warning', 'Usage at 90%', 'Question about limits'],
		open: [
			'I noticed in `harbor usage` that we’re at 90% of our bandwidth for the month. A friend who also hosts with you says Harbor emails you at 80%. We never got anything. Is that only on some plans?',
			'Our bill this month had a small overage on it, which is fine, but I was surprised: I thought Harbor warned you before you went over. Is that not a thing any more?'
		],
		more: ['Not complaining about the overage, I just want to know how this is supposed to work.', 'We’re on {plan}, if that matters.'],
		ask: ['We do send a warning at 80% of the month’s bandwidth on every plan, to the project’s notification email. Let me check whether yours went out and where it went.', 'The 80% warning goes out on all plans, to the notification address. I’ll have a look at what happened to yours.'],
		paths: [
			{
				detail: ['Thanks. I don’t even know what our notification address is, to be honest.', 'Thank you. I assume it goes to my email, {email}?'],
				look: ['Notification email is {notify}: typo in the domain ({typoDomain} doesn’t exist). Every message since sign-up has failed and the address is suppressed. Probably mistyped at sign-up.'],
				lookPaste: 'mail',
				ends: [
					[['a', 'Found it. The notification email on your project is {notify}. The domain has a typo in it, so every warning and alert since you signed up has failed to send, the 80% warning included. If you tell me the right address, I’ll correct it.'], ['c', 'Oh no, that’s my typing. It should be {newNotify}.'], ['a', 'Corrected: {newNotify} is now the notification email for {project}. I sent a test message so you can check it arrives. You’ll get the warnings and the deploy failure emails there from now on.'], ['c', 'Got the test. Thank you, and sorry for the trouble.']],
					[['a', 'The warning went out, but to {notify}, which has a typo in the domain, so no message has ever reached it. Shall I correct it to {newNotify}, or would you rather use another address?'], ['c', 'The corrected one is fine, please.'], ['a', 'Done, and a test message is on its way to {newNotify}.'], ['c', 'Received. Thanks for spotting that!']]
				],
				happy: true
			}
		]
	},
	// A freelancer still gets a former client's alerts.
	{
		notify: 'freelance',
		mail: 'fine',
		other: 'owner',
		subjects: ['Please take me off these emails', 'Not my project any more', 'Unsubscribe', 'Wrong recipient for alerts'],
		open: [
			'I built a site for {biz} over a year ago and handed it over, but I still get their deploy failure emails. Three this week. Could you take me off, please? I don’t have access to their project any more.',
			'I’m a freelance developer. One of my old clients, {biz}, still has my address as their notification email, and I’m getting their alerts. I don’t want them to miss these, and I don’t want them in my inbox.'
		],
		more: ['I’ve no idea who looks after their site now.', 'I tried to unsubscribe, but there’s no link in the emails.'],
		ask: [
			'Thanks for telling us. That project belongs to {biz}, so I can only change its notification address when one of its owners asks. Could you ask them to write to us, or copy them into this ticket?',
			'Sorry about that. Because the project is {biz}’s, the change has to come from one of its owners. If you can put us in touch, or copy them in here, I’ll sort it out with them.'
		],
		paths: [
			{
				detail: ['I’ve copied in {other} from {biz}, who I think is the owner now.'],
				look: ['Owner on the project is {ownerFull}, matches the person copied in. Notification email is still {notify}.'],
				ends: [[['o', 'Hi, {otherFirst} from {biz} here. Sorry, {name}! Please send the alerts to {newNotify} instead.'], ['a', 'Thanks, {ownerFirst}. Done: notification email for {project} is now {newNotify}, and I’ve sent a test message to it. {name}, you won’t get any more of these.'], ['c', 'Thanks both!']]],
				happy: true
			},
			{
				detail: ['I’ve emailed {biz}, but they’re slow to answer at the best of times. I’ll let you know.', 'I’ll ask them. It may take a while: the person I worked with has left.'],
				look: ['Owner on file: {ownerFull}. Waiting for an owner to write in; nothing changed yet.'],
				ends: [[['a', 'Thanks. As soon as an owner of the project writes in, I’ll change the address. In the meantime, a filter on emails from notifications@harbor.example that mention {project} will keep them out of your way.'], ['c', 'Good idea, I’ll do that for now.']]]
			}
		]
	},
	// Builds fail after the build image's default Node version moved to 22.
	{
		since: NODE_DEFAULT + 1440,
		build: 'node',
		fits: (fw) => fw.node,
		shows: 'build',
		subjects: ['Build broken since this week', 'npm ci fails on Harbor, works locally', 'Deploys failing', 'Nothing changed but builds fail', 'Build error'],
		open: [
			'Our builds started failing on {wday} and we haven’t touched the dependencies in weeks. It still builds fine on my laptop. Did something change on Harbor?',
			'Every deploy since {wday} fails during the install step. The commit that broke it only changed some text on the {thing}, so I don’t see how it can be our fault. Log below.',
			'Help! We need to get a fix out today and the build won’t go through. Error log below. Locally everything is fine.'
		],
		more: ['I’ve tried deploying an older commit as well, and it fails the same way.', 'I’ve tried clearing the build cache with `harbor deploy --clean`, same result.'],
		ask: [
			'On 29 September our build image moved its default from Node 18 to Node 22, and your log shows the build running on 22. The package that fails has no build for Node 22 at the version you use. Is your project meant to run on Node 18?',
			'Thanks for the log. Since 29 September builds use Node 22 unless the project asks for another version, and {native} at that version doesn’t install on 22. Do you know which Node version you run locally?'
		],
		paths: [
			{
				detail: ['I’m on Node 18 locally, yes. What’s the best fix?', 'Locally it’s 18.20. I didn’t know you’d changed the default.'],
				look: ['Last good deploy on 18, failures since the default moved to 22. Native module without a Node 22 build. Suggest upgrading it, or engines 18.x as a stopgap.'],
				lookPaste: 'deploys',
				ends: [
					[['a', 'Two ways. The better one is to upgrade {native} to a recent version, which supports Node 22. The quick one is to tell us the version you need: add `"engines": { "node": "18.x" }` to package.json and the build will use Node 18. Node 18 builds stay available until ' + NODE18_END + ', so I’d treat that as temporary.'], ['c', 'Upgraded {native}, ran the tests, deployed. Green again. Thank you, and thanks for explaining the deadline.']],
					[['a', 'The quickest fix is to pin the version: add `"engines": { "node": "18.x" }` to your package.json, or set HARBOR_NODE_VERSION=18 with `harbor env set`. That works until ' + NODE18_END + ', when Node 18 builds stop. Before then it would be worth upgrading {native}, since recent versions support Node 22.'], ['c', 'Pinned it to 18 and the deploy went through. I’ve put the upgrade on our list for November. Thanks!']]
				],
				happy: true
			},
			{
				detail: ['We can’t move off 18 yet: {native} is pulled in by a library we can’t upgrade until its maintainers release a new version, which they say is “early next year”. Can Node 18 stay available for us after December?'],
				look: ['Customer pinned to 18 and is asking for Node 18 builds beyond ' + NODE18_END + '. That’s a platform decision; passing it on.'],
				lookPaste: 'deploys',
				team: 'the platform team',
				ends: [[['a', 'For now, `"engines": { "node": "18.x" }` in package.json will get your builds going again. Keeping Node 18 for a project after ' + NODE18_END + ' isn’t something I can decide, so I’ve passed your request to our platform team, and they’ll reply on this ticket.'], ['c', 'Pinned, and builds work again. Thanks. I’ll wait to hear from the platform team about December.'], ['p', 'Seen. We’ll discuss exceptions for Node 18 at the platform review on {day} and answer the customer after that.']]]
			}
		]
	},
	// Builds killed for using too much memory.
	{
		build: 'oom',
		fits: (fw, plan) => fw.node && plan < 2,
		shows: 'build',
		subjects: ['Build killed', 'Exit code 137', 'Out of memory during build', 'Deploy fails at the build step', 'Builds failing at random'],
		open: [
			'Our builds have started failing during the build step with exit code 137. Sometimes a second deploy of the same commit goes through, sometimes not. Log below.',
			'Since we added the {thing}, about half our builds fail. The log says the process was killed. What’s killing it?',
			'Deploys fail with “Process killed (exit code 137)”. Nothing in our code says that. Is something wrong with your build servers?'
		],
		more: ['Locally the build takes about two minutes and works every time.', 'We added a lot of images last week, if that’s relevant.'],
		ask: [
			'Exit code 137 means the build used more memory than your plan allows, {mem} on {plan}, and was stopped. It looks random because it depends on how close to the limit each build runs. How big has the site grown lately?',
			'That code means the build ran out of memory: {plan} builds get {mem}. Your log shows the heap running right up to that before the process was stopped. Did something large come in recently?'
		],
		paths: [
			{
				detail: ['A lot more pages and images since {month}. So the answer is a bigger plan?'],
				look: ['Build peaks right at the {mem} limit. {nextPlan} has {nextMem}; customer is considering it.'],
				lookPaste: 'deploys',
				ends: [[['a', 'That’s one answer: {nextPlan} builds get {nextMem}, plenty of room. The other is a lighter build, for example processing images once instead of on every build. If you’d like to move to {nextPlan}, I can do that now and the new price applies from today.'], ['c', 'We’ll go up to {nextPlan}, it’s simpler. Please switch us.'], ['a', 'Done: {project} is on {nextPlan} from today, and your next build gets {nextMem}. The difference for this month will be on your next invoice.'], ['c', 'Two deploys in a row went through. Thanks.']]],
				happy: true
			},
			{
				detail: ['We can’t really afford {nextPlan} right now. Is there any way to get a bit more memory for a couple of weeks while we slim the build down?'],
				look: ['Asking for a temporary memory raise on {plan}. Not ours to grant; passing to platform.'],
				lookPaste: 'deploys',
				team: 'the platform team',
				ends: [[['a', 'Our platform team can make temporary exceptions to build limits, so I’ve passed your request to them with your build history. They’ll reply here. Meanwhile, setting NODE_OPTIONS=--max-old-space-size={heap} sometimes keeps a build just under the limit.'], ['c', 'Thanks, I’ll try NODE_OPTIONS and wait to hear from them.'], ['p', 'Picked up. We’ll look at their builds and decide on a temporary limit this week.']]]
			},
			{
				detail: ['We generate thumbnails for every photo during the build. Would moving that out help?'],
				look: ['Image step is most of the memory. Suggested pre-generating images.'],
				lookPaste: 'deploys',
				ends: [[['a', 'Very likely: that step is where your log shows memory climbing. If you generate the thumbnails once and commit them, or only for new photos, the build should stay well under {mem}.'], ['c', 'Moved the thumbnails out of the build. Builds now peak at about half the limit and take a minute less. Thanks for pointing at the right thing.']]],
				happy: true
			}
		]
	},
	// The site still shows the old version after a deploy.
	{
		shows: 'curlCache',
		subjects: ['Site not updating', 'Old version still showing', 'Deploy succeeded but nothing changed', 'Changes not live'],
		open: [
			'The deploy says it succeeded, but the site still shows the old {thing}. I’ve tried another browser and my phone. What’s going on?',
			'We pushed an update to the {thing} two hours ago, Harbor says it’s live, and yet visitors still see yesterday’s version. This matters because the old page has the wrong dates on it.'
		],
		more: ['I’ve pasted what curl says below.', 'It happened once before and fixed itself the next day, but we can’t wait a day this time.'],
		ask: ['Thanks for the headers, they help. Can you tell me which branch you deployed from, and whether you set any cache headers yourselves?', 'I’ll look at the deploy. Meanwhile: do you set your own Cache-Control headers anywhere in the project, in a config file or a `_headers` file?'],
		paths: [
			{
				detail: ['From main. And yes, now you mention it, {staff} added a `_headers` file in {month} to make the images load faster.'],
				look: ['Deploy is live, but their `_headers` gives HTML a max-age of {maxAge}, so the edge serves the old copy until it expires. Purged the edge for them.'],
				lookPaste: 'deploys',
				ends: [[['a', 'That’s it. The `_headers` file tells browsers and our edge to keep every page for {maxAge}, not only the images. I’ve cleared the edge copy for you now, so new visitors get the new page. For the future, I’d keep the long cache for images and set HTML to `max-age=0, must-revalidate`.'], ['c', 'That did it, and {staff} has changed the file to do just that. Thanks for the clear explanation.']]],
				happy: true
			},
			{
				detail: ['I deployed from the {previewBranch} branch, if that matters. I’m not aware of any cache settings.'],
				look: ['The deploy went to a preview of {previewBranch}, not production. Production is still on the last main deploy.'],
				lookPaste: 'deploys',
				ends: [[['a', 'That’s the reason: deploys from branches other than main go to a preview address. Your change is live at {previewBranch}--{project}.onharbor.example. To put it on {domain}, merge it into main, or run `harbor deploy --prod` from that branch.'], ['c', 'Merged into main and it’s live. I didn’t know about previews, that’s actually really useful. Thanks!']]],
				happy: true
			}
		]
	},
	// The app starts but doesn't listen where Harbor expects.
	{
		fits: (fw) => fw.server,
		shows: 'health',
		subjects: ['Deploy keeps getting rolled back', 'Health check failed', 'App won’t start on Harbor', 'New deploy never goes live'],
		open: [
			'Our deploys build fine, then sit there for a minute and fail with “health check failed”. The old version stays up, which is lucky, but we can’t ship anything. Logs below.',
			'We moved our app to a new server setup last week, and since then no deploy goes live. The build is green. The app logs say it’s running. Harbor says it isn’t.'
		],
		more: ['It runs fine locally with the same start command.', 'We changed the start command on {wday}, if that’s relevant.'],
		ask: ['Your app is running, but listening on port {appPort}, and Harbor sends traffic to the port in the PORT variable, 8080 here, so the health check finds nothing. Can your start command read PORT?', 'The logs show the app listening on {appPort} on localhost, while Harbor checks the port in the PORT environment variable on all addresses. Is the port set in your code or config?'],
		paths: [
			{
				detail: ['It’s hard-coded, yes. I can change that.', 'It’s in our config file. I’ll make it read PORT.'],
				look: ['App listens on {appPort}/localhost, platform expects $PORT on 0.0.0.0. Customer is fixing it.'],
				lookPaste: 'deploys',
				ends: [[['c', 'Changed it to read PORT and listen on all addresses, deployed, and it’s live. Thanks!'], ['a', 'Great. For anyone reading this later: the app has to listen on the port in PORT, on 0.0.0.0.']], [['c', 'Done, and it went live first time. That was quick, thank you.']]],
				happy: true
			},
			{
				detail: ['The server part was written by a contractor and I don’t know my way around it. I’ll have to ask them to change it, and they’re booked up until {day}.'],
				look: ['Same cause. The customer needs their contractor to change the code; old version stays live meanwhile.'],
				lookPaste: 'deploys',
				ends: [[['a', 'Understood. Until then your current version stays live, so nothing is down. When the contractor has made the change, deploy as usual, and if it still fails, send me the new log.'], ['c', 'Thanks. I’ll forward them this ticket so they know exactly what to change.']]]
			}
		]
	},
	// A teammate removed an environment variable; the build blames Harbor.
	{
		build: 'env',
		shows: 'build',
		subjects: ['Harbor broke our build', 'Build fails: missing variable', 'Builds failing since this morning', 'Environment variable disappeared?'],
		open: [
			'Since this morning every build fails saying {envVar} is missing. We never touched it. Did Harbor lose our environment variables? Log below.',
			'Our builds are failing with an error about {envVar}. It has been set for months. Is there a problem with environment variables on your side?'
		],
		more: ['This is blocking a fix we need to get out today.', 'I haven’t changed anything in the project settings, I promise.'],
		ask: ['I’ll check the project’s history. Could you run `harbor env list` and paste what it shows?', 'Nothing is wrong with environment variables generally. Can you paste the output of `harbor env list` for the project, so I can compare?'],
		paths: [
			{
				detail: ['Here you go. I can see {envNew} there, which looks right to me.'],
				paste: 'env',
				look: ['Audit log: {staffFull} removed {envVar} and added {envNew} on {wday}. Code reads {envVar}. Renamed by a teammate, not lost.'],
				lookPaste: 'audit',
				ends: [
					[['a', 'Found it in the project’s audit log: on {wday}, {staffFull} removed {envVar} and added {envNew}. Your code still reads {envVar}, so the build can’t find it. Setting {envVar} again, or changing the code to read the new name, will fix it.'], ['c', 'Ha. {staff} was tidying up the names and didn’t know the build used the old one. Set it back and the build is green. Sorry for blaming you!'], ['a', 'No harm done. Glad it was a quick one.']],
					[['a', 'The audit log shows {staffFull} renamed it on {wday}: {envVar} was removed and {envNew} added with the same kind of value. The build reads {envVar}, hence the error. If you set {envVar} again, the next deploy should go through.'], ['c', 'Confirmed with {staff}, set it back, deployed fine. Can I stop members changing these in future?'], ['a', 'Yes: only owners and admins can change environment variables. {staff} is an admin on the project; if that’s more than they need, we can make them a member.'], ['c', 'They do need it, it was just a mix-up. Thanks!']]
				],
				happy: true
			}
		]
	},
	// Deploys queued for a long time during a platform incident.
	{
		history: 'queue',
		shows: 'deploys',
		urgent: true,
		subjects: ['Deploy queued for ages', 'Deploys waiting in the queue', 'Deploys not starting', 'Is Harbor down?'],
		open: [
			'Our deploy has been “queued” for over forty minutes. Normally it starts in seconds. Is there a problem?',
			'Nothing we deploy starts building. Three deploys sitting queued since lunchtime. We have a fix waiting to go out.'
		],
		more: ['The status page says everything is fine, which is confusing.', 'This is our busiest day of the week.'],
		ask: ['Sorry about this. We had a backlog in the build queue {incidentWhen}, caused by {incidentWhat}. It’s being worked on now. Your deploys are in the queue and will start once it clears.', 'Yes, our build queue was badly backed up {incidentWhen}; the platform team is on it. You don’t need to do anything: queued deploys will run in order.'],
		paths: [
			{
				detail: ['OK, thanks for confirming. Please let me know when it’s cleared.'],
				look: ['Their deploys were in the backlog; all three ran after {incidentTo}. Latest is live.'],
				lookWho: 'n',
				lookPaste: 'queue',
				ends: [[['a', 'The queue cleared at {incidentTo}, and your deploys ran in order. The latest one is live now. Sorry for the wait, and for the status page: it should have said something, and the platform team are changing how it’s updated.'], ['c', 'Live and working. Thanks for keeping us posted.']]],
				happy: true
			},
			{
				detail: ['It’s gone through now, but the broken {thing} was up for most of an afternoon, and that cost us. Is there any compensation for this?'],
				look: ['Their deploys waited until {incidentTo}. Asking for a credit; that’s for billing.'],
				lookPaste: 'queue',
				team: 'billing',
				ends: [[['a', 'I’m sorry, that’s a real cost. Credits are decided by our billing team, so I’ve passed this to {billingFirst} there with the times of your deploys. She’ll reply on this ticket.'], ['c', 'Thank you.'], ['b', 'Picked up. Will look at their deploy times against the incident window and reply by {day}.']]]
			}
		]
	},
	// A broken release: putting the previous deploy back.
	{
		history: 'rollback',
		shows: 'deploys',
		urgent: true,
		subjects: ['Urgent: broken release', 'Need to go back to yesterday’s version', 'Roll back?', 'Site broken after deploy'],
		open: [
			'We just deployed and the {thing} is broken for everyone. I need yesterday’s version back right now. How do I do that?',
			'Bad release this morning. The site loads but the {thing} shows an error. Can you put the previous deploy back while we fix it?'
		],
		more: ['Deploy list below.', 'I’m on my phone, so I can’t run much.'],
		ask: ['You can put any earlier deploy back with `harbor rollback <deploy id>`, which is instant. From your list, that would be `harbor rollback {dplOld}`. Can you run that, or shall I do it for you?', 'The fastest way is `harbor rollback {dplOld}`: it makes that deploy live again without a new build. If you aren’t at a computer, I can do it from our side.'],
		paths: [
			{
				detail: ['Ran it. The old version is back. Thank you!'],
				settled: true,
				look: ['Customer rolled back to {dplOld} themselves.'],
				lookPaste: 'deploys',
				ends: [[['a', 'Great. When the fix is ready, a normal deploy will replace it.'], ['c', 'Fixed and deployed properly now. Thanks for the quick answer.']]],
				happy: true
			},
			{
				detail: ['Please do it for me, I really am only on my phone.'],
				look: ['Rolled {project} back to {dplOld} from the admin tool at the customer’s request.'],
				lookPaste: 'deploys',
				ends: [[['a', 'Done: {dplOld} is live again, as of {sent}. Your broken deploy is still in the list, so you can look at it later.'], ['c', 'Confirmed, the {thing} works again. You’re a star.']]],
				happy: true
			}
		]
	},
	// A certificate isn't issued: a CAA record allows only another authority.
	{
		dig: 'caa',
		shows: 'dig',
		subjects: ['Not secure warning', 'SSL problem on our domain', 'Certificate error since moving to Harbor', 'HTTPS not working'],
		open: [
			'We pointed {domain} at Harbor on {wday}. The site loads, but every browser says the connection isn’t secure. What have we done wrong?',
			'Since we moved {domain} over, people get a big security warning. The onharbor.example address works fine. Can you help?'
		],
		more: ['Our DNS records are below.', 'I followed the steps in the docs exactly.'],
		ask: ['Your DNS points at us correctly, but the CAA record on {domain} only allows DigiCert to issue certificates, so the authority we use, Let’s Encrypt, is refused. Who looks after your DNS?', 'The A records are right. What stops us is the CAA record: it lists only digicert.com, so our certificate request is refused. Can you add Let’s Encrypt to it?'],
		paths: [
			{
				detail: ['I do. I didn’t even know that record was there; our old host must have added it.'],
				look: ['CAA allows only digicert.com; issuance failing. Customer adding letsencrypt.org.'],
				lookPaste: 'cert',
				ends: [[['a', 'Add a second CAA record, `0 issue "letsencrypt.org"`, alongside the existing one or instead of it. We try to issue again every hour, so it should sort itself out soon after.'], ['c', 'Added it, and twenty minutes later the warning has gone. Thank you!']]],
				happy: true
			},
			{
				detail: ['Our DNS is run by {other} at head office, not by me. I’ve forwarded them your message.'],
				look: ['CAA blocks Let’s Encrypt. Customer’s DNS is managed by someone else; waiting for them.'],
				lookPaste: 'cert',
				ends: [[['a', 'Thanks. The record they need is `0 issue "letsencrypt.org"`. Once it’s there, the certificate is issued within the hour, without you needing to tell us.'], ['c', '{otherFirst} says it’s on their list for next week. I’ll come back if it doesn’t work after that.']]]
			}
		]
	},
	// A CNAME at the zone apex.
	{
		dig: 'apex',
		subjects: ['DNS provider won’t accept the record', 'Can’t add CNAME for our domain', 'Custom domain setup', 'Domain help please'],
		open: [
			'I’m trying to point {domain} at Harbor. The docs say to add a CNAME to edge.onharbor.example, but my DNS provider says “CNAME not allowed at the zone apex”. What now?',
			'Adding our domain is going badly. www works, the bare domain doesn’t, and my DNS provider refuses the CNAME. Screenshot text below.'
		],
		more: ['I’m not a DNS person, so please go slowly.', 'We want people to reach us at {domain} without the www.'],
		ask: ['For the bare domain, use A records instead of a CNAME: `{domain} A 203.0.113.10` and `{domain} A 203.0.113.11`. Keep the CNAME for www. Does your provider let you add those?', 'That’s normal: most providers don’t allow a CNAME on the bare domain. Use two A records pointing at 203.0.113.10 and 203.0.113.11, and keep www as a CNAME.'],
		paths: [
			{
				detail: ['It does. Added both. Is that it?'],
				look: ['Apex A records now point at the edge; certificate issued for both names.'],
				lookPaste: 'dig',
				ends: [[['a', 'That’s it. Both names point at us now, and the certificate for {domain} and www.{domain} was issued a few minutes ago.'], ['c', 'Works, with the padlock. Thanks for the patience.']]],
				happy: true
			},
			{
				detail: ['Our provider doesn’t let me add A records for the bare domain either, only forwarding. Is there another way?'],
				look: ['Provider only offers forwarding at the apex. Suggested www as primary with a redirect from the bare domain.'],
				lookPaste: 'dig',
				ends: [[['a', 'Yes: make www.{domain} your main address and use the provider’s forwarding to send {domain} to it. Visitors who type the bare domain land on www. In Harbor, run `harbor domains primary www.{domain}`.'], ['c', 'Done, and it works both ways. Good enough for us. Thanks!']], [['a', 'You could use www.{domain} as your main address and forward the bare domain to it at your provider. Or, if you’d rather, move the DNS to a provider that supports A records or ALIAS at the apex.'], ['c', 'I’ll talk to the others about moving DNS.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.'], ['s', 'Ticket closed automatically after fourteen days without a reply.']]]
			}
		]
	},
	// The site is down: the certificate expired after DNS moved elsewhere.
	{
		dig: 'moved',
		mail: 'certWarn',
		shows: 'curlCert',
		urgent: true,
		subjects: ['SITE DOWN', 'Urgent: website not working', 'Our site is broken', 'Security error on our site'],
		open: [
			'Our site has been down since this morning! Visitors get a security error and can’t get in. We haven’t changed anything. Please help urgently.',
			'Customers are emailing to say our website shows a scary warning about an expired certificate. Isn’t that something Harbor handles?'
		],
		more: ['We’ve never had anything like this before.', 'I’m not technical, so I’m relying on you here.'],
		ask: ['I can see the problem: the certificate for {domain} expired on {certDate}, because we couldn’t renew it. Your domain no longer points at Harbor, so the renewal check fails. Did anything change with your domain or DNS recently?', 'The certificate for {domain} expired on {certDate}. We renew automatically, but only while the domain points at us, and since {lastMonth} it points at {otherIp}. Has someone moved the domain?'],
		paths: [
			{
				detail: ['Ah. We moved our email to a new provider in {lastMonth} and {staff} moved the DNS with it. Maybe something got lost?'],
				look: ['DNS moved in {lastMonth}; the A record for {domain} now points at {otherIp}, not Harbor. Renewal failing since. Warnings went to {notify} and were delivered.'],
				lookPaste: 'cert',
				ends: [
					[['a', 'That’s what happened: when the DNS moved, the record for {domain} was copied with an old address, {otherIp}. If {staff} sets the A records to 203.0.113.10 and 203.0.113.11, we’ll issue a new certificate straight away. We did send renewal warnings to {notify}; it may be worth checking who reads that inbox.'], ['c', '{staff} has fixed the records. Our site works again! And yes, the warnings were all sitting in that inbox. Lesson learned.'], ['a', 'Glad it’s back. The new certificate is valid until the start of February and renews by itself.']],
					[['a', 'Thanks, that fits. Your new DNS has {domain} pointing at {otherIp}. Change it to our addresses, 203.0.113.10 and 203.0.113.11, and I’ll ask the platform team to issue the certificate at once rather than wait for the next hourly attempt.'], ['c', 'Done. Fingers crossed.'], ['p', 'Issued a new certificate for {domain} and www.{domain}, valid to February.'], ['a', 'All working: the new certificate is live. Sorry for the scare.'], ['c', 'Thank you so much, what a relief.']]
				],
				happy: true
			},
			{
				detail: ['We did change DNS provider last month. The person who did it is away; I’ve asked our registrar to help, and they say the change takes up to a day.'],
				look: ['Domain points elsewhere since the DNS move. Waiting for the customer’s registrar to fix the records.'],
				lookPaste: 'cert',
				ends: [[['a', 'That’s fine. When {domain} points at 203.0.113.10 and 203.0.113.11 again, we’ll issue a new certificate within the hour. You don’t need to write in; it happens by itself.'], ['c', 'Thanks. The registrar says tomorrow morning. I’ll let you know if it isn’t back by lunchtime.']]]
			}
		]
	},
	// The domain is attached to another project.
	{
		shows: 'claim',
		subjects: ['Domain already in use', 'Can’t add our domain', '“Domain is attached to another project”', 'Domain error'],
		open: [
			'I’m trying to add {domain} to our project and Harbor says it’s attached to another project. It’s our domain! We own it. How do I get it back?',
			'We switched agencies and are moving our site into our own Harbor project. Adding {domain} fails because it’s “already attached to another project”. Probably the old agency’s.'
		],
		more: ['The error is below.', 'We need this live by {day}.'],
		ask: ['That message means another Harbor project still lists the domain. To move it, we check that you control the domain: please add a TXT record `_harbor-verify.{domain}` with the value `{token}`, and tell me when it’s there.', 'We can move it once we know you control the domain. Add this TXT record at your DNS provider: name `_harbor-verify.{domain}`, value `{token}`. Then reply here.'],
		paths: [
			{
				detail: ['TXT record added just now.'],
				look: ['TXT present. Domain attached to {oldPid}, owned by another account ({oldAgency}). Needs platform to detach.'],
				lookPaste: 'claim',
				team: 'the platform team',
				ends: [
					[['a', 'Thanks, I can see the record. Detaching a domain from someone else’s project is done by our platform team, so I’ve passed it to them with your verification. They’ll reply here.'], ['p', 'Verified. Detached {domain} from {oldPid} and attached it to {pid}. Certificate issuing now.'], ['a', 'All done: {domain} is on your project, and the certificate was issued a few minutes later.'], ['c', 'It’s live. Thanks, that was painless.']],
					[['a', 'Record seen, thanks. I’ve asked the platform team to move the domain to your project. They do these by hand and will reply on this ticket.'], ['c', 'Thanks, waiting to hear.'], ['p', 'Queued; will detach from {oldPid} once we’ve tried to reach its owner, as we do for all transfers.']]
				],
				happy: true
			},
			{
				detail: ['I don’t have access to the DNS: the old agency still manages it. I’ve asked them to hand it over. Could take a while.'],
				look: ['No TXT yet. Customer waiting for the old agency to hand over DNS.'],
				lookPaste: 'none',
				ends: [[['a', 'Understood. Once you can add the TXT record, reply here and we’ll move the domain the same day.'], ['c', 'Will do. Thanks.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.']]]
			}
		]
	},
	// The Billing page and the invoice PDF show different amounts.
	{
		oddCents: true,
		shows: 'consoleBilling',
		subjects: ['Invoice amount doesn’t match', 'Billing page shows the wrong total', 'Which amount is right?', 'Question about our invoice'],
		open: [
			'Our accountant is querying the October invoice. The Billing page says {totalConsole}, but the PDF says {total}. Which one did you actually charge?',
			'Small thing, but it confuses our bookkeeper: the amounts on the Billing page don’t match the PDFs. The plan line says {consolePrice} a month as well, which looks odd. Copied below.'
		],
		more: ['We just need the right number for our books.', 'Not urgent, but our quarter closes soon.'],
		ask: ['The PDF is right: we charged {total}. Let me check why the page shows it differently.', 'You were charged {total}, as the PDF says. I’ll find out why the Billing page differs.'],
		paths: [
			{
				detail: ['Thanks. So we can ignore the page?'],
				look: ['Console shows {totalConsole} for an invoice of {total}: it drops the leading zero of the cents. Same for the plan price ({consolePrice}). Known display issue; console team has it.'],
				lookPaste: 'pdf',
				ends: [
					[['a', 'Yes, go by the PDF. The Billing page drops the zero when the cents are under ten, so {total} shows as {totalConsole} and your plan’s {price} as {consolePrice}. It’s a display bug in the console, and the charge is right. I’ve added your ticket to the console team’s fix, and I’ll update you when it’s corrected.'], ['c', 'Thanks, that’s clear. I’ll tell our accountant to use the PDFs until you’ve fixed the page.']],
					[['a', 'Please use the PDFs for now. The page has a bug: it leaves out the zero when the cents are under ten, so {total} appears as {totalConsole}. Your charge is correct. The console team has the fix on their list, and I’ve linked your ticket so you hear when it’s done.'], ['c', 'Glad it’s only the display. We’ll wait for the fix.']]
				]
			}
		]
	},
	// A bandwidth charge the customer didn't expect.
	{
		shows: 'pdf',
		subjects: ['Unexpected charge', 'Why is our bill higher?', 'Bandwidth overage?', 'Invoice much bigger than usual'],
		open: [
			'This month’s invoice is {total}, when we usually pay {price}. There’s a line for bandwidth I don’t understand. We’re a small site! What happened?',
			'We were charged {overage} for bandwidth over our limit. I don’t see how we could have used {gb} GB more than usual. Can you explain?'
		],
		more: ['Invoice text pasted below.', 'Our traffic hasn’t changed as far as I know.'],
		ask: ['I’ll look at your traffic for the month and come back to you.', 'Let me pull the usage for the month and see where the bandwidth went.'],
		paths: [
			{
				detail: ['Thank you.'],
				look: ['Spike from {spike} onwards: most of it is image requests from another site embedding their photos. Real usage, billed correctly.'],
				lookPaste: 'usage',
				ends: [[['a', 'From {spike} your bandwidth jumped, and almost all of it was images requested from another website that embeds your photos directly, so you pay for every view on their site. You can stop it by allowing images only on your own domain; the docs page “Hotlink protection” shows the one-line setting. The charge itself is correct, I’m afraid.'], ['c', 'Wow, someone’s been using our photos. Turned on the protection and the traffic dropped right away. Fair enough on the charge, thanks for finding it.']]],
				happy: true
			},
			{
				detail: ['Thanks. Is there anything you can do about the charge? It’s a lot for us.'],
				look: ['Spike from {spike}, hotlinked images. First overage on the account; asked billing for a one-off credit.'],
				lookPaste: 'usage',
				ends: [[['a', 'From {spike}, another site embedded your images directly, and every view there counted against your bandwidth. Turning on hotlink protection stops it. Since this is the first time and you’ve now turned it on, I’ve asked {billingFirst} in billing whether we can credit it.'], ['B', 'I’ve credited {credit} to your account, the full overage, as a one-off. It will come off your next invoice.'], ['c', 'That’s very kind, thank you both.']]],
				happy: true
			},
			{
				detail: ['I still don’t think we should pay for traffic we didn’t want. Can someone look at a refund?'],
				look: ['Spike from {spike}, hotlinking. Customer wants a refund; passing to billing.'],
				lookPaste: 'usage',
				team: 'billing',
				ends: [[['a', 'I understand. Refunds are decided by our billing team, so I’ve passed your request and the usage figures to {billingFirst}. She’ll reply here. Meanwhile, hotlink protection will stop it happening again.'], ['c', 'OK, I’ll wait for billing.'], ['b', 'Will review with the usage report and reply this week.']]]
			}
		]
	},
	// A coupon code from an event.
	{
		subjects: ['Coupon code', 'Where do I enter a discount code?', 'Promo code from the meetup', 'Discount code'],
		open: [
			'We got a code, {coupon}, at the {event}. I can’t find anywhere on the Billing page to enter it. Where does it go?',
			'Hi, I have a discount code ({coupon}) from your stand at the {event}. How do we apply it to our project?'
		],
		more: ['We’re on {plan}.', 'It was on a card your team handed out.'],
		ask: ['There isn’t a field for codes on the Billing page yet, so we apply them for you. Let me check the code with our billing team.', 'Codes are applied by us at the moment, not in the console. I’ll check this one and come back to you.'],
		paths: [
			{
				detail: ['Great, thanks.'],
				look: ['{coupon} is valid until {expiry}. Asked billing to apply it.'],
				lookWho: 'b',
				ends: [[['B', 'I’ve applied {coupon} to {project}: {couponPct}% off for three months, starting with your next invoice. The Billing page now shows it next to your plan.'], ['c', 'I can see it. Thank you!']]],
				happy: true
			},
			{
				detail: ['Thanks. Fingers crossed it’s still valid.'],
				look: ['{coupon} expired on {expiry}. Offered nothing else; customer may not reply.'],
				lookWho: 'b',
				lookPaste: 'none',
				ends: [[['a', 'I’m sorry: {coupon} was valid until {expiry}, and billing can’t apply it after that.'], ['c', 'That’s a shame, we only got round to it now. Oh well.'], ['a', 'I understand, and I’m sorry it didn’t work out. If anything else comes up, we’re here.']], [['a', 'Sadly, that code ended on {expiry}, so we can’t apply it now.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.'], ['s', 'Ticket closed automatically after fourteen days without a reply.']]]
			},
			{
				detail: ['Thanks. It might have been given to my colleague {staff} rather than me, if that matters.'],
				look: ['{coupon} was issued to a named person and is tied to their email. Needs {staff} to confirm.'],
				lookWho: 'b',
				lookPaste: 'none',
				ends: [[['a', 'It does: that code was issued in {staff}’s name and can only be used on a project they belong to. If {staff} replies here, or writes in from their own address, billing will apply it.'], ['c', 'OK, I’ll ask {staff} to write in.'], ['s', 'Automatic reminder sent to the customer seven days after support’s last reply.']]]
			}
		]
	},
	// A failed card payment, and a warning that the project will be suspended.
	{
		shows: 'payment',
		subjects: ['Suspension warning??', 'Payment failed email', 'Our project will be suspended?', 'Card declined'],
		open: [
			'We got an email saying our payment failed and the project will be suspended in seven days. What? Our card is fine. Please don’t suspend us.',
			'Your email says the card payment for {invoiceNo} failed. I haven’t changed anything. How do I fix this before the site goes offline?'
		],
		more: ['Email text below.', 'I’m the billing contact, which I suppose is why it came to me.'],
		ask: ['Nothing will be suspended while we sort this out. The charge on the card ending {card} was declined by your bank. Has the card expired or been replaced recently?', 'Don’t worry, we won’t suspend anything while the ticket is open. The card ending {card} was declined. Could it have expired, or been reissued?'],
		paths: [
			{
				detail: ['It was replaced last month after a fraud scare. New card, new number. How do I update it?'],
				look: ['Card ending {card} declined: card reported replaced. Sent a secure card update link.'],
				lookWho: 'b',
				lookPaste: 'payment',
				ends: [[['a', 'That explains it. I’ve sent a secure link to {email} where you can enter the new card; we’ll retake the payment as soon as it’s in.'], ['c', 'New card entered.'], ['B', 'Payment for {invoiceNo} went through on the new card. All settled, and the suspension warning is cancelled.']], [['a', 'You’ll get an email from billing with a secure link to add the new card. Once it’s in, the payment is taken again straight away.'], ['c', 'Done, thanks.'], ['a', 'And it’s paid. Nothing more to do.']]],
				happy: true
			},
			{
				detail: ['The card is current. I’ll call the bank.'],
				look: ['Declined with “do not honor”, a bank-side refusal. Customer calling the bank.'],
				lookWho: 'b',
				lookPaste: 'payment',
				ends: [[['a', 'Thanks. The bank’s answer was “do not honor”, which is the bank refusing it rather than a problem with the details. Once they’ve cleared it, reply here and we’ll take the payment again.'], ['c', 'The bank says our card blocks overseas merchants by default and they need a form signed by two directors. Will take a few days.'], ['a', 'No problem. We’ll keep the project running in the meantime.']]]
			}
		]
	},
	// An invoice that needs the company's details on it.
	{
		subjects: ['Invoice details', 'Company name on invoices', 'Need our tax number on the invoice', 'PO number on invoice'],
		open: [
			'Our finance department can’t pay invoices that don’t show our legal company name and tax ID. The invoices only show “{project}”. Can you reissue the last three?',
			'Can you add our purchase order number, {po}, to the invoices? Our accounts payable team rejects anything without it.'
		],
		more: ['Our legal name is {biz} LLC.', 'Sorry to be a pain, it’s our procurement rules.'],
		ask: ['Of course. Invoice details are handled by our billing team. I’ll pass it to them with what you’ve sent.', 'Yes, we can do that. I’m passing it to billing, who reissue invoices.'],
		paths: [
			{
				detail: ['Thank you.'],
				look: ['Asked billing to reissue the last three invoices with the legal name, tax ID and PO.'],
				lookWho: 'n',
				lookPaste: 'pdf',
				ends: [[['B', 'Done: I’ve reissued {invoiceNo} and the two before it with your details, and future invoices will carry them too. The new PDFs are on the Billing page.'], ['c', 'Perfect. Finance is happy. Thanks!']]],
				happy: true
			},
			{
				detail: ['Thanks. Do you need anything else from us?'],
				look: ['Passed to billing; reissues are done in batches on Fridays.'],
				team: 'billing',
				lookPaste: 'pdf',
				ends: [[['a', 'Nothing else. Billing reissue invoices in a batch, so it may be a few days; {billingFirst} will reply here when they’re ready.'], ['c', 'OK, thanks.'], ['b', 'In Friday’s batch.']]]
			}
		]
	},
	// Moving to a cheaper plan, or closing the project.
	{
		fits: (fw, plan) => plan >= 1,
		subjects: ['Downgrade', 'Change of plan', 'Closing our account', 'We don’t need {plan} any more'],
		open: [
			'Our traffic has gone down a lot since the season ended, and I think we can go back to a smaller plan. How do we change?',
			'We’re winding down the project. What’s the best way to stop paying for it?'
		],
		more: ['I couldn’t find a way to change plan in the console.', 'I look after the account, so you can deal with me directly.'],
		ask: ['Plan changes are done by us for now. Do you want to keep the site running on a cheaper plan, or close the project altogether?', 'We can do either: move you to a cheaper plan, or delete the project. Which would you like?'],
		paths: [
			{
				detail: ['A cheaper plan, please. We still want the site up.'],
				opens: [0],
				look: ['Moved {project} from {plan} to Hobby. Their bandwidth fits.'],
				lookPaste: 'usage',
				ends: [[['a', 'Done: {project} is on Hobby from your next billing date. Your usage over the last month fits comfortably in it. If you need more again in spring, write in and we’ll move you back.'], ['c', 'Great, thanks!']]],
				happy: true
			},
			{
				detail: ['Please delete it. We’ve moved everything off already. I’m the owner.'],
				opens: [1],
				look: ['Writer is the owner (below). Asking for written confirmation before deleting; final invoice will be prorated.'],
				lookPaste: 'members',
				ends: [[['a', 'Before I do: deleting the project removes all its deploys, domains and settings for good, with no undo. Please reply “yes, delete {project}” to confirm.'], ['c', 'Yes, delete {project}.'], ['a', 'Done. {project} and everything in it has been deleted, and the subscription is cancelled. You’ll get a last, prorated invoice for this month. Thanks for hosting with us.']]],
				happy: true
			},
			{
				detail: ['We’d like to close it, but not quite yet: we’re still moving the last site off. We’ll write back when we’re ready.'],
				opens: [1],
				look: ['Wants to close later. Nothing to do until they write back.'],
				lookPaste: 'none',
				ends: [[['a', 'No problem. When you’re ready, reply here and we’ll delete the project and stop the billing the same day.'], ['c', 'Thanks, will do.']]]
			}
		]
	},
	// Adding a teammate.
	{
		shows: 'members',
		subjects: ['Add a team member', 'New starter needs access', 'How do I invite someone?', 'Access for our new developer'],
		open: [
			'We have a new developer, {staffFull}, starting on {day}. How do I add them to our project? The Team page lists people but I can’t see any way to add someone.',
			'Could you add {staffEmail} to our project as an admin? I couldn’t find an invite option anywhere.'
		],
		more: ['Current team below.', 'I’m the owner of the project.'],
		ask: ['There’s no way to invite people from the Team page yet, so we add them for you. Which role should they have: member or admin?', 'At the moment we add people for you. Shall I add {staffEmail} as an admin or a member?'],
		paths: [
			{
				detail: ['Admin, please.', 'Member is enough for now.'],
				look: ['Added {staffEmail} to {project} at the owner’s request.'],
				lookPaste: 'members',
				ends: [[['a', 'Done: {staffFull} is on the project and will get an email to set up their account. They’ll appear on the Team page once they’ve signed in.'], ['c', 'They’re in. Thanks!']]],
				happy: true
			}
		]
	},
	// Asking to invite people without writing in.
	{
		shows: 'members',
		subjects: ['Inviting people ourselves', 'Feature request: invites', 'Adding people without writing in', 'Team page question'],
		open: [
			'We take on seasonal staff every few weeks, and each time I have to write to you to get them added to the project. Is there really no way to invite people ourselves? The Team page only lists who’s already there.',
			'Every time someone joins us I email you to add them, and again when they leave. Could the Team page let owners do this? Or is there a way already that I’ve missed?'
		],
		more: ['Current team below, for reference.', 'You’re always quick, it just adds a day each time.'],
		ask: ['You haven’t missed anything: today we add and remove people for you, and inviting from the Team page is something the console team is working on. Is there anyone you need added right now?', 'There isn’t a way yet; adding people is done by us for now, and the console team is working on invitations from the Team page. Is anyone waiting at the moment?'],
		paths: [
			{
				detail: ['Not right now. The next group starts in a few weeks and I don’t have their addresses yet. I’d just like to be able to do it myself by then.'],
				look: ['Owner wants self-serve invitations; nobody to add today. Linked to the console request.'],
				lookPaste: 'members',
				ends: [[['a', 'Understood. I’ve added your ticket to the console team’s request for invitations from the Team page, so you’ll hear here when it’s out. If the new group starts before then, send us the addresses and we’ll add them the same day.'], ['c', 'Thanks. We’ll wait for the invite option, then.']]]
			},
			{
				detail: ['Not today, thanks. Mostly I want to stop being the bottleneck when I’m away.'],
				look: ['Same as the console invitations work; linked. Nobody to add.'],
				lookPaste: 'members',
				ends: [[['a', 'That makes sense. Your ticket is now linked to the console team’s work on invitations, and I’ll update it when you can invite people yourself. Until then, any admin on the project can write in to have someone added, not only you.'], ['c', 'Good to know about the admins. We’ll wait for the invitations.']]]
			}
		]
	},
	// The owner has left: moving ownership.
	{
		shows: 'members',
		subjects: ['Owner left the company', 'Transfer ownership', 'Need owner access', 'Remove a former employee'],
		open: [
			'{former}, who owned our Harbor project, left the company in {month}. I need to become the owner and remove {formerFirst}. How do we do that?',
			'Our previous developer, {former}, is still the owner of our project and still has access. They’ve left. Please make me the owner and take them off.'
		],
		more: ['I’m an admin on the project.', 'Team list below.'],
		ask: ['We can move ownership, but because it gives control of the project and its billing, we need confirmation from {biz}: an email from a director or someone who can sign for the business. Can you arrange that?', 'Yes. Before moving ownership we ask for confirmation from the organisation itself, such as an email from a director. Could someone send that?'],
		paths: [
			{
				detail: ['Our director, {other}, is copied in.'],
				look: ['{former} is still the owner; the writer is an admin. Will move ownership when the director confirms.'],
				lookPaste: 'members',
				ends: [[['o', 'I confirm {full} should be the owner of our Harbor project, and that {former} no longer works for us.'], ['a', 'Thank you. Done: {full} is the owner, and {former} has been removed from the project.'], ['c', 'Thanks, all looks right on the Team page now.']]],
				happy: true
			},
			{
				detail: ['I’ll ask our director, but they’re travelling until {day}.'],
				look: ['Waiting for confirmation from a director. Nothing changed.'],
				lookPaste: 'members',
				ends: [[['a', 'That’s fine. In the meantime, I can remove {former}’s access if you’d like, since that doesn’t need the director: just say so.'], ['c', 'Yes please, remove them now, and I’ll get the director to email when they’re back.'], ['a', 'Done: {former} no longer has access. Ownership will move when we hear from your director.']]]
			}
		]
	},
	// A teammate can't see the project: signed in with another account.
	{
		shows: 'members',
		subjects: ['Colleague can’t see the project', 'Project missing for one of us', 'Access problem', 'Team member sees an empty account'],
		open: [
			'{staff} was added to our project last week, but when they sign in they see no projects at all, just the “create your first project” page.',
			'One of our team, {staff}, can’t see our project. They’re definitely on the Team page. What’s wrong?'
		],
		more: ['Team page copied below.', 'They’ve tried signing out and in.'],
		ask: ['How does {staff} sign in: with GitHub, or with an email link?', 'Could you ask {staff} which way they sign in, GitHub or email, and with which account?'],
		paths: [
			{
				detail: ['With GitHub, I think.', 'They say GitHub.'],
				look: ['{staffEmail} is on the project. {staff} signs in with a GitHub account linked to a personal address, which has its own empty Harbor account.'],
				lookPaste: 'members',
				ends: [[['a', 'That’s the reason. {staff} is on the project as {staffEmail}, but their GitHub account uses a personal address, so signing in with GitHub opens a separate, empty Harbor account. Signing in with an email link to {staffEmail} will show the project.'], ['c', 'That worked. Thank you!']], [['a', 'Found it: the GitHub account they use is tied to a different email, so it opens a second Harbor account with nothing in it. If they sign in by email link with {staffEmail}, they’ll see your project.'], ['c', 'Sorted. Thanks for the quick help.']]],
				happy: true
			}
		]
	},
	// A role that only sees billing.
	{
		shows: 'members',
		subjects: ['Access for our bookkeeper', 'Billing-only access?', 'Can someone see invoices but not deploys?', 'Roles question'],
		open: [
			'Our bookkeeper, {staffFull}, needs to download the invoices each month. I don’t want to give them access to deploys and environment variables. Is there a billing-only role?',
			'Is there a role that can see the Billing page and nothing else? Our accountant, {staffFull}, needs the invoices.'
		],
		more: ['At the moment I download them and email them on, which is a chore.', 'Team list below.'],
		ask: ['Not yet: the roles are owner, admin and member, and members can see the project’s deploys. What does your bookkeeper need, just the invoices themselves?', 'Today there are three roles, and none is limited to billing. Is it only the invoice PDFs they need?'],
		paths: [
			{
				detail: ['I’d really like them to have their own login with only billing, so they can check things themselves.'],
				look: ['Wants a billing-only role. The API is getting a billing role; linked to the console request.'],
				lookPaste: 'members',
				ends: [[['a', 'Understood. A billing role is being added to our API, and the console team will add it to the Team page. I’ve linked your ticket to that work and will let you know when you can give {staff} that role.'], ['c', 'Great, we’ll wait for that rather than give them full access.']]]
			},
			{
				detail: ['Just the invoices, really.'],
				look: ['Changed the billing email to the bookkeeper’s address; invoices will go to them.'],
				lookPaste: 'none',
				ends: [[['a', 'Then the simplest thing is to send the invoices to them: I can set the project’s billing email to {staffEmail}, and each invoice will be emailed there as a PDF, no login needed.'], ['c', 'Perfect, please do.'], ['a', 'Done: invoices will go to {staffEmail} from the next one.']]],
				happy: true
			}
		]
	},
	// Can't sign in.
	{
		subjects: ['Can’t sign in', 'Sign-in link doesn’t work', 'Locked out of Harbor', 'Login problem'],
		open: [
			'I can’t sign in. I ask for a sign-in link, it arrives, and when I open it I get “this link is no longer valid”. Every time.',
			'I signed in with GitHub and see an empty account with no projects. Yesterday our project was there. Has it been deleted??'
		],
		more: ['I need to get in to check something before {day}.', 'I’ve tried two browsers.'],
		ask: ['Sorry about that. Which email address do you sign in with, and on which device and browser do you open the link?', 'Nothing has been deleted. Which email or GitHub account are you signing in with?'],
		paths: [
			{
				detail: ['{email}. I open the link from my work email on my phone, then try to sign in on my laptop.'],
				opens: [0],
				asks: [0],
				look: ['Links are single-use and tied to the browser that asked for them. Customer opens them on another device.'],
				lookPaste: 'none',
				ends: [[['a', 'That’s the reason: a sign-in link only works in the browser that asked for it, and only once. Open it on the laptop where you asked for it, and you’ll be in.'], ['c', 'That was it. Thank you!']]],
				happy: true
			},
			{
				detail: ['With GitHub, my account {gh}.'],
				opens: [1],
				asks: [1],
				look: ['{email} is on the project. GitHub {gh} is linked to a different Harbor account with no projects.'],
				lookPaste: 'members',
				ends: [[['a', 'Your project is on the account for {email}. The GitHub account {gh} opens another Harbor account, which is empty. Sign in with an email link to {email} and your project will be there; once in, you can link GitHub to that account from your profile.'], ['c', 'Phew. I’m in, and I’ve linked GitHub. Thanks!']]],
				happy: true
			}
		]
	},
	// A security questionnaire and a data processing agreement.
	{
		subjects: ['Security questionnaire', 'DPA request', 'Vendor review', 'Compliance documents'],
		open: [
			'Our new client requires all our vendors to fill in a security questionnaire and sign a data processing agreement. Can you help? It’s a 40-question spreadsheet.',
			'We’re going through a vendor review and need Harbor’s data processing agreement and some information about where data is stored.'
		],
		more: ['Deadline is the end of the month.', 'Mostly standard questions: encryption, backups, access control.'],
		ask: ['Happy to help. Our standard DPA and security overview cover most of these questions. Could you send the questionnaire?', 'We can. Please send the questionnaire, and I’ll see what our standard documents already answer.'],
		paths: [
			{
				detail: ['Attached.'],
				look: ['Standard DPA plus security overview answer it; filled in the rest from the overview.'],
				lookPaste: 'none',
				ends: [[['a', 'I’ve filled in the questionnaire from our security overview and attached it with our signed DPA. The answers about storage refer to {region}, where your project runs.'], ['c', 'That’s everything they asked for. Thank you!']]],
				happy: true
			},
			{
				detail: ['Attached. Our client also wants changes to the DPA: a different liability cap and their own audit clause.'],
				look: ['Changes to the DPA need legal. Passed to {legalFirst}.'],
				lookPaste: 'none',
				team: 'legal',
				ends: [[['a', 'Changes to the DPA have to go through our legal team, so I’ve passed your client’s requests to {legalFirst} there. She’ll reply here. I’ve answered the questionnaire itself, attached.'], ['c', 'Thanks, we’ll wait for legal.'], ['l', 'Reviewing the requested changes; will reply to the customer next week.']]]
			}
		]
	}
];

// Shared pieces, combined with every topic.
const greetings = ['Hi', 'Hello', 'Hi there', 'Hello Harbor support', 'Hi team', 'Dear Harbor support', 'Good morning', 'Morning'];
const custSign = ['Thanks,\n{name}', 'Thanks!\n{name}', 'Cheers,\n{name}', '{name}', 'Best,\n{full}', 'Thank you,\n{full}', 'Many thanks,\n{full}\n{role}, {biz}', 'Kind regards,\n{full}\n{role}'];
const disclaimers = ['Sent from my phone, please excuse the typos.', 'This email is confidential and intended only for the addressee.', 'I work Tuesday to Thursday, so replies may take a day.'];
const contexts = [
	'I’ve read the docs page on this, but I’m still not sure.',
	'Sorry if this is covered somewhere already.',
	'I’m covering for {colleague} this week, so bear with me.',
	'We’ve been on Harbor since {created} without any trouble until now.',
	'I’m not the technical one here, so apologies if I use the wrong words.'
];
const situations = [
	'We have a hectic week ahead, so a quick answer would be appreciated.',
	'I’m around all afternoon if you need anything from me.',
	'Our developer is on holiday, which is why I’m writing rather than them.',
	'Please reply to me directly; I’m the one dealing with this.'
];
const tangents: [string, string][] = [
	['P.S. Do you have a status page I can bookmark?', 'On the status page: status.harbor.example shows builds, the edge and the console, and you can subscribe to updates there.'],
	['P.S. Where do I find our project ID? Our developer keeps asking me for it.', 'Your project ID is on the Settings page, with a Copy option next to it. It’s {pid}.'],
	['P.S. We’ve been very happy with Harbor otherwise.', 'And thank you for the kind words; I’ve passed them round the team.'],
	['By the way, is the console available in Spanish? Some of the people we work with would find it easier.', 'The console is in English only, I’m afraid.'],
	['P.S. Which region is our project in? Someone asked me for it for a privacy form.', 'Your project runs in {region}.']
];
const lastAsks = ['Before you close this, one last thing:', 'Oh, one more question while I think of it.', 'Last thing, I promise:', 'While I have you:'];
const acks = ['Thanks for getting in touch.', 'Thanks for the details.', 'Sorry for the trouble.', 'Thanks for writing in.', 'Thanks for flagging this.'];
interface Side {
	q: string;
	a: string;
	then?: string;
}
const sides: Side[] = [
	{ q: 'Unrelated, but can I filter the Team page by email? We have two people called Alex.', a: 'On the Team page: yes, the filter box matches names and email addresses, so part of an address will tell your two Alexes apart.', then: 'The filter works a treat, by the way.' },
	{ q: 'Another thing: how long do you keep old deploys? I’d like to be able to go back a few weeks if I need to.', a: 'On old deploys: we keep every deploy for 90 days, and any of them can be put back with `harbor rollback`.' },
	{ q: 'While I have you, is there a way to see who started a deploy?', a: 'On who started a deploy: `harbor deploys list` shows the author of each one, taken from the commit or from whoever ran the command.' },
	{ q: 'Separate question: does Harbor support IPv6?', a: 'IPv6: yes, the edge answers on 2001:db8:4a::10 and 2001:db8:4a::11 if you’d like AAAA records too.' },
	{ q: 'Also, can we pay yearly instead of monthly? Our treasurer would prefer one invoice a year.', a: 'On paying yearly: we only bill monthly for now, I’m afraid.', then: 'Shame about yearly billing, but never mind.' },
	{ q: 'Quick extra question: where do the invoices get sent? I only ever see them on the Billing page.', a: 'Invoices are emailed as PDFs to the billing contact, as well as listed on the Billing page. Yours go to {billingEmail}.' },
	{ q: 'And is there a limit on how many custom domains we can add?', a: 'On domains: {plan} allows {domainLimit} custom domains per project.' },
	{ q: 'By the way, the invoices on the Billing page seem to be in a random order. Is that just us?', a: 'On the invoice order: it isn’t just you. The page lists them in the order our billing system returns them; the next console release shows them newest first.', then: 'Good to hear about the invoice order.' },
	{ q: 'Can we have a staging copy of the site that isn’t public?', a: 'On staging: every branch gets its own preview address, and on Pro and Team you can put a password on previews with `harbor previews protect`.' },
	{ q: 'Unrelated: is there a way to check deploy status from our own dashboard?', a: 'On deploy status: `harbor deploys list --json` gives you the same list in a form a script can read.' },
	{ q: 'Also, how do I see how many build minutes we’ve used this month?', a: 'Build minutes are in `harbor usage`, next to bandwidth, with the month’s total and your plan’s allowance.' },
	{ q: 'One more: does Harbor send anything when a failed deploy starts working again?', a: 'Yes: after a failed deploy, the next good one sends a “deploy recovered” email to the notification address.' },
	{ q: 'Is there a way to get the deploy emails into Slack?', a: 'On Slack: Slack can give a channel its own email address, and a lot of teams use that as their notification email.', then: 'The Slack trick is clever, we might do that.' },
	{ q: 'Unrelated: can we set our own security headers on responses?', a: 'On headers: yes, a `_headers` file at the root of your build output sets response headers by path. The docs page “Custom headers” has examples.' },
	{ q: 'Also, a friend in Australia says our site is slow there. Anything we can do?', a: 'On Australia: our edge has locations in Sydney and Singapore, so static pages should be quick there. If your app calls back to {region} for every page, that’s where the time goes.' },
	{ q: 'Oh, and can I change the name of the project? It still has the working title.', a: 'On the project name: we can rename it for you. Send me the new name and it’ll show on the Settings page right away; the onharbor.example address stays as it is.' }
];
const chasers = ['Any news on this?', 'Just checking you got my last message.', 'Hello? It’s been a couple of days.', 'Sorry to chase, is there an update?', 'Is anyone looking at this?', 'Following up on this one.'];
const holding = [
	'Thanks for your patience. I’ve asked {team} to take a look, and I’ll come back to you by {day}.',
	'Quick update: this is with {team} now. I’ll be in touch as soon as I hear back.',
	'Still on it: I’m waiting to hear back from {team}. I haven’t forgotten you.'
];
const nudges = ['Let me know how you get on.', 'Give that a try and tell me how it goes.', 'Shout if that doesn’t do it.', 'I’ll keep the ticket open until you’ve had a chance to try.'];
const closings = ['Let me know if anything else comes up.', 'Hope that helps.', 'Any questions, just reply here.', 'Have a good rest of the week.'];
const agentSign = ['{signer}\nHarbor support', '{signer}, Harbor support', 'Best,\n{signer}\nHarbor support', 'Thanks,\n{signer}'];
const surveys: [string, string][] = [
	['Great', 'Quick and clear, thanks.'],
	['Great', ''],
	['Good', ''],
	['Good', 'Took a little while, but got there.'],
	['Great', 'Really helpful, thank you {agent}.'],
	['Good', 'Friendly and knew what they were talking about.']
];
const natives = [
	['better-sqlite3', '8.7.0'],
	['sharp', '0.30.7'],
	['canvas', '2.11.0'],
	['bcrypt', '5.0.1'],
	['node-sass', '7.0.3']
];
const envPairs = [
	['STRIPE_SECRET_KEY', 'STRIPE_KEY'],
	['DATABASE_URL', 'POSTGRES_URL'],
	['CMS_TOKEN', 'CONTENTFUL_TOKEN'],
	['MAPS_API_KEY', 'GOOGLE_MAPS_KEY'],
	['SENTRY_DSN', 'SENTRY_URL'],
	['MAILCHIMP_API_KEY', 'NEWSLETTER_KEY']
];
const commitVerbs = ['Update', 'Fix', 'Tidy', 'Add', 'Rework', 'Copy changes to'];
const commitMisc = ['Bump dependencies', 'Fix typo on contact page', 'Compress hero images', 'Update footer links', 'Add favicon for dark mode', 'Fix broken link in nav', 'Move analytics script', 'Update privacy page', 'Alt text for gallery images', 'Lint fixes', 'Remove old banner', 'Adjust mobile spacing'];
const events = ['Northwest Web Summit', 'Rain City JavaScript meetup', 'Small Business Tech Day', 'Static Site Night', 'Build Local conference'];
const coupons = ['FALLDEV-25', 'MEETUP-20', 'SUMMIT30', 'BUILDNIGHT-15', 'LOCAL-25'];
const referrers = ['pinwall.example', 'imagefeed.example', 'wallpapers-hd.example', 'recipe-scraper.example'];

const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const slugOf = (name: string) => name.normalize('NFD').toLowerCase().replace(/^the /, '').replace(/[^a-z]+/g, '');
const projectOf = (name: string) =>
	name
		.normalize('NFD')
		.toLowerCase()
		.replace(/^the /, '')
		.replace(/[^a-z ]+/g, '')
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 3)
		.join('-');

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});

/** Keeps a message inside support's hours, 08:00 to 18:00 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 18 * 60) m = startOfDay(m) + 1440 + 8 * 60 + int(r, 0, 90);
	if (minuteOfDay(m) < 8 * 60) m = startOfDay(m) + 8 * 60 + int(r, 0, 90);
	while (isWeekend(m)) m += 1440;
	return m;
};
const waking = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 22 * 60) m = startOfDay(m) + 1440 + 7 * 60 + int(r, 0, 180);
	if (minuteOfDay(m) < 6 * 60 + 30) m = startOfDay(m) + 7 * 60 + int(r, 0, 180);
	return m;
};

// Dates: the tickets are spread over the working days between 14 September and 30 October.
const workdays: number[] = [];
for (let d = 13; d <= 59; d++) if (!isWeekend(d * 1440)) workdays.push(d * 1440);

interface Plan {
	topic: Topic;
	path: Path;
	open: number;
}

const ticket = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x4a7b0000 + index * 7919);
	const { topic, path } = plan;
	const lines = [...path.detail, ...path.look, ...path.ends.flat().map(([, body]) => body)].join('\n');
	const fits = (k: Kind, name: string) => !topic.fits || topic.fits(frameworks[k.fw], plans.indexOf(planFor(name)));
	const fitting = kinds.filter((k) => k.names.some((name) => fits(k, name)));
	const kind = fitting[(index * 7 + int(r, 0, 3)) % fitting.length]!;
	const names = kind.names.filter((name) => fits(kind, name));
	const biz = pick(r, names);
	const fw = frameworks[kind.fw];
	// What stays the same for a business from ticket to ticket.
	const b = mulberry32(hash(biz));
	const first = pick(b, firstNames);
	const last = pick(b, surnames);
	const role = pick(b, kind.roles);
	const formerFirst = pick(b, staffNames.filter((name) => name !== first));
	const former = `${formerFirst} ${pick(b, surnames.filter((name) => name !== last))}`;
	const slug = slugOf(biz);
	const project = projectOf(biz);
	const pid = `prj_${base36(b, 6)}`;
	const tier = planFor(biz);
	const tierIndex = plans.indexOf(tier);
	const next = plans[Math.min(2, tierIndex + 1)]!;
	const region = pick(b, regions);
	const created = 30 * 1440 * -int(b, 2, 26);
	const members = int(b, 3, 9);
	const card = String(int(b, 1000, 9999));
	const usual = pick(b, [`ops@${slug}.example`, `alerts@${slug}.example`, `web@${slug}.example`]);
	const billingEmail = pick(b, [`${first.toLowerCase()}@${slug}.example`, `accounts@${slug}.example`, `office@${slug}.example`]);
	const domain = `${slug}.example`;
	const c = mulberry32(hash(`${biz}/crew`));
	const crew = shuffle(c, staffNames).map((given) => {
		const address = `${given.toLowerCase()}@${c() < 0.75 ? `${slug}.example` : pick(c, providers)}`;
		return [`${given} ${pick(c, surnames)}`, address, c() < 0.25 ? 'admin' : 'member', String(c() < 0.1 ? -1 : int(c, 0, 45))];
	});

	// This ticket's own people and facts.
	const freelance = topic.notify === 'freelance';
	const writerFirst = freelance ? pick(r, firstNames.filter((name) => name !== first)) : first;
	const writerLast = freelance ? pick(r, surnames.filter((name) => name !== last)) : last;
	const full = `${writerFirst} ${writerLast}`;
	const studio = pick(r, studios);
	const email = freelance ? `${writerFirst.toLowerCase()}@${slugOf(studio)}.example` : `${first.toLowerCase()}@${slug}.example`;
	const ownerFull = topic.subjects[0] === 'Owner left the company' ? former : `${first} ${last}`;
	const staffPool = shuffle(r, staffNames.filter((name) => name !== formerFirst && name !== first));
	const staff = staffPool[0]!;
	const staffFull = `${staff} ${pick(r, surnames)}`;
	const otherName = topic.other === 'owner' ? `${first} ${last}` : `${staffPool[1]!} ${pick(r, surnames)}`;
	const typoDomain = `${slug.slice(0, 2)}${slug.slice(3)}.example`;
	const notify = (<Record<string, string>>{
		former: `${formerFirst.toLowerCase()}@${slug}.example`,
		typo: `${usual.split('@')[0]}@${typoDomain}`,
		group: `team@${slug}.example`,
		freelance: email,
		personal: `${first.toLowerCase()}@${slug}.example`
	})[topic.notify ?? ''] ?? usual;
	// Where the alerts go once the ticket is done: the business's usual address, which later tickets show.
	const newNotify = topic.notify && topic.notify !== 'group' ? usual : pick(r, [`deploys@${slug}.example`, `webteam@${slug}.example`, `tech@${slug}.example`]);
	const open = topic.history === 'queue' ? plan.open + int(r, 40, 70) + (Number(incidentOf(plan.open).from.slice(0, 2)) * 60 + Number(incidentOf(plan.open).from.slice(3))) : plan.open + int(r, 7 * 60, 19 * 60);
	const incident = incidentOf(open);
	const monthIndex = at(open).getUTCMonth();
	const lastMonth = monthNames[monthIndex - 1]!;
	const [nativeName, nativeVer] = pick(r, natives);
	const [envVar, envNew] = pick(r, envPairs);
	const appPort = (fw.listen ?? '').match(/:(\d{4})/)?.[1] ?? '3000';
	const maxAge = pick(r, [
		['a day', 86400],
		['a week', 604800],
		['twelve hours', 43200]
	] as const);
	const spikeDay = int(r, 6, 22);
	const couponIndex = int(r, 0, coupons.length - 1);
	const expired = lines.includes('expired on {expiry}') || lines.includes('ended on {expiry}') || lines.includes('until {expiry}, and billing');
	const expiry = expired ? open - int(r, 6, 40) * 1440 : open + int(r, 20, 70) * 1440;
	const bounce = office(r, open - int(r, 12, 40) * 1440 + int(r, 0, 600));
	const cert = startOfDay(open) - int(r, 0, 2) * 1440;

	// Last month's invoice.
	const gb = topic.shows === 'pdf' && topic.subjects[0] === 'Unexpected charge' ? int(r, 140, 900) : r() < 0.5 ? 0 : int(r, 3, 60);
	let minutes = r() < 0.6 ? 0 : int(r, 10, 400);
	if (topic.oddCents) {
		const target = int(r, 1, 9);
		const base = tier.cents + gb * 8;
		minutes = ((target - (base % 100) + 100) % 100) + 100 * int(r, 0, 2);
		if (minutes === 0) minutes = 100;
	}
	const overage = gb * 8;
	const total = tier.cents + overage + minutes;
	const invoiceNo = `INV-${at(open).getUTCFullYear()}${pad(monthIndex + 1)}-${int(r, 10000, 99999)}`;

	const values: Record<string, string> = {
		name: writerFirst,
		full,
		email,
		biz,
		role,
		project,
		pid,
		domain,
		plan: tier.name,
		price: money(tier.cents),
		consolePrice: consoleMoney(tier.cents),
		nextPlan: next.name,
		mem: tier.memory,
		nextMem: next.memory,
		heap: tier.memory === '2 GB' ? '1792' : '3584',
		region,
		created: `${monthNames[at(created).getUTCMonth()]} ${at(created).getUTCFullYear()}`,
		staff,
		staffFull,
		staffEmail: `${staff.toLowerCase()}@${slug}.example`,
		former,
		formerFirst,
		notify,
		newNotify,
		typoDomain,
		ownerFull,
		ownerFirst: ownerFull.split(' ')[0]!,
		ownerEmail: `${ownerFull.split(' ')[0]!.toLowerCase()}@${slug}.example`,
		other: otherName,
		otherFirst: otherName.split(' ')[0]!,
		colleague: `${staffPool[2]!}`,
		billingEmail,
		day: weekdayFrom(startOfDay(open) + int(r, 2, 4) * 1440),
		wday: weekday(Math.max(topic.build === 'node' ? NODE_DEFAULT : 0, office(r, startOfDay(open) - int(r, 1, 3) * 1440 + 600))),
		month: pick(r, monthNames.slice(5, monthIndex)),
		lastMonth,
		thing: pick(r, kind.things),
		native: nativeName!,
		envVar: envVar!,
		envNew: envNew!,
		appPort,
		maxAge: maxAge[0],
		previewBranch: pick(r, ['redesign', 'new-menu', 'staging', 'autumn-update', 'booking-v2']),
		bounceDate: longDate(bounce),
		bounceMonth: monthNames[at(bounce).getUTCMonth()]!,
		leftMonth: monthNames[at(bounce).getUTCMonth() - (at(bounce).getUTCDate() < 10 ? 1 : 0)]!,
		certDate: longDate(cert),
		otherIp: `198.51.100.${int(r, 20, 240)}`,
		token: `hv-${base36(r, 22)}`,
		oldPid: `prj_${base36(r, 6)}`,
		oldAgency: pick(r, studios),
		studio,
		incidentWhen: startOfDay(open) === incident.day ? `this ${incident.from < '12' ? 'morning' : 'afternoon'}, from ${incident.from}` : `on ${weekday(incident.day)} ${longDate(incident.day)}, between ${incident.from} and ${incident.to}`,
		incidentWhat: incident.what,
		incidentTo: incident.to,
		billingFirst: billingLead.split(' ')[0]!,
		legalFirst: legalLead.split(' ')[0]!,
		total: money(total),
		totalConsole: consoleMoney(total),
		overage: money(overage),
		gb: String(gb),
		credit: money(overage),
		spike: `${spikeDay} ${lastMonth}`,
		invoiceNo,
		coupon: coupons[couponIndex]!,
		couponPct: coupons[couponIndex]!.replace(/\D/g, ''),
		event: `the ${events[couponIndex]!}`,
		expiry: longDate(expiry),
		card,
		po: `PO-${int(r, 4100, 9800)}`,
		gh: `${writerFirst.toLowerCase()}-${writerLast.toLowerCase().slice(0, 4)}${int(r, 1, 99)}`,
		domainLimit: ['10', '50', '200'][tierIndex]!,
		agent: '',
		sent: ''
	};
	const f = (text: string) => fill(text, values);

	// The deploy history, newest first, so that the ids named in messages match the pasted lists.
	const history = deployHistory(r, topic, path, open, kind, values);
	values.dpl = history[0]!.id;
	values.dplOld = history.find((row) => row.good && row !== history[0])?.id ?? history[1]!.id;
	const pasteOf = (kindOfPaste: Paste | undefined, t: number, internal = false): string => renderPaste(r, kindOfPaste, t, internal, { topic, path, kind, fw, values, history, tier, gb, minutes, total, maxAge: maxAge[1], spikeDay, open, members, created, crew, bounce, cert });

	// The thread.
	const agent = pick(r, agents);
	const plat = pick(r, platformTeam);
	values.agent = agent;
	let t = open;
	const messages: string[] = [];
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		a: `**${agent} (Harbor support)**`,
		n: `**${agent} (Harbor support)** · internal note`,
		p: `**${plat} (platform)** · internal note`,
		P: `**${plat} (platform)**`,
		b: `**${billingLead} (billing)** · internal note`,
		B: `**${billingLead} (billing)**`,
		l: `**${legalLead} (legal)** · internal note`,
		o: `**${otherName}**`,
		s: '**Help desk**'
	};
	const signers: Partial<Record<Who, string>> = { a: agent, P: plat.split(' ')[0]!, B: billingLead.split(' ')[0]! };
	const say = (who: Who, body: string) => messages.push(`${labels[who]} · ${stampShort(t)}\n\n${body.trim()}`);
	let held = false;
	const advance = (who: Who) => {
		const before = t;
		if (held && who !== 'a' && who !== 's') {
			t += int(r, 600, 2200);
			held = false;
		}
		if (topic.urgent && messages.length < 6 && 'acn'.includes(who)) t = t + int(r, 4, 35);
		else if (who === 'c' || who === 'o') t = waking(r, t + int(r, 25, 1500));
		else if (who === 's') t = office(r, startOfDay(t) + 7 * 1440 + 9 * 60);
		else if (who === 'a' || who === 'P' || who === 'B') t = office(r, t + int(r, 20, 600));
		else t = office(r, t + int(r, 6, 240));
		if (t > LAST_MESSAGE) t = before + int(r, 4, 30);
	};
	const custBody = (paragraphs: string[], opening: boolean, who: 'c' | 'o' = 'c') => {
		const parts: string[] = [];
		const fitting = (opening ? greetings : ['Hi', 'Hello', 'Hi again', `Hi ${values.agent}`, `Hello ${values.agent}`, 'Morning', 'Hello again']).filter((greeting) => minuteOfDay(t) < 12 * 60 || !greeting.includes('orning'));
		if (r() < (opening ? 0.85 : 0.55)) parts.push(`${pick(r, fitting)},`);
		parts.push(...paragraphs);
		const thanked = /thank/i.test(paragraphs.at(-1) ?? '');
		parts.push(who === 'o' ? otherName.split(' ')[0]! : f(pick(r, (opening ? custSign : custSign.slice(0, 6)).filter((sign) => !thanked || !/^Thank/.test(sign)))));
		if (opening && r() < 0.2) parts.push(`--\n${pick(r, disclaimers)}`);
		return parts.join('\n\n');
	};
	const pendingSide: string[] = [];
	const agentBody = (who: Who, paragraphs: string[], more = false) => {
		const extra = who === 'a' ? pendingSide.splice(0) : [];
		const closing = more && r() < 0.4 ? [pick(r, closings)] : [];
		const hello = [`Hi ${writerFirst},`, `Hello ${writerFirst},`, `Hi ${writerFirst},`];
		return [pick(r, hello), ...paragraphs, ...extra, ...closing, fill(pick(r, agentSign), { signer: signers[who] ?? agent }).replace('Harbor support', who === 'B' ? 'Harbor billing' : who === 'P' ? 'Harbor platform team' : 'Harbor support')].join('\n\n');
	};

	// 1. The customer writes in.
	const tangent = r() < 0.35 ? pick(r, tangents) : undefined;
	const opening = [f(pick(r, path.opens ? path.opens.map((i) => topic.open[i]!) : topic.open))];
	if (!freelance && r() < 0.65) opening.unshift(f(pick(r, kind.intro)));
	if (r() < 0.35) opening.splice(opening.length - 1, 0, f(pick(r, contexts)));
	for (const more of shuffle(r, topic.more).slice(0, r() < 0.15 ? 0 : r() < 0.6 ? 1 : 2)) opening.push(f(more));
	if (r() < 0.4) opening.push(f(pick(r, situations)));
	if (topic.shows) opening.push(pasteOf(topic.shows, t));
	if (tangent) opening.push(f(tangent[0]));
	say('c', custBody(opening, true));

	// 2. Support asks.
	advance('a');
	const ask = f(pick(r, path.asks ? path.asks.map((i) => topic.ask[i]!) : topic.ask));
	const ack = /^(Thanks|Sorry|Thank you|Yes|Of course|Happy)/.test(ask) ? '' : pick(r, acks);
	say('a', agentBody('a', [[ack, ask].filter(Boolean).join(' '), ...(tangent ? [f(tangent[1])] : [])], true));

	// 3. The customer answers, and may raise a second matter.
	advance('c');
	const side = r() < 0.85 ? pick(r, sides) : undefined;
	const answer = [f(pick(r, path.detail)), pasteOf(path.paste, t)].filter(Boolean);
	if (side) {
		answer.push(f(side.q));
		pendingSide.push(f(side.a));
	}
	say('c', custBody(answer, false));

	// 4. Someone looks.
	advance('n');
	values.sent = clock(t);
	const lookPaste = path.lookPaste ?? 'panel';
	const note = [f(pick(r, path.look)), pasteOf(lookPaste, t, true)];
	if (lookPaste !== 'panel' && lookPaste !== 'none' && r() < 0.85) note.push(pasteOf('panel', t, true));
	say(path.lookWho ?? 'n', note.filter(Boolean).join('\n\n'));

	// 5. Sometimes a wait; always when the second matter would otherwise go unanswered.
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'a');
	const second = shuffle(r, sides).find((other) => other !== side)!;
	const chase = () => {
		const since = t;
		t += int(r, 1300, 2600);
		advance('c');
		const raise = answered && r() < 0.5;
		say('c', custBody([pick(r, t - since > 2 * 1440 ? chasers : chasers.filter((text) => !text.includes('couple of days')))], false).replace(/\n\n([^\n]+)$/, raise ? `\n\n${f(second.q)}\n\n$1` : '\n\n$1'));
		if (raise) pendingSide.push(f(second.a));
	};
	const chasable = !path.settled && end[0]![0] !== 'c';
	if (pendingSide.length && !answered) {
		advance('a');
		say('a', agentBody('a', [pick(r, nudges)], true));
	} else if (path.team && end.filter(([who]) => who === 'a').length > 1 && r() < 0.6) {
		advance('a');
		held = true;
		say('a', agentBody('a', [fill(pick(r, holding), { ...values, team: path.team })], true));
		if (chasable && r() < 0.55) chase();
	} else if (chasable && r() < 0.45) chase();

	// 6. The end.
	const thanks = side?.then && r() < 0.6 ? f(side.then) : '';
	let lastCustomer = -1;
	end.forEach(([who], i) => {
		if (who === 'c') lastCustomer = i;
	});
	end.forEach(([who, body], i) => {
		advance(who);
		const text = f(body);
		if (who === 'c') say('c', custBody(i === lastCustomer && thanks ? [text, thanks] : [text], false));
		else if (who === 'o') say('o', custBody([text], false, 'o'));
		else if (who === 'a' || who === 'P' || who === 'B') say(who, agentBody(who, [text]));
		else say(who, text);
	});
	const third = shuffle(r, sides).find((other) => other !== side && other !== second)!;
	const lastAsk = pick(r, lastAsks);
	if (end.at(-1)![0] === 'c' && !end.some(([who]) => who === 's') && r() < 0.4) {
		messages[messages.length - 1] = messages.at(-1)!.replace(/\n\n([^\n]+(\n[^\n]+)*)$/, `\n\n${lastAsk} ${f(third.q).replace(/^(Unrelated|Another thing|Separate question|Also|And|Oh, and|One more|While I have you|Quick extra question|By the way)[,:]? (but )?/, '').replace(/^./, (c) => (lastAsk.endsWith(':') ? c.toLowerCase() : c.toUpperCase()))}\n\n$1`);
		advance('a');
		say('a', agentBody('a', [f(third.a).replace(/^On [^:]+: /, '').replace(/^./, (c) => c.toUpperCase())]));
	}
	if (path.happy && 'caBPo'.includes(end.at(-1)![0]) && r() < 0.45) {
		advance('s');
		const [rating, comment] = pick(r, surveys);
		say('s', `Satisfaction survey answered: ${rating}.${comment ? ` “${f(comment)}”` : ''}`);
	}

	const subject = f(pick(r, topic.subjects));
	const form = !freelance && r() < 0.3;
	const from = freelance ? `${full} <${email}>, ${studio}` : `${full} <${email}>, ${biz}`;
	const how = form ? `through the help form in the console · project ${pid}` : 'by email';
	if (form) messages[0] = messages[0]!.replace(/\n\n/, `\n\n_Sent from the ${pick(r, ['Settings', 'Billing', 'Team'])} page · ${pick(r, ['Firefox 131 on Windows 11', 'Chrome 129 on macOS', 'Safari 18 on macOS', 'Edge 129 on Windows 11', 'Chrome 130 on ChromeOS', 'Firefox 131 on Ubuntu', 'Chrome 130 on Windows 10'])} · signed in as ${email}_\n\n`);
	return [`# Ticket ${number}: ${subject}`, `From ${from} · ${stampLong(open)} · ${how}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

/** A business keeps its plan from ticket to ticket. */
const planFor = (biz: string) => {
	const h = hash(`${biz}/plan`) % 100;
	return plans[h < 40 ? 0 : h < 85 ? 1 : 2]!;
};
/** The latest incident on or before `t`, or the first one. */
const incidentOf = (t: number) => [...incidents].reverse().find((incident) => incident.day <= t) ?? incidents[0]!;
const historyOf = (topic: Topic) => topic.history ?? (topic.build ? topic.build : topic.shows === 'health' ? 'health' : topic.shows === 'curlCache' ? 'cache' : 'plain');
const took = (seconds: number) => `${Math.floor(seconds / 60)}m ${pad(seconds % 60)}s`;

interface Deploy {
	id: string;
	commit: string;
	message: string;
	branch: string;
	start: number;
	seconds: number;
	result: string;
	good: boolean;
	by: string;
}
const deployHistory = (r: Rand, topic: Topic, path: Path, open: number, kind: Kind, values: Record<string, string>): Deploy[] => {
	const shape = historyOf(topic);
	const preview = shape === 'cache' && path.detail.some((text) => text.includes('{previewBranch}'));
	const count = int(r, 8, 14);
	const people = [values.full!, values.staffFull!, values.full!];
	const rows: Deploy[] = [];
	let t = open - int(r, 20, 180);
	const incident = incidentOf(open);
	const queueFrom = incident.day + Number(incident.from.slice(0, 2)) * 60 + Number(incident.from.slice(3));
	const failing = shape === 'node' || shape === 'env' || shape === 'health' ? int(r, 2, 4) : shape === 'queue' ? int(r, 2, 3) : 0;
	for (let i = 0; i < count; i++) {
		const message = r() < 0.55 ? `${pick(r, commitVerbs)} ${pick(r, kind.things)}` : pick(r, commitMisc);
		if (shape === 'queue' && i < failing) t = Math.max(t, queueFrom + 5 + (failing - i) * 3);
		if (shape === 'node' && i < failing) t = Math.max(t, NODE_DEFAULT + 9 * 60 + (failing - i) * 40);
		const base = { id: `dpl_${base36(r, 5)}`, commit: hex(r, 7), message, branch: 'main', start: t, by: pick(r, people) };
		let result = i === 0 ? 'live' : 'replaced';
		let good = true;
		let seconds = int(r, 55, 190);
		if (i < failing) {
			good = false;
			if (shape === 'node') [result, seconds] = ['failed (install step)', int(r, 50, 95)];
			if (shape === 'env') [result, seconds] = ['failed (build step)', int(r, 30, 80)];
			if (shape === 'health') [result, seconds] = ['failed (health check)', int(r, 150, 230)];
			if (shape === 'queue') [result, seconds] = ['queued', 0];
		} else if (i === failing && failing > 0) result = 'live';
		if (shape === 'oom' && i < 7 && (i === 0 || r() < 0.5)) {
			good = false;
			[result, seconds] = ['failed (build step, out of memory)', int(r, 170, 260)];
		}
		if (preview && i === 0) [base.branch, result] = [values.previewBranch!, 'preview'];
		if (preview && i === 1) result = 'live';
		rows.push({ ...base, seconds, result, good });
		if (shape === 'node' && i === failing - 1) t = Math.min(t, NODE_DEFAULT) - int(r, 300, 3000);
		t -= shape === 'queue' && i < failing - 1 ? int(r, 4, 25) : int(r, 90, 3600 * (i < 3 ? 1 : 2));
		if (minuteOfDay(t) < 7 * 60) t -= minuteOfDay(t) + int(r, 60, 300);
	}
	if (shape === 'oom' && rows.every((row) => !row.good || row === rows[0])) rows[rows.length - 1]!.good = true;
	if (shape === 'oom') {
		const live = rows.find((row) => row.good);
		for (const row of rows) if (row.good) row.result = row === live ? 'live' : 'replaced';
	}
	return rows;
};

interface Context {
	topic: Topic;
	path: Path;
	kind: Kind;
	fw: Framework;
	values: Record<string, string>;
	history: Deploy[];
	tier: (typeof plans)[number];
	gb: number;
	minutes: number;
	total: number;
	maxAge: number;
	spikeDay: number;
	open: number;
	members: number;
	created: number;
	crew: string[][];
	bounce: number;
	cert: number;
}

const block = (lines: string[]) => ['```text', ...lines, '```'].join('\n');
const leadIns: Partial<Record<Paste, string[]>> = {
	build: ['Here’s the end of the build log:', 'Build log:', 'The log from the last attempt:'],
	health: ['The deploy log:', 'Logs from the last attempt:', 'Here’s what `harbor logs` shows:'],
	curlCache: ['Here’s what curl gives me:', 'Headers from the live site:'],
	curlCert: ['This is what I get from curl:', 'curl output, in case it helps:'],
	dig: ['Our DNS records, from dig:', 'Here’s what dig shows for the domain:'],
	deploys: ['Our deploy list:', 'From `harbor deploys list`:'],
	consoleBilling: ['Copied from the Billing page:', 'Here’s what the Billing page shows:'],
	pdf: ['From the PDF:', 'The invoice says:', 'Text of the invoice:'],
	payment: ['The email we got:', 'Here’s the email:'],
	members: ['Our Team page:', 'From the Team page:', 'Current team, from the Team page:'],
	claim: ['The error:', 'What the CLI says:'],
	env: ['Output:', 'Here it is:']
};

const renderPaste = (r: Rand, paste: Paste | undefined, t: number, internal: boolean, ctx: Context): string => {
	const { topic, values: v, history, tier, fw } = ctx;
	const lead = (text: string) => (internal || !leadIns[paste!] ? text : `${pick(r, leadIns[paste!]!)}\n\n${text}`);
	switch (paste) {
		case undefined:
		case 'none':
			return '';
		case 'panel': {
			const domains = hash(`${v.biz}/domains`) % 5 === 0 && topic.dig === undefined && topic.shows !== 'claim' ? `none (${v.project}.onharbor.example only)` : `${v.domain}, www.${v.domain}`;
			const latest = history[0]!;
			return `Project panel, from the admin tool:\n\n${block([
				`Project:        ${v.project} (${v.pid})`,
				`Plan:           ${v.plan}, ${v.price} a month`,
				`Region:         ${v.region}`,
				`Created:        ${shortDate(ctx.created)}`,
				`Owner:          ${v.ownerFull} <${v.ownerEmail}>`,
				`Members:        ${ctx.members}`,
				`Notification:   ${v.notify}`,
				`Billing email:  ${v.billingEmail}`,
				`Domains:        ${domains}`,
				`Last deploy:    ${latest.id} · ${dayMonth(latest.start)}, ${clock(latest.start)} · ${topic.history === 'rollback' ? 'replaced (rolled back)' : latest.result}`
			])}`;
		}
		case 'mail': {
			const types = ['deploy-failed', 'deploy-recovered', 'usage-alert', 'maintenance-notice', 'cert-renewed'];
			let previous = '';
			const seenTypes = new Set<string>();
			const from = topic.mail === 'bounce' ? ctx.bounce - int(r, 6, 18) * 1440 : t - 30 * 1440;
			const times = new Set<number>();
			const count = int(r, 7, 13);
			while (times.size < count) {
				const when = from + int(r, 0, Math.max(1, t - 120 - from));
				times.add(minuteOfDay(when) < 7 * 60 ? when + 9 * 60 : when);
			}
			if (topic.mail === 'bounce') times.add(ctx.bounce);
			if (topic.mail === 'certWarn') for (const before of [21, 14, 7, 3, 1]) times.add(ctx.cert - before * 1440 + 180);
			const sorted = [...times].sort((a, b) => a - b);
			const out: string[] = [];
			const row = (when: number, type: string, result: string, detail: string) => out.push(`${isoTime(when)}  ${type.padEnd(22)}${result.padEnd(11)}${detail}`);
			let suppressed = topic.mail === 'typo';
			if (topic.mail === 'typo') out.push(`suppressed since ${shortDate(ctx.created)}: DNS error, no MX or A record for ${v.typoDomain}`, '');
			for (const when of sorted) {
				const certWarning = topic.mail === 'certWarn' && minuteOfDay(when) === 180 && when < ctx.cert;
				const type = certWarning ? 'cert-renewal-warning' : previous === 'deploy-failed' && r() < 0.75 ? 'deploy-recovered' : r() < 0.7 ? 'deploy-failed' : pick(r, types.filter((kind) => kind !== 'deploy-recovered' && kind !== 'deploy-failed' && !seenTypes.has(kind)).concat('deploy-failed'));
				previous = type;
				seenTypes.add(type);
				if (topic.mail === 'bounce' && when >= ctx.bounce) {
					if (!suppressed) {
						row(when, type, 'bounced', `550 5.1.1 <${v.notify}>: Recipient address rejected: User unknown`);
						row(when, 'suppression', 'added', 'hard bounce');
						suppressed = true;
					} else row(when, type, 'not sent', 'address is suppressed');
				} else if (suppressed) row(when, type, 'not sent', 'address is suppressed');
				else if (topic.mail === 'group') row(when, type, 'refused', `550 5.7.1 <${v.notify}>: Message rejected: this group only accepts mail from its members`);
				else row(when, type, 'delivered', `250 2.0.0 OK queued as ${base36(r, 10).toUpperCase()}`);
			}
			if (topic.mail === 'quarantine') row(t, 'test-message', 'delivered', `250 2.0.0 OK queued as ${base36(r, 10).toUpperCase()}`);
			return `Mail log for ${v.notify}, ${topic.mail === 'bounce' ? 'from three weeks before the first bounce' : 'last 30 days'}:\n\n${block(out)}`;
		}
		case 'deploys': {
			const rollback = topic.history === 'rollback' && internal;
			const rows = ['| Deploy | Commit | Branch | Started | Took | By | Result |', '| --- | --- | --- | --- | --- | --- | --- |'];
			for (const row of history) {
				let result = row.result;
				if (rollback && row === history[0]) result = 'replaced (rolled back)';
				if (rollback && row.id === v.dplOld) result = 'live (rollback)';
				rows.push(`| ${row.id} | \`${row.commit}\` ${row.message} | ${row.branch} | ${dayMonth(row.start)}, ${clock(row.start)} | ${row.seconds ? took(row.seconds) : '–'} | ${row.by} | ${result} |`);
			}
			return lead(internal ? `Deploys of ${v.project}:\n\n${rows.join('\n')}` : rows.join('\n'));
		}
		case 'build': {
			const failed = history.find((row) => !row.good) ?? history[0]!;
			const head = [`[build] ${isoTime(failed.start)} Cloning ${v.project} at ${failed.commit} (${failed.branch})`];
			const lang = fw.node ? 'node' : fw.name === 'Hugo' ? 'go' : fw.name === 'Rails' ? 'ruby' : 'python';
			let body: string[];
			if (topic.build === 'node') {
				const [name, version] = natives.find(([n]) => n === v.native)!;
				body = [
					'[build] Using Node.js 22.9.0 (default)',
					'[build] Running npm ci',
					'npm warn EBADENGINE Unsupported engine {',
					`npm warn EBADENGINE   package: '${v.project}@${int(r, 1, 3)}.${int(r, 0, 9)}.0',`,
					"npm warn EBADENGINE   required: { node: '18.x' },",
					"npm warn EBADENGINE   current: { node: 'v22.9.0', npm: '10.8.3' }",
					'npm warn EBADENGINE }',
					'npm error code 1',
					`npm error path /build/node_modules/${name}`,
					'npm error command failed',
					'npm error command sh -c prebuild-install || node-gyp rebuild --release',
					`npm error prebuild-install warn install No prebuilt binaries found (target=22.9.0 runtime=node arch=x64 libc= platform=linux) for ${name}@${version}`,
					'npm error gyp info using node-gyp@10.1.0',
					'npm error gyp info using node@22.9.0 | linux | x64',
					`npm error gyp info spawn args [ '-f', 'make', '-I', '/build/node_modules/${name}/build/config.gypi' ]`,
					`npm error ../src/${name.replace(/-/g, '_')}.cc:${int(r, 40, 900)}:${int(r, 3, 40)}: error: no matching function for call to 'v8::Object::Set(v8::Local<v8::String>, v8::Local<v8::Value>)'`,
					'npm error make: *** [Release/obj.target/binding.o] Error 1',
					'npm error gyp ERR! build error',
					'npm error gyp ERR! stack Error: `make` failed with exit code: 2',
					'npm error gyp ERR! not ok',
					`[build] npm ci failed after ${took(failed.seconds)} (exit code 1)`
				];
			} else if (topic.build === 'oom') {
				const steps = fw.name === 'Next.js' ? ['> next build', '  ▲ Next.js 14.2.5', '   Creating an optimized production build ...', `   Generating static pages (${int(r, 80, 400)}/${int(r, 401, 1200)})`] : fw.name === 'Astro' ? ['> astro build', `[build] ${int(r, 300, 1400)} page(s) built so far`, `[vite] ✓ ${int(r, 600, 2000)} modules transformed.`, '[@astrojs/image] processing images...'] : ['> vite build', `vite v5.4.2 building for production...`, `✓ ${int(r, 400, 2000)} modules transformed.`, 'rendering chunks...'];
				body = [
					`[build] Using Node.js ${nodeAt(failed.start)}`,
					'[build] Restored build cache (npm, 412 MB)',
					'[build] Running npm run build',
					...steps,
					'',
					'<--- Last few GCs --->',
					'',
					`[31:0x6b2e3c0]   ${int(r, 140000, 260000)} ms: Mark-Compact ${int(r, 1890, 1990)}.4 (${int(r, 2010, 2060)}.1) -> ${int(r, 1880, 1980)}.7 (${int(r, 2010, 2060)}.6) MB, ${int(r, 900, 2400)}.3 / 0.0 ms  (average mu = 0.1${int(r, 10, 99)}, current mu = 0.0${int(r, 10, 99)}) allocation failure; scavenge might not succeed`,
					'',
					'<--- JS stacktrace --->',
					'',
					'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
					' 1: 0xb8a3c0 node::Abort() [node]',
					' 2: 0xa98d44 node::OOMErrorHandler(char const*, v8::OOMDetails const&) [node]',
					' 3: 0xd5c4f0 v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [node]',
					`[build] Process killed (exit code 137) after ${took(failed.seconds)}: the build used more than the ${tier.memory} of memory the ${tier.name} plan allows`
				];
			} else {
				const error =
					lang === 'node'
						? [`Error: Missing environment variable ${v.envVar}`, `    at requireEnv (file:///build/src/lib/env.ts:${int(r, 4, 20)}:11)`, `    at file:///build/src/lib/${v.envVar.split('_')[0]!.toLowerCase()}.ts:${int(r, 2, 9)}:${int(r, 10, 30)}`, '    at ModuleJob.run (node:internal/modules/esm/module_job:234:25)']
						: lang === 'python'
							? ['Traceback (most recent call last):', '  File "/build/manage.py", line 22, in <module>', '    main()', `  File "/build/site/settings.py", line ${int(r, 20, 90)}, in <module>`, `    ${v.envVar} = os.environ["${v.envVar}"]`, `KeyError: '${v.envVar}'`]
							: lang === 'ruby'
								? [`rails aborted!`, `KeyError: key not found: "${v.envVar}"`, `/build/config/initializers/${v.envVar.split('_')[0]!.toLowerCase()}.rb:${int(r, 2, 9)}:in \`fetch'`, 'Tasks: TOP => environment', '(See full trace by running task with --trace)']
								: [`Error: error building site: render: failed to render pages: render of "page" failed: "/build/layouts/_default/baseof.html:${int(r, 10, 60)}:${int(r, 3, 20)}": execute of template failed: template: _default/baseof.html: error calling getenv: ${v.envVar} is not set`];
				body = [`[build] Using ${lang === 'node' ? `Node.js ${nodeAt(failed.start)}` : lang === 'python' ? 'Python 3.12.6' : lang === 'ruby' ? 'Ruby 3.3.5' : 'Hugo 0.134.2 extended'}`, `[build] Environment: ${int(r, 4, 11)} variables set for production`, `[build] Running ${fw.build}`, ...error, `[build] Build failed after ${took(failed.seconds)} (exit code 1)`];
			}
			const tail = [`[build] Deploy ${failed.id} failed; ${history.find((row) => row.good)?.id ?? 'the previous deploy'} is still live`];
			return lead(block([...head, ...body, ...tail]));
		}
		case 'health': {
			const failed = history[0]!;
			const lines = [
				`${isoTime(failed.start + 2)}  [deploy] ${failed.id}: build finished, starting 1 instance in ${v.region} (PORT=8080)`,
				`${isoTime(failed.start + 2)}  [deploy] ${failed.id}: start command: ${fw.name === 'Django' ? 'gunicorn site.wsgi' : fw.name === 'Flask' ? 'gunicorn app:app' : fw.name === 'Rails' ? 'bundle exec puma -C config/puma.rb' : fw.name === 'Next.js' ? 'npm start' : 'node build/index.js'}`,
				...(fw.listen ?? '').split('\n').map((line) => `${isoTime(failed.start + 3)}  [app] ${line}`),
				`${isoTime(failed.start + 3)}  [deploy] ${failed.id}: waiting for the app to answer on port 8080`,
				`${isoTime(failed.start + 4)}  [deploy] ${failed.id}: health check failed: nothing answered on 0.0.0.0:8080 within 60 s`,
				`${isoTime(failed.start + 4)}  [deploy] ${failed.id}: stopped; ${history.find((row) => row.good)?.id} is still live`
			];
			return lead(block(lines));
		}
		case 'curlCache': {
			const preview = ctx.path.detail.some((text) => text.includes('{previewBranch}'));
			const live = history.find((row) => row.result === 'live') ?? history[0]!;
			const old = preview ? live : history[1] ?? live;
			return lead(
				block([
					`$ curl -sI https://${v.domain}/`,
					'HTTP/2 200',
					'content-type: text/html; charset=utf-8',
					`cache-control: ${preview ? 'public, max-age=0, must-revalidate' : `public, max-age=${ctx.maxAge}`}`,
					`age: ${preview ? 0 : int(r, 600, ctx.maxAge - 60)}`,
					`etag: "${hex(r, 16)}"`,
					'server: harbor-edge',
					`x-harbor-cache: ${preview ? 'MISS' : 'HIT'}`,
					`x-harbor-deploy: ${old.id}`,
					`x-harbor-pop: ${pick(r, ['sea1', 'sjc2', 'iad1', 'ord1', 'fra1'])}`,
					`date: ${dayNames[at(t).getUTCDay()]!.slice(0, 3)}, ${pad(at(t).getUTCDate())} ${monthNames[at(t).getUTCMonth()]!.slice(0, 3)} 2026 ${clock(t)}:${pad(int(r, 0, 59))} GMT`
				])
			);
		}
		case 'curlCert':
			return lead(
				block(
					topic.dig === 'caa'
						? [`$ curl -sI https://${v.domain}`, `curl: (60) SSL: no alternative certificate subject name matches target host name '${v.domain}'`, 'More details here: https://curl.se/docs/sslcerts.html', '', `$ curl -sI https://${v.project}.onharbor.example`, 'HTTP/2 200', 'server: harbor-edge', 'content-type: text/html; charset=utf-8']
						: [`$ curl -sI https://${v.domain}`, 'curl: (60) SSL certificate problem: certificate has expired', 'More details here: https://curl.se/docs/sslcerts.html', '', `$ curl -sIk https://${v.domain}`, 'HTTP/1.1 200 OK', `server: ${pick(r, ['nginx', 'Apache', 'LiteSpeed'])}`, `content-length: ${int(r, 1200, 9000)}`]
				)
			);
		case 'dig': {
			if (topic.dig === 'caa')
				return lead(block([`$ dig +short ${v.domain} A`, '203.0.113.10', '203.0.113.11', `$ dig +short www.${v.domain} CNAME`, 'edge.onharbor.example.', `$ dig +short ${v.domain} CAA`, '0 issue "digicert.com"', `0 iodef "mailto:it@${v.domain}"`, '', `$ curl -sI https://${v.domain}`, `curl: (60) SSL: no alternative certificate subject name matches target host name '${v.domain}'`]));
			const forwarding = ctx.path.detail.some((text) => text.includes('forwarding'));
			return lead(
				block(
					forwarding
						? [`$ dig +short ${v.domain} A`, `192.0.2.${int(r, 30, 90)}`, `$ dig +short www.${v.domain} CNAME`, 'edge.onharbor.example.', `$ curl -sI http://${v.domain}`, 'HTTP/1.1 301 Moved Permanently', `location: https://www.${v.domain}/`, 'server: registrar-forwarding']
						: [`$ dig +short ${v.domain} A`, '203.0.113.10', '203.0.113.11', `$ dig +short www.${v.domain} CNAME`, 'edge.onharbor.example.', `$ dig +short ${v.domain} NS`, `ns1.${pick(r, ['dnshost', 'registrar', 'nameserve'])}.example.`, `ns2.${pick(r, ['dnshost', 'registrar', 'nameserve'])}.example.`]
				)
			);
		}
		case 'cert': {
			if (topic.dig === 'caa')
				return `Certificate for ${v.domain}:\n\n${block(['Status:        not issued', 'Authority:     Let’s Encrypt', `Attempts:      ${int(r, 6, 40)}, hourly since the domain was added`, `Last error:    CAA record for ${v.domain} forbids issuance by letsencrypt.org`, 'CAA found:     0 issue "digicert.com"', `Serving:       default *.onharbor.example certificate`])}`;
			return `Certificate for ${v.domain}:\n\n${block([
				`Status:        expired ${iso(ctx.cert)} 08:${pad(int(r, 0, 59))} UTC`,
				'Authority:     Let’s Encrypt (R11)',
				`Renewal:       failing since ${iso(ctx.cert - 30 * 1440)}, ${int(r, 25, 60)} attempts`,
				`Last error:    http-01 challenge for ${v.domain}: 404 from ${v.otherIp} (not a Harbor address)`,
				`DNS now:       ${v.domain} A ${v.otherIp}`,
				'Expected:      A 203.0.113.10, 203.0.113.11',
				`Nameservers:   ns1.${pick(r, ['mailhostdns', 'newprovider', 'dnsplus'])}.example (changed in ${v.lastMonth})`
			])}\n\n${renderPaste(r, 'mail', t, true, ctx)}`;
		}
		case 'claim':
			return internal
				? `Domain record:\n\n${block([`Domain:         ${v.domain}`, `Attached to:    ${v.oldPid} (account of ${v.oldAgency})`, `Attached since: ${shortDate(ctx.created - int(r, 20, 300) * 1440)}`, `Verification:   TXT _harbor-verify.${v.domain} ${ctx.path.detail.some((text) => text.includes('TXT record added')) ? `"${v.token}" found` : 'not found'}`, `Requested by:   ${v.pid} (${v.project})`])}`
				: lead(block([`$ harbor domains add ${v.domain} --project ${v.pid}`, `Error: ${v.domain} is attached to another project.`, '', 'If you control this domain, add this DNS record and run the command again with --verify:', `  TXT  _harbor-verify.${v.domain}  "${v.token}"`]));
		case 'consoleBilling': {
			const months = int(r, 3, 5);
			const rows: string[] = [];
			const monthIndex = at(ctx.open).getUTCMonth();
			for (let i = 0; i < months; i++) {
				const amount = i === 0 ? ctx.total : tier.cents + (r() < 0.5 ? 0 : int(r, 10, 900));
				rows.push(`1 ${monthNames[monthIndex - i]!.slice(0, 3)} 2026    ${consoleMoney(amount).padEnd(9)}Download`);
			}
			return lead(['Billing', '', `Plan: ${v.plan}, ${v.consolePrice} a month`, '', 'Invoices', ...shuffle(r, rows)].join('\n'));
		}
		case 'pdf': {
			const monthIndex = at(ctx.open).getUTCMonth();
			const issued = `1 ${monthNames[monthIndex]!} 2026`;
			const lines = [`Harbor invoice ${v.invoiceNo}`, `Issued ${issued} · project ${v.project} (${v.pid})`, `Billed to: ${topic.subjects[0] === 'Invoice details' ? v.project : v.biz}`, '', `${v.plan} plan, ${monthNames[monthIndex]}`.padEnd(56) + money(tier.cents)];
			if (ctx.gb) lines.push(`Bandwidth over ${tier.bandwidth >= 1000 ? `${tier.bandwidth / 1000} TB` : `${tier.bandwidth} GB`} in ${monthNames[monthIndex - 1]}: ${ctx.gb} GB × $0.08`.padEnd(56) + money(ctx.gb * 8));
			if (ctx.minutes) lines.push(`Build minutes over allowance: ${ctx.minutes} × $0.01`.padEnd(56) + money(ctx.minutes));
			lines.push('', 'Total'.padEnd(56) + money(ctx.total), `Paid by card ending ${v.card} on ${issued}`);
			return lead(internal ? `Invoice ${v.invoiceNo} from the billing system:\n\n${block(lines)}` : block(lines));
		}
		case 'usage': {
			const monthIndex = at(ctx.open).getUTCMonth() - 1;
			const days = monthIndex === 8 ? 30 : 31;
			const quiet = topic.subjects[0] === 'Downgrade';
			const daily = quiet ? 1.2 + r() * 1.5 : (tier.bandwidth * (0.45 + r() * 0.3)) / days;
			const spikeExtra = ctx.gb + tier.bandwidth * 0.3;
			const rows = ['| Day | Bandwidth | Requests | Top referrer |', '| --- | ---: | ---: | --- |'];
			let sum = 0;
			const ref = pick(r, referrers);
			for (let d = 1; d <= days; d++) {
				const spiking = topic.shows === 'pdf' && d >= ctx.spikeDay;
				const gbDay = daily * (0.7 + r() * 0.6) + (spiking ? (spikeExtra / (days - ctx.spikeDay + 1)) * (0.8 + r() * 0.4) : 0);
				sum += gbDay;
				rows.push(`| ${d} ${monthNames[monthIndex]!.slice(0, 3)} | ${gbDay.toFixed(1)} GB | ${Math.round(gbDay * int(r, 9000, 16000)).toLocaleString('en-US')} | ${spiking ? ref : pick(r, ['(direct)', 'google.example', '(direct)', 'search.example', 'social.example'])} |`);
			}
			rows.push(`| **Total** | **${sum.toFixed(0)} GB** | | |`);
			return `Bandwidth for ${v.project} in ${monthNames[monthIndex]}, from \`harbor usage --daily\` (plan includes ${tier.bandwidth >= 1000 ? `${tier.bandwidth / 1000} TB` : `${tier.bandwidth} GB`}):\n\n${rows.join('\n')}`;
		}
		case 'members': {
			const subject = topic.subjects[0]!;
			const moved = ctx.path.look.some((text) => text.includes('Moved ownership'));
			const before = subject === 'Owner left the company' && !(internal && moved);
			const seen = (days: number) => (days < 0 ? 'never' : shortDate(ctx.open - days * 1440));
			const people: string[][] = [[v.full!, v.email!, before ? 'admin' : 'owner', seen(0)]];
			if (before) people.unshift([v.former!, `${v.formerFirst!.toLowerCase()}@${v.domain}`, 'owner', seen(40)]);
			if (subject === 'Colleague can’t see the project' || (subject === 'Add a team member' && internal)) people.push([v.staffFull!, v.staffEmail!, 'admin', 'never']);
			const taken = [v.full!, v.staffFull!, v.former!].map((name) => name.split(' ')[0]);
			for (const row of ctx.crew) if (people.length < ctx.members && !taken.includes(row[0]!.split(' ')[0])) people.push([row[0]!, row[1]!, row[2]!, seen(Number(row[3]))]);
			const rows = ['| Name | Email | Role | Last sign-in |', '| --- | --- | --- | --- |', ...people.map((row) => `| ${row.join(' | ')} |`)];
			return lead(internal ? `Members of ${v.project} (${v.pid}):\n\n${rows.join('\n')}` : rows.join('\n'));
		}
		case 'audit': {
			const out: string[] = [];
			const add = (when: number, who: string, what: string) => out.push(`${iso(when)} ${clock(when)}  ${who.padEnd(22)}${what}`);
			const routine = [`deploy ${history[2]?.id ?? history[0]!.id} started (git push)`, 'build cache cleared', `domain www.${v.domain} certificate renewed`, `member ${pick(r, staffNames)} signed in`, 'preview protection turned on', `env var NODE_ENV updated`];
			const times = [...new Set(Array.from({ length: int(r, 4, 7) }, () => t - int(r, 60, 20 * 1440)))].sort((a, b) => a - b);
			const rename = topic.build === 'env' ? office(r, startOfDay(t) - int(r, 1, 2) * 1440 + int(r, 0, 400)) : 0;
			for (const when of times) {
				if (rename && when > rename && !out.some((line) => line.includes(v.envVar!))) {
					add(rename, v.staffFull!, `env var ${v.envVar} removed`);
					add(rename + 1, v.staffFull!, `env var ${v.envNew} added`);
				}
				add(when, pick(r, [v.full!, v.staffFull!, 'harbor (automatic)']), pick(r, routine));
			}
			if (rename && !out.some((line) => line.includes(v.envVar!))) {
				add(rename, v.staffFull!, `env var ${v.envVar} removed`);
				add(rename + 1, v.staffFull!, `env var ${v.envNew} added`);
			}
			if (!topic.build) {
				add(t, `support (${v.agent})`, `notification email changed: ${v.notify} → ${v.newNotify}`);
				add(t + 1, `support (${v.agent})`, 'test message sent to the notification email');
			}
			return `Audit log for ${v.project}:\n\n${block(out)}`;
		}
		case 'env': {
			const names = ['NODE_ENV', 'PUBLIC_SITE_URL', 'SESSION_SECRET', 'ANALYTICS_ID', 'IMAGE_CDN_URL', 'LOG_LEVEL'];
			const rows = shuffle(r, [...names.slice(0, int(r, 3, 6)), v.envNew!]).map((name) => `${name.padEnd(22)}production   ${(name === v.envNew ? shortDate(startOfDay(t) - 1440) : shortDate(t - int(r, 30, 300) * 1440)).padEnd(13)}${name === v.envNew ? v.staffFull : pick(r, [v.full, v.former])}`);
			return lead(block([`$ harbor env list --project ${v.pid}`, `${'NAME'.padEnd(22)}SCOPE        UPDATED      BY`, ...rows]));
		}
		case 'queue': {
			const incident = incidentOf(ctx.open);
			const [fromH, fromM] = incident.from.split(':').map(Number) as [number, number];
			const [toH, toM] = incident.to.split(':').map(Number) as [number, number];
			const start = incident.day + fromH! * 60 + fromM!;
			const end = incident.day + toH! * 60 + toM!;
			const out: string[] = [];
			const peak = int(r, 90, 160);
			for (let m = start - 15; m <= end + 15; m += 15) {
				const inside = m >= start && m < end;
				const depth = inside ? Math.round(peak * Math.sin((Math.PI * (m - start + 15)) / (end - start + 30))) + int(r, -6, 6) : int(r, 0, 4);
				out.push(`${clock(m)}  depth ${String(depth).padStart(3)}   oldest wait ${String(inside ? Math.min(Math.round((m - start) * 0.9), 180) : 0).padStart(3)}m${m === start ? `   ${incident.what}` : ''}`);
			}
			const queued = history.filter((row) => row.result === 'queued').reverse();
			const theirs = queued.map((row, i) => `${row.id} queued ${clock(row.start)}, started ${clock(end - 6 + i * 3)}, ${row === history[0] ? 'live' : 'replaced'} ${clock(end - 4 + i * 3 + 2)}`);
			return `Build queue, ${longDate(incident.day)}:\n\n${block(out)}\n\nTheir deploys: ${theirs.join('; ')}.`;
		}
		case 'payment': {
			const attempts = ['card_declined: card_replaced', 'card_declined: do_not_honor'];
			const reason = ctx.path.detail.some((text) => text.includes('replaced')) ? attempts[0]! : attempts[1]!;
			if (internal) {
				const first = startOfDay(ctx.open) - int(r, 2, 5) * 1440 + 6 * 60;
				return `Payment attempts for ${v.invoiceNo} (${money(ctx.total)}):\n\n${block([`${isoTime(first)}  card ending ${v.card}  ${reason}`, `${isoTime(first + 3 * 1440)}  card ending ${v.card}  ${reason}`, `Suspension notice sent to ${v.billingEmail} on ${iso(first)}`])}`;
			}
			return lead([`> Subject: Payment failed for ${v.project}`, '>', `> We couldn’t take payment of ${money(ctx.total)} for invoice ${v.invoiceNo} from the card ending ${v.card}.`, '> We’ll try the card once more in three days. If we still can’t take payment within seven days, your', '> project will be suspended until the invoice is paid. You can update your card using the link below.', '>', '> Harbor billing'].join('\n'));
		}
	}
};
const nodeAt = (t: number) => (t < NODE_DEFAULT ? '18.20.4 (default)' : '22.9.0 (default)');

// Which topic and path each ticket follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two tickets on one topic end differently until its paths run out.
const order = mulberry32(20260914);
const plans_: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const allowed = (topic: Topic) =>
		topic.history === 'queue' ? incidents.some((incident) => incident.day === open) && !plans_.some((plan) => plan.topic === topic && plan.open === open) : !topic.since || open >= startOfDay(topic.since);
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics.filter((topic) => topic.history !== 'queue' || !deck.includes(topic))));
	const queue = topics.find((topic) => topic.history === 'queue')!;
	const at_ = allowed(queue) && deck.includes(queue) ? deck.indexOf(queue) : deck.findIndex(allowed);
	const topic = deck.splice(at_, 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	plans_.push({ topic, path: topic.paths[(seen + topics.indexOf(topic)) % topic.paths.length]!, open });
}

const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
let number = 2140;
plans_.forEach((plan, index) => {
	number += int(order, 1, 4);
	writeFileSync(join(folder, `ticket-${number}.md`), ticket(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets, 14 September to 30 October 2026\n\nThe ${ITEMS} tickets Harbor support handled in these seven weeks, one file each, exported from the help desk. The\nexport kept the messages and internal notes but not the tags, statuses or assignees. Numbers missing from the\nsequence were spam or were merged into another ticket. Admin-tool, log and billing extracts in internal notes are as\nsupport pasted them.\n`
);
