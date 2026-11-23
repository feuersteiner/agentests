// Writes the long material of this entry's long task 2L: the write-ups of the incidents the Relay on-call
// opened from August to mid-November 2026, one Markdown file each, under docs/incidents/. Deterministic:
// fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many incident write-ups to write. References, dates and recurrences all follow from it. */
const ITEMS = 126;

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
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, ',');
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const b36 = (r: Rand, length: number) => Array.from({ length }, () => 'bcdfghjklmnpqrstvwxz2456789'[int(r, 0, 26)]).join('');
const hhmm = (minutes: number) => {
	const m = ((minutes % 1440) + 1440) % 1440;
	return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

// Calendar. Day 0 is Monday 3 August 2026; the last incident is on day LAST, and nothing is dated after LIMIT.
const FIRST = Date.UTC(2026, 7, 3);
const LAST = 102;
const LIMIT = 108;
const dateOf = (day: number) => new Date(FIRST + day * 86_400_000);
const iso = (day: number) => dateOf(day).toISOString().slice(0, 10);
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const short = (day: number) => `${dateOf(day).getUTCDate()} ${monthNames[dateOf(day).getUTCMonth()]!.slice(0, 3)}`;
const weekday = (day: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateOf(day).getUTCDay()]!;

// People. The Relay team carries the pager; the others are the teams it works with.
const team = ['Nadia Brennan', 'Kofi Mensah', 'Ines Carvalho', 'Tomasz Wójcik', 'Ravi Iyer', 'Saoirse Doyle'];
const platform = ['Dmitri Volkov', 'Aoife Kearney', 'Lars Holm'];
const appTeam = ['Felix Amara', 'Hana Sato', 'Gideon Price'];
const support = ['Joanne Pryce', 'Malik Haddad', 'Esther Lund'];
const dba = ['Bea Lindgren', 'Omar Faruk'];
const first = (name: string) => name.split(' ')[0]!;
const customers = ['Halden Freight', 'Quayside Books', 'Larchmont Legal', 'Pebble & Pine', 'Cobalt Survey Co', 'Ferrous Labs', 'Mossgrove Clinics', 'Harrow Robotics', 'Wickham Grocers', 'Blue Heron Tours', 'Tarn Logistics', 'Orchard Lane Dental', 'Kittiwake Media', 'Brightwater Schools', 'Ashcombe Insurance', 'Redfern Architects', 'Saltire Energy', 'Lumen Ridge Hotels'];

// The Relay services, all built on relay-kit.
interface Service {
	up: string;
	up2: string;
	job: string;
	jobs: string;
	cached: string;
	info: string[];
}
const services: Record<string, Service> = {
	'relay-webhooks': {
		up: "the customers' endpoints",
		up2: 'the settings API',
		job: 'delivery',
		jobs: 'deliveries',
		cached: 'endpoint settings',
		info: ['INFO  delivered event={evt} endpoint=ep_{id} status=200 ms={ms}', 'INFO  accepted event={evt} workspace={ws}', 'INFO  delivered event={evt} endpoint=ep_{id} status=204 ms={ms}']
	},
	'relay-mailer': {
		up: 'the email provider',
		up2: 'the template store',
		job: 'email',
		jobs: 'emails',
		cached: 'templates',
		info: ['INFO  sent kind={kind} id=em_{id} ms={ms}', 'INFO  queued kind={kind} id=em_{id} workspace={ws}']
	},
	'relay-exports': {
		up: 'the object store',
		up2: 'the reporting replica',
		job: 'export',
		jobs: 'exports',
		cached: 'workspace metadata',
		info: ['INFO  export started id=ex_{id} workspace={ws} rows={rows}', 'INFO  export uploaded id=ex_{id} bytes={bytes}', 'INFO  link sent id=ex_{id} workspace={ws}']
	},
	'relay-billing-sync': {
		up: 'the billing provider',
		up2: 'the billing provider',
		job: 'sync',
		jobs: 'syncs',
		cached: 'plans and seat limits',
		info: ['INFO  GET /seats/{ws} 200 ms={ms}', 'INFO  sync ok workspace={ws} seats={n}', 'INFO  GET /plans 200 ms={ms}']
	},
	'relay-digest': {
		up: "the main app's API",
		up2: 'relay-mailer',
		job: 'digest',
		jobs: 'digests',
		cached: 'workspace settings',
		info: ['INFO  digest built workspace={ws} items={n}', 'INFO  digest handed to relay-mailer workspace={ws}']
	},
	'relay-audit': {
		up: 'the audit database',
		up2: 'the audit database',
		job: 'audit write',
		jobs: 'audit writes',
		cached: 'retention settings',
		info: ['INFO  POST /audit 201 ms={ms} request_id={rid}', 'INFO  write ok table=audit_events rows=1']
	}
};
const allServices = Object.keys(services);

// Red herrings: what the on-call suspected first. `name` is the suspect as the notes name it when it is
// blamed at stand-down and corrected later.
const checks: Record<string, string[]> = {
	deploy: ['The release went out to all pods within four minutes, and the error rate did not move when it did.', 'Release notes for it list a handful of changes, none near this.'],
	upstream: ['No incident on their status page for today.', 'Asked in our shared channel with them; they see nothing on their side.'],
	db: ['The slow query log for the last hour is empty.', 'Replication lag is under a second.'],
	node: ['Node conditions: no memory or disk pressure anywhere.', 'No node was replaced or rebooted today.'],
	traffic: ['No big customer started anything new today, according to support.', 'The mix of requests looks like any other day.'],
	queue: ['Queue length per pod goes up and down as jobs come and go.', 'Jobs are not piling up in any one pod.'],
	cache: ['The cache entries are fresh: the oldest was loaded {n1} minutes ago.', 'Cache hit rate is where it always is.'],
	server: ['No error responses from the server itself in the last hour, apart from the usual 404s.', 'In-flight requests per pod are at the usual handful.'],
	config: ['Compared the config on a pod with the repository: identical.', 'Nobody has a config change open for {svc}.'],
	memory: ['No pod is near its limit.', 'Garbage collection pauses are short and regular.'],
	dns: ['The resolver pods report no errors.', 'Lookups take a millisecond or two.'],
	bun: ['The Bun release notes mention nothing that touches this.', 'Other Bun services on the same patch release are fine.']
};
const context: Record<string, string[]> = {
	'relay-webhooks': ["relay-webhooks delivers the main app's events to the endpoints customers have registered, with one queue per endpoint.", 'For context: relay-webhooks takes events from the main app and delivers them to customer webhook endpoints.'],
	'relay-mailer': ["relay-mailer sends the main app's transactional email: invitations, password resets, invoices and receipts.", 'For context: relay-mailer turns send requests from the main app into email through the email provider.'],
	'relay-exports': ['relay-exports builds the CSV exports customers ask for, uploads them to the object store and emails a link.', 'For context: relay-exports reads from the reporting replica and writes export files to the object store.'],
	'relay-billing-sync': ["relay-billing-sync keeps plans and seat limits in step with the billing provider and answers the main app's seat lookups.", 'For context: relay-billing-sync is what the main app asks when it needs to know how many seats a workspace has.'],
	'relay-digest': ['relay-digest builds the daily digest email for each workspace and hands it to relay-mailer.', 'For context: relay-digest runs every morning at 07:00 and works through every workspace that has digests turned on.'],
	'relay-audit': ['relay-audit takes audit events from the main app and writes them to the audit database.', 'For context: relay-audit is the only writer to the audit database; customers read from it through the main app.']
};
const exchanges: [string, string, string][] = [
	['app', "Is this why the main app's dashboard shows errors from {svc}?", 'Yes, same thing. Nothing to do on your side for now.'],
	['sup', 'Can I tell {cust} it will be sorted today?', 'Not yet. Say we are on it and that you will update them within the hour.'],
	['plat', 'Do you need anything from platform?', 'Not so far. I will shout if it turns out to be the cluster.'],
	['app', 'Should we pause anything on our side?', 'No, carry on as normal for now.'],
	['sup', 'Two more tickets, both about {jobs}. Same thing?', 'Very likely. Hold them with the others.'],
	['plat', 'Seeing a lot of noise from {svc} in the cluster events. Yours?', 'Ours, yes. We are on it.'],
	['app', 'Anything I can look at from the app side?', 'Could you check whether the main app logged anything unusual towards {svc} in the last hour? (Later: nothing unusual on their side.)'],
	['sup', 'Is the status page up to date?', 'Updated it a few minutes ago.'],
	['db', 'Saw the channel. Anything you need from the database side?', 'Not at the moment, thanks.'],
	['plat', 'Want me to hold the platform change planned for tonight?', 'Yes please, until we know more.']
];

type HerringKey = 'deploy' | 'upstream' | 'db' | 'node' | 'traffic' | 'queue' | 'cache' | 'server' | 'config' | 'memory' | 'dns' | 'bun';
const herrings: Record<HerringKey, { suspect: string[]; clear: string[]; name: string }> = {
	deploy: {
		suspect: ['The last deploy of {svc} went out {n1} hours before this started. Checking what was in it.', 'First thing to rule out is the release from this morning. Diffing it against the one before.', 'There was a release of {svc} yesterday afternoon. Looking at it before anything else.'],
		clear: ['Nothing in that release goes near this. Rolled it back anyway to be sure; no difference, so rolled forward again.', 'The release is small and touches nothing near this. Put one pod back on the previous image to compare; it behaves exactly like the others.', 'Rolled back to the previous release. Same picture ten minutes later, so it is not the release. Rolled forward again.'],
		name: 'something in the last release'
	},
	upstream: {
		suspect: ['First suspect is {up}. Checking their status page and our error rates to them.', 'Could be {up}. Looking at how our calls to them are doing.', 'Asking the obvious question first: is {up} having a bad night?'],
		clear: ['{Up} looks healthy: status page green, our calls to them answer in the usual time, and their error rate has not moved. Not them.', 'Calls to {up} are fine: normal latency, no more failures than yesterday. Crossing them off.', 'Nothing wrong at {up} as far as our side can see. Response times and error counts match last week.'],
		name: 'a problem at {up}'
	},
	db: {
		suspect: ['Database connections from {svc} are at {n2}0 against a usual {n2}. Asked {db} to take a look.', 'The database dashboard shows a bump in CPU at about the right time. Pinging {db}.', 'Checking the database, since half of what {svc} does goes through it.'],
		clear: ['{db} says the database is fine: the connection count follows our pod count, which went up with the restarts. Effect, not cause.', '{db} looked: the CPU bump is the nightly statistics job, same as every night. Not related.', 'Query times are normal and nothing is waiting on locks. Not the database.'],
		name: 'the database'
	},
	node: {
		suspect: ['Checking whether the affected pods share a node.', 'Maybe a bad node. Listing where the pods run.'],
		clear: ['They do not: spread over three nodes in three zones. Not a node problem.', 'Each pod is on a different node, and none of the nodes reports any pressure. Not that.', 'Different nodes, different zones, same behaviour. Moving on.'],
		name: 'a bad node'
	},
	traffic: {
		suspect: ['Is this load? Checking the intake rate.', 'Could be a traffic spike. Pulling up the request rate for the last six hours.'],
		clear: ['Intake is ordinary for a {weekday}: about {n2}0 a minute, the same as last week. No spike.', 'Request rate is flat all evening. Whatever this is, it is not more traffic.', 'Traffic is a little below normal if anything. Not load.'],
		name: 'a spike in traffic'
	},
	queue: {
		suspect: ['The backlog keeps growing, so my first thought is the relay-kit queue: jobs stuck, or the queue not starting the next one.', 'Is the queue stuck? Everything {svc} does goes through relay-kit\'s JobQueue, so that is my first suspect.', 'Backlog climbing, nothing obviously broken: suspecting the JobQueue in {svc}.'],
		clear: ['Ruled out: the queue is moving. The log shows one job ending and the next starting every second or so. Whatever is wrong is inside the jobs, not between them.', 'Not the queue. Jobs start and finish at the usual pace; they just do not succeed.', 'The queue is fine: jobs come out of it as fast as ever. The problem is what happens to them afterwards.'],
		name: 'the relay-kit queue'
	},
	cache: {
		suspect: ['Could this be a stale cache entry? {svc} keeps {cached} in a RefreshingCache.', 'Thinking about the cache: if an old value were stuck in it, this is what we would see.', 'One idea: the {cached} in the cache are out of date.'],
		clear: ['Restarted one pod to empty its cache. The new pod shows the same thing from its first request, so the cache is not it.', 'The cached values match the source exactly. Not the cache.', 'Compared what the cache holds with what the source returns: identical. Crossing off the cache.'],
		name: 'a stale cache entry'
	},
	server: {
		suspect: ['All Relay services share relay-kit\'s server, so I looked there first: are requests reaching the handler at all?', 'Checking whether the intake server is losing requests.', 'Is relay-kit\'s server turning requests away? Looking at the access log.'],
		clear: ['They are. The access log has every request, answered by the handler, with the usual statuses. The server is not losing anything.', 'Every request the load balancer sent shows up in our access log with an answer. Not the server.', 'The server is answering everything it gets, in a few milliseconds. Moving on.'],
		name: 'relay-kit\'s server'
	},
	config: {
		suspect: ['Was relay.config.json changed? Checking the config history.', 'Looking at recent config changes for {svc}.'],
		clear: ['The last config change was {n1} days ago, a log level. Not that.', 'Nothing in the config history for {svc} lines up with this.', 'The config on the pods matches the repository, and nobody has changed it since well before this started.'],
		name: 'a config change'
	},
	memory: {
		suspect: ['Memory is high on two pods. A leak from the Bun upgrade last week?', 'The memory graph has a slope I do not like. Checking whether the new image leaks.'],
		clear: ['Ran last week\'s image on one pod for an hour: memory moves the same way. Whatever this is, the upgrade did not bring it.', 'Memory looks the same as the week before the upgrade. A distraction.', 'Heap is stable once you look past the restarts. Not memory.'],
		name: 'a leak from the Bun upgrade'
	},
	dns: {
		suspect: ['Checking name resolution from inside a pod.', 'Ruling out DNS, since it is always DNS until it is not.'],
		clear: ['Resolves fine, every time, from every pod I tried.', 'Two thousand lookups from a pod, no failures. Not DNS.', 'Names resolve quickly and correctly. Moving on.'],
		name: 'name resolution'
	},
	bun: {
		suspect: ['The pods moved to a new Bun patch release on Monday. Could be that.', 'New Bun release in the image this week. Worth ruling out.'],
		clear: ['Built yesterday\'s image with the old Bun and put it on one pod: same behaviour. Not Bun.', 'One pod on the old Bun release for half an hour behaves exactly like the rest. Not the runtime.'],
		name: 'the new Bun release'
	}
};

type Owner = 'team' | 'platform' | 'app' | 'support' | 'db';
interface Follow {
	text: string;
	short: string;
	owner: Owner;
}
type Shape = 'flat' | 'rise' | 'step' | 'spike' | 'blip' | 'saw';
interface Metric {
	label: string;
	base: number;
	peak: number;
	shape: Shape;
}
type Kube = 'crash' | 'oom' | 'restarts' | 'single' | 'terminating' | 'notready';
interface Art {
	alert?: [string, string];
	log?: string[];
	trace?: string[];
	metric?: Metric[];
	days?: boolean;
	kube?: Kube;
	raw?: string[];
	diff?: string[];
}
interface Topic {
	/** Where the cause lay. For the reader of this file only: never written to the material. */
	module: 'queue' | 'server' | 'cache' | 'watcher' | 'duration' | 'outside' | 'unknown';
	services: string[];
	/** Slots that depend on the service. */
	vars?: Record<string, Record<string, string>>;
	/** Slot sets of which each item takes one. */
	choose?: Record<string, string>[];
	/** Side observations, of which each item takes one or two among the steps. */
	detail: string[];
	/** No customer saw this incident. */
	quiet?: boolean;
	titles: string[];
	saw: string[];
	herrings: HerringKey[];
	/** The notes that lead to the cause, in order; each step has one or more phrasings. */
	steps: string[][];
	found: string[];
	fix: string[];
	/** What stopped the incident before its cause was known. Topics with it can be solved later or corrected. */
	calm?: string[];
	/** A last note, for topics whose cause was never found. */
	coda?: string[];
	/** The hours (UTC) within which the incident starts, when the story needs it. */
	hours?: [number, number];
	follow: Follow[];
	art: Art;
}

const topics: Topic[] = [
	// The queue.
	{
		module: 'queue',
		services: ['relay-mailer', 'relay-digest', 'relay-audit'],
		vars: {
			'relay-mailer': { err: "TypeError: undefined is not an object (evaluating 'user.email')", bad: 'an invitation for a user who was deleted between the invite and the send', file: 'invitation' },
			'relay-digest': { err: 'RangeError: Invalid time zone specified: Europe/Lisbon ', bad: 'the digest of a workspace whose time zone was saved with a trailing space', file: 'digest' },
			'relay-audit': { err: 'SyntaxError: JSON Parse error: Unexpected EOF', bad: 'an audit event with an empty body, sent by an old version of the desktop client', file: 'write' }
		},
		detail: ["The restarts follow {job} volume: fewer in the quiet hours, more at the peak. Each pod survives between four and eleven minutes.", "Counted from the logs: {n6} {jobs} accepted by pods that then exited before handing them on.", "The intake keeps accepting work while the pods restart, so the main app sees nothing wrong from its side.", "Every restart writes the same last log line before the trace: the id of the {job} being handled."],
		titles: ['{svc} pods restarting every few minutes', '{Jobs} going missing while {svc} restarts', 'Crash loop in {svc} overnight'],
		saw: [
			'The pager went off for pod restarts in {svc}. Each pod came up, worked through a few hundred {jobs} and then exited with code 1. Every exit threw away what was still queued in that pod, so {jobs} the main app had already handed over were simply gone.',
			'{sup} from support passed on {n1} customers, {cust} among them, who had received no {jobs} since early morning. The dashboard showed {svc} pods restarting every few minutes and a backlog that fell to zero after each restart and then climbed again.'
		],
		herrings: ['upstream', 'deploy', 'memory', 'db', 'bun'],
		steps: [
			['Exit code is 1 every time, not 137, so this is not the memory limit. The last thing each pod logs before it exits is the same stack trace.', 'These are not OOM kills: exit code 1, and the same trace at the end of every pod\'s log.'],
			['The trace runs through the relay-kit queue, but the error itself is ours: `{err}`, thrown inside the {job} job. One {job} in a few thousand fails like this, and the whole pod goes down with it.'],
			['Read the queue code to see why one failed job takes the process with it. The queue catches the error and emits it as an `error` event. Nothing in {svc} listens for `error`, and an EventEmitter that emits `error` with no listener throws it again. Nobody catches that, and Bun exits.', 'Why would one failed job end the process? JobQueue hands a job\'s error to its `error` event. {svc} never registered a listener, and with no listener the emitter throws instead, outside anything that could catch it.'],
			['Found the {job} that keeps coming back: {bad}. The main app re-sends it after every restart, so each fresh pod meets it within minutes.']
		],
		found: [
			'Cause: {svc} creates its JobQueue without an `error` listener. The first {job} that throws becomes an unhandled error, the process exits, and every queued {job} goes with it. Nothing upstream was involved.',
			'So it comes down to a missing `error` listener on the queue in {svc}. relay-kit passes the failure to the `error` event, as its comment says; with nobody listening, the throw ends the process.'
		],
		fix: [
			'Hotfix out at {fixat}: the queue now has an `error` listener that logs the failure with the {job} id and moves on. No restarts for half an hour and the backlog is back to normal.',
			'Removed the bad {job} from the main app\'s retry list by hand, then shipped the listener an hour later. A failing {job} is now logged and skipped while the rest carry on.'
		],
		calm: ['Asked {app} to pause the main app\'s re-sends to {svc}. With nothing new arriving, the pods stopped restarting. Leaving it like that for the night.'],
		follow: [
			{ text: 'Add an `error` listener to every JobQueue in the other Relay services', short: 'the listener sweep', owner: 'team' },
			{ text: 'Page on more than three restarts of a Relay pod in ten minutes', short: 'the restart alert', owner: 'team' },
			{ text: 'Find out why the main app re-sends a failing {job} without any limit', short: 'the re-send question', owner: 'app' },
			{ text: 'Runbook entry on finding and removing a {job} that crashes the service', short: 'the runbook entry', owner: 'team' }
		],
		art: {
			metric: [{ label: 'Restarts in the interval', base: 0, peak: 6, shape: 'step' }, { label: 'Queued {jobs}', base: 30, peak: 1400, shape: 'saw' }],
			alert: ['RelayPodRestarts', '{svc} pods restarted {n1} times in 10 minutes'],
			trace: ['{err}', '      at build (/app/src/jobs/{file}.ts:{L}:{C})', '      at <anonymous> (/app/src/jobs/{file}.ts:{L}:{C})', '      at #run (/app/node_modules/relay-kit/src/queue.ts:24:11)', '      at enqueue (/app/node_modules/relay-kit/src/queue.ts:17:33)', '      at intake (/app/src/intake.ts:{L}:{C})'],
			kube: 'crash'
		}
	},
	{
		module: 'queue',
		services: ['relay-exports'],
		hours: [9, 14],
		detail: ["The median export this month is 1,800 rows and takes under a minute. The three biggest workspaces account for almost all of the long ones.", "The replica is idle apart from the one long read. Nothing is fighting over it.", "The export started at {t0}; nothing small has finished since.", "Support has promised two of the queued customers their export by noon."],
		titles: ['Small exports taking hours', 'Export requests stuck all morning', 'Exports late for most of a day'],
		saw: [
			'{sup} raised it mid-morning: {cust} had asked for a member list export at nine and still had nothing at lunchtime. Two other customers said the same. An export of a few hundred rows normally arrives within a minute.',
			'The export backlog alert fired. {n2} export requests were waiting, the oldest for more than two hours, while every {svc} pod reported healthy and busy.'
		],
		herrings: ['upstream', 'db', 'deploy', 'traffic'],
		steps: [
			['Only one export is being built right now, and it has been running for {n4} minutes: the full history export of {cust2}, about {n5} million rows.', 'One export in progress, {cust2}\'s full history, {n5} million rows, started {n4} minutes ago. Everything else is queued behind it.'],
			['Every other request is behind it. {svc} puts all exports into one JobQueue, and the queue never starts a job until the one before it has finished. A two-hour export holds up every small one that arrives after it.', 'All exports share a single JobQueue in {svc}, and the queue runs one job at a time. With a very long job at the front, nothing else moves.'],
			['Looked back over the month: this has happened each time one of the three biggest workspaces asked for a full export. On a quiet day nobody notices, because nothing small comes in while it runs.']
		],
		found: [
			'Not a fault in the export code, the replica or the object store. One queue, one job at a time, and one very large job at the front. The queue does what relay-kit says it does; we used a single queue for work of very different sizes.',
			'The cause is how {svc} uses its queue: all exports share one JobQueue, which never runs two jobs at once, so a single large export makes every small one late.'
		],
		fix: [
			'Let the big export finish rather than throw away two hours of work, and re-sent the small ones to a spare pod with the admin replay. Backlog clear by {fixat}.',
			'With {cust2}\'s agreement, cancelled their full export and re-ran it at 20:00, after the day\'s requests. The small exports caught up within a quarter of an hour.'
		],
		calm: ['The big export finished on its own at {fixat} and the backlog cleared in twenty minutes. Not sure yet why it built up.'],
		follow: [
			{ text: 'Give exports of over a million rows a queue of their own, so small ones never sit behind them', short: 'the separate queue', owner: 'team' },
			{ text: 'Show support the expected size of an export before they promise a customer a time', short: 'the size hint', owner: 'app' },
			{ text: 'Alert on the age of the oldest waiting export, not only on how many there are', short: 'the age alert', owner: 'team' },
			{ text: 'Ask {cust2} whether a scheduled monthly export would do instead of full exports on demand', short: 'the scheduled-export question', owner: 'support' }
		],
		art: {
			alert: ['RelayExportBacklog', '{n2} exports waiting, oldest over 2h'],
			metric: [
				{ label: 'Exports waiting', base: 2, peak: 90, shape: 'rise' },
				{ label: 'Exports running', base: 1, peak: 1, shape: 'flat' },
				{ label: 'Finished in the interval', base: 30, peak: 0, shape: 'step' }
			],
			log: ['INFO  export progress id=ex_{id} workspace={ws2} rows_written={rows}', 'INFO  export queued id=ex_{id} workspace={ws} position={n}']
		}
	},
	{
		module: 'queue',
		services: ['relay-webhooks', 'relay-audit'],
		vars: {
			'relay-webhooks': {
				grow: 'Only the pods that deliver to {cust}\'s endpoint grow. The JobQueue for that endpoint holds {n3} deliveries and gets longer every minute.',
				pace: '{cust}\'s endpoint does answer, but each response takes about 25 seconds. We deliver one at a time per endpoint, so it takes fewer than three a minute while events for it arrive at forty a minute.',
				slow: 'one slow customer endpoint',
				slowfix: 'Paused deliveries to {cust} and told them through support. Their team found a lock on their own database and cleared it at {fixat}. Resumed'
			},
			'relay-audit': {
				grow: 'Every pod grows at the same rate, and each pod\'s JobQueue of writes holds tens of thousands of entries, {n3} on the worst one.',
				pace: 'The audit database is answering, but each write takes 2 to 4 seconds instead of a few milliseconds. Each pod writes one at a time, so it finishes about twenty a minute while about nine hundred arrive.',
				slow: 'a slow audit database',
				slowfix: '{db} found the weekly vacuum running in the day after a schedule change and stopped it at {fixat}. Writes were back to normal speed'
			}
		},
		detail: ["The pods that were killed held between {n3} and twice that many queued {jobs} when they went.", "Garbage collection runs almost without pause on the growing pods, which is why their CPU went up as well.", "Requests to {svc} are answered as usual right up to each kill; the trouble is all in what is queued behind them.", "Each kill takes about forty seconds to recover from, and the replacement pod starts with an empty queue."],
		titles: ['{svc} pods killed for memory', 'OOM kills in {svc} and lost {jobs}', 'Memory limit reached on {svc}, one pod after another'],
		saw: [
			'{svc} pods were killed by the memory limit one after another (OOMKilled, exit code 137). Each kill lost the {jobs} queued in that pod, and {cust} reported gaps in what they received.',
			'Memory on one {svc} pod went from its usual 180 MB to the 1 GB limit in forty minutes, and then the pod was killed. Its replacement did the same.'
		],
		herrings: ['traffic', 'node', 'bun', 'deploy', 'db'],
		steps: [['{grow}'], ['{pace}'], ['Every waiting {job} is a closure that holds its whole payload. JobQueue keeps waiting jobs in an array with no upper limit, so anything that makes {jobs} slower than their arrival rate turns into an ever longer array, until the pod reaches its limit.', 'What is in the heap: closures, one per waiting {job}, each holding its payload. JobQueue will hold as many as it is given; it has no limit and was never meant to have one.']],
		found: [
			'Cause: the JobQueue in {svc} has no bound, and {slow} let it grow until the kernel killed the pod. Nothing leaked; every byte was a {job} we meant to make.',
			'It is the queue, used without a limit. JobQueue takes as many jobs as it is given; when {jobs} fall behind, that means memory without end.'
		],
		fix: [
			'Added a cap in config: beyond 5,000 waiting {jobs}, new ones stay in the main app\'s outbox instead of being queued in memory. Deployed at {fixat}; memory has been flat since.',
			'{slowfix}, and the backlog went out from the main app\'s outbox over the next two hours.'
		],
		calm: ['Scaled {svc} from {n1} to {n1x} pods so each holds less. The kills stopped by {fixat}; not clear why it started.'],
		follow: [
			{ text: 'Make the cap on waiting {jobs} permanent and alert when it is reached', short: 'the cap and its alert', owner: 'team' },
			{ text: 'Check whether the other Relay services queue without a bound', short: 'the bound check', owner: 'team' },
			{ text: 'Keep the outbox replay tool working; it was the only way back', short: 'the replay tool', owner: 'app' },
			{ text: 'Dashboard of queue length per pod for {svc}', short: 'the queue-length dashboard', owner: 'team' }
		],
		art: {
			kube: 'oom',
			metric: [
				{ label: 'Memory MB (worst pod)', base: 180, peak: 1010, shape: 'saw' },
				{ label: 'Queued {jobs}', base: 40, peak: 80000, shape: 'saw' }
			]
		}
	},
	{
		module: 'queue',
		services: ['relay-digest', 'relay-mailer', 'relay-exports'],
		hours: [7, 11],
		detail: ["The deploy replaced {n1} pods over four minutes. The losses come only from pods that still had work queued when they were replaced.", "None of the lost {jobs} show an error anywhere. They were accepted, and then they simply stop appearing in the logs.", "The pods stop within a second or two of SIGTERM; almost none of the 30-second grace period is used.", "Nothing in the main app retries a {job} once {svc} has accepted it."],
		titles: ['{Jobs} missing after a deploy', 'Some {jobs} never sent on {weekday}', '{n1} support tickets about {jobs} that never arrived'],
		saw: [
			'{sup} had {n1} tickets by midday about {jobs} that never arrived. Every one of them was requested between {tA} and {tB}, which is when {svc} was being deployed.',
			'{Jobs} for {n2} workspaces, {cust} among them, were never sent today. {svc} reported no errors, and the main app shows each of them as handed over.'
		],
		herrings: ['upstream', 'db', 'cache', 'config'],
		steps: [
			['The main app handed over {n3} {jobs} in that window and {svc} logged {n6} as done. The difference matches what was still queued in the old pods when the deploy replaced them.'],
			['On SIGTERM, {svc} stops its server and exits as soon as that is done. The JobQueue lives in memory, and whatever is still in it when the process ends is gone. Nothing saves it or hands it back.', 'Our shutdown path: SIGTERM, server.stop(), exit. The queue is never asked about. Whatever jobs are still queued in memory at that moment are dropped.'],
			['Older deploys have done the same, but they rarely landed while there was much in the queue. This one ran in the pipeline\'s new {weekday}-morning window, which is our busiest hour.']
		],
		found: [
			'Cause: {svc} exits on SIGTERM without letting the jobs already queued run, and the queue keeps them only in memory. A deploy at a busy moment did the rest.',
			'So it is our shutdown, not the {job} code: the in-memory queue in {svc} is thrown away when the process exits, with every queued job in it.'
		],
		fix: [
			'Replayed the missing {jobs} from the main app\'s request log at {fixat}. Customers got them a few hours late.',
			'Replayed the missing {jobs}, and shipped a shutdown hook that stops intake and lets the queued jobs run before the process exits, inside the 30-second grace period.'
		],
		calm: ['Replayed the missing {jobs} by hand from the request log at {fixat}. Why they went missing is for tomorrow.'],
		follow: [
			{ text: 'Move the deploy window away from the busiest hour', short: 'the deploy window', owner: 'platform' },
			{ text: 'Make the shutdown hook finish the queued jobs, and log how many are left when the grace period runs out', short: 'the shutdown hook', owner: 'team' },
			{ text: 'Record which {jobs} a pod has accepted, so a lost batch can be found without the request log', short: 'the accepted-jobs record', owner: 'team' },
			{ text: 'Check exports, mailer and digest for the same shutdown path', short: 'the shutdown check', owner: 'team' }
		],
		art: {
			metric: [
				{ label: 'Handed over', base: 300, peak: 300, shape: 'flat' },
				{ label: 'Done', base: 300, peak: 110, shape: 'blip' }
			],
			log: ['!INFO  received SIGTERM, stopping server', '!INFO  server stopped, exiting']
		}
	},
	{
		module: 'queue',
		services: ['relay-mailer', 'relay-webhooks', 'relay-exports'],
		vars: {
			'relay-mailer': { hung: 'one connection to the email provider' },
			'relay-webhooks': { hung: 'one connection to {cust}\'s endpoint' },
			'relay-exports': { hung: 'one upload to the object store' }
		},
		detail: ["The other pods of {svc} carried on with their own share; only the work routed to the stuck pod stopped.", "netstat on the pod: one ESTABLISHED outbound connection, with nothing sent or received for {n4} minutes.", "The probe only checks that the server answers, which it does; the queue is not part of it.", "The pod's memory and CPU are flat; nothing is being worked on."],
		titles: ['Nothing processed by {svc} for over an hour', '{svc} backlog growing while the pods sit idle', '{svc} stalled without a single error'],
		saw: [
			'The backlog alert for {svc} fired. CPU on the pods was close to zero, the logs had no errors, and nothing was being processed.',
			'{svc} stopped processing at {tA} without logging a single error. Every probe passed, and the backlog grew by a few hundred {jobs} a minute.'
		],
		herrings: ['deploy', 'dns', 'node', 'config', 'db'],
		steps: [
			['The last line from the stuck pod is a {job} that started and never finished, {n4} minutes ago. Nothing since.', 'On the stuck pod the log stops {n4} minutes ago, in the middle of a {job}: a start line and no end line.'],
			['That {job} still has {hung} open: no answer, no error, no reset. Our client sets no limit on how long the call may take, so the job never settles.', '{Hung} has been open for {n4} minutes with nothing coming back. The client we use has no limit on the call unless we give it one, and we never did.'],
			['The queue only starts the next job when the current one has finished. A job that never finishes leaves every {job} behind it in the queue for good.']
		],
		found: [
			'Cause: {hung} that never answered, made with no time limit, inside a job. The JobQueue in {svc} cannot move past a job that never settles.',
			'The queue is working as designed and {up} is mostly fine. One hung call left one job unfinished forever, and every {job} behind it stayed put.'
		],
		fix: [
			'Restarted the stuck pod at {fixat}. The hung {job} was retried by the main app and went through first time; the backlog cleared in ten minutes.',
			'Deployed a 30-second limit on calls to {up} as a hotfix at {fixat}. A call that runs over now fails its job, which is logged and retried by the main app.'
		],
		calm: ['Restarted the pods at {fixat}; processing resumed straight away. No idea yet what stopped it.'],
		follow: [
			{ text: 'Put a time limit on every outbound call made from a job', short: 'the call limits', owner: 'team' },
			{ text: 'Alert when nothing has finished for five minutes while {jobs} are queued', short: 'the stall alert', owner: 'team' },
			{ text: 'Count from the client logs how often calls to {up} hang', short: 'the hang count', owner: 'team' },
			{ text: 'Add a "stalled, no errors" section to the runbook', short: 'the runbook section', owner: 'team' }
		],
		art: {
			alert: ['RelayBacklogHigh', 'oldest queued {job} in {svc} is 12m old (threshold 10m)'],
			metric: [
				{ label: 'Queued {jobs}', base: 15, peak: 6000, shape: 'rise' },
				{ label: 'Finished per minute', base: 400, peak: 0, shape: 'step' },
				{ label: 'CPU %', base: 35, peak: 2, shape: 'step' }
			]
		}
	},
	{
		module: 'queue',
		services: ['relay-webhooks', 'relay-mailer', 'relay-audit'],
		vars: {
			'relay-webhooks': { never: 'the endpoint it targets was deleted by {cust} last week and now answers 410 Gone', failure: 'status=410' },
			'relay-mailer': { never: 'it is addressed to a domain that no longer exists', failure: 'err="domain not found"' },
			'relay-audit': { never: 'it refers to a workspace that was deleted before the write arrived', failure: 'err="workspace not found"' }
		},
		detail: ["The {job} was first enqueued {n1} days ago. It has failed about {n3} times since, mostly at night, when nothing else is queued.", "The rest of {svc} kept working: other {jobs} slot in between attempts, so nobody noticed the loop until the log volume did.", "Log volume from {svc} is normally about four hundred lines a minute.", "Each attempt takes a few milliseconds, which is why the loop is so fast."],
		titles: ['Log pipeline flooded by {svc}', '{svc} writing forty thousand log lines a minute', 'Platform asked us to stop {svc} flooding the logs'],
		saw: [
			'{plat} from platform got in touch at {tA}: {svc} was sending about forty thousand log lines a minute, the log pipeline had started to shed lines, and other teams were losing theirs.',
			'The log pipeline alert fired for the whole cluster, and the top sender by far was {svc}, at a hundred times its usual volume.'
		],
		herrings: ['deploy', 'traffic', 'config', 'bun'],
		steps: [
			['Nearly every line is the same failure for the same {job}, `{jid}`, repeated many times a second.'],
			['Our retry code catches a failed {job} and enqueues it again at once. With nothing else queued, the queue picks it up straight away, it fails again, and round it goes.', 'In {svc}, a failed {job} goes straight back into the JobQueue. The queue starts it again the moment the job before it finishes, so a {job} that can never succeed runs as fast as the pod allows.'],
			['The {job} can never succeed: {never}.']
		],
		found: [
			'Cause: our own retry loop. A {job} that always fails is put straight back into the queue, and the queue, doing its job, runs it again immediately, forever, logging each failure.',
			'So {svc} re-enqueues failures with no limit on attempts. One permanently failing {job} was enough to flood the logs.'
		],
		fix: [
			'Hotfix at {fixat}: a {job} is given up after five attempts and recorded in the dead-letter table. Log volume back to normal within a minute.',
			'Removed the {job} by hand at {fixat}, then shipped a limit of five attempts the same afternoon.'
		],
		calm: ['Restarted the pods at {fixat}, which emptied the queue, and the flood stopped. Not sure yet where it came from.'],
		follow: [
			{ text: 'Give up on a {job} after a set number of attempts, everywhere we retry', short: 'the attempt limit', owner: 'team' },
			{ text: 'A per-service cap in the log pipeline, so one service cannot crowd out the rest', short: 'the log cap', owner: 'platform' },
			{ text: 'Show dead-lettered {jobs} on the Relay dashboard', short: 'the dead-letter panel', owner: 'team' }
		],
		art: {
			metric: [{ label: 'Log lines per minute from {svc}', base: 400, peak: 41000, shape: 'step' }, { label: 'Pipeline lines dropped per minute', base: 0, peak: 18000, shape: 'step' }],
			alert: ['LogPipelineShedding', 'log pipeline dropping lines, top sender {svc}'],
			log: ['ERROR {job} failed id={jid} attempt={att} {failure}', 'INFO  re-enqueued id={jid} attempt={att}']
		}
	},
	// The server.
	{
		module: 'server',
		services: ['relay-webhooks', 'relay-audit', 'relay-billing-sync'],
		vars: {
			'relay-webhooks': { handler: '`POST /endpoints/verify`', callee: "the customer's endpoint" },
			'relay-audit': { handler: '`GET /audit/search`', callee: 'the search proxy in front of the audit database' },
			'relay-billing-sync': { handler: '`POST /seats/reconcile`', callee: 'the billing provider' }
		},
		detail: ["The Terminating pods each show one open connection to {callee}.", "Deploy times have crept up ever since that handler was added on {d0}.", "The pods that stopped cleanly had no request open when SIGTERM arrived.", "The main app retries the failed calls, so most of them succeed on another pod a second later."],
		titles: ['Deploys of {svc} take ten minutes and drop requests', '{svc} pods killed at the end of the grace period', 'Connection resets from {svc} on every deploy'],
		saw: [
			'Every deploy of {svc} this week has taken about ten minutes instead of two, and each one has left a burst of connection resets in the main app\'s logs.',
			'During today\'s deploy, {n1} pods of {svc} stayed in Terminating for the full 30 seconds and were then killed. The main app logged {n2} failed calls in that minute.'
		],
		herrings: ['node', 'config', 'traffic', 'bun', 'dns'],
		steps: [
			['Our shutdown hook calls `server.stop()` and exits when it resolves. On the pods that were killed, it never resolved.'],
			['relay-kit\'s stop() answers new requests with 503 and resolves only when every request already being handled has been answered. So something was still in flight.', 'stop() is documented to hold until every in-flight request has had its answer. If it never resolved, a request never finished.'],
			['`inFlight` on a stuck pod reads 1 and stays there. The request is {handler}, which calls {callee} and puts no limit on how long it will go without an answer. That call had been open for {n4} minutes.']
		],
		found: [
			'Cause: a handler in {svc} that can hang forever on {callee}. stop() holds until in-flight requests are answered, by design, so the pod outlives its grace period, is killed, and everything still open on it is cut off.',
			'Not the platform and not the probe settings. One hung handler keeps stop() from resolving, as relay-kit documents, and the kill at the end of the grace period then takes the pod down mid-request.'
		],
		fix: [
			'Put a 10-second limit on the call to {callee} and deployed. The next deploy took two minutes and logged no resets.',
			'Deleted the stuck pods one by one so the rollout could finish, then shipped a limit on the call to {callee} that afternoon.'
		],
		calm: ['Finished the rollout by deleting the stuck pods by hand. Things are normal now; cause unknown.'],
		follow: [
			{ text: 'Put a limit on every outbound call made inside a request handler', short: 'the handler limits', owner: 'team' },
			{ text: 'Log which requests are still in flight when shutdown starts', short: 'the shutdown log', owner: 'team' },
			{ text: 'Show pods killed at the end of their grace period on the deploy dashboard', short: 'the dashboard panel', owner: 'platform' },
			{ text: 'Look at the shutdown hooks of the other services for the same pattern', short: 'the hook review', owner: 'team' }
		],
		art: { metric: [{ label: 'Deploy minutes', base: 2, peak: 10, shape: 'rise' }], days: true, kube: 'terminating', log: ['!INFO  received SIGTERM, calling server.stop()', 'WARN  shutdown: stop() not resolved, inFlight=1', '!INFO  {handler0} started request_id={dupid}'] }
	},
	{
		module: 'server',
		services: ['relay-webhooks', 'relay-mailer', 'relay-audit', 'relay-billing-sync'],
		quiet: true,
		detail: ["The 503s come only from pods that are terminating; the new pods answer normally from their first request.", "The count is about twenty seconds of traffic per stopping pod, which is what the probe settings predict.", "No 503 reaches a customer: the main app retries them and the second attempt goes to a healthy pod.", "The alert counts 5xx over two minutes, which a rollout of {n1} pods fills easily."],
		titles: ['5xx alert on every deploy of {svc}', 'Bursts of 503 from {svc} during rollouts', 'Paged for {svc} errors during a routine deploy'],
		saw: [
			'Since {svc} moved to relay-kit 0.3.0, every deploy has set off the 5xx alert: for about twenty seconds per pod, the main app receives 503 from {svc}.',
			'The main app\'s error dashboard shows a short wall of 503s from {svc} at {tA}, matching the rollout to the minute. The main app retried them all, so nothing was lost, but the alert paged {oncall} at a bad hour.'
		],
		herrings: ['deploy', 'node', 'traffic', 'upstream', 'db'],
		steps: [
			['The 503 body is `Server is stopping`. That is what relay-kit\'s server answers to requests that arrive after stop() has been called.'],
			['Our pods call stop() as soon as SIGTERM arrives, but the load balancer keeps sending them traffic until their readiness probe fails, and the probe runs every 10 seconds with three failures needed.', 'Sequence on a pod: SIGTERM, stop(), 503 to everything new. Meanwhile the load balancer needs three failed readiness probes, ten seconds apart, before it stops routing to the pod.'],
			['Before 0.3.0 those late requests were taken by a server that was about to exit, and some were cut off without an answer. Now they get a clean 503, which the alert counts.']
		],
		found: [
			'Cause: the service stops taking requests before the load balancer has stopped routing to the pod. The 503s are relay-kit doing what 0.3.0 says; the order of our shutdown is the problem.',
			'Not a bug in the server. stop() refuses new requests, which is right; the readiness probe takes up to thirty seconds to notice, so traffic keeps arriving at a server that has said it is stopping.'
		],
		fix: [
			'Readiness now fails the moment SIGTERM arrives, and the 5xx alert leaves out 503s from pods that are stopping. Deployed twice since with no page.',
			'For now the alert ignores 503 with the body `Server is stopping`. The readiness change is ticketed.'
		],
		calm: ['The rollout finished and the errors stopped with it.'],
		follow: [
			{ text: 'Fail readiness as soon as SIGTERM arrives, in every Relay service', short: 'the readiness change', owner: 'team' },
			{ text: 'Leave 503 from stopping pods out of the 5xx alert', short: 'the alert rule', owner: 'team' },
			{ text: 'Agree a retry budget for calls to Relay services with the app team', short: 'the retry budget', owner: 'app' },
			{ text: 'Ask whether the probe period can be shorter for Relay pods', short: 'the probe question', owner: 'platform' }
		],
		art: {
			alert: ['RelayHigh5xx', '5xx ratio for {svc} at {pct}% over 2m'],
			metric: [
				{ label: '503 per minute', base: 0, peak: 340, shape: 'blip' },
				{ label: 'Requests per minute', base: 2400, peak: 2400, shape: 'flat' }
			],
			raw: ['$ curl -si http://localhost:{port}/healthz', 'HTTP/1.1 503 Service Unavailable', 'content-type: text/plain;charset=utf-8', 'content-length: 18', '', 'Server is stopping']
		}
	},
	{
		module: 'server',
		services: ['relay-audit', 'relay-exports', 'relay-billing-sync'],
		detail: ["The pod logs `listening on http://localhost:{port}/`, which on the old cluster nobody ever read twice.", "The readiness probe on the new cluster goes straight to the pod address, not through a sidecar.", "The deployment, config and image are identical to the old cluster's.", "Other services already on the new cluster use their own HTTP servers, which listen on every address."],
		titles: ['{svc} never became ready on the new cluster', '{svc} unreachable after the cluster move', 'Rollout of {svc} to the new cluster stalled'],
		saw: [
			'The rollout of {svc} to the new cluster stalled: the new pods started, logged that they were listening, and then failed every readiness probe until the deploy gave up.',
			'After {svc} moved to the new cluster, every call from the main app ended in connection refused, although the pods were running and logging `listening on http://localhost:{port}/`.'
		],
		herrings: ['dns', 'config', 'deploy', 'node'],
		steps: [
			['From inside a pod, curl to localhost answers 200. From the pod next to it, the same port refuses the connection.'],
			['createServer in relay-kit binds to `localhost` and never listens on the pod\'s own address. On the old cluster the mesh sidecar sat in front and forwarded to localhost, so that never mattered.', 'relay-kit\'s createServer passes `hostname: \'localhost\'` to Bun.serve. Only something inside the pod can reach it. On the old cluster that something was the mesh sidecar.'],
			['The namespace on the new cluster does not inject the sidecar yet. Platform had it on their list for next week.']
		],
		found: [
			'Cause: on the new cluster nothing forwards to localhost, and relay-kit\'s server listens only there. Without the sidecar, {svc} can be reached from nowhere but itself.',
			'So: the missing sidecar, plus a server that only binds to localhost. Either one alone would have been fine.'
		],
		fix: ['{plat} turned on sidecar injection for the namespace at {fixat}. The pods restarted and were ready within a minute.', 'Rolled {svc} back to the old cluster at {fixat}. Its move waits for the sidecar.'],
		calm: ['Rolled back to the old cluster at {fixat}; the main app can reach {svc} again. We look at why tomorrow.'],
		follow: [
			{ text: 'Add sidecar injection to the checklist for new namespaces', short: 'the namespace checklist', owner: 'platform' },
			{ text: 'Say in the Relay service template that relay-kit\'s server only listens on localhost', short: 'the template note', owner: 'team' },
			{ text: 'Run a reachability check from another pod before a cluster move is marked done', short: 'the reachability check', owner: 'platform' }
		],
		art: {
			kube: 'notready',
			raw: ['$ kubectl -n relay exec {pod} -c app -- curl -s -o /dev/null -w "%{http_code}\\n" http://localhost:{port}/healthz', '200', '$ kubectl -n relay exec {pod2} -c app -- curl -s -m 3 http://{ip}:{port}/healthz', "curl: (7) Failed to connect to {ip} port {port} after 0 ms: Couldn't connect to server"]
		}
	},
	{
		module: 'server',
		services: ['relay-audit', 'relay-mailer'],
		vars: { 'relay-audit': { dup: 'audit entries' }, 'relay-mailer': { dup: 'emails' } },
		detail: ["Each duplicate pair has the same request id, a few seconds apart, the second from a retry.", "Over the last month: {n2} duplicates, all within a minute of a deploy.", "Duplicates appear only for requests that arrived in the last second or so before a pod stopped.", "The main app sends the same request id on a retry, so the duplicates are easy to find."],
		titles: ['Duplicate {dup} after deploys', '{cust} seeing the same {dup} twice', 'Doubled {dup} on deploy days'],
		saw: [
			'{cust} found the same {dup} twice, always a few seconds apart and always on days when {svc} was deployed.',
			'{sup} reported customers getting the same {dup} twice. Every duplicate pair straddles a deploy of {svc}.'
		],
		herrings: ['upstream', 'db', 'cache', 'traffic'],
		steps: [
			['The main app retried these requests after a connection reset, and both attempts reached {svc}.'],
			['{svc} is still on relay-kit 0.2.0. Its server keeps taking requests after stop(), and the process exits once the in-flight count reaches zero, sometimes just after a request has done its write and before its answer has left.', 'The service never moved off relay-kit 0.2.0. That server accepts new requests after stop(), and the process can end between a request\'s write and its response.'],
			['0.3.0 answers requests that arrive after stop() with 503 instead, which the main app retries against another pod before any write has happened.']
		],
		found: [
			'Cause: relay-kit 0.2.0\'s server took requests during shutdown, so writes happened on requests whose callers never got an answer, and the retry wrote them again. 0.3.0 fixed this; {svc} never upgraded.',
			'It comes down to the old server in relay-kit 0.2.0, which accepted requests after stop(). The main app\'s retry is correct.'
		],
		fix: ['Upgraded {svc} to relay-kit 0.3.0 and deployed twice to check: no duplicates either time.', 'Removed the {n2} duplicates with the dedupe script. The upgrade is ticketed.'],
		follow: [
			{ text: 'Upgrade {svc} to relay-kit 0.3.0', short: 'the upgrade', owner: 'team' },
			{ text: 'Make {svc} ignore a second request with the same request id', short: 'the request-id check', owner: 'team' },
			{ text: 'List which Relay services are still on relay-kit 0.2.0', short: 'the version list', owner: 'team' },
			{ text: 'Tell {cust} what happened and that the duplicates are gone', short: 'the customer note', owner: 'support' }
		],
		art: {
			metric: [{ label: 'Duplicates', base: 0, peak: 40, shape: 'spike' }, { label: 'Deploys', base: 0, peak: 2, shape: 'spike' }],
			days: true,
			raw: ["$ grep -h 'request_id={dupid}' {svc}-*.log", '{isoday}T{tA}:07.412Z INFO  POST {path} 201 ms={ms} request_id={dupid}  ({pod})', '{isoday}T{tA}:07.988Z INFO  received SIGTERM, calling server.stop()  ({pod})', '{isoday}T{tA}:11.204Z INFO  POST {path} 201 ms={ms} request_id={dupid}  ({pod2})']
		}
	},
	// The cache.
	{
		module: 'cache',
		services: ['relay-billing-sync', 'relay-webhooks'],
		vars: {
			'relay-billing-sync': {
				thing: 'seat limits',
				key: 'seats:{ws}',
				failure: '401 Unauthorized. The billing provider API key was rotated on {dn} and {svc} still had the old one',
				what: '{cust} upgraded to 40 seats on {dmid} and still could not invite anyone: the main app kept saying the workspace was full at 25.',
				effect: 'could invite again',
				status: '401'
			},
			'relay-webhooks': {
				thing: 'endpoint settings',
				key: 'endpoint:ep_{id0}',
				failure: '403 Forbidden. The settings API began requiring the new service token on {dn}',
				what: '{cust} rotated their webhook signing secret on {dmid}, and every delivery since was still signed with the old one, so their endpoint rejected all of them.',
				effect: 'received correctly signed deliveries again',
				status: '403'
			}
		},
		detail: ["Keys loaded after the credential change failed on their first load, loudly, and the main app retried them; only keys loaded before it kept old values.", "The refresh failures are in {up2}'s own access log as well, {n3} of them, with our service name on every one.", "The main app shows whatever {svc} returns; it keeps no copy of its own.", "Restarting a pod would not have helped: its first load would fail outright with the same {status}."],
		titles: ['{svc} serving old {thing} for days', '{cust} stuck with old {thing}', 'Changes to {thing} not taking effect'],
		saw: ['{what}', 'Support escalated a third ticket in a week about {thing} that did not change after the customer changed them. {cust} was the latest.'],
		herrings: ['deploy', 'config', 'db', 'node'],
		steps: [
			['{svc} answers from its RefreshingCache. The entry for `{key}` was loaded {n1} days ago and has been past its TTL ever since.'],
			['Every get starts a refresh in the background and returns the stored value. Every refresh fails: {failure}.', 'Tried a refresh by hand from a pod: {failure}. Every background refresh since then has failed the same way.'],
			['{svc} is on relay-kit 0.2.0, whose cache says nothing when a refresh fails. It keeps the stored value, as designed, and nobody hears about the failure. 0.3.0 emits `error` for exactly this.']
		],
		found: [
			'Cause: refreshes have been failing since the credential change, and relay-kit 0.2.0\'s cache kept serving the last good value without a word. Every key loaded before the change was frozen.',
			'So the old values come from the cache doing what it promises, serving the stored value while it refreshes, with refreshes that all failed and that 0.2.0 has no way to report.'
		],
		fix: [
			'Put the new credential in place and restarted {svc}; every key was loaded fresh. {cust} {effect} at {fixat}.',
			'New credential deployed at {fixat}, and {svc} upgraded to 0.3.0 in the same change, with a log line on every `error` from the cache.'
		],
		calm: ['{sup} set the values for {cust} by hand in the main app as a stopgap. Leaving the rest for the morning.'],
		follow: [
			{ text: 'Upgrade {svc} to relay-kit 0.3.0 and log every `error` the cache emits', short: 'the upgrade', owner: 'team' },
			{ text: 'Add the Relay services to the credential rotation runbook', short: 'the rotation runbook', owner: 'platform' },
			{ text: 'Alert when a cache entry is more than a day past its TTL', short: 'the age alert', owner: 'team' },
			{ text: 'Find the other customers whose {thing} were stale and check them', short: 'the customer check', owner: 'support' }
		],
		art: { metric: [{ label: 'Refresh failures per hour', base: 0, peak: 900, shape: 'step' }, { label: 'Oldest entry age (hours)', base: 1, peak: 70, shape: 'rise' }], days: true, log: ['WARN  refresh failed key={key} status={status}', 'INFO  GET {route} 200 ms=1 served=cache age_s={age}'] }
	},
	{
		module: 'cache',
		services: ['relay-billing-sync', 'relay-mailer'],
		vars: {
			'relay-billing-sync': { setting: 'plansTtl', item: 'plans', appthing: 'plan changes and seat lookups' },
			'relay-mailer': { setting: 'templateTtl', item: 'templates:default', appthing: 'every email that needed a template' }
		},
		detail: ["The refresh rate matches the arithmetic: one refresh about every 3.6 seconds per pod, times {n1} pods.", "Nothing else in the config change touches {up2}.", "The config change went through review; nobody spotted the unit.", "Other settings in the same file are in milliseconds and say so in their names, such as `flushMs`."],
		titles: ['{Up2} rate-limiting {svc}', '429 Too Many Requests from {up2}', '{svc} failing after a config deploy'],
		saw: [
			'{Up2} started answering 429 Too Many Requests to {svc} at {tA}. Everything that needs it failed for about forty minutes.',
			'Errors from {svc} jumped at {tA}: almost every call to {up2} came back 429. The app team saw failures in {appthing}.'
		],
		herrings: ['traffic', 'node', 'bun', 'db'],
		steps: [
			['Our request rate to {up2} went from about 2 a second to 300 a second at {t0}, the minute this morning\'s config deploy finished.'],
			['Nearly all of it is the `{item}` entry being refreshed over and over.'],
			['The config change moved the cache settings into relay.config.json, as `"{setting}": 3600`. The cache\'s ttlMs is in milliseconds, so the entry went stale every 3.6 seconds, and the first get after each of those started a refresh.', 'In the new relay.config.json, `"{setting}": 3600`. RefreshingCache reads ttlMs as milliseconds. An hour became 3.6 seconds, and every get after that started another refresh.']
		],
		found: [
			'Cause: a TTL meant as an hour and read as 3.6 seconds. RefreshingCache takes milliseconds, the new config gave it seconds, and the refresh rate went up a thousandfold.',
			'So the cache did exactly what it was told. The value moved into config without its unit, and 3600 milliseconds is not an hour.'
		],
		fix: ['Set the value to 3600000 and redeployed at {fixat}. The request rate fell back, and the 429s stopped within ten minutes.', 'Rolled the config back at {fixat}, then re-applied it the next morning with the value in milliseconds.'],
		calm: ['Rolled the config deploy back at {fixat} on a hunch, and the 429s stopped. Need to work out which part of it did this.'],
		follow: [
			{ text: 'Rename the setting to `{setting}Ms` so the unit is in the name', short: 'the rename', owner: 'team' },
			{ text: 'Refuse to start when a cache TTL is under a minute', short: 'the boot check', owner: 'team' },
			{ text: 'Alert on the request rate from {svc} to {up2}', short: 'the rate alert', owner: 'team' },
			{ text: 'Ask for a separate rate limit per service key', short: 'the separate limit', owner: 'platform' }
		],
		art: {
			alert: ['RelayUpstream429', '{svc} to {up2}: {pct}% 429 over 5m'],
			diff: ['--- a/relay.config.json', '+++ b/relay.config.json', '@@ -2,6 +2,7 @@', '   "logLevel": "info",', '   "port": 0,', '-  "intakePath": "/events"', '+  "intakePath": "/events",', '+  "{setting}": 3600', ' }'],
			metric: [
				{ label: 'Requests per second to {up2}', base: 2, peak: 300, shape: 'step' },
				{ label: '429 per minute', base: 0, peak: 9000, shape: 'step' }
			]
		}
	},
	{
		module: 'cache',
		services: ['relay-webhooks', 'relay-billing-sync'],
		vars: { 'relay-webhooks': { up3: 'the settings API', Up3: 'The settings API' }, 'relay-billing-sync': { up3: 'the billing provider', Up3: 'The billing provider' } },
		detail: ["Fifteen seconds after start, the request rate to {up3} drops to almost nothing; the cache is full by then.", "The burst is worse when the rollout replaces several pods at once.", "Each pod makes the burst on its own; with {n1} pods replaced at once it is {n1} times worse.", "Between deploys, the request rate to {up3} is steady and low."],
		titles: ['{Up3} overloaded after every restart of {svc}', 'Errors from {up3} right after deploys', 'Deploy of {svc} took {up3} down for six minutes'],
		saw: [
			'Right after each deploy of {svc}, {up3} returns errors for a minute or two. Today it went down for six minutes and the app team paged us.',
			'{app} from the app team asked why {up3} receives a wall of identical requests from {svc} every time we deploy. Today the wall was big enough to knock it over.'
		],
		herrings: ['traffic', 'config', 'bun', 'dns'],
		steps: [
			['In the first ten seconds after a pod starts, it makes {n3} requests to {up3}, for only {n7} distinct keys.'],
			['A fresh pod starts with an empty cache. When a burst of requests asks for the same key at once, each get finds no entry and calls load; RefreshingCache does not share a first load between callers who arrive while it is running.', 'Read cache.ts. The first `get` of a key runs load and only stores the result when load returns. Every other `get` for that key in the meantime finds nothing stored and loads it too.'],
			['Background refreshes are guarded so only one runs per key, but the guard lives on the entry, and a key with no entry yet has nothing to guard it.']
		],
		found: [
			'Cause: concurrent first gets for the same key each load it. After a restart, a busy key is loaded hundreds of times at once, and {up3} cannot take it.',
			'It is the cold cache. Each new pod asks {up3} for the same few keys hundreds of times over, because nothing shares a first load that is still running.'
		],
		fix: [
			'Pods now load the {n7} hot keys once at boot and only report ready after that. The next deploy sent {n7} requests to {up3} instead of thousands.',
			'Rollouts of {svc} now replace one pod at a time, which keeps the burst small enough for {up3} until the cache is warmed properly.'
		],
		calm: ['The errors stopped by themselves once the new pods had filled their caches.'],
		follow: [
			{ text: 'Share a first load that is still running between callers, in {svc}\'s wrapper around the cache', short: 'the shared first load', owner: 'team' },
			{ text: 'Roll {svc} out one pod at a time', short: 'the rollout setting', owner: 'platform' },
			{ text: 'Ask the app team for a bulk endpoint so a cold pod can load its keys in one call', short: 'the bulk endpoint', owner: 'app' }
		],
		art: {
			metric: [
				{ label: 'Requests to {up3} per 10 s', base: 40, peak: 6000, shape: 'blip' },
				{ label: 'Errors from {up3}', base: 0, peak: 2400, shape: 'blip' }
			],
			log: ['INFO  cache load key={hot} ms={ms}', 'WARN  load failed key={hot} status=503']
		}
	},
	{
		module: 'cache',
		services: ['relay-mailer', 'relay-webhooks', 'relay-billing-sync'],
		vars: {
			'relay-mailer': { keyform: '`template:<workspace>:<user>:<locale>`', per: 'user', better: '`template:<workspace>:<locale>`' },
			'relay-webhooks': { keyform: '`endpoint:<endpoint>:<event type>`', per: 'event type and endpoint', better: '`endpoint:<endpoint>`' },
			'relay-billing-sync': { keyform: '`seats:<workspace>:<request id>`', per: 'request', better: '`seats:<workspace>`' }
		},
		detail: ["The growth is a straight line: about the same number of new keys every day, more on Mondays.", "Request rate and payload sizes have not changed in a month, so the growth does not come from traffic.", "The kills always land on the pod that has been up longest.", "A pod restarted yesterday is at 200 MB; the oldest is at 900."],
		titles: ['{svc} memory climbing until the weekly kill', 'Slow memory growth in {svc}', '{svc} OOM-killed on a quiet Sunday'],
		saw: [
			'{svc} pods grow by about 60 MB a day and are killed by the memory limit roughly once a week, at a different hour each time. This week it happened during the evening peak.',
			'Another OOM kill on {svc}, the third this month. Nothing unusual in traffic before it; memory had simply reached the limit.'
		],
		herrings: ['traffic', 'bun', 'deploy', 'config'],
		steps: [
			['Heap snapshot from a pod at 900 MB: almost all of it is one Map inside RefreshingCache, with {n3} entries.'],
			['The key is {keyform}, so the number of keys grows with every {per} we ever see, and RefreshingCache never removes an entry. It only refreshes the ones that are asked for again.', 'Our key is {keyform}. That makes a new entry for every {per}, and the cache keeps every entry it has ever loaded; nothing in it forgets.'],
			['Most entries were read once. {pct}% have not been read for over a week.']
		],
		found: [
			'Cause: a cache keyed per {per} with nothing ever evicted. RefreshingCache keeps every key it has loaded for the life of the process, so memory grows with the number of distinct keys.',
			'Not a leak in the usual sense. Every entry is one we stored on purpose, and the cache keeps entries until the process ends; our key makes sure there are always more of them.'
		],
		fix: ['Changed the key to {better}, which keeps the number of entries near {n2}. Deployed at {fixat}; memory flat for a week since.', 'Pods restart every night at 04:00 until the key change is in.'],
		calm: ['Restarted the pods at {fixat} to buy time. Memory starts from 150 MB again.'],
		follow: [
			{ text: 'Evict entries nobody has read for a day, in {svc}\'s wrapper around the cache', short: 'the eviction', owner: 'team' },
			{ text: 'Dashboard of memory per pod with a week\'s trend', short: 'the memory dashboard', owner: 'team' },
			{ text: 'Check how the other services build their cache keys', short: 'the key review', owner: 'team' }
		],
		art: {
			kube: 'oom',
			days: true,
			metric: [
				{ label: 'Memory MB (worst pod)', base: 150, peak: 1000, shape: 'rise' },
				{ label: 'Cache entries', base: 2000, peak: 900000, shape: 'rise' }
			]
		}
	},
	{
		module: 'cache',
		services: ['relay-billing-sync', 'relay-webhooks', 'relay-mailer'],
		vars: {
			'relay-billing-sync': { up3: 'the billing provider', Up3: 'The billing provider', key3: 'plans', file: 'billing' },
			'relay-webhooks': { up3: 'the settings API', Up3: 'The settings API', key3: 'endpoint:ep_{id0}', file: 'settings' },
			'relay-mailer': { up3: 'the template store', Up3: 'The template store', key3: 'templates:default', file: 'templates' }
		},
		detail: ["Every pod refreshes `{key3}` at least once a minute, so every pod met the blip.", "{Up3}'s own incident note confirms the blip: 502s for about two minutes from their load balancer.", "{svc}'s own log line for the refresh error is the last thing each pod wrote.", "Pods restart in about twenty seconds, so the outage was short, but every pod went at once."],
		titles: ['{svc} restarted when {up3} had a short outage', 'All {svc} pods exited after a brief upstream blip', '{svc} down after a two-minute blip at {up3}'],
		saw: [
			'{Up3} had a two-minute blip at {tA}. Every other caller rode it out; every {svc} pod exited within the same two minutes, and the service was down until the pods came back.',
			'At {tA}, all {svc} pods exited with code 1 at once. Nothing was deployed and the config had not changed.'
		],
		herrings: ['deploy', 'memory', 'node', 'config'],
		steps: [
			['The last thing each pod logged was an error from a background refresh of its cache: {up3} answered 502.'],
			['{svc} moved to relay-kit 0.3.0 last week. Since 0.3.0, RefreshingCache emits `error` when a background refresh fails.', 'The upgrade to relay-kit 0.3.0 went out {n1} days ago. One thing 0.3.0 changed: a failed background refresh now produces an `error` event on the cache.'],
			['{svc} never listens for `error` on its cache. An EventEmitter with no `error` listener throws instead, inside the refresh, where nothing catches it, and Bun exits on the unhandled error.']
		],
		found: [
			'Cause: the upgrade to 0.3.0 gave the cache an `error` event, and {svc} has no listener for it. The first failed refresh after the upgrade ended every pod that tried one.',
			'It is the cache\'s new `error` event with nobody listening. Under 0.2.0 the same blip would have gone unnoticed; under 0.3.0 it is an unhandled error.'
		],
		fix: [
			'Added an `error` listener on the cache that logs the failure and keeps the stale value, which is what 0.2.0 did silently. Deployed at {fixat}.',
			'Hotfix with the listener out at {fixat}. On staging, pointed {svc} at a stopped copy of {up3} and let a refresh fail: logged, no exit.'
		],
		calm: ['Pods came back on their own once {up3} recovered. Down for about four minutes. Cause to follow.'],
		follow: [
			{ text: 'Check every RefreshingCache in the Relay services for an `error` listener before anyone else upgrades', short: 'the listener check', owner: 'team' },
			{ text: 'Add the new `error` event to the team\'s upgrade checklist on the wiki', short: 'the checklist entry', owner: 'team' },
			{ text: 'Alert when every pod of a service restarts within the same minute', short: 'the mass-restart alert', owner: 'team' }
		],
		art: {
			metric: [{ label: 'Pods ready', base: 4, peak: 0, shape: 'blip' }, { label: '502 from {up3} per minute', base: 0, peak: 300, shape: 'blip' }],
			trace: ['error: refresh of {key3} failed: 502 Bad Gateway', '      at load (/app/src/{file}.ts:{L}:{C})', '      at async #refresh (/app/node_modules/relay-kit/src/cache.ts:52:18)'],
			kube: 'restarts'
		}
	},
	// The watcher.
	{
		module: 'watcher',
		services: ['relay-webhooks', 'relay-digest'],
		detail: ["The config tool's own log shows the write going out as two chunks, about 30 ms apart.", "All pods read the file within the same few milliseconds, which is why they all failed together.", "The config change itself was harmless: one log level.", "Pods that came back read the finished file and started normally."],
		titles: ['Config push restarted every {svc} pod', 'All {svc} pods restarted at once', '{svc} crashed during a config change'],
		saw: [
			'A push of relay.config.json restarted every {svc} pod within the same second. They all came back, but {n2} {jobs} that were queued at that moment were lost.',
			'At {tA} every {svc} pod exited at once. The only thing that happened in that minute was a routine config change from {plat}.'
		],
		herrings: ['deploy', 'node', 'traffic', 'memory'],
		steps: [
			['Every pod exited with `SyntaxError: JSON Parse error: Unexpected EOF`, thrown from the config reload.'],
			['The reload listens for the FileWatcher\'s `change` event and reads and parses the file straight away. The config tool writes the file in place, in two chunks, and the watcher caught it between them.', 'Our reload handler parses relay.config.json as soon as the watcher reports a change. The config tool rewrites the file in place and in pieces, so the handler read a file that was half written.'],
			['A `change` event means the size or modification time differs from the last check, nothing more. It says nothing about whether the writer has finished.']
		],
		found: [
			'Cause: the reload handler takes the file to be complete as soon as the watcher reports a change. The config tool writes in place, so the handler read half a file, the parse threw, and nothing caught it.',
			'So a half-written config file and a handler that parses without a try. The watcher reported a real change; we read it too early and had no guard.'
		],
		fix: [
			'The reload now parses inside a try and keeps the current config when the parse fails; the next change event, once the write has finished, loads it. Deployed at {fixat}.',
			'{plat} changed the config tool to write a temporary file and rename it over the old one, which replaces it in one step.'
		],
		calm: ['Pods are all back and running the new config. Leaving the cause for the morning.'],
		follow: [
			{ text: 'Make the config tool write a temporary file and rename it', short: 'the atomic write', owner: 'platform' },
			{ text: 'Guard the config parse in every service that reloads on change', short: 'the parse guard', owner: 'team' },
			{ text: 'Alert when a config reload fails', short: 'the reload alert', owner: 'team' }
		],
		art: {
			trace: ['SyntaxError: JSON Parse error: Unexpected EOF', '      at reload (/app/src/config.ts:{L}:{C})', '      at emit (node:events:{L}:{C})', '      at #check (/app/node_modules/relay-kit/src/watcher.ts:61:9)', '      at <anonymous> (/app/node_modules/relay-kit/src/watcher.ts:42:46)'],
			kube: 'restarts'
		}
	},
	{
		module: 'watcher',
		services: ['relay-webhooks', 'relay-digest'],
		vars: {
			'relay-webhooks': { effect: 'deliveries went out without the per-customer retry settings, and {n2} were given up after a single attempt' },
			'relay-digest': { effect: 'the digest run fell back to the default batch size and sent {n2} digests twice' }
		},
		detail: ["Only pods on the slow node saw a gap long enough to matter; the others reloaded before anything used the defaults.", "{plat} confirms the sync tool deletes and then writes rather than replacing the file in one step.", "Nothing in the config changed during the sync; the content before and after is identical.", "The defaults in {svc} are meant for local development, not for production."],
		titles: ['{svc} ran on default settings for over a minute', '{svc} ignored relay.config.json during a config sync', 'Default settings in {svc} after a platform config sync'],
		saw: [
			'For about eighty seconds from {tA}, {svc} ran with its built-in defaults instead of relay.config.json. Among other things, {effect}.',
			'Customers noticed before we did: {effect}. The log shows {svc} on default settings for a little over a minute at {tA}.'
		],
		herrings: ['deploy', 'config', 'node', 'bun'],
		steps: [
			['The log shows a reload at {tA} that found no file and loaded defaults, then a second reload about eighty seconds later that found the file again.'],
			['Platform\'s config sync replaces the mounted file by deleting it and writing a new one. On this run the node was slow, and the gap between the two lasted eighty seconds.'],
			['FileWatcher emits `change` when a watched file disappears as well as when it is modified, because the file\'s state goes from something to nothing. Our handler took the missing file to mean "no config" and loaded defaults.', 'A file that disappears counts as a change for FileWatcher, and it says so with the same `change` event. Our handler reads a missing file as an empty config.']
		],
		found: [
			'Cause: our reload handler treats a missing file as an empty config. The watcher reports a deletion as a change, as it should, and the handler did the wrong thing with it.',
			'The watcher was right to report the file going away. What turned that into an outage is our handler, which reads a missing file as "use the defaults".'
		],
		fix: ['The handler now keeps the current config when the file is missing and logs a warning. Deployed at {fixat}.', 'Same fix in both services that reload config: a missing file keeps the old config. {plat} is also looking at why the sync deletes before it writes.'],
		calm: ['The file came back and the next reload picked it up. Back on normal settings at {fixat}.'],
		follow: [
			{ text: 'Find out why the config sync deletes the file before writing the new one', short: 'the sync question', owner: 'platform' },
			{ text: 'Keep the current config on a missing file in every service that reloads', short: 'the missing-file fix', owner: 'team' },
			{ text: 'Alert when a service falls back to default settings', short: 'the fallback alert', owner: 'team' }
		],
		art: { metric: [{ label: '{Jobs} on default settings per minute', base: 0, peak: 260, shape: 'blip' }], log: ['!WARN  config file missing, using defaults', '!INFO  config reloaded from relay.config.json'] }
	},
	{
		module: 'watcher',
		services: ['relay-webhooks'],
		detail: ["CPU is the same on every pod and does not follow traffic: it is there at night too.", "A pod with the split rolled back uses 30% CPU at the same traffic.", "The per-endpoint files are small, a few hundred bytes each.", "Memory did not change with the split, only CPU."],
		titles: ['CPU on {svc} doubled after the config split', '{svc} slower since the per-endpoint config files', 'Latency of {svc} up four times'],
		saw: [
			'Since the per-endpoint config split went out, {svc} pods use about twice the CPU, and the 99th percentile delivery time went from 300 ms to 1.4 s.',
			'{app} asked why webhooks from {svc} have been arriving later since the start of the week. Delivery latency is up four times, and CPU on every pod is close to its limit.'
		],
		herrings: ['traffic', 'upstream', 'bun', 'memory'],
		steps: [
			['Profile from one pod: 41% of CPU in statSync, called from FileWatcher.'],
			['The split turned one relay.config.json into one file per customer endpoint, {k} files. Each pod watches all of them, and FileWatcher stats every watched file on every round, every 20 ms by default.', 'We watch {k} files now, one per endpoint, and FileWatcher checks every one of them each round. With the default interval of 20 ms that is a lot of stat calls for files that almost never change.'],
			['Between them, the files change about twice a day.']
		],
		found: [
			'Cause: watching {k} files at the default 20 ms interval. FileWatcher checks every file each round, so its cost grows with the number of files, and the split multiplied it.',
			'It is the watcher, used at a scale its default was never meant for: {k} files, all checked fifty times a second.'
		],
		fix: ['Set `interval: 2000` for the per-endpoint files; CPU back to normal after the deploy at {fixat}.', 'Went back to one file for now. The per-endpoint split returns once there is a better way to pick up changes.'],
		calm: ['Rolled back the release with the split at {fixat}. CPU and latency are normal again.'],
		follow: [
			{ text: 'Watch one index file that changes whenever any endpoint file does, instead of every file', short: 'the index file', owner: 'team' },
			{ text: 'Note in the Relay service template that the watcher interval matters with many files', short: 'the template note', owner: 'team' },
			{ text: 'Alert on delivery latency at the 99th percentile', short: 'the latency alert', owner: 'team' }
		],
		art: {
			metric: [
				{ label: 'CPU %', base: 30, peak: 88, shape: 'step' },
				{ label: 'p99 delivery ms', base: 300, peak: 1400, shape: 'step' }
			],
			raw: ['  self%  total%  function', '   41.2    41.9  statSync', '    9.7    52.3  #check (relay-kit/src/watcher.ts)', '    6.1     6.1  JSON.stringify', '    4.4    11.8  deliver (src/deliver.ts)', '    3.0     3.0  sign (src/signature.ts)']
		}
	},
	// Durations.
	{
		module: 'duration',
		services: ['relay-mailer', 'relay-digest', 'relay-exports', 'relay-webhooks', 'relay-audit', 'relay-billing-sync'],
		vars: {
			'relay-mailer': { setting: 'bounceWindow' },
			'relay-digest': { setting: 'catchUpWindow' },
			'relay-exports': { setting: 'linkLifetime' },
			'relay-webhooks': { setting: 'retryWindow' },
			'relay-audit': { setting: 'flushEvery' },
			'relay-billing-sync': { setting: 'reconcileEvery' }
		},
		choose: [
			{ val: '1h', fixed: '3600s', why: 'it knows ms, s and m and no other unit' },
			{ val: '1h', fixed: '3600s', why: 'hours are not among the units it accepts' },
			{ val: '1.5s', fixed: '1500ms', why: 'it takes whole numbers only' },
			{ val: '500 ms', fixed: '500ms', why: 'it trims spaces around a value but allows none between the number and the unit' },
			{ val: '90sec', fixed: '90s', why: 'the unit must be exactly ms, s or m' }
		],
		detail: ["The value used to be set in code; this change moved it into config for the first time.", "The config change itself was reviewed and approved by two people the day before.", "The config deploy went out to all pods at once, as config deploys do.", "Local runs of the service read config from a different file, so nobody saw the error before the deploy."],
		titles: ['{svc} down after a config deploy', 'Crash loop in {svc} after a settings change', 'Every {svc} pod failing at boot'],
		saw: [
			'Fifteen minutes after a config deploy at {tA}, every {svc} pod was in CrashLoopBackOff. The rollout had already replaced the old pods, so nothing was running.',
			'{svc} stopped answering at {tA}. All pods were restarting, each one exiting within a second of starting.'
		],
		herrings: ['upstream', 'node', 'bun', 'db'],
		steps: [
			['Every pod exits at boot with `Error: Not a duration: "{val}"`.'],
			['The config change set `{setting}` to `"{val}"`. parseDuration in relay-kit rejects it, because {why}, so the config loader throws and the process exits before the server starts.', 'parseDuration is strict: {why}. `{setting}` was changed to "{val}" this morning; the loader throws on it, and the process never gets as far as starting the server.'],
			['The readiness probe never passed, but the rollout had no rule to stop on that, so it replaced every old pod anyway.', 'The change passed review because nobody on it knew the format parseDuration expects.']
		],
		found: [
			'Cause: a duration written as "{val}", which parseDuration does not accept. The service cannot start without that setting.',
			'So one setting in a format relay-kit\'s parser rejects. Nothing else was wrong.'
		],
		fix: ['Changed the value to "{fixed}" and redeployed at {fixat}; pods up within a minute.', 'Reverted the config change at {fixat}. It goes out again as "{fixed}".'],
		follow: [
			{ text: 'Stop a rollout when the new pods fail readiness', short: 'the rollout guard', owner: 'platform' },
			{ text: 'Check duration settings with parseDuration before a config deploy goes out', short: 'the config check', owner: 'team' },
			{ text: 'Write down which formats duration settings accept, next to the settings', short: 'the format note', owner: 'team' }
		],
		art: {
			metric: [{ label: 'Pods ready', base: 4, peak: 0, shape: 'step' }, { label: 'Requests answered per minute', base: 1800, peak: 0, shape: 'step' }],
			trace: ['error: Not a duration: "{val}"', '      at parseDuration (/app/node_modules/relay-kit/src/duration.ts:10:20)', '      at loadConfig (/app/src/config.ts:{L}:{C})', '      at /app/src/main.ts:{L}:{C}'],
			kube: 'crash'
		}
	},
	// Outside relay-kit.
	{
		module: 'outside',
		services: ['relay-mailer'],
		detail: ["Other senders on the same provider, including the main app's own notifications, failed in the same minutes.", "The backlog sat in the main app's outbox the whole time, so nothing was lost.", "The provider's API answered our health checks normally throughout; only sends failed.", "No email was sent twice once sends recovered."],
		titles: ['Emails not sent for forty minutes', 'Mailer backlog during the evening', 'Every email failing from {svc}'],
		saw: [
			'Backlog alert for {svc} at {tA}. Every send was failing, and the backlog reached {n3} emails before sends started going through again.',
			'{sup} reported password reset emails not arriving, from about {tA}. The {svc} dashboard showed the failure rate at 100%.'
		],
		herrings: ['queue', 'deploy', 'dns', 'cache'],
		steps: [
			['Every send fails with 503 from the email provider about 200 ms after it starts. The queue moves fine: each job fails quickly, is logged, and the next one starts.'],
			['The email provider\'s status page said nothing for the first half hour, then posted "elevated error rates for API sends in EU regions".'],
			['Sends recovered on their own at {fixat}. The main app re-sent the failed ones and the backlog was gone within twenty minutes.']
		],
		found: ['Cause: an outage at the email provider. Nothing on our side was wrong; we only carried the backlog until they recovered.', 'The provider\'s incident report confirms it: a bad deploy on their side, rolled back after forty minutes.'],
		fix: ['Nothing to fix on our side. Watched the re-sent emails go out and checked the bounce rate afterwards; normal.', 'No change needed here. Posted the provider\'s incident link in the support channel for anyone answering tickets.'],
		calm: ['Sends started going through again at {fixat} without anything from us.'],
		follow: [
			{ text: 'Post the email provider\'s status feed in the Relay incident channel', short: 'the status feed', owner: 'team' },
			{ text: 'Decide whether a second email provider is worth it', short: 'the second-provider question', owner: 'team' },
			{ text: 'Support macro for late email during a provider outage', short: 'the support macro', owner: 'support' }
		],
		art: {
			alert: ['RelayBacklogHigh', 'oldest queued email is 11m old (threshold 10m)'],
			log: ['ERROR send failed id=em_{id} status=503 provider_code=service_unavailable ms={ms}'],
			metric: [
				{ label: 'Sent per minute', base: 900, peak: 0, shape: 'spike' },
				{ label: 'Failed per minute', base: 2, peak: 950, shape: 'spike' }
			]
		}
	},
	{
		module: 'outside',
		services: ['relay-webhooks'],
		hours: [8, 11],
		detail: ["Retries had been running all morning; every one failed the same way.", "The certificate on their endpoint was issued a year ago and was never set up to renew itself.", "Their endpoint answers plain HTTP with a redirect to HTTPS, so nothing gets through that way either.", "Their monitoring did not catch the expiry, and ours did not either, since we only watch failure rates per service."],
		titles: ['Webhook deliveries to {cust} failing', 'Support escalation: {cust} receiving no webhooks', 'All deliveries to one endpoint failing since midnight'],
		saw: [
			'Escalated by {sup}: {cust} say they have received no webhooks since midnight. Our dashboard shows every delivery to their endpoint failing.',
			'The per-endpoint failure panel shows one endpoint, {cust}\'s, at 100% failed since 00:00 UTC. They have opened a ticket.'
		],
		herrings: ['cache', 'deploy', 'server', 'config'],
		steps: [
			['The error on every attempt is `certificate has expired`. Their endpoint\'s certificate ran out at midnight.'],
			['Other customers\' deliveries are fine, including ones whose endpoints sit behind the same CDN.'],
			['{sup} passed it to {cust}\'s technical contact, who had the certificate renewed by mid-afternoon.']
		],
		found: ['Cause: the certificate on {cust}\'s own endpoint had expired. Nothing for us to change.', 'It was their certificate. Once it was renewed, deliveries went through on the next attempt.'],
		fix: ['After the renewal, replayed the failed deliveries from the outbox: {n3} events, all accepted.', 'Replayed everything since midnight once they confirmed the new certificate; their endpoint took the lot in twenty minutes.'],
		follow: [
			{ text: 'Email a customer when their endpoint has failed every delivery for a day', short: 'the failing-endpoint email', owner: 'app' },
			{ text: 'Add the outbox replay steps to the support macros', short: 'the replay macro', owner: 'support' },
			{ text: 'Show certificate expiry dates of customer endpoints on the dashboard', short: 'the expiry panel', owner: 'team' }
		],
		art: { metric: [{ label: 'Failed deliveries to the endpoint per hour', base: 0, peak: 340, shape: 'step' }, { label: 'All deliveries per hour', base: 52000, peak: 52000, shape: 'flat' }], log: ['ERROR delivery failed event={evt} endpoint=ep_{id0} err="certificate has expired" attempt={n}'] }
	},
	{
		module: 'outside',
		services: ['relay-audit', 'relay-exports'],
		vars: { 'relay-audit': { dbname: 'the audit database' }, 'relay-exports': { dbname: 'the reporting replica' } },
		detail: ["The failures are spread evenly over all pods and every route that writes.", "Reads were unaffected; only writes failed.", "The failover took about three minutes, which matches the length of the errors.", "No pod restarted; the connections came back by themselves."],
		titles: ['Errors from {svc} for three minutes', 'Burst of failed {jobs} in {svc}', '5xx alert for {svc} that cleared by itself'],
		saw: [
			'Between {tA} and {tB}, {svc} logged {n3} failed {jobs}, and the 5xx alert fired.',
			'The 5xx alert for {svc} paged at {tA} and resolved itself four minutes later. Writing it up because the errors were real.'
		],
		herrings: ['queue', 'server', 'deploy', 'memory'],
		steps: [
			['All the failures are `ECONNRESET` or `the database system is in recovery mode`.'],
			['{db} confirms: {dbname} was failed over at {tA} for planned maintenance. The notice went to the platform channel and not to ours.'],
			['The main app retried every failed request. Compared counts with {dbname}: nothing is missing.']
		],
		found: ['Cause: a planned failover of {dbname} that nobody told us about. Our side behaved as it should.', 'Planned maintenance on {dbname}, announced in a channel we do not read. No fault anywhere.'],
		fix: ['Nothing to fix.', 'Nothing to fix in {svc}; it reconnected on its own as designed.'],
		calm: ['The errors stopped at {tB} without any action from us.'],
		follow: [
			{ text: 'Send database maintenance notices to the Relay channel too', short: 'the notices', owner: 'db' },
			{ text: 'Log reconnects in {svc} at info level so a failover is visible', short: 'the reconnect log', owner: 'team' },
			{ text: 'Silence the 5xx alert during announced maintenance', short: 'the maintenance silence', owner: 'team' }
		],
		art: { metric: [{ label: 'Failed {jobs} per minute', base: 0, peak: 700, shape: 'blip' }], alert: ['RelayHigh5xx', '5xx ratio for {svc} at {pct}% over 2m'], log: ['ERROR write failed err="ECONNRESET" request_id={rid}', 'ERROR write failed err="the database system is in recovery mode" request_id={rid}'] }
	},
	{
		module: 'outside',
		services: ['relay-exports'],
		hours: [9, 11],
		detail: ["The oldest left-over file is from {d0}, the day after the platform change.", "Each failed export leaves between 50 MB and 2 GB behind.", "The volume was 40% full a week ago.", "Exports that fail early leave small files; the big ones fail late and leave most of an export behind."],
		titles: ['Every export failing within seconds', 'Exports broken since the morning', 'No exports finishing'],
		saw: ['Every export failed a few seconds after starting. {n2} customers were affected before we noticed.', '{sup} had five tickets about failed exports by ten. The {svc} error rate was at 100% and had been since early morning.'],
		herrings: ['queue', 'upstream', 'db', 'deploy'],
		steps: [
			['`ENOSPC: no space left on device` writing to `/tmp/exports`. The volume is 10 GB and full.'],
			['It is full of part-written files from exports that failed last week. Cleanup only runs when an export succeeds.'],
			['{plat} explains the rest: on {d0}, platform moved {svc} from node scratch space, which was wiped on every restart, to a fixed 10 GB volume that keeps its contents.']
		],
		found: ['Cause: the temporary volume filled with files from failed exports, and since the platform change it no longer gets wiped on restart. Nothing to do with the queue or the object store.', 'Disk full: left-overs from failed exports, kept since the move to a persistent volume.'],
		fix: ['Emptied `/tmp/exports` at {fixat}; exports work again. Re-ran the {n2} failed ones.', 'Cleared the volume and deployed a change that deletes the partial file when an export fails.'],
		follow: [
			{ text: 'Delete the partial file when an export fails', short: 'the cleanup fix', owner: 'team' },
			{ text: 'Alert when a Relay volume is 80% full', short: 'the volume alert', owner: 'platform' },
			{ text: 'Decide whether {svc} needs a persistent volume at all', short: 'the volume question', owner: 'platform' }
		],
		art: {
			metric: [{ label: 'Exports failed per hour', base: 0, peak: 40, shape: 'step' }, { label: 'Volume used %', base: 97, peak: 100, shape: 'step' }],
			log: ['ERROR export failed id=ex_{id} err="ENOSPC: no space left on device, write"'],
			raw: ['$ kubectl -n relay exec {pod} -- df -h /tmp/exports', 'Filesystem      Size  Used Avail Use% Mounted on', '/dev/nvme1n1     10G   10G     0 100% /tmp/exports']
		}
	},
	{
		module: 'outside',
		services: ['relay-billing-sync', 'relay-webhooks', 'relay-mailer'],
		vars: {
			'relay-billing-sync': { target: 'the billing provider', host: 'api.billing-provider.example' },
			'relay-webhooks': { target: 'customer endpoints', host: 'hooks.{custhost}.example' },
			'relay-mailer': { target: 'the email provider', host: 'api.mail-provider.example' }
		},
		detail: ["The failures do not cluster by host: every name we look up fails now and then.", "Platform says the new pool went live for Relay on {d0}.", "The errors started the day Relay pods first landed on the new pool.", "Retrying a failed lookup once succeeds every time."],
		titles: ['Intermittent lookup failures from {svc}', 'One call in fifty failing from {svc}', 'ENOTFOUND errors from {svc}'],
		saw: ['From {tA}, about one call in fifty from {svc} to {target} failed with `getaddrinfo ENOTFOUND`.', 'A low, steady error rate on {svc}, about 2%, started this morning and has not gone away.'],
		herrings: ['cache', 'upstream', 'deploy', 'server'],
		steps: [
			['Only pods on the new node pool fail. Pods on the old pool have no errors at all.'],
			['The new pool uses a node-local DNS cache, and it drops a share of lookups when it is busy.'],
			['{plat} reproduced it from a debug pod with a loop of lookups: 31 failures in 2,000.']
		],
		found: ['Cause: the DNS cache on the new node pool, which drops lookups under load. A platform change, not ours.', 'Name resolution on the new pool. {plat} has the fix; nothing in {svc} was wrong.'],
		fix: ['Platform moved Relay pods back to the old pool at {fixat} while they fix the DNS cache. Errors gone.', '{plat} raised the DNS cache\'s limits on the new pool at {fixat}. Error rate back to zero.'],
		follow: [
			{ text: 'Fix the DNS cache on the new pool before more services move there', short: 'the DNS fix', owner: 'platform' },
			{ text: 'Retry a call once when the lookup fails', short: 'the lookup retry', owner: 'team' },
			{ text: 'Add lookup errors to the Relay dashboard', short: 'the lookup panel', owner: 'team' }
		],
		art: {
			metric: [{ label: 'Lookup errors per minute', base: 0, peak: 30, shape: 'step' }, { label: 'Calls per minute', base: 1500, peak: 1500, shape: 'flat' }],
			log: ['ERROR call failed host={host} err="getaddrinfo ENOTFOUND {host}"'],
			raw: ['$ for i in $(seq 2000); do getent hosts {host} >/dev/null || echo fail; done | sort | uniq -c', '     31 fail']
		}
	},
	{
		module: 'outside',
		services: ['relay-billing-sync'],
		detail: ["Workspaces whose entries had not been refreshed since yesterday still show the right numbers.", "The billing provider's changelog announced the new layout three weeks ago, for accounts that opt in or are migrated.", "The main app shows 0 of 0 seats rather than an error, because it trusts what {svc} returns.", "Nothing in our code has changed for weeks."],
		titles: ['Workspaces shown as having no seats', 'Admins unable to invite anyone', 'Seat limits read as zero'],
		saw: ['From {tA}, the main app told {n2} workspaces they had no seats left, and their admins could not invite anyone.', '{sup} escalated: {cust}\'s admin is told they have 0 of 0 seats, and so are other workspaces.'],
		herrings: ['cache', 'deploy', 'server', 'db'],
		steps: [
			['Seat limits in {svc} are zero for every workspace loaded since {tA}. Older entries are fine.'],
			['The billing provider\'s subscription payload now has `quantity` under `items[0]` instead of at the top. Their API version changed for our account this morning.'],
			['Our parser reads `quantity` at the top, finds nothing, and turns it into 0.']
		],
		found: ['Cause: the billing provider moved the seat count in their payload, and our parser turned the missing field into zero seats.', 'Their payload changed shape under us. {svc} read nothing where the seat count used to be and called it zero.'],
		fix: ['Pinned the API version in the request header and redeployed at {fixat}. Seat limits correct again after the next refresh.', 'Parser now reads the new place and fails loudly when neither has a number. Deployed at {fixat}.'],
		follow: [
			{ text: 'Make the parser fail on a missing seat count instead of reading zero', short: 'the parser change', owner: 'team' },
			{ text: 'Subscribe to the billing provider\'s API changelog', short: 'the changelog subscription', owner: 'team' },
			{ text: 'Tell the affected workspaces what happened', short: 'the customer note', owner: 'support' }
		],
		art: { metric: [{ label: 'Workspaces showing zero seats', base: 0, peak: 600, shape: 'rise' }], raw: ['{', '  "id": "sub_{hex}",', '  "status": "active",', '  "items": [', '    { "price": "seat_monthly", "quantity": 40 }', '  ],', '  "current_period_end": 1793404800', '}'] }
	},
	{
		module: 'outside',
		services: ['relay-webhooks'],
		detail: ["Every affected event was created after {t0}; older events in the outbox look normal.", "Only event types built by the new serializer are affected; the rest still carry the workspace.", "The payloads are otherwise correct: event type, id and data are all there.", "Customers whose endpoints ignore the workspace field noticed nothing."],
		titles: ['Customers receiving webhook payloads without a workspace', 'Malformed webhook payloads', '{cust} rejecting our webhooks'],
		saw: ['{cust} reported webhook payloads with `"workspace": null` from about {tA}.', 'Deliveries to several endpoints started failing with 400 at {tA}; the customers\' endpoints reject the payloads.'],
		herrings: ['cache', 'queue', 'server', 'config'],
		steps: [
			['The payloads arrive from the main app like that; {svc} passes them on untouched.'],
			['The main app\'s release at {t0} changed the event serializer.'],
			['{app} confirmed it and rolled back at {fixat}.']
		],
		found: ['Cause: a main app release that sent events without the workspace field. {svc} delivered what it was given.', 'Not us: the main app\'s new serializer left the workspace out, and we passed the events on as they came.'],
		fix: ['After the rollback, the app team re-sent the affected events with the field filled in.', 'Re-sent the {n3} affected events from the outbox once the app team had corrected them.'],
		follow: [
			{ text: 'Agree an event schema with the app team and reject events that do not match it at intake', short: 'the schema', owner: 'app' },
			{ text: 'Warn customers in advance when the payload format changes', short: 'the change notice', owner: 'app' },
			{ text: 'Alert on a jump in 400s from customer endpoints', short: 'the 400 alert', owner: 'team' }
		],
		art: {
			metric: [{ label: '400 from customer endpoints per minute', base: 3, peak: 900, shape: 'step' }],
			raw: ['{', '  "type": "{evt}",', '  "id": "evt_{hex}",', '  "workspace": null,', '  "created_at": "{isoday}T{tA}:12Z",', '  "data": { "actor": "usr_{hex}" }', '}'],
			log: ['WARN  delivery rejected event={evt} endpoint=ep_{id} status=400 ms={ms}']
		}
	},
	{
		module: 'outside',
		services: ['relay-digest'],
		hours: [10, 13],
		detail: ["The run gets through about a hundred workspaces a minute until the 429s start, then about ten.", "The digest code has not changed in six weeks.", "The client handles 429 by trying again when the API says it may, which is why the run slowed down rather than failed.", "Other callers of the app API hit the same limits."],
		titles: ['Digest run took six hours', 'Daily digests arriving all day', 'Digest run far behind'],
		saw: ['This morning\'s digest run, which normally finishes by 07:40, was still going at {tA}.', 'Customers in the later batches got today\'s digest in the afternoon instead of first thing.'],
		herrings: ['queue', 'db', 'deploy', 'memory'],
		steps: [
			['Every call to the main app\'s API for workspace activity got 429 after the first hundred or so, and our client retries them one by one.'],
			['The app team turned on per-client rate limits on {d0}. Our service token got the default limit, ten times lower than what a digest run needs.'],
			['{app} raised our token\'s limit at {fixat}, and the run finished an hour later.']
		],
		found: ['Cause: the main app API\'s new rate limit, applied to our token at the default.', 'Rate limiting on the app API, which nobody told us about. The digest code and its queue were fine.'],
		fix: ['No change on our side once the limit was raised.', 'Asked the app team to put our token on the internal-services limit for good.'],
		follow: [
			{ text: 'Agree rate limits for Relay tokens with the app team in writing', short: 'the limits agreement', owner: 'app' },
			{ text: 'Log 429s from the app API at warning level', short: 'the 429 log', owner: 'team' },
			{ text: 'Make the digest run report how far through it is', short: 'the progress report', owner: 'team' }
		],
		art: {
			log: ['WARN  GET /api/workspaces/{ws}/activity 429 retry_after=2', 'INFO  digest built workspace={ws} items={n}'],
			metric: [
				{ label: 'Digests done', base: 900, peak: 60, shape: 'step' },
				{ label: '429 from the app API', base: 0, peak: 2200, shape: 'step' }
			]
		}
	},
	{
		module: 'outside',
		services: ['relay-exports'],
		detail: ["The exports themselves are fine: the files sit in scratch space, built and never uploaded.", "Uploads from other services to the same bucket work, with their own keys.", "The scratch space is filling with built exports, about {n2} so far.", "The link email has its own log line, and there has been none since {tA}."],
		titles: ['Export links not sent', 'Exports built but never delivered', 'Customers not getting their export emails'],
		saw: ['From {tA}, exports were built but no download links went out. {sup} had {n1} tickets by midday.', '{n2} exports finished building today and not one link reached a customer.'],
		herrings: ['queue', 'deploy', 'dns', 'node'],
		steps: [
			['The upload to the object store fails with `403 InvalidAccessKeyId`, and the link email is only sent after a successful upload.'],
			['Security rotated the object store key on {d0}. The new key went into the secret store under a new name.'],
			['Our deployment still reads the old name, which security removed this morning.']
		],
		found: ['Cause: the object store key was rotated and {svc} still pointed at the old secret.', 'A rotated key and a deployment that still named the old secret. Nothing in the export code.'],
		fix: ['Pointed the deployment at the new secret and redeployed at {fixat}; re-ran the {n2} failed uploads.', 'New secret wired in at {fixat}. The failed exports were rebuilt and their links sent.'],
		follow: [
			{ text: 'Tell Relay when a secret it uses is rotated', short: 'the rotation notice', owner: 'platform' },
			{ text: 'Fail the export loudly when the upload fails, instead of finishing quietly without a link', short: 'the loud failure', owner: 'team' },
			{ text: 'Re-send links to the customers affected', short: 'the re-send', owner: 'support' }
		],
		art: { metric: [{ label: 'Exports built per hour', base: 30, peak: 30, shape: 'flat' }, { label: 'Links sent per hour', base: 30, peak: 0, shape: 'step' }], log: ['ERROR upload failed id=ex_{id} status=403 code=InvalidAccessKeyId', 'INFO  export started id=ex_{id} workspace={ws} rows={rows}'] }
	},
	{
		module: 'outside',
		services: ['relay-mailer'],
		hours: [12, 16],
		detail: ["The 429s started at {t0} and eased off as the newsletter went out.", "Nothing about our own send volume changed today.", "Marketing's tool sends in bursts, so the 429s come and go every few minutes.", "Invoices and receipts were late as well, but nobody asked about those."],
		titles: ['Password reset emails up to an hour late', 'Emails late during the afternoon', 'Late transactional email'],
		saw: ['Password reset emails arrived up to an hour late between {tA} and {tB}, and support had {n2} tickets.', 'Emails from {svc} were going out slowly all afternoon; some took fifty minutes.'],
		herrings: ['queue', 'cache', 'deploy', 'node'],
		steps: [
			['The email provider is answering our sends with 429 `account sending rate exceeded` and asking us to retry.'],
			['Our account is shared with marketing, who sent the {month} newsletter to 380,000 addresses at {t0}.'],
			['Their tool and {svc} draw on the same sending limit, and the newsletter used almost all of it.']
		],
		found: ['Cause: marketing\'s newsletter used up the sending limit of the email account we share with them.', 'Shared sending limit. Not the queue and not the templates.'],
		fix: ['The newsletter finished at {fixat} and our sends caught up within fifteen minutes.', 'Marketing paused the newsletter at {fixat}; our sends caught up and they resumed in the evening.'],
		follow: [
			{ text: 'Move transactional email to its own sub-account with its own limit', short: 'the sub-account', owner: 'team' },
			{ text: 'Ask marketing to tell us before large sends', short: 'the heads-up', owner: 'support' },
			{ text: 'Alert on 429s from the email provider', short: 'the 429 alert', owner: 'team' }
		],
		art: { metric: [{ label: 'Sends deferred per minute', base: 0, peak: 700, shape: 'rise' }, { label: 'Sent per minute', base: 900, peak: 120, shape: 'step' }], log: ['WARN  send deferred id=em_{id} status=429 reason="account sending rate exceeded"', 'INFO  sent kind=password_reset id=em_{id} ms={ms}'] }
	},
	{
		module: 'outside',
		services: ['relay-webhooks', 'relay-audit', 'relay-billing-sync'],
		detail: ["The certificate controller's events show a failed renewal every day for three weeks.", "Calls from inside the cluster that skip the certificate check went through, which is how we knew {svc} itself was up.", "{svc}'s own access log shows no requests from the main app at all since {tA}.", "The pods have not restarted and answer health checks through the mesh."],
		titles: ['Main app unable to reach {svc}', 'TLS errors on calls to {svc}', 'Every call to {svc} failing from the main app'],
		saw: ['From {tA}, every call from the main app to {svc} failed with a TLS error. {svc} itself saw no requests at all.', '{app} paged us at {tA}: the main app could not reach {svc}, and its logs were full of `CERT_HAS_EXPIRED`.'],
		herrings: ['server', 'deploy', 'dns', 'node'],
		steps: [
			['The certificate presented on {svc}\'s internal hostname expired at {tA}.'],
			['Certificates for internal hostnames are renewed by platform\'s certificate controller. Its renewal for our namespace has been failing for three weeks: the DNS record it needs for the challenge was removed in a clean-up.'],
			['{plat} recreated the record and forced a renewal at {fixat}.']
		],
		found: ['Cause: the certificate for {svc}\'s internal hostname expired because platform\'s renewal had been failing quietly for three weeks. Requests never reached {svc}.', 'An expired certificate on the platform side. The service was healthy throughout.'],
		fix: ['New certificate in place at {fixat}; calls succeed again.', 'Renewed at {fixat}. The main app recovered on its next calls.'],
		follow: [
			{ text: 'Alert on certificates within fourteen days of expiry', short: 'the expiry alert', owner: 'platform' },
			{ text: 'Alert when a certificate renewal has failed more than twice', short: 'the renewal alert', owner: 'platform' },
			{ text: 'Have the main app retry the calls to {svc} that failed in this window', short: 'the retry of failed calls', owner: 'app' }
		],
		art: { metric: [{ label: 'Failed calls from the main app per minute', base: 0, peak: 1900, shape: 'step' }, { label: 'Requests reaching {svc} per minute', base: 1900, peak: 0, shape: 'step' }], raw: ['$ openssl s_client -connect {svc}.relay.svc:443 -servername {svc}.relay.svc </dev/null 2>/dev/null | openssl x509 -noout -dates', 'notBefore={notbefore} 00:00:00 2026 GMT', 'notAfter={notafter} {tA}:00 2026 GMT'] }
	},
	{
		module: 'outside',
		services: allServices,
		quiet: true,
		detail: ["Our metrics-based panels show nothing unusual at all.", "Every service on the cluster went quiet in the same minute.", "The log collector runs on every node and was changed by platform this morning.", "Alerts based on metrics stayed green throughout."],
		titles: ['{svc} looked dead but was not', 'No logs from {svc} for an hour', '"No logs" alert for {svc}'],
		saw: ['The "no logs received" alert for {svc} fired at {tA}. The dashboards built on logs went flat, which looked like the service had stopped.', 'At {tA} the {svc} panels on the log dashboard dropped to zero all at once, and the on-call channel filled with questions about whether {svc} was down.'],
		herrings: ['server', 'queue', 'deploy', 'node'],
		steps: [
			['The pods are running and answering. Metrics, which do not go through the log pipeline, show {svc} handling its usual load.'],
			['No service has logs since {tA}, not only ours. The log collector on the cluster stopped shipping after a config change on the platform side.'],
			['{plat} rolled the collector back at {fixat}. The logs from the gap were kept on the nodes and arrived over the next hour.']
		],
		found: ['Cause: the log collector stopped after a platform config change. {svc} was fine all along; we were only blind.', 'Not a Relay incident in the end: the log pipeline went quiet, and our log-based alerts took that for silence from the service.'],
		fix: ['Nothing to fix in {svc}.', 'Nothing to fix on our side once the collector was back.'],
		follow: [
			{ text: 'Base the Relay "is it alive" alerts on metrics, not on logs', short: 'the metrics-based alert', owner: 'team' },
			{ text: 'Alert on the log collector itself', short: 'the collector alert', owner: 'platform' }
		],
		art: {
			alert: ['RelayNoLogs', 'no log lines from {svc} for 10m'],
			metric: [
				{ label: 'Log lines per minute', base: 5200, peak: 0, shape: 'step' },
				{ label: 'Requests per minute (metrics)', base: 2100, peak: 2100, shape: 'flat' }
			]
		}
	},
	{
		module: 'outside',
		services: ['relay-billing-sync', 'relay-audit', 'relay-webhooks'],
		detail: ["The request ids show the same call arriving dozens of times.", "The pod restart that started it was routine: a node upgrade by platform.", "Each failed call from the main app turns into up to a hundred calls: ten retries at two levels.", "The pod that restarted was back within forty seconds; the retries went on for an hour."],
		titles: ['{svc} overloaded by the main app\'s retries', 'Request rate to {svc} up twentyfold', 'A small blip in {svc} turned into an hour of errors'],
		saw: ['A restart of one {svc} pod at {tA} should have been invisible. Instead the request rate to {svc} went up twenty times and stayed there for an hour, with errors throughout.', 'From {tA}, {svc} received about twenty times its usual traffic, all from the main app, and could not keep up.'],
		herrings: ['deploy', 'cache', 'db', 'memory'],
		steps: [
			['Most of the traffic is the same requests, again and again.'],
			['The main app\'s client for {svc} changed in its release on {d0}: it now retries a failed call up to ten times, and the code that calls it retries as well.'],
			['{app} confirmed it and turned the retries down to one at {fixat}. Traffic was back to normal in five minutes.']
		],
		found: ['Cause: the main app\'s new retry settings, which turned one failed call into dozens. {svc} was the victim, not the cause.', 'Retries on the app side, stacked two layers deep. The pod restart only started it.'],
		fix: ['Nothing to change in {svc}.', 'No change in {svc}; the app team is reworking their client.'],
		follow: [
			{ text: 'Agree a retry policy for calls to Relay services with the app team', short: 'the retry policy', owner: 'app' },
			{ text: 'Have {svc} answer 429 when it is over capacity instead of slowing down for everyone', short: 'the load shedding', owner: 'team' }
		],
		art: {
			metric: [
				{ label: 'Requests per minute', base: 1800, peak: 36000, shape: 'step' },
				{ label: 'Errors per minute', base: 1, peak: 4200, shape: 'step' }
			],
			log: ['INFO  POST {path} 200 ms={ms} request_id={dupid}', 'WARN  POST {path} 503 ms={ms} request_id={dupid}']
		}
	},
	// Never found.
	{
		module: 'unknown',
		services: allServices,
		detail: ["The load balancer's own metrics show the 502s but no backend marked unhealthy.", "Other teams behind the same load balancer saw the same four minutes.", "The four minutes do not match any deploy or scheduled job on our side.", "Request ids of the failed requests do not appear in any pod's access log."],
		titles: ['Short burst of 502s across the Relay services', 'Four minutes of 502 from the load balancer', '502s for every Relay service at once'],
		saw: ['For about four minutes from {tA}, the load balancer answered 502 to roughly 8% of requests for every Relay service at once.', 'The 5xx alert fired for four services within a minute of each other, {svc} first. All of it was 502 from the load balancer.'],
		herrings: ['server', 'deploy', 'node', 'dns'],
		steps: [
			['No pod restarted, nothing was deployed, and no service logged an error at that time. The requests that got 502 never reached our pods.'],
			['{plat} found no change and no node event on the platform side.'],
			['A case is open with the load balancer vendor, with the request ids of a sample of the failed requests.']
		],
		found: ['We have not found a cause. The pattern fits the load balancer itself, but nothing in its logs confirms it.', 'No cause found. Everything we can see points away from the services and at the load balancer, which says it saw nothing.'],
		fix: ['Nothing to fix that we know of.'],
		coda: ['The vendor closed the case without a finding.', 'The vendor says maintenance in their region at that time may explain it, but cannot confirm it.'],
		follow: [
			{ text: 'Keep the vendor case open until they give a real answer', short: 'the vendor case', owner: 'platform' },
			{ text: 'Record request ids at the load balancer for a week in case it happens again', short: 'the request-id logging', owner: 'platform' }
		],
		art: { alert: ['RelayHigh5xx', '5xx ratio for {svc} at {pct}% over 2m'], metric: [{ label: '502 per minute', base: 0, peak: 900, shape: 'blip' }] }
	},
	{
		module: 'unknown',
		services: ['relay-webhooks', 'relay-billing-sync', 'relay-audit'],
		hours: [12, 14],
		detail: ["Calls from {svc} to everything it depends on were no slower than usual.", "The latency rose and fell gradually, not in a step.", "No deploy, config change or platform change happened that afternoon.", "The slow requests are slow throughout, not stuck at one point."],
		titles: ['{svc} slow for an afternoon', 'Latency of {svc} three times normal', '{svc} 99th percentile up from lunch until five'],
		saw: ['From {tA} until about 17:00, the 99th percentile latency of {svc} was three times its normal value.', '{app} reported that calls to {svc} were slow all afternoon. Our numbers agree: the 99th percentile went from 80 ms to about 250 ms.'],
		herrings: ['cache', 'db', 'traffic', 'memory'],
		steps: [
			['CPU, memory and garbage collection all look normal. Request rate normal for a {weekday}.'],
			['The slow requests are spread over every route and every pod.'],
			['{plat} suspects a noisy neighbour on the nodes. They were replaced in the routine upgrade the next day, so there is nothing left to look at.']
		],
		found: ['No cause found. It went back to normal at about 17:00 without any change on our side.', 'We do not know. Nothing in {svc} changed before or after.'],
		fix: ['Nothing done.'],
		coda: ['No repeat since. Leaving it here in case it comes back.', 'Platform compared the replaced nodes with the new ones and found nothing either.'],
		follow: [
			{ text: 'Keep node-level metrics for longer than two days', short: 'the metrics retention', owner: 'platform' },
			{ text: 'Add per-route latency panels for {svc}', short: 'the latency panels', owner: 'team' }
		],
		art: {
			metric: [
				{ label: 'p99 ms', base: 80, peak: 250, shape: 'step' },
				{ label: 'CPU %', base: 30, peak: 31, shape: 'flat' }
			]
		}
	},
	{
		module: 'unknown',
		services: allServices,
		quiet: true,
		detail: ["Memory on the pod was normal just before the crash.", "The pod had been up for {n1} days.", "The crash happened during a quiet period, with little traffic.", "No other Bun service in the company reported a crash that day."],
		titles: ['One {svc} pod exited with code 139', 'Segfault in {svc}', 'Unexplained crash of a {svc} pod'],
		saw: ['At {tA}, one {svc} pod exited with code 139 and restarted. Nothing else happened, but a segfault in a Bun service deserves a write-up.', 'A single {svc} pod crashed with a segmentation fault at {tA}. The other pods were unaffected, and the replacement came up cleanly.'],
		herrings: ['memory', 'node', 'deploy', 'traffic'],
		steps: [
			['No core dump: the pods do not keep them. The last log lines before the crash are ordinary.'],
			['Searched Bun\'s issue tracker for crashes on our patch release. Two reports look similar, neither with a known cause.'],
			['It has not happened again on any pod.']
		],
		found: ['No cause found. It may be a bug in the runtime; without a core dump there is nothing more to go on.', 'Unknown. Our best guess is the runtime, which we cannot confirm.'],
		fix: ['Nothing to fix that we know of.'],
		coda: ['The pods moved to the next Bun patch release in the routine upgrade. No repeat since.', 'Still no repeat. Leaving the write-up here in case it comes back.'],
		follow: [
			{ text: 'Keep core dumps from Relay pods for a week', short: 'the core dumps', owner: 'platform' },
			{ text: 'Move to the next Bun patch release when it is out', short: 'the Bun upgrade', owner: 'team' }
		],
		art: { kube: 'single' }
	}
];

// Shared parts of a write-up.
const acks = ['Looking.', 'At a laptop in five minutes.', 'On it. Opening the {svc} dashboard.', 'Here. Reading the last hour of logs.', 'From home. Pulling up the {svc} logs.', 'Got it. Starting with the dashboards.', 'First look in a moment.'];
const comms = [
	'Posted in #relay-incidents and let support know we are on it.',
	'{sup} asks whether to tell customers anything. Said not yet; next update in half an hour.',
	'Status page: "We are looking into a problem with {jobs}."',
	'{sup} has {n1} tickets so far and is holding the replies until we know more.',
	'Updated #relay-incidents: impact limited to {svc}, cause not known yet.',
	'Let the app team know, since their dashboards will show it too.'
];
const resolvedComms = ['Told support it is sorted and they can answer the held tickets.', 'Status page set to resolved.', 'Posted the all-clear in #relay-incidents.'];
const joins = ['{second} joined. Splitting it: I take the logs, {second} the dashboards.', 'Pulled {second} in, since they know {svc} better than I do.'];
const joinsSecond = ['Here too. I will take the dashboards; {oncall} has the logs.', 'Joining. Looking at the pods while {oncall} reads the logs.'];
const tangents = [
	'The {svc} dashboard keeps resetting its time range to fifteen minutes. Note for later.',
	'The alert\'s runbook link still points at the old wiki. Note for later.',
	'The incident bot posted the wrong service name in its summary. Ignore it.',
	'Laptop on 9%, moving to the kitchen.',
	'Log search is slow tonight; queries over an hour take a minute to come back.',
	'Reminder to self: the staging copy of {svc} is two releases behind, so do not compare with it.',
	'The VPN dropped twice in ten minutes. Back now.',
	'Someone in #general asked whether the site is down. It is not; replied.'
];
const handovers = ['Handing over to {next}, whose shift starts now. Where we are: {ruled} ruled out, cause not found yet.', 'End of my shift. {next} takes it from here; we talked it through on a call. Ruled out so far: {ruled}.', 'Handover to {next}. Still open: the cause. Ruled out: {ruled}.'];
const updates = ['Update in #relay-incidents: {ruled} ruled out, still looking.', 'Update for support: still investigating, no change for customers yet. Ruled out so far: {ruled}.', 'Half-hourly update posted: impact unchanged, {ruled} ruled out.'];
const takeovers = ['Taking over from {oncall}. Read the notes so far.', 'Here, and caught up on the notes.'];
const prevNotes = ['This looks like {prev} on {pdate} again. Starting from its notes.', 'Same symptoms as {prev} ({pdate}, {psvc}). Reading that write-up first.', '{prev} from {pdate} started like this too.'];
const downs = ['Standing down. Error rate normal for thirty minutes.', 'Resolved in the tool. Notes stay here for the review.', 'Closing the incident. Follow-ups at the review.', 'All normal again. Signing off.'];
const downsOpen = ['Standing down for now. Cause not known; picking it up at the review.', 'Closing as mitigated. We still owe ourselves a cause.', 'Quiet again. Leaving the cause for daylight.'];
const theories = ['Working theory at stand-down: {suspect}. To be confirmed.', 'My bet, for the record, is {suspect}. Will check properly tomorrow.', 'Putting it down to {suspect} for now.'];
const laterIntros = ['Picked this up again. Going back over the logs from that night.', 'Looked into the cause this morning.', 'Spent the afternoon on this.'];
const corrections = ['Correction to the notes above: it was not {suspect}.', 'The working theory at stand-down was wrong. Not {suspect}.', 'Revisiting this, because {suspect} never explained the pattern. It was not that.'];
const reviewHeads = ['Review with {names}.', 'Review ({names}).', 'Retro with {names}.'];
const pasteIntros: Record<string, string[]> = {
	metric: ['From the {svc} dashboard:', 'Numbers from the dashboard:', 'Dashboard, as it looked then:'],
	log: ['From the pod logs:', 'Log excerpt:', 'What the logs say:'],
	trace: ['The trace:', 'Last lines before the exit:', 'Stack trace from one of the pods:'],
	kube: ['Pods:', 'State of the pods:', 'For the record:'],
	raw: ['For reference:', 'Pasting this:', 'This is what I see:'],
	diff: ['The config change:', 'The diff that went out:']
};
const afterTangents = ['Moved these onto the new board; the old one is read-only from next week.', 'Linked this write-up from the on-call handbook as an example.', 'Reminder that the review notes template changed; this one uses the old one.'];

const impactLoud = [
	'Impact: {svc} for about {n4} minutes; {n1} customers wrote to support.',
	'Roughly {n3} {jobs} were affected. {sup} had {n1} tickets by the end of it.',
	'Customers affected that we know of: {cust}, {cust2} and a handful of smaller workspaces.',
	'The impact stayed inside {svc} and the customers who rely on it; nothing went on the public status page.',
	'Support count at the end: {n1} tickets, two of them from {cust}.'
];
const impactQuiet = ['No customer impact that we know of.', 'Nobody outside the team noticed.', 'No tickets and no customer impact.'];
const observations = [
	'The alert fired within a couple of minutes of the start. That part worked.',
	'It took far too long to get from the page to the right dashboard.',
	'The runbook had nothing on this.',
	'Support heard about it from customers before we told them.',
	'The first suspect cost most of the time, and the evidence against it was on the dashboard from the start.',
	'Nobody on the call knew {svc} well, which slowed the first hour.',
	'The status page update went up quickly and saved support a lot of replies.',
	'Log search being slow made everything take twice as long.',
	'We had a second person online within ten minutes.',
	'No dashboard panel showed the problem directly; we pieced it together from logs.',
	'An hour later and this would have run into the evening peak.',
	'Two of us looked at the same thing at once without saying so.',
	'The alert threshold is too generous: nobody was paged for the first {n1} minutes.',
	'Customer impact was smaller than it looked at first.',
	'Two people restarted pods at the same time without telling each other.',
	'The notes were written as we went, which made this review easy.',
	'Nobody knew who owned the dashboard we needed, so nobody could fix its broken panel on the spot.'
];
const supportNotes = [
	'Support side: {n2} tickets in all, answered with the standard reply by the next morning.',
	'{cust} asked for a written account of what happened. Sent today.',
	'Credits: none asked for, none offered.',
	'Closed the last ticket about this today.',
	'Two customers asked whether it could happen again. Told them what we have changed.'
];

// Evidence the on-call pasted when ruling a suspect out.
const commits = ['Log the request id on intake errors', 'Move signature code into its own module', 'Bump bun-types', 'Add the workspace id to export file names', 'Tidy the config loader', 'Document the new environment variables', 'Drop the unused admin route', 'Rename deliverTo to deliverToEndpoint', 'Read the port from config', 'Return 400 on a malformed intake body', 'Upgrade the JSON schema library', 'Shorten intake log lines', 'Add a health route for the mesh', 'Split the intake handler into two files', 'Use the shared logger everywhere', 'Remove the old switch for v1 payloads', 'Add a metric for intake body size', 'Correct a typo in an error message', 'Pin the base image', 'Reformat after the linter upgrade', 'Show the build number on the status route', 'Lower the default log level'];
const configCommits = ['Lower log level to info', 'Add the intake path', 'Raise the intake body limit', 'Move the port into config', 'Turn on debug logging for an investigation', 'Turn debug logging off again', 'Add the second region', 'Remove the old provider URL'];
const evidence = (r: Rand, key: HerringKey, svc: string, slots: Record<string, string>, date: string, minute: number): string => {
	const table = (head: string[], rows: string[][]) =>
		[`| ${head.join(' | ')} |`, `| --- | ${head.slice(1).map(() => '---:').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
	if (key === 'deploy') {
		const minor = int(r, 4, 31);
		return fence([`$ git log --oneline v2.${minor}.0..v2.${minor + 1}.0`, ...shuffle(r, commits).slice(0, int(r, 3, 7)).map((message) => `${hex(r, 7)} ${message}`)]);
	}
	if (key === 'upstream' || key === 'traffic') {
		const hours = int(r, 5, 7);
		const base = key === 'traffic' ? Number(slots.n2) * 10 : int(r, 2000, 40000);
		return key === 'traffic'
			? table(['Time (UTC)', 'Requests per minute', 'Same time last week'], Array.from({ length: hours }, (_, i) => [hhmm(minute - (hours - 1 - i) * 30), thousands(Math.round(base * (0.85 + r() * 0.3))), thousands(Math.round(base * (0.85 + r() * 0.3)))]))
			: table(['Hour (UTC)', 'Calls', 'p50 ms', 'p95 ms', 'Errors'], Array.from({ length: hours }, (_, i) => {
					const p50 = int(r, 40, 120);
					return [`${hhmm(minute - (hours - 1 - i) * 60).slice(0, 2)}:00`, thousands(Math.round(base * (0.8 + r() * 0.4))), String(p50), String(Math.round(p50 * (2 + r() * 2))), String(int(r, 0, 30))];
				}));
	}
	if (key === 'db')
		return fence([`$ psql -h ${svc === 'relay-exports' ? 'reporting-replica' : 'relay-db'} -c "select state, count(*) from pg_stat_activity where usename = 'relay' group by state"`, '  state  | count', '---------+-------', ` active  | ${String(int(r, 2, 9)).padStart(5)}`, ` idle    | ${String(int(r, 20, 90)).padStart(5)}`, '(2 rows)']);
	if (key === 'node') {
		const row = (a: string, b: string, c: string, d: string) => `${a.padEnd(36)}${b.padEnd(10)}${c.padEnd(14)}${d}`;
		const zones = ['a', 'b', 'c'];
		return fence([`$ kubectl -n relay get pods -l app=${svc} -o wide`, row('NAME', 'STATUS', 'IP', 'NODE'), ...shuffle(r, zones).map((zone) => row(podName(r, svc), 'Running', `10.42.${int(r, 0, 31)}.${int(r, 2, 250)}`, `pool-${zone}-${hex(r, 5)}`))]);
	}
	if (key === 'queue') {
		const lines: string[] = [];
		let second = minute * 60;
		for (let i = int(r, 4, 6); i > 0; i--) {
			const id = hex(r, 6);
			second += int(r, 0, 2);
			lines.push(`${date}T${hhmm(Math.floor(second / 60))}:${pad(second % 60)}.${pad(int(r, 0, 999), 3)}Z INFO  job started id=${id}`);
			second += int(r, 0, 2);
			lines.push(`${date}T${hhmm(Math.floor(second / 60))}:${pad(second % 60)}.${pad(int(r, 0, 999), 3)}Z INFO  job ended id=${id} ms=${int(r, 40, 900)}`);
		}
		return fence(lines);
	}
	if (key === 'cache')
		return fence([`$ kubectl -n relay exec ${podName(r, svc)} -- curl -s localhost:${slots.port}/debug/cache`, `{ "entries": ${int(r, 40, 4000)}, "refreshing": 0, "oldest_loaded_s": ${int(r, 30, 3600)}, "loads_last_hour": ${int(r, 10, 900)} }`]);
	if (key === 'server') {
		const lines: string[] = [];
		let second = minute * 60;
		for (let i = int(r, 6, 10); i > 0; i--) {
			second += int(r, 0, 3);
			lines.push(`${date}T${hhmm(Math.floor(second / 60))}:${pad(second % 60)}.${pad(int(r, 0, 999), 3)}Z INFO  ${pick(r, ['POST', 'POST', 'GET'])} ${slots.path} ${pick(r, ['200', '201', '202', '200'])} ms=${int(r, 1, 40)}`);
		}
		return fence(lines);
	}
	if (key === 'config') {
		let back = Number(slots.n1);
		const lines = ["$ git log --format='%h %ad %an: %s' --date=short -- relay.config.json | head -4"];
		for (let i = 0; i < 4; i++) {
			lines.push(`${hex(r, 7)} ${iso(Number(slots.dayIndex) - back)} ${pick(r, team)}: ${i === 0 ? 'Lower log level to info' : pick(r, configCommits)}`);
			back += int(r, 4, 20);
		}
		return fence(lines);
	}
	if (key === 'memory')
		return table(['Pod', 'Memory MB now', 'Same time last week'], Array.from({ length: int(r, 3, 4) }, () => {
			const now = int(r, 160, 420);
			return [podName(r, svc), String(now), String(Math.round(now * (0.9 + r() * 0.2)))];
		}));
	if (key === 'dns') return fence([`$ for i in $(seq 2000); do getent hosts ${svc === 'relay-mailer' ? 'api.mail-provider.example' : svc === 'relay-billing-sync' ? 'api.billing-provider.example' : 'relay-db.relay.svc'} >/dev/null || echo fail; done | wc -l`, '0']);
	const patch = int(r, 3, 9);
	return fence([`$ kubectl -n relay exec ${podName(r, svc)} -- bun --version`, `1.3.${patch}`, `$ docker run --rm registry.internal/${svc}:previous bun --version`, `1.3.${patch - 1}`]);
};

const discussion: [string, string][] = [
	['Do we need {A} as well as {B}?', 'Yes. They cover different failures, and either one alone would have left a gap this time.'],
	['Is {A} realistic this quarter?', 'Probably, if nothing bigger lands on us. It is small.'],
	['Should {A} wait for {B}?', 'No, they do not depend on each other.'],
	['Who reviews {A} when it is ready?', 'I will, {X}. Tag me.'],
	['Can {A} be one ticket for all the Relay services rather than one each?', 'Fine by me, as long as somebody owns it.']
];

// Follow-ups and what became of them.
const ownersOf: Record<Owner, string[]> = { team, platform, app: appTeam, support, db: dba };
const boards: Record<Owner, [string, number, number]> = { team: ['RLY', 1100, 1999], platform: ['PLAT', 300, 999], app: ['APP', 2000, 4999], support: ['SUP', 100, 899], db: ['DBA', 40, 299] };
const teamNames: Record<Owner, string> = { team: 'the Relay team', platform: 'platform', app: 'the app team', support: 'support', db: 'the database team' };
const done = ['Done: {F} ({T}).', 'Finished {F} on {d}; closing {T}.', 'Crossed off {F} ({T}).', 'Closed {T}, {F}. Finished and checked.'];
const bumps = ['No progress on {F} yet. {O} says it is next after the current sprint.', 'Still open: {F}. {O} keeps it.', 'Nudged {O} about {F}. On the board, not started.', 'Asked about {F} at stand-up. {O} has not got to it yet.'];
const handed = ['Moving {F} to {team2}, where it belongs. {O2} has taken it as {T2}.', 'Handing {F} to {O2}, who looks after that area now ({T2}).', 'Moved {F} to {team2}; {O2} owns it there as {T2}.'];
const dropped = ['Dropping {F}: it would cost more than the problem it prevents.', 'Dropping {F}. We agreed at the retro it is not worth it for how rarely this happens.', 'Dropping {F}; nobody could make the case for it when we looked again.'];
const reassigned = ['{O} is on leave for three weeks, so {O2} takes {F}.', '{O} is buried in the cluster move; {O2} has picked up {F}.'];

// Pasted output.
const events = ['invoice.paid', 'member.added', 'project.archived', 'comment.created', 'seat.changed', 'workspace.renamed', 'task.completed'];
const kinds = ['invitation', 'password_reset', 'invoice', 'receipt', 'mention'];
const wsId = (r: Rand) => `ws_${b36(r, 6)}`;
const podName = (r: Rand, svc: string) => `${svc}-${hex(r, 9)}-${b36(r, 5)}`;
const lineFill = (r: Rand, text: string, slots: Record<string, string>, counter: { n: number; age?: number }): string =>
	fill(
		text.replace(/\{(id|ws|ms|evt|kind|rows|bytes|n|rid|L|C|hex|att|age)\}/g, (_, key: string) => {
			if (key === 'id') return hex(r, 6);
			if (key === 'ws') return wsId(r);
			if (key === 'ms') return String(int(r, 3, 480));
			if (key === 'evt') return pick(r, events);
			if (key === 'kind') return pick(r, kinds);
			if (key === 'rows') return thousands(int(r, 40, 90000));
			if (key === 'bytes') return thousands(int(r, 2000, 9000000));
			if (key === 'n') return String(int(r, 1, 9));
			if (key === 'rid') return `${hex(r, 8)}-${hex(r, 4)}`;
			if (key === 'L') return String(int(r, 12, 180));
			if (key === 'C') return String(int(r, 5, 40));
			if (key === 'att') return String((counter.n += int(r, 1, 3)));
			if (key === 'age') return thousands((counter.age = (counter.age ?? 90000) + int(r, 1, 30)));
			return hex(r, 12);
		}),
		slots
	);
const fence = (lines: string[], lang = 'text') => '```' + lang + '\n' + lines.join('\n') + '\n```';

const logPaste = (r: Rand, svc: string, date: string, minute: number, lines: string[], slots: Record<string, string>): string => {
	const out: string[] = [];
	let ms = (minute * 60 + int(r, 0, 59)) * 1000;
	const counter = { n: int(r, 200, 9000), age: Number(slots.agebase) };
	const used = new Set<string>();
	for (let i = int(r, 14, 24); i > 0; i--) {
		ms += int(r, 20, 25000);
		const second = Math.floor(ms / 1000);
		const once = lines.find((line) => line.startsWith('!') && !used.has(line));
		const choices = [...lines.filter((line) => !line.startsWith('!')), ...(once ? [once] : [])];
		let line = choices.length && r() < 0.55 ? pick(r, choices) : pick(r, services[svc]!.info);
		if (line.startsWith('!')) {
			used.add(line);
			line = line.slice(1);
		}
		out.push(`${date}T${hhmm(Math.floor(second / 60))}:${pad(second % 60)}.${pad(ms % 1000, 3)}Z ${lineFill(r, line, slots, counter)}`);
	}
	return fence(out);
};

const format = (value: number) => thousands(Math.round(value));
const metricPaste = (r: Rand, metrics: Metric[], minute: number, day: number, days: boolean, slots: Record<string, string>): string => {
	const rows = int(r, 10, 15);
	const onset = days ? Math.max(1, rows - 1 - Number(slots.n1)) : int(r, 2, 4);
	const every = pick(r, [5, 10]);
	const lines = [`| ${days ? 'Day' : 'Time (UTC)'} | ${metrics.map((m) => fill(m.label, slots)).join(' | ')} |`, `| --- | ${metrics.map(() => '---:').join(' | ')} |`];
	for (let i = 0; i < rows; i++) {
		const label = days ? short(day - rows + 1 + i) : hhmm(minute - onset * every + i * every);
		const values = metrics.map((m) => {
			const jitter = (x: number) => x * (0.92 + r() * 0.16);
			const t = (i - onset + 1) / (rows - onset);
			const v =
				m.shape === 'flat' || i < onset
					? jitter(m.base)
					: m.shape === 'rise'
						? jitter(m.base + (m.peak - m.base) * t)
						: m.shape === 'step'
							? jitter(m.peak)
							: m.shape === 'spike' || m.shape === 'blip'
								? jitter(i - onset < (m.shape === 'blip' ? 1 : 3) ? m.peak : m.base)
								: jitter(m.base + ((m.peak - m.base) * (((i - onset) % 4) + 1)) / 4);
			return format(v);
		});
		lines.push(`| ${label} | ${values.join(' | ')} |`);
	}
	return lines.join('\n');
};

const kubePaste = (r: Rand, svc: string, state: Kube): string => {
	const row = (name: string, ready: string, status: string, restarts: string, age: string) =>
		`${name.padEnd(36)}${ready.padEnd(8)}${status.padEnd(19)}${restarts.padEnd(16)}${age}`;
	const out = [`$ kubectl -n relay get pods -l app=${svc}`, row('NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE')];
	const count = int(r, 3, 5);
	const pods = Array.from({ length: count }, () => podName(r, svc));
	for (const [i, pod] of pods.entries()) {
		if (state === 'crash') {
			const n = int(r, 4, 14);
			out.push(row(pod, '1/2', r() < 0.75 ? 'CrashLoopBackOff' : 'Error', `${n} (${int(r, 5, 59)}s ago)`, `${int(r, 20, 59)}m`));
		} else if (state === 'oom') {
			const n = int(r, 0, 3);
			out.push(row(pod, '2/2', i === 0 ? 'OOMKilled' : 'Running', n ? `${n} (${int(r, 2, 50)}m ago)` : '0', `${int(r, 1, 6)}d`));
		} else if (state === 'restarts' || state === 'single') {
			out.push(row(pod, '2/2', 'Running', state === 'single' && i > 0 ? '0' : `1 (${int(r, 2, 9)}m ago)`, `${int(r, 2, 9)}d`));
		} else if (state === 'terminating') {
			out.push(row(pod, i < 2 ? '1/2' : '2/2', i < 2 ? 'Terminating' : 'Running', '0', i < 2 ? `${int(r, 2, 6)}d` : `${int(r, 20, 90)}s`));
		} else out.push(row(pod, '1/2', 'Running', '0', `${int(r, 2, 9)}m`));
	}
	if (state === 'oom')
		out.push(
			`$ kubectl -n relay describe pod ${pods[0]} | grep -A4 'Last State'`,
			'    Last State:     Terminated',
			'      Reason:       OOMKilled',
			'      Exit Code:    137',
			`      Started:      ${int(r, 1, 9)}h ago`
		);
	return fence(out);
};

const fill = (text: string, slots: Record<string, string>): string => {
	let out = text;
	for (let pass = 0; pass < 3 && /\{\w+\}/.test(out); pass++) out = out.replace(/\{(\w+)\}/g, (match, key: string) => slots[key] ?? match);
	return out;
};

interface Previous {
	ref: string;
	day: number;
	svc: string;
}

const write = (index: number, topic: Topic, ref: string, day: number, prev: Previous | undefined): string => {
	const r = mulberry32(0x2b1d0000 + index * 7919);
	const svc = pick(r, topic.services);
	const service = services[svc]!;
	const oncall = pick(r, team);
	const second = pick(r, team.filter((name) => name !== oncall));
	const next = pick(r, team.filter((name) => name !== oncall && name !== second));
	const [cust, cust2] = shuffle(r, customers) as [string, string];
	const start = topic.hours ? int(r, topic.hours[0] * 60, topic.hours[1] * 60) : int(r, 0, 1439);
	const n1 = int(r, 3, 9);
	const n3 = int(r, 12, 480) * 100;
	const date = iso(day);
	const slots: Record<string, string> = {
		svc,
		up: service.up,
		Up: cap(service.up),
		up2: service.up2,
		Up2: cap(service.up2),
		job: service.job,
		jobs: service.jobs,
		Jobs: cap(service.jobs),
		cached: service.cached,
		cust,
		cust2,
		custhost: cust.toLowerCase().replace(/[^a-z]+/g, ''),
		oncall: first(oncall),
		second: first(second),
		next: first(next),
		sup: pick(r, support),
		app: pick(r, appTeam),
		plat: pick(r, platform),
		db: pick(r, dba),
		n1: String(n1),
		n1x: String(n1 * 2),
		n2: String(int(r, 20, 90)),
		n3: thousands(n3),
		n4: String(int(r, 25, 160)),
		n5: String(int(r, 3, 40)),
		n6: thousands(Math.round(n3 * (0.55 + r() * 0.3))),
		n7: String(int(r, 6, 40)),
		k: thousands(int(r, 900, 3900)),
		pct: String(int(r, 12, 96)),
		ws: wsId(r),
		ws2: wsId(r),
		id0: hex(r, 6),
		jid: `${service.job.split(' ')[0]}_${hex(r, 10)}`,
		dupid: `${hex(r, 8)}-${hex(r, 4)}`,
		hex: hex(r, 14),
		port: String(int(r, 33000, 47000)),
		ip: `10.42.${int(r, 0, 31)}.${int(r, 2, 250)}`,
		pod: podName(r, svc),
		pod2: podName(r, svc),
		hot: svc === 'relay-billing-sync' ? 'plans' : svc === 'relay-webhooks' ? `endpoint:ep_${hex(r, 6)}` : 'templates:default',
		path: svc === 'relay-audit' ? '/audit' : svc === 'relay-mailer' ? '/send' : svc === 'relay-webhooks' ? '/events' : '/seats/reconcile',
		route: svc === 'relay-webhooks' ? '/internal/endpoints' : '/seats/{ws}',
		handler0: svc === 'relay-webhooks' ? 'POST /endpoints/verify' : svc === 'relay-audit' ? 'GET /audit/search' : 'POST /seats/reconcile',
		fixat: hhmm(start + 90),
		tA: hhmm(start),
		tB: hhmm(start + int(r, 20, 90)),
		t0: hhmm(start - int(r, 30, 300)),
		d0: short(day - int(r, 1, 20)),
		dn: short(day - n1),
		dmid: short(day - Math.max(1, Math.floor(n1 / 2))),
		agebase: String(n1 * 86400 + int(r, 0, 40000)),
		isoday: date,
		dayIndex: String(day),
		notafter: `${monthNames[dateOf(day).getUTCMonth()]!.slice(0, 3)} ${dateOf(day).getUTCDate()}`,
		notbefore: `${monthNames[dateOf(day - 90).getUTCMonth()]!.slice(0, 3)} ${dateOf(day - 90).getUTCDate()}`,
		weekday: weekday(day),
		month: monthNames[dateOf(day).getUTCMonth()]!
	};
	for (const [key, value] of Object.entries(topic.vars?.[svc] ?? {})) {
		slots[key] = value;
		slots[cap(key)] ??= cap(value);
	}
	if (topic.choose) Object.assign(slots, pick(r, topic.choose));
	if (prev) Object.assign(slots, { prev: prev.ref, pdate: short(prev.day), psvc: prev.svc });

	const mode = topic.calm ? pick(r, ['live', 'live', 'later', 'corrected'] as const) : 'live';
	const suspects = shuffle(r, topic.herrings).slice(0, pick(r, [2, 2, 3]));
	slots.suspect = fill(herrings[suspects[0]!].name, slots);
	const phrasing = suspects.map(() => int(r, 0, 2));

	// The pastes: one that shows the symptom early, one that shows the cause.
	const early: string[] = [];
	const late: string[] = [];
	const art = topic.art;
	const paste = (kind: string, minute: number): string => {
		if (kind === 'metric') return metricPaste(r, art.metric!, start, day, art.days === true, slots);
		if (kind === 'kube') return kubePaste(r, svc, art.kube!);
		if (kind === 'log') return logPaste(r, svc, date, start + int(r, -2, 15), art.log!, slots);
		if (kind === 'trace') return fence([...art.trace!.map((line) => lineFill(r, line, slots, { n: 0 })), '', `Bun v1.3.${int(r, 2, 9)} (Linux x64)`]);
		if (kind === 'raw') return fence(art.raw!.map((line) => lineFill(r, line, slots, { n: 0 })));
		return fence(art.diff!.map((line) => fill(line, slots)), 'diff');
	};
	if (art.metric) early.push('metric');
	if (art.kube) (early.length ? late : early).push('kube');
	if (art.log) late.push('log');
	if (art.trace) late.unshift('trace');
	if (art.raw) late.push('raw');
	if (art.diff) late.unshift('diff');

	let minute = start;
	let lead = oncall;
	const notes: string[] = [];
	const note = (who: string, text: string, low = 3, high = 18) => {
		minute += int(r, low, high);
		if (text.includes('{fixat}')) slots.fixat = hhmm(minute - int(r, 0, 4));
		notes.push(`**${hhmm(minute)}** ${first(who)}: ${fill(text, slots)}`);
	};
	const withPaste = (who: string, kind: string) => {
		note(who, pick(r, pasteIntros[kind]!));
		notes[notes.length - 1] += `\n\n${paste(kind, minute)}`;
	};
	const extra = shuffle(r, topic.detail).slice(0, pick(r, [2, 3, 3]));
	const steps = (who: () => string, emit: (who: string, text: string) => void, pastes: string[]) => {
		topic.steps.forEach((phrasings, i) => {
			emit(who(), pick(r, phrasings));
			if (i === 0 && pastes[0]) pasteAfter(pastes[0]);
			if (i === 1 && pastes[1] && r() < 0.85) pasteAfter(pastes[1]);
			if (i === 2 && pastes[2] && r() < 0.6) pasteAfter(pastes[2]);
			if (extra[i]) emit(who(), extra[i]!);
		});
	};
	let pasteAfter = (kind: string) => withPaste(lead, kind);
	const commsLeft = shuffle(r, comms);
	const nextComms = () => commsLeft.shift() ?? pick(r, resolvedComms);

	const alert = art.alert && r() < 0.7;
	const opener = alert ? 'the pager' : topic.quiet ? oncall : pick(r, [`${slots.sup} from support`, `${slots.app} from the app team`, oncall]);
	if (alert) notes.push(`**${hhmm(minute)}** Pager: [FIRING] ${art.alert![0]}: ${fill(art.alert![1], slots)}`);
	note(oncall, `${alert ? 'Acked. ' : ''}${pick(r, acks)}`, 1, 6);
	if (prev && r() < 0.7) note(oncall, pick(r, prevNotes), 1, 5);
	if (early[0] && r() < 0.92) withPaste(oncall, early[0]);
	if (r() < 0.5) note(oncall, nextComms());
	const joined = r() < 0.45;
	if (joined && r() < 0.5) note(second, pick(r, joinsSecond));
	else if (joined) note(oncall, pick(r, joins));
	const h1 = herrings[suspects[0]!];
	const talk = shuffle(r, exchanges).slice(0, pick(r, [1, 1, 2]));
	const exchange = () => {
		const pair = talk.shift();
		if (!pair) return;
		note(slots[pair[0]]!, pair[1], 2, 12);
		note(lead, pair[2], 1, 5);
	};
	note(lead, h1.suspect[phrasing[0]! % h1.suspect.length]!);
	if (mode !== 'corrected' && r() < 0.6) note(lead, pick(r, checks[suspects[0]!]!), 3, 12);
	if (r() < 0.3) note(lead, pick(r, tangents), 2, 8);
	const ruled: string[] = [];
	const ruledText = () => (ruled.length > 1 ? `${ruled.slice(0, -1).join(', ')} and ${ruled.at(-1)}` : ruled[0] ?? 'nothing yet');
	const ruleOut = (who: string, key: HerringKey, low: number, high: number) => {
		note(who, herrings[key].clear[phrasing[suspects.indexOf(key)]! % herrings[key].clear.length]!, low, high);
		if (r() < 0.9) notes[notes.length - 1] += `\n\n${evidence(r, key, svc, slots, date, minute)}`;
		ruled.push(fill(herrings[key].name, slots));
	};
	if (mode !== 'corrected') {
		ruleOut(joined && r() < 0.5 ? second : lead, suspects[0]!, 6, 25);
		exchange();
		if (r() < 0.5) note(lead, pick(r, updates).replace('{ruled}', ruledText()), 4, 15);
		for (const key of suspects.slice(1)) {
			if (r() < 0.4) note(lead, nextComms());
			note(lead, herrings[key].suspect[phrasing[suspects.indexOf(key)]! % herrings[key].suspect.length]!);
			if (r() < 0.5) note(lead, pick(r, checks[key]!), 3, 12);
			ruleOut(lead, key, 5, 20);
		}
	}
	exchange();
	if (mode !== 'corrected' && suspects.length > 1 && r() < 0.5) note(lead, pick(r, updates).replace('{ruled}', ruledText()), 4, 15);
	if (mode === 'live' && r() < 0.35) {
		note(oncall, pick(r, handovers).replace('{ruled}', ruledText()), 10, 40);
		lead = next;
		note(next, pick(r, takeovers), 2, 10);
	}
	if (mode === 'live') {
		steps(() => (joined && r() < 0.3 ? second : lead), (who, text) => note(who, text, 5, 22), late);
		note(lead, pick(r, topic.found), 5, 25);
		note(lead, pick(r, topic.fix), 10, 40);
		if (r() < 0.25) note(lead, pick(r, resolvedComms));
		note(lead, pick(r, downs), 15, 40);
	} else {
		note(lead, pick(r, topic.calm!), 15, 50);
		if (mode === 'corrected') note(lead, pick(r, theories), 2, 6);
		note(lead, pick(r, downsOpen), 10, 30);
	}

	// Afterwards: dated notes, the cause where it came late, the follow-ups and what became of them.
	const later: string[] = [];
	let today = day;
	const dated = (who: string, text: string, low = 1, high = 4) => {
		today = Math.min(LIMIT, today + int(r, low, high));
		later.push(`**${short(today)}** ${first(who)}: ${fill(text, slots)}`);
	};
	if (mode !== 'live') {
		const who = pick(r, team);
		const opening = mode === 'later' ? pick(r, laterIntros) : pick(r, corrections);
		let firstStep = true;
		pasteAfter = (kind: string) => {
			later[later.length - 1] += `\n\n${paste(kind, start + int(r, 10, 60))}`;
		};
		steps(
			() => who,
			(author, text) => {
				dated(author, firstStep ? `${opening} ${text}` : text, firstStep ? 1 : 0, firstStep ? 5 : 0);
				firstStep = false;
			},
			late
		);
		slots.fixat = hhmm(int(r, 540, 1080));
		dated(who, pick(r, topic.found), 0, 0);
		dated(who, pick(r, topic.fix), 0, 2);
	}
	if (topic.coda && r() < 0.7) dated(pick(r, [...platform, ...team]), pick(r, topic.coda), 3, 12);

	const chosen = shuffle(r, topic.follow).slice(0, Math.min(topic.follow.length, int(r, 2, 3)));
	const reviewers = shuffle(r, [oncall, second, next, slots.sup!]).slice(0, int(r, 2, 4)).map(first);
	const names = reviewers.length > 1 ? `${reviewers.slice(0, -1).join(', ')} and ${reviewers.at(-1)}` : reviewers[0]!;
	const newTicket = (owner: Owner) => {
		const [prefix, low, high] = boards[owner];
		return `${prefix}-${int(r, low, high)}`;
	};
	const items = chosen.map((follow) => ({ follow, person: pick(r, ownersOf[follow.owner]), ticket: newTicket(follow.owner) }));
	today = Math.min(LIMIT, today + int(r, 1, 6));
	const noted = r() < 0.7 ? shuffle(r, observations).slice(0, int(r, 2, 4)) : [];
	later.push(
		`**${short(today)}** ${fill(pick(r, reviewHeads), { ...slots, names })}\n\n` +
			(noted.length ? `${noted.map((line) => `- ${fill(line, slots)}`).join('\n')}\n\n` : '') +
			'Follow-ups:\n\n' +
			items.map(({ follow, person, ticket }) => `- ${fill(follow.text, slots)} (${person}, ${ticket})`).join('\n')
	);
	if (!topic.quiet && r() < 0.45) dated(slots.sup!, pick(r, supportNotes), 0, 3);
	if (items.length > 1 && r() < 0.45) {
		const [a, b] = items.map((item) => fill(item.follow.short, slots));
		const [x, y] = shuffle(r, team);
		const [question, answer] = pick(r, discussion);
		dated(x!, fill(question!, { ...slots, A: a!, B: b! }), 0, 2);
		dated(y!, fill(answer!, { ...slots, A: a!, B: b!, X: first(x!) }), 0, 1);
	}
	if (prev && r() < 0.4) later[later.length - 1] += `\n\n${fill('Second time this has happened: see {prev}.', slots)}`;
	for (const { follow, person, ticket } of shuffle(r, items)) {
		const roll = r();
		const F = fill(follow.short, slots);
		const base = { ...slots, F, Fc: cap(F), O: first(person), T: ticket };
		if (roll < 0.36) dated(person, fill(pick(r, done), { ...base, d: short(Math.min(LIMIT, today + int(r, 1, 5))) }), 2, 12);
		else if (roll < 0.52) dated(pick(r, team.filter((name) => name !== person)), fill(pick(r, bumps), base), 5, 15);
		else if (roll < 0.66 && follow.owner !== 'team') {
			const owner: Owner = 'team';
			const other = pick(r, ownersOf[owner]);
			dated(person, fill(pick(r, handed), { ...base, team2: teamNames[owner], O2: first(other), T2: newTicket(owner) }), 3, 12);
		} else if (roll < 0.76) dated(person, fill(pick(r, dropped), base), 3, 12);
		else if (roll < 0.86 || (roll < 0.66 && follow.owner === 'team')) {
			const other = pick(r, ownersOf[follow.owner].filter((name) => name !== person));
			dated(pick(r, team), fill(pick(r, reassigned), { ...base, O2: first(other ?? person) }), 4, 14);
		}
	}
	if (r() < 0.15) dated(pick(r, team), pick(r, afterTangents), 1, 6);

	const title = fill(pick(r, topic.titles), slots);
	const severity = r() < 0.5 ? ` · severity ${int(r, 2, 3)}` : '';
	return [
		`# ${ref}: ${title.startsWith('relay-') ? title : cap(title)}`,
		`**Service:** ${svc} · **Opened:** ${date} ${hhmm(start)} UTC, by ${opener}${severity} · **On call:** ${oncall}`,
		...(r() < 0.5 ? [pick(r, context[svc]!)] : []),
		fill(pick(r, topic.saw), slots) + (r() < 0.7 ? ` ${fill(pick(r, topic.quiet ? impactQuiet : impactLoud), slots)}` : ''),
		pick(r, ['## Timeline', '## Notes', '## Incident notes']),
		...notes,
		pick(r, ['## Afterwards', '## After the incident', '## Review and follow-ups']),
		...later
	]
		.join('\n\n')
		.replace(/([A-Za-z])s's\b/g, "$1s'") + '\n';
};

const folder = join(root, 'docs', 'incidents');
mkdirSync(folder, { recursive: true });
const order = mulberry32(20261113);
const sequence: Topic[] = [];
while (sequence.length < ITEMS) sequence.push(...shuffle(order, topics));
sequence.length = ITEMS;
const seen = new Map<Topic, Previous>();
let number = 2300;
for (const [index, topic] of sequence.entries()) {
	number += int(order, 1, 4);
	const day = Math.round((index * LAST) / Math.max(1, ITEMS - 1));
	const ref = `INC-${number}`;
	const text = write(index, topic, ref, day, seen.get(topic));
	const svc = /\*\*Service:\*\* (\S+)/.exec(text)![1]!;
	seen.set(topic, { ref, day, svc });
	writeFileSync(join(folder, `${ref}.md`), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Incident write-ups\n\nThe write-ups of the ${ITEMS} incidents the Relay on-call opened between ${short(0)} and ${short(LAST)} 2026, one file per\nincident, exported from the incident tool for the relay-kit 0.4.0 review. Each file holds the notes in the order\nthey were written, during the incident and afterwards. The export leaves out the tool's own fields, and pasted\noutput is as its writer pasted it.\n`
);
