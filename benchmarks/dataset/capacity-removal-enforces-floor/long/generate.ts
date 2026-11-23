// Writes the long material of this entry's long tasks: the tickets tenant teams raised with the storage desk
// between July and November 2026, one Markdown file each, under docs/tickets/. Deterministic: fixed seeds, no
// clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// How many tickets to write. Everything else (numbers, dates, the README) follows from it.
const ITEMS = 116;

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
const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const hex = (r: Rand, length: number) => {
	let out = '';
	for (let i = 0; i < length; i++) out += '0123456789abcdef'[Math.floor(r() * 16)];
	return out;
};
const clock = (r: Rand) => `${pad(int(r, 0, 23))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}`;
const addDays = (date: string, days: number): string => {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const httpDate = (date: string, time: string) => {
	const d = new Date(`${date}T00:00:00Z`);
	return `${weekdays[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${months[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCFullYear()} ${time} GMT`;
};
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const prose = (date: string) => `${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1]}`;

// The first ticket is opened on START, the last about SPAN days later; nothing is dated after EXPORT, the day the
// old desk was switched off.
const START = '2026-07-01';
const SPAN = 127;
const EXPORT = '2026-11-18';

// The storage desk runs the Kestrel fleet and answers the tickets; the lead takes the calls nobody else wants to.
const desk = ['Priya Raman', 'Mateo Ferreira', 'Ines Kowalczyk', 'Theo Adeyemi', 'Hana Novak'];
const lead = 'Gwen Albright';

type Client = 'python' | 'java' | 'go' | 'node';
interface Team {
	label: string;
	/** A noun phrase for the team's service, used inside sentences. */
	name: string;
	people: [string, string];
	buckets: string[];
	client: Client;
	agent: string;
	svc: string;
	/** Own stack frames or function names, by client. */
	frames: string[];
	object: (r: Rand, date: string) => string;
}
const py = 'Boto3/1.34.84 md/Botocore#1.34.84 ua/2.0 os/linux#6.1 lang/python#3.11.9';
const java = 'aws-sdk-java/2.25.31 Linux/6.1 OpenJDK_64-Bit_Server_VM/21.0.3';
const go = 'aws-sdk-go-v2/1.26.1 os/linux lang/go#1.22.4 api/s3#1.53.1';
const node = 'aws-sdk-js/3.552.0 ua/2.0 os/linux#6.1 lang/js md/nodejs#20.12.2 api/s3#3.552.0';
const teams: Record<string, Team> = {
	photos: {
		label: 'Photos', name: 'the photo service', people: ['Dana Whitfield', 'Arjun Mehta'], buckets: ['photos-originals', 'photos-thumbs'], client: 'java', agent: java, svc: 'photo-store',
		frames: ['app.photos.store.ObjectReader.fetch(ObjectReader.java:{L})', 'app.photos.store.ThumbnailHandler.handle(ThumbnailHandler.java:{L})', 'app.photos.http.Router.dispatch(Router.java:{L})'],
		object: (r) => `u/${int(r, 100000, 999999)}/${hex(r, 12)}${pick(r, ['.jpg', '_320.jpg', '_1080.jpg', '.heic'])}`
	},
	mobile: {
		label: 'Mobile', name: 'the mobile app', people: ['Oskar Lindgren', 'Mei Tanaka'], buckets: ['app-uploads-eu', 'app-uploads-us'], client: 'node', agent: node, svc: 'upload-gateway',
		frames: ['/srv/upload-gateway/src/upload/sign.js', '/srv/upload-gateway/src/upload/handler.js', '/srv/upload-gateway/src/server.js'],
		object: (r) => `inbox/${hex(r, 8)}-${hex(r, 4)}/${pick(r, ['IMG_2231.heic', 'holiday photo.heic', 'scan 3.pdf', 'receipt.jpg', 'voice note 12.m4a', 'IMG_0458.mov', 'Screenshot 2026-06-02.png'])}`
	},
	warehouse: {
		label: 'Data warehouse', name: 'the data warehouse', people: ['Farah Siddiqui', 'Greg Holm'], buckets: ['wh-landing', 'wh-parquet'], client: 'python', agent: py, svc: 'wh-loader',
		frames: ['land.py:land_file', 'compact.py:compact_partition', 'cli.py:main'],
		object: (r, date) => (r() < 0.3 ? `raw/src-${pad(int(r, 1, 300), 3)}/${date}/events-${pad(int(r, 0, 95))}.json.gz` : `events/dt=${date}/part-${pad(int(r, 0, 511), 5)}.parquet`)
	},
	logs: {
		label: 'Log archive', name: 'the log archive', people: ['Bastien Moreau', 'Ama Boateng'], buckets: ['log-archive-2026'], client: 'go', agent: go, svc: 'logship',
		frames: ['logship', 'logship/archive', 'logship/sweep'],
		object: (r, date) => `edge/${date.replace(/-/g, '/')}/${pad(int(r, 0, 23))}/edge-${pad(int(r, 1, 40))}.log.gz`
	},
	ci: {
		label: 'Build cache', name: 'the build cache', people: ['Keiko Mori', 'Dmitri Volkov'], buckets: ['ci-cache'], client: 'go', agent: go, svc: 'cachesrv',
		frames: ['cachesrv', 'cachesrv/cas', 'cachesrv/gc'],
		object: (r) => `cas/${hex(r, 2)}/${hex(r, 40)}`
	},
	video: {
		label: 'Video', name: 'the video pipeline', people: ['Rafael Quintero', 'Sofia Lund'], buckets: ['video-masters', 'video-renditions'], client: 'python', agent: py, svc: 'transcode',
		frames: ['ingest.py:upload_master', 'publish.py:publish_renditions', 'worker.py:run'],
		object: (r) => (r() < 0.5 ? `masters/2026/ep-${int(r, 1000, 1999)}/master.mov` : `r/ep-${int(r, 1000, 1999)}/${pick(r, ['1080p', '720p', '480p'])}/seg-${pad(int(r, 0, 2400), 5)}.ts`)
	},
	ml: {
		label: 'ML platform', name: 'the training platform', people: ['Ngozi Eze', 'Pavel Horak'], buckets: ['ml-datasets', 'ml-checkpoints'], client: 'python', agent: py, svc: 'trainer',
		frames: ['checkpoint.py:save', 'dataset.py:read_shard', 'train.py:main'],
		object: (r) => `runs/r-${int(r, 2000, 2999)}/step-${pad(int(r, 1, 40) * 1000, 6)}/shard-${pad(int(r, 0, 15))}-of-16.pt`
	},
	billing: {
		label: 'Billing', name: 'billing', people: ['Liam Gallagher', 'Rosa Jimenez'], buckets: ['billing-exports'], client: 'java', agent: java, svc: 'ledger-export',
		frames: ['app.billing.export.ExportReader.read(ExportReader.java:{L})', 'app.billing.export.ReconcileJob.run(ReconcileJob.java:{L})', 'app.billing.Main.main(Main.java:{L})'],
		object: (r, date) => (r() < 0.5 ? `exports/${date}/ledger-${pad(int(r, 1, 24))}.csv.gz` : `invoices/${date.slice(0, 7)}/acct-${int(r, 100000, 199999)}.pdf`)
	},
	search: {
		label: 'Search', name: 'search indexing', people: ['Sunita Pillai', 'Erik Dahl'], buckets: ['search-snapshots'], client: 'java', agent: java, svc: 'snapshotter',
		frames: ['app.search.snapshot.SegmentStore.get(SegmentStore.java:{L})', 'app.search.snapshot.Restore.run(Restore.java:{L})', 'app.search.Main.main(Main.java:{L})'],
		object: (r, date) => `snapshots/products-v4/${date}T0200/seg-${pad(int(r, 0, 4000), 6)}`
	},
	mail: {
		label: 'Mail', name: 'mail attachments', people: ['Jonas Becker', 'Aisha Rahman'], buckets: ['mail-attachments'], client: 'go', agent: go, svc: 'attachd',
		frames: ['attachd', 'attachd/store', 'attachd/scan'],
		object: (r, date) => `a/${date.replace(/-/g, '/')}/${hex(r, 32)}`
	},
	maps: {
		label: 'Maps', name: 'the map tile service', people: ['Marta Silva', 'Kwame Asante'], buckets: ['map-tiles.v2', 'map-styles'], client: 'node', agent: node, svc: 'tileserver',
		frames: ['/srv/tileserver/src/store.js', '/srv/tileserver/src/tiles.js', '/srv/tileserver/src/index.js'],
		object: (r) => {
			if (r() < 0.3) return `styles/${pick(r, ['Winter roads', 'night+terrain', 'hiking-v2', 'Bike lanes (draft)', 'transit_dark', 'coast+ferries', 'Ski runs 2026'])}.json`;
			const z = int(r, 10, 16);
			return `tiles/z${z}/${int(r, 0, 2 ** z - 1)}/${int(r, 0, 2 ** z - 1)}.pbf`;
		}
	}
};

type Area = 'api' | 'index' | 'placement' | 'storage' | 'tenant';
type Kind = 'error' | 'flaky' | 'slow' | 'wrong' | 'request';
type Op = 'PUT' | 'GET' | 'HEAD' | 'LIST' | 'COMPLETE' | 'COPY' | 'CREATE' | 'OPTIONS';
type Art = 'trace' | 'stack' | 'access' | 'latency' | 'listing' | 'errors' | 'own';
type Ending = 'ours' | 'theirs' | 'workaround' | 'declined' | 'waitTenant' | 'waitUs';
interface Ctx {
	r: Rand;
	team: Team;
	bucket: string;
	date: string;
	topic: Topic;
}

// One kind of ticket. `cause` is where the trouble really was; it never appears in a file as a field. The texts
// take {B} (the bucket), {TEAM} (the team's service) and {D} (a date in prose).
interface Topic {
	cause: Area;
	kind: Kind;
	op: Op;
	error?: [number, string];
	teams: string[];
	/** The earliest date a ticket of this topic can be opened, when its texts name a month. */
	after?: string;
	buckets?: string[];
	asks: [string, string][];
	facts: string[];
	question: string;
	answer: string;
	suspect?: { area: Area; text: string[] };
	finding: string[];
	confirm: string;
	again?: string;
	plea?: string;
	ours?: string;
	theirs?: string;
	workaround?: ['us' | 'them', string];
	declined?: string;
	waitUs?: string;
	waitTenant?: string;
	endings: Ending[];
	arts: Art[];
	headers?: string[];
	/** Which keys fail, when only some do. */
	failsFor?: (key: string) => boolean;
	/** The api hosts that answer the errors, when only some do. */
	failHosts?: string[];
	/** What the api's own access log shows for a failed request, when the error came from in front of it. */
	accessFail?: [number, number, number];
	/** How long a request that did not fail takes, in milliseconds, when it is not the usual few. */
	accessMs?: [number, number];
	/** The kind of key the topic is about, when the team has others. */
	keyLike?: RegExp;
	stackError?: string;
	own?: (c: Ctx) => string;
}

const topics: Topic[] = [
	{
		cause: 'tenant', kind: 'error', op: 'PUT', error: [403, 'SignatureDoesNotMatch'], teams: ['mobile', 'maps'], failsFor: (key) => /[ +]/.test(key),
		asks: [
			['Uploads fail with 403 SignatureDoesNotMatch since Tuesday', 'Since Tuesday morning about one upload in thirty from {TEAM} fails with 403 SignatureDoesNotMatch. Nothing changed on our side that we know of, and retrying the same file fails again every time, so it is not random.'],
			['Some files can never be uploaded, always 403', 'There is a set of files that we cannot get into {B} at all. Every attempt answers 403 with SignatureDoesNotMatch, while files sent a second earlier by the same process go through.'],
			['Signature errors on some keys only?', 'We think uploads to {B} whose key contains a space or a plus sign are turned away with 403, but we are not certain that is the pattern. The error body says SignatureDoesNotMatch and nothing else useful.'],
			['403 on PUT after the api release last week', 'Our upload error rate went from zero to about 3% the day after the api release. All of the failures are 403 SignatureDoesNotMatch on PUT into {B}.']
		],
		facts: ['The failing keys come from users who name their files themselves; generated names never fail.', 'The same keys upload fine with the command-line tool from a laptop.', 'The failures are spread evenly over the day.', 'The client sends the date header from a synchronised clock; we checked that first.'],
		question: 'Can you send the request IDs of two or three failed uploads, and the exact key as your code sees it before signing?',
		answer: 'Here are three. One thing I did not mention: we sign the requests ourselves rather than through the SDK, because the SDK made the bundle too big.',
		suspect: { area: 'api', text: ['The timing points at the api release: it changed how the canonical request is built for chunked uploads, and a regression there would look exactly like this.', 'My first guess is the api tier. The release that week touched signature checking, and a mismatch that only hits some keys smells like a canonicalisation change on our side.'] },
		finding: ["I compared the canonical request the api built with the one in your client's debug output. They differ in one place: the client encodes a space in the key as `+`, the api expects `%20`. The api has always done that, so the release is a coincidence. The cause is in the client's signer.", 'Found it. The signer in your code escapes the key with a form-style encoder, so `holiday photo.heic` is signed as `holiday+photo.heic` while the request line carries `holiday%20photo.heic`. Every key with a space or a plus fails, and nothing else does. The api is doing what the signing spec says.'],
		confirm: 'No 403 since the new version went out.',
		plea: 'Changing the signer means a release of our own, and that takes weeks to reach everyone. Could the api accept the `+` form as well, at least for a while?',
		theirs: 'We switched the signer to percent-encode the path the way the spec says, `%20` for a space and `%2B` for a plus. The version with the change went out on Monday and we have had no 403 since.',
		workaround: ['them', 'Until our release is out, the upload code replaces spaces and plus signs in user-chosen names with underscores before signing. The names look slightly odd to users, but every upload goes through.'],
		declined: 'Accepting both encodings in the api would mean two canonical forms for one request, which weakens the signature check for every tenant. We will not do that; the client has to encode the path as specified.',
		waitTenant: 'Could you change the signer to percent-encode each path segment on your staging build and tell us whether the failing keys go through?',
		endings: ['theirs', 'declined', 'workaround', 'waitTenant'], arts: ['trace', 'stack', 'access']
	},
	{
		cause: 'index', kind: 'wrong', op: 'LIST', teams: ['warehouse', 'logs', 'ml'],
		asks: [
			['New objects missing from listings for up to a minute', 'Our loader writes a file to {B} and then lists the prefix to find everything that arrived in the last hour. Every few runs the file it just wrote is not in the listing, and the run finishes without it.'],
			['Listing and GET disagree right after upload', 'A GET on a key we have just written returns the object, but a listing of its prefix made in the same second does not include it. Ten to sixty seconds later the listing catches up.'],
			['Nightly job skips files that landed late', 'The nightly job of {TEAM} lists yesterday\'s partition and processes what it finds. Files written in the last minute before the listing are sometimes left out, and stay unprocessed until someone notices a gap in the dashboards.'],
			['Is listing eventually consistent?', 'The documentation says listings are consistent, but what we see in {B} looks eventual: objects show up in listings later than in GET. Before we build around it we would like to know which is meant to be true.']
		],
		facts: ['The missing objects always appear in a later listing; nothing is ever lost.', 'The gaps cluster in the busiest hour of the night, between 01:00 and 02:00 UTC.', 'HEAD and GET on the missing keys succeed every time.', 'The prefix being listed holds a few hundred thousand keys.'],
		question: 'Could you give us one bucket, prefix and key that was missing, with the time of the PUT and the time of the listing, to the second?',
		answer: 'Here is one from last night. The PUT returned at 01:14:07 and the listing started at 01:14:08; the key showed up in a listing at 01:14:52.',
		suspect: { area: 'storage', text: ['If GET finds it, the data is on disk, but I wonder whether the write is acknowledged before every storage host has its fragment, and the listing waits for that. Checking the storage write path first.'] },
		finding: ['It is the index. Listings are served by any replica of the bucket\'s index partition, and the replicas apply writes from a log; under the nightly load the slowest replica runs up to a minute behind. GET goes to the partition leader, which is why it always finds the object.', 'The data side is fine: the object is fully written when the PUT returns. What lags is the index replica that answered the listing. In the busy hour, replicas fall behind the leader by tens of seconds, and listings are spread over replicas to share the load.'],
		confirm: 'No gaps in a week of nightly runs.',
		again: 'Two files went missing from last night\'s listing again.',
		ours: 'Listings now go to the partition leader for 120 seconds after a write to the same prefix, and to replicas otherwise. The index release with the change went out on {D}.',
		theirs: 'The loader now records the keys it writes and checks them with HEAD instead of trusting the listing. It was a small change and the gaps are gone.',
		workaround: ['them', 'The job now waits two minutes between its last write and the listing. That has been enough every night since we started.'],
		waitUs: 'The change that sends listings to the partition leader after a write is written and reviewed, but it has to go out with the next index release, which is not before the end of the month.',
		waitTenant: 'The index change is on staging. Could you point a copy of the loader at the staging endpoint for a night and tell us whether any key goes missing?',
		endings: ['ours', 'theirs', 'workaround', 'waitUs', 'waitTenant'], arts: ['listing', 'access']
	},
	{
		cause: 'index', kind: 'error', op: 'LIST', teams: ['ml', 'ci', 'mail'], after: '2026-09-01',
		asks: [
			['Listing a large prefix never finishes', 'A full listing of one prefix in {B} has been running for six hours. The tool logs a page every second, and the keys it prints started repeating after the first two million.'],
			['Paginated listing returns the same page forever', 'After a certain point the continuation token we get back from {B} gives us the page we just had, so the client asks for the same page again and again.'],
			['Inventory job stuck in a loop on one bucket', 'Our weekly inventory of {B} normally takes forty minutes. This week it did not finish, and when we stopped it the output had the same thousand keys over and over.']
		],
		facts: ['Keys under that prefix are long: several nested names and a hash, some over 300 bytes.', 'Other prefixes in the same bucket list to the end without trouble.', 'The loop starts at the same key every time.'],
		question: 'Can you send the key at which the listing starts repeating, and the two continuation tokens around it?',
		answer: 'The key where it sticks is 318 bytes long. Both tokens are in the paste; the decoded parts look identical to us.',
		suspect: { area: 'api', text: ['The api decodes the continuation token and passes it on. If your client re-encodes the token, the api might be getting something it cannot parse and starting the page again.'] },
		finding: ['It is in the index. The continuation token stores the last key it returned, cut to 255 bytes. When two keys share their first 255 bytes, the index resumes at the cut form, which sorts before both, and hands out the same page again.', 'The api passes the token through untouched. The index cuts the last key in the token to 255 bytes, and for keys longer than that the cut key sorts before the real one, so the next page starts where the last one did.'],
		confirm: 'The inventory ran to the end last night, in forty-two minutes.',
		again: 'The inventory is looping again, on another prefix this time.',
		ours: 'The index now stores the full last key in the token instead of cutting it. The change went out with the index release on {D}, and listings of long keys run to the end.',
		theirs: 'We shortened the key layout for new objects so that no key is over 200 bytes, and copied the old ones to the new layout. The inventory finishes again.',
		workaround: ['them', 'The inventory now lists the prefix in smaller pieces, one sub-prefix at a time, which avoids the long shared stretch of the keys.'],
		waitUs: 'The fix changes the token format, so it has to go out with the next index release, together with a way to read old tokens. That release is planned for December.',
		waitTenant: 'A build of the index with full keys in the token is on staging. Could you run the inventory there against the copy of {B} and tell us whether it reaches the end?',
		endings: ['ours', 'theirs', 'workaround', 'waitUs', 'waitTenant'], arts: ['stack', 'own'],
		stackError: 'listing did not finish: 5,000,000 keys read without reaching the end of the prefix',
		own: ({ r, team, bucket, date }) => {
			const stem = `${team.object(r, date).split('/').slice(0, 2).join('/')}/${'a'.repeat(0)}`;
			const token = `${hex(r, 6)}${'x'.repeat(0)}`;
			const lines = [`$ inventory --bucket ${bucket} --prefix ${stem} --log-pages`];
			let page = int(r, 2100, 2400);
			for (let i = 0; i < int(r, 6, 9); i++) {
				lines.push(`${date}T0${int(r, 2, 5)}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}Z page=${page} keys=1000 first=${stem}${hex(r, 8)}... next_token=${token}${i < 2 ? hex(r, 10) : 'c2VnLTAwMDEyNy9ydW4tYWxwaGEvMjAy'}`);
				page++;
			}
			return '```text\n' + lines.join('\n') + '\n```';
		}
	},
	{
		cause: 'storage', kind: 'slow', op: 'GET', teams: ['photos', 'maps', 'mail'], after: '2026-10-01',
		asks: [
			['p99 for small reads up to 900 ms', 'Our service reads small objects from {B}. Since the start of the month its p99 for a GET has gone from about 60 ms to between 700 and 900 ms, while p50 has barely moved.'],
			['Small reads slow, large reads fine', 'Objects under 64 KB in {B} take far longer to read than they used to. Larger objects in the same bucket are as fast as ever, which surprised us.'],
			['Tail latency on GET is hurting page loads', 'Every page we serve waits on dozens of small reads from {B}. A slow tail on those reads now shows up as slow pages, and the front-end team is asking us what changed.']
		],
		facts: ['The objects are 8 to 40 KB each.', 'The slow reads are spread over the day, not tied to our traffic peaks.', 'Our own service shows no change in CPU or memory over the period.'],
		question: 'Are the slow reads for objects of any age, or mostly older ones? A list of a few slow keys with their upload dates would help.',
		answer: 'Mostly older ones, now that you ask. Anything uploaded in the last week or so reads fast. A few keys with their dates are below.',
		suspect: { area: 'api', text: ['p50 steady and p99 up is often queueing in the api tier: a few slow requests holding connections. I will check connection counts on the api hosts first.'] },
		finding: ['The api is not where the time goes; it waits on storage for the whole tail. Small objects are kept in packs on the storage hosts, and pack compaction was paused when its schedule was changed in September. Older packs are now fragmented, so one small read can need four or five disk seeks.', 'Traced a few slow reads end to end. The api answers in a millisecond once storage replies, and storage takes up to 800 ms on packs that have not been compacted since September, when a schedule change stopped compaction on most storage hosts.'],
		confirm: 'Our p99 is back at 55 to 65 ms and has stayed there all week.',
		again: 'Our p99 is climbing again for older objects, 400 ms yesterday.',
		ours: 'Pack compaction is running on its old schedule again, and it has worked through the fragmented packs. Reads of older objects are back to their usual tail since {D}.',
		workaround: ['them', 'The service now keeps a local cache of the most requested small objects, which hides most of the tail.'],
		waitUs: 'Compaction has to catch up on six weeks of packs, and it runs at low priority so it does not slow live reads. At the current rate it will take until the middle of next month.',
		waitTenant: 'Compaction has caught up on most storage hosts. Could you check your p99 over the next two days and tell us whether it is back where it was?',
		endings: ['ours', 'workaround', 'waitUs', 'waitTenant'], arts: ['latency', 'listing']
	},
	{
		cause: 'placement', kind: 'slow', op: 'PUT', error: [503, 'SlowDown'], teams: ['logs', 'warehouse'],
		asks: [
			['PUT latency spikes at the top of every hour', 'Writes into {B} slow down for five to ten minutes at the start of every hour, with some 503 SlowDown answers, and then recover until the next hour.'],
			['503 SlowDown even though our request rate is flat', 'Our request rate is close to constant through the day, but we still get bursts of 503 SlowDown on PUT, always just after the hour changes.'],
			['Uneven write latency across the hour', 'The p95 of our writes to {B} swings from 40 ms to over a second within each hour. We want to understand whether this is us or the fleet.']
		],
		facts: ['The keys start with the date and the hour, for example `2026/09/14/13/`.', 'About 4,000 objects are written per minute, every minute.', 'Reads are not affected at all.'],
		question: 'What does a typical key look like, and how is it built? The exact layout matters here.',
		answer: 'Keys are `<date>/<hour>/<source>-<sequence>`, so every object written in one hour shares its first fourteen characters.',
		suspect: { area: 'storage', text: ['Spikes on the hour make me think of something scheduled on the storage hosts, a scrub or a log rotation. I will look at what runs on them at :00.'] },
		finding: ['Nothing scheduled runs at :00 on the storage hosts. The cause is placement: for this bucket it groups new objects by key prefix, so all writes of one hour go to a single placement group until the hour changes. When the new hour starts, a fresh group is opened and takes the whole write load cold.', 'It is placement. {B} was created before prefix hashing was the default, so placement still assigns objects to groups by their leading characters. Every write of an hour lands in one group, and the first minutes of each hour hit a group that has just been opened.'],
		confirm: 'The hourly spikes are gone from our graphs.',
		again: 'The spikes at the top of the hour are back since the weekend.',
		plea: 'Changing our key layout would break every reader we have. Could you change how placement treats {B} instead?',
		ours: 'Placement now hashes the whole key for {B}, as it does for buckets created this year. New writes spread over all groups, and the hourly spikes are gone from our graphs as well.',
		theirs: 'We put a two-character hash at the front of every key. Our readers needed a small change to find files, but the hourly spikes are gone.',
		workaround: ['them', 'The writer now spreads each hour over sixteen sub-prefixes chosen by a hash of the source name. It is not pretty, but it has flattened the spikes.'],
		declined: 'We cannot change placement for a bucket in place without moving its existing data, which for {B} is several hundred terabytes. The supported way is a hashed prefix in the keys, as the client guide describes, or a new bucket with prefix hashing.',
		waitUs: 'Switching {B} to whole-key hashing needs a placement change that only applies to new writes, and we want to try it on a smaller bucket first. That is booked for the next maintenance window.',
		endings: ['ours', 'theirs', 'workaround', 'declined', 'waitUs'], arts: ['latency', 'errors']
	},
	{
		cause: 'api', kind: 'error', op: 'COMPLETE', error: [500, 'InternalError'], teams: ['video', 'ml'], keyLike: /^(masters|runs)\//,
		asks: [
			['CompleteMultipartUpload fails for files over 50 GB', 'Uploads of large files into {B} fail at the last step: CompleteMultipartUpload returns 500 InternalError. Smaller files of the same kind complete fine.'],
			['500 at the end of large uploads, after hours of transfer', 'After several hours of sending parts, the final call that assembles the object returns 500, and the whole upload has to start again.'],
			['Large uploads never complete', 'Files over a certain size never appear in {B}. The upload tool reports success for every part and then an internal error when it completes.']
		],
		facts: ['The tool uses 5 MB parts, the smallest the API allows.', 'Retrying the completion call fails the same way.', 'The failures started when the files grew past about 50 GB this summer.'],
		question: 'How many parts do the failing uploads have, and what part size does the tool use?',
		answer: 'The failing ones have between 10,400 and 14,000 parts. The tool uses 5 MB parts because someone set that years ago and nobody changed it.',
		suspect: { area: 'index', text: ['A failure at completion is usually the index: completion writes the part list into the object record, and a very long part list might be hitting a size limit there.'] },
		finding: ['The index never sees these requests. The api caps an upload at 10,000 parts, as documented, but the check runs after it has started assembling the part list, and it fails with an unhandled error instead of a clear 400 TooManyParts. The limit is expected; the 500 is an api bug that hides it.', 'It stops in the api. Uploads are limited to 10,000 parts, and the api checks that at completion, but the check throws instead of answering 400, so you see a 500 with no hint of the reason.'],
		confirm: 'The tool now gets a clear error, and with bigger parts every file completes.',
		again: 'Another large upload failed at completion with a 500 yesterday.',
		plea: 'Could the part limit be raised for {B}? Changing the part size touches a lot of our scripts.',
		ours: 'The api now answers the 10,001st part with 400 TooManyParts instead of failing at completion, and the error names the limit. The release went out on {D}.',
		theirs: 'We raised the part size to 64 MB for anything over 20 GB. The largest file is now about 2,000 parts, and they all complete.',
		workaround: ['them', 'The tool now picks the part size from the file size, so no upload goes over 9,000 parts.'],
		declined: 'We will not raise the part limit; the 10,000-part limit is shared with every client library, and larger parts are the supported route for large objects.',
		waitUs: 'The api change to answer the extra part early, with a proper error, is written, but it waits for the next api release.',
		endings: ['ours', 'theirs', 'workaround', 'declined', 'waitUs'], arts: ['trace', 'stack', 'access']
	},
	{
		cause: 'tenant', kind: 'error', op: 'OPTIONS', error: [403, 'AccessForbidden'], teams: ['maps', 'mobile', 'photos'],
		headers: ['Origin: https://upload.apps.kestrel-tenants.internal', 'Access-Control-Request-Method: PUT', 'Access-Control-Request-Headers: content-type,x-checksum-sha256'],
		asks: [
			['Browser uploads blocked by CORS', 'The new web uploader cannot PUT into {B}: the browser\'s preflight request fails, and the console says no Access-Control-Allow-Origin header was present.'],
			['Preflight OPTIONS returns 403 for our web app', 'Since we moved uploads into the browser, every preflight OPTIONS request to {B} answers 403, so the browser never sends the real PUT.'],
			['CORS works for GET, fails for PUT', 'Images load from {B} in the browser without problems, but uploads from the same page are blocked with a CORS error.']
		],
		facts: ['The page is served from a new domain that went live this month.', 'Requests made with curl from a laptop work.', 'The uploader sends a custom header carrying a checksum.'],
		question: 'Could you paste the bucket\'s CORS configuration and the request headers of one failing preflight?',
		answer: 'Configuration and headers are below. The configuration was copied from another bucket a while ago.',
		suspect: { area: 'api', text: ['Preflight is answered entirely by the api tier, so if anything on our side is wrong, it is there. Checking the CORS handling in the last api release.'] },
		finding: ['The api is answering exactly as configured. The bucket\'s CORS rule allows the old domain only, and its AllowedHeaders list does not include the checksum header the uploader sends. A preflight that asks for a header not on the list is turned down, which is what the browser shows.', 'Nothing wrong in the api: it applies the bucket\'s CORS rule, and that rule allows GET and HEAD from any origin but PUT only from the old site\'s domain, with no custom headers. The new uploader asks for PUT, from the new domain, with an extra header.'],
		confirm: 'Uploads from the browser work.',
		plea: 'Could Kestrel allow any origin on PUT by default? We have several buckets and several front ends to keep in step.',
		theirs: 'We added the new domain and the checksum header to the bucket\'s CORS rule, and uploads from the browser work.',
		workaround: ['them', 'For the moment the uploader sends files through our own backend, which keeps the browser out of it. Slower, but it works.'],
		declined: 'We will not add a fleet-wide CORS rule that allows every origin; each bucket owner sets their own rule, and the rule for {B} needs the new domain and the header.',
		waitTenant: 'Could you add the new domain and the checksum header to the CORS rule of {B} and tell us whether the preflight passes?',
		endings: ['theirs', 'workaround', 'declined', 'waitTenant'], arts: ['trace', 'own'],
		own: ({ bucket }) => '```json\n' + JSON.stringify({ bucket, CORSRules: [{ AllowedOrigins: ['*'], AllowedMethods: ['GET', 'HEAD'], AllowedHeaders: [], MaxAgeSeconds: 3000 }, { AllowedOrigins: ['https://www.apps.kestrel-tenants.internal'], AllowedMethods: ['PUT'], AllowedHeaders: ['content-type'], MaxAgeSeconds: 3000 }] }, null, 2) + '\n```'
	},
	{
		cause: 'api', kind: 'wrong', op: 'GET', teams: ['ci', 'maps', 'search'],
		asks: [
			['GET returns the old version for a few seconds after an overwrite', 'We overwrite a small manifest in {B} every few minutes. Readers that fetch it right after the write sometimes get the previous version, for up to five seconds.'],
			['Stale reads of a file we just replaced', 'A job replaces a pointer file in {B} and then tells the readers to fetch it. About one reader in twenty gets the old content.'],
			['Overwritten objects served stale', 'Our deploys write a new `latest.json` and the consumers download it. Several deploys this month failed because a consumer got the previous `latest.json`.']
		],
		facts: ['The stale reads never last longer than five seconds.', 'The ETag of the stale response is the old one, so the reader can tell.', 'Only overwrites are affected; new keys are always read correctly.'],
		question: 'Do the stale reads come from many different clients or a few? Request IDs of a stale read and of the PUT before it would help.',
		answer: 'Many different clients, spread across our hosts. Two request IDs of stale reads are below, with the PUT that came before each.',
		suspect: { area: 'index', text: ['An old version after an overwrite sounds like a lagging index replica, as with listings: the GET might be answered from a replica that has not applied the overwrite yet.'] },
		finding: ['Not the index this time; GET always asks the partition leader. The api hosts keep a small metadata cache with a five-second lifetime, and an overwrite only clears the entry on the api host that took the PUT. Every other api host keeps serving the old record until its entry expires.', 'The stale responses all came from api hosts other than the one that took the PUT. The api caches object metadata for five seconds, and only the writing host drops its entry on an overwrite, so the rest of the api tier can serve the old version for up to five seconds.'],
		confirm: 'No stale manifest in two weeks of deploys.',
		again: 'We had a stale manifest again this morning, four seconds old.',
		ours: 'An overwrite now sends an invalidation to every api host, and the cache lifetime for objects under a megabyte is down to one second. Since the change went out on {D} we have not seen a stale read in the access logs.',
		theirs: 'We changed the deploy to write a new key per version and to update a pointer only once readers can see it. That removes the problem for us whatever the cache does.',
		workaround: ['them', 'Readers now send `Cache-Control: no-cache` on the GET of the manifest, which skips the api cache. That costs a little latency on a file that is read rarely.'],
		waitUs: 'Invalidation across api hosts needs a message path between them that does not exist yet. It is designed but not scheduled before the new year.',
		endings: ['ours', 'theirs', 'workaround', 'waitUs'], arts: ['access', 'trace']
	},
	{
		cause: 'tenant', kind: 'wrong', op: 'GET', teams: ['billing', 'logs', 'warehouse'], keyLike: /\.gz$/,
		asks: [
			['Downloads fail their SHA-256 check now and then', 'Our importer downloads files from {B} and checks each against the SHA-256 we stored at upload. Roughly one file in fifty fails the check.'],
			['Checksum mismatch on download: is data getting corrupted?', 'We are seeing checksum mismatches on files read back from {B}. If data is being corrupted at rest we need to know urgently, as these are records we are required to keep.'],
			['Files read back are not the files we wrote', 'A file we wrote to {B} yesterday came back with a different size and a different hash. The content looks right when opened, which makes it stranger.']
		],
		facts: ['All the failing files are compressed text: `.csv.gz`, `.json.gz` or `.log.gz`.', 'The failing files are larger after download than they were at upload.', 'Downloading a failing file with curl gives the right hash.'],
		question: 'Does the same file fail every time, or only sometimes? And which client and HTTP library does the importer use?',
		answer: 'The same files fail every time. The importer uses the standard HTTP client of its language with default settings.',
		suspect: { area: 'storage', text: ['A mismatch on read-back could be a bad disk returning stale sectors. Every fragment is checksummed on the storage hosts, so I will check the scrub reports for the fragments of the failing files.'] },
		finding: ['The scrub reports are clean, and the bytes we send match the stored checksum. The files were uploaded with `Content-Encoding: gzip`, and the importer\'s HTTP client unpacks any response with that header before handing it over. It is hashing the unpacked text, which is why the file is larger and the content looks right.', 'Storage is clean: every fragment of the failing files passes its checksum, and the api sends the exact bytes stored. The difference is the client: those objects carry `Content-Encoding: gzip`, so the importer\'s HTTP client unzips them on the way in and the hash is taken over different bytes.'],
		confirm: 'Every file matches its checksum.',
		plea: 'Could the api leave out the Content-Encoding header on download? That would fix it for every client we have.',
		theirs: 'We turned off automatic decompression in the importer\'s HTTP client, and every file now matches its checksum. New files are uploaded without the Content-Encoding header.',
		workaround: ['them', 'The importer now compresses the file again before hashing when the response carried `Content-Encoding: gzip`. Not elegant, but every check passes.'],
		declined: 'We will not strip the Content-Encoding header from responses; it was set by the uploader, and other tenants rely on it.',
		waitTenant: 'Could you switch off automatic decompression in the importer\'s client, run one day\'s files, and tell us whether any checksum still fails?',
		endings: ['theirs', 'workaround', 'declined', 'waitTenant'], arts: ['stack', 'trace'],
		stackError: 'checksum mismatch for {KEY}: sha256 {H1}, expected {H2} (size 1843216, expected 412907)'
	},
	{
		cause: 'storage', kind: 'flaky', op: 'GET', error: [503, 'ServiceUnavailable'], teams: ['photos', 'video', 'search', 'mail'],
		asks: [
			['Intermittent 503 on GET, a few hundred a day', 'Since last week we see a few hundred 503 ServiceUnavailable answers a day on GET from {B}. A retry a second later always works.'],
			['Short bursts of read errors', 'Our error dashboards show 503s on reads from {B} in bursts of a minute or two. We have the impression it is often the same objects, but we have not proved it.'],
			['Read errors at random times of day', 'Reads from {B} fail with 503 in short bursts at what look like random times. Nothing in our own metrics lines up with them.']
		],
		facts: ['Each burst lasts between thirty seconds and two minutes.', 'Writes are never affected.', 'The objects that fail during a burst are spread over many prefixes.'],
		question: 'Could you send the request IDs from one burst, with the time it started?',
		answer: 'Here are twenty from yesterday\'s burst at 14:02. It ended at about 14:03:30.',
		suspect: { area: 'api', text: ['503 with a fast retry usually means an api host restarting and its connections being cut. I will line the bursts up with api host events.'] },
		finding: ['The api hosts were fine during every burst; they answered 503 because storage did not answer in time. All the slow reads went to disks of one model, whose firmware pauses for internal housekeeping for up to two minutes under a steady read load. Reads that need a fragment on such a disk wait, and the api gives up.', 'Every request in the burst waited on a fragment from one storage host, and on that host on one disk. The disk model in question has a firmware fault that stalls it for a minute or two at a time. The hardware team knows the model and has a firmware update.'],
		confirm: 'No 503 bursts for ten days now.',
		again: 'We had a burst of 503s again yesterday afternoon.',
		ours: 'The hardware team applied the firmware update to every disk of that model in the maintenance window on {D}. No stalls since, and the 503 bursts have stopped.',
		workaround: ['us', 'The api now reads a fragment from parity when a disk does not answer within 300 ms, so a stalled disk costs latency instead of an error.'],
		waitUs: 'The firmware update needs a reboot, so it waits for the hardware team\'s next maintenance window, at the end of the month.',
		waitTenant: 'The firmware update is on all the disks your bucket uses. Could you watch for 503 bursts over the next week and tell us whether you still see any?',
		endings: ['ours', 'workaround', 'waitUs', 'waitTenant'], arts: ['errors', 'stack', 'access']
	},
	{
		cause: 'api', kind: 'flaky', op: 'GET', error: [503, 'SlowDown'], teams: ['ml', 'warehouse', 'search', 'ci'], failHosts: ['api-02', 'api-04', 'api-07'],
		asks: [
			['SlowDown at only 800 requests per second', 'Our jobs get 503 SlowDown from {B} at around 800 requests per second, well under the 3,000 we were told the limit was.'],
			['Please raise our request limit', 'We are moving more of our work to {B} and expect about 5,000 requests a second at peak by December. Could the limit for our buckets be raised?'],
			['Throttled although we are under the documented limit', 'We see SlowDown errors from {B} at a rate well below the per-tenant limit in the documentation. Either the documentation or the limit is wrong.']
		],
		facts: ['The requests come from about 200 workers.', 'The throttling starts within a second of the workers starting.', 'GET and HEAD are about 90% of the requests.'],
		question: 'Could you tell us how your clients connect, through the load balancer address or straight to api hosts, and send the request IDs of a few throttled requests?',
		answer: 'Through the load balancer. Request IDs are below. The workers keep their connections open for the whole job.',
		suspect: { area: 'placement', text: ['Throttling below the configured rate can happen when a bucket\'s objects sit in few placement groups and those groups protect themselves. Checking the bucket\'s layout first.'] },
		finding: ['The layout is fine. The limit is applied per api host, and long-lived connections from 200 workers land on only three of the api hosts, so each of those sees a third of the traffic and throttles at a fraction of the limit. The api counts the tenant\'s rate on each host instead of across the tier.', 'It is the api\'s rate limiter. It divides the tenant limit by the number of api hosts and checks it on each one, which only works when connections spread evenly. With long-lived connections they do not, and the busiest hosts throttle at a fraction of the real limit.'],
		confirm: 'The jobs have run without a single SlowDown since.',
		again: 'We hit SlowDown again at about 900 requests a second.',
		plea: 'Could the limit for our buckets simply be raised to 5,000 requests a second?',
		ours: 'The api now shares tenant counters across hosts, so the limit applies to your whole rate wherever your connections land. The release went out on {D}.',
		theirs: 'We made the workers reopen their connections every thousand requests, so they spread over the api hosts. The SlowDown errors are gone.',
		workaround: ['us', 'We raised the per-host share of your limit for now. It is a blunt instrument, but it stops the throttling while the limiter is reworked.'],
		declined: 'We will not raise the tenant limit beyond 3,000 requests a second; it is there so one tenant cannot crowd out the others on the same api hosts. The jobs need to stay under it, with backoff on SlowDown.',
		waitUs: 'Sharing rate counters across api hosts is a real change to the limiter and is planned for the api release after next.',
		endings: ['ours', 'theirs', 'workaround', 'declined', 'waitUs'], arts: ['errors', 'stack', 'access']
	},
	{
		cause: 'index', kind: 'wrong', op: 'LIST', teams: ['video', 'ml', 'warehouse'], after: '2026-08-15',
		asks: [
			['Usage report says we store three times what we have', 'The monthly usage report for {B} shows 182 TB. Our own inventory of the bucket adds up to 61 TB, and we are charged back on the larger figure.'],
			['Storage usage keeps growing although we write less', 'Reported usage for {B} has grown every week since July while our uploads have slowed down. We cannot find where the extra terabytes are.'],
			['Chargeback figure does not match a full listing', 'Finance asked us to explain our storage chargeback. The sum of a full listing of {B} is a fraction of the figure on the report.']
		],
		facts: ['Our uploads of large files go through multipart upload.', 'Some upload jobs are stopped when they run past their time limit.', 'A full listing of the bucket takes about two hours.'],
		question: 'Do your jobs ever start a multipart upload and neither complete nor abort it? Parts of unfinished uploads take space but do not show in listings.',
		answer: 'Probably, yes. Jobs that run past their time limit are stopped, and nothing cleans up after them.',
		suspect: { area: 'storage', text: ['A gap that size could be space held by fragments that are no longer referenced and that the storage hosts have not reclaimed yet. I will look at reclaim lag on the hosts that hold the bucket.'] },
		finding: ['Reclaim is up to date. The difference is unfinished multipart uploads: the index counts their parts in the bucket\'s usage, but listings only show completed objects. {B} has about 14,000 open uploads, the oldest from March, holding the missing terabytes.', 'The index has the answer: usage includes the parts of multipart uploads that were started and never completed or aborted, and listings do not show them. There are thousands of such uploads in {B}, most of them from stopped jobs.'],
		confirm: 'Usage has come down to what our inventory says.',
		again: 'This week\'s usage figure jumped by 20 TB again.',
		plea: 'Could the usage report count only the objects we can see in a listing? As far as we are concerned, that is what we store.',
		ours: 'The usage report now shows unfinished uploads on a line of their own, and every bucket has a default rule that aborts uploads left unfinished for 30 days. The report of {D} shows the drop.',
		theirs: 'We added a lifecycle rule that aborts multipart uploads left unfinished for seven days, and the jobs now abort their upload when they are stopped. Usage has come down to what we expected.',
		workaround: ['them', 'A weekly script on our side lists unfinished uploads older than a week and aborts them.'],
		declined: 'We will not leave the parts of unfinished uploads out of the usage figure; they occupy real disk until they are aborted. The report will show them on a line of their own from next month, and an abort rule on the bucket stops them building up.',
		waitTenant: 'Could you add an abort rule for unfinished uploads to {B} and tell us whether next week\'s usage figure looks right?',
		endings: ['ours', 'theirs', 'workaround', 'declined', 'waitTenant'], arts: ['own', 'listing'],
		own: ({ r, bucket, date }) => {
			const listed = int(r, 55, 70);
			const reported = listed * 3 + int(r, -4, 4);
			return ['| Source | Bucket | As of | Objects | Size |', '| --- | --- | --- | ---: | ---: |', `| Usage report | ${bucket} | ${date.slice(0, 7)}-01 | ${int(r, 4, 9)}.${int(r, 0, 9)} M | ${reported}.${int(r, 0, 9)} TB |`, `| Full listing, summed | ${bucket} | ${date} | ${int(r, 4, 9)}.${int(r, 0, 9)} M | ${listed}.${int(r, 0, 9)} TB |`, `| Difference | | | | ${reported - listed} TB |`].join('\n');
		}
	},
	{
		cause: 'tenant', kind: 'error', op: 'GET', teams: ['billing', 'search'],
		asks: [
			['Handshake failures from our nightly job', 'Our nightly job cannot connect to Kestrel since it was moved to new hosts. It fails before sending any request, with a TLS handshake error.'],
			['TLS errors connecting to the storage endpoint from one cluster', 'From one of our clusters every connection to the storage endpoint fails during the TLS handshake. From the other clusters the same code works.'],
			['SSLHandshakeException when reading from {B}', 'We get `SSLHandshakeException: Received fatal alert: protocol_version` on every request to {B} from our job hosts.']
		],
		facts: ['The failing hosts were built from an image the team keeps for older jobs.', 'curl from the same hosts connects fine.', 'The job has not been changed for two years.'],
		question: 'Which Java version runs on the failing hosts, and which TLS versions does it offer? A handshake trace from `-Djavax.net.debug=ssl:handshake` would settle it.',
		answer: 'Java 7, it turns out. The trace shows it offering TLS 1.0 and 1.1 and nothing newer.',
		suspect: { area: 'api', text: ['A trust store that lacks the current intermediate would fail like this, so I suspect the certificate chain on the api tier.'] },
		finding: ['The certificate is not the problem; the handshake never gets that far. The runtime on those hosts only offers TLS 1.0 and 1.1, and the endpoint has accepted only TLS 1.2 and 1.3 since January. The other clusters run a newer Java and are fine.', 'The trace settles it: the client offers TLS 1.1 at most, and Kestrel has required TLS 1.2 or later since the start of the year. The new certificate has nothing to do with it.'],
		confirm: 'The job connects and runs as before.',
		plea: 'Could TLS 1.1 be turned back on for a few weeks while we sort the image out?',
		theirs: 'We moved the job to the standard image with Java 17, and it connects and runs as before.',
		workaround: ['them', 'The job runs on one of the old hosts again until its image is rebuilt.'],
		declined: 'We will not turn TLS 1.1 back on for the endpoint, for anyone. The job has to run on a runtime that speaks TLS 1.2.',
		waitTenant: 'Could you rebuild those hosts on the standard image, or at least a Java 8 with TLS 1.2 turned on, and tell us whether the job connects?',
		endings: ['theirs', 'workaround', 'declined', 'waitTenant'], arts: ['stack', 'own'],
		stackError: 'javax.net.ssl.SSLHandshakeException: Received fatal alert: protocol_version',
		own: ({ r }) => '```text\n' + ['*** ClientHello, TLSv1.1', `RandomCookie:  GMT: ${int(r, 1700000000, 1800000000)} bytes = { ${Array.from({ length: 12 }, () => int(r, 0, 255)).join(', ')} }`, 'Session ID:  {}', 'Cipher Suites: [TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA, TLS_RSA_WITH_AES_128_CBC_SHA, TLS_EMPTY_RENEGOTIATION_INFO_SCSV]', 'Compression Methods:  { 0 }', 'Extension server_name, server_name: [type=host_name (0), value=storage.kestrel.internal]', '***', 'main, WRITE: TLSv1.1 Handshake, length = 157', 'main, READ: TLSv1.2 Alert, length = 2', 'main, RECV TLSv1.1 ALERT:  fatal, protocol_version', 'main, called closeSocket()'].join('\n') + '\n```'
	},
	{
		cause: 'api', kind: 'slow', op: 'GET', teams: ['video'],
		headers: ['Range: bytes=0-1023,52428800-52430847'],
		asks: [
			['Video player cannot seek: Range header ignored', 'The web player sends a Range request to jump into a file in {B} and gets the whole file back with a 200, so seeking means downloading gigabytes.'],
			['Range requests return 200 and the full object', 'Some of our range requests to {B} are answered with the full object instead of a 206 with the bytes we asked for. Others, from the same client, work.'],
			['Partial reads come back whole', 'We read byte ranges out of large archive files in {B}. Since we added prefetching, some reads come back as the whole archive.']
		],
		facts: ['The requests that come back whole ask for two ranges at once.', 'Single-range requests always get a 206.', 'The objects are between 1 and 40 GB.'],
		question: 'Could you paste the exact Range header of a request that got the whole object?',
		answer: 'Here it is: `Range: bytes=0-1023,52428800-52430847`. The client asks for the header and the index of the file in one go.',
		suspect: { area: 'storage', text: ['Large objects are spread over many fragments; if storage cannot serve a range that crosses fragment boundaries, the api may fall back to the whole object.'] },
		finding: ['Storage serves ranges across fragments without trouble. The api does not support several ranges in one request and, instead of answering with the first range or a 416, it ignores the header and sends the whole object, which the standard allows but nobody wants.', 'It is the api. It handles a single range only; when the Range header holds two or more, it drops the header and answers 200 with the full body. That is allowed by the HTTP standard, which is why nobody noticed, but it is useless for a player.'],
		confirm: 'Seeking works, and a seek costs a few kilobytes again.',
		again: 'Seeking downloads the whole file again for some files.',
		plea: 'Could the api support multi-range requests? The player library is not ours to change.',
		ours: 'The api now answers a multi-range request with a multipart/byteranges response. The change went out on {D}.',
		theirs: 'The client now asks for each range in a request of its own. A few more round trips, but seeking works.',
		workaround: ['them', 'The player now makes two requests instead of one when it seeks, which we will live with for now.'],
		declined: 'Multi-range responses are not on the api roadmap; the client libraries we support do not use them, and separate range requests work today.',
		waitUs: 'Multi-range support is accepted for the api, but it needs changes to how responses are streamed, so it is planned for the first release of next year.',
		endings: ['ours', 'theirs', 'workaround', 'declined', 'waitUs'], arts: ['trace', 'access']
	},
	{
		cause: 'index', kind: 'wrong', op: 'COPY', teams: ['mail', 'billing', 'photos'],
		headers: ['x-amz-copy-source: /{B}/{KEY}'],
		asks: [
			['CopyObject drops our custom metadata', 'When we copy objects within {B}, the copies lose the `x-amz-meta-*` headers we set on the originals. The documentation says metadata is copied unless we ask otherwise.'],
			['Copied files lose their retention tag', 'We copy files into a dated prefix of {B}, and every copy over a certain size comes out without the metadata our retention job relies on.'],
			['Metadata missing after server-side copy of large files', 'Server-side copies of small files keep their metadata. Copies of large files do not. We have not found the exact threshold.']
		],
		facts: ['The copies have the right size and content.', 'We do not set a metadata directive on the copy request.', 'The copy job has not changed since spring.'],
		question: 'Are the affected copies all large? Copies over 5 GB are done in parts, which is a different path.',
		answer: 'Yes, now that we have checked: every copy that lost its metadata was over 5 GB.',
		suspect: { area: 'api', text: ['The metadata directive is read by the api. If it defaults to REPLACE on the part-wise copy path, the copy would get empty metadata. Checking that first.'] },
		finding: ['The api passes the directive correctly. The part-wise copy finishes with an index call that creates the new object record, and that call builds the record from the parts without carrying over the source\'s user metadata. The small-copy path copies the whole record and so keeps it.', 'Found in the index. A copy over 5 GB is done part by part, and the index call that completes it writes a fresh object record with the system fields only. The user metadata of the source is never read on that path.'],
		confirm: 'Large copies keep their metadata now; we checked a dozen.',
		again: 'A 7 GB copy lost its metadata again yesterday.',
		ours: 'The index now copies the source\'s user metadata on the part-wise path as well. The release went out on {D}; copies made before it have to be fixed by copying them again.',
		theirs: 'We set the metadata explicitly with a REPLACE directive on every copy, taking it from a HEAD of the source. That works for both sizes.',
		workaround: ['them', 'The copy job does a HEAD of the source and then sets the metadata on the copy with a metadata-only copy onto itself.'],
		waitUs: 'The fix is small, but it changes the completion call, which ordinary multipart uploads share, so it goes out with the next index release after testing.',
		waitTenant: 'The fixed completion call is on staging. Could you copy a 6 GB test file there and tell us whether the metadata survives?',
		endings: ['ours', 'theirs', 'workaround', 'waitUs', 'waitTenant'], arts: ['trace', 'stack'],
		stackError: 'metadata missing on copy of {KEY}: expected {retention: 7y, source: inbound}, got {}'
	},
	{
		cause: 'placement', kind: 'slow', op: 'CREATE', error: [504, 'GatewayTimeout'], teams: ['ci', 'ml', 'search'], after: '2026-09-28', accessFail: [499, 60000, 60020], accessMs: [28000, 47000],
		asks: [
			['CreateBucket takes 40 seconds and sometimes times out', 'Our test environments create a fresh bucket per run. Creating one now takes between 30 and 45 seconds, and about one in ten times out at the load balancer.'],
			['Bucket creation got slow this autumn', 'Creating a bucket used to take under a second. Since September it takes most of a minute, which breaks the defaults of our provisioning tool.'],
			['Timeouts creating buckets from the provisioning pipeline', 'The pipeline that sets up new environments fails at the bucket step with a gateway timeout. A second try usually works.']
		],
		facts: ['The bucket names are generated per run and are never reused.', 'Other calls in the same pipeline are as fast as ever.', 'The slowness started in the second week of September.'],
		question: 'How many buckets do you create a day, and from how many clients?',
		answer: 'About 400 a day, one per test run, all from the same service account but from a dozen runners.',
		suspect: { area: 'index', text: ['Creating a bucket writes a new partition into the index, and the index has been busy since September. My bet is the partition creation.'] },
		finding: ['The index part takes a few milliseconds. The time goes in placement: each new bucket gets its own set of placement groups, and since the September change placement computes a fresh layout for each one instead of taking a precomputed set. With 400 buckets a day, the requests wait in a single queue behind each other.', 'It is placement. A new bucket is given placement groups when it is created, and placement now works out those groups from scratch for every bucket. That takes about four seconds each, and the requests share one queue, so a busy hour builds a backlog.'],
		confirm: 'Bucket creation takes under a second again.',
		again: 'Bucket creation is taking half a minute again.',
		plea: 'Could bucket creation be made fast again? Our test framework assumes a new bucket per run.',
		ours: 'Placement now keeps a stock of precomputed group sets and hands one to each new bucket, so creation is back under a second. The change went out on {D}.',
		theirs: 'We changed the test runs to share a small set of long-lived buckets with a prefix per run, so we hardly create any buckets now.',
		workaround: ['them', 'Our pipeline now creates buckets ahead of time, overnight, and takes one from the stock when a run starts.'],
		declined: 'We will not tune bucket creation for 400 new buckets a day; buckets are meant to be long-lived. A prefix per run inside a few shared buckets is the supported way.',
		waitUs: 'Precomputing group sets is designed and reviewed. It ships with the next placement release, planned for the first week of December.',
		endings: ['ours', 'theirs', 'workaround', 'declined', 'waitUs'], arts: ['trace', 'latency']
	},
	{
		cause: 'placement', kind: 'request', op: 'PUT', teams: ['billing', 'search'],
		asks: [
			['Three full copies instead of erasure coding for {B}', 'Audit asked whether the files in {B} are kept as full copies. We would like the bucket stored as three full copies rather than erasure coded, if that is possible.'],
			['Request: whole copies for lower read latency', 'Reads of fresh files from {B} have a tail we would like to cut. We understand erasure coded objects need several disks for one read; can a bucket be kept as whole copies?'],
			['Where are our objects stored, and how many copies?', 'Our compliance review needs a short statement of how objects in {B} are stored: how many copies, in which locations, and how that is decided.']
		],
		facts: ['The bucket holds about 9 TB and grows by 40 GB a month.', 'The files are written once and read a handful of times.', 'The audit is in the first week of December.'],
		question: 'Is the need durability, read speed or a statement for the auditors? The answer is different for each.',
		answer: 'Mostly the statement for the auditors, if we are honest, but faster reads would be welcome.',
		finding: ['Placement decides the layout per bucket: {B} uses the standard 8+3 erasure coding, with the fragments of each object spread over three zones. Placement can keep a bucket as three whole copies instead; it costs about twice the disk and makes reads of small objects a little faster.', 'This is a placement question. Every bucket gets the default policy unless placement is told otherwise, and the default is 8+3 erasure coding across three zones. Placement does support whole copies per bucket, at about twice the raw disk.'],
		confirm: 'That is what the auditors asked for. Thank you.',
		plea: 'We would still like {B} kept as whole copies, if only to make the audit conversation short.',
		ours: 'Placement now keeps {B} as three whole copies for new writes, and existing objects were rewritten in the background, finishing on {D}. The written statement for the auditors is below.',
		declined: 'We will not set whole copies for one bucket; it doubles the disk for a gain the audit does not need. The statement of how the bucket is stored, which is what the audit asks for, is below.',
		waitUs: 'Whole copies for {B} are approved. Placement applies them to new writes once the next placement release is out, and the background rewrite of existing objects follows.',
		waitTenant: 'Before we change anything, could you check with the auditors whether the written statement is enough, or whether they need the policy itself changed?',
		endings: ['ours', 'declined', 'waitUs', 'waitTenant'], arts: ['own', 'latency'],
		own: ({ r, bucket }) => '```text\n' + [`bucket:            ${bucket}`, `created:           2024-0${int(r, 1, 9)}-${pad(int(r, 1, 28))}`, 'policy:            ec-8+3', 'zones:             a, b, c', `placement groups:  ${int(r, 40, 90)}`, `objects:           ${int(r, 200, 900)}k`, `stored bytes:      ${int(r, 8, 10)}.${int(r, 0, 9)} TB`, `raw bytes:         ${int(r, 12, 14)}.${int(r, 0, 9)} TB`].join('\n') + '\n```'
	},
	{
		cause: 'tenant', kind: 'wrong', op: 'LIST', teams: ['mail', 'maps', 'warehouse'],
		asks: [
			['Listing order wrong for keys with accents', 'Our sync tool compares a listing of {B} with a sorted list of local files. For keys with accented letters the two orders differ, and the tool concludes files are missing.'],
			['Sync uploads the same files every night', 'Every night our sync job uploads the same few hundred files to {B} again, as if they were not there. They all have characters outside ASCII in their names.'],
			['Keys with umlauts listed out of order', 'In listings of {B}, `Übersicht.pdf` comes after `Zusammenfassung.pdf`. That is not alphabetical, and it breaks our merge.']
		],
		facts: ['All the affected keys contain letters outside ASCII.', 'The tool was written in-house and sorts with the system locale.', 'Listing the bucket twice gives the same order both times.'],
		question: 'How does your tool sort the local side? The listing has a fixed order, but it may not be the one you expect.',
		answer: 'It sorts with the default collation of the host, which is German on those machines.',
		suspect: { area: 'index', text: ['If accented keys come out in a different place from one listing to the next, the index might be mixing normalised and raw forms of the same key. Checking how the keys are stored.'] },
		finding: ['The index stores keys exactly as sent and lists them in the order of their UTF-8 bytes, which is what the documentation promises and what every client library expects. `Ü` is two bytes starting with 0xC3, so it sorts after every ASCII letter. Your tool compares that with a list sorted by German collation, and the two disagree by design.', 'Nothing is wrong in the index: listings are in byte order of the UTF-8 key, always have been, and are stable. The sync tool merges them with a list sorted by the host\'s locale, which puts `Ü` next to `U`. The mismatch is in the tool.'],
		confirm: 'The nightly uploads of unchanged files have stopped.',
		plea: 'Could listings be returned in a locale-aware order, or could there be an option for it?',
		theirs: 'We changed the tool to sort the local list by UTF-8 bytes before comparing. The nightly uploads of unchanged files have stopped.',
		workaround: ['them', 'The tool now builds a set of keys from the listing and checks membership instead of merging two sorted lists. Slower, but correct.'],
		declined: 'We will not add a locale-ordered listing; byte order is part of the API contract and every client relies on it. The tool has to sort the same way.',
		waitTenant: 'Could you change the comparison to byte order on one machine and tell us whether the nightly uploads stop?',
		endings: ['theirs', 'declined', 'workaround', 'waitTenant'], arts: ['own'],
		own: ({ r, bucket, date }) => {
			const names = shuffle(r, ['Abrechnung.pdf', 'Angebot.pdf', 'Übersicht.pdf', 'Zusammenfassung.pdf', 'Änderungen.docx', 'Bericht.pdf', 'Öffnungszeiten.txt', 'Protokoll.pdf', 'Straße.csv', 'Écoles.xlsx']).slice(0, 7);
			const prefix = `shared/${date.slice(0, 7)}/`;
			// For these names, comparing the strings code unit by code unit gives UTF-8 byte order; the local list
			// is sorted the way a German collation would, with umlauts and accents next to their base letter.
			const bytes = [...names].sort((a, b) => (a < b ? -1 : 1));
			const fold = (name: string) => name.replace(/Ä/g, 'A').replace(/Ö/g, 'O').replace(/Ü/g, 'U').replace(/É/g, 'E').replace(/ß/g, 'ss');
			const local = [...names].sort((a, b) => (fold(a) < fold(b) ? -1 : 1));
			return '```text\n' + [`$ s3cmd ls s3://${bucket}/${prefix}`, ...bytes.map((name) => `${date} ${pad(int(r, 6, 22))}:${pad(int(r, 0, 59))}  ${String(int(r, 12000, 900000)).padStart(9)}  s3://${bucket}/${prefix}${name}`), '', '$ ls -1 ./mirror/' + prefix, ...local].join('\n') + '\n```';
		}
	},
	{
		cause: 'api', kind: 'wrong', op: 'HEAD', error: [404, 'NoSuchKey'], teams: ['ci', 'photos', 'search'],
		asks: [
			['Request charges doubled after we added existence checks', 'We started sending a HEAD before each upload to skip files already in {B}. Our request charges doubled, although HEAD should be cheaper than the PUT we save.'],
			['HEAD requests billed as GET?', 'The usage report lists our HEAD requests against {B} under GET, at the GET price. Is that intended?'],
			['Chargeback for requests looks wrong this month', 'Finance flagged our request chargeback for last month: it is twice the month before, while our traffic grew by perhaps 20%.']
		],
		facts: ['About 60% of the HEAD requests answer 404, because the file is new.', 'We send around 30 million HEAD requests a month.', 'The PUT count went down by about a third after the change.'],
		question: 'Could you send the per-operation counts from your own client metrics for one day, so we can compare them with ours?',
		answer: 'Counts for one day are below, by operation and status.',
		suspect: { area: 'index', text: ['A HEAD is answered by an index lookup, and lookups that miss are counted by the index for the usage report. A 404 might be counted twice there.'] },
		finding: ['The index counts nothing for billing; metering happens in the api. The api\'s metering maps HEAD onto the GET counter, and it counts a HEAD that answers 404 as two requests, because it retries the lookup once on a miss. Both are bugs in the api\'s metering.', 'It is the api. Its request metering puts HEAD under GET, and a HEAD that misses is recorded twice because of an internal retry. Your existence checks, mostly misses, hit both mistakes.'],
		confirm: 'The corrected figure matches our own count.',
		again: 'This month\'s figures show HEAD under GET again.',
		plea: 'Could HEAD be billed at a HEAD price? As far as we can tell it is a much cheaper operation.',
		ours: 'The api now meters HEAD on a counter of its own and records a missed lookup once. Last month\'s chargeback was recomputed on {D}, and finance has the corrected figure.',
		declined: 'HEAD is billed at the GET price by design, as the price list says; it costs the same index lookup. The double count of misses was a bug and last month has been corrected for it, but the price stays.',
		workaround: ['us', 'We agreed with finance to correct your request chargeback by hand each month until the metering is fixed.'],
		waitUs: 'The metering fix is in review. Finance has agreed to hold last month\'s chargeback until we send corrected figures.',
		endings: ['ours', 'declined', 'workaround', 'waitUs'], arts: ['own', 'access'],
		own: ({ r }) => {
			const head = int(r, 900, 1100) * 1000;
			const miss = Math.round(head * (0.55 + r() * 0.1));
			const put = int(r, 350, 450) * 1000;
			return ['| Operation | Status | Our client | Usage report |', '| --- | --- | ---: | ---: |', `| HEAD | 200 | ${thousands(head - miss)} | 0 |`, `| HEAD | 404 | ${thousands(miss)} | 0 |`, `| GET | all | ${int(r, 80, 140)},000 | ${thousands(head + miss + int(r, 80, 140) * 1000)} |`, `| PUT | 200 | ${thousands(put)} | ${thousands(put)} |`].join('\n');
		}
	},
	{
		cause: 'index', kind: 'flaky', op: 'COMPLETE', error: [504, 'GatewayTimeout'], teams: ['video', 'ml', 'warehouse'], after: '2026-09-07', accessFail: [499, 60000, 60020], accessMs: [48000, 59000], keyLike: /^(masters|runs|events)\//,
		asks: [
			['Large uploads hang at 99%', 'Big uploads into {B} send every part and then hang on the final step for a minute or more. Some end with a timeout, and the upload has to start again.'],
			['Completing a multipart upload takes over a minute', 'CompleteMultipartUpload on uploads of a few thousand parts takes between 50 and 90 seconds. Our proxy drops connections idle for 60 seconds.'],
			['Timeouts at the end of large uploads through our proxy', 'Uploads that pass through our egress proxy fail at the very end with a 504 from the proxy. Uploads from inside the network do not, but they are slow at the end too.']
		],
		facts: ['The uploads have 2,000 to 6,000 parts.', 'The egress proxy has a 60-second idle timeout.', 'Small multipart uploads complete in under a second.'],
		question: 'Do the uploads that hang have many parts? And is there a proxy or load balancer between you and us with an idle timeout?',
		answer: 'Thousands of parts each. And yes: our egress proxy drops connections idle for 60 seconds. It belongs to the network team, and changing its timeout needs a request and a couple of weeks.',
		suspect: { area: 'tenant', text: ['This looks like the proxy to me. Completion answers once the object is assembled, and a 60-second idle timeout in front of it is bound to cut long completions. I would start with the network team.'] },
		finding: ['The proxy only shows the symptom. Completion should take a second or two for a few thousand parts, and here it takes over a minute: since the index release at the end of August, the index looks up each part with a round trip of its own instead of reading the part list in ranges.', 'The time is spent in the index. Completion looks up every part separately, a round trip per part, since the index release at the end of August. A few thousand parts make a minute, and the proxy\'s idle timeout does the rest.'],
		confirm: 'A 5,000-part upload completed in about a second, through the proxy.',
		again: 'A 4,000-part upload hung at completion again last night.',
		ours: 'The index reads the part list in ranges again, and completion of a 5,000-part upload takes about a second. The release with the change went out on {D}.',
		theirs: 'The network team raised the idle timeout on the egress proxy to ten minutes for the storage endpoint. Uploads complete, slowly, but they complete.',
		workaround: ['them', 'We now send uploads of more than a thousand parts from a host inside the network, which avoids the proxy.'],
		waitUs: 'The regression is understood and the fix is written; it waits for the index release planned for the end of the month.',
		waitTenant: 'The fixed index is on staging. Could you push one of the large files through the proxy to the staging endpoint and tell us whether the completion still hangs?',
		endings: ['ours', 'theirs', 'workaround', 'waitUs', 'waitTenant'], arts: ['stack', 'trace', 'access'],
		stackError: 'ReadTimeoutError: Read timed out on CompleteMultipartUpload for {KEY} (read timeout=60)'
	},
	{
		cause: 'tenant', kind: 'request', op: 'LIST', teams: ['logs', 'video', 'warehouse'], after: '2026-09-15',
		asks: [
			['Objects older than 90 days still in the standard class', 'We set a lifecycle rule on {B} to move objects to the cold class after 90 days. Objects from May are still in the standard class.'],
			['Cold-class transitions not happening', 'Our storage costs have not dropped since we added a transition rule in August. A listing of {B} shows nothing in the cold class at all.'],
			['Lifecycle rule seems to do nothing', 'The lifecycle rule on {B} has been in place for two months. As far as we can see it has never acted on a single object.']
		],
		facts: ['The rule has a prefix filter and a tag filter.', 'The objects were uploaded by two different services.', 'The rule shows as enabled in the bucket configuration.'],
		question: 'Could you paste the rule as it is set on the bucket, and the tags of one object you expected to move?',
		answer: 'Rule and object tags are below. The rule was written by someone who has since left the team.',
		suspect: { area: 'placement', text: ['The cold-class transitions are carried out by placement, which moves the fragments to the dense storage hosts. If the transition job is stuck, nothing would move. Checking its queue.'] },
		finding: ['Placement\'s transition queue is empty because nothing was ever sent to it. The rule requires the tag `retention=cold`, and the objects carry `Retention=cold`; tag keys are case-sensitive. The rule matches no object, so there is nothing to move.', 'The transition job is fine and has moved objects for other buckets all week. The rule on {B} has a tag condition no object meets: it asks for `tier: archive`, and the uploaders set `tier: archival`.'],
		confirm: 'The first objects moved to the cold class the next night.',
		plea: 'Could tag matching in lifecycle rules ignore case? It would save us retagging millions of objects.',
		theirs: 'We fixed the tag condition in the rule, and the first objects moved to the cold class the next night.',
		workaround: ['them', 'We dropped the tag condition and kept only the prefix. It catches a few objects we would rather keep warm, but it is close enough.'],
		declined: 'We will not make tag matching case-insensitive; other tenants rely on tags that differ only in case. The rule has to use the tag as the uploaders write it.',
		waitTenant: 'Could you correct the tag in the rule, or the tags on the objects, and tell us after the next nightly run whether objects moved?',
		endings: ['theirs', 'workaround', 'declined', 'waitTenant'], arts: ['listing', 'own'],
		own: ({ r, bucket, team, date }) => '```json\n' + JSON.stringify({ Bucket: bucket, Rules: [{ ID: `to-cold-${int(r, 1, 9)}`, Status: 'Enabled', Filter: { And: { Prefix: team.object(r, date).split('/')[0] + '/', Tags: [{ Key: 'retention', Value: 'cold' }] } }, Transitions: [{ Days: 90, StorageClass: 'COLD' }] }], ObjectTagging: { Key: team.object(r, date), TagSet: [{ Key: 'Retention', Value: 'cold' }, { Key: 'source', Value: team.svc }] } }, null, 2) + '\n```'
	},
	{
		cause: 'index', kind: 'error', op: 'COMPLETE', teams: ['photos', 'mail', 'warehouse'],
		asks: [
			['Missing upload events for some objects', 'Our pipeline starts processing when it gets an upload event for {B}. Some objects never produce an event and are never processed.'],
			['Event notifications skip large files', 'The files our pipeline never picks up from {B} are all large ones. Small files always produce an event.'],
			['About 2% of uploads never trigger our processor', 'Comparing a listing of {B} with what our processor has seen, about 2% of objects never had an event delivered.']
		],
		facts: ['The event queue shows no errors and no dead letters.', 'Objects copied into the bucket do get events.', 'The uploader switches to multipart upload above 100 MB.'],
		question: 'Are the objects without events uploaded in one PUT or as multipart uploads?',
		answer: 'All multipart, as far as we can tell.',
		suspect: { area: 'api', text: ['Events are queued by the api after it answers the client. If the api drops the event when the connection closes early, we would lose some. Checking the api\'s event queue metrics.'] },
		finding: ['The api only forwards events; they are produced when the index commits an object record. A single PUT and a copy commit through one path, which emits an event; completion of a multipart upload commits through another path, which does not.', 'It is the index. Events are emitted on the index commit, and the commit used for completing multipart uploads was never wired to emit one. Every multipart upload is missing its event, which matches the large files.'],
		confirm: 'Every upload of the last week produced an event, large ones included.',
		again: 'Some multipart uploads are missing their events again since Monday.',
		ours: 'The index now emits an event when a multipart upload completes. The change went out on {D}, and we sent the missed events of the last 30 days into your queue, marked as replays.',
		theirs: 'Our processor now also sweeps a listing of the last hour every ten minutes and picks up anything it has not seen. That catches everything, events or not.',
		workaround: ['them', 'The uploader now sends its own message to the processor after each multipart upload completes.'],
		waitUs: 'The fix is in the index release planned for December. Replaying the missed events afterwards is agreed.',
		waitTenant: 'Could you upload a 200 MB test file to the staging copy of {B} and tell us whether the event reaches your queue?',
		endings: ['ours', 'theirs', 'workaround', 'waitUs', 'waitTenant'], arts: ['errors', 'access']
	},
	{
		cause: 'api', kind: 'request', op: 'GET', error: [503, 'ServiceUnavailable'], teams: ['billing', 'search', 'mobile'],
		asks: [
			['Request IDs in our error logs cannot be found by the desk', 'When we raise a ticket with request IDs from our logs, the desk often cannot find them. That makes every ticket slower.'],
			['The request ID header changes between response and logs', 'The `x-kestrel-request-id` we get on an error response from {B} is not the one in the access logs the desk sends us. Which one is right?'],
			['Please make request IDs traceable end to end', 'We would like request IDs that match from our client logs to the desk\'s logs, so we can investigate problems together.']
		],
		facts: ['Our client logs the request ID header from every error response.', 'Request IDs from successful requests are found without trouble.', 'The ones that cannot be found are all from 5xx answers.'],
		question: 'Could you send three request IDs we could not find, with the status of each?',
		answer: 'Three are below, all from 503 answers last Thursday.',
		finding: ['It is the api. When an api host gives up on a backend and tries the request again internally, it creates a new request ID for the second attempt and logs only that one, but the response to the client still carries the first. So any request that was tried again inside the api has an ID we never log.', 'The api tier mints a fresh request ID when it sends a request to another backend after a failure, and the access log has only the new ID. Error responses that went through such a second attempt carry the original ID, which appears nowhere in our logs.'],
		confirm: 'The last three IDs we sent were all found.',
		again: 'Two request IDs from last week cannot be found again.',
		ours: 'The api now keeps the client-facing request ID through internal second attempts and logs them under it. IDs from responses since {D} can all be found.',
		workaround: ['us', 'Until that changes, the desk searches by time and bucket when an ID is not found, which works if you give us the time to the second.'],
		waitUs: 'Keeping one ID through internal second attempts changes the logging format, which other teams parse. The change is agreed and waits on their sign-off.',
		endings: ['ours', 'workaround', 'waitUs'], arts: ['access', 'stack']
	},
	{
		cause: 'storage', kind: 'slow', op: 'GET', teams: ['video', 'logs', 'billing'],
		asks: [
			['First read of an old object takes four seconds', 'Reading an object from {B} that has not been read for months takes three to five seconds to the first byte. A second read is fast.'],
			['Slow first byte on archived files', 'Our audit tool reads old files from {B} once a quarter, and each file takes seconds before any data arrives. The audit now takes a full day.'],
			['Why are some GETs so slow to start?', 'Most GETs from {B} start returning data in tens of milliseconds, but a few take several seconds. They seem to be the old objects.']
		],
		facts: ['The slow objects were all uploaded more than 90 days ago.', 'The bucket has a lifecycle rule that moves objects to the cold class after 90 days.', 'Once data starts arriving, the transfer rate is normal.'],
		question: 'Do the slow objects have a lifecycle transition on them? A HEAD shows the storage class.',
		answer: 'They do: the HEAD shows the cold class on every slow one.',
		suspect: { area: 'api', text: ['A delay before the first byte and a fast transfer afterwards looks like the api waiting on something, perhaps a metadata lookup for objects not in its cache.'] },
		finding: ['The api answers metadata in milliseconds; the wait is on storage. Cold-class objects live on the dense storage hosts, whose disks spin down after twenty minutes without reads. The first read waits for a disk to spin up, which takes three to five seconds.', 'This is storage doing what it was built to do. Objects in the cold class sit on dense hosts with disks that spin down when idle, and the first read of a quiet disk waits for it to spin up.'],
		confirm: 'First reads during the audit took tens of milliseconds.',
		again: 'The audit tool saw multi-second first reads again on Monday.',
		plea: 'Could the cold-class disks stay spinning during our working hours?',
		ours: 'The dense hosts now keep their disks spinning between 07:00 and 19:00 on weekdays, which covers your working hours. First reads in that window take tens of milliseconds since {D}.',
		theirs: 'We moved the files the audit reads back to the standard class and changed the lifecycle rule to leave them alone.',
		workaround: ['them', 'The audit tool now sends a ranged GET of the first byte of every file an hour before the run, which wakes the disks in advance.'],
		declined: 'We will not keep the dense disks spinning; spin-down is what makes the cold class cheap. Files that are read on a schedule belong in the standard class.',
		waitTenant: 'Would moving the files the audit reads back to the standard class work for you? It costs more per terabyte, so it is your call.',
		endings: ['ours', 'theirs', 'workaround', 'declined', 'waitTenant'], arts: ['latency', 'trace']
	},
	{
		cause: 'tenant', kind: 'wrong', op: 'HEAD', error: [404, 'NoSuchKey'], teams: ['warehouse', 'ml', 'ci'],
		asks: [
			['Our job makes ten times more requests than it has objects', 'A job that checks 2 million objects in {B} made 22 million requests last night, according to the usage report. Our own logs show 2 million calls.'],
			['Request counts on the report do not match our client', 'The usage report shows several times more requests to {B} than our client says it sent. We suspect double counting on your side.'],
			['Unexplained request volume from one service', 'One of our services shows up with a huge request volume against {B} on the usage report, but it is a small service that does little.']
		],
		facts: ['Most of the checks are for objects that do not exist yet.', 'The job uses the SDK with a retry configuration copied from another project.', 'Our client logs one line per call, not per HTTP request.'],
		question: 'Could you turn on the SDK\'s debug logging for a few minutes and count the HTTP requests behind one call?',
		answer: 'Done. One call to check a missing object makes eleven HTTP requests.',
		suspect: { area: 'api', text: ['Over-counting could be ours: the api records retried requests in the usage figures. I will compare the api\'s counts with the access log for one hour.'] },
		finding: ['Our counts match the access log, request for request. The SDK on your side is set to retry on any 4xx, including 404, ten times. Every check for an object that does not exist yet is sent eleven times.', 'The api counts what it receives, and it receives eleven HEADs for every missing object: the retry configuration in your job treats 404 as worth retrying, with ten attempts and no backoff.'],
		confirm: 'Last night\'s run made 2.1 million requests.',
		plea: 'Could repeated requests from the same client be left out of the usage figures?',
		theirs: 'We took 404 out of the statuses the SDK retries and added backoff. Last night\'s run made 2.1 million requests.',
		workaround: ['them', 'The job now lists the prefix once and checks membership locally instead of sending a HEAD per object.'],
		declined: 'We will not stop counting repeated requests; each one is a real request the fleet handled. Fixing the retry configuration is the answer.',
		waitTenant: 'Could you take 404 out of the retried statuses, run the job once and send us the request count?',
		endings: ['theirs', 'workaround', 'declined', 'waitTenant'], arts: ['own', 'access'],
		own: ({ r, bucket, team, date }) => {
			const key = team.object(r, date);
			const lines: string[] = [];
			let ms = int(r, 100, 900);
			for (let attempt = 1; attempt <= 11; attempt++) {
				lines.push(`${date} 03:${pad(int(r, 10, 12))}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)} botocore.endpoint DEBUG Sending http request: <AWSPreparedRequest method=HEAD, url=https://storage.kestrel.internal/${bucket}/${key}>`);
				lines.push(`${date} 03:${pad(int(r, 10, 12))}:${pad(Math.floor((ms + 9) / 1000) % 60)},${pad((ms + 9) % 1000, 3)} botocore.retryhandler DEBUG Retry needed, retrying request after delay of: 0`);
				ms += int(r, 8, 30);
			}
			return '```text\n' + lines.slice(0, int(r, 10, 16)).join('\n') + '\n```';
		}
	},
	{
		cause: 'api', kind: 'error', op: 'GET', teams: ['maps', 'mobile', 'ci'], buckets: ['map-tiles.v2', 'assets.static', 'downloads.v1'],
		asks: [
			['Certificate errors for our bucket with a dot in its name', 'Requests to `{B}.storage.kestrel.internal` fail certificate checks: the certificate is for `*.storage.kestrel.internal`, and our client turns it down.'],
			['TLS name mismatch on virtual-host requests', 'Since we switched the client to virtual-host style addressing, every request to {B} fails with a hostname mismatch.'],
			['Cannot use the new SDK with our bucket', 'The new SDK defaults to virtual-host addressing, and with our bucket {B} it cannot verify the server certificate. The old SDK works.']
		],
		facts: ['Path-style requests to the same bucket work.', 'The bucket was created years ago, before names with dots were discouraged.', 'The same client works with our other buckets.'],
		question: 'Does the bucket name contain a dot? That would explain it.',
		answer: 'It does, as you can see. We had not thought of that.',
		suspect: { area: 'tenant', text: ['This sounds like an outdated trust store on your side. The certificate was renewed in June with a new intermediate.'] },
		finding: ['The trust store is fine. A wildcard certificate covers one label only, so `*.storage.kestrel.internal` matches `tiles.storage.kestrel.internal` but not a host name whose bucket part contains a dot, which makes it two labels. That is a limitation of the api tier\'s certificate, not of the client.', 'It comes from the api tier\'s certificate. A wildcard matches exactly one label, and a bucket name with a dot turns into two labels in the host name, so no client can verify it.'],
		confirm: 'Virtual-host requests verify now.',
		plea: 'Could the certificate cover our bucket name? Renaming the bucket would mean changing every client we publish.',
		ours: 'We added the full host name of {B} to the api certificate as an extra name, so virtual-host requests verify. The new certificate went out on {D}.',
		theirs: 'We copied everything to a new bucket without a dot in its name and moved the readers over.',
		workaround: ['them', 'The client is set to path-style addressing for this bucket, which avoids the certificate question.'],
		declined: 'We will not add names to the api certificate one bucket at a time. Path-style addressing works for buckets with dots, and new buckets cannot have them.',
		endings: ['ours', 'workaround', 'declined', 'theirs'], arts: ['own', 'stack'],
		stackError: 'Hostname/IP does not match certificate\'s altnames: Host: {B}.storage.kestrel.internal. is not in the cert\'s altnames: DNS:*.storage.kestrel.internal, DNS:storage.kestrel.internal',
		own: ({ r, bucket }) => '```text\n' + [`$ curl -sv https://${bucket}.storage.kestrel.internal/ -o /dev/null`, `*   Trying 10.${int(r, 16, 31)}.${int(r, 0, 255)}.${int(r, 1, 254)}:443...`, `* Connected to ${bucket}.storage.kestrel.internal port 443`, '* ALPN: curl offers h2,http/1.1', '* TLSv1.3 (OUT), TLS handshake, Client hello (1):', '* TLSv1.3 (IN), TLS handshake, Server hello (2):', '* TLSv1.3 (IN), TLS handshake, Certificate (11):', '* Server certificate:', '*  subject: CN=*.storage.kestrel.internal', `*  start date: Jun ${int(r, 1, 20)} 00:00:00 2026 GMT`, '*  subjectAltName does not match ' + bucket + '.storage.kestrel.internal', '* SSL: no alternative certificate subject name matches target host name', `curl: (60) SSL: no alternative certificate subject name matches target host name '${bucket}.storage.kestrel.internal'`].join('\n') + '\n```'
	},
	{
		cause: 'api', kind: 'flaky', op: 'PUT', error: [403, 'RequestTimeTooSkewed'], teams: ['mobile', 'mail', 'ci'], failHosts: ['api-05'],
		asks: [
			['RequestTimeTooSkewed although our clocks are right', 'Some requests to {B} are turned away with 403 RequestTimeTooSkewed. Our hosts are synchronised and within a few milliseconds of each other.'],
			['Random 403 time-skew errors', 'About one request in ten to {B} fails with RequestTimeTooSkewed, then works when tried again.'],
			['Clock skew errors since last week', 'Since last Wednesday we see clock skew errors from Kestrel on PUT and GET alike. We checked our clocks and they are fine.']
		],
		facts: ['Trying the same request again usually succeeds.', 'The error body shows a server time about 16 minutes behind ours.', 'The errors started on a Wednesday afternoon.'],
		question: 'Could you send request IDs of failed requests? The error body includes the server time it compared against.',
		answer: 'They are below. In each one the server time in the body is around sixteen minutes behind.',
		suspect: { area: 'tenant', text: ['The skew window is fifteen minutes. If the error says sixteen, one of your hosts has drifted, perhaps a container without time sync.'] },
		finding: ['All the turned-away requests went to the same api host, api-05, and its clock was sixteen minutes slow: time sync had not started after the host was rebuilt from the new image on Wednesday. Your clocks were right all along.', 'The failing requests all landed on one api host whose clock had drifted by sixteen minutes. Time sync was missing from the image it was rebuilt from on Wednesday; the other api hosts are fine.'],
		confirm: 'No skew errors since.',
		again: 'We got RequestTimeTooSkewed errors again this morning.',
		ours: 'Time sync is back on api-05 and in the image, and every api host now has an alert on clock offset. No skew errors in the logs since {D}.',
		waitTenant: 'The clock on that host is fixed. Could you tell us whether you still see any skew errors over the next few days?',
		endings: ['ours', 'waitTenant'], arts: ['trace', 'access']
	},
	{
		cause: 'placement', kind: 'request', op: 'PUT', teams: ['mail', 'billing', 'mobile'],
		asks: [
			['Confirm that data in our EU bucket stays in the EU', 'Legal asked us to confirm that objects in {B} are stored only in the EU region. We assumed so, but we have never had it in writing.'],
			['Some fragments of our EU bucket appear to be in the US zone', 'The object location report we asked for shows fragments of some objects in {B} on hosts in the US zone. That should not be possible for an EU bucket.'],
			['Data residency question for {B}', 'A customer contract requires EU-only storage. Before we sign we need to know how {B} is placed and whether that is guaranteed.']
		],
		facts: ['The bucket was created in 2023 with the old provisioning tool.', 'We have always called it our EU bucket, but nothing in its settings says so.', 'Newer buckets of ours show the region on the bucket settings page; this one does not.'],
		question: 'Was the bucket created with the region set explicitly? Buckets from the old provisioning tool sometimes were not.',
		answer: 'We do not know; the person who created it has moved on. It was the old tool, though.',
		suspect: { area: 'index', text: ['The location report is built from the index\'s records of where each fragment lives. If those records are stale, the report could show old locations that are no longer true.'] },
		finding: ['The index records are accurate. The bucket has no region constraint in placement: buckets made by the old provisioning tool got the default policy, which spreads fragments over every zone, including the US one. Placement did exactly what it was told.', 'It is placement: {B} was never given a region constraint, so placement treats it like any global bucket and puts fragments in all zones. Calling it the EU bucket never made it one.'],
		confirm: 'Legal has what they asked for.',
		ours: 'Placement now holds {B} to the EU zones, and the background job moved every fragment that was outside them, finishing on {D}. The location report below shows none left outside.',
		workaround: ['them', 'For the contract, we will put the customer\'s data in a new bucket created with the EU constraint and leave {B} as it is.'],
		waitUs: 'The EU constraint is set on {B} for new writes. Moving the existing fragments out of the US zone runs in the background and will take about three weeks; we will add the final location report here when it is done.',
		waitTenant: 'Setting the constraint means moving the existing fragments in the background. Could you confirm in writing that you want it done? It cannot be undone cheaply.',
		endings: ['ours', 'waitUs', 'waitTenant', 'workaround'], arts: ['own', 'listing'],
		own: ({ r, bucket }) => {
			const rows = ['| Zone | Region | Fragments | Share |', '| --- | --- | ---: | ---: |'];
			const zones = [['eu-a', 'EU'], ['eu-b', 'EU'], ['eu-c', 'EU'], ['us-a', 'US']] as const;
			const counts = zones.map(() => int(r, 180, 260) * 1000);
			const total = counts.reduce((a, b) => a + b, 0);
			zones.forEach(([zone, region], i) => rows.push(`| ${zone} | ${region} | ${thousands(counts[i]!)} | ${((counts[i]! / total) * 100).toFixed(1)}% |`));
			return `Location report for ${bucket}:\n\n` + rows.join('\n');
		}
	},
	{
		cause: 'storage', kind: 'slow', op: 'PUT', teams: ['video', 'ml', 'warehouse'], after: '2026-10-22', keyLike: /^(masters|runs|events)\//,
		asks: [
			['Upload throughput capped at about 80 MB/s per stream', 'Since October single-stream uploads into {B} never go above 80 MB/s. They used to reach 250 MB/s from the same hosts.'],
			['Large uploads slower than last quarter', 'Our nightly upload to {B} takes nearly three times as long as it did in the summer. Nothing changed in the job or the network.'],
			['PUT throughput dropped after mid-October', 'Throughput for big PUTs into {B} dropped sharply in the third week of October and has stayed low.']
		],
		facts: ['Downloads are as fast as ever.', 'Our network team sees no loss or congestion between our hosts and the endpoint.', 'The slow uploads come from all our upload hosts, not one.'],
		question: 'When exactly did it change? A date to the day would help us line it up with our own changes.',
		answer: 'The 19th of October, as far as our graphs go. The day before was normal.',
		suspect: { area: 'api', text: ['The api tier got a new TLS library in October. A slower cipher on the upload path could cap a single stream like that.'] },
		finding: ['The api passes uploads through at full speed; the time is on the storage hosts. A kernel update on the 19th reset the disk controllers to write-through mode, so every write waits for the disk instead of the controller\'s cache. Reads are unaffected, which matches what you see.', 'Storage. The kernel update rolled out on the 19th switched the controller cache on the storage hosts to write-through. Each write now waits for the disk itself, which caps a single stream.'],
		confirm: 'Last night\'s upload ran at the old speed.',
		again: 'Last night\'s upload was slow again, 90 MB/s at best.',
		ours: 'The controller cache is back in write-back mode on every storage host, and the setting is pinned in the host configuration so the next kernel update cannot reset it. Single streams reach their old speed since {D}.',
		workaround: ['them', 'Our nightly upload now starts two hours earlier, so it still finishes before the morning jobs.'],
		waitUs: 'The setting can only be changed with a reboot, so the change waits for the next maintenance window, at the end of the month.',
		waitTenant: 'The cache setting is restored on the storage hosts behind {B}. Could you check tonight\'s upload and tell us whether the speed is back?',
		endings: ['ours', 'workaround', 'waitUs', 'waitTenant'], arts: ['latency', 'access']
	}
];

// More of each topic, in the order of `topics`: another way to raise it, what the desk checked on the way, what
// the tenant noticed besides, the ways out, the tenant's reaction to the diagnosis, and a question from a second
// person on the desk with its answer.
interface Extra {
	ask?: [string, string];
	tried: string;
	checks: [string, string];
	detail: [string, string];
	options: string;
	reaction: string;
	deskQ: [string, string];
}
const extras: Extra[] = [
	// Signature encoding
	{
		tried: 'We have tried uploading the failing files again from a different network, from a laptop instead of our server, and after a restart. Nothing changes: the same files fail, the others go through.',
		checks: ['I pulled the api logs for the request IDs. All of them were turned away at signature verification, and the canonical request the api computed is in the debug log. The access key, the date and the region in the credential scope are all correct, so it is not a key or clock problem.', 'I looked at the failures of the last two days: 412 requests, all PUT, all with a key that contains a space or a plus sign. Not one failure on a key made only of letters, digits, dashes and slashes. That is too clean to be chance.'],
		detail: ['One more observation: users who rename a file before uploading it fail far more often than users who upload straight from the camera roll.', 'We also tried the same key through the command-line tool with debug output on, and it went through. The tool percent-encodes the path; we had not looked at what our own code does until now.'],
		options: 'There are two ways out on your side. Either encode the path per segment the way the spec means, which is what the SDK does, or switch the upload path to the SDK\'s signer alone, without pulling in the whole client. The second is less code to own.',
		reaction: 'That is embarrassing, but it explains why it looked random from our side. The signer was copied from an old example and nobody has touched it since.',
		deskQ: ['Did the api release change anything in canonicalisation at all? Just so we can rule it out in the release notes.', 'Nothing. The release touched the chunked-upload path only, and these are single PUTs. I compared the canonicalisation code of both versions to be sure.']
	},
	// Listing after write
	{
		tried: 'We tried listing twice in a row: the second listing, a few seconds after the first, sometimes has the file and sometimes does not. A delay of one minute before listing seems to help, but we have not proved it.',
		checks: ['The PUT you quoted completed at 01:14:07.412, and every storage host holding its fragments acknowledged within 40 ms. The listing at 01:14:08 was answered by replica 3 of the bucket\'s index partition. I am checking how far behind that replica was at the time.', 'I lined up a night of PUTs and listings for {B}. Every missing key was written less than a minute before the listing, and every listing that missed one was answered by a replica rather than by the partition leader.'],
		detail: ['We also noticed that the gaps never happen on Sundays, when the loader has far less to do. That fits with load being part of it.', 'For what it is worth, it got worse a few weeks ago, when we doubled the number of sources writing into {B}.'],
		options: 'Two ways to fix it on our side: send every listing to the partition leader, which is simple but puts the whole listing load on one host per partition, or send listings to the leader only for a short time after a write to the same prefix, which keeps the load spread and covers your case. We lean towards the second.',
		reaction: 'So a listing is only as fresh as whichever replica answers it. That is not what the documentation says, as far as I read it.',
		deskQ: ['How far behind can a replica get? Is a minute the worst we have seen?', 'Seventy-two seconds is the worst in the last month, during the reindex of another bucket. Normally it is under a second.']
	},
	// Listing token loop
	{
		ask: ['Continuation token stops advancing', 'Paging through {B} with the SDK, the continuation token stops changing after a few thousand pages. The SDK keeps asking with the same token and gets the same keys back.'],
		tried: 'We tried a smaller page size and a newer SDK version. Both loop at the same key.',
		checks: ['I decoded the two tokens you sent. They are identical, byte for byte, and both hold a key of exactly 255 bytes. The key you say it sticks at is 318 bytes long. That is a strong hint.', 'Reproduced on staging with two keys that share their first 260 bytes. The listing returns the same page forever, from any client, including our own test tool. So it is not your client.'],
		detail: ['We checked: the keys under that prefix got longer in August, when we added more of the source path to them. Before that the inventory never had trouble.', 'Our tool does not touch the token; it passes on whatever it gets. We logged both tokens raw to be sure.'],
		options: 'Either the index keeps the full last key in the token, which makes tokens longer and changes their format, or it keeps the cut key plus a short hash of the full one to break ties. The first is simpler, and the token length is not a real concern.',
		reaction: 'That explains why it is only this prefix. It is the only one with keys that long.',
		deskQ: ['Does anything else in the index cut keys to 255 bytes?', 'I searched: only the token. Keys themselves are stored in full, up to the 1,024-byte limit.']
	},
	// Small-object reads
	{
		ask: ['Small reads slower every week since September', 'The p99 of our reads from {B} has crept up every week since mid-September, from about 60 ms to over 500 ms now. Nothing on our side has changed in that time.'],
		tried: 'We ruled out our own side as far as we can: the service has the same number of instances, the same CPU use and the same connection settings as in August.',
		checks: ['Connection counts on the api hosts are normal and nothing queues there. I took twenty slow request IDs and followed them through: in every case the api waited on a storage host for most of the time.', 'The slow reads are all for objects in packs older than mid-September. Objects in newer packs are fast. I am looking at what changed on the storage hosts around then.'],
		detail: ['We also tried a test client that reads the same small object a hundred times: the first read is slow, the rest are fast. Caching on your side, I assume.', 'One more data point: our own cache hit rate has not changed, so we are not sending more reads than before.'],
		options: 'We can put compaction back on its old schedule, which fixes it over a few weeks as compaction catches up, or run a one-off compaction at high priority on the worst packs, which is faster but slows every read on those hosts while it runs. We will start with the schedule and see how fast it catches up.',
		reaction: 'That fits the timing: our problem started a week or two after mid-September.',
		deskQ: ['Why was compaction paused in the first place?', 'The schedule change in September was meant to move it to quieter hours. A typo in the new schedule turned it off on most hosts instead.']
	},
	// Hot prefix
	{
		ask: ['Writes throttled for the first minutes of each hour', 'Our writer gets 503 SlowDown from {B} for a few minutes after every full hour and then runs clean until the next one. We buffer locally, so nothing is lost, but the buffers grow every hour.'],
		tried: 'We tried slowing our writer down for the first ten minutes of each hour. It helps a little, but our local buffers grow instead.',
		checks: ['Nothing scheduled runs at :00 on the storage hosts. What does change at the hour is which placement group your writes go to: in the first minutes of each hour, all your writes land in one group.', 'I looked at write latency per placement group for {B}. At any moment one group takes nearly all the writes and the others take none, and the busy group changes every hour, at the hour.'],
		detail: ['We also checked our client: requests are spread evenly over time, and there is no burst at the hour from our side.', 'Another observation: the spikes are worst at midnight, when the date changes as well as the hour.'],
		options: 'For the bucket, either placement switches to whole-key hashing for new writes, which needs trying on a smaller bucket first, or you add a short hash at the front of your keys, which works today with no change on our side. The first keeps your key layout; the second is in your hands.',
		reaction: 'So our key layout, which we chose to make listing by hour easy, is what piles up the writes. That is a trade we did not know we were making.',
		deskQ: ['How many buckets still group by prefix?', 'About forty, all created before last year. Most of them are small and nobody notices.']
	},
	// Multipart part limit
	{
		ask: ['InternalError when assembling very large uploads', 'Our biggest files fail at the end of their upload into {B} with InternalError. The parts are all accepted, so the problem seems to be the final assembly.'],
		tried: 'We tried the upload three times with the same file. Each time every part was accepted and the final call failed after about forty seconds.',
		checks: ['I found the failed completions in the api logs. Each one failed after the api had read the part list from the request, with an unhandled error in the code that checks the part count. The index was never called.', 'All the failing uploads of the last month had more than 10,000 parts. None of the uploads under that number failed at completion.'],
		detail: ['We also noticed that the tool happily sends part 10,001 and beyond without any error. It only fails at the very end.', 'The tool is shared by three teams, so changing its defaults needs some coordination.'],
		options: 'The api should answer part 10,001 with a clear error when it is sent, instead of failing at completion. That is on us either way. On your side, a larger part size for big files stays under the limit.',
		reaction: 'If the error had said "too many parts" we would have found this in five minutes. Still, good to know the cause.',
		deskQ: ['Is 10,000 parts a limit we chose, or one we inherited?', 'Inherited from the API we are compatible with. Every client library assumes it, so it stays.']
	},
	// CORS
	{
		ask: ['New uploader cannot reach the bucket from the browser', 'We are rolling out a browser uploader for {B}. In testing on the new domain, every upload fails before it starts, with a CORS message in the console.'],
		tried: 'We tried another browser and a private window, in case of a cached preflight. Same result everywhere.',
		checks: ['The api access logs show the preflight requests arriving and being answered with 403 within a millisecond. The CORS handling has not changed since the spring release.', 'I replayed one of your preflights against {B} with the origin and headers from your paste. It is turned down, and the debug log says which part of the rule did not match.'],
		detail: ['We also tried the same page on our staging domain, which is the old one, and the upload works there.', 'The browser console shows the preflight asking for the checksum header. We added that header last month for integrity checks.'],
		options: 'On your side: add the new domain to AllowedOrigins and the checksum header to AllowedHeaders for PUT in the bucket\'s rule. Nothing is needed from us.',
		reaction: 'So the copied configuration was the problem all along. We never looked at it after copying it.',
		deskQ: ['Should we log the reason for a turned-down preflight somewhere tenants can see it?', 'Probably. I will raise it for the api backlog; it would have saved a day here.']
	},
	// Stale reads after overwrite
	{
		ask: ['Readers sometimes see the previous manifest', 'After we publish a new manifest to {B}, a few readers keep getting the old one for several seconds. Our publish step reports success before that happens.'],
		tried: 'We tried adding a two-second pause between the write and the signal to readers. Fewer stale reads, but not none.',
		checks: ['Both stale reads you sent were answered by api hosts other than the one that took the PUT before them, within five seconds of it. The index had the new record as soon as the PUT was answered.', 'I wrote a small test that overwrites an object and reads it back through every api host in turn. The host that took the PUT returns the new version at once; the others return the old one for up to five seconds.'],
		detail: ['We also noticed that the stale reads are more common at deploy time, when many readers fetch the file in the same second.', 'Our readers try again when the ETag is not the one they expect, so the effect is a delay rather than wrong data, but the deploys still time out.'],
		options: 'Either every api host drops its entry when an object is overwritten, which needs a message between api hosts, or the cache lifetime for small objects comes down to a second, which narrows the window without closing it. We could do the second quickly and the first later.',
		reaction: 'So it is a cache, and it is only stale on the hosts that did not see the write. That explains the one in twenty.',
		deskQ: ['Why does the api cache metadata at all?', 'It halves the index lookups for hot objects. Taking it out would cost more than it saves.']
	},
	// Checksum after gzip
	{
		ask: ['Importer flags files as corrupt that open fine', 'The importer marks some files from {B} as corrupt because their hash does not match. When someone opens the same file by hand, it looks perfectly normal.'],
		tried: 'We tried downloading a failing file again a day later. Same wrong hash, same wrong size, so it is not a one-off transfer problem.',
		checks: ['The scrub reports for the fragments of the failing files are clean. I fetched one of them myself, and its SHA-256 matches the one you stored at upload.', 'I compared the bytes the api sent for one failing file with the bytes stored. Identical. The response carries `Content-Encoding: gzip`, set at upload, which is worth a look on your side.'],
		detail: ['We also checked our upload code: it sets `Content-Encoding: gzip` on compressed files so that browsers would unpack them. That was years ago.', 'Our importer is the only reader of these files, apart from the occasional download by hand.'],
		options: 'Two ways on your side: turn off automatic decompression in the importer\'s client, or stop setting `Content-Encoding` on upload and treat the files as plain binary. The first fixes the importer today; the second settles it for every future reader.',
		reaction: 'That is a relief, honestly. We were preparing to tell compliance that records were corrupted.',
		deskQ: ['Do we see other tenants storing gzip files with Content-Encoding set?', 'A few. Most read them with clients that do the same unpacking, so they never notice.']
	},
	// Disk firmware stalls
	{
		ask: ['503 ServiceUnavailable in bursts on reads', 'Reads from {B} answer 503 ServiceUnavailable for a minute or two at a time, a few times a day. Between the bursts everything is normal.'],
		tried: 'We tried lowering our own request rate during a burst, and it made no difference to the errors.',
		checks: ['No api host restarted or failed a check during the bursts you listed. In every burst, the api was waiting on storage reads that took over two seconds, and gave up.', 'The slow reads in each burst all went to one storage host, and on that host to a single disk. A different host and disk each time, but always the same disk model.'],
		detail: ['We also noticed the bursts got more frequent this month: about one a day at first, now three or four.', 'Our retry logic hides most of it, but each burst still shows up as failed page loads for some users.'],
		options: 'The real fix is the firmware update for that disk model, which the hardware team has, but it needs a reboot and waits for their maintenance window. Meanwhile the api could read from parity when a disk does not answer quickly, which turns a stall into a slower read instead of an error.',
		reaction: 'So it is a disk, not anything we do. Good to know, and good to know it is understood.',
		deskQ: ['How many disks of that model do we have?', 'About 600, spread over most of the storage hosts. The hardware team has a list.']
	},
	// Rate limiter per host
	{
		ask: ['SlowDown errors as soon as a large job starts', 'Whenever a large job starts reading from {B}, the first minutes are full of SlowDown errors, even though the job reads at a modest rate.'],
		tried: 'We tried starting the workers in waves of fifty instead of all together. The throttling is a bit milder but still there.',
		checks: ['Your bucket\'s placement groups are spread normally. During the throttled periods, three api hosts carried almost all of your requests, and those three were the ones answering SlowDown.', 'I counted your requests per api host for one job: three hosts had about 260 requests a second each, the others close to none. The limiter on each host allows a share of your limit, and those three hit it.'],
		detail: ['We also noticed the throttling is worse right after a job starts and eases a little later, as some workers reconnect.', 'The workers use the SDK\'s default connection settings, which keep connections open as long as possible.'],
		options: 'The limiter should count your rate across all api hosts, which is the proper fix and a real piece of work. Until then, either your workers reopen their connections regularly so they spread out, or we raise the per-host share of your limit, which is crude but immediate.',
		reaction: 'So we were never near the real limit; we were unlucky with which hosts we talked to.',
		deskQ: ['Do other tenants hit this?', 'Anyone with few clients and long connections. Jobs with hundreds of workers are just the most extreme.']
	},
	// Usage counts unfinished uploads
	{
		ask: ['Usage figure far above our own inventory', 'Our inventory of {B} says one figure, the monthly usage report says roughly three times as much. We would like to understand the difference before the next chargeback.'],
		tried: 'We ran our inventory twice, with two different tools, and both arrive at about a third of the reported figure.',
		checks: ['Reclaim on the storage hosts that hold {B} is up to date; there is no space waiting to be freed. The difference must be in what the usage figure counts.', 'I listed the unfinished multipart uploads in {B}: about 14,000, with parts adding up to well over 100 TB. The oldest was started in March.'],
		detail: ['We also checked: the jobs that are stopped at their time limit are exactly the ones writing the largest files.', 'Finance would like to know whether the chargeback for past months will be corrected.'],
		options: 'On your side, an abort rule for unfinished uploads on the bucket stops them building up, and the jobs could abort their own upload when they are stopped. On our side, the report could show unfinished uploads separately so nobody has to guess.',
		reaction: 'So we have been paying for uploads that never finished. That explains the growth, at least.',
		deskQ: ['Should every bucket get a default abort rule?', 'I think so. Thirty days would catch almost everything and hurt nobody. I will propose it.']
	},
	// Old TLS client
	{
		ask: ['Job cannot connect after moving hosts', 'Our nightly job was moved to different hosts last week and has not connected to Kestrel since. The error is a TLS protocol alert during the handshake.'],
		tried: 'We tried pointing the job at the endpoint by IP address instead of name, in case it was DNS. The handshake fails the same way.',
		checks: ['The api logs show the connections from those hosts closing during the handshake, before any certificate is sent. The client offers TLS 1.1 as its highest version.', 'I connected from a test host with TLS 1.1 forced and got exactly your error. With TLS 1.2 it works, with the old and the new certificate alike.'],
		detail: ['We also found that the image those hosts use is three years old. Nobody noticed because the job used to run elsewhere.', 'The other job on those hosts does not talk to Kestrel, which is why only this one fails.'],
		options: 'Either the job moves to a current image, which is the real answer, or the existing image gets a Java 8 runtime with TLS 1.2 turned on, which is a smaller change. Both are on your side.',
		reaction: 'So the move to new hosts was the cause, not anything on your side. Thanks for the quick answer.',
		deskQ: ['When did we turn off TLS 1.1 again?', 'In January, announced the November before. This is the first ticket about it in months.']
	},
	// Multi-range requests
	{
		ask: ['Seeking in long videos downloads the whole file', 'When a viewer jumps ahead in a long file from {B}, the player downloads the whole file before it can play. The network panel shows a 200 where we expect a 206.'],
		tried: 'We tried the same seek with a different player library, and it works there, which made us suspect our player first.',
		checks: ['I reproduced it with curl: a single range gets a 206, two ranges in one header get a 200 with the whole object. Storage is not involved in the decision; the api chooses before it reads anything.', 'The api code checks whether the Range header holds one range and, if not, treats it as absent. There is no error and nothing in the logs, which is why it went unnoticed.'],
		detail: ['We also noticed the player only does this for files that have their index at the end, which is most of the older files.', 'The player library is shared with the mobile apps, so changing it means three releases.'],
		options: 'The api could answer multi-range requests properly with a multipart response, which is the full fix and needs streaming changes, or answer with the first range only, which is quick and makes clients ask again for the rest. On your side, one range per request works today.',
		reaction: 'So the standard allows the api to do this. Annoying, but at least it is not a bug in our player.',
		deskQ: ['Is any client library known to send multi-range requests?', 'None of the ones we support. Browsers and media players are where they come from.']
	},
	// Copy drops metadata
	{
		ask: ['Server-side copy loses user metadata on big objects', 'Copying objects from one prefix of {B} to another, the big copies come out with no user metadata at all. The small copies are fine.'],
		tried: 'We tried setting the metadata directive to COPY explicitly. The large copies still come out without metadata.',
		checks: ['The api passes the metadata directive to the index unchanged on both copy paths. The difference appears in the index call that completes a part-wise copy.', 'I copied a 6 GB object on staging: the copy has the system fields and none of the user metadata. A 4 GB copy keeps everything.'],
		detail: ['We also noticed that the copies keep their content type. It is only the custom metadata that goes missing.', 'Our retention job treats objects without the metadata as unclassified and flags them, which is how we found this.'],
		options: 'The index should read the source\'s user metadata on the part-wise path as it does on the small one. Until that is out, setting the metadata explicitly on the copy request works on your side.',
		reaction: 'So only large copies are affected, and it is on your side. We will hold our retention job until it is fixed.',
		deskQ: ['How long has the part-wise path dropped metadata?', 'Since it was written, as far as I can tell. Large copies inside one bucket are rare.']
	},
	// Slow bucket creation
	{
		ask: ['Test runs time out at bucket creation', 'Our test runs create their own bucket and have started timing out at that step. When they do get a bucket, it has taken half a minute.'],
		tried: 'We tried creating buckets from a different runner and a different account. The time is the same, so it is not our account.',
		checks: ['The index writes the new partition in a few milliseconds. Almost all of the 40 seconds is spent waiting for placement to assign groups to the new bucket.', 'Placement\'s queue for new buckets is dozens deep at times in the afternoon, almost all of it your test runs. Each request takes about four seconds once it is picked up.'],
		detail: ['We also noticed it is worst in the afternoon, when most test runs happen.', 'Our provisioning tool gives up after 30 seconds and does not try again, which is where the timeouts come from.'],
		options: 'Placement could keep a stock of precomputed group sets and hand one out at once, which brings creation back under a second. On your side, sharing a few long-lived buckets between runs, with a prefix per run, avoids creating buckets at all.',
		reaction: 'So we are most of the queue ourselves. That is useful to know.',
		deskQ: ['Why did the September change make it slower?', 'It made layouts better balanced by computing them fresh. Nobody expected 400 new buckets a day.']
	},
	// Whole copies for an audited bucket
	{
		ask: ['How is {B} stored?', 'For the audit in December we need to describe how {B} is stored. Is it replicated, erasure coded, and across how many locations?'],
		tried: "We read the client guide's page on durability, but it describes the default and does not say what our bucket uses.",
		checks: ['I checked the placement policy of {B}: default erasure coding, fragments in three zones. Nothing unusual, and nothing set specially for the bucket.', 'Read latency for {B} is normal for an erasure coded bucket of small objects. Whole copies would cut the tail somewhat, not dramatically.'],
		detail: ['We also asked the auditors what wording they expect. They want the number of copies, the locations and who decides.', 'The reads are a handful a month, mostly by our own checks and by auditors on request.'],
		options: 'Either we change {B} to whole copies, which costs about twice the disk and rewrites the existing objects in the background, or we give you a written statement of the current policy, which is what most audits accept. The second costs nothing.',
		reaction: 'A written statement might be all we need. Let me check with the auditors.',
		deskQ: ['Have other tenants asked for whole copies?', 'Two, both for audits. Both were happy with the written statement in the end.']
	},
	// Listing order of accented keys
	{
		ask: ['Sync tool thinks accented files are missing', 'Our sync tool reports a few hundred files with accented names as missing from {B} on every run, then uploads them again. They are there when we look.'],
		tried: 'We tried running the sync from a developer laptop, and there the number of missing files is different, which confused us further.',
		checks: ['I listed the prefix twice and the order is the same both times. The keys are stored byte for byte as your uploader sent them, with no normalisation.', 'I compared your two lists: the listing is in UTF-8 byte order, your local list in German collation order. Every key that differs between them contains a letter outside ASCII.'],
		detail: ['We also noticed the problem appeared when the sync tool moved to new hosts with a German locale. Before, the hosts used the C locale.', 'The tool was written by a colleague who has since moved on, so we are reading its code for the first time.'],
		options: 'Either the tool sorts its local list in byte order before comparing, which matches the listing exactly, or it stops depending on order and compares sets. Both are on your side.',
		reaction: 'So the hosts\' locale is what changed, not the listing. That explains why it started out of nowhere.',
		deskQ: ['Do we document listing order?', 'Yes, in the API reference, in one line. I will add an example with an accented key.']
	},
	// HEAD metering
	{
		ask: ['Request chargeback higher than expected after a client change', 'We changed our client to check for existing objects with HEAD before writing to {B}. The request chargeback went up instead of down.'],
		tried: 'We checked whether our client sends HEAD twice by mistake. It does not: each object gets one HEAD and, if it is missing, one PUT.',
		checks: ['The index records lookups but sends nothing to billing. The usage figures come from the api\'s request metering.', 'I compared one day of your counts with the api\'s metering. Every HEAD is under GET, and every HEAD that answered 404 is counted twice.'],
		detail: ['We also checked our client metrics again: no HEAD is sent twice from our side.', 'Finance would like to know whether the month before was affected too, or only the last one.'],
		options: 'Two bugs in the api\'s metering: HEAD recorded under GET, and missed lookups counted twice. Fixing both is ours. Whether HEAD gets its own price is a separate question, for the price list.',
		reaction: 'So part of our bill is a bug. Finance will be glad to hear it.',
		deskQ: ['Does the double count affect other tenants?', 'Anyone who sends HEADs that miss. I am working out the corrections for everyone.']
	},
	// Slow multipart completion
	{
		ask: ['Uploads time out at the final step', 'Our large uploads into {B} time out right at the end, after every part has been sent. We see a 504 from our egress proxy.'],
		tried: 'We tried uploading the same file from a host inside the network. It completes, but the last step still takes over a minute.',
		checks: ['The completions you quoted reached the api within a second of your call, and the api waited on the index for 70 to 90 seconds before answering. The proxy cut the connection at 60.', 'I timed completions on staging: 500 parts take 8 seconds, 5,000 take 80. Before the index release at the end of August, 5,000 parts took about a second.'],
		detail: ['We also noticed that the uploads that fail are the ones that go through the proxy; from inside the network they complete, slowly.', 'Our uploads got larger in the summer, which may be why we only see it now.'],
		options: 'The index should read the part list in ranges again, as it did before the August release. That is on us. Meanwhile, uploads with fewer parts, or uploads from inside the network, stay clear of the proxy timeout.',
		reaction: 'So the proxy was only the messenger. Good, because changing it would have taken weeks.',
		deskQ: ['Why did the August release change how parts are read?', 'It moved part lookups to a new storage format and lost the ranged read on the way.']
	},
	// Lifecycle tag mismatch
	{
		ask: ['Transition rule not moving anything to cold storage', 'A lifecycle rule on {B} should move objects older than 90 days to the cold class. After two months, nothing has moved.'],
		tried: 'We tried a 30-day version of the rule on a test bucket and waited a week. Nothing moved there either.',
		checks: ['Placement\'s transition job ran every night this month and moved objects for other buckets. For {B}, the rule matched nothing, so nothing was queued.', 'I evaluated the rule against a sample of objects in {B}: the prefix matches, the tag condition never does.'],
		detail: ['We also found that one of the two uploading services tags its objects and the other does not tag at all.', 'The rule was copied from a design document that nobody checked against the uploaders.'],
		options: 'Either correct the tag condition in the rule to what the uploaders write, or change the uploaders to write what the rule expects and retag the existing objects. The first is a one-line change.',
		reaction: 'So the rule was wrong from the day it was written. At least that is easy to fix.',
		deskQ: ['Can we warn when a lifecycle rule has matched nothing for weeks?', 'Good idea. I will put it on the list for the next placement release.']
	},
	// Missing events for multipart uploads
	{
		ask: ['Processor never hears about some new objects', 'Our processor relies on upload events from {B}. Some objects never trigger it, and we only find them when a weekly check compares listings.'],
		tried: 'We tried uploading a few test files of different sizes. The small ones produced events at once; the 300 MB one never did.',
		checks: ['The api forwarded every event it received from the index, with no errors. The missing events were never produced.', 'Every object without an event in your list was uploaded as a multipart upload. Single PUTs and copies all produced theirs.'],
		detail: ['We also checked: no event for an object uploaded in parts has ever reached us, not even for small ones.', 'Our processor has no other way to learn about new objects, so these files simply wait.'],
		options: 'The index should emit an event when a multipart upload completes, like any other commit, and we can replay the missed ones afterwards. On your side, a regular sweep of recent objects catches anything without an event.',
		reaction: 'So every file over 100 MB has been invisible to us. That is more than 2% of the bytes, if not of the files.',
		deskQ: ['Was this always the case for multipart uploads?', 'Since notifications were added last year. The completion path was simply missed.']
	},
	// Request IDs lost on internal second attempts
	{
		ask: ['Request IDs from error responses are not in the desk\'s logs', 'Several times this quarter the desk could not find a request ID we quoted from an error response. We want to know whether we are reading the wrong header.'],
		tried: 'We tried giving the desk the ID from the response body as well as the header. They are the same, and neither is found.',
		checks: ['None of the three IDs is in the access logs. All three requests were answered by api hosts that had tried a second backend after the first one failed.', 'I found the requests by time and bucket: each is logged under a different ID, the one the api made for its second attempt.'],
		detail: ['We also noticed that the IDs we cannot find are all from times when we saw more errors than usual.', 'Our support runbook tells people to quote the request ID, so this costs us time in every escalation.'],
		options: 'The api should keep the client\'s request ID through its own second attempts and log those under it. Until then, a time to the second and the bucket are enough for us to find a request.',
		reaction: 'So the ID we get is real, it is just not in your logs. Good to know we are not quoting it wrong.',
		deskQ: ['Who else parses the access log format?', 'Billing and the security team. Both need to agree before the format changes.']
	},
	// Cold-class first byte
	{
		ask: ['Reads of old files take seconds to start', 'Old files in {B} take three to five seconds before the first byte arrives, while newer files start at once. The audit tool reads mostly old files.'],
		tried: 'We tried reading the same old file twice in a row: the first read takes four seconds, the second is instant.',
		checks: ['The api answered the metadata part of each slow request within a few milliseconds and then waited on storage. All the slow objects are on dense storage hosts.', 'I read an object from {B} that had not been touched for months: four seconds to the first byte. A second read a minute later took 20 ms.'],
		detail: ['We also noticed the delay is worst for the first file of a run and gets better as the run goes on.', 'The audit tool reads files one after another, so every delay adds up.'],
		options: 'The dense hosts could keep their disks spinning during your working hours, which costs power and some disk life, or the files you read on a schedule could move back to the standard class. The second is what the cold class is designed around.',
		reaction: 'So it is the price of the cold class. We did not know the disks spin down.',
		deskQ: ['How long do the dense disks stay up after a read?', 'Twenty minutes. After that they spin down until the next read.']
	},
	// Client retries on 404
	{
		ask: ['Usage report shows far more HEAD requests than we send', 'The usage report for {B} lists about eleven times as many HEAD requests as our client logs. We would like to know where the difference comes from.'],
		tried: "We counted the calls in our own logs twice and compared them with the job's input. They match; the extra requests are not in our logs.",
		checks: ['The api\'s counts match the access log exactly for the hour I checked. Every missing object got eleven HEADs in under a second, from the same client.', 'In the access log, the eleven HEADs for one missing key arrive a few milliseconds apart, all answered 404. That looks like a client trying again.'],
		detail: ['We also noticed the job runs far slower than it should, which makes sense if every check is eleven requests.', 'The retry configuration came from a service that talks to an API where a 404 can be temporary.'],
		options: 'On your side: take 404 out of the retried statuses and add backoff for the statuses that stay. Or skip the checks altogether by listing the prefix once.',
		reaction: 'So we have been hammering you with our own retries. Sorry about that.',
		deskQ: ['Does the api do anything about clients like this?', 'The rate limiter would catch it at a higher volume. At this rate it is just waste.']
	},
	// Bucket names with dots
	{
		ask: ['Hostname mismatch for one bucket only', 'One of our buckets, {B}, fails certificate verification with the new client, while every other bucket works with the same client and settings.'],
		tried: 'We tried the new client with certificate checks relaxed on a test machine, and it works, so it is only the name check that fails.',
		checks: ['The certificate on the api tier was renewed in June and the chain is complete. A client with an old trust store would fail on every bucket, not one.', 'I tried virtual-host addressing for {B} from a test host with a current trust store: the name does not match the certificate. For a bucket without a dot, it does.'],
		detail: ['We also checked: the old SDK uses path-style addressing by default, which is why it works.', 'The bucket is named in client configurations we have published, so a new name is expensive for us.'],
		options: 'Either we add the bucket\'s full host name to the api certificate, which works but does not scale, or your client uses path-style addressing for this bucket, which works today. A new bucket without a dot is the long-term answer.',
		reaction: 'So the dot is the whole problem. We named that bucket years ago without a second thought.',
		deskQ: ['How many buckets have dots in their names?', 'Eleven. New ones cannot be created with dots since last year.']
	},
	// One api host with a slow clock
	{
		ask: ['Requests turned away for time skew, then accepted when sent again', 'A share of our requests to {B} answers 403 RequestTimeTooSkewed, and the same request sent again a second later goes through.'],
		tried: 'We synchronised our clocks again and checked them against two different time servers. They agree to the millisecond.',
		checks: ['I checked the server times in the error bodies against our hosts: all the errors came from one api host, and its clock is sixteen minutes slow.', 'The other api hosts are within a few milliseconds of each other. Only api-05 is off, and it was rebuilt on Wednesday.'],
		detail: ['We also noticed that sending the request again almost always works, which made us think of a load balancer picking different hosts.', 'Our hosts synchronise against the same time servers as yours, as far as we know.'],
		options: 'Fix the clock on that host and in the image it was built from, and add an alert on clock offset so a drifting host is caught before tenants notice.',
		reaction: 'So it was one host. That explains the one in ten.',
		deskQ: ['Why did the image lose time sync?', 'The new image moved to a different time daemon and its service was not enabled. Easy to miss.']
	},
	// EU residency
	{
		ask: ['Which zones hold the objects of {B}?', 'We need to tell a customer exactly where their data in {B} is stored. Could the desk tell us which zones hold its objects?'],
		tried: 'We looked at the bucket settings page, which shows no region at all for this bucket, unlike our newer ones.',
		checks: ['The index records for a sample of fragments match where they really are; I checked a dozen against the storage hosts. The report is accurate.', 'The placement policy of {B} has no region constraint at all. Buckets from the old provisioning tool often lack one.'],
		detail: ['We also checked our newer buckets: they all show the EU constraint in their settings.', 'The contract with the customer is due for signature at the end of the month.'],
		options: 'Either we set the EU constraint on {B} and move the fragments outside the EU in the background, which takes a few weeks, or you put the customer\'s data in a new bucket created with the constraint. The second is immediate.',
		reaction: 'So the bucket was never what we thought it was. Good to know before we signed anything.',
		deskQ: ['How many buckets from the old tool lack a region?', 'About sixty. I will send their owners a note.']
	},
	// Write-through after a kernel update
	{
		ask: ['Single uploads much slower since October', 'One large upload to {B} used to take about ten minutes and now takes thirty. We see the same on every upload host.'],
		tried: 'We tried uploads from a different upload host and over a different network path. Same ceiling, about 80 MB/s per upload.',
		checks: ['The api passes uploads through at full speed; I measured it with a test upload that stops at the api. The slowdown is on the storage hosts.', 'Write latency on the storage hosts tripled on the 19th, on all hosts on the same day. That was the day the kernel update was rolled out.'],
		detail: ['We also noticed small uploads are hardly affected; it is the big ones that suffer.', 'Our upload hosts were not touched in October; we checked their change log.'],
		options: 'The controller cache has to go back to write-back mode on every storage host, and the setting has to be pinned so a kernel update cannot reset it. It needs a reboot, so it goes into the next maintenance window.',
		reaction: 'So it was a kernel update on your side. Good to know it is not our network.',
		deskQ: ['Why did the kernel update change the controller setting?', 'The new driver reads the setting from a file the old one ignored, and that file said write-through.']
	}
];
if (extras.length !== topics.length) throw new Error(`extras has ${extras.length} entries for ${topics.length} topics`);
topics.forEach((topic, slot) => {
	const ask = extras[slot]!.ask;
	if (ask) topic.asks.push(ask);
});

// How each team uses Kestrel, as its people would explain it in a ticket.
const contexts: Record<string, string[]> = {
	photos: ['For context: the photo service keeps every original in photos-originals and writes three resized copies to photos-thumbs when a photo is uploaded. Reads outnumber writes about forty to one, almost all of them for thumbnails, and they come from the image proxy in front of the web and app clients.', 'Some background: the image proxy reads from Kestrel on every cache miss, and its cache holds about a day of thumbnails. Anything slower than usual on your side shows up in our page times within minutes.', 'Our service runs in two regions, and both read from the same buckets. The upload path is a separate service that writes the originals and queues the resizing.'],
	mobile: ['For context: the app sends photos, scans and voice notes through our upload gateway, which signs each request and sends the file straight to Kestrel. Users choose their own file names, and we keep them in the key so people can find their files again.', 'Some background: the gateway handles about two million uploads a day, mostly from phones on mobile networks. The app tries a failed upload up to three times, after which the user sees an error.', 'The gateway is a small Node service we wrote to keep the app thin. It talks to Kestrel for uploads only; reads go through a separate CDN path.'],
	warehouse: ['For context: the warehouse lands raw event files in wh-landing as they arrive from the producers, and a nightly job compacts each day into Parquet files in wh-parquet. Every downstream report reads from wh-parquet.', 'Some background: about 300 producers write into the landing bucket, each under its own prefix, and the loader runs every fifteen minutes to pick up what has arrived.', 'Our jobs run on the shared compute cluster and use the Python SDK with a configuration we keep in one place for all of them.'],
	logs: ['For context: the log archive ships the edge proxies\' logs into Kestrel every few minutes, one compressed file per proxy per hour, and keeps them for a year for the security team.', 'Some background: about forty edge proxies write into the archive, each under its own path. Reads are rare: a few searches a week, usually after an incident.', 'The shipper is a Go service that runs on every edge proxy. It buffers locally when Kestrel is slow, so problems show up as growing buffers before anything fails.'],
	ci: ['For context: the build cache stores build outputs by content hash, so the same output is only stored once. Every CI run checks the cache before it builds anything and writes what it built afterwards.', 'Some background: about 3,000 CI runs a day go through the cache, and a slow or failing cache makes every build slower for every team.', 'The cache server is a Go service in front of Kestrel; the CI runners talk to it, not to Kestrel directly.'],
	video: ['For context: the video pipeline uploads the master file of each episode into video-masters, transcodes it into several renditions and writes the segments into video-renditions for the players.', 'Some background: masters are between 20 and 120 GB, so every upload is a multipart upload, and an upload that fails late costs hours.', 'The pipeline is a set of Python workers on the transcoding cluster. They read masters from Kestrel and write the renditions back.'],
	ml: ['For context: the training platform reads datasets from ml-datasets in shards and writes checkpoints to ml-checkpoints during each run. A large run reads several terabytes and writes a checkpoint every hour.', 'Some background: up to 200 training workers read from Kestrel when a large job starts, and a slow read holds up the whole job.', 'Everything on our side uses the Python SDK through a small wrapper library the team maintains.'],
	billing: ['For context: billing writes the ledger exports and invoices into billing-exports every night, and a reconciliation job reads them back the next morning to check them against the ledger.', 'Some background: these files are records we are required to keep for seven years, and the auditors read them on request.', 'Our services are written in Java and run on a small set of job hosts the team manages itself.'],
	search: ['For context: search indexing writes a snapshot of each index into search-snapshots every night, and restores from it when a search node is rebuilt.', 'Some background: a snapshot is a few thousand segment files, and a restore reads all of them as fast as it can.', 'The snapshotter is a Java service; restores run from the search nodes themselves.'],
	mail: ['For context: mail stores every attachment in mail-attachments under a hash of its content, and the mail front end reads them when a message is opened.', 'Some background: there are about a billion attachments, most of them small, and the front end expects an attachment to open in well under a second.', 'The attachment service is written in Go and sits between the mail front end and Kestrel.'],
	maps: ['For context: the map tile service stores pre-rendered tiles in map-tiles.v2 and the style files in map-styles, and the tile server reads them for every map view that misses its cache.', 'Some background: the tile buckets hold about 400 million small files, and the tile server reads thousands of them a second at peak.', 'The tile server is a Node service; the web uploader for custom styles is newer and still being rolled out.']
};

// Parts shared by every ticket. Lists, not templates: each is picked from at random.
const areaIn: Record<Area, string> = { api: 'in the api tier', index: 'in the index', placement: 'in placement', storage: 'on the storage hosts', tenant: 'on your side' };
const openings = [
	'Not sure whether this is a fleet problem or ours, so starting here.',
	'We noticed this in our dashboards this week and could not explain it from our side.',
	'Following up on a chat thread from yesterday, so that it is written down.',
	'I asked in the storage channel and was told to open a ticket.',
	'First ticket from me here, so tell me if anything is missing.',
	'Opening this before the weekend so that it does not get lost.',
	'Our on-call picked this up overnight.',
	'This has been bothering us for a while.',
	'Raising this for the whole team; I am the contact for now.',
	'We spent a day on this before deciding it was worth asking you.'
];
const impacts: Record<Kind, string[]> = {
	error: ['Until it is sorted, someone on the team deals with the failures by hand.', 'Users have noticed, and our support channel has had a few complaints.', 'It blocks the migration we planned for the end of the month.'],
	flaky: ['For now we retry and it mostly works, but our error budget for the quarter is nearly gone.', 'Our on-call gets paged for it about twice a week.', 'Users have noticed, and our support channel has had a few complaints.'],
	slow: ['Nothing fails, but it is slow enough that users have noticed.', 'The run now overlaps with the morning jobs.', 'The front-end team has asked us twice what changed.', 'It is not urgent, but it gets a little worse every week.'],
	wrong: ['Nothing is failing, but we cannot trust the numbers.', 'Finance wants an answer before the next close.', 'It costs someone on the team half a day a week to reconcile.', 'It is not urgent, but it makes our nightly report unreliable.'],
	request: ['There is no rush, but we would like an answer this quarter.', 'We can wait a few weeks, but we need an answer to plan around.', 'If this is not possible, a clear no would help us too.']
};
const closings = ['Happy to get on a call if that is quicker.', 'Request IDs and timestamps available, just ask.', 'Thanks in advance.', 'Let me know what else you need from us.', '{MATE} can answer for us while I am out next week.', 'I am in Berlin time, so replies may come late in your day.'];
const acks = ['Thanks, picking this up.', 'Got it. I have the desk this week, so this one is mine.', 'Thanks for the detail, it helps.', 'Looking at this now.', 'Taking this one.', 'Thanks for raising it. A question first.', 'Morning. I will take this.'];
const triage = ['Thanks. {A} will take this; I have put it at the top of the desk list.', 'Assigning this to {A}, who knows this area best.', 'Seen. {A} is on the desk this week and will pick it up.'];
const opsIntro = ['From the access logs, around the time you mention:', 'What we see on our side for {B}:', 'Our logs for the same window:', 'For reference, from our side:'];
const artIntro = ['Pasted below:', 'Here is what we see:', 'For reference:', 'From our logs:', 'From this morning:', 'An excerpt:', 'From our side:'];
const suspectLeads = ['Jumping in, since I was on call when this started.', 'I had a look as well.', 'A first theory, not confirmed yet.', 'Quick thought before {A} gets further.', 'I think I know what this is.'];
const suspectTails = ['I will confirm tomorrow.', 'Will report back once I have checked.', '', 'If that is it, the fix is on us.'];
const suspectReplies = ['Thanks, that would fit with what we see.', 'Makes sense. Let us know.', 'Interesting. We will wait for the confirmation before changing anything.'];
const diagLeads = ['Found it.', 'Here is what is going on.', 'Got to the bottom of this.', 'Spent the morning on this, and the picture is clear now.', 'Update after going through the logs.'];
const correctionLeads = ['Correction to what was said above: the cause is not {SA}.', 'We chased the idea that it was {SA} for a day, and it was a dead end.', 'The theory that the trouble was {SA} did not survive a closer look.', 'I owe you a correction: nothing is wrong {SA}.'];
const mateLeads = ['Adding some background for whoever picks this up.', 'Some context from my side, in case it helps.', 'Chiming in from the same team.'];
const checkLeads = ['Progress so far.', 'What I have so far:', 'A first look at our side.', 'Some findings, not the whole picture yet.', ''];
const detailLeads = ['One more thing.', 'Adding to the above.', 'Something we noticed since.', ''];
const optionLeads = ['As for what to do about it:', 'The ways out, as I see them.', 'Where this leaves us.', ''];
const etaAsks = ['Any update? We have a review on Thursday and I would like to say something about this.', 'Is there an estimate yet? Even a rough one helps us plan.', 'Just checking this has not dropped off the list.'];
const etaAnswers = ['Still on it; nothing to report beyond what is above.', 'Not forgotten. I expect to know more by the end of the week.', 'It is next on my list after an incident from last night.'];
const tangents = ['Side note for anyone following: the staging endpoint was rebuilt on Tuesday, so test buckets there are empty.', 'Unrelated, but please use the new ticket form next time; it asks for request IDs up front.', 'Small aside: our access logs only go back fourteen days, so older request IDs are gone.', 'For the record, the desk rota changes next week. {C} has the context if I am not around.', 'Sorry for the slow reply, it has been a busy week on the desk.'];
const handovers = ['Handing this to {C}; I am on leave from tomorrow. Everything I know is above.', 'Passing this to {C}, who is on the desk next week. Context is all in the thread.'];
const metoos = ['{OTHER} from {OTHERTEAM} here. We may be seeing something similar on {B2}; following this ticket.', '{OTHERTEAM} here ({OTHER}). Possibly the same on {B2}, though less often. Watching this.'];
const metooReplies = ['Thanks. If yours turns out to be different, please open a ticket of its own and I will link them.', 'Noted. I will check {B2} as well while I am looking.'];
const fleetQuestions: [string, string[]][] = [
	['Does this affect our other buckets as well?', ['We checked your other buckets and see nothing like it there.', 'Only {B} shows it in the logs, as far as we can tell.']],
	['Is anything needed from us in the meantime?', ['Nothing for now. We will update this ticket.', 'No, thanks. The next step is ours.']]
];
const tenantQuestions: [string, string[]][] = [
	['Is there anything in the documentation we should have read?', ['It is in the client guide, but not where anyone would look first. I have asked for it to be moved up.', 'There is a paragraph on it in the client guide. Not your fault for missing it; it is well hidden.']],
	['Thanks. Are other teams doing the same thing?', ['One or two, from what we see in the logs. We will mention it in the next storage newsletter.', 'A few. You are the first to ask, though.']]
];
const oursLeads = ['Fixed.', 'This is done.', 'Good news.', 'Update:', 'The change is out.'];
const confirmFrames = ['Confirmed on our side. {CONF}', '{CONF} Thanks for chasing it.', 'Looks good from here. {CONF}', 'We watched it for a few days. {CONF} Thank you.'];
const reopenLeads = ['Reopening, sorry.', 'Bad news, I am afraid.', 'Not quite there.'];
const reopenReplies = ['Confirmed, and sorry. The change covered the case we reproduced, and yours goes down a path it missed. It is back with us; I will update this when the follow-up is out.', 'You are right, it is not fixed. We found a second cause behind the same symptom. Back on our list, no date yet.', 'Looked at it: same cause, on hosts the change had not reached. Finishing the rollout is on us; I will post here when it is done.'];
const theirsLeads = ['Update from our side.', 'We fixed it on our end.', 'Closing the loop.', 'Done on our side.'];
const theirsAcks = ['Thanks for letting us know. Nothing left on our side, then.', 'Good to hear. I will add a note to the client guide so the next team finds this faster.', 'Great. Glad it was quick in the end.'];
const waLeads = ['We talked it through on a call today.', 'Where we landed for now:', 'Short-term answer, agreed with {A}:'];
const noFixTheirs = ['Fine by us. The proper fix is still the one above, whenever you get to it.', 'That works. Nothing more for us to do here.', 'OK. When you have time, the change described above is the cleaner answer.'];
const noFix = ['A proper fix is not planned this quarter; if that changes I will say so here.', 'There is no date for a real fix. The workaround is what we have.', 'We will look at a real fix in the new year\'s planning, not before.'];
const waAccepts = ['Fine for now.', 'Not ideal, but we can live with it.', 'OK. We will keep the workaround and stop chasing.'];
const laterFix = ['Following up: the proper fix went out after all.', 'An update nobody expected: this got fixed properly.'];
const dropWa = ['You can drop the workaround whenever it suits you.', 'The workaround is no longer needed, though it does no harm.'];
const declineLeads = ['We discussed this at the desk meeting.', 'I have to say no on this one.', 'Answer from the desk:'];
const declineAcks = ['Understood. We will handle it on our side.', 'Not the answer we hoped for, but it is clear.', 'Fair enough. Thanks for the explanation.'];
const bumps = ['Any news on this?', 'Bumping this. We cannot do more until we hear back.', 'Checking in again. I will leave this open, but it is with you.', 'No reply for a few weeks. Leaving it open until you have had a chance to try.'];
const notYet = ['Sorry, it is on our list; we have not had time yet.', 'Not yet, apologies. Next week, hopefully.'];
const lateAnswers = ['Sorry for the silence. We tried it, and it works.', 'Finally got to it. It works.'];
const rolledOut = ['Thanks. Rolled out to production on {D}.', 'Good. It went to production on {D}.'];
const waitUsReplies = ['Understood. Please update this when it is out.', 'OK, we will keep going as we are until then.', 'Thanks. Is there anything we can do to help it along?'];
const waitUsBumps: [string, string][] = [['Any news on this?', 'Not yet; still planned as above.'], ['Is this still on track?', 'Still on the plan above. Nothing has moved.']];

// Pasted output.
const opMethod: Record<Op, string> = { PUT: 'PUT', GET: 'GET', HEAD: 'HEAD', LIST: 'GET', COMPLETE: 'POST', COPY: 'PUT', CREATE: 'PUT', OPTIONS: 'OPTIONS' };
const sdkOp: Record<Op, string> = { PUT: 'PutObject', GET: 'GetObject', HEAD: 'HeadObject', LIST: 'ListObjectsV2', COMPLETE: 'CompleteMultipartUpload', COPY: 'CopyObject', CREATE: 'CreateBucket', OPTIONS: 'PutObject' };
const pyCall: Record<Op, string> = { PUT: 'put_object(Bucket=bucket, Key=key, Body=body)', GET: 'get_object(Bucket=bucket, Key=key)', HEAD: 'head_object(Bucket=bucket, Key=key)', LIST: 'list_objects_v2(Bucket=bucket, Prefix=prefix, ContinuationToken=token)', COMPLETE: 'complete_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id, MultipartUpload=parts)', COPY: 'copy_object(Bucket=bucket, Key=dest, CopySource=source)', CREATE: 'create_bucket(Bucket=name)', OPTIONS: 'put_object(Bucket=bucket, Key=key, Body=body)' };
const reasons: Record<number, string> = { 200: 'OK', 206: 'Partial Content', 400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error', 503: 'Service Unavailable', 504: 'Gateway Timeout' };
const messages: Record<string, string> = {
	SignatureDoesNotMatch: 'The request signature we calculated does not match the signature you provided.',
	SlowDown: 'Please reduce your request rate.',
	InternalError: 'We encountered an internal error. Please try again.',
	ServiceUnavailable: 'Please try again later.',
	RequestTimeTooSkewed: 'The difference between the request time and the server\'s time is too large.',
	AccessForbidden: 'CORSResponse: This CORS request is not allowed.',
	GatewayTimeout: 'The gateway did not receive a timely response from the upstream server.',
	NoSuchKey: 'The specified key does not exist.'
};
const objectFor = (c: Ctx, failing = false): string => {
	const { r, team, date, topic } = c;
	const fits = (key: string) => (!topic.keyLike || topic.keyLike.test(key)) && (!failing || !topic.failsFor || topic.failsFor(key));
	let key = team.object(r, date);
	for (let i = 0; i < 20 && !fits(key); i++) key = team.object(r, date);
	return failing && topic.failsFor && !topic.failsFor(key) ? key.replace(/\/([^/]*)$/, '/old copy $1') : key;
};
const fillRaw = (text: string, c: Ctx, key: string) => text.replace(/\{B\}/g, c.bucket).replace(/\{KEY\}/g, key).replace(/\{H1\}/g, hex(c.r, 16)).replace(/\{H2\}/g, hex(c.r, 16));

const tracePaste = (c: Ctx): string => {
	const { r, team, bucket, date, topic } = c;
	const key = objectFor(c, true);
	const time = clock(r);
	const stamp = `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}Z`;
	const rid = hex(r, 16).toUpperCase();
	const encoded = key.replace(/ /g, '%20');
	const path = topic.op === 'LIST' ? `/${bucket}?list-type=2&prefix=${encodeURIComponent(key.split('/').slice(0, 2).join('/') + '/')}` : topic.op === 'COMPLETE' ? `/${bucket}/${encoded}?uploadId=${hex(r, 32)}` : topic.op === 'CREATE' ? `/${bucket}-${hex(r, 6)}` : `/${bucket}/${encoded}`;
	const out = [`> ${opMethod[topic.op]} ${path} HTTP/1.1`, '> Host: storage.kestrel.internal', `> User-Agent: ${team.agent}`];
	if (topic.op !== 'OPTIONS') {
		out.push(`> x-amz-date: ${stamp}`, `> x-amz-content-sha256: ${topic.op === 'PUT' ? hex(r, 64) : 'UNSIGNED-PAYLOAD'}`);
		out.push(`> Authorization: AWS4-HMAC-SHA256 Credential=KSTK${hex(r, 12).toUpperCase()}/${stamp.slice(0, 8)}/kestrel/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${hex(r, 64)}`);
	}
	for (const header of topic.headers ?? []) out.push(`> ${fillRaw(header, c, key)}`);
	if (topic.op === 'PUT' || topic.op === 'COMPLETE') out.push(`> Content-Length: ${topic.op === 'PUT' ? int(r, 20000, 9000000) : int(r, 90000, 900000)}`);
	out.push('>');
	const [status, code] = topic.error ?? [200, ''];
	const shown = status === 404 && topic.op === 'HEAD' ? 200 : status;
	out.push(`< HTTP/1.1 ${shown} ${reasons[shown]}`, `< Date: ${httpDate(date, time)}`, `< x-kestrel-request-id: ${rid}`, '< Server: kestrel-api');
	if (code && shown !== 200) {
		out.push('< Content-Type: application/xml', '<', '<?xml version="1.0" encoding="UTF-8"?>', `<Error><Code>${code}</Code><Message>${messages[code]}</Message><Resource>${path.split('?')[0]}</Resource><RequestId>${rid}</RequestId></Error>`);
	} else {
		const length = topic.op === 'LIST' ? int(r, 20000, 300000) : int(r, 2000, 900000000);
		out.push(`< Content-Length: ${length}`, `< ETag: "${hex(r, 32)}"`, `< Last-Modified: ${httpDate(addDays(date, -int(r, 0, 200)), clock(r))}`, '<');
	}
	return '```text\n' + (r() < 0.5 ? `$ curl -sv ${topic.op === 'GET' ? '' : `-X ${opMethod[topic.op]} `}"https://storage.kestrel.internal${path}" -o /dev/null\n` : '') + out.join('\n') + '\n```';
};

const stackPaste = (c: Ctx): string => {
	const { r, team, topic, date } = c;
	const key = objectFor(c, true);
	const rid = hex(r, 16).toUpperCase();
	const [status, code] = topic.error ?? [0, ''];
	const custom = topic.stackError ? fillRaw(topic.stackError, c, key) : '';
	const op = sdkOp[topic.op];
	const line = () => int(r, 40, 420);
	if (team.client === 'python') {
		const [file, fn] = team.frames[int(r, 0, 1)]!.split(':') as [string, string];
		const message = custom ? (custom.includes(':') && /^[A-Z]\w+Error/.test(custom) ? custom : `${team.svc.replace(/-/g, '_')}.errors.CheckFailed: ${custom}`) : `botocore.exceptions.ClientError: An error occurred (${code}) when calling the ${op} operation${status >= 500 ? ' (reached max retries: 4)' : ''}: ${messages[code]}`;
		const frames = ['Traceback (most recent call last):', `  File "/srv/${team.svc}/${team.svc.replace(/-/g, '_')}/cli.py", line ${line()}, in main`, `    ${pick(r, ['run(config)', 'job.run()', 'sys.exit(entry())'])}`, `  File "/srv/${team.svc}/${team.svc.replace(/-/g, '_')}/${file}", line ${line()}, in ${fn}`, `    resp = client.${pyCall[topic.op]}`];
		if (!custom) frames.push('  File "/opt/venv/lib/python3.11/site-packages/botocore/client.py", line 565, in _api_call', '    return self._make_api_call(operation_name, kwargs)', '  File "/opt/venv/lib/python3.11/site-packages/botocore/client.py", line 1021, in _make_api_call', '    raise error_class(parsed_response, operation_name)');
		return '```text\n' + [`${date} ${clock(r)},${pad(int(r, 0, 999), 3)} ERROR ${team.svc}: ${op} failed for s3://${c.bucket}/${key}`, ...frames, message].join('\n') + '\n```';
	}
	if (team.client === 'java') {
		const head = custom ? (custom.startsWith('javax') ? custom : `app.${team.svc.replace(/-/g, '')}.CheckFailedException: ${custom}`) : `software.amazon.awssdk.services.s3.model.S3Exception: ${messages[code]} (Service: S3, Status Code: ${status}, Request ID: ${rid})`;
		const sdk = custom ? (custom.startsWith('javax') ? ['sun.security.ssl.Alert.createSSLException(Alert.java:131)', 'sun.security.ssl.TransportContext.fatal(TransportContext.java:378)', 'org.apache.http.conn.ssl.SSLConnectionSocketFactory.connectSocket(SSLConnectionSocketFactory.java:436)'] : []) : ['software.amazon.awssdk.core.internal.http.CombinedResponseHandler.handleErrorResponse(CombinedResponseHandler.java:125)', 'software.amazon.awssdk.core.internal.http.pipeline.stages.RetryableStage.execute(RetryableStage.java:73)', `software.amazon.awssdk.services.s3.DefaultS3Client.${op.charAt(0).toLowerCase() + op.slice(1)}(DefaultS3Client.java:${int(r, 4000, 9000)})`];
		const own = team.frames.map((frame) => frame.replace('{L}', String(line())));
		return '```text\n' + [`${date} ${clock(r)}.${pad(int(r, 0, 999), 3)} ERROR [${team.svc}-worker-${int(r, 1, 8)}] ${team.frames[0]!.split('(')[0]!.split('.').slice(0, -1).join('.')} - ${op} failed for ${key}`, head, ...[...sdk, ...own].map((frame) => `\tat ${frame}`)].join('\n') + '\n```';
	}
	if (team.client === 'go') {
		const lines: string[] = [];
		const attempts = custom ? 1 : int(r, 2, 4);
		let second = int(r, 0, 86000);
		const at = () => `${date.replace(/-/g, '/')} ${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}`;
		for (let i = 1; i <= attempts; i++) {
			const msg = custom || `operation error S3: ${op}, https response error StatusCode: ${status}, RequestID: ${hex(r, 16).toUpperCase()}, HostID: , api error ${code}: ${messages[code]}`;
			lines.push(`${at()} ${pick(r, team.frames)}: ${topic.op.toLowerCase()} s3://${c.bucket}/${key}: ${msg}`);
			second += int(r, 0, 2);
			if (i < attempts) lines.push(`${at()} ${team.frames[0]}: retrying in ${pick(r, ['200ms', '400ms', '800ms', '1.6s'])} (attempt ${i + 1} of ${attempts})`);
		}
		lines.push(`${at()} ${team.frames[0]}: giving up on ${key}`);
		return '```text\n' + lines.join('\n') + '\n```';
	}
	const head = custom ? `Error: ${custom}` : `${code}: ${messages[code]}`;
	const frames = custom ? [] : [`    at throwDefaultError (/srv/${team.svc}/node_modules/@smithy/smithy-client/dist-cjs/index.js:838:20)`, `    at de_${op}CommandError (/srv/${team.svc}/node_modules/@aws-sdk/client-s3/dist-cjs/index.js:${int(r, 4000, 9000)}:21)`];
	const own = team.frames.map((frame) => `    at ${frame}:${line()}:${int(r, 5, 40)}`);
	const meta = custom ? [] : ['  $fault: \'client\',', `  $metadata: { httpStatusCode: ${status}, requestId: '${rid}', attempts: ${status >= 500 ? 3 : 1}, totalRetryDelay: ${status >= 500 ? int(r, 200, 900) : 0} },`, `  Code: '${code}'`];
	return '```text\n' + [head, ...frames, ...own, ...(meta.length ? ['{', ...meta, '}'] : [])].join('\n') + '\n```';
};

const accessPaste = (c: Ctx): string => {
	const { r, team, bucket, date, topic } = c;
	const lines: string[] = [];
	let milli = int(r, 3600, 80000) * 1000;
	const failRate = topic.error ? 0.25 + r() * 0.35 : 0;
	for (let i = int(r, 5, 8); i > 0; i--) {
		milli += int(r, 30, 4000);
		const second = Math.floor(milli / 1000);
		const raw = objectFor(c);
		const failed = topic.failsFor ? topic.failsFor(raw) : r() < failRate;
		const status = failed ? (topic.accessFail ? topic.accessFail[0] : topic.error![0]) : topic.op === 'HEAD' && r() < 0.5 ? 404 : 200;
		const key = topic.op === 'LIST' ? '-' : raw.replace(/ /g, '%20');
		const host = failed && topic.failHosts ? pick(r, topic.failHosts) : `api-${pad(int(r, 1, 9))}`;
		const prefix = topic.op === 'LIST' ? ` prefix=${team.object(r, date).split('/').slice(0, 2).join('/')}/` : '';
		const ms = failed && topic.accessFail ? int(r, topic.accessFail[1], topic.accessFail[2]) : !failed && topic.accessMs ? int(r, topic.accessMs[0], topic.accessMs[1]) : topic.kind === 'slow' && !failed ? int(r, 60, 1400) : failed && status >= 500 ? int(r, 900, 3000) : int(r, 2, 40);
		const bytes = status >= 400 ? int(r, 180, 420) : topic.op === 'HEAD' ? 0 : int(r, 900, 9000000);
		lines.push(`${date}T${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}.${pad(milli % 1000, 3)}Z ${host} req=${hex(r, 16).toUpperCase()} tenant=${team.svc} bucket=${bucket} op=${sdkOp[topic.op]} key=${key}${prefix} status=${status} bytes=${bytes} ms=${ms}`);
	}
	return '```text\n' + lines.join('\n') + '\n```';
};

const latencyPaste = (c: Ctx): string => {
	const { r, date, topic } = c;
	const rows = [`| Day | Operation | Requests | p50 ms | p95 ms | p99 ms |`, '| --- | --- | ---: | ---: | ---: | ---: |'];
	const days = int(r, 6, 9);
	const turn = int(r, 2, days - 2);
	const base = r() * 15 + 4;
	for (let i = 0; i < days; i++) {
		const day = addDays(date, i - days + 1);
		const bad = topic.kind === 'slow' && i >= turn;
		const p50 = base * (0.9 + r() * 0.2) * (bad ? 1.1 : 1);
		const p95 = p50 * (2 + r()) * (bad ? 4 + r() * 3 : 1);
		const p99 = p95 * (1.6 + r()) * (bad ? 2 + r() * 2 : 1);
		rows.push(`| ${day} | ${sdkOp[topic.op]} | ${int(r, 200, 9000) * 100} | ${p50.toFixed(1)} | ${p95.toFixed(1)} | ${p99.toFixed(0)} |`);
	}
	return rows.join('\n');
};

const errorsPaste = (c: Ctx): string => {
	const { r, date, topic } = c;
	const [status] = topic.error ?? [500];
	const rows = [`| Hour (UTC), ${date} | Requests | 2xx | ${status} | Other |`, '| --- | ---: | ---: | ---: | ---: |'];
	const start = int(r, 0, 14);
	for (let h = start; h < start + int(r, 7, 11); h++) {
		const total = int(r, 40, 400) * 1000;
		const bad = r() < 0.4 ? int(r, 50, 2000) : int(r, 0, 20);
		const other = int(r, 0, 30);
		rows.push(`| ${pad(h)}:00 | ${thousands(total)} | ${thousands(total - bad - other)} | ${thousands(bad)} | ${other} |`);
	}
	return rows.join('\n');
};

const listingPaste = (c: Ctx): string => {
	const { r, team, bucket, date } = c;
	const sample = team.object(r, date);
	const prefix = sample.split('/').slice(0, 2).join('/') + '/';
	const count = int(r, 5, 8);
	const keys = Array.from({ length: count }, () => `${prefix}${team.object(r, date).split('/').slice(2).join('/') || hex(r, 12)}`).sort();
	const lines = [`$ s3cmd ls --recursive s3://${bucket}/${prefix} | tail -n ${count}`];
	for (const key of keys) lines.push(`${date} ${pad(int(r, 0, 23))}:${pad(int(r, 0, 59))}  ${String(int(r, 2000, 900000000)).padStart(10)}  s3://${bucket}/${key}`);
	return '```text\n' + lines.join('\n') + '\n```';
};

const paste = (c: Ctx, art: Art): string =>
	art === 'own' && c.topic.own ? c.topic.own(c) : art === 'trace' ? tracePaste(c) : art === 'stack' ? stackPaste(c) : art === 'latency' ? latencyPaste(c) : art === 'errors' ? errorsPaste(c) : art === 'listing' ? listingPaste(c) : accessPaste(c);

const fill = (text: string, values: Record<string, string>): string => cap(text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`));

const ticket = (index: number, topic: Topic, slot: number, variant: number, number: number, opened: string): string => {
	const r = mulberry32(0x4b534400 + index * 7919);
	const extra = extras[slot]!;
	const teamKey = topic.teams[(variant + slot) % topic.teams.length]!;
	const team = teams[teamKey]!;
	const bucket = topic.buckets ? topic.buckets[(variant + slot) % topic.buckets.length]! : pick(r, team.buckets);
	const ask = topic.asks[(variant + slot) % topic.asks.length]!;
	const [reporter, mate] = r() < 0.65 ? team.people : [team.people[1], team.people[0]];
	const people = shuffle(r, desk);
	let owner = people[0]!;
	const second = people[1]!;
	const third = people[2]!;
	const otherKey = pick(r, Object.keys(teams).filter((key) => key !== teamKey));
	const other = teams[otherKey]!;
	const ending = topic.endings[(variant * 2 + slot + int(r, 0, 1)) % topic.endings.length]!;
	const misled = topic.suspect !== undefined && r() < 0.6;
	const values: Record<string, string> = { B: bucket, TEAM: team.name, A: owner, C: third, MATE: mate, SA: misled ? areaIn[topic.suspect!.area] : '', OTHER: other.people[0], OTHERTEAM: other.label, B2: other.buckets[0]!, D: '' };
	const f = (text: string) => fill(text, values);
	const ctx = (date: string): Ctx => ({ r, team, bucket, date, topic });
	const facts = shuffle(r, topic.facts);
	const checks = r() < 0.5 ? extra.checks : ([extra.checks[1], extra.checks[0]] as const);
	const details = shuffle(r, extra.detail);
	// The tenant pastes what a client sees; the desk pastes its access logs and dashboards.
	const theirArts = topic.arts.filter((art) => art !== 'access');
	const ourArts: Art[] = ['access', 'access', ...topic.arts.filter((art) => art === 'latency' || art === 'errors')];
	const tenant = () => (r() < 0.7 ? reporter : mate);
	const lead_ = (leads: string[]) => pick(r, leads);

	const body: string[] = [];
	if (r() < 0.7) body.push(pick(r, openings));
	body.push(f(ask[1]));
	const order = shuffle(r, [0, 1, 2]);
	const shown = [order[0]!, ...(r() < 0.45 ? [order[1]!] : [])].sort();
	const background = contexts[teamKey]!;
	if (r() < 0.85) body.push(...shown.map((i) => background[i]!));
	const spare = background[order[2]!]!.replace(/^(For context|Some background): /, '');
	body.push(facts[0]!);
	if (r() < 0.8) body.push(f(extra.tried));
	if (r() < 0.6) body.push(`${pick(r, artIntro)}\n\n${paste(ctx(opened), theirArts[0] ?? 'trace')}`);
	body.push(pick(r, impacts[topic.kind]));
	if (r() < 0.6) body.push(f(pick(r, closings)));

	let date = opened;
	const comments: string[] = [];
	const say = (who: string, paragraphs: string[], low = 0, high = 3) => {
		date = addDays(date, int(r, low, high));
		if (date > EXPORT) date = EXPORT;
		comments.push(`**${who}** · ${date}\n\n${paragraphs.filter((p) => p.length > 0).join('\n\n')}`);
	};
	const room = (days: number) => addDays(date, days) <= EXPORT;
	const stamp = () => {
		const back = addDays(date, -int(r, 0, 1));
		values.D = prose(back < opened ? date : back);
	};

	// A teammate's addition, triage and the first question.
	if (r() < 0.45) say(mate, [pick(r, mateLeads), cap(spare), ...(facts[3] ? [facts[3]] : [])], 0, 1);
	if (r() < 0.2) say(lead, [f(pick(r, triage))], 0, 1);
	const opening = [pick(r, acks), f(topic.question)];
	if (r() < 0.25) opening.push(`${f(pick(r, opsIntro))}\n\n${accessPaste(ctx(date))}`);
	say(owner, opening, 0, 2);
	const reply = [f(topic.answer)];
	if (r() < 0.8) reply.push(paste(ctx(date), theirArts[1 % Math.max(1, theirArts.length)] ?? theirArts[0] ?? 'trace'));
	if (r() < 0.5) reply.push(facts[1]!);
	say(tenant(), reply);

	// A wrong first guess, put right later.
	if (misled) {
		say(second, [f(pick(r, suspectLeads)), f(pick(r, topic.suspect!.text)), pick(r, suspectTails)]);
		if (r() < 0.4) say(tenant(), [pick(r, suspectReplies)]);
	}

	// What the desk found on the way, and what the tenant noticed meanwhile.
	if (r() < 0.95) {
		const found = [lead_(checkLeads), f(checks[0])];
		if (r() < 0.45) found.push(paste(ctx(date), pick(r, ourArts)));
		say(owner, found, 1, 3);
	}
	if (r() < 0.85) say(tenant(), [lead_(detailLeads), f(details[0]!), ...(r() < 0.2 ? [paste(ctx(date), pick(r, theirArts.length ? theirArts : (['trace'] as Art[])))] : [])]);

	// The middle of the thread.
	const middle = r();
	if (middle < 0.2) {
		say(tenant(), [pick(r, etaAsks)], 2, 6);
		say(owner, [pick(r, etaAnswers)]);
	} else if (middle < 0.35) say(owner, [f(pick(r, tangents))]);
	else if (middle < 0.5) {
		say(owner, [f(pick(r, handovers))]);
		owner = third;
		values.A = third;
		values.C = people[3]!;
	} else if (middle < 0.65 && topic.kind !== 'request') {
		say(other.people[0], [f(pick(r, metoos))]);
		if (r() < 0.6) say(owner, [f(pick(r, metooReplies))]);
	}
	if (r() < 0.7) say(r() < 0.5 ? owner : second, [f(checks[1]), ...(r() < 0.3 ? [paste(ctx(date), pick(r, ourArts))] : [])], 1, 3);

	// The diagnosis.
	const diagnosis = [misled ? f(pick(r, correctionLeads)) : pick(r, diagLeads), f(pick(r, topic.finding))];
	if (r() < 0.5) diagnosis.push(`${pick(r, artIntro)}\n\n${paste(ctx(date), pick(r, ourArts))}`);
	if (r() < 0.5) diagnosis.push(facts[2] ?? facts[0]!);
	say(misled && r() < 0.5 ? second : owner, diagnosis, 1, 4);
	if (r() < 0.8) say(tenant(), [f(extra.reaction), ...(r() < 0.5 ? [f(details[1]!)] : [])]);
	if (r() < 0.65) {
		say(second === owner ? third : second, [f(extra.deskQ[0])]);
		say(owner, [f(extra.deskQ[1])], 0, 1);
	}
	if (ending !== 'declined' && r() < 0.75) say(owner, [lead_(optionLeads), f(extra.options)]);
	if (r() < 0.4) {
		const [question, answers] = pick(r, topic.cause === 'tenant' ? tenantQuestions : fleetQuestions);
		say(tenant(), [question]);
		say(owner, [f(pick(r, answers))]);
	}

	// How it ended.
	const confirm = () => say(tenant(), [fill(pick(r, confirmFrames), { CONF: topic.confirm })], 1, 4);
	if (ending === 'ours') {
		date = addDays(date, int(r, 1, 6));
		if (date > EXPORT) date = EXPORT;
		stamp();
		say(owner, [pick(r, oursLeads), f(topic.ours!)], 0, 0);
		if (r() < 0.75) confirm();
		if (topic.again && r() < 0.3 && room(10)) {
			say(tenant(), [pick(r, reopenLeads), topic.again], 5, 10);
			say(owner, [pick(r, reopenReplies)]);
		}
	} else if (ending === 'theirs') {
		say(tenant(), [pick(r, theirsLeads), f(topic.theirs!)], 1, 8);
		if (r() < 0.7) say(owner, [pick(r, theirsAcks)]);
	} else if (ending === 'workaround') {
		const [voice, text] = topic.workaround!;
		if (voice === 'them') {
			say(tenant(), [f(pick(r, waLeads)), f(text)], 1, 5);
			say(owner, [pick(r, topic.cause === 'tenant' ? noFixTheirs : noFix)]);
		} else {
			say(owner, [f(pick(r, waLeads)), f(text), pick(r, noFix)], 1, 5);
			if (r() < 0.6) say(tenant(), [pick(r, waAccepts)]);
		}
		if (topic.ours && r() < 0.3 && room(14)) {
			date = addDays(date, int(r, 10, 14));
			stamp();
			say(owner, [pick(r, laterFix), f(topic.ours), pick(r, dropWa)], 0, 0);
		}
	} else if (ending === 'declined') {
		say(tenant(), [f(topic.plea!)]);
		say(r() < 0.6 ? lead : owner, [pick(r, declineLeads), f(topic.declined!)], 1, 5);
		if (r() < 0.6) say(tenant(), [pick(r, declineAcks)]);
	} else if (ending === 'waitTenant') {
		say(owner, [f(topic.waitTenant!)], 1, 4);
		const count = int(r, 1, 3);
		for (let i = 0; i < count && room(9); i++) {
			say(i === 1 ? second : owner, [pick(r, bumps)], 9, 16);
			if (i === 0 && r() < 0.3) say(tenant(), [pick(r, notYet)], 1, 3);
		}
		if (r() < 0.25 && room(6)) {
			say(tenant(), [pick(r, lateAnswers), topic.confirm], 3, 6);
			if (topic.cause === 'tenant') say(owner, [pick(r, theirsAcks)]);
			else {
				date = addDays(date, int(r, 1, 3));
				if (date > EXPORT) date = EXPORT;
				stamp();
				say(owner, [f(pick(r, rolledOut))], 0, 0);
			}
		}
	} else {
		say(owner, [f(topic.waitUs!)], 1, 5);
		const replied = r() < 0.7 ? pick(r, waitUsReplies) : '';
		if (replied) {
			say(tenant(), [replied]);
			if (replied.endsWith('along?')) say(owner, ['Nothing for now, thanks.']);
		}
		if (r() < 0.3 && room(12)) {
			const [question, answer] = pick(r, waitUsBumps);
			say(tenant(), [question], 10, 14);
			say(owner, [answer]);
		}
	}

	const header = [`# KSD-${number}: ${f(ask[0])}`, `Raised by ${reporter} (${team.label}) on ${opened}`];
	return [...header, ...body, ...comments.map((comment) => `---\n\n${comment}`)].join('\n\n') + '\n';
};

const folder = join(root, 'docs', 'tickets');
mkdirSync(folder, { recursive: true });
const order = mulberry32(20261119);
const sequence = shuffle(order, topics.map((topic, slot) => ({ topic, slot })));
const END = addDays(START, SPAN);
const plan = Array.from({ length: ITEMS }, (_, index) => {
	const { topic, slot } = sequence[index % sequence.length]!;
	const from = topic.after && topic.after > START ? topic.after : START;
	const opened = addDays(from, int(order, 0, (Date.parse(END) - Date.parse(from)) / 86400000));
	return { index, topic, slot, variant: Math.floor(index / sequence.length), opened };
}).sort((a, b) => (a.opened < b.opened ? -1 : a.opened > b.opened ? 1 : a.index - b.index));
let number = 4100;
for (const { index, topic, slot, variant, opened } of plan) {
	number += int(order, 1, 6);
	const title = topic.asks[(variant + slot) % topic.asks.length]![0];
	const name = title.toLowerCase().replace(/\{b\}/g, 'bucket').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48).replace(/-$/, '');
	writeFileSync(join(folder, `KSD-${number}-${name}.md`), ticket(index, topic, slot, variant, number, opened));
}
writeFileSync(
	join(folder, 'README.md'),
	`# Storage desk tickets\n\nThe ${ITEMS} tickets that tenant teams raised with the storage desk between July and November 2026, one file\neach, exported from the old desk on 19 November with their threads as they stood. The export kept the text\nand the comments; it dropped the component, state, assignee and priority fields. Pasted output is as its\nwriter pasted it.\n`
);
