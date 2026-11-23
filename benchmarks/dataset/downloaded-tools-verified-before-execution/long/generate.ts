// Writes the long material of this entry's long tasks: the threads of Saltmarsh's #preview-help channel, where
// the app's developers ask the platform team about their slipway previews, from 3 September 2026 (the day after
// slipway 0.2.0) to 18 November 2026, one Markdown file each, under docs/preview-help/. Topics that depend on
// 0.3.0's waiting helm start on 15 October; outages happen on their own day only. Deterministic: fixed seeds,
// no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// How many threads to write. The dates, times and file names are derived from it.
const ITEMS = 440;

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
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');
const podChars = (r: Rand, length: number) => Array.from({ length }, () => 'bcdfghjklmnpqrstvwxz2456789'[Math.floor(r() * 27)]).join('');
const first = (name: string) => name.split(' ')[0]!;

// The release name slipway makes today (internal/release): "pr-", the branch in lower case with slashes and
// spaces turned into hyphens, cut to 53 characters. Nothing else is changed.
const releaseOf = (branch: string) => {
	const name = 'pr-' + branch.trim().toLowerCase().replace(/[/ ]/g, '-');
	return name.length > 53 ? name.slice(0, 53) : name;
};

// People. The platform team owns slipway; the app's developers sit in product teams; the rest are other teams
// a thread can be handed to.
const platform = ['Ines Carvalho', 'Tomasz Wierzbicki', 'Ruth Abernethy', 'Kofi Mensah'];
const teams: Record<string, string[]> = {
	Checkout: ['Dmitri Volkov', 'Aisling Byrne', 'Marco Bellini', 'Sunita Rao', 'Jakub Horak'],
	Search: ['Priya Nair', 'Jonas Weber', 'Olu Adeyemi', 'Freya Lindberg'],
	Accounts: ['Chloe Martin', 'Rafael Souza', 'Hana Kim', 'Declan Moore'],
	Catalogue: ['Liam Doherty', 'Zofia Nowak', 'Kwabena Asante', 'Ilse Brandt', 'Yusuf Demir'],
	Messaging: ['Sara Lindholm', 'Arun Pillai', 'Tess Gallagher'],
	Reporting: ['Beatriz Ramos', 'Callum Fraser', 'Mei Chen', 'Anders Holm'],
	'Partner API': ['Tariq Aziz', 'Elise Fontaine', 'Ravi Menon'],
	'Mobile web': ['Nico Jansen', 'Grace Otieno', 'Paula Esteves'],
	Billing: ['Fatima Zahra', 'Oscar Lund', 'Bridget Kearney']
};
const teamNames = Object.keys(teams);
// Developers who write in short lower-case bursts.
const terse = new Set(['Marco Bellini', 'Olu Adeyemi', 'Rafael Souza', 'Kwabena Asante', 'Arun Pillai', 'Mei Chen', 'Nico Jansen', 'Oscar Lund', 'Jakub Horak', 'Ravi Menon', 'Yusuf Demir']);
type Hand = 'infrastructure' | 'release engineering' | 'data' | 'security' | 'payments';
const handTeams: Record<Hand, { people: string[]; board: string }> = {
	infrastructure: { people: ['Mags Holloway', 'Dev Raman'], board: 'INF' },
	'release engineering': { people: ['Anouk Peeters', 'Sam Okoro'], board: 'RE' },
	data: { people: ['Hiroshi Tanabe', 'Petra Lindgren'], board: 'DATA' },
	security: { people: ['Yasmin Farouk', 'Ben Adler'], board: 'SEC' },
	payments: { people: ['Lucia Romero', 'Owen Pritchard'], board: 'PAY' }
};

// What each team works on, for branch names.
const work: Record<string, string[]> = {
	Checkout: ['basket-merge', 'address-lookup', 'delivery-slots', 'voucher-stacking', 'payment-retry', 'receipt-email', 'gift-card-balance', 'express-checkout'],
	Search: ['facet-counts', 'synonyms', 'typo-tolerance', 'ranking-boosts', 'autocomplete', 'zero-results-page', 'sort-by-rating'],
	Accounts: ['password-reset', 'two-factor', 'profile-photo', 'email-change', 'session-list', 'marketing-consent', 'account-deletion'],
	Catalogue: ['product-images', 'bundles', 'size-variants', 'stock-badges', 'pricing-rules', 'colour-swatches', 'bulk-edit'],
	Messaging: ['inbox-threads', 'push-preferences', 'weekly-digest', 'template-editor', 'unread-counts'],
	Reporting: ['exports', 'sales-dashboard', 'csv-columns', 'monthly-summary', 'refund-report', 'date-filters'],
	'Partner API': ['webhook-retries', 'order-feed', 'rate-limits', 'partner-onboarding', 'pagination'],
	'Mobile web': ['bottom-nav', 'offline-banner', 'pull-to-refresh', 'image-lazy-load', 'tap-targets'],
	Billing: ['invoices', 'dunning-emails', 'proration', 'tax-rates', 'credit-notes', 'plan-changes']
};
const tickets: Record<string, string> = { Checkout: 'chk', Search: 'srch', Accounts: 'acc', Catalogue: 'cat', Messaging: 'msg', Reporting: 'rep', 'Partner API': 'papi', 'Mobile web': 'mw', Billing: 'bil' };
// What each piece of work does, as its author would describe it.
const features: Record<string, string> = {
	'basket-merge': "merges a guest basket into the account's basket when someone signs in at checkout",
	'address-lookup': 'adds postcode lookup to the delivery address form',
	'delivery-slots': 'lets customers pick a two-hour delivery slot instead of a whole day',
	'voucher-stacking': 'allows one percentage voucher and one free-delivery voucher on the same order',
	'payment-retry': 'offers a second payment method when the first card is declined, instead of emptying the form',
	'receipt-email': 'redesigns the order receipt email and the page that shows it',
	'gift-card-balance': 'shows the remaining gift card balance on the payment step',
	'express-checkout': 'adds a one-page checkout for returning customers with a saved card',
	'facet-counts': 'shows how many results each filter would leave before you click it',
	synonyms: "makes a search for 'sofa' find couches, and the other way round",
	'typo-tolerance': 'lets one typo through in queries longer than five letters',
	'ranking-boosts': 'ranks products that are in stock near the customer higher',
	autocomplete: 'replaces the autocomplete with one that suggests categories as well as products',
	'zero-results-page': 'shows popular products instead of an empty page when nothing matches',
	'sort-by-rating': 'adds sorting by average rating, with a minimum number of reviews',
	'password-reset': 'moves password reset to a six-digit code instead of a link',
	'two-factor': 'adds authenticator apps as a second factor next to text messages',
	'profile-photo': 'lets customers add a profile photo and crops it in the browser',
	'email-change': 'asks people to confirm both the old and the new address when they change their email',
	'session-list': 'shows customers where they are signed in and lets them sign out other devices',
	'marketing-consent': 'splits the single marketing checkbox into email, post and text',
	'account-deletion': 'lets customers delete their own account, with a 14-day grace period',
	'product-images': 'adds a zoomable gallery with up to twelve images per product',
	bundles: 'lets merchandisers sell a set of products together at one price',
	'size-variants': 'puts every size of a product on one page instead of one page per size',
	'stock-badges': "shows 'only a few left' when stock drops under five",
	'pricing-rules': 'lets merchandisers schedule price changes ahead of time',
	'colour-swatches': 'replaces the colour dropdown on product pages with swatches',
	'bulk-edit': 'lets the catalogue team change a hundred products at once from a spreadsheet',
	'inbox-threads': 'groups customer messages into one thread per order',
	'push-preferences': 'gives customers a page to choose which notifications they get',
	'weekly-digest': 'sends a weekly summary of price drops on saved items',
	'template-editor': 'lets the CRM team edit message templates without a deploy',
	'unread-counts': 'adds unread counts to the inbox icon',
	exports: 'moves the large exports to a background job that emails a link when it is done',
	'sales-dashboard': 'rebuilds the sales dashboard on the new reporting tables',
	'csv-columns': 'lets people choose which columns go into a CSV export',
	'monthly-summary': 'adds a monthly summary page for store managers',
	'refund-report': 'adds a refunds report split by reason',
	'date-filters': 'replaces the date filters with presets such as last week and last quarter',
	'webhook-retries': 'retries failed partner webhooks with a growing gap between attempts',
	'order-feed': 'adds an order feed that partners can page through',
	'rate-limits': 'gives each partner its own request limit instead of one shared one',
	'partner-onboarding': 'replaces the onboarding spreadsheet with a form in the partner portal',
	pagination: 'moves every list endpoint of the partner API to cursor pagination',
	'bottom-nav': 'adds a bottom navigation bar on small screens',
	'offline-banner': 'shows a banner when the connection drops and holds basket changes until it is back',
	'pull-to-refresh': 'adds pull to refresh on the order history page',
	'image-lazy-load': 'loads product images only as they scroll into view',
	'tap-targets': 'makes every button at least 44 pixels tall on phones',
	invoices: 'moves invoice PDFs to the new template',
	'dunning-emails': 'rewrites the reminder emails for failed subscription payments',
	proration: 'charges the difference when someone changes plan in the middle of a month',
	'tax-rates': 'works out tax per delivery address instead of per store',
	'credit-notes': 'issues credit notes for partial refunds',
	'plan-changes': 'lets customers switch between monthly and annual plans'
};
const contextLines = ['For context, the branch {feature}.', 'The branch {feature}, in case that matters.', "It's the change that {feature}.", 'Background: this is the work that {feature}.'];
const initials = (name: string) => name.split(' ').map((part) => part[0]!.toLowerCase()).join('');
const plainBranch = (r: Rand, team: string, who: string): string => {
	const w = pick(r, work[team]!);
	switch (int(r, 0, 5)) {
		case 0:
			return `feature/${w}`;
		case 1:
			return `fix/${tickets[team]}-${int(r, 1000, 2999)}-${w}`;
		case 2:
			return `${initials(who)}/${w}`;
		case 3:
			return `feature/${w}-${pick(r, ['part-2', 'cleanup', 'api', 'ui', 'backend', 'copy'])}`;
		case 4:
			return `${tickets[team]}-${int(r, 1000, 2999)}/${w}`;
		default:
			return `chore/${w}`;
	}
};
// Ticket titles, as the tracker's create-branch button turns them into branch names.
const longTitles = [
	'make-the-address-form-remember-the-last-used-postcode',
	'show-the-delivery-estimate-on-the-product-page-when-stock-is-low',
	'hide-the-voucher-field-until-the-basket-has-items-in-it',
	'move-the-refund-button-into-the-order-details-panel',
	'let-partners-page-through-the-order-feed-by-updated-date',
	'send-the-weekly-digest-in-the-recipients-own-time-zone',
	'add-a-reason-field-when-support-staff-cancel-an-order',
	'stop-resetting-the-search-sort-order-when-filters-change',
	'keep-the-selected-size-when-switching-between-colours',
	'warn-before-a-plan-change-would-lose-unused-credit',
	'group-the-monthly-summary-by-region-and-then-by-store',
	'retry-failed-webhook-deliveries-with-a-longer-gap-each-time'
];

// Pasted output.
const block = (lines: string[]) => '```\n' + lines.join('\n') + '\n```';
const columns = (rows: string[][], gap = 3) => {
	const widths = rows[0]!.map((_, i) => Math.max(...rows.map((row) => (row[i] ?? '').length)));
	return rows.map((row) => row.map((cell, i) => (i < row.length - 1 ? cell.padEnd(widths[i]! + gap) : cell)).join('').trimEnd());
};
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const longDate = (date: string) => `${dayNames[weekday(date)]} ${Number(date.slice(8))} ${monthNames[Number(date.slice(5, 7)) - 1]}`;
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

interface Ctx {
	r: Rand;
	date: string;
	minute: number;
	branch: string;
	branch2: string;
	release: string;
	release2: string;
	tag: string;
	tag2: string;
	pod: string;
	slots: Record<string, string>;
}
type Art = (c: Ctx) => string;

const goTime = (c: Ctx, minute: number) => `${c.date.replace(/-/g, '/')} ${clock(Math.min(minute, 1439))}:${pad(int(c.r, 0, 59))}`;
const otherRelease = (c: Ctx) => {
	const team = pick(c.r, teamNames);
	return releaseOf(plainBranch(c.r, team, pick(c.r, teams[team]!)));
};
// slipway's own log around the time, with other previews' lines for company. `entries` are [minutes before now, message].
const slipwayLog = (c: Ctx, entries: [number, string][], filter = false): string => {
	const lines: [number, string][] = [];
	if (!filter)
		for (let i = int(c.r, 9, 20); i > 0; i--) lines.push([c.minute - int(c.r, 1, 120), `preview ${otherRelease(c)}: installed tag ${hex(c.r, 7)}`]);
	for (const [before, message] of entries) lines.push([c.minute - before, message]);
	const stamped = lines.map(([minute, message]) => `${goTime(c, minute)} ${message}`).sort();
	const command = filter ? `$ kubectl logs deploy/slipway -n platform --since=3h | grep -A3 ${c.release}` : '$ kubectl logs deploy/slipway -n platform --since=2h';
	return block([command, ...stamped]);
};
const helmFailed = (c: Ctx, release: string, ...output: string[]) => ['preview ' + release + ': helm failed: exit status 1', ...output].join('\n');
const nameRegexError = 'Error: invalid release name, must match regex ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$ and the length must not be longer than 53';
const timedOut = (c: Ctx, upgrade: boolean) =>
	helmFailed(c, c.release, ...(upgrade ? ['Error: UPGRADE FAILED: context deadline exceeded'] : [`Release "${c.release}" does not exist. Installing it now.`, 'Error: INSTALLATION FAILED: context deadline exceeded']));

const pipeline = (c: Ctx, outcome: '202' | '400' | 'refused' | 'nohost', branch = c.branch, tag = c.tag, release = c.release): string => {
	const t = clock(Math.max(8 * 60, c.minute - int(c.r, 2, 25)));
	const lines = [`${t}:${pad(int(c.r, 0, 50))}  ==> Request preview (job ${int(c.r, 48000, 61999)})`, `${t}:${pad(int(c.r, 51, 59))}  branch: ${branch}`, `${t}:${pad(int(c.r, 51, 59))}  tag:    ${tag}`];
	const host = outcome === 'nohost' ? 'slipway.internal.saltmarsh.example' : 'slipway.platform.saltmarsh.example';
	lines.push(`${t}:59  POST https://${host}/previews`);
	if (outcome === '202') lines.push('          202 Accepted', `          {"release":"${release}"}`, `          preview will be at https://${release}.previews.saltmarsh.example`, '  <== Request preview: succeeded');
	if (outcome === '400') lines.push('          400 Bad Request', '          expected {"branch": ..., "tag": ...}', '  <== Request preview: failed (exit 1)');
	if (outcome === 'refused') lines.push(`          dial tcp 10.40.0.${int(c.r, 20, 90)}:443: connect: connection refused`, '          retrying in 5s (1/3)', `          dial tcp 10.40.0.${int(c.r, 20, 90)}:443: connect: connection refused`, '          retrying in 5s (2/3)', '          giving up after 3 attempts', '  <== Request preview: failed (exit 1)');
	if (outcome === 'nohost') lines.push(`          dial tcp: lookup ${host}: no such host`, '          giving up after 3 attempts', '  <== Request preview: failed (exit 1)');
	return block(lines);
};
const pods = (c: Ctx, rows: string[][]) =>
	block([`$ kubectl get pods -n previews -l app.kubernetes.io/instance=${c.release}`, ...columns([['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'], ...rows])]);
const age = (r: Rand, low: number, high: number) => {
	const seconds = int(r, low, high);
	return seconds < 120 ? `${seconds}s` : `${Math.floor(seconds / 60)}m${seconds % 60 ? `${seconds % 60}s` : ''}`;
};
interface Describe {
	state: string[];
	ready: boolean;
	restarts: number;
	memory?: string;
	events: string[][];
	pod?: string;
}
const describe = (c: Ctx, d: Describe): string => {
	const pod = d.pod ?? c.pod;
	const node = `pool-previews-${int(c.r, 1, 6)}`;
	const probe = c.slots.oldpath ?? '/healthz';
	const template = pod.split('-').slice(-2, -1)[0] ?? podChars(c.r, 10);
	const volume = `kube-api-access-${podChars(c.r, 5)}`;
	const unscheduled = d.events.some((event) => event[1] === 'FailedScheduling');
	const lines = [
		`$ kubectl describe pod ${pod} -n previews`,
		`Name:             ${pod}`,
		'Namespace:        previews',
		'Priority:         0',
		'Service Account:  default',
		`Node:             ${unscheduled ? '<none>' : `${node}/10.40.${int(c.r, 1, 6)}.${int(c.r, 10, 250)}`}`,
		...(unscheduled ? [] : [`Start Time:       ${dayNames[weekday(c.date)]!.slice(0, 3)}, ${Number(c.date.slice(8))} ${monthNames[Number(c.date.slice(5, 7)) - 1]!.slice(0, 3)} 2026 ${clock(Math.max(0, c.minute - int(c.r, 4, 12)))}:${pad(int(c.r, 0, 59))} +0000`]),
		`Labels:           app.kubernetes.io/instance=${c.release}`,
		'                  app.kubernetes.io/name=app',
		`                  pod-template-hash=${template}`,
		'Annotations:      <none>',
		`Status:           ${/Running|CrashLoopBackOff/.test(d.state.join(' ')) ? 'Running' : 'Pending'}`,
		`IP:               ${unscheduled ? '' : `10.244.${int(c.r, 1, 6)}.${int(c.r, 2, 250)}`}`.trimEnd(),
		`Controlled By:    ReplicaSet/${c.release}-app-${template}`,
		'Containers:',
		'  app:',
		`    Image:          registry.saltmarsh.example/app:${c.tag}`,
		'    Port:           8080/TCP',
		'    Host Port:      0/TCP',
		...d.state.map((line) => `    ${line}`),
		`    Ready:          ${d.ready ? 'True' : 'False'}`,
		`    Restart Count:  ${d.restarts}`,
		'    Limits:',
		`      memory:  ${d.memory ?? '256Mi'}`,
		'    Requests:',
		'      cpu:      250m',
		`      memory:   ${d.memory ?? '256Mi'}`,
		`    Liveness:   http-get http://:8080${probe} delay=10s timeout=1s period=10s #success=1 #failure=3`,
		`    Readiness:  http-get http://:8080${probe} delay=5s timeout=1s period=10s #success=1 #failure=3`,
		'    Environment Variables from:',
		'      app-preview-env  Secret  Optional: false',
		'    Environment:',
		'      APP_ENV:          preview',
		`      RELEASE_NAME:     ${c.release}`,
		`      DATABASE_SCHEMA:  ${c.release.replace(/-/g, '_')}`,
		'    Mounts:',
		`      /var/run/secrets/kubernetes.io/serviceaccount from ${volume} (ro)`,
		'Conditions:',
		'  Type              Status',
		`  Initialized       ${d.state[0]?.includes('ContainerCreating') ? 'False' : 'True'}`,
		`  Ready             ${d.ready ? 'True' : 'False'}`,
		`  ContainersReady   ${d.ready ? 'True' : 'False'}`,
		`  PodScheduled      ${d.events.some((event) => event[1] === 'FailedScheduling') ? 'False' : 'True'}`,
		'Volumes:',
		`  ${volume}:`,
		'    Type:                    Projected (a volume that contains injected data from multiple sources)',
		'    TokenExpirationSeconds:  3607',
		'    ConfigMapName:           kube-root-ca.crt',
		'    DownwardAPI:             true',
		'QoS Class:                   Burstable',
		'Node-Selectors:              pool=previews',
		'Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s',
		'                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s',
		'Events:',
		...columns([['Type', 'Reason', 'Age', 'From', 'Message'], ['----', '------', '----', '----', '-------'], ...d.events]).map((line) => `  ${line}`)
	];
	return block(lines);
};
const scheduled = (c: Ctx, when: string) => ['Normal', 'Scheduled', when, 'default-scheduler', `Successfully assigned previews/${c.pod} to pool-previews-${int(c.r, 1, 6)}`];
const pulled = (c: Ctx, when: string) => ['Normal', 'Pulled', when, 'kubelet', `Container image "registry.saltmarsh.example/app:${c.tag}" already present on machine`];
const appLog = (c: Ctx, entries: [string, string, string?][], previous = true): string => {
	let second = int(c.r, 0, 40);
	const lines = entries.map(([level, message, extra]) => {
		second += int(c.r, 0, 3);
		return `{"level":"${level}","ts":"${c.date}T${clock(c.minute - 3)}:${pad(second % 60)}.${int(c.r, 100, 999)}Z","msg":"${message}"${extra ? `,${extra}` : ''}}`;
	});
	return block([`$ kubectl logs ${c.pod} -n previews${previous ? ' --previous' : ' --since=10m'}`, ...lines]);
};
const startup = (c: Ctx): [string, string, string?][] => [
	['info', 'starting', `"port":8080,"commit":"${c.tag}"`],
	['info', 'loading configuration', '"env":"preview"'],
	...shuffle(c.r, [
		['info', 'feature flags loaded', `"source":"flags.staging.saltmarsh.example","flags":${int(c.r, 80, 140)}`],
		['info', 'mail transport', '"mode":"catch-all"'],
		['info', 'scheduler disabled', '"reason":"preview"'],
		['info', 'connected to cache', '"host":"previews-redis.previews.svc"'],
		['debug', 'registered routes', `"count":${int(c.r, 180, 260)}`]
	] as [string, string, string?][]).slice(0, int(c.r, 1, 4)),
	['info', 'connecting to database', `"host":"previews-db.previews.svc","schema":"${c.release.replace(/-/g, '_')}"`],
	['info', 'database ready', `"migrations_pending":0,"ms":${int(c.r, 40, 900)}`]
];
const helmStatus = (c: Ctx, status: string, revision: number) =>
	block([
		`$ helm status ${c.release} -n previews`,
		`NAME: ${c.release}`,
		`LAST DEPLOYED: ${dayNames[weekday(c.date)]!.slice(0, 3)} ${monthNames[Number(c.date.slice(5, 7)) - 1]!.slice(0, 3)} ${Number(c.date.slice(8))} ${clock(c.minute - int(c.r, 2, 15))}:${pad(int(c.r, 0, 59))} 2026`,
		'NAMESPACE: previews',
		`STATUS: ${status}`,
		`REVISION: ${revision}`,
		'TEST SUITE: None'
	]);
const events = (c: Ctx, selector: string, rows: string[][]) =>
	block([`$ kubectl get events -n previews --field-selector ${selector} --sort-by=.lastTimestamp`, ...columns([['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE'], ...rows])]);
const topNodes = (c: Ctx, count: number) => {
	const rows = [['NAME', 'CPU(cores)', 'CPU%', 'MEMORY(bytes)', 'MEMORY%']];
	for (let i = 1; i <= count; i++) rows.push([`pool-previews-${i}`, `${int(c.r, 2100, 3900)}m`, `${int(c.r, 55, 97)}%`, `${int(c.r, 9000, 14800)}Mi`, `${int(c.r, 60, 94)}%`]);
	return block(['$ kubectl top nodes -l pool=previews', ...columns(rows)]);
};
const allocated = (c: Ctx, count: number) => {
	const rows = [['NODE', 'CPU REQUESTS', 'MEMORY REQUESTS', 'PODS']];
	for (let i = 1; i <= count; i++) rows.push([`pool-previews-${i}`, `${int(c.r, 3700, 3960)}m (${int(c.r, 95, 99)}%)`, `${int(c.r, 11, 15)}Gi (${int(c.r, 70, 96)}%)`, String(int(c.r, 18, 31))]);
	return block(['$ kubectl describe nodes -l pool=previews | grep -A3 "Allocated resources" (summarised)', ...columns(rows)]);
};
const quota = (c: Ctx) =>
	block([
		'$ kubectl describe resourcequota previews-compute -n previews',
		'Name:            previews-compute',
		'Namespace:       previews',
		...columns([['Resource', 'Used', 'Hard'], ['--------', '----', '----'], ['limits.memory', `${int(c.r, 150, 159)}Gi`, '160Gi'], ['pods', String(int(c.r, 170, 260)), '400'], ['requests.cpu', `${int(c.r, 39600, 39950)}m`, '40'], ['requests.memory', `${int(c.r, 140, 159)}Gi`, '160Gi']])
	]);
const oldReleases = (c: Ctx, count: number): string => {
	const rows = ['| Release | Last upgraded | Pull request |', '| --- | --- | --- |'];
	for (let i = 0; i < count; i++) {
		const day = int(c.r, 11, 31);
		rows.push(`| ${otherRelease(c)} | ${Math.min(day, 30)} ${pick(c.r, monthNames.slice(7, Math.max(8, Number(c.date.slice(5, 7)) - 1)))} | ${pick(c.r, ['merged', 'merged', 'merged', 'closed', 'open'])} |`);
	}
	return rows.join('\n');
};

// What a teammate pastes to rule something out.
const roomyNodes = (c: Ctx) => {
	const rows = [['NAME', 'CPU(cores)', 'CPU%', 'MEMORY(bytes)', 'MEMORY%']];
	for (let i = 1, count = int(c.r, 6, 9); i <= count; i++) rows.push([`pool-previews-${i}`, `${int(c.r, 600, 2100)}m`, `${int(c.r, 15, 52)}%`, `${int(c.r, 4000, 9800)}Mi`, `${int(c.r, 28, 61)}%`]);
	return block(['$ kubectl top nodes -l pool=previews', ...columns(rows)]);
};
const registryTags = (c: Ctx) => {
	const rows = [['TAG', 'PUSHED', 'SIZE']];
	let minute = c.minute - int(c.r, 30, 60);
	rows.push([c.tag, `${Number(c.date.slice(8))} ${monthNames[Number(c.date.slice(5, 7)) - 1]!.slice(0, 3)} 2026 ${clock(Math.max(0, minute))}`, `${int(c.r, 205, 219)}.${int(c.r, 0, 9)} MB`]);
	for (let i = int(c.r, 3, 6); i > 0; i--) {
		minute -= int(c.r, 3, 40);
		rows.push([hex(c.r, 7), `${Number(c.date.slice(8))} ${monthNames[Number(c.date.slice(5, 7)) - 1]!.slice(0, 3)} 2026 ${clock(Math.max(0, minute))}`, `${int(c.r, 205, 219)}.${int(c.r, 0, 9)} MB`]);
	}
	return block(['registry.saltmarsh.example / app / tags (newest first)', ...columns(rows)]);
};
const slipwayHealthy = (c: Ctx) =>
	block([
		'$ kubectl get pods -n platform -l app=slipway',
		...columns([['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'], [`slipway-${podChars(c.r, 10)}-${podChars(c.r, 5)}`, '1/1', 'Running', '0', `${int(c.r, 2, 19)}d`]]),
		'',
		'$ kubectl logs deploy/slipway -n platform --since=15m',
		...Array.from({ length: int(c.r, 2, 5) }, () => `${goTime(c, c.minute - int(c.r, 1, 15))} preview ${otherRelease(c)}: installed tag ${hex(c.r, 7)}`).sort()
	]);
const chartDiff = (c: Ctx) => block(['$ git diff --stat origin/main...HEAD -- charts/', '$ git diff --stat origin/main...HEAD | tail -1', ` ${int(c.r, 3, 40)} files changed, ${int(c.r, 40, 900)} insertions(+), ${int(c.r, 5, 300)} deletions(-)`]);
const mainPreview = (c: Ctx) =>
	block([
		'$ kubectl get pods -n previews -l app.kubernetes.io/instance=pr-main',
		...columns([['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'], [`pr-main-app-${podChars(c.r, 10)}-${podChars(c.r, 5)}`, '1/1', 'Running', '0', age(c.r, 3000, 20000)]])
	]);

const healthyPods = (c: Ctx) =>
	block([
		`$ kubectl get pods -n previews -l app.kubernetes.io/instance=${c.slots.fixedRelease && c.slots.fixed !== c.branch ? c.slots.fixedRelease : c.release}`,
		...columns([['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'], [`${c.slots.fixedRelease && c.slots.fixed !== c.branch ? c.slots.fixedRelease : c.release}-app-${podChars(c.r, 10)}-${podChars(c.r, 5)}`, '1/1', 'Running', '0', age(c.r, 40, 400)]])
	]);

// Shared conversation. {rep}, {plat}, {plat2}, {peer} and {other} are first names; the rest are the thread's slots.
const looking = [
	'Looking.',
	'Having a look now, {rep}.',
	"On it. Give me five minutes, I'm just out of standup.",
	'Thanks for the detail, that helps. Checking our side first.',
	"I'm on the rota today, looking.",
	"Hi {rep}, I'll take this one.",
	"Let me pull up slipway's log and see what it says.",
	'Hi! Looking at it now.',
	'Seen, will look after this meeting, about fifteen minutes.'
];
const urgency = [
	'No huge rush, but the PR is waiting on a design review and our designer only ever looks at previews.',
	'Slightly urgent: QA want to test this today so it can go out with Thursday\'s release.',
	"We've got a demo of this to our stakeholders at three, so I'd love a working link before then.",
	'Not blocking, I can review locally, but product want to click through it before they sign it off.',
	'The PR has two approvals and only needs the preview check before it can merge.',
	"It's holding up {peer}'s review as well, their branch is stacked on top of mine.",
	"Not urgent at all, I'm mostly curious, but I'd like to understand it before it happens on something that matters."
];
const plusOnes = ['Same here with `{branch2}`.', '+1, {peerTeam} has the same since about the same time.', 'Not just you, mine is doing it too (`{branch2}`).', 'Seeing this as well.'];
const acks = [
	'Ah. That would explain it.',
	"Huh, I'd never have found that. Thanks.",
	'OK, that makes sense now you say it.',
	"Thanks for digging. That's a fun one.",
	'Makes sense, thanks for explaining.',
	'Right, that fits with what I was seeing.',
	"Oh, of course. I've been staring at the wrong thing for an hour."
];
const asides: [string, string][] = [
	['Unrelated, but is there a list of running previews anywhere?', "`helm list -n previews` is the closest thing. There's no page for it yet."],
	["Side question while you're here: do previews use staging's feature flags?", 'Yes, through the staging flags service. You can override a flag for one preview in values-preview.yaml.'],
	['Off topic: is the preview database shared between previews?', "One Postgres for all of them, with a schema each. Your preview's schema is named after the release."],
	['Can I get a preview for a draft PR, by the way?', "Yes, the pipeline doesn't look at whether a PR is a draft."],
	['Do previews send real emails? Someone on my team got a password reset mail from one.', "They shouldn't, mail goes to the catch-all inbox. If one got out, tell #mail-sandbox: that's the mail settings, not slipway."],
	["Who's on the platform rota this week, so I know who to bother?", '{plat2} until Friday, then me.'],
	['Random question: why is it called slipway?', "A slipway is where a boat sits before it's launched. {plat2} named it, so blame them."],
	['Is there a limit on how many previews one team can have?', 'No limit per team, only the quota on the namespace as a whole.'],
	['Does slipway care about the PR number, or only the branch?', 'Only the branch. Same branch, same preview, whatever the PR.'],
	['Can previews reach the staging search cluster?', 'Yes, read-only. Writes are refused.'],
	['Is the preview URL always pr- plus the branch name?', 'Yes: lower case, slashes and spaces turned into hyphens, cut at 53 characters.'],
	["While I've got you: can a preview run more than one replica?", "You can set it in values-preview.yaml, but please don't unless you're testing something that needs two."],
	['Does a preview keep its data between pushes?', 'Yes, the schema stays. Only the app pods are replaced.'],
	['Is there a preview of main itself?', 'Yes, `pr-main`. It gets upgraded on every merge.'],
	['Do previews get the same secrets as staging?', 'No, they get their own set from `app-preview-env`, mostly sandbox credentials.'],
	['Can I point a preview at the staging database instead of the preview one?', "No, and please don't try: staging's database is shared with QA's test runs. The preview database exists so you can break it."],
	['Does the preview URL change if I rebase?', 'No, it follows the branch name. Rebase as much as you like.'],
	['Is there a way to get a preview without opening a PR?', "The pipeline only asks for previews on PR branches. Open a draft PR, that's what most people do."],
	["Are previews in the same region as staging? Latency looks a bit higher.", "Same cluster as staging, different node pool. The preview nodes are smaller, which is most of what you're seeing."],
	['How do I see what my preview has been doing? The pod has been replaced since.', '`kubectl logs` with `--previous` gives the container before the last restart; anything older is in the logging stack under namespace previews.'],
	['Can I give my preview a nicer URL for a demo?', "Not through slipway, the URL comes from the branch. Rename the branch if you want a nicer one."],
	["Silly question: does the preview run the tests too?", "No, the tests run in the pipeline before the image is built. A preview is just the app."],
	['Do previews scale down at night?', "Not yet, they run around the clock. It's come up, nobody has picked it up."]
];
type Guess = 'timeout' | 'pool' | 'name' | 'push' | 'chart' | 'slipway';
type Role = 'rep' | 'plat' | 'plat2' | 'peer' | 'other';
// A first idea that turns out wrong: [the idea, why it isn't that, who rules it out, what they paste]. 'rep' means the
// platform team or a colleague has the idea and the person who asked rules it out; 'plat' the other way round;
// 'self' means someone on the platform team has the idea and checks it themselves.
const guesses: Record<Guess, [string, string, 'rep' | 'plat' | 'self', Art?][]> = {
	timeout: [
		["Since 0.3.0 helm waits for the pods to be ready, for up to five minutes. Is your app slow to start? A lot of this week's threads have been that.", "Don't think so. It's up in under a minute on staging, and nothing on this branch touches start-up. Main's preview is happy too:", 'rep', mainPreview],
		["Could just be the five-minute limit, we've had a run of those.", "I'd believe it if it were close, but main's preview comes up in about a minute and my branch hasn't changed anything heavy.", 'rep']
	],
	pool: [
		['Could it be the nodes? The preview pool was full on Monday.', "Not today, there's plenty of room on the pool:", 'plat', roomyNodes],
		['Is the cluster just busy? Everything feels slow today.', '{plat2} checked the pool ten minutes ago and it has room. Here is what it looks like now:', 'plat', roomyNodes],
		['First thing, let me see whether the pool has room.', 'It has plenty, so not that:', 'self', roomyNodes]
	],
	name: [["Long or unusual branch names have tripped slipway up before. What's yours called?", 'Nothing exotic: `{branch}`.', 'rep']],
	push: [
		['Was the image pushed before the request went in? That has caught people out.', 'Yes, the push job finished well before, and the tag is in the registry:', 'rep', registryTags],
		['Is the image definitely in the registry?', 'It is, I checked the registry page for `{tag}` before posting:', 'rep', registryTags]
	],
	chart: [
		['Did your branch touch charts/app at all?', 'No, nothing under charts/:', 'rep', chartDiff],
		['Any changes to the chart on that branch?', 'None. The branch is all application code.', 'rep', chartDiff]
	],
	slipway: [
		['Let me check slipway itself is healthy first.', "slipway's fine, it has installed other previews in the last few minutes:", 'self', slipwayHealthy],
		['Is slipway even running? One sec.', "It is, and it's busy installing other people's previews:", 'self', slipwayHealthy]
	]
};
// Questions a newcomer to the channel asks along the way.
const explainers: [string, string][] = [
	["I'm fairly new, sorry if this is basic: what actually happens between my push and the preview?", "The app pipeline builds and pushes the image, then its Request preview step sends slipway the branch and the image tag. slipway answers 202 straight away with the release name and runs `helm upgrade --install` in the background with `--wait`, so helm only reports success once the pods are ready. If that takes longer than five minutes, helm gives up and slipway logs the failure."],
	['Where does a preview get its settings from?', 'From charts/app in the app repo: values.yaml, with values-preview.yaml on top. slipway only sets `image.tag`; everything else is the chart\'s.'],
	["How do I look at my own preview's pods without asking here?", '`kubectl get pods -n previews -l app.kubernetes.io/instance=<release>`. Everyone in engineering can read the previews namespace, and `kubectl describe` on a pod gives you the events.'],
	["What's the timeout exactly, and does it include the migrations?", "Five minutes from when helm starts, for the whole install: hooks, pods and readiness. It's slipway's SLIPWAY_HELM_TIMEOUT, and it's the same for every preview."],
	['Is the preview rebuilt from scratch on every push?', 'The image is, by the pipeline. slipway then upgrades the same release with the new tag, so the URL stays the same and the database schema stays as it was.'],
	['Why does the pipeline go green when the preview fails?', 'Because slipway answers as soon as it has the request, and the helm run happens after that. The step only tells you slipway accepted it.'],
	['Who can read slipway\'s log? I keep seeing it pasted here.', 'Anyone with read access to the platform namespace, which is the platform team and the rota. Ask here and one of us will paste the lines for your release.']
];
// The help form that most threads start from.
const expected: Record<'install' | 'request' | 'running', string[]> = {
	install: ['A preview at {url} a few minutes after the push.', 'The preview to come up the way it does for my other branches.', 'The usual: a preview up a couple of minutes after the build finishes.'],
	request: ['Request preview to go green and print a release name.', 'The step to pass the way it did last week.'],
	running: ['The preview to behave the way staging does.', 'To be able to use the preview normally.', 'The same as on staging with this commit.']
};
const tried: Record<'install' | 'request' | 'running', string[]> = {
	install: ['re-ran the Request preview step once', 'pushed an empty commit', 'looked for the release with `helm list -n previews`', "compared with main's preview", 'read the slipway README', 'asked around the team', 'searched this channel'],
	request: ['re-ran the job', 'checked our pipeline config for recent changes', 'looked in #platform-announce', 'searched this channel'],
	running: ['asked a teammate to try it', 'compared with staging', 'searched this channel', 'checked the app log in the preview']
};
const retries = ['Try re-running the Request preview step? Sometimes it is a blip.', 'Could you re-run the step once before we dig in? Want to rule out a one-off.'];
const retryWorked = ['Re-ran it and it came up. Thanks!', 'That did it, preview is up. Must have been a blip.'];
const relapses = ['Spoke too soon: it happened again on my next push, same thing.', 'And again this morning, first push of the day.', 'Back again, sorry. Same as yesterday.'];
const relapseAck = ['Right, then it is not a blip. Let me look properly.', 'OK, twice is a pattern. Digging in now.'];
const bumps = ['Any news on this? Still seeing it.', 'Bumping this in case it got lost.', 'Hi, anyone? Still stuck on this one.', 'Gentle nudge on this.'];
const thanks = ['Thanks all.', 'Cheers, all good from my side.', 'Great, thank you!', 'Appreciated, thanks both.'];
const pauses = ["Still on it. It isn't any of the usual things, so it's taking a bit longer.", 'Back from lunch, picking this up again.', 'Sorry for the wait, the rota has had a busy day.', "Haven't forgotten you, just finishing something else first."];
const recurOpen = ['Looks like I have the same thing: `{branch}`.', 'Same here today on `{branch}`, I found this thread by searching.', 'Hit this too, on `{branch}`. Is it the same thing?', 'Adding mine here rather than a new thread: `{branch}`, same symptoms.'];
const recurSame = ['Same cause, by the look of it:', "That's the same thing as above. For yours:", 'Yes, identical. Here is yours:', 'Same story:'];
const recurAck = ['Thanks, I know what to do then.', 'Got it, thanks.', 'Great, that saves me a thread.', 'Perfect, thanks.'];
// What is said after a thread has ended, which does not change how it ended.
const afterTalk: Partial<Record<Ending, [string, string][]>> = {
	owed: [['Any idea when?', 'This sprint, if nothing else catches fire.'], ['Anything I can do to help with it?', 'A failing case in the ticket would be lovely, otherwise no.'], ['Should I keep this thread or close it?', "Leave it, I'll link the ticket here when it moves."]],
	handed: [['Should I follow up with them directly?', 'Watch the ticket, they update it there. Shout here if it goes quiet.'], ['Do they need anything from me for the ticket?', "Your release name and roughly when it happened, and I've put both in."]],
	fixed: [['Worth adding to some kind of troubleshooting page?', '{plat2} is collecting these for one, I\'ll pass it on.'], ['Thanks for the patience, I know it turned out to be a simple one.', 'Simple once you know. That is what the channel is for.']],
	declined: [['Could it be looked at again later?', 'If more teams ask for it, yes. Bring it to platform office hours on Thursdays.'], ['Is that written down anywhere, so I can point my team at it?', 'Link them to this thread for now.']]
};
const attempts = ['Tried pushing again in case it was a one-off. Same:', 'Re-ran the step while I waited, no change:', 'Pushed a small fix for something else in the meantime, and it is the same again:'];
const leads = ["From our side, here's what I can see:", 'For completeness, this is what I am looking at:', 'Here is the view from our end:'];
const hijack = ['Different problem, but since you are both here: ', 'Slightly hijacking this thread, sorry: ', 'Related-ish? ', 'While you are looking at previews: ', 'Not the same thing, I think, but: '];

type Cause = 'slipway' | 'chart' | 'pipeline' | 'cluster' | 'other';
type Ending = 'fixed' | 'owed' | 'handed' | 'declined' | 'quiet';
type Msg = [Role, string, number?];
interface Topic {
	/** What turned out to be behind the thread. Never written to a file. */
	cause: Cause;
	/** The endings this topic can have, repeated for weight. */
	endings: Ending[];
	/** The team a handed thread goes to. */
	hand?: Hand;
	/** Wrong first ideas that fit this topic's facts. */
	guesses: Guess[];
	/** Several people hit it at once. */
	wide?: boolean;
	/** The first day it can happen, when it depends on a release or a change. */
	since?: string;
	/** For an outage, the only days it happens. */
	on?: string[];
	/** A re-run seems to fix it and it comes back. */
	relapse?: boolean;
	branch?: (r: Rand, team: string, who: string) => string;
	pair?: (r: Rand, team: string) => [string, string];
	release?: (branch: string) => string;
	extra?: (r: Rand) => Record<string, string>;
	/** Pasted output, referred to by index from probes, proof and endings. */
	art: Art[];
	open: string[];
	more: string[];
	/** [platform's question, the answer, pasted output, who answers]. */
	probe: [string, string, number?, Role?][];
	found: string[];
	proof?: number;
	follow: [string, string][];
	end: Partial<Record<Ending, Msg[][]>>;
}

const topics: Topic[] = [
	// A branch name with an underscore.
	{
		cause: 'slipway',
		endings: ['owed', 'owed', 'owed', 'fixed', 'quiet'],
		guesses: ['push', 'chart', 'pool'],
		branch: (r, team, who) => (r() < 0.2 ? 'fix/login_page.v2' : pick(r, [`fix/${pick(r, work[team]!).replace(/-/g, '_')}`, `feature/${tickets[team]}_${int(r, 1000, 2999)}_${pick(r, work[team]!)}`, `${initials(who)}/${pick(r, work[team]!).replace(/-/g, '_')}`])),
		art: [(c) => pipeline(c, '202'), (c) => slipwayLog(c, [[int(c.r, 20, 50), helmFailed(c, c.release, nameRegexError)]])],
		open: [
			"My preview for `{branch}` never showed up. The Request preview step was green and printed `{release}`, but there's nothing at {url}, just the default backend page. Other branches of ours came up fine this morning.",
			"Is slipway OK? I've pushed `{branch}` twice in the last hour. Both times the pipeline got a 202, and both times no preview. I can't see any pods for it either, not even failing ones.",
			"Hi platform, {team} here. We have a branch, `{branch}`, that just doesn't get a preview. No error anywhere we can see. The PR is waiting on design review, so it would be good to have it up today."
		],
		more: [
			'I tried an empty commit to kick it off again, same result. `kubectl get pods -n previews` has nothing with that name.',
			"For what it's worth, I named the branch the way I name everything, so I doubt it's that, but I'm out of ideas."
		],
		probe: [
			['Can you paste what the pipeline step printed?', 'Here you go:', 0],
			['Anything in `helm list -n previews` for it?', 'Nothing. I searched for the ticket number as well, in case the name got mangled.'],
			['Roughly when did the last request go in?', 'About {mins} minutes ago, from the push of my last commit.']
		],
		found: [
			"Found it, and it's on our side. slipway turned the branch into `{release}`, and helm refuses that name because of the underscore: release names can only have lower-case letters, digits, hyphens and dots. slipway answers 202 before helm runs, so the pipeline never hears about the refusal. Here's the line from our log:",
			"It's the underscore. slipway lowercases the branch name and swaps slashes for hyphens, but everything else goes through untouched, and helm won't take `{release}` as a release name. From slipway's log:"
		],
		proof: 1,
		follow: [
			['So any branch with an underscore has never had a preview?', "Never, since slipway started. Most people use hyphens, so it doesn't come up often."],
			['Could slipway at least tell the pipeline it failed?', "Not today: it answers before it runs helm. That's a separate conversation, there's another thread about it."]
		],
		end: {
			owed: [
				[['plat', "This one is ours to fix. slipway should turn anything that isn't a lower-case letter, a digit or a hyphen into a hyphen before helm ever sees the name. I've put it on the board as PLAT-{ticket}, and it's the next thing I pick up. In the meantime a branch without the underscore will get you a preview."], ['rep', "Renamed it to `{fixed}` and the preview is up. Thanks, and good to hear the next person won't hit it."]],
				[['plat', 'Short term: rename the branch and you will get a preview. Proper fix: slipway cleans the name up itself. {plat2} and I talked about exactly this last week, so I\'ll write the ticket now before it slips again.'], ['plat2', "Yes, that one's mine. PLAT-{ticket}, I'll do it after the timeout parsing."], ['rep', 'Great, renaming for now.']]
			],
			fixed: [[['plat', "Rename the branch without the underscore and it'll go through."], ['rep', "Done, it's up at https://{fixedRelease}.previews.saltmarsh.example. Thanks!"], ['plat', 'Good stuff.']]],
			quiet: [
				[['plat', 'Can you rename the branch so it has no underscore, push, and tell me whether the preview comes up? If it does, I know for sure that this is all it is.']],
				[['plat', "It's the name. If you rename the branch with hyphens instead it should go through."], ['rep', 'Thanks. Do I need to close the PR and open a new one, or does the rename carry over?']]
			]
		}
	},
	// A branch name with a dot: helm takes it, the chart's Service doesn't.
	{
		cause: 'slipway',
		endings: ['owed', 'owed', 'fixed', 'quiet'],
		guesses: ['push', 'chart', 'pool'],
		branch: (r, team) => `${pick(r, ['feature', 'fix', 'spike'])}/${pick(r, work[team]!)}.${pick(r, ['v2', 'pdf', 'csv', 'new', 'eu'])}`,
		art: [
			(c) => helmStatus(c, 'failed', int(c.r, 1, 3)),
			(c) => slipwayLog(c, [[int(c.r, 10, 40), helmFailed(c, c.release, `Release "${c.release}" does not exist. Installing it now.`, `Error: INSTALLATION FAILED: Service "${c.release}-app" is invalid: metadata.name: Invalid value: "${c.release}-app": a DNS-1035 label must consist of lower case alphanumeric characters or '-', start with an alphabetic character, and end with an alphanumeric character (e.g. 'my-name',  or 'abc-123', regex used for validation is '[a-z]([-a-z0-9]*[a-z0-9])?')`)]])
		],
		open: [
			'`helm list -n previews` shows `{release}` as failed and there are no pods at all. The pipeline said 202. What does failed mean in this case? Usually mine either come up or time out.',
			"First time I've seen this one: my preview release `{release}` exists but is marked failed, and the URL gives the default backend. Is that a slipway thing or ours?",
			'Preview for `{branch}` is broken in a new way. helm knows about the release, says failed, revision 1. No pods, no events. Help?'
		],
		more: ['Nothing in the chart changed on this branch, it is a front-end change only.', 'Pushed again and now it says revision 2, also failed.'],
		probe: [
			['Can you run `helm status {release} -n previews` and paste it?', 'Sure:', 0],
			['Did anything on your branch touch charts/app?', "No, the branch doesn't touch charts/app at all."]
		],
		found: [
			"Got it. helm accepts dots in a release name, so `{release}` gets further than the underscore cases do. But the chart names its Service after the release, and a Service name can't contain a dot, so the install fails halfway. slipway's log has it:",
			"The dot in the branch name. It survives into the release name, and helm is fine with that, but Kubernetes isn't when the chart creates `{release}-app` as a Service:"
		],
		proof: 1,
		follow: [['Why does helm allow it if Kubernetes then refuses it?', "helm's rule is about its own record of the release. What the chart builds from the name has stricter rules, and our chart puts the name into a Service."]],
		end: {
			owed: [[['plat', "slipway should turn the dot into a hyphen before helm sees it, the same as it should with underscores. I've added this case to PLAT-{ticket} so whoever picks it up covers both. A branch name without the dot works today."], ['rep', "Thanks, I'll rename. Do I need to clean up the failed release?"], ['plat', "Leave it, I'll remove it with `helm uninstall`."]]],
			fixed: [[['plat', "Rename the branch without the dot and push again. I've uninstalled the failed release so it starts clean."], ['rep', "Renamed, and it's up. Cheers."]]],
			quiet: [[['plat', "Rename the branch without the dot and push. I'll clear out the failed release once yours is up, so the namespace doesn't fill with them. Let me know?"]]]
		}
	},
	// A long branch name whose cut ends in a hyphen.
	{
		cause: 'slipway',
		endings: ['owed', 'owed', 'fixed', 'quiet'],
		guesses: ['push', 'chart', 'pool'],
		branch: (r, team) => {
			for (let i = 0; i < 600; i++) {
				const branch = `${pick(r, ['feature', 'fix'])}/${tickets[team]}-${int(r, 100, 9999)}-${pick(r, longTitles)}`;
				if (releaseOf(branch).endsWith('-') && branch.length > 56) return branch;
			}
			return `feature/${tickets[team]}-412-make-the-address-form-remember-the-last-used-postcode`;
		},
		art: [(c) => pipeline(c, '202'), (c) => slipwayLog(c, [[int(c.r, 5, 30), helmFailed(c, c.release, nameRegexError)]])],
		open: [
			'Long branch name problem, maybe? `{branch}` gets no preview. I know it is long, it is the ticket title, the tracker made it.',
			"No preview for my branch and nothing failing that I can find. The branch name is a mouthful: `{branch}`. Does slipway mind?",
			"Hey, previews work for everyone on {team} except me. The only thing I can think of is that my branch name is very long."
		],
		more: ['A teammate with a shorter branch off the same commit got a preview fine.', 'The pipeline step said 202 and printed a release name cut off mid-word, which I assumed was normal.'],
		probe: [
			['What release name did the pipeline print?', '`{release}`, like this:', 0],
			['Anything for it in `helm list -n previews`?', 'No, nothing.']
		],
		found: [
			"Yes, it's the length, but not the way you'd think. slipway cuts names at 53 characters, helm's limit, and in your case the cut lands just after a hyphen, so the name ends in `-`. helm wants names to end with a letter or a digit, so it refuses:",
			'Look at the end of the name: `{release}`. We cut at 53, and the 53rd character happens to be a hyphen. helm will not take a name that ends with one. From our log:'
		],
		proof: 1,
		follow: [['So a branch one character longer or shorter would have been fine?', 'Most likely, yes. It depends only on where the cut lands.']],
		end: {
			owed: [
				[['plat', "We need to strip trailing hyphens after the cut. It's a small change in slipway, and I'll do it this week with a test for it. Shorten the branch name in the meantime."], ['rep', 'Will do, thanks.']],
				[['plat', "That's a slipway bug: after cutting we should drop any hyphens left at the end. Ticket PLAT-{ticket}, on the board for this sprint."], ['peer', "We hit the same last month and just renamed, I didn't realise it was a bug."], ['plat', "Yes, it's been there since 0.1.0. Thanks for saying."]]
			],
			fixed: [[['plat', "Shorten the branch name by a word or two and it'll go through."], ['rep', "Shortened, preview's up. Thanks."]]],
			quiet: [[['plat', "Could you try a shorter branch name and see if it comes up? I'd like to be sure that's the whole story before I change anything."]]]
		}
	},
	// Two long branch names that are the same up to the cut.
	{
		cause: 'slipway',
		endings: ['owed', 'owed', 'declined', 'fixed'],
		guesses: ['push', 'chart'],
		pair: (r, team) => {
			for (let i = 0; i < 600; i++) {
				const base = `feature/${tickets[team]}-${int(r, 100, 9999)}-${pick(r, longTitles)}`;
				const [a, b] = pick(r, [['-uk', '-eu'], ['-web', '-app'], ['-part-1', '-part-2'], ['-backend', '-frontend']] as const);
				if (releaseOf(base + a) === releaseOf(base + b) && !releaseOf(base + a).endsWith('-')) return [base + a, base + b];
			}
			return [`feature/${tickets[team]}-907-let-partners-page-through-the-order-feed-by-updated-date-uk`, `feature/${tickets[team]}-907-let-partners-page-through-the-order-feed-by-updated-date-eu`];
		},
		art: [(c) => slipwayLog(c, Array.from({ length: 4 }, (_, i): [number, string] => [70 - i * int(c.r, 12, 17), `preview ${c.release}: installed tag ${i % 2 ? c.tag2 : c.tag}`]), true)],
		open: [
			"Weird one: my preview at {url} keeps showing {peer}'s changes instead of mine. When I push, it shows mine for a while. Then it flips back.",
			'{peer} and I seem to be sharing a preview without meaning to. My branch is `{branch}` and theirs is `{branch2}`. Whoever pushed last wins.',
			"Is it possible for two branches to end up on the same preview? QA keep telling me my fix isn't in the preview, and then it is, and then it isn't."
		],
		more: ['Both branches come from the same ticket, one for each half of the work, so the names are long and nearly the same.', 'QA have left three comments on the PR about it, so it is costing us time.'],
		probe: [
			["What release name does your pipeline print, and what does {peer}'s print?", 'Mine says `{release}`.'],
			['{peer}, yours?', 'Same: `{release}`. Oh.', undefined, 'peer'],
			['When did each of you last push?', 'Me about twenty minutes ago, {peer} just now, I think.']
		],
		found: [
			'That is exactly it. Your two branch names are the same for the first 50 characters, and slipway cuts names to 53 including the `pr-` at the front, so both branches map to `{release}`. Every push upgrades the same release with a different tag. slipway\'s log shows the tags alternating:',
			"Your branches collide. slipway cuts the name to fit helm's 53 characters and throws away the rest, which is the only part that differs between `{branch}` and `{branch2}`. Here's the release flipping between your two tags:"
		],
		proof: 0,
		follow: [['Would the same happen to any two long branches?', 'Only when they agree on everything up to the cut. Rare, but the tracker makes long names that start the same way.']],
		end: {
			owed: [[['plat', 'The fix on our side is to keep a few characters made from the full branch name at the end when we have to cut, so two long names can\'t land on the same release. PLAT-{ticket}. Can one of you rename in the meantime?'], ['peer', "I'll rename mine, I'm nearly done anyway."], ['rep', 'Thanks both.']]],
			declined: [[['plat', "We talked about it and we're not going to change the naming for this: it's the first time it has happened, and the names would get harder to read for everyone. Please keep branch names short enough that they differ in the first fifty characters. I'll add a line about it to the README."], ['rep', "Fair. We'll shorten them."]]],
			fixed: [[['peer', "I'll just rename mine to something shorter."], ['rep', 'Confirmed, my preview stays mine now. Thanks for explaining.']]]
		}
	},
	// slipway down: SLIPWAY_HELM_TIMEOUT given as "10m".
	{
		cause: 'slipway',
		since: '2026-10-15', on: ['2026-10-22'],
		endings: ['owed', 'owed', 'fixed'],
		guesses: [],
		wide: true,
		art: [
			(c) => pipeline(c, 'refused'),
			(c) =>
				block([
					'$ kubectl get pods -n platform -l app=slipway',
					...columns([['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'], [`slipway-${podChars(c.r, 10)}-${podChars(c.r, 5)}`, '0/1', 'CrashLoopBackOff', `${int(c.r, 6, 14)} (${int(c.r, 10, 59)}s ago)`, `${int(c.r, 22, 48)}m`]]),
					'',
					'$ kubectl logs deploy/slipway -n platform --previous',
					`${goTime(c, c.minute - 1)} SLIPWAY_HELM_TIMEOUT: strconv.Atoi: parsing "10m": invalid syntax`
				])
		],
		open: [
			"No previews at all since about {when}? Mine for `{branch}` hasn't appeared, and the Request preview step now fails with connection refused.",
			'Is slipway down? Request preview has failed three times for me in the last twenty minutes, connection refused.',
			'Previews broken for everyone or just us? {team} has two PRs that cannot get one.'
		],
		more: ['It worked on our first push this morning.', 'Nothing changed in our pipeline, it was fine first thing.'],
		probe: [
			['Can you paste the step output?', 'Sure:', 0],
			['Since when exactly? What was the first failure you saw?', 'The first red run was at {when}.']
		],
		found: [
			"slipway itself is down, and it's our doing. Someone raised SLIPWAY_HELM_TIMEOUT in the deployment to `10m` this morning, which is the form the README gives, but slipway reads the value as a whole number of seconds, so it refuses to start and keeps restarting:",
			'Found it: slipway is crash-looping. The deployment got SLIPWAY_HELM_TIMEOUT=10m this morning, to give slow previews more room. slipway parses that setting as seconds and falls over on the `m`:'
		],
		proof: 1,
		follow: [['Do requests sent while it was down get picked up later?', 'No, they were refused, not queued. You need to re-run the step.']],
		end: {
			owed: [[['plat', "I've taken the setting out again, so slipway is on its default five minutes and back up. Re-run your Request preview step: requests sent while it was down were refused, not queued. And we'll change slipway to read the setting as a duration, the way the README already says it does. PLAT-{ticket}."], ['rep', 'Re-ran, preview is up. Thanks for the quick fix.'], ['peer', 'Mine too.']]],
			fixed: [[['plat', "Back up. I've removed the setting, so slipway is on its default five minutes again. Re-run your Request preview steps."], ['rep', 'Working again, thanks.'], ['plat', 'Sorry everyone, that one was us.']]]
		}
	},
	// Asking for a way to know whether a preview came up.
	{
		cause: 'slipway',
		since: '2026-10-15',
		endings: ['owed', 'owed', 'declined', 'quiet'],
		guesses: [],
		art: [(c) => slipwayLog(c, [[int(c.r, 60, 130), timedOut(c, true)]], true)],
		open: [
			'Is there a way for our pipeline to know whether the preview actually came up? We get a 202 and a release name and that is it. Half the time I find out it failed when a reviewer tells me the link is dead.',
			"Feature request, I think: could the Request preview step fail when the preview fails? At the moment it's always green, and people review dead links.",
			"How do other teams find out a preview didn't come up? We keep finding out from QA an hour later."
		],
		more: ["Today it was `{branch}`. It failed on something that was our fault, but nobody noticed for two hours.", "I know slipway logs it, but most of us can't read slipway's log."],
		probe: [
			['Would you want the step to wait until the preview is up, or would a URL you could check be enough?', "Honestly, either. Waiting would be simplest for us. The step can take ten minutes, we don't mind."],
			['How many failures a week are we talking about for your team?', 'Maybe {n}. Not huge, but each one wastes a reviewer\'s time.'],
			["Which branch was today's?", '`{branch}`. I only found out from your log because Ruth pasted it in another thread.', 0]
		],
		found: [
			'Right now slipway answers 202 and runs helm in the background, and the outcome only goes to its own log. To give you anything, slipway would need to remember the last outcome for each release and answer something like `GET /previews/<release>` with installing, installed or failed. Then the step could poll it.',
			"There's nothing to ask today: slipway logs `installed tag` or `helm failed` and forgets. The smallest useful change would be a status endpoint the pipeline can poll."
		],
		follow: [['Would the status survive a slipway restart?', 'Not in a first version. It would live in memory, so after a restart a release would read as unknown until its next push.']],
		end: {
			owed: [[['plat2', "We discussed it at planning: we'll add `GET /previews/<release>` returning the last outcome and the helm error if there was one, kept in memory to start with. PLAT-{ticket}. I'll post here when the pipeline can use it."], ['rep', 'Brilliant, thanks.']]],
			declined: [[['plat', "We talked it over and we're not going to do this one for now. We want slipway to stay stateless, and a status that's lost on every restart would be worse than none. `helm status <release> -n previews` gives the same answer today. Sorry, I know that's not what you wanted."], ['rep', "OK. We'll add a helm status step to our own job then."]]],
			quiet: [[['plat', 'Would a status endpoint you poll be enough, or does it have to be the step waiting? I need to know before I write it up.']]]
		}
	},
	// Two pushes close together: the second helm run fails.
	{
		cause: 'slipway',
		since: '2026-10-15',
		endings: ['owed', 'owed', 'fixed', 'quiet'],
		guesses: ['pool', 'chart'],
		relapse: true,
		art: [
			(c) => pods(c, [[c.pod, '1/1', 'Running', '0', age(c.r, 300, 1500)]]),
			(c) => slipwayLog(c, [[int(c.r, 30, 40), `preview ${c.release}: installed tag ${c.tag2}`], [int(c.r, 31, 39), helmFailed(c, c.release, 'Error: UPGRADE FAILED: another operation (install/upgrade/rollback) is in progress')]], true)
		],
		open: [
			'My preview is stuck on an old commit. I pushed twice a minute apart, and the preview still has the first one.',
			'Preview for `{branch}` shows the code from two pushes ago. The pipeline for the newest push was green.',
			'Is there some kind of lock on previews? I pushed a fixup right after a commit and the preview never got the fixup.'
		],
		more: ['The pipeline printed 202 both times.', "It's the second time this week, both times when I pushed in quick succession."],
		probe: [
			['What tag is the pod running? The image is in `kubectl describe`.', "It's on `{tag2}`, which is the older commit. The newer one is `{tag}`.", 0],
			['How far apart were the two pushes?', 'Under a minute. I amended the commit message and pushed again.']
		],
		found: [
			"slipway starts a helm run in the background for every request, and nothing stops two runs for the same release from overlapping. The second one fails straight away because the first still holds the release, and since helm waits for the pods now, the first one holds it for a while:",
			"Two requests for the same release crossed. The first helm run was still waiting for your pods when the second arrived, and helm refuses to start another operation on a busy release:"
		],
		proof: 1,
		follow: [["Why didn't this happen before?", 'Before 0.3.0 helm returned as soon as it had applied the chart, so runs were over in seconds. Now each one waits for the pods.']],
		end: {
			owed: [[['plat', 'We should queue requests per release in slipway, so the newest tag wins and nothing runs twice at once. PLAT-{ticket}. Until then, re-running the step once the first run has finished does it.'], ['rep', "Re-ran, it's on `{tag}` now. Thanks."]]],
			fixed: [[['plat', "Re-run the Request preview step for the newest push and it'll pick up `{tag}`, the release is free now."], ['rep', "Done, it's on the right commit. Thanks."]]],
			quiet: [[['plat', "Can you re-run the step for your last push and tell me if it lands on `{tag}`? If it doesn't, something else is going on."]]]
		}
	},
	// Previews of merged PRs are never removed.
	{
		cause: 'slipway',
		endings: ['owed', 'owed', 'handed', 'declined'],
		hand: 'infrastructure',
		guesses: [],
		extra: (r) => ({ count: String(int(r, 140, 230)) }),
		art: [(c) => oldReleases(c, int(c.r, 6, 11))],
		open: [
			'How long do previews stay up? I count {count} releases in the previews namespace, and some of them are for PRs we merged in August.',
			'Question about clean-up: my preview from a PR merged three weeks ago still answers at {url}. Is that expected? It still has our old page on it.',
			'Are old previews ever removed? {team} has {n} running and only two open PRs.'
		],
		more: ["Not complaining, it's handy sometimes, but it seems wasteful.", 'I only noticed because someone sent a support colleague the old link and they thought the change was live.'],
		probe: [['Are you counting with `helm list -n previews`?', "Yes, with `--max 500`. Here are some of the oldest by date:", 0], ['Which of the old ones are your team\'s, and do you still need them?', 'Six of them are ours. Only the two with open PRs matter, the rest can go as far as I am concerned.']],
		found: [
			"Nothing removes them today. slipway only ever runs `helm upgrade --install`; there is no delete. The pipeline calls slipway when a PR is pushed, and nothing calls anything when it's merged or closed.",
			'They stay forever. slipway installs and upgrades, and that is all it knows how to do. There is no step at PR close.'
		],
		follow: [["Can I remove my own team's old ones?", 'Yes, `helm uninstall <release> -n previews` for the ones whose PRs are closed. Please do.']],
		end: {
			owed: [[['plat', 'The plan is a delete in slipway that the pipeline calls when a PR closes. PLAT-{ticket}, it is near the top of the board.'], ['rep', "Great. Happy to test it on our PRs when it's ready."]]],
			handed: [[['plat', "For the ones already there, I've asked infrastructure: they'd run a nightly job that uninstalls releases with no upgrade for 14 days. {other}?"], ['other', "Yes, we'll set that up next week, {board}-{ticket}."], ['rep', 'Thanks both.']]],
			declined: [[['plat', "We're not doing anything about this one this quarter. Infrastructure say the pool has room, and we'd rather spend the time on the naming bugs. If the namespace gets tight we'll look again."], ['rep', 'OK, fair enough.']]]
		}
	},
	// The translation service's branches.
	{
		cause: 'slipway',
		endings: ['owed', 'owed', 'handed', 'declined'],
		hand: 'release engineering',
		guesses: ['push', 'chart'],
		branch: (r) => `i18n/sync_${pick(r, ['de_DE', 'fr_FR', 'nl_NL', 'es_ES', 'pl_PL', 'it_IT', 'sv_SE'])}`,
		art: [(c) => pipeline(c, '202'), (c) => slipwayLog(c, [[int(c.r, 30, 200), helmFailed(c, c.release, nameRegexError)]])],
		open: [
			"Every PR the translation bot opens has no preview at all. Today's is `{branch}`. Nobody looks at those previews much, but the red cross on the PR comes from the next job down, which tries to reach the preview.",
			'The weekly translation sync PRs never get a preview. Is that on purpose? Translators would actually like to see their strings in context.'
		],
		more: ['Translators have asked twice now whether they can see their strings in a preview before we merge.', "The bot's branch names come from the translation service, and we can't change their format."],
		probe: [['Does the pipeline print a release name for those?', 'Yes: `{release}`.', 0], ['How often does the bot open these?', 'Every Monday, one PR per language, so seven a week.']],
		found: [
			"It's the underscores the translation service puts in its branch names. slipway passes them through to the release name, and helm only takes lower-case letters, digits, hyphens and dots, so it refuses `{release}` before anything is created:",
			'The branch names have underscores, which end up in the release name, and helm refuses those:'
		],
		proof: 1,
		follow: [['Is it every language?', 'Every one: they all have an underscore between the language and the country.']],
		end: {
			owed: [[['plat', "This is the same bug as the other underscore threads: slipway should clean the name before helm sees it. Once it does, the bot's PRs will get previews like anyone else's. PLAT-{ticket}."], ['rep', 'Good, the translators will be pleased.']]],
			handed: [[['plat', "The branch format is the translation service's and we can't change it from here. {other}, could release engineering have the pipeline rename these branches before it calls slipway, or skip the preview for them?"], ['other', 'We can map them in the pipeline. {board}-{ticket}, this week.'], ['rep', 'Thanks!']]],
			declined: [[['plat', "Honestly, we'd rather the bot's PRs didn't get previews at all: it's a lot of releases for some strings. I'd suggest skipping the step for the bot. We won't change slipway for it."], ['rep', 'The translators will be sad, but OK.']]]
		}
	},
	// Previews of the worker as well as the app.
	{
		cause: 'slipway',
		since: '2026-10-15',
		endings: ['owed', 'declined', 'declined', 'quiet'],
		guesses: [],
		art: [],
		open: [
			'Can slipway install a second chart for a preview? Our change is mostly in the background worker, and the preview only has the web app, so there is nothing to test.',
			'{team} would like previews that include the background worker as well as the app. Is that possible today?',
			"Is it on purpose that previews only run the web app? My branch `{branch}` changes the queue consumer, and I can't see it working anywhere before merge."
		],
		more: ['The worker has its own chart in the app repo, `charts/worker`.', 'At the moment we test on staging after merge, which has bitten us twice this month.'],
		probe: [
			['Does the worker need its own database, or does it share the app\'s?', "Shares the app's, same schema."],
			['How often would you need it? Every PR, or a few?', 'A few a month. Most of our PRs are app-only.']
		],
		found: [
			"slipway installs exactly one chart, the one in SLIPWAY_CHART, so today a preview is the web app and nothing else. Supporting a second chart means a second release per branch and a way to say which branches want it.",
			'Not today. Since 0.3.0 the chart comes from SLIPWAY_CHART, but it is one chart for every preview.'
		],
		follow: [['Could we run the worker by hand next to a preview?', 'You could `helm install` it yourself into previews with the same tag, but please remove it when you are done.']],
		end: {
			owed: [[['plat', "We'll add it: an optional list of extra charts, installed after the app with the same tag. PLAT-{ticket}, probably next sprint."], ['rep', 'Fantastic, thank you.']]],
			declined: [[['plat', "We've decided against it for now. The cleaner route is to put the worker in the app chart behind a value, so one release covers both. That's a change in charts/app on your side and needs nothing from slipway."], ['rep', "Makes sense, we'll look at that."]]],
			quiet: [[['plat', 'Before I write it up: would you want the worker in every preview, or only when a branch asks for it?']]]
		}
	},
	// The app needs a setting the preview values don't give it.
	{
		cause: 'chart',
		since: '2026-10-15',
		endings: ['fixed', 'fixed', 'quiet'],
		guesses: ['timeout', 'push', 'pool', 'chart'],
		extra: (r) => ({ variable: pick(r, ['FEATURE_FLAGS_URL', 'SEARCH_INDEX_PREFIX', 'MAILER_FROM_ADDRESS', 'RATES_CACHE_TTL', 'PARTNER_WEBHOOK_BASE', 'SESSION_COOKIE_DOMAIN', 'EXPORT_BUCKET', 'TAX_SERVICE_URL']) }),
		art: [
			(c) => pods(c, [[c.pod, '0/1', 'CrashLoopBackOff', `${int(c.r, 4, 7)} (${int(c.r, 10, 59)}s ago)`, age(c.r, 250, 290)]]),
			(c) => appLog(c, [...startup(c), ['error', `config: ${c.slots.variable} is required`], ['fatal', 'exiting', '"code":1']]),
			(c) => slipwayLog(c, [[int(c.r, 1, 9), timedOut(c, c.r() < 0.5)]])
		],
		open: [
			"Preview for `{branch}` times out every single time. Five minutes and then nothing. Main's preview is fine.",
			"My preview never becomes ready. helm status says failed after a few minutes. I haven't touched the chart.",
			"Can someone look at `{release}`? It's been failing since yesterday and I can't see why."
		],
		more: ['It runs fine locally, and the tests pass.', 'We merged a config refactor into the branch yesterday, but all the tests pass.'],
		probe: [
			['What do the pods look like?', 'This:', 0],
			['Can you get the logs from the last crash? `kubectl logs {pod} -n previews --previous`', 'Here:', 1]
		],
		found: [
			"There it is: the app stops at start-up because {variable} isn't set. Your branch is the first to read it. Staging and production get it from their environment config, and the preview values in charts/app don't set it. So the pod restarts until helm gives up waiting.",
			"It's not slow, it never starts. Look at the last lines: {variable} is required and the preview doesn't have it. charts/app/values-preview.yaml needs an entry for it."
		],
		follow: [["Why didn't the tests catch it?", "The tests set their own config. Only a real start with the preview's values shows it."]],
		end: {
			fixed: [
				[['rep', 'Added {variable} to values-preview.yaml, pointing at the staging value, pushed, and the preview was up in under two minutes. Thanks!'], ['plat', 'Nice.']],
				[['rep', "Oh. Yes, that came in with the config refactor. Adding it now."], ['rep', 'Up and running. Sorry for the noise.'], ['plat', "Not noise at all, that's what the channel is for."]]
			],
			quiet: [[['plat', "Can you add it to values-preview.yaml and push? Shout if the preview still doesn't come up after that."]]]
		}
	},
	// The readiness probe asks for a path the branch removed.
	{
		cause: 'chart',
		since: '2026-10-15',
		endings: ['fixed', 'fixed', 'quiet'],
		guesses: ['timeout', 'push', 'pool', 'chart'],
		extra: (r) => ({ oldpath: '/healthz', newpath: pick(r, ['/status/ready', '/health/ready', '/internal/health', '/ready']) }),
		art: [
			(c) => pods(c, [[c.pod, '0/1', 'Running', '0', age(c.r, 200, 299)]]),
			(c) => describe(c, { state: ['State:          Running', `  Started:      ${clock(c.minute - 4)}`], ready: false, restarts: 0, events: [scheduled(c, '4m50s'), pulled(c, '4m49s'), ['Normal', 'Started', '4m48s', 'kubelet', 'Started container app'], ['Warning', 'Unhealthy', `${int(c.r, 2, 9)}s (x${int(c.r, 25, 29)} over 4m40s)`, 'kubelet', 'Readiness probe failed: HTTP probe failed with statuscode: 404']] })
		],
		open: [
			"My preview's pod says Running, but helm reports it timed out and the URL gives a 503. How can it be running and not running?",
			'Preview `{release}` is up but not up? `kubectl get pods` says Running, 0/1 ready. After five minutes slipway gives up.',
			'Our preview has been unreachable since we merged the health endpoint rework into `{branch}`. The pod looks alive though.'
		],
		more: ['The app logs look normal, it serves requests if I port-forward.', 'If I port-forward to it the app answers fine.'],
		probe: [
			['What does `kubectl get pods` show?', 'Running but not ready:', 0],
			['Paste `kubectl describe pod` for it? The events at the bottom are what I want.', 'Here:', 1],
			['Did your branch move any routes?', 'We moved the health check, yes. Why?']
		],
		found: [
			"That's it then. Your branch moved the health route to `{newpath}`, and the chart's readiness probe still asks for `{oldpath}`. The app answers 404 there, so Kubernetes never marks the pod ready, the Service sends it no traffic, and helm waits until the five minutes run out.",
			'The probe is asking the old address. The pod runs, but readiness is checked on `{oldpath}`, which your branch removed, so the pod never counts as ready.'
		],
		follow: [['Would production have broken the same way?', 'Yes, on the first deploy. The production chart has the same probe.']],
		end: {
			fixed: [
				[['rep', "Updated the probe path in charts/app to `{newpath}`, and the preview is ready in forty seconds now. Thanks, I wouldn't have spotted that."], ['plat', "Worth keeping the old path answering for a release or two, production's probes will hit the same thing."]],
				[['rep', "We'll keep `{oldpath}` answering as well for now, simplest. Pushed."], ['rep', "Preview's up."]]
			],
			quiet: [[['plat', 'Either keep `{oldpath}` answering or change the probe in charts/app. Let me know which way you go and whether it comes up.']]]
		}
	},
	// A migration that outlasts the five minutes.
	{
		cause: 'chart',
		since: '2026-10-15',
		endings: ['handed', 'fixed', 'quiet'],
		hand: 'data',
		guesses: ['push', 'pool'],
		extra: (r) => ({ table: pick(r, ['orders', 'order_lines', 'events', 'audit_log', 'sessions', 'product_views', 'invoices']), took: String(int(r, 8, 14)) }),
		art: [
			(c) => pods(c, [[`${c.release}-migrate-${podChars(c.r, 5)}`, '1/1', 'Running', '0', age(c.r, 270, 299)]]),
			(c) => slipwayLog(c, [[int(c.r, 1, 9), timedOut(c, c.r() < 0.5)]])
		],
		open: [
			'Preview times out, but only for my branch, and my branch adds a migration. Coincidence?',
			"Every push to `{branch}` ends with helm timing out. The app pod hasn't even started when it gives up, there's a migrate job still running.",
			'Why would a preview time out when the app pods never even got created? I see a `{release}-migrate` job and that is it.'
		],
		more: ['The migration fills in a new column on {table}.', 'On staging the migration took about four minutes.'],
		probe: [
			['Can you paste `kubectl get pods` for the release?', 'Only the migrate job:', 0],
			['What does the migration do?', 'Adds a column to {table} and fills it in for every existing row.']
		],
		found: [
			"The chart runs migrations as a pre-install hook, so helm doesn't start the app until the migrate job finishes. Your migration touches every row of {table}, and on the preview database, which is a much smaller machine than staging, it takes about {took} minutes. slipway gives helm five, so it gives up first.",
			"It's the hook. helm counts the migrate job against the same five minutes, and your migration alone takes longer than that on the preview database."
		],
		proof: 1,
		follow: [['Does the migration finish anyway after helm gives up?', 'The job keeps running, yes, but helm marks the release failed, and the next push starts it again from scratch.']],
		end: {
			handed: [[['plat', 'The preview seed has two years of {table} in it, which nobody needs for a preview. {other}, could data cut the seed to the last 90 days? That would help everyone\'s migrations, not only this one.'], ['other', "Yes, that's overdue. {board}-{ticket}, we'll do it with next week's seed refresh."], ['rep', "Thanks, I'll live with re-running until then."]]],
			fixed: [[['rep', "We'll move the fill-in out of the migration into a job that runs after start-up. That's better for production anyway."], ['rep', 'Done. The preview comes up in two minutes now, and the fill-in runs behind it.']]],
			quiet: [[['plat', 'Can you make the fill-in a separate job that runs after the app starts? Or batch it so the migration itself is quick. Let me know if you want a hand.']]]
		}
	},
	// The pod runs out of memory.
	{
		cause: 'chart',
		since: '2026-10-15',
		endings: ['fixed', 'fixed', 'quiet'],
		guesses: ['push', 'pool', 'chart', 'timeout'],
		art: [
			(c) => describe(c, { state: ['State:          Waiting', '  Reason:       CrashLoopBackOff', 'Last State:     Terminated', '  Reason:       OOMKilled', '  Exit Code:    137'], ready: false, restarts: int(c.r, 4, 8), events: [scheduled(c, '5m'), pulled(c, `${int(c.r, 30, 70)}s (x5 over 4m58s)`), ['Warning', 'BackOff', `${int(c.r, 3, 20)}s (x${int(c.r, 12, 20)} over 4m10s)`, 'kubelet', `Back-off restarting failed container app in pod ${c.pod}_previews`]] }),
			(c) => appLog(c, [...startup(c), ['info', 'warming catalogue cache', `"products":${int(c.r, 180000, 420000)}`]])
		],
		open: [
			'Preview keeps restarting. `{release}` has {n} restarts in ten minutes and then helm gives up.',
			'The pod for my preview is in CrashLoopBackOff, but the logs just stop in the middle of start-up, no error at all.',
			'Help, my preview dies a few seconds after starting. The logs end with the cache warm-up and then nothing.'
		],
		more: ['Nothing in the logs explains it.', 'The branch adds an in-memory cache for the catalogue. It works fine on my laptop.'],
		probe: [
			['Logs from the last crash?', 'They just stop:', 1],
			['Paste describe for the pod?', 'Here:', 0]
		],
		found: [
			'Look at Last State: OOMKilled, exit code 137. The container goes over its memory limit and the kernel kills it, which is why the logs just stop. The chart gives preview pods 256Mi, and your branch warms a cache at start-up that won\'t fit in that.',
			"It's memory. The pod is killed for going over 256Mi, the preview limit in values-preview.yaml, right as your cache warms up."
		],
		follow: [['Why 256Mi for previews when production has much more?', 'Hundreds of previews share the namespace quota. Most of them sit idle, so they get the minimum.']],
		end: {
			fixed: [
				[['rep', 'Raised the preview limit to 512Mi in values-preview.yaml and made the warm-up lazy. Up now.'], ['plat', 'Thanks for going easy on it, the quota is tight.']],
				[['rep', "We'll warm the cache in the background instead of before serving. Pushed."], ['rep', 'That did it.']]
			],
			quiet: [[['plat', "Either raise the memory in values-preview.yaml or warm the cache lazily. Please don't go above 512Mi, the namespace quota is shared. Let me know how it goes?"]]]
		}
	},
	// The chart's API host is two levels down, outside the wildcard certificate.
	{
		cause: 'chart',
		endings: ['fixed', 'fixed', 'handed'],
		hand: 'infrastructure',
		guesses: [],
		art: [(c) => block([`GET https://api.${c.release}.previews.saltmarsh.example/v1/session net::ERR_CERT_COMMON_NAME_INVALID`, `GET https://api.${c.release}.previews.saltmarsh.example/v1/basket net::ERR_CERT_COMMON_NAME_INVALID`, '', `Certificate subject: *.previews.saltmarsh.example`, `Issued by: Saltmarsh Internal CA 2`, `Requested host: api.${c.release}.previews.saltmarsh.example`])],
		open: [
			'Preview loads, but every API call from the page fails, and in the browser console I see certificate errors for `api.{release}.previews.saltmarsh.example`.',
			"My preview's front end comes up and then shows 'something went wrong' everywhere. The console is full of certificate warnings.",
			'Does anyone else get certificate warnings on previews? Only on the API calls, the page itself is fine.'
		],
		more: ['Our branch moves the front end to call the API on its own host, the way production does.', 'In production the API is on api.saltmarsh.example, so we copied that pattern.'],
		probe: [['Which host exactly is failing? Can you copy the error?', 'From the console:', 0], ['Does the page itself load over https without a warning?', 'Yes, the page is fine. It is only the calls to the api host.']],
		found: [
			'The chart puts the API at `api.{release}.previews.saltmarsh.example`, which is two levels below previews.saltmarsh.example. Our certificate is a wildcard for `*.previews.saltmarsh.example`, and a wildcard only covers one level, so the API host is not covered.',
			"It's the shape of the host. `*.previews.saltmarsh.example` covers `{release}.previews.saltmarsh.example` but not `api.` in front of it: wildcards are one level deep."
		],
		follow: [['Why does it work in production?', 'Production has its own certificate for api.saltmarsh.example. Previews only have the one wildcard.']],
		end: {
			fixed: [
				[['plat', 'The easiest fix is in the chart: use `{release}-api.previews.saltmarsh.example`, one level down, and the wildcard covers it.'], ['rep', 'Changed the host template in charts/app, works. Thanks!']],
				[['rep', "We'll keep the API on the same host for previews, under /api, and only split it in production. Done, works."], ['plat', 'Good call.']]
			],
			handed: [[['plat', "If you really need the two-level host, each preview would need its own certificate, and that's infrastructure's cert-manager setup. {other}?"], ['other', "We can issue a certificate per preview, it's a few days of work. {board}-{ticket}."], ['rep', "Great, we'll keep it as it is and wait for that."]]]
		}
	},
	// The shared secret every preview reads has gone.
	{
		cause: 'other',
		on: ['2026-09-17', '2026-11-05'],
		endings: ['handed', 'handed', 'fixed'],
		hand: 'security',
		guesses: ['push', 'chart'],
		wide: true,
		art: [(c) => describe(c, { state: ['State:          Waiting', '  Reason:       CreateContainerConfigError'], ready: false, restarts: 0, events: [scheduled(c, '3m12s'), ['Warning', 'Failed', `${int(c.r, 5, 40)}s (x${int(c.r, 10, 16)} over 3m10s)`, 'kubelet', 'Error: secret "app-preview-env" not found'], pulled(c, `${int(c.r, 5, 40)}s (x${int(c.r, 10, 16)} over 3m10s)`)] })],
		open: [
			'New previews all failing with CreateContainerConfigError since this morning? Mine is `{release}`.',
			"Something's off with previews: my pod won't start, it says it can't find a secret.",
			"Preview for `{branch}` is stuck in CreateContainerConfigError. I didn't change anything about secrets."
		],
		more: ['A preview I pushed yesterday is still running fine, it is only new ones.', 'Re-running the step does not help.'],
		probe: [['Describe for the pod?', 'Here:', 0], ['When did you push?', 'About {mins} minutes ago, and once more just now.']],
		found: [
			"The shared secret every preview reads, `app-preview-env`, is gone from the previews namespace. Security's vault sync copies it in every hour, and since a change to its config yesterday it writes to `preview` instead of `previews`. Pods that were already running are fine; new ones can't start.",
			"`app-preview-env` isn't in the namespace any more. It isn't ours or yours: the vault sync puts it there, and security run that."
		],
		follow: [['Will my running preview break when it restarts?', 'Yes, any pod that starts before the secret is back will fail the same way.']],
		end: {
			handed: [
				[['plat', '{other}, the vault sync has stopped writing `app-preview-env` into previews. Can you take a look? It looks like the namespace name in its config changed.'], ['other', "That'll be my change yesterday, sorry. I'll fix the sync's config this afternoon, {board}-{ticket}."], ['rep', 'Thanks.']],
				[['plat', "This is security's sync. {other}, can you have a look? Every new preview fails until the secret is back."], ['other', 'Looking. {board}-{ticket}.']]
			],
			fixed: [[['plat', "I've restored the secret by hand from last night's copy, and security corrected the sync's config while I was at it, so it'll stay. Re-run your Request preview step."], ['rep', 'Up now, thanks!']]]
		}
	},
	// The preview request goes in before the image is pushed.
	{
		cause: 'pipeline',
		since: '2026-10-15',
		endings: ['handed', 'handed', 'fixed', 'quiet'],
		hand: 'release engineering',
		guesses: ['chart', 'pool', 'name', 'slipway'],
		relapse: true,
		art: [
			(c) => describe(c, { state: ['State:          Waiting', '  Reason:       ImagePullBackOff'], ready: false, restarts: 0, events: [scheduled(c, '4m58s'), ['Normal', 'Pulling', `${int(c.r, 60, 200)}s (x4 over 4m57s)`, 'kubelet', `Pulling image "registry.saltmarsh.example/app:${c.tag}"`], ['Warning', 'Failed', `${int(c.r, 60, 200)}s (x4 over 4m57s)`, 'kubelet', `Failed to pull image "registry.saltmarsh.example/app:${c.tag}": rpc error: code = NotFound desc = failed to resolve reference "registry.saltmarsh.example/app:${c.tag}": registry.saltmarsh.example/app:${c.tag}: not found`], ['Normal', 'BackOff', `${int(c.r, 5, 50)}s (x${int(c.r, 8, 15)} over 4m50s)`, 'kubelet', `Back-off pulling image "registry.saltmarsh.example/app:${c.tag}"`]] }),
			(c) => block([`Run ${int(c.r, 48000, 61999)} on ${c.branch}`, ...columns([['JOB', 'STARTED', 'FINISHED', 'RESULT'], ['test', '14:02:11', '14:06:40', 'succeeded'], ['build-image', '14:02:12', '14:09:03', 'succeeded'], ['push-image', '14:09:05', '14:13:52', 'succeeded'], ['request-preview', '14:09:05', '14:09:07', 'succeeded']])])
		],
		open: [
			'Preview for `{branch}` failed with ImagePullBackOff. The image definitely exists, I can see it in the registry.',
			'My previews fail maybe one push in three with an image pull error, and then work if I re-run. Anyone else?',
			"ImagePullBackOff on `{release}`, says not found, but the build pushed that exact tag."
		],
		more: ['When I re-run the Request preview step it works.', 'It seems to be worse in the afternoons, when the build queue is long.'],
		probe: [
			['Paste the events?', 'Here:', 0],
			['Can you paste the job timings for that run?', 'From the run page:', 1]
		],
		found: [
			"Your pipeline runs Request preview alongside the push, not after it: both start at the same moment in that run. When the push is quick it doesn't matter. When it's slow, helm starts the pod before the tag exists in the registry, Kubernetes backs off, and by the time the image arrives the five minutes are nearly up.",
			"It's ordering. The preview request doesn't wait for the image push, so sometimes helm asks for a tag that isn't there yet. Look at request-preview starting at the same second as push-image."
		],
		follow: [['Why does a re-run always work?', 'By the time you re-run, the push has finished and the tag is there.']],
		end: {
			handed: [[['plat', "The pipeline definition is release engineering's. {other}, can the Request preview step depend on the push job?"], ['other', "Yes, that dependency was lost in last week's reshuffle. {board}-{ticket}, I'll fix it today."], ['rep', 'Thanks!']]],
			fixed: [[['rep', "Found it: our team's override of the pipeline drops the dependency. Fixed it in our config, and the last five pushes all came up first time."], ['plat', 'Great.']]],
			quiet: [[['plat', "Can you check whether Request preview depends on the push job in your pipeline config? If it doesn't, that's the fix."]]]
		}
	},
	// A PR with no build sends an empty tag.
	{
		cause: 'pipeline',
		endings: ['fixed', 'fixed', 'handed'],
		hand: 'release engineering',
		guesses: ['slipway', 'name'],
		art: [(c) => pipeline(c, '400', c.branch, '')],
		open: [
			'Request preview fails with a 400 on my PR, which only touches the docs folder.',
			'Getting `400 Bad Request` from slipway on `{branch}`. The message says it expects a branch and a tag.',
			"My pipeline is red on the preview step: 400, expected branch and tag. What did I do?"
		],
		more: ['The build job was skipped on this PR, I think because of the paths filter.', "It's a docs-only change, I don't even need a preview."],
		probe: [['Paste the step output?', 'Here:', 0], ['What does the PR change?', 'Only Markdown files under docs/.']],
		found: [
			'The tag is empty. Your PR only touched files outside the build\'s paths, so the build job was skipped, its tag output is blank, and the preview step sends an empty tag. slipway refuses a request without a tag.',
			"Look at what it sent: the tag line is empty. No build, no image, no tag, and slipway answers 400 for that by design."
		],
		follow: [['Should slipway accept it and keep the old preview?', "No, a request without a tag is a mistake upstream. It's better that it's loud."]],
		end: {
			fixed: [[['rep', 'Added a condition so the preview step only runs when the build ran. Green now.'], ['plat', 'Perfect.']]],
			handed: [[['plat', "That condition belongs in the shared pipeline, not in every team's copy. {other}, could release engineering make Request preview skip itself when the build was skipped?"], ['other', 'Yes, {board}-{ticket}. Easy one.'], ['rep', 'Thanks.']]]
		}
	},
	// The pipeline sends the full ref instead of the branch name.
	{
		cause: 'pipeline',
		since: '2026-11-03',
		endings: ['fixed', 'handed', 'handed', 'quiet'],
		hand: 'release engineering',
		guesses: ['slipway'],
		release: (branch) => releaseOf(`refs/heads/${branch}`),
		art: [(c) => pipeline(c, '202', `refs/heads/${c.branch}`)],
		open: [
			'My preview URL is `{url}`, which is a mouthful and cut off before the interesting part. Did the naming change?',
			'Since the start of the month all our previews are called `pr-refs-heads-...`. Is that expected?',
			"Preview names look odd this week: mine is `{release}`. The links in our PR template don't work any more."
		],
		more: ['Two of us got the same release name because it was cut before our branch names differed.', 'Our PR template builds the link from the branch name, so all of those links are dead now.'],
		probe: [['Paste the request the pipeline sent?', 'Here:', 0], ['When did your previews last have normal names?', 'In October, I think. They were fine until the start of the month.']],
		found: [
			'slipway is doing what it\'s told: the pipeline is sending the full ref, `refs/heads/{branch}`, as the branch. slipway lowercases it, turns the slashes into hyphens, and you get `pr-refs-heads-...`. It started when the checkout step in the shared pipeline changed on 2 November.',
			'The branch the pipeline sends starts with `refs/heads/`. That is the full git ref, not the branch name.'
		],
		follow: [['Should slipway strip `refs/heads/` itself?', "We'd rather the pipeline sent the right thing. slipway shouldn't have to guess what a branch is."]],
		end: {
			fixed: [[['rep', "Our team's pipeline override was using the ref. Switched it to the branch name output, and names are back to normal."], ['plat', 'Thanks for sorting it.']]],
			handed: [[['plat', "This is the shared pipeline, so it's every team. {other}, since the checkout change on 2 November, Request preview sends `refs/heads/...` as the branch."], ['other', "Ugh, yes. I'll strip the prefix in the step, {board}-{ticket}."], ['rep', 'Thanks.']]],
			quiet: [[['plat', 'Can you check which variable your pipeline passes as the branch? It should be the branch name, not the ref.']]]
		}
	},
	// A team's pipeline still calls slipway's old address.
	{
		cause: 'pipeline',
		since: '2026-10-20',
		endings: ['fixed', 'fixed', 'quiet'],
		guesses: ['slipway'],
		art: [(c) => pipeline(c, 'nohost')],
		open: [
			'Request preview fails with `no such host` for slipway.internal.saltmarsh.example. Has slipway moved?',
			"Our preview step can't reach slipway at all. Is it down?",
			'Request preview step failing for {team} since this morning: no such host.'
		],
		more: ['Other teams seem fine, so it is something about us.', "We haven't touched the pipeline in weeks."],
		probe: [['Paste the output?', 'Here:', 0], ['Does your team use the shared Request preview step, or your own?', 'Our own, I think. We copied it last year to add a cache step.']],
		found: [
			"slipway moved to `slipway.platform.saltmarsh.example` on 5 October, and the old name was kept as an alias until 19 October. Your team's pipeline override still has the old address. Everyone on the shared step got the new one automatically.",
			"It's the old address. The alias for slipway.internal went on 19 October, and your override of the pipeline still points at it."
		],
		follow: [['Was the move announced somewhere?', "In #platform-announce on 5 October, with the date the alias would go. Easy to miss, I know."]],
		end: {
			fixed: [
				[['rep', 'Updated the address in our override. Working. Should we just drop the override?'], ['plat', 'Yes, if you can. The shared step does everything yours does now.']],
				[['rep', "We've deleted our override and use the shared step now. Green."], ['plat', 'Even better.']]
			],
			quiet: [[['plat', "Change the address in your override to the new name, or better, drop the override. Let me know if anything's still red after that?"]]]
		}
	},
	// The preview node pool is full.
	{
		cause: 'cluster',
		since: '2026-10-15',
		endings: ['handed', 'owed', 'owed', 'quiet'],
		hand: 'infrastructure',
		guesses: ['push', 'chart', 'name'],
		wide: true,
		relapse: true,
		extra: (r) => {
			const nodes = int(r, 5, 8);
			return { nodes: String(nodes), more: String(nodes + int(r, 2, 4)) };
		},
		art: [
			(c) => describe(c, { state: [], ready: false, restarts: 0, events: [['Warning', 'FailedScheduling', `${int(c.r, 10, 50)}s (x${int(c.r, 5, 9)} over 4m${int(c.r, 10, 59)}s)`, 'default-scheduler', `0/${Number(c.slots.nodes) + 8} nodes are available: ${c.slots.nodes} Insufficient cpu, 8 node(s) didn't match Pod's node affinity/selector. preemption: 0/${Number(c.slots.nodes) + 8} nodes are available: ${c.slots.nodes} No preemption victims found for incoming pod, 8 Preemption is not helpful for scheduling.`]] }),
			(c) => allocated(c, Number(c.slots.nodes)),
			(c) => topNodes(c, Number(c.slots.nodes))
		],
		open: [
			'Preview pod stuck in Pending for ages, then helm times out. `{release}`.',
			"Is the preview cluster full? My pod hasn't been scheduled in ten minutes.",
			"Previews seem to be queueing: mine says Pending, and so does {peer}'s."
		],
		more: ['It was fine this morning.', 'Main\'s preview is running, it is only new ones.'],
		probe: [
			['Events for the pod?', 'FailedScheduling, over and over:', 0],
			['How many previews does your team have running?', 'Three, I think. Maybe four.']
		],
		found: [
			"The preview node pool is full. It's at its maximum of {nodes} nodes, every node has nearly all its CPU requested, and most of those requests are previews nobody has looked at in weeks. New pods wait for room that never comes.",
			"No room. The pool is at its node limit and the scheduler can't place your pod anywhere: insufficient CPU on every node."
		],
		proof: 1,
		follow: [['Do idle previews really hold CPU?', 'They hold what they request, whether they use it or not. 250m each adds up across a few hundred releases.']],
		end: {
			handed: [[['plat', '{other}, the previews pool is at its maximum again. Could infrastructure raise it from {nodes} to {more} nodes?'], ['other', "We can, but it needs a change approval, so tomorrow at the earliest. {board}-{ticket}, I'll update it there."], ['rep', "OK, I'll wait."]]],
			owed: [[['plat', "The real fix is getting rid of the old previews, and that's ours: slipway needs a delete that the pipeline calls when a PR closes. I've moved PLAT-{ticket} to the top. For today I've uninstalled a dozen releases from merged PRs by hand, so yours can schedule."], ['rep', "It's up now. Thanks."]]],
			quiet: [[['plat', "I've removed a few old previews by hand. Can you re-run your step and tell me whether it schedules now?"]]]
		}
	},
	// The namespace quota is used up.
	{
		cause: 'cluster',
		since: '2026-10-15',
		endings: ['handed', 'owed', 'fixed'],
		hand: 'infrastructure',
		guesses: ['push', 'chart', 'name'],
		art: [
			(c) => events(c, 'involvedObject.kind=ReplicaSet', Array.from({ length: int(c.r, 2, 4) }, () => [`${int(c.r, 5, 59)}s`, 'Warning', 'FailedCreate', `replicaset/${c.release}-app-${podChars(c.r, 9)}`, `Error creating: pods "${c.release}-app-${podChars(c.r, 9)}-${podChars(c.r, 5)}" is forbidden: exceeded quota: previews-compute, requested: requests.cpu=250m, used: requests.cpu=${int(c.r, 39800, 39990)}m, limited: requests.cpu=40`])),
			(c) => quota(c)
		],
		extra: (r) => ({ cpu: '40', more: String(int(r, 48, 64)) }),
		open: [
			"My preview has no pods at all, but the deployment exists. I've never seen that before.",
			"`kubectl get deploy` shows `{release}-app` with 0/1 and no pods. What's going on?",
			'Preview for `{branch}` times out with zero pods created. Not Pending, just none.'
		],
		more: ['The deployment is there, with no pods under it.', 'Re-running gives the same.'],
		probe: [['Look at the events for the replica set: `kubectl get events -n previews --field-selector involvedObject.kind=ReplicaSet`', 'This:', 0], ['Is anything Pending, or are there simply no pods?', 'No pods at all. The deployment says 0/1 and that is it.']],
		found: [
			"The namespace has run into its quota. previews has a fixed allowance of CPU and memory requests, it's used up, and Kubernetes refuses to create new pods at all. That's why you see a deployment with nothing in it.",
			'Quota. The previews namespace is allowed {cpu} CPUs of requests in total, and they are all taken.'
		],
		proof: 1,
		follow: [['Who decides the quota?', 'Infrastructure set it with the node pool, so the two stay in step.']],
		end: {
			handed: [[['plat', 'The quota is set by infrastructure. {other}, could you raise the previews quota? We are at the limit most afternoons now.'], ['other', "We can go to {more}, but not before the node pool is bigger. Ticket {board}-{ticket}, I'll update it there."], ['rep', 'Thanks.']]],
			owed: [[['plat', "Most of what's using the quota is previews of merged PRs. slipway needs to clean those up itself, and PLAT-{ticket} is that. For today I've removed twenty of the oldest by hand, and you're running."], ['rep', "Confirmed, it's up. Thanks!"]]],
			fixed: [[['plat', "I've removed the previews of PRs that were merged more than two weeks ago, which frees plenty. Re-run your step."], ['rep', 'Up and running, thanks.']]]
		}
	},
	// A node drained for maintenance while the pod started.
	{
		cause: 'cluster',
		since: '2026-10-15',
		endings: ['fixed', 'fixed', 'quiet'],
		guesses: ['chart', 'push', 'name'],
		extra: (r) => ({ when: `${pad(int(r, 10, 15))}:00`, k: String(int(r, 1, 6)) }),
		art: [(c) => events(c, `involvedObject.name=${c.pod}`, [[`${int(c.r, 8, 9)}m`, 'Normal', 'Scheduled', `pod/${c.pod}`, `Successfully assigned previews/${c.pod} to pool-previews-${c.slots.k}`], [`${int(c.r, 6, 7)}m`, 'Normal', 'Killing', `pod/${c.pod}`, 'Stopping container app'], [`${int(c.r, 6, 7)}m`, 'Warning', 'NodeNotReady', `pod/${c.pod}`, 'Node is not ready'], [`${int(c.r, 4, 5)}m`, 'Normal', 'TaintManagerEviction', `pod/${c.pod}`, 'Marking for deletion Pod previews/' + c.pod]])],
		open: [
			'Preview timed out once, and then worked when I re-ran it. Should I worry?',
			'Weird: `{release}` got killed halfway through starting, came back on another node, and helm still timed out.',
			'My preview was up, then it wasn\'t for about ten minutes, then it was again. Did something happen around {when}?'
		],
		more: ['Nothing changed between the two runs.', 'I have the events from the first try if that helps.'],
		probe: [['Got the events?', 'Yes:', 0], ['What time did the first attempt start?', 'Just before {when}.']],
		found: [
			'Infrastructure were draining the preview nodes one at a time for the kernel patch, from {when} for about an hour. Your pod got moved while helm was waiting, so it ran out of time. Nothing wrong with your branch or with slipway.',
			'Node maintenance. pool-previews-{k} was drained while your pod was starting, so it was evicted and rescheduled, and the clock kept running for helm.'
		],
		follow: [['Is there a way to know when maintenance is on?', 'Infrastructure post it in #infra-announce the day before.']],
		end: {
			fixed: [[['rep', "Good to know. Re-ran it and it's fine."], ['plat', 'Infrastructure post maintenance in #infra-announce, worth following.']]],
			quiet: [[['plat', 'Re-run it now that the maintenance is over, and tell me if it times out again?']]]
		}
	},
	// The registry login of the namespace has expired.
	{
		cause: 'cluster',
		on: ['2026-09-29'],
		endings: ['handed', 'handed', 'fixed'],
		hand: 'release engineering',
		guesses: ['chart', 'name', 'slipway'],
		wide: true,
		art: [(c) => describe(c, { state: ['State:          Waiting', '  Reason:       ImagePullBackOff'], ready: false, restarts: 0, events: [scheduled(c, '2m30s'), ['Warning', 'Failed', `${int(c.r, 10, 60)}s (x3 over 2m29s)`, 'kubelet', `Failed to pull image "registry.saltmarsh.example/app:${c.tag}": rpc error: code = Unknown desc = failed to authorize: failed to fetch oauth token: unexpected status: 401 Unauthorized`], ['Normal', 'BackOff', `${int(c.r, 5, 50)}s (x6 over 2m20s)`, 'kubelet', `Back-off pulling image "registry.saltmarsh.example/app:${c.tag}"`]] })],
		open: [
			'ImagePullBackOff on my preview: unauthorized. The image is definitely there.',
			'Previews cannot pull images? `{release}` gets a 401 from the registry.',
			'Is the registry down? My preview cannot pull.'
		],
		more: ['Staging deployed the same commit fine an hour ago.', 'Re-running makes no difference.'],
		probe: [['Events?', 'Here:', 0], ['Is it every new pod or only yours?', "{peer}'s new preview as well. The ones already running are fine."]],
		found: [
			"The pull secret the previews namespace uses to log in to the registry belongs to a robot account, and its token expired overnight. Every pod that needs to pull fails. Running ones are fine until they restart.",
			"The registry login in previews has expired. It's a robot account's token with a 90-day life."
		],
		follow: [['Why does staging still work?', 'Staging has its own robot account, with a different expiry date.']],
		end: {
			handed: [[['plat', "The robot account is release engineering's. {other}, the previews pull token has expired, can you issue a new one? And could the next one last longer than 90 days?"], ['other', 'On it. {board}-{ticket} for the longer one.'], ['rep', 'Thanks.']]],
			fixed: [[['plat', "I got a new token from release engineering and updated the secret. Re-run your Request preview steps."], ['rep', 'Pulled and running.']]]
		}
	},
	// The wildcard certificate for previews expired.
	{
		cause: 'cluster',
		on: ['2026-10-12'],
		endings: ['handed', 'fixed'],
		hand: 'infrastructure',
		guesses: [],
		wide: true,
		art: [(c) => block([`https://${c.release}.previews.saltmarsh.example`, 'Your connection is not private', 'NET::ERR_CERT_DATE_INVALID', '', 'Subject: *.previews.saltmarsh.example', 'Issuer: Saltmarsh Internal CA 2', `Expires on: ${Number(c.date.slice(8))} ${monthNames[Number(c.date.slice(5, 7)) - 1]} 2026, 00:00:00`])],
		open: [
			'Every preview URL shows a certificate expired warning this morning.',
			'My browser refuses to open `{url}`: NET::ERR_CERT_DATE_INVALID.',
			"Are preview certificates broken? Chrome won't let me through, Firefox shows an expired warning."
		],
		more: ['Staging is fine.', 'Tried two browsers.'],
		probe: [['Can you paste what the browser shows?', 'Sure:', 0], ['Is it every preview?', 'Every one I have tried, including main.']],
		found: [
			"The wildcard certificate for previews.saltmarsh.example expired at midnight. cert-manager should have renewed it a month ago, but the renewal has been failing quietly since the DNS provider change.",
			"Expired certificate. It's the shared wildcard, so every preview is affected, not only yours."
		],
		follow: [['Is it safe to click through in the meantime?', 'For previews, yes, it is our own expired certificate. Please don\'t make a habit of it.']],
		end: {
			handed: [[['plat', "That's infrastructure's cert-manager. {other}?"], ['other', 'Looking now. The DNS challenge has been failing since we moved providers. {board}-{ticket}.'], ['rep', 'Thanks.']]],
			fixed: [[['plat', 'Infrastructure fixed the DNS challenge and the certificate has renewed. Reload and you should be fine.'], ['rep', 'Works now, thanks.']]]
		}
	},
	// Sign-in on a preview is refused by the identity provider.
	{
		cause: 'other',
		endings: ['handed', 'handed', 'fixed'],
		hand: 'security',
		guesses: [],
		art: [(c) => block([`GET https://login.saltmarsh.example/oauth2/authorize?client_id=app-previews&redirect_uri=https%3A%2F%2F${c.release}.previews.saltmarsh.example%2Fauth%2Foidc%2Fcallback&response_type=code`, '', '{"error":"redirect_uri_mismatch","error_description":"The redirect URI in the request does not match the ones authorized for the client.","client_id":"app-previews"}'])],
		open: [
			'Logging in on my preview sends me to SSO, and then it fails with `redirect_uri_mismatch`.',
			"Can't log in to `{url}`. SSO says the redirect isn't allowed.",
			'Previews and SSO: is login supposed to work? Mine fails right after the Saltmarsh login page.'
		],
		more: ["Main's preview logs in fine, oddly.", '{peer} sees the same on their preview of our branch.'],
		probe: [
			['What does the error page say exactly?', 'This:', 0],
			['Is it every preview or just yours?', "Mine and {peer}'s, who's on the same branch. Main's preview works."]
		],
		found: [
			'The SSO client for previews only allows redirects to `https://*.previews.saltmarsh.example/auth/callback`. Your branch changed the callback route to `/auth/oidc/callback`, which is not on the list.',
			'Your branch moved the callback path, and the SSO client only allows the old one for previews.'
		],
		follow: [['Will staging and production need the same change?', 'Yes, all three clients list the callback path, so plan for it before you merge.']],
		end: {
			handed: [
				[['plat', "The allowed redirects are security's to change. {other}, could you add `/auth/oidc/callback` for previews? Production will need it too when this merges."], ['other', "Yes, {board}-{ticket}. I'll do previews and staging today."], ['rep', 'Thanks!']],
				[['plat', 'That needs security. {other}, could you add the new callback path to the previews client?'], ['other', "I'll pick it up tomorrow, {board}-{ticket}."]]
			],
			fixed: [[['rep', "Ah, we didn't mean to change that, it came in with the router upgrade. Put it back. Works."], ['plat', 'Nice and simple.']]]
		}
	},
	// The preview seed data is old.
	{
		cause: 'other',
		since: '2026-10-01',
		endings: ['handed', 'handed', 'quiet'],
		hand: 'data',
		guesses: [],
		art: [],
		open: [
			"Previews don't have any accounts on the new plans. Is the preview database seeded from something old?",
			'In my preview there is no data newer than July. Can that be refreshed?',
			'Testing the plan-change flow on a preview is impossible: none of the seeded accounts are on the annual plans we launched in September.'
		],
		more: ['I can create accounts by hand, but the invoices and history matter for what I am testing.', 'Staging has the new plans, of course.'],
		probe: [['Which data do you need, roughly?', 'A handful of accounts on each plan, with a few months of invoices.'], ['Is staging any good for it?', 'Staging has the plans, but QA use it all day and we cannot break it.']],
		found: [
			"The preview database is restored from the seed snapshot that data take every quarter, and the last one is from July. Anything launched since then simply isn't in it.",
			"The seed is from July. The September plans aren't in it."
		],
		follow: [['Can I add my own rows to the seed?', 'Not directly, data build it. You can insert into your own preview schema, it stays between pushes.']],
		end: {
			handed: [[['plat', "The seed is the data team's. {other}, any chance of an earlier refresh, or a few accounts on the new plans added to it?"], ['other', 'The October refresh slipped, sorry. We will have a new snapshot by next Friday, {board}-{ticket}.'], ['rep', 'Great.']]],
			quiet: [[['plat', "Data take the seed snapshot, and I've asked in their channel when the next one is. Can you add the accounts you need by hand in the meantime, or do you want me to?"]]]
		}
	},
	// The browser serves the old front end.
	{
		cause: 'other',
		endings: ['fixed'],
		guesses: ['slipway', 'push'],
		art: [(c) => helmStatus(c, 'deployed', int(c.r, 4, 19))],
		open: [
			'My preview still shows the old page after I pushed the redesign. Did the upgrade not happen?',
			"The preview is on the new commit according to the pipeline, but I'm looking at yesterday's front end.",
			"Pushed an hour ago and `{url}` hasn't changed. Is slipway behind?"
		],
		more: ['A colleague says they see the new version on their machine.', 'I have tried reloading a few times.'],
		probe: [
			['What does helm say?', 'Deployed:', 0],
			['And which image is the pod running?', "`registry.saltmarsh.example/app:{tag}`, which is my last commit."]
		],
		found: [
			'Then the preview has your code and your browser does not. The app registers a service worker that caches the front end, and on a preview host it keeps serving the old bundle until it notices the new one. A hard reload, or unregistering it in the dev tools, does it.',
			"Server side, everything is on `{tag}`. It's the service worker in your browser serving the cached bundle."
		],
		follow: [['Does that happen to real users too?', 'In production the bundle names change with each release, so the worker picks them up. Previews reuse one host for many pushes, which is why it shows up there.']],
		end: {
			fixed: [
				[['rep', 'Hard reload did it. I feel a bit silly. Thanks.'], ['plat', "Everyone hits it once. You're not the first this week."]],
				[['rep', 'Unregistered it, and there is the redesign. Might be worth turning the service worker off on previews?'], ['plat', 'Good idea. That would be a chart value on your side, if you want it.']]
			]
		}
	},
	// Showing a preview to someone outside the company.
	{
		cause: 'other',
		endings: ['declined', 'fixed', 'fixed'],
		guesses: [],
		art: [],
		open: [
			'Can we send a preview link to a partner so they can try the new order feed before we merge?',
			'Quick policy question: are previews OK to show to a customer on a call?',
			'Our account manager wants to send a client a link to `{url}`. Is that allowed?'
		],
		more: ['They would want to log in and click around, not just look.', 'It would only be for a week or so.'],
		probe: [['Would they need to log in, or just look?', 'Log in and try a few orders.'], ['Who would be looking, and for how long?', 'Two people at the partner, for about a week.']],
		found: [
			'Previews sit behind staff SSO, so an outside person can\'t log in anyway, and the data in them is test data that can look odd to a customer.',
			'Previews are staff only: behind SSO, full of test data, and they change with every push.'
		],
		follow: [['Could we screen-share one instead?', 'Screen-sharing on a call is fine. It is sending links that we avoid.']],
		end: {
			declined: [[['plat', "So no, sorry: previews aren't for outside people, and we're not planning to open them up."], ['rep', 'Understood, thanks.']]],
			fixed: [[['plat', 'What you want is the demo environment, demo.saltmarsh.example. Partners can log in there with guest accounts. Ask in #demo-env and they will put your branch on it for a day.'], ['rep', 'Perfect, asking there now.']]]
		}
	},
	// The shared preview database is overloaded.
	{
		cause: 'other',
		endings: ['handed', 'handed', 'quiet'],
		hand: 'data',
		guesses: ['pool'],
		extra: (r) => ({ count: String(int(r, 150, 240)) }),
		art: [(c) => appLog(c, [['warn', 'slow query', `"ms":${int(c.r, 2200, 6900)},"table":"products"`], ['warn', 'slow query', `"ms":${int(c.r, 2200, 6900)},"table":"orders"`], ['warn', 'database pool exhausted, waiting', `"waiting":${int(c.r, 4, 12)}`], ['warn', 'slow query', `"ms":${int(c.r, 2200, 6900)},"table":"sessions"`], ['info', 'request', `"path":"/search","status":200,"ms":${int(c.r, 5000, 9000)}`]], false)],
		open: [
			'Previews are really slow this week. Pages take five or six seconds.',
			"Is it just me or are previews crawling? Even main's preview.",
			"Our preview's search page times out half the time, but on staging it's instant."
		],
		more: ['It is worst in the afternoon.', 'Same commit is fast on staging.'],
		probe: [['Is it every page or some?', 'Anything that touches the database. Here is the app log while I click around:', 0], ['When did you first notice?', 'Monday afternoon. Mornings are fine.']],
		found: [
			"All previews share one small Postgres, a schema each, and with {count} previews running it's at full CPU most of the day. Every preview's queries queue behind everyone else's.",
			"It's the shared preview database: one instance, a schema per preview, and it's saturated."
		],
		follow: [['Would removing old previews help?', 'A little. Idle schemas cost disk, not CPU. The busy ones are the problem.']],
		end: {
			handed: [[['plat', '{other}, previews-db has been at full CPU most afternoons this week. Could data move it to a bigger instance?'], ['other', 'We can resize it on Saturday morning. {board}-{ticket}.'], ['rep', 'Thanks.']]],
			quiet: [[['plat', 'Is anyone on your team running anything heavy against a preview this week, a load test or an import? That would explain the afternoons.']]]
		}
	},
	// All previews share one payment sandbox account.
	{
		cause: 'other',
		endings: ['handed', 'handed', 'quiet'],
		hand: 'payments',
		guesses: ['chart'],
		art: [(c) => appLog(c, [['info', 'creating payment', `"amount":${int(c.r, 500, 9000)},"currency":"GBP"`], ['warn', 'payment provider answered 429', `"retry_after":${int(c.r, 20, 60)}`], ['info', 'creating payment', `"amount":${int(c.r, 500, 9000)},"currency":"GBP"`], ['error', 'payment failed', '"reason":"too_many_requests","account":"sandbox-shared"']], false)],
		open: [
			"Payments fail on my preview with 'too many requests'. The same code works on staging.",
			'Test card payments on previews keep failing with a 429 from the payment provider.'
		],
		more: ['It started a couple of hours ago.', 'Staging uses its own sandbox account, I think.'],
		probe: [['What does the app log say when it fails?', 'This:', 0], ['Is it every payment or some?', 'About half of them. The rest go through.']],
		found: [
			'Every preview uses the same payment provider sandbox account, and the sandbox allows 100 requests a minute per account. With a couple of load tests running in previews today, everyone else gets 429s.',
			"Shared sandbox account. Someone's preview is hammering it, and the provider limits the whole account."
		],
		follow: [['Can I see whose preview it is?', 'The provider dashboard shows the calls, but not which preview made them. I asked in #engineering.']],
		end: {
			handed: [[['plat', 'The sandbox accounts belong to payments. {other}, could previews get their own sandbox account, apart from staging\'s and apart from load tests?'], ['other', "Yes, I'll request one from the provider. {board}-{ticket}, it takes a few days."], ['rep', 'Thanks.']]],
			quiet: [[['plat', 'Is anyone running load tests against a preview right now? That would explain it.']]]
		}
	},
	// Webhooks from outside cannot reach previews.
	{
		cause: 'other',
		endings: ['declined', 'declined', 'handed'],
		hand: 'infrastructure',
		guesses: [],
		art: [],
		open: [
			"Can a preview receive webhooks from outside? The carrier's tracking callbacks never reach mine.",
			"Our partner's webhooks don't arrive at `{url}`. Is inbound traffic blocked for previews?"
		],
		more: ['The carrier says they get a timeout from our side.', 'On staging the callbacks arrive fine.'],
		probe: [['Where does the carrier send them from?', 'Their own servers, a handful of fixed addresses.'], ['Do the calls show up anywhere in the preview logs?', 'Nothing at all, not even a failed request.']],
		found: [
			"Previews can only be reached from the office network and the VPN; the ingress refuses everything else. A carrier's servers can't get in, and that's by design.",
			'Inbound traffic to previews is limited to our own networks, so outside callbacks are dropped at the ingress.'
		],
		follow: [['Why is staging open to them?', 'Staging has an allowlist for a few partners, agreed with security last year.']],
		end: {
			declined: [[['plat', "We're keeping it that way: previews have staff SSO, but plenty of unfinished code, and we don't want them on the open internet. Use the carrier's sandbox callback replay instead."], ['rep', "OK, we'll do that."]]],
			handed: [[['plat', "If you need it, the way would be an allowlist of the carrier's addresses on the ingress, and that's infrastructure's. {other}?"], ['other', "Possible, but it needs a security review first. {board}-{ticket}, I'll loop security in."], ['rep', "Thanks, we'll wait."]]]
		}
	}
];

// The working days the threads start on, and a few after them for replies.
const workdays: string[] = [];
for (let day = new Date('2026-09-03T12:00:00Z'); day <= new Date('2026-11-20T12:00:00Z'); day.setUTCDate(day.getUTCDate() + 1))
	if (day.getUTCDay() >= 1 && day.getUTCDay() <= 5) workdays.push(day.toISOString().slice(0, 10));
const startDays = workdays.filter((day) => day <= '2026-11-18');

const lowerStart = (text: string) => (/^[A-Z][a-z]/.test(text) && !/^(I|I'm|I've|I'd|I'll)\b/.test(text) ? text[0]!.toLowerCase() + text.slice(1) : text);
const terseText = (text: string) => lowerStart(text).replace(/\.$/, '');

interface Party {
	topic: Topic;
	ctx: Ctx;
	people: Record<Role, string>;
}
const makeParty = (r: Rand, topic: Topic, team: string, who: string, peer: string, plat: string, plat2: string, date: string, minute: number): Party => {
	const peerTeam = teamNames.find((name) => teams[name]!.includes(peer)) ?? team;
	const pair = topic.pair?.(r, team);
	const branch = pair ? pair[0] : topic.branch ? topic.branch(r, team, who) : plainBranch(r, team, who);
	const branch2 = pair ? pair[1] : plainBranch(r, peerTeam, peer);
	const release = topic.release ? topic.release(branch) : releaseOf(branch);
	const other = topic.hand ? pick(r, handTeams[topic.hand].people) : '';
	const fixed = branch.replace(/[_.]/g, '-');
	const workItem = Object.keys(features).find((item) => branch.replace(/_/g, '-').includes(item));
	const ctx: Ctx = { r, date, minute, branch, branch2, release, release2: releaseOf(branch2), tag: hex(r, 7), tag2: hex(r, 7), pod: `${release}-app-${podChars(r, 10)}-${podChars(r, 5)}`, slots: {} };
	ctx.slots = {
		rep: first(who),
		peer: first(peer),
		plat: first(plat),
		plat2: first(plat2),
		other: first(other),
		team,
		peerTeam,
		branch,
		branch2,
		release,
		release2: ctx.release2,
		tag: ctx.tag,
		tag2: ctx.tag2,
		url: `https://${release}.previews.saltmarsh.example`,
		pod: ctx.pod,
		n: String(int(r, 3, 9)),
		mins: String(int(r, 8, 45)),
		when: clock(Math.max(480, minute - int(r, 20, 90))),
		ticket: String(int(r, 300, 699)),
		board: topic.hand ? handTeams[topic.hand].board : 'PLAT',
		fixed,
		fixedRelease: releaseOf(fixed),
		feature: workItem ? features[workItem]! : '',
		...(topic.extra?.(r) ?? {})
	};
	return { topic, ctx, people: { rep: who, peer, plat, plat2, other } };
};
const fill = (text: string, slots: Record<string, string>) =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		if (!(key in slots)) throw new Error(`no slot {${key}} in: ${text.slice(0, 80)}`);
		return slots[key]!;
	});

// Background the platform team gives along with an answer, shared by the topics that work the same way.
const background: Record<string, string[]> = {
	naming: [
		"For background: slipway makes the release name from the branch alone. It puts `pr-` in front, lowercases the branch, turns slashes and spaces into hyphens and cuts the result at 53 characters, because that's the longest name helm accepts. It doesn't look at anything else, and it doesn't check the result before handing it to helm.",
		"Some background, since it comes up a lot: the release name is `pr-` plus the branch name, lower-cased, with slashes and spaces as hyphens, cut to helm's 53 characters. That's all slipway does to it, so whatever else is in the branch name ends up in the release name as it is.",
		'How the name is made, for the record: slipway takes the branch, lowercases it, swaps `/` and spaces for `-`, puts `pr-` at the front and cuts at 53. The pipeline gets that name back in the 202 before helm has even started.'
	],
	waiting: [
		"Some background: since 0.3.0 slipway runs `helm upgrade --install` with `--wait`, so helm only counts the install as done when every pod is ready, and it gives up after SLIPWAY_HELM_TIMEOUT, five minutes. Anything that keeps a pod from being ready ends the same way in slipway's log: context deadline exceeded.",
		"For context, the timeout message is the same whatever goes wrong: helm waits up to five minutes for the release's pods to be ready, and if they aren't, slipway logs 'context deadline exceeded'. So that line only tells you that something kept the pods from being ready, never what.",
		"Worth knowing for next time: `context deadline exceeded` in slipway's log just means helm waited the full five minutes for ready pods. The reason is always in the pods themselves, in `kubectl describe` and the container logs."
	],
	request: [
		"Background, in case it helps: the Request preview step is a single POST to slipway with the branch and the tag. slipway checks that both are there, answers 202 with the release name and starts helm in the background. If the step can't reach slipway, or slipway refuses the request, the step fails; anything after the 202 never shows up in the pipeline.",
		"For the record, the pipeline only ever sees slipway's first answer: 202 with the release name if the request was accepted, 400 if the branch or the tag is missing, or a connection error if slipway can't be reached. Everything helm does after that only shows in slipway's log and in the namespace."
	],
	namespace: [
		'Some background on the namespace: every preview lives in `previews` and shares its quota, its registry login and the `app-preview-env` secret, and runs on the preview node pool. So when one of those shared pieces goes wrong, every new preview is affected at once, while the ones already running carry on.',
		"For context, previews share a lot: one namespace, one quota, one pull secret, one node pool. That's cheap, but it means a problem with any of them shows up for everyone who pushes at that moment."
	],
	hosts: [
		'Background: each preview gets one host, `<release>.previews.saltmarsh.example`, served by the shared ingress with one wildcard certificate and only reachable from the office network and the VPN. Anything that needs another host, or traffic from outside, needs more than slipway sets up.',
		'For context, slipway knows nothing about hosts or certificates: the chart\'s ingress asks for `<release>.previews.saltmarsh.example`, and the shared ingress with its wildcard certificate does the rest.'
	],
	data: [
		"Some background: previews don't get their own database server. They share one Postgres, `previews-db`, with a schema per release, restored from the seed snapshot the data team takes, and they share sandbox accounts for outside services unless someone has set up their own.",
		"For context, everything a preview talks to apart from its own pods is shared: the database, the seed data, the sandbox accounts. That's what keeps previews cheap, and it's why one busy preview can be felt in all of them."
	],
	slipway: [
		'For the record, slipway is deliberately small: one endpoint that takes a branch and a tag, makes a name and runs helm in the background. It keeps no state, so anything that needs it to remember previews, report on them or remove them is new work.',
		"Background: slipway does exactly one thing, `helm upgrade --install` for a branch and a tag, and remembers nothing afterwards. That's why it has no list of previews, no status and no delete."
	]
};
const backgroundOf = ['naming', 'naming', 'naming', 'naming', 'request', 'slipway', 'slipway', 'slipway', 'naming', 'slipway', 'waiting', 'waiting', 'waiting', 'waiting', 'hosts', 'namespace', 'waiting', 'request', 'naming', 'request', 'namespace', 'namespace', 'waiting', 'namespace', 'hosts', 'hosts', 'data', '', '', 'data', 'data', 'hosts'];

// Which help form a topic's question is asked with, by the topic's place in the list; topics left out are asked
// as plain messages.
const formOf: (keyof typeof expected | undefined)[] = ['install', 'install', 'install', 'install', 'request', undefined, 'install', undefined, 'install', undefined, 'install', 'install', 'install', 'install', 'running', 'install', 'install', 'request', undefined, 'request', 'install', 'install', 'install', 'install', 'running', 'running', 'running', 'running', undefined, 'running', 'running', 'running'];

// An outage only comes up in the thread chosen for it on its day; other topics wait for their first possible day.
const allowed = (topic: Topic, date: string) => (!topic.since || date >= topic.since) && !topic.on;

const thread = (index: number, date: string, startMinute: number, lean: boolean, outage?: number): { name: string; text: string } => {
	const r = mulberry32(0x5a1f0000 + index * 7919);
	let topicIndex = outage ?? (index * 11 + int(r, 0, 2)) % topics.length;
	while (outage === undefined && !allowed(topics[topicIndex]!, date)) topicIndex = (topicIndex + 1) % topics.length;
	const topic = topics[topicIndex]!;
	const ending = pick(r, topic.endings);
	const team = pick(r, teamNames);
	const who = pick(r, teams[team]!);
	const sameTeam = teams[team]!.filter((name) => name !== who);
	const everyone = Object.values(teams).flat();
	const peer = topic.pair && sameTeam.length ? pick(r, sameTeam) : pick(r, everyone.filter((name) => name !== who));
	const [plat, plat2] = shuffle(r, platform) as [string, string];
	const main = makeParty(r, topic, team, who, peer, plat, plat2, date, startMinute);
	const teamOf = (name: string) => teamNames.find((t) => teams[t]!.includes(name)) ?? team;

	let day = workdays.indexOf(date);
	let minute = startMinute;
	const messages: string[] = [];
	const say = (party: Party, role: Role, text: string, art?: number | Art) => {
		const person = party.people[role];
		party.ctx.date = workdays[day]!;
		party.ctx.minute = minute;
		let body = fill(text, party.ctx.slots);
		if ((role === 'rep' || role === 'peer') && terse.has(person)) body = terseText(body);
		const pasted = typeof art === 'number' ? party.topic.art[art]?.(party.ctx) : art?.(party.ctx);
		messages.push(`**${person}** · ${clock(minute)}\n${body}${pasted ? `\n\n${pasted}` : ''}`);
	};
	const nextDay = (skip: number) => {
		day = Math.min(day + 1 + skip, workdays.length - 1);
		minute = int(r, 8 * 60 + 40, 10 * 60 + 30);
		messages.push(`*${longDate(workdays[day]!)}*`);
	};
	const wait = (low: number, high: number) => {
		minute += int(r, low, high);
		if (minute > 18 * 60 + 15) nextDay(0);
	};

	// The question, through the help form or as a plain message.
	const form = formOf[topicIndex];
	const openText = pick(r, topic.open);
	const more = r() < 0.75 ? pick(r, topic.more) : '';
	const why = form && r() < 0.45 ? pick(r, urgency) : '';
	const context = main.ctx.slots.feature && r() < 0.6 ? pick(r, contextLines) : '';
	const early = r() < 0.3 ? topic.probe[0]?.[2] : undefined;
	if (form && r() < 0.6) {
		const steps = shuffle(r, tried[form]).slice(0, int(r, 1, 3));
		const lines = [
			`> **Branch:** \`{branch}\``,
			`> **Pull request:** app#${int(r, 8400, 9900)}`,
			`> **What happened:** ${openText}${more ? ` ${more}` : ''}`,
			...(context ? [`> **About the branch:** ${context}`] : []),
			`> **What I expected:** ${pick(r, expected[form])}`,
			`> **What I've tried:** ${steps.join('; ').replace(/^./, (x) => x.toUpperCase())}.`,
			`> **How urgent:** ${why || pick(r, ['Not urgent.', 'Today would be good.', 'Blocking a review.', 'Whenever someone has a minute.'])}`
		];
		messages.push(`**${who}** · ${clock(minute)} · sent with the preview-help form\n${fill(lines.join('\n'), main.ctx.slots)}`);
		if (early !== undefined) {
			wait(1, 3);
			say(main, 'rep', pick(r, ['Here is what I see:', 'In case it helps:', 'Pasting what I have:']), early);
		}
	} else {
		const steps = form && r() < 0.5 ? shuffle(r, tried[form]).slice(0, int(r, 2, 3)) : [];
		const so = steps.length ? `I already ${steps.slice(0, -1).join(', ')} and ${steps.at(-1)}.` : '';
		say(main, 'rep', [openText, context, more, so, why].filter(Boolean).join(' '), early);
	}
	if (topic.wide) {
		wait(2, 15);
		say(main, 'peer', pick(r, plusOnes));
	}
	wait(3, 40);
	say(main, 'plat', pick(r, looking));

	// The digging: the platform team's questions, wrong first ideas, asides and other people's problems.
	const evidence = topic.probe.find((probe) => probe[2] !== undefined)?.[2];
	const probes = topic.probe.filter((probe, i) => (i === 0 ? early === undefined : r() < 0.85));
	const ideas = shuffle(r, topic.guesses).slice(0, r() < 0.45 ? 2 : r() < 0.75 ? 1 : 0);
	const slots = probes.length + 1;
	const ideaAt = ideas.map(() => int(r, 0, slots - 1));
	const asidePool = shuffle(r, asides);
	const asideAt = r() < 0.65 ? [int(r, 0, slots - 1), ...(r() < 0.35 ? [int(r, 0, slots - 1)] : [])] : [];
	const sideAt = !lean && r() < 0.85 ? int(r, 1, slots - 1) : -1;
	const sideAt2 = !lean && r() < 0.3 ? int(r, 0, slots - 1) : -1;
	const explainAt = r() < 0.4 ? int(r, 0, slots - 1) : -1;
	const attemptAt = form === 'install' && !topic.relapse && !topic.pair && topic.guesses.includes('name') === false && r() < 0.55 ? int(r, 1, slots - 1) : -1;
	const pauseAt = r() < 0.3 ? int(r, 0, slots - 1) : -1;
	const between = (slot: number) => {
		ideas.forEach((idea, i) => {
			if (ideaAt[i] !== slot) return;
			const [thought, why, how, art] = pick(r, guesses[idea]);
			wait(2, 12);
			if (how === 'self') {
				say(main, 'plat', thought);
				wait(2, 10);
				say(main, 'plat', why, art);
			} else if (how === 'plat') {
				say(main, r() < 0.5 ? 'rep' : 'peer', thought);
				wait(2, 15);
				say(main, 'plat', why, art);
			} else {
				say(main, r() < 0.5 ? 'plat' : r() < 0.6 ? 'plat2' : 'peer', thought);
				wait(2, 15);
				say(main, 'rep', why, art);
			}
		});
		asideAt.forEach((at, i) => {
			if (at !== slot) return;
			const [ask, reply] = asidePool[i]!;
			wait(3, 20);
			say(main, r() < 0.5 ? 'rep' : 'peer', ask);
			wait(2, 25);
			say(main, reply.includes('{plat2}') || r() < 0.5 ? 'plat' : 'plat2', reply);
		});
		if (slot === explainAt) {
			const [ask, reply] = pick(r, explainers.filter((_, i) => date >= '2026-10-15' || (i !== 0 && i !== 3)));
			wait(3, 20);
			say(main, 'peer', ask);
			wait(2, 15);
			say(main, r() < 0.5 ? 'plat' : 'plat2', reply);
		}
		if (slot === pauseAt) {
			wait(20, 70);
			say(main, 'plat', pick(r, pauses));
		}
		if (slot === attemptAt && evidence !== undefined) {
			wait(10, 40);
			say(main, 'rep', pick(r, attempts), evidence);
		}
		if (slot === sideAt || slot === sideAt2) {
			// Someone else brings a different problem into the thread.
			const side = pick(r, topics.filter((t) => t !== topic && !t.wide && t.cause !== topic.cause && allowed(t, workdays[day]!)));
			const party = makeParty(r, side, teamOf(peer), peer, who, plat, plat2, workdays[day]!, minute);
			wait(4, 30);
			const evidence = side.probe.find((probe) => probe[2] !== undefined)?.[2];
			say(party, 'rep', `${pick(r, hijack)}${lowerStart(pick(r, side.open))}`, evidence);
			wait(5, 30);
			if (r() < 0.55) {
				say(party, 'plat2', pick(r, side.found), side.proof);
				wait(2, 15);
				say(party, 'rep', pick(r, ['Ah, thanks. I will sort that on my side.', 'Got it, that is a different thing then. Thanks.', 'OK, thanks, I will take that from here.', 'Makes sense. Sorry for hijacking.']));
			} else {
				say(party, 'plat2', pick(r, ['{rep}, can you start a new thread for that? It looks like a different problem, and I would rather not lose it in here.', 'That is a different thing, I think. New thread please, so it gets its own answer.', 'Could you post that as its own thread? I will pick it up there.']));
				wait(1, 10);
				say(party, 'rep', pick(r, ['Will do.', 'Sure, posting it now.', 'Fair, moving it.']));
			}
		}
	};
	between(0);
	probes.forEach(([question, answer, art, role], i) => {
		wait(2, 14);
		say(main, i === 0 || r() < 0.7 ? 'plat' : 'plat2', question);
		wait(1, 20);
		say(main, role ?? 'rep', answer, art);
		between(i + 1);
	});

	// A re-run seems to fix it, and then it comes back.
	if (topic.relapse && ending !== 'quiet' && r() < 0.5) {
		wait(3, 15);
		say(main, 'plat', pick(r, retries));
		wait(5, 20);
		say(main, 'rep', pick(r, retryWorked));
		nextDay(int(r, 0, 1));
		say(main, 'rep', pick(r, relapses));
		wait(5, 40);
		say(main, 'plat', pick(r, relapseAck));
	}

	// Pasted output the platform team adds from their side.
	const shown = new Set<number | undefined>([early, topic.proof, ...probes.map((probe) => probe[2])]);
	topic.art.forEach((_, i) => {
		if (shown.has(i) || r() < 0.2) return;
		wait(3, 20);
		say(main, r() < 0.6 ? 'plat' : 'plat2', pick(r, leads), i);
	});

	// What was behind it.
	wait(5, 45);
	const finder: Role = r() < 0.75 ? 'plat' : 'plat2';
	const notes = background[backgroundOf[topicIndex]!];
	const note = notes && r() < 0.8 ? pick(r, notes) : '';
	const inline = note && topic.proof === undefined && r() < 0.5;
	say(main, finder, inline ? `${pick(r, topic.found)}\n\n${note}` : pick(r, topic.found), topic.proof);
	if (note && !inline) {
		wait(1, 8);
		say(main, finder === 'plat' ? 'plat2' : 'plat', note);
	}
	if (r() < 0.7) {
		wait(1, 10);
		say(main, 'rep', pick(r, acks));
	}
	if (r() < 0.9)
		for (const [ask, reply] of shuffle(r, topic.follow).slice(0, r() < 0.5 ? 2 : 1)) {
			wait(1, 12);
			say(main, r() < 0.8 ? 'rep' : 'peer', ask);
			wait(2, 20);
			say(main, 'plat', reply);
		}

	// Someone else turns up with the same problem.
	if (!lean && !topic.wide && formOf[topicIndex] && evidence !== undefined && r() < 0.65) {
		const newcomer = pick(r, everyone.filter((name) => name !== who && name !== peer));
		const party = makeParty(r, topic, teamOf(newcomer), newcomer, who, plat, plat2, workdays[day]!, minute);
		if (r() < 0.5) nextDay(int(r, 0, 2));
		else wait(30, 120);
		say(party, 'rep', pick(r, recurOpen), evidence);
		wait(5, 40);
		say(party, r() < 0.5 ? 'plat' : 'plat2', topic.proof !== undefined ? pick(r, recurSame) : pick(r, topic.found), topic.proof);
		wait(2, 15);
		say(party, 'rep', pick(r, recurAck));
	}

	// How it ended.
	const sequence = pick(r, topic.end[ending]!);
	// When the asker confirms a preview is back, they often paste it.
	const confirmAt = form === 'install' && (ending === 'fixed' || ending === 'owed') && r() < 0.5 ? sequence.map(([role]) => role).lastIndexOf('rep') : -1;
	sequence.forEach(([role, text, art], i) => {
		if (i === 0) wait(5, 60);
		else if (role === 'rep' && r() < 0.3) nextDay(0);
		else wait(2, 30);
		say(main, role, text, i === confirmAt && art === undefined ? healthyPods : art);
	});
	let lastRole = sequence[sequence.length - 1]![0];
	const talk = afterTalk[ending];
	if (talk && r() < 0.55) {
		const [ask, reply] = pick(r, talk);
		wait(2, 20);
		say(main, 'rep', ask);
		wait(2, 25);
		say(main, 'plat', reply);
		lastRole = 'plat';
	}
	if (ending === 'quiet' && lastRole === 'rep' && r() < 0.5) {
		nextDay(int(r, 1, 3));
		say(main, 'rep', pick(r, bumps));
	} else if (ending !== 'quiet' && lastRole !== 'rep' && r() < 0.4) {
		wait(1, 20);
		say(main, 'rep', pick(r, thanks));
	}

	const replies = messages.filter((message) => message.startsWith('**')).length - 1;
	const text = [`# #preview-help · ${longDate(date)} 2026`, `Started by ${who} (${team}) at ${clock(startMinute)} · ${replies} replies`, ...messages].join('\n\n');
	return { name: `${date}-${clock(startMinute).replace(':', '')}.md`, text: `${text}\n` };
};

const folder = join(root, 'docs', 'preview-help');
mkdirSync(folder, { recursive: true });
const perDay = new Map<string, number>();
const dayOf = (index: number) => startDays[Math.floor((index * startDays.length) / ITEMS)]!;
for (let index = 0; index < ITEMS; index++) perDay.set(dayOf(index), (perDay.get(dayOf(index)) ?? 0) + 1);
const seen = new Map<string, number>();
for (let index = 0; index < ITEMS; index++) {
	const date = dayOf(index);
	const slot = seen.get(date) ?? 0;
	seen.set(date, slot + 1);
	// Spread the day's threads between 08:40 and 18:00, each in its own window.
	const width = Math.floor(560 / perDay.get(date)!);
	const jitter = mulberry32(0x71e0000 + index * 31)();
	const start = 8 * 60 + 40 + slot * width + Math.floor(jitter * (width - 1));
	// On the day of an outage, the first threads are about it.
	const outage = slot === 0 ? topics.findIndex((topic) => topic.on?.includes(date)) : -1;
	let { name, text } = thread(index, date, start, false, outage >= 0 ? outage : undefined);
	// Keep every file well inside what the Read tool returns in one call.
	if (text.length > 18000 || text.split('\n').length > 380) ({ name, text } = thread(index, date, start, true, outage >= 0 ? outage : undefined));
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	'# #preview-help\n\nEvery thread started in #preview-help between 3 September 2026, the day after slipway 0.2.0 went out, and\n18 November 2026, one file each, with the replies posted up to the export on 20 November. A file is named\nafter the date and time its thread was started. Pasted output is as it was pasted. The export keeps no\nreactions, no channel bookmarks and no thread status, so how a thread ended is only in its replies.\n\nThe platform team, who look after slipway, are Ines Carvalho, Tomasz Wierzbicki, Ruth Abernethy and Kofi\nMensah.\n'
);
