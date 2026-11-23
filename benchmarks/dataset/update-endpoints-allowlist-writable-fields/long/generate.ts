// Writes the long material of this entry's long tasks: the requests that people at Saltmarsh and Ferrow Maps sent
// to the platform team's Cairn help queue between 3 August and 13 November 2026, one Markdown file each, under
// docs/help-requests/, as the queue exported them, without its labels or states. Deterministic: fixed seeds, no
// clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many requests to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 264;

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
const pad = (value: number) => String(value).padStart(2, '0');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

// ---------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026, before the export on Thursday 19 November.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (ms: number) => new Date(ms);
const stamp = (ms: number) => `${WD[utc(ms).getUTCDay()]} ${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]} 2026, ${clock(ms)}`;
const clock = (ms: number) => `${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}`;
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const midnight = (ms: number) => ms - (ms % DAY);
const FIRST_DAY = Date.UTC(2026, 7, 3);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 19);
const FRONT_END_MOVE = Date.UTC(2026, 8, 1);
const workDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() % 6 !== 0) workDays.push(day);

// ---------------------------------------------------------------------------------------------------------
// Cairn, its people and its neighbours.
const HOST = 'cairn.saltmarsh.example.com';
const API = 'https://api.cairn.saltmarsh.example.com';
const HOST_FP = 'SHA256:Qm4yX0t7cT2wLk9vRb8sNf1hJ6dZ3eA5uYpG0iCqWxE';
const platform = [
	['Tomasz', 'Wilk'],
	['Hollie', 'Brennan'],
	['Dev', 'Raman'],
	['Ines', 'Carvalho'],
	['Mira', 'Sato']
] as const;
const teamPeople: Record<string, string> = {
	'the IT desk': 'Gemma Hurst',
	"Ferrow's IT team": 'Rui Moreira',
	'the network team': 'Callum Reid',
	'the security team': 'Yusuf Demir',
	'the build team': 'Petra Novak',
	'the web tools team': 'Oskar Lind'
};
interface Org {
	name: string;
	slug: string;
	domain: string;
	since: number;
	offices: string[];
	itdesk: string;
	netteam: string;
	oldHost: string;
	oldUrl: (project: string) => string;
	clients: string[];
	first: string[];
	last: string[];
	teams: Record<string, [string, string][]>;
}
const saltmarsh: Org = {
	name: 'Saltmarsh',
	slug: 'saltmarsh',
	domain: 'saltmarsh.example.com',
	since: Date.UTC(2025, 10, 3),
	offices: ['Bristol', 'Leeds'],
	itdesk: 'the IT desk',
	netteam: 'the network team',
	oldHost: 'the old Gitolite server',
	oldUrl: (project) => `gitolite@git.saltmarsh.example.com:${project}`,
	clients: ['Harbourline Bank', 'Northgate Rail', 'Osprey Insurance', 'the county council', 'Fenwick Energy'],
	first: ['Priya', 'Owen', 'Hannah', 'Kwame', 'Lucy', 'Rhys', 'Zara', 'Ellis', 'Esme', 'Arjun', 'Freya', 'Marcus', 'Niamh', 'Tobias', 'Leah', 'Samir', 'Grace', 'Danny', 'Imogen', 'Felix', 'Ruth', 'Hamza', 'Alys', 'Joel'],
	last: ['Fletcher', 'Adeyemi', 'Lowe', 'Chaudhry', 'Hartley', 'Pryce', 'Ndlovu', 'Whitaker', 'Shah', 'Morgan', 'Ellison', 'Quayle', 'Barker', 'Iqbal', 'Thorne', 'Lambert', 'Osei', 'Kerr', 'Dunmore', 'Bhatt'],
	teams: {
		Payments: [['payments-ledger', 'Payments Ledger'], ['refunds-service', 'Refunds Service']],
		Mobile: [['mobile-app', 'Mobile App'], ['push-gateway', 'Push Gateway']],
		Checkout: [['checkout-web', 'Checkout Web'], ['basket-api', 'Basket API']],
		Data: [['data-warehouse', 'Data Warehouse'], ['etl-jobs', 'ETL Jobs']],
		Docs: [['docs-site', 'Docs Site'], ['style-guide', 'Style Guide']],
		'Design systems': [['design-tokens', 'Design Tokens'], ['ui-kit', 'UI Kit']],
		QA: [['e2e-tests', 'E2E Tests'], ['load-tests', 'Load Tests']],
		Billing: [['billing-service', 'Billing Service'], ['invoice-pdf', 'Invoice PDF']],
		'Support tools': [['support-console', 'Support Console'], ['status-page', 'Status Page']]
	}
};
const ferrow: Org = {
	name: 'Ferrow Maps',
	slug: 'ferrow-maps',
	domain: 'ferrow.example.com',
	since: Date.UTC(2026, 1, 17),
	offices: ['Porto'],
	itdesk: "Ferrow's IT team",
	netteam: "Ferrow's IT team",
	oldHost: "Ferrow's old GitLab",
	oldUrl: (project) => `git@gitlab.ferrow.example.com:maps/${project}.git`,
	clients: ['the national mapping agency', 'Atlantico Telecom', 'the port authority', 'Vela Logistics'],
	first: ['Tiago', 'Mariana', 'Ingrid', 'Henrik', 'Beatriz', 'Sigrid', 'Duarte', 'Leonor', 'Lars', 'Catarina', 'Nuno', 'Astrid', 'Rafael', 'Joana', 'Erik', 'Filipa'],
	last: ['Ferreira', 'Lindqvist', 'Sousa', 'Haugen', 'Pinto', 'Berg', 'Almeida', 'Solberg', 'Costa', 'Nyberg', 'Teixeira', 'Dahl'],
	teams: {
		Tiles: [['tile-server', 'Tile Server'], ['basemap-styles', 'Basemap Styles']],
		Routing: [['route-planner', 'Route Planner'], ['traffic-model', 'Traffic Model']],
		'Data pipeline': [['raster-pipeline', 'Raster Pipeline'], ['elevation-data', 'Elevation Data']],
		'Field apps': [['survey-app', 'Survey App'], ['offline-sync', 'Offline Sync']],
		Geocoding: [['geocoder', 'Geocoder'], ['address-index', 'Address Index']]
	}
};
const machines = [
	{ machine: 'MacBook Pro', os: 'macOS 15.6', ssh: 'OpenSSH_9.8p1, LibreSSL 3.3.6', git: '2.39.5 (Apple Git-154)', home: '/Users/', windows: false },
	{ machine: 'MacBook Air', os: 'macOS 14.7', ssh: 'OpenSSH_9.7p1, LibreSSL 3.3.6', git: '2.46.2', home: '/Users/', windows: false },
	{ machine: 'ThinkPad', os: 'Ubuntu 24.04', ssh: 'OpenSSH_9.6p1 Ubuntu-3ubuntu13.5, OpenSSL 3.0.13 30 Jan 2024', git: '2.43.0', home: '/home/', windows: false },
	{ machine: 'Dell XPS', os: 'Fedora 41', ssh: 'OpenSSH_9.8p1, OpenSSL 3.2.2 4 Jun 2024', git: '2.47.1', home: '/home/', windows: false },
	{ machine: 'Windows laptop', os: 'Windows 11, Git for Windows', ssh: 'OpenSSH_9.9p1, OpenSSL 3.2.3 3 Sep 2024', git: '2.47.1.windows.1', home: '/c/Users/', windows: true }
];
const keyTitles = ['laptop', 'work laptop', 'desktop', 'mac mini', 'home', 'build box', 'old laptop', 'thinkpad', 'office desktop', 'travel laptop', 'macbook 2026', 'dev vm'];
const commitSubjects = ['Fix rounding in the monthly totals', 'Add retry to the export job', 'Bump the base image', 'Move config loading into its own module', 'Drop the unused CSV writer', 'Handle empty pages in the importer', 'Log the request id on errors', 'Split the long migration into two', 'Cache the style lookups', 'Make the nightly job idempotent', 'Rename the staging bucket', 'Add a test for the leap-year case', 'Pin the linter version', 'Tidy the README', 'Speed up the slowest query', 'Read the timeout from the environment', 'Fix the flaky retry test', 'Use the shared HTTP client', 'Remove the feature flag for the new menu', 'Add metrics to the queue worker'];
const places = ['a client office in Manchester', 'a hotel in Lyon', 'the train to London', "a co-working space near the station", 'the conference venue in Berlin', "my parents' house, on their Wi-Fi", 'an airport lounge'];
const browsers = ['Firefox', 'Chrome', 'Safari', 'Edge', 'Brave'];
const extensions = ['Cookie AutoDelete', 'a privacy extension that clears cookies on tab close', 'Privacy Badger with the cookie cleaner turned on', 'the "forget site data on close" setting'];
const channels = ['team-releases', 'payments-dev', 'tiles-alerts', 'mobile-builds', 'data-eng', 'docs-team', 'routing-dev'];
const libs = ['ledger-client', 'old-auth', 'tilecache', 'geo-utils v1', 'the legacy mailer', 'statsd-lite'];
const datasets = ['tile fixtures', 'sample rasters', 'recorded API responses', 'test images', 'load-test captures', 'elevation samples'];
const bigFiles = ['fixtures/tiles/z14-sample.mbtiles', 'test/data/porto-dem.tif', 'testdata/recorded/responses.har', 'assets/raw/brand-video.mov', 'loadtest/captures/peak.pcap', 'data/samples/elevation-2025.tif'];
const readmeNames = ['Readme.markdown', 'README.mdx', 'README.rst', 'readme.txt', 'ReadMe.MD'];

// ---------------------------------------------------------------------------------------------------------
// Pasted output. Each function makes text people paste into a request, from the request's slots.
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64 = (r: Rand, n: number) => Array.from({ length: n }, () => pick(r, [...B64])).join('');
const hex = (r: Rand, n: number) => Array.from({ length: n }, () => pick(r, [...'0123456789abcdef'])).join('');
const fp = (r: Rand) => `SHA256:${b64(r, 43)}`;
const md5 = (r: Rand) => `MD5:${Array.from({ length: 16 }, () => hex(r, 2)).join(':')}`;
const ed25519 = (r: Rand) => `AAAAC3NzaC1lZDI1NTE5AAAAI${b64(r, 43)}`;
const fence = (lines: string[], lang = '') => ['```' + lang, ...lines, '```'].join('\n');
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const home = (s: Slots) => `${s.home}${s.u}`;
const isPasted = (para: string) => para.startsWith('```') || para.startsWith('|') || para.startsWith('> 4.');
const sshHead = (s: Slots, port = 22, ip = '10.20.6.40') => [
	s.sshv,
	`debug1: Reading configuration data ${home(s)}/.ssh/config`,
	s.win === '1' ? 'debug1: Reading configuration data /etc/ssh/ssh_config' : `debug1: Reading configuration data /etc/ssh/ssh_config`,
	`debug1: Connecting to ${port === 443 ? `ssh.${HOST}` : HOST} [${ip}] port ${port}.`
];

/** Lines of the API's request log for one kind of call. */
const apiLog =
	(method: string, path: string, status: string, agent: string, daily = false): Art =>
	(r, s) => {
		const user = `usr_${int(r, 20, 400)}`;
		const lines: string[] = [];
		let t = Number(s.openMs) - (daily ? 6 : int(r, 1, 3)) * DAY;
		for (let i = daily ? 5 : int(r, 4, 7); i > 0; i--) {
			t = daily ? midnight(t) + DAY + 9 * HOUR + int(r, 1000, 9000) : t + int(r, 1, 600) * MIN + int(r, 0, 59999);
			lines.push(`${new Date(t).toISOString().slice(0, 19).replace('T', ' ')} ${method} ${path.replace('{id}', String(int(r, 100, 900)))} ${status} (${int(r, 1, 9)} ms) ${user} ${agent}`);
		}
		return fence(lines);
	};

const arts: Record<string, Art> = {
	sshWrong: (r, s) => {
		const keys = ['id_rsa', 'id_ecdsa', 'client_harbourline', 'id_ed25519_old', 'aws_staging', 'gitolite', 'id_ed25519'];
		const lines = [...sshHead(s), 'debug1: Connection established.'];
		keys.slice(0, 4).forEach((key) => lines.push(`debug1: identity file ${home(s)}/.ssh/${key} type ${key.includes('rsa') ? 0 : 3}`));
		lines.push(
			`debug1: Local version string SSH-2.0-${s.sshv.split(',')[0]!.replace('OpenSSH_', 'OpenSSH_')}`,
			'debug1: Remote protocol version 2.0, remote software version OpenSSH_9.6',
			`debug1: Authenticating to ${HOST}:22 as 'git'`,
			`debug1: Host '${HOST}' is known and matches the ED25519 host key.`,
			'debug1: SSH2_MSG_SERVICE_ACCEPT received'
		);
		const offered = Number(s.n1) > 6 ? 6 : Number(s.n1);
		for (let i = 0; i < offered; i++) {
			lines.push(`debug1: Offering public key: ${i < 2 ? `${home(s)}/.ssh/${keys[i]}` : `${s.u}@${pick(r, ['client-vpn', 'staging', 'gitolite', 'aws', 'nas'])}`} ${i === 0 ? 'RSA' : 'ED25519'} ${fp(r)} agent`);
			lines.push('debug1: Authentications that can continue: publickey');
		}
		lines.push(`Received disconnect from 10.20.6.40 port 22:2: Too many authentication failures`, `Disconnected from 10.20.6.40 port 22`);
		return fence(lines);
	},
	sshAdd: (r, s) => {
		const lines: string[] = [];
		const total = Number(s.n1);
		for (let i = 0; i < total - 1; i++)
			lines.push(`${i % 3 === 0 ? 3072 : 256} ${fp(r)} ${pick(r, [`${s.u}@client-vpn`, 'deploy@staging', `${s.u}@gitolite`, 'aws-staging', `${s.u}@nas`, 'harbourline-sftp', 'backup@pi'])} (${i % 3 === 0 ? 'RSA' : 'ED25519'})`);
		lines.push(`256 ${s.fp} ${s.u}@${s.machineSlug} (ED25519)`);
		return fence(['$ ssh-add -l', ...lines]);
	},
	ssh2: (r) =>
		fence([
			'---- BEGIN SSH2 PUBLIC KEY ----',
			`Comment: "eddsa-key-2026${pad(int(r, 8, 11))}${pad(int(r, 1, 28))}"`,
			ed25519(r),
			'---- END SSH2 PUBLIC KEY ----'
		]),
	p384: (r, s) => fence([`ecdsa-sha2-nistp384 AAAAE2VjZHNhLXNoYTItbmlzdHAzODQAAAAIbmlzdHAzODQAAABhB${b64(r, 80)}= ${s.u}@${s.machineSlug}`]),
	wrapped: (r, s) => {
		const key = `ssh-ed25519 ${ed25519(r)} build@${s.proj}-build-01`;
		const width = int(r, 38, 64);
		const lines: string[] = [];
		for (let i = 0; i < key.length; i += width) lines.push(key.slice(i, i + width));
		return fence(lines);
	},
	keygenFp: (r, s) => fence([`$ ssh-keygen -lf ~/.ssh/id_ed25519.pub`, `256 ${fp(r)} ${pick(r, ['image-build@it-lab', 'root@laptop-image', 'setup@golden-image'])} (ED25519)`]),
	md5Row: (r, s) =>
		table(
			['Person', 'Machine', 'Key fingerprint', 'Checked'],
			[
				[s.full, s.keyTitle, md5(r), `${int(r, 1, 28)} ${pick(r, ['Feb', 'Mar', 'Apr', 'May'])} 2026`],
				[s.colleagueFull, pick(r, keyTitles), md5(r), `${int(r, 1, 28)} ${pick(r, ['Mar', 'Apr', 'Jun'])} 2026`],
				[`${pick(r, saltmarsh.first)} ${pick(r, saltmarsh.last)}`, pick(r, keyTitles), md5(r), 'not yet']
			]
		),
	keygenBoth: (r, s) => fence([`$ ssh-keygen -l -f ~/.ssh/id_ed25519.pub`, `256 ${s.fp} ${s.u}@${s.machineSlug} (ED25519)`, `$ ssh-keygen -l -E md5 -f ~/.ssh/id_ed25519.pub`, `256 ${md5(r)} ${s.u}@${s.machineSlug} (ED25519)`]),
	pushLogLeaver: (r, s) => {
		const rows: string[][] = [];
		let at = Number(s.openMs) - int(r, 20, 30) * DAY;
		for (let i = int(r, 4, 7); i > 0; i--) {
			at = midnight(at + int(r, 1, 4) * DAY);
			while (utc(at).getUTCDay() % 6 === 0) at += DAY;
			at += int(r, 8 * 60 + 30, 18 * 60) * MIN;
			if (at > Number(s.leftMs)) break;
			rows.push([stamp(at), `${s.orgSlug}/${pick(r, [s.proj, s.proj, s.proj2])}`, pick(r, ['laptop', 'build box', 'desktop', 'home', 'old laptop'].slice(0, Number(s.n2))), pick(r, ['push, 1 branch', 'push, 2 branches', 'fetch', 'push, 1 tag', 'fetch'])]);
		}
		return table(['When', 'Project', 'Key', 'What'], rows.length ? rows : [[stamp(Number(s.leftMs) - 2 * DAY), `${s.orgSlug}/${s.proj}`, 'laptop', 'fetch']]);
	},
	hostWarning: (r, s) =>
		fence([
			'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',
			'@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @',
			'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',
			'IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!',
			'Someone could be eavesdropping on you right now (man-in-the-middle attack)!',
			'It is also possible that a host key has just been changed.',
			'The fingerprint for the ED25519 key sent by the remote host is',
			`${HOST_FP}.`,
			'Please contact your system administrator.',
			`Add correct host key in ${home(s)}/.ssh/known_hosts to get rid of this message.`,
			`Offending ED25519 key in ${home(s)}/.ssh/known_hosts:${s.line}`,
			`Host key for ${HOST} has changed and you have requested strict checking.`,
			'Host key verification failed.',
			'fatal: Could not read from remote repository.',
			'',
			'Please make sure you have the correct access rights',
			'and the repository exists.'
		]),
	sshTimeout: (r, s) => fence([...sshHead(s, 22, '203.0.113.24'), `debug1: connect to address 203.0.113.24 port 22: Connection timed out`, `ssh: connect to host ${HOST} port 22: Connection timed out`]),
	pushTooBig: (r, s) => {
		const objects = int(r, 90, 400);
		return fence([
			`$ git push origin ${s.branch}`,
			`Enumerating objects: ${objects}, done.`,
			`Counting objects: 100% (${objects}/${objects}), done.`,
			`Delta compression using up to ${pick(r, [8, 10, 12, 16])} threads`,
			`Compressing objects: 100% (${Math.round(objects * 0.6)}/${Math.round(objects * 0.6)}), done.`,
			`Writing objects: 100% (${Math.round(objects * 0.8)}/${Math.round(objects * 0.8)}), ${(Number(s.mb) * 0.93).toFixed(2)} MiB | ${(int(r, 30, 990) / 100).toFixed(2)} MiB/s, done.`,
			`Total ${Math.round(objects * 0.8)} (delta ${int(r, 10, 60)}), reused 0 (delta 0), pack-reused 0`,
			`remote: Checking ${int(r, 3, 9)} new commits...`,
			`remote: error: ${s.file} is ${s.mb} MB, over Cairn's limit of 100 MB for one file`,
			`remote: error: it was added in commit ${s.sha7} ("Add ${s.dataset}")`,
			'remote: error: rewrite the branch without it, or keep the file outside git',
			`To ${HOST}:${s.orgSlug}/${s.proj}.git`,
			` ! [remote rejected] ${s.branch} -> ${s.branch} (pre-receive hook declined)`,
			`error: failed to push some refs to '${HOST}:${s.orgSlug}/${s.proj}.git'`
		]);
	},
	pushEof: (r, s) => {
		const total = int(r, 180000, 620000);
		const done = Math.round(total * (0.3 + r() * 0.4));
		return fence([
			`$ git push origin --all`,
			`Enumerating objects: ${total}, done.`,
			`Counting objects: 100% (${total}/${total}), done.`,
			`Delta compression using up to ${pick(r, [8, 10, 12])} threads`,
			`Compressing objects: 100% (${Math.round(total * 0.24)}/${Math.round(total * 0.24)}), done.`,
			`Writing objects:  ${Math.round((done / total) * 100)}% (${done}/${total}), ${(Number(s.gb) * (done / total)).toFixed(2)} GiB | ${(int(r, 120, 380) / 100).toFixed(2)} MiB/s`,
			`Connection to ${HOST} closed by remote host.`,
			'fatal: the remote end hung up unexpectedly',
			'fatal: the remote end hung up unexpectedly'
		]);
	},
	forced: (r, s) => fence([`$ git push --force origin main`, `Enumerating objects: ${int(r, 5, 20)}, done.`, `Writing objects: 100% (${int(r, 3, 9)}/${int(r, 10, 14)}), 1.${int(r, 10, 90)} KiB | 1.${int(r, 10, 90)} MiB/s, done.`, `To ${HOST}:${s.orgSlug}/${s.proj}.git`, ` + ${s.sha1}...${s.sha2} main -> main (forced update)`]),
	commitList: (r, s) => {
		const names = [s.first, s.colleague, pick(r, s.isFerrow === '1' ? ferrow.first : saltmarsh.first)];
		const lines: string[] = [];
		let first = true;
		for (let i = int(r, 6, 13); i > 0; i--) {
			lines.push(`${first ? s.sha1 : hex(r, 7)} ${pick(r, commitSubjects)} (${pick(r, names)}, ${pick(r, ['yesterday', 'yesterday', '2 days ago', 'this morning', '3 days ago'])})`);
			first = false;
		}
		return fence(lines);
	},
	cloneNotFound: (r, s) => fence([`$ git clone git@${HOST}:${s.wrong}.git`, `Cloning into '${s.wrong.split('/').pop()}'...`, 'ERROR: Repository not found.', 'fatal: Could not read from remote repository.', '', 'Please make sure you have the correct access rights', 'and the repository exists.']),
	cloneSlow: (r, s) => {
		const total = int(r, 90000, 400000);
		const lines = [`$ git clone --progress git@${HOST}:${s.orgSlug}/${s.proj}.git`, `Cloning into '${s.proj}'...`, `remote: Enumerating objects: ${total}, done.`, `remote: Counting objects: 100% (${total}/${total}), done.`, `remote: Compressing objects: 100% (${Math.round(total / 4)}/${Math.round(total / 4)}), done.`];
		for (const share of [0.04, 0.11, 0.19, 0.27]) lines.push(`Receiving objects:  ${Math.round(share * 100)}% (${Math.round(total * share)}/${total}), ${(share * Number(s.gb) * 1024).toFixed(2)} MiB | ${(Number(s.kbs) + int(r, -40, 40)).toFixed(2)} KiB/s`);
		lines.push('^C');
		return fence(lines);
	},
	sha1Log: (r, s) => {
		const lines: string[] = [];
		let at = Number(s.openMs) - int(r, 1, 3) * DAY;
		for (let i = int(r, 3, 6); i > 0; i--) {
			at += int(r, 1, 40) * MIN;
			const pid = int(r, 20000, 90000);
			const ip = `10.30.${int(r, 1, 4)}.${int(r, 10, 99)}`;
			lines.push(`${MON[utc(at).getUTCMonth()]} ${pad(utc(at).getUTCDate())} ${clock(at)}:${pad(int(r, 0, 59))} cairn-ssh-2 sshd[${pid}]: userauth_pubkey: signature algorithm ssh-rsa not in PubkeyAcceptedAlgorithms [preauth]`);
			lines.push(`${MON[utc(at).getUTCMonth()]} ${pad(utc(at).getUTCDate())} ${clock(at)}:${pad(int(r, 0, 59))} cairn-ssh-2 sshd[${pid}]: Connection closed by authenticating user git ${ip} port ${int(r, 40000, 65000)} [preauth]`);
		}
		return fence(lines);
	},
	goodSig: (r, s) => fence([`$ git log --show-signature -1`, `commit ${hex(r, 40)}`, `Good "git" signature for ${s.email} with ED25519 key ${s.fp}`, `Author: ${s.full} <${s.email}>`, `Date:   ${WD[utc(Number(s.openMs)).getUTCDay()]} ${MON[utc(Number(s.openMs)).getUTCMonth()]} ${utc(Number(s.openMs)).getUTCDate()} 09:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))} 2026 +0100`, '', `    ${pick(r, commitSubjects)}`]),
	statusMaster: (r, s) => fence(['$ git status', 'On branch master', 'nothing to commit, working tree clean', '$ git branch', '* master', '$ git push -u origin main', 'error: src refspec main does not match any', `error: failed to push some refs to '${HOST}:${s.orgSlug}/${s.proj}.git'`]),
	pyGet: (r, s) =>
		fence(
			[
				'import requests',
				'',
				`TOKEN = "tok_${hex(r, 4)}..."  # copied from the browser`,
				`resp = requests.get("${API}/projects", headers={"Authorization": "Bearer " + TOKEN}, timeout=10)`,
				'resp.raise_for_status()',
				'lines = [p["name"] for p in resp.json()]',
				`post_to_channel("#${s.channel}", "Projects this morning:\\n" + "\\n".join(lines))`
			],
			'python'
		),
	pyForm: (r, s) =>
		fence(
			[
				'for machine in machines:',
				'    key = open(machine.pubkey_path).read().strip()',
				`    resp = requests.post(f"${API}/keys", headers=HEADERS, data={"title": machine.name, "key": key})`,
				'    print(machine.name, resp.status_code, resp.text)'
			],
			'python'
		),
	pyJson: () => fence([`    resp = requests.post(f"${API}/keys", headers=HEADERS, json={"title": machine.name, "key": key})`], 'python'),
	toolLog: (r, s) =>
		fence([
			`[deploybot] ${clock(Number(s.openMs))}:${pad(int(r, 0, 59))} GET ${API}/projects`,
			`[deploybot]   Accept: application/json`,
			`[deploybot]   Authorization: Token tok_${hex(r, 4)}xxxxxxxx`,
			`[deploybot] <- 401 (${int(r, 8, 40)} ms) {"error":"sign in first"}`,
			`[deploybot] giving up after ${int(r, 2, 5)} attempts`
		]),
	jsDelete: () =>
		fence(
			[
				'async function removeKey(id) {',
				'  const res = await fetch(`${API}/keys/${id}`, { method: "DELETE", headers });',
				'  const data = await res.json();',
				'  if (!res.ok) throw new Error(data.error);',
				'  return data;',
				'}'
			],
			'js'
		),
	cloneAll: (r, s) =>
		fence(
			[
				'#!/bin/sh',
				'# Clones every project of the organisation, shallowly, into the current folder.',
				`curl -s -H "Authorization: Bearer $CAIRN_TOKEN" ${API}/projects |`,
				"  jq -r '.[].slug' |",
				'  while read -r slug; do',
				`    git clone --depth 1 "git@${HOST}:${s.orgSlug}/$slug.git"`,
				'  done'
			],
			'sh'
		),
	jqFilter: (r, s) => fence([`curl -s -H "Authorization: Bearer $CAIRN_TOKEN" ${API}/projects \\`, `  | jq -r '.[] | select(.name | test("${s.word}"; "i")) | .slug'`], 'sh'),
	questions: (r, s) =>
		[
			`> 4. Where is your source code hosted, and in which country?`,
			`> 5. How often is source code backed up, and how long are backups retained?`,
			`> 6. Describe how you would restore source code after the loss of the primary system.`,
			`> 7. Is source code encrypted at rest and in transit?`,
			...(chance(r, 0.6) ? [`> 8. Who can access source code, and how is access removed when staff leave?`] : [])
		].join('\n'),
	sshConfig: (r, s) => fence([`Host ${HOST}`, `  IdentityFile ~/.ssh/${s.keyfile}`, '  IdentitiesOnly yes']),
	config443: () => fence([`Host ${HOST}`, `  Hostname ssh.${HOST}`, '  Port 443']),
	keysTable: (r, s) => {
		const rows: string[][] = [];
		const pool = s.isFerrow === '1' ? ferrow : saltmarsh;
		for (let i = Math.min(14, Number(s.people)); i > 0; i--) {
			const added = pool.since + int(r, 0, Math.floor((Number(s.openMs) - pool.since) / DAY)) * DAY;
			rows.push([`${pick(r, pool.first)} ${pick(r, pool.last)}`, pick(r, keyTitles), pick(r, ['ssh-ed25519', 'ssh-ed25519', 'ssh-ed25519', 'ssh-rsa', 'ecdsa-sha2-nistp256']), dayMonth(added) + (added < Date.UTC(2026, 0, 1) ? ' 2025' : '')]);
		}
		return table(['Person', 'Key title', 'Type', 'Added'], rows);
	},
	ciStep: (r, s) =>
		fence(
			[
				'notify:',
				'  stage: after-tests',
				'  only: [main]',
				'  script:',
				`    - SUBJECTS=$(git log --format='- %s' "$CI_BEFORE_SHA..$CI_SHA")`,
				`    - curl -s -X POST "$CHAT_WEBHOOK" -d "{\\"text\\": \\"${s.proj}: new commits on main\\n$SUBJECTS\\"}"`
			],
			'yaml'
		),
	mirrorStep: (r, s) =>
		fence(
			[
				'mirror-to-github:',
				'  stage: after-tests',
				'  only: [main, tags]',
				'  script:',
				`    - git remote add github git@github.com:${s.orgSlug}/${s.proj}.git || true`,
				'    - GIT_SSH_COMMAND="ssh -i $GITHUB_DEPLOY_KEY" git push github main --tags'
			],
			'yaml'
		),
	pullTimeout: (r, s) => fence([`$ git pull`, `ssh: connect to host ${HOST} port 22: Connection timed out`, 'fatal: Could not read from remote repository.', '', 'Please make sure you have the correct access rights', 'and the repository exists.']),
	keyScript400: (r, s) => {
		const lines = ['$ python3 add_build_keys.py'];
		for (let i = 1; i <= int(r, 2, 5); i++) lines.push(`${s.proj}-build-0${i} 400 {"error":"the body must be a JSON object"}`);
		return fence(lines);
	},
	trace204: (r) =>
		fence([
			'SyntaxError: Unexpected end of JSON input',
			'    at JSON.parse (<anonymous>)',
			`    at parseJSONFromBytes (node:internal/deps/undici/undici:${int(r, 5000, 5900)}:19)`,
			`    at successSteps (node:internal/deps/undici/undici:${int(r, 5000, 5900)}:27)`,
			`    at async removeKey (/srv/rotate-keys/lib/cairn.js:${int(r, 30, 60)}:16)`,
			`    at async rotate (/srv/rotate-keys/rotate.js:${int(r, 70, 120)}:5)`
		]),
	refspec: (r, s) => fence(['$ git push -u origin main', 'error: src refspec main does not match any', `error: failed to push some refs to '${HOST}:${s.orgSlug}/${s.proj}.git'`]),
	ciLog: (r, s) => {
		const run = int(r, 900, 2400);
		const t = `0${int(r, 1, 3)}:00:${pad(int(r, 2, 40))}`;
		return fence([`[nightly #${run}] ${t} Fetching git@${HOST}:${s.orgSlug}/${s.proj}.git`, `[nightly #${run}] ${t} git@${HOST}: Permission denied (publickey).`, `[nightly #${run}] ${t} fatal: Could not read from remote repository.`, `[nightly #${run}] ${t} ERROR: checkout failed (exit 128), marking build as failed`]);
	},
	cronMail: (r, s) =>
		fence([
			`From: cron@${s.proj}-build-01`,
			`Subject: Cron <ci@${s.proj}-build-01> python3 /opt/scripts/post_projects.py`,
			'',
			'Traceback (most recent call last):',
			'  File "/opt/scripts/post_projects.py", line 7, in <module>',
			'    resp.raise_for_status()',
			`  File "/usr/lib/python3/dist-packages/requests/models.py", line ${int(r, 1000, 1030)}, in raise_for_status`,
			'    raise HTTPError(http_error_msg, response=self)',
			`requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: ${API}/projects`
		]),
	create409: (r, s) =>
		fence([
			`$ curl -s -X POST -H "Authorization: Bearer $CAIRN_TOKEN" -H 'Content-Type: application/json' \\`,
			`    -d '{"name": "${s.newName}", "description": ""}' ${API}/projects`,
			`{"error":"the organisation already has a project at ${s.slug}"}`
		]),
	crlfStatus: (r) => {
		const files = ['README.md', 'package.json', 'src/index.ts', 'src/config.ts', 'src/routes.ts', 'test/helpers.ts', 'scripts/build.sh', 'docs/setup.md', 'Makefile', '.editorconfig'];
		return fence(['$ git status --short', ...files.slice(0, int(r, 6, 10)).map((file) => ` M ${file}`), '$ git diff --stat | tail -1', ` ${int(r, 40, 120)} files changed, ${int(r, 2000, 9000)} insertions(+), ${int(r, 2000, 9000)} deletions(-)`]);
	},
	sshdLog: (r, s) => {
		const ip = `10.${int(r, 40, 60)}.${int(r, 1, 9)}.${int(r, 10, 250)}`;
		const pid = int(r, 20000, 90000);
		const day = `${MON[utc(Number(s.openMs)).getUTCMonth()]} ${pad(utc(Number(s.openMs)).getUTCDate())}`;
		const port = int(r, 40000, 65000);
		const lines: string[] = [];
		const t = midnight(Number(s.openMs)) + int(r, 0, 59) * 1000 + (utc(Number(s.openMs)).getUTCHours() * 60 + utc(Number(s.openMs)).getUTCMinutes() - int(r, 20, 90)) * MIN;
		const at = (ms: number) => `${day} ${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}:${pad(utc(ms).getUTCSeconds())}`;
		for (let i = 0; i < 6; i++) lines.push(`${at(t + i * 1000)} cairn-ssh-1 sshd[${pid}]: Failed publickey for git from ${ip} port ${port} ssh2: ${i === 0 ? 'RSA' : 'ED25519'} ${fp(r)}`);
		lines.push(`${at(t + 6000)} cairn-ssh-1 sshd[${pid}]: Disconnecting authenticating user git ${ip} port ${port}: Too many authentication failures [preauth]`);
		return fence(lines);
	},
	sshOk: (r, s) => fence([`$ ssh -T git@${HOST}`, `Hi ${s.u}! You've signed in to Cairn with the key "${s.keyTitle}" (${s.fp}).`, 'Cairn does not give shell access.']),
	pushOk: (r, s) => {
		const objects = int(r, 4, 40);
		const branch = s.pushMain === '1' ? 'main' : s.branch;
		return fence([
			`$ git push ${s.pushMain === '1' ? '-u ' : ''}origin ${branch}`,
			`Enumerating objects: ${objects}, done.`,
			`Counting objects: 100% (${objects}/${objects}), done.`,
			`Writing objects: 100% (${Math.ceil(objects / 2)}/${Math.ceil(objects / 2)}), ${int(r, 2, 90)}.${int(r, 10, 99)} KiB | ${int(r, 1, 9)}.${int(r, 10, 99)} MiB/s, done.`,
			`Total ${Math.ceil(objects / 2)} (delta ${int(r, 0, 9)}), reused 0 (delta 0), pack-reused 0`,
			`To ${HOST}:${s.orgSlug}/${s.proj}.git`,
			s.pushMain === '1' ? ` * [new branch]      main -> main` : `   ${hex(r, 7)}..${hex(r, 7)}  ${branch} -> ${branch}`,
			...(s.pushMain === '1' ? [`branch 'main' set up to track 'origin/main'.`] : [])
		]);
	},
	verifyStep: () => fence(['verify-signatures:', '  stage: checks', '  script:', '    - git config gpg.ssh.allowedSignersFile .allowed_signers', '    - for c in $(git rev-list "$CI_BEFORE_SHA..$CI_SHA"); do git verify-commit "$c" || exit 1; done'], 'yaml')
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Each is one kind of request, with its own words for every step of the conversation.
type Outcome = 'sorted' | 'workaround' | 'change' | 'team' | 'waiting';
/** One exchange: what the person writes, what the platform team answers, and anything pasted on either side. */
type Turn = [string, string, Art?, Art?];
interface Topic {
	id: string;
	weight: number;
	after?: number;
	before?: number;
	subjects: string[];
	open: string[];
	quick: [string, string];
	/** The team's first answer. It asks for something: `need` says what, for the reminders. */
	reply: string;
	need: string;
	/** Exchanges in order. The first answer asks for something more (`need2`); the second finds the cause. */
	turns: Turn[];
	need2: string;
	fixed: string[];
	/** Output the person may paste with their first message, and output in an internal note. */
	openArt?: Art;
	noteArt?: [string, Art];
	/** Output the person pastes to show it works. */
	fixedArt?: Art;
	workaround?: { at?: number; pre?: string; offer: string; art?: Art; accept: string[]; decline?: string };
	change?: { at?: number; pre?: string; what: string; tell: string; ok: string[] };
	team?: { at?: number; pre?: string; name: string; handover: string; tell: string };
	outcomes: Outcome[];
	shared?: boolean;
}

const topics: Topic[] = [
	{
		id: 'wrong-key',
		weight: 3,
		subjects: ['Permission denied (publickey)', "Can't push since yesterday", 'SSH not accepting my key', 'Too many authentication failures'],
		open: [
			`Since this morning every push to {proj} fails with "Permission denied (publickey)". My key is on my account, I can see it on the keys page, and nothing has changed on my side as far as I know.`,
			`I added a key for a client's server last week and now Cairn refuses me. git fetch says "Too many authentication failures" and gives up straight away.`,
			`Cairn has stopped letting me in over SSH. Clone, fetch and push all end with Permission denied. {colleague} is on the same project and is fine, so I assume it's something about my account.`
		],
		noteArt: ['Front end log for this account, from just before the request came in:', arts.sshdLog],
		quick: [`Is it all right to use the same SSH key for Cairn and for GitHub?`, `It works, and Cairn doesn't mind. The security team prefers one key per service, so you can withdraw one without the other, but it isn't a rule.`],
		reply: `Sorry about that. Your account has the keys I'd expect, so I suspect your machine is offering a different key from the one on Cairn. Could you run ssh -vT git@${HOST} and paste the output? It shows which keys your SSH client tries, and in what order.`,
		need: `run ssh -vT git@${HOST} and paste what it prints`,
		turns: [
			[`Here you go. It tries a lot of keys.`, `Thanks, that's very useful. Your SSH agent holds {n1} keys and offers them one after another, and our front end gives up after six attempts, before it reaches the one on your account. Could you also paste the output of ssh-add -l, so I can see which of them is the Cairn key?`, arts.sshWrong],
			[`Here's ssh-add -l.`, `That confirms it. The key on your Cairn account is the "{keyTitle}" one, {fp}, and it's the last one your agent holds. The others look like keys for client servers and the old Gitolite box. If you tell SSH to use only that key for Cairn, it goes straight to it.`, arts.sshAdd],
			[`How do I tell it that?`, `Add these lines to ~/.ssh/config. IdentitiesOnly stops it offering the agent's other keys first; the agent keeps them for the servers that need them.`, undefined, arts.sshConfig],
			[`Will I need to do the same on my other machine?`, `Only if its agent is just as crowded. ssh -vT shows you: if the right key comes up within the first few tries, leave it as it is.`]
		],
		need2: 'paste the output of ssh-add -l',
		fixed: [`Added the IdentitiesOnly lines and the push went straight through. Thanks!`, `That was it. ssh -T now greets me by name and the push worked first time.`, `Sorted with the config change. I had no idea the agent gave up after six.`],
		fixedArt: arts.sshOk,
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'putty-format',
		weight: 2,
		subjects: ['Key not accepted', '"key must be an OpenSSH public key"', 'Adding my SSH key fails'],
		open: [
			`I'm trying to add my SSH key on the keys page and it says "key must be an OpenSSH public key". It is a public key: I made it with PuTTYgen this morning.`,
			`Adding a key fails with an error about OpenSSH. I'm on Windows and pasted the public key file PuTTYgen saved. I've tried three times now, once with a fresh key.`
		],
		quick: [`Where do I find the clone address of a project?`, `On the project's page in the web app, under the name; there's a copy button next to it. It's always git@${HOST}: followed by the organisation and the project's slug.`],
		reply: `Thanks. Could you open the file you pasted from in Notepad and paste its first few lines here? Only the public part, please, never the .ppk file itself.`,
		need: 'paste the first lines of the public key file',
		turns: [
			[`Here's what the file looks like.`, `That explains the error. PuTTYgen saves public keys in the older SSH2 format, with the BEGIN and END lines, and Cairn only takes the one-line OpenSSH format, which starts with ssh-ed25519 or ssh-rsa. Which version of PuTTYgen do you have? The menus differ a little between versions.`, arts.ssh2],
			[`Help, About says 0.81.`, `Then load your .ppk in PuTTYgen and copy the text in the box labelled "Public key for pasting into OpenSSH authorized_keys file". That box holds the same key on one line, in the format Cairn wants. Paste it on the keys page and give it a title.`],
			[`Do I also have to change anything in PuTTY or in Git?`, `If Git uses PuTTY's Pageant, keep using the same .ppk: only the copy you paste into Cairn changes. If Git uses Windows' own OpenSSH, it needs the private key in OpenSSH format too, which PuTTYgen's Conversions menu exports.`],
			[`Last thing: can I use the same key from my home PC?`, `You could copy the .ppk across, but a key per machine is better: if one machine is lost, you remove only that key. Adding a second key takes a minute.`]
		],
		need2: 'tell me which version of PuTTYgen you have',
		fixed: [`Pasted the one-line version and it was accepted straight away. The fingerprint matches what PuTTYgen shows.`, `Got it in. I didn't know PuTTYgen had two formats.`],
		team: {
			at: 1,
			pre: `Bad news: PuTTYgen won't open any more. Windows says it has been blocked by my organisation's policy, I think since last week's update.`,
			name: '{itdesk}',
			handover: `{first} has a locked-down Windows laptop and can't run PuTTYgen any more (blocked by the app policy), so they can't export their key in OpenSSH format. Could you convert it with them, or allow PuTTYgen or Git for Windows?`,
			tell: `Then the tool you need is blocked on your laptop, which isn't ours to unblock. I've passed it to {itdesk}, who manage the laptop policies, with the details; they'll get in touch to sort out the conversion with you.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'security-key',
		weight: 2,
		subjects: ['YubiKey SSH key refused', 'Hardware key not accepted', 'sk-ssh-ed25519 key', 'New key type?'],
		open: [
			`I've moved my SSH key onto a YubiKey, as the security team suggested at the last all-hands, and the keys page won't take it. It says "key must be an OpenSSH public key", but ssh-keygen made it.`,
			`Cairn refuses the public key of my new security key, made with ssh-keygen -t ed25519-sk. GitHub took the very same key without complaint.`,
			`Quick one, I hope: is there a trick to adding a hardware-backed SSH key? Mine is refused, with an error that suggests the format is wrong.`
		],
		quick: [`Can I see when each of my keys was added?`, `Yes: the keys page shows the date beside each key, and GET /keys returns it as createdAt.`],
		reply: `Thanks for trying the hardware key. Could you paste the first word of the public key line, the type, before the long string?`,
		need: 'send the key type from the start of the public key line',
		turns: [
			[`It's sk-ssh-ed25519@openssh.com.`, `That's what I expected. Cairn accepts three key types today: ssh-ed25519, ecdsa-sha2-nistp256 and ssh-rsa. Security-key types aren't on the list, so the keys page refuses them before it looks any further. Do you need the key to work from CI jobs as well, or only from your own machine?`],
			[`Only from my laptop.`, `Good, then nothing else stands in the way: our SSH front end only needs the key's fingerprint to match, and it copes with security keys. The check that stops you is the list of key types in cairn-api.`]
		],
		need2: 'tell me whether the key needs to work from CI jobs too',
		fixed: [`Thanks.`],
		workaround: {
			offer: `Until that list grows, the simplest way through is an ordinary ed25519 key on the laptop, with a passphrase, kept just for Cairn, and the YubiKey for everything else. Would that do for now?`,
			accept: [`That's fine. I've made a normal ed25519 key for Cairn and I'll keep the YubiKey for GitHub and the servers.`, `OK, a passphrase-protected key it is for Cairn. Done, and pushing works.`],
			decline: `I'd rather not: the whole point was to get private keys off the laptop, and the security team asked us to move everything over this quarter.`
		},
		change: {
			what: 'accept security-key types (sk-ssh-ed25519@openssh.com and sk-ecdsa-sha2-nistp256@openssh.com) on POST /keys',
			tell: `Fair enough. That needs a change to cairn-api: the keys endpoint has to accept the two security-key types. I've put it on our list for the next release, with your request against it, and I'll tell you when it ships.`,
			ok: [`Thanks, I'll wait for that then. Please do let me know.`, `Great, thank you. I'll keep an eye on the changelog.`]
		},
		outcomes: ['workaround', 'change', 'waiting']
	},
	{
		id: 'p384',
		weight: 1,
		subjects: ['ECDSA key refused', 'Key from the new laptop build not accepted', 'P-384 key'],
		open: [
			`The new laptops in {team} come with an SSH key made by the device management tool, and Cairn won't accept it. The error is "key must be an OpenSSH public key".`,
			`I generated a key with ssh-keygen -t ecdsa -b 384 because a client audit asks for P-384, and the keys page refuses it.`
		],
		quick: [`Does Cairn store the comment at the end of my key?`, `No, it keeps the key type and the key itself and leaves the comment off.`],
		reply: `Thanks. Could you paste the public key line here? It's safe to share; just the .pub file, please.`,
		need: 'paste the public key line',
		turns: [
			[`Here it is.`, `Thanks. It's an ECDSA key on the P-384 curve, ecdsa-sha2-nistp384. Cairn accepts ECDSA only on P-256 at the moment, alongside ed25519 and RSA. Is P-384 a requirement for you, or just the tool's default?`, arts.p384],
			[`Our contract with {client} names it: P-384 or ed25519, nothing weaker.`, `Then ed25519 counts, which helps. Our SSH front end would take P-384 already; it's only cairn-api's list of key types that turns it away.`]
		],
		need2: 'tell me whether P-384 is a requirement or just the default',
		fixed: [`Thanks.`],
		workaround: {
			offer: `So the quickest route is an ed25519 key, which the contract allows and Cairn accepts today. ssh-keygen -t ed25519 makes one in a second.`,
			accept: [`ed25519 it is. Added, and the push worked.`, `Fine by us. I've made ed25519 keys and they all went in.`],
			decline: `The device management tool can only make ECDSA keys, and we aren't allowed to make our own keys on those laptops.`
		},
		change: {
			what: 'accept ecdsa-sha2-nistp384 (and nistp521) keys on POST /keys',
			tell: `Then we'll need to change cairn-api so the keys endpoint accepts ecdsa-sha2-nistp384. I've added it to the list for the next release, with your laptops as the reason, and I'll let you know when it's out.`,
			ok: [`Thanks. We'll keep using the desktops until then.`, `OK, thank you. Let me know.`]
		},
		team: {
			pre: `Actually, could the device management tool make ed25519 keys instead? That would solve it for the whole team at once.`,
			name: '{itdesk}',
			handover: `The device management profile for the {team} team's laptops makes ecdsa-sha2-nistp384 SSH keys, which Cairn doesn't accept. Could the profile make ed25519 keys instead?`,
			tell: `Good thought. The profile belongs to {itdesk}, so I've passed it to them, asking whether it can make ed25519 keys. They'll take it from here.`
		},
		outcomes: ['workaround', 'change', 'team']
	},
	{
		id: 'image-key',
		weight: 2,
		subjects: ['"this key is already in use"', 'Key in use?', 'New laptop key refused', '409 when adding a key'],
		open: [
			`I've just had my new laptop from IT and tried to add its SSH key. Cairn says "this key is already in use". I didn't make the key, to be honest: it was already in ~/.ssh when I got the laptop.`,
			`Adding my key gives a 409, "this key is already in use". I've never added it anywhere before, I promise.`
		],
		quick: [`How many keys can I have on my account?`, `There's no limit. Most people have two or three: one per machine.`],
		reply: `That message means the same key is already on some Cairn account. Could you send me its fingerprint? ssh-keygen -lf ~/.ssh/id_ed25519.pub prints it, and with it I can see where the key is.`,
		need: 'send the fingerprint of the key',
		turns: [
			[`Here's the fingerprint.`, `Thanks. That key is already on {nacc} other accounts, all people who had a laptop from the same batch. It looks as if the laptop image was built with a key in it, so everyone set up from that image has the same one. When did you get your laptop?`, arts.keygenFp],
			[`Last {pastDay}. {colleague} got one the same day.`, `That fits. Please don't use that key for anything: anyone with a laptop from that image holds its private half. Make a fresh one with ssh-keygen -t ed25519 -C "{email}", add that, and delete the old files from ~/.ssh.`],
			[`Should I tell {colleague}?`, `Please do, though I'm writing to everyone who has it on their account as well. I'm removing it from those accounts now, so their pushes will stop until they add a new key.`],
			[`Is there anything else from the image I should change?`, `Nothing on our side. If the image also came with a git config, check git config --global user.name and user.email, so your commits carry your own name and not the image builder's.`]
		],
		need2: 'tell me when you got the laptop',
		fixed: [`Made a new key, added it, and it went in first time. Old files deleted.`, `New key added and pushing works. I've told {colleague} too.`],
		team: {
			at: 2,
			pre: `I can't make a new key, it turns out: ssh-keygen is blocked on this image as well, and the .ssh folder is read-only.`,
			name: '{itdesk}',
			handover: `The current laptop image ships with an SSH key in ~/.ssh, so everyone imaged from it shares one key ({nacc} Cairn accounts so far); I've removed it from Cairn. The image also blocks ssh-keygen, so {first} can't make a new one. Could you fix the image and help {first} with a key?`,
			tell: `Then this has to go back to {itdesk}, who build the image. I've passed it on with the details, including the shared key, which I've taken off every account. They'll be in touch about your laptop.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'private-key',
		weight: 1,
		subjects: ['Key error', 'Is this the right key?', 'Adding a key for the build box'],
		open: [
			`The keys page says my key isn't an OpenSSH public key. I pasted the contents of id_ed25519 from my home folder. Is that the wrong file?`,
			`Trying to add a key and I get a 400 every time. The text starts with "-----BEGIN OPENSSH" so I assumed it was the right thing.`
		],
		quick: [`Is there a size limit on the key's title?`, `Yes, 100 characters. Most people use the machine's name.`],
		reply: `Stop there for a moment, please: id_ed25519 is the private half of your key, and the public half is id_ed25519.pub. The page refused it, so nothing was stored, but the text did travel through the form. Have you pasted it anywhere else, such as a chat or another site?`,
		need: 'tell me whether the private key was pasted anywhere else',
		turns: [
			[`Only into the keys page. Is that bad?`, `Cairn refused it before storing anything, so it isn't on Cairn. But it travelled in a request and may sit in your browser's form history, so to be safe please make a new pair and use the new public key. Which machine is it on?`],
			[`My {machine}.`, `Then run ssh-keygen -t ed25519 -C "{email}", choose a passphrase, and paste the contents of the new .pub file on the keys page. The .pub file is the one you can share; the other never leaves the machine.`],
			[`Do I need to tell anyone about the old one?`, `Not if it was only meant for Cairn and never went on a server. If the same key opens any servers, tell the security team so they can take it off them.`],
			[`How do I tell the files apart next time?`, `The public one ends in .pub and is a single line starting with ssh-ed25519. The private one starts with "-----BEGIN OPENSSH PRIVATE KEY-----" and runs over several lines. Only the .pub ever goes anywhere.`]
		],
		need2: 'tell me which machine the key is on',
		fixed: [`New key made, .pub pasted, accepted. Thanks for catching it.`, `Done: new pair, passphrase and all, and the old files are gone.`],
		team: {
			at: 1,
			pre: `Hmm. The old key also opens the {proj} staging servers, and I pasted it into a chat with {colleague} last week while trying to get it working.`,
			name: 'the security team',
			handover: `{first} pasted their private SSH key into a chat last week; the same key opens the {proj} staging servers. Cairn never stored it. Could you get it off the servers and check the chat?`,
			tell: `Thanks for saying. As the key opens servers and has been through a chat, I've passed it to the security team: they'll take it off the staging servers and help you replace it there.`
		},
		outcomes: ['sorted', 'team']
	},
	{
		id: 'wrapped-key',
		weight: 2,
		subjects: ['Key rejected', 'SSH key not valid?', 'Problem adding the build machine key'],
		open: [
			`{colleague} emailed me the public key from the build machine so I could add it, and Cairn says it isn't an OpenSSH public key. It starts with ssh-ed25519, so I can't see what's wrong.`,
			`The keys page won't accept a key I copied out of a terminal over a remote desktop session. It looks right to me.`
		],
		quick: [`Can I add the same key to two accounts?`, `No, a key can only be on one account; a second attempt answers 409.`],
		reply: `Thanks. Could you paste exactly what you're putting into the page, between two lines of backticks, so the line breaks survive?`,
		need: 'paste exactly what goes into the keys page',
		turns: [
			[`Here's what I'm pasting.`, `That's it: the key is broken over several lines, probably by the email client or the terminal's width, and Cairn reads a line break as the end of the key. Where did the copy come from, exactly?`, arts.wrapped],
			[`From an email {colleague} sent, copied from {proj}'s build box.`, `Then the simplest is to take it straight from the file: cat ~/.ssh/id_ed25519.pub on the build box, or copy the .pub file over with scp, and paste it as one line. If you join the lines by hand, take care not to add spaces.`],
			[`Does the bit at the end, after the key, matter?`, `That's the comment. Cairn stores the key type and the key and leaves the comment off, so it doesn't end up anywhere.`],
			[`Should the build box have its own key, or can it use mine?`, `Its own, please, on a build account rather than a person's. If it uses yours, its pushes look like yours and stop working when you leave.`]
		],
		need2: 'tell me where the copy of the key came from',
		fixed: [`Copied it straight from the file this time and it was accepted. Thanks!`, `scp'd the .pub over and pasted it as one line: accepted.`],
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'md5',
		weight: 1,
		subjects: ["Fingerprints don't match", 'Which key is which?', 'Key audit question'],
		open: [
			`I'm filling in the yearly access review for {client}, which wants the fingerprint of every SSH key we use. The fingerprints on Cairn's keys page don't match anything in our spreadsheet.`,
			`Cairn shows my key's fingerprint as SHA256: and a jumble of letters, and our server inventory lists it as a row of hex pairs with colons. Are these different keys?`
		],
		quick: [`Is SHA256 the same thing ssh-keygen shows me?`, `Yes, by default ssh-keygen -l prints SHA256 fingerprints in exactly the form Cairn shows.`],
		reply: `They're very likely the same key written two ways. Could you paste one fingerprint from your spreadsheet and tell me which key it should be?`,
		need: 'paste a fingerprint from the spreadsheet',
		turns: [
			[`This row should be my {keyTitle} key.`, `Thanks. That's an MD5 fingerprint, the older format of sixteen hex pairs. Cairn shows SHA256, which ssh-keygen has printed by default since OpenSSH 6.8: the same key, a different digest. Can you run ssh-keygen on that machine? I'll show you how to get both.`, arts.md5Row],
			[`Yes, I'm at it now.`, `Then ssh-keygen -l -E md5 -f ~/.ssh/id_ed25519.pub prints the MD5 form, and leaving out -E md5 gives the SHA256 form Cairn shows. If both match your records, it's one key.`, arts.keygenBoth],
			[`Could Cairn show the MD5 form as well?`, `Not at the moment. Most tools moved to SHA256 years ago, so nobody has needed it until now.`],
			[`Is MD5 still good enough for checking keys?`, `For telling keys apart in a spreadsheet, yes. It's weak as a hash for security, which is why the tools moved on, but nobody is forging SSH keys to match your inventory.`]
		],
		need2: 'run ssh-keygen on the machine',
		fixed: [`Both forms match. Same key, written differently. Thanks for explaining.`, `Ran it on all three machines and everything lines up with the spreadsheet now.`],
		workaround: {
			at: 3,
			offer: `If your records have to stay in MD5, fill them in from ssh-keygen -E md5 on each machine; the keys themselves don't change.`,
			accept: [`Fine, I'll do that. It's only a handful of keys.`, `That will do. I'll put both forms in the spreadsheet so this doesn't come up again next year.`]
		},
		outcomes: ['sorted', 'workaround']
	},
	{
		id: 'leaver',
		weight: 2,
		subjects: ['Leaver: remove SSH keys', 'Someone has left: Cairn access', 'Offboarding question'],
		open: [
			`{leaverFull} left the {team} team on {leftDay}. Their accounts were closed, but I've just realised their SSH keys may still be on Cairn. Can you remove them?`,
			`What happens to someone's SSH keys on Cairn when they leave? {leaverFull} finished on {leftDay} and I'd like to be sure nothing of theirs still opens {proj}.`
		],
		quick: [`Can I see who else is in my organisation on Cairn?`, `Yes: the people page in the web app, or GET /users from a script.`],
		reply: `Thanks for checking, that's exactly what we want to hear about. Signing in stops when the sign-on account closes, but SSH keys live on Cairn separately. Can you confirm their last day, so I can check nothing was pushed after it?`,
		need: "confirm the leaver's last day",
		turns: [
			[`Their last day was {leftDay}.`, `Thanks. I've looked at the push log: nothing from their keys after that day. They had {n2} keys on the account, which I'll remove now. Did they use any of them on shared machines, such as a build box?`, undefined, arts.pushLogLeaver],
			[`One was on the {proj} build box, I think.`, `Then the build box will stop pushing when I remove it. Is there a key on that box that belongs to someone still on the team, or should I wait until you've set one up?`],
			[`Go ahead and remove them. I'll put my own key on the build box this afternoon.`, `Done: all of {leaver}'s keys are gone. Yours will work on the box as soon as you add it.`],
			[`Is there anything else of theirs I should check on Cairn?`, `Their projects stay where they are and keep working, so nothing breaks there. If they had a script running under their session, on the build box or elsewhere, look for it now rather than when it fails.`]
		],
		need2: 'tell me whether any of the keys were on shared machines',
		fixed: [`The build box is on my key now and last night's build pushed fine. Thanks for the quick help.`, `All sorted, and nothing of theirs is listed any more.`],
		team: {
			at: 1,
			pre: `Also, I'm fairly sure they used the same key on the {proj} production servers, which have nothing to do with Cairn.`,
			name: 'the security team',
			handover: `Leaver {leaverFull} ({team}) may have the same SSH key on the {proj} production servers. I've removed their keys from Cairn. Could you check the servers?`,
			tell: `I've removed their keys from Cairn. The servers aren't ours, so I've passed that part to the security team, who will check them and come back to you.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'key-review',
		weight: 1,
		subjects: ['List of keys for the access review', 'Old SSH keys report', 'Key rotation'],
		open: [
			`The security team wants every team to rotate SSH keys older than a year. Is there a way to see which keys in {team} are that old?`,
			`For the quarterly access review I need a list of the SSH keys the people in {team} have on Cairn, with when each was added. Can Cairn give me that?`
		],
		quick: [`Does deleting a key on Cairn affect my other machines?`, `Only the machine that uses that key. Each key is separate.`],
		reply: `Each person can see their own keys, with the date each was added, on the keys page or from GET /keys. There's no view of other people's keys yet. How many people are we talking about?`,
		need: 'tell me how many people the list would cover',
		turns: [
			[`{people} people.`, `Then one route is a short script that each person runs with their own session, printing their keys with the date added. Would that be good enough for the review, or does the list need to come from us?`],
			[`The review wants it from a system, not self-reported, ideally.`, `Understood. The data is all there, as every key has the date it was added. What's missing is a way for anyone but the key's holder to list it.`]
		],
		need2: 'tell me whether self-reported lists would satisfy the review',
		fixed: [`Thanks.`],
		workaround: {
			offer: `For this round we can run the query ourselves and send you the keys of everyone in {team}, with their dates. It's a manual job for us, so not something to do every month, but here it is.`,
			art: arts.keysTable,
			accept: [`That's perfect for this round, thank you.`, `Exactly what the review needs. Thanks for doing it by hand.`]
		},
		change: {
			what: "a listing of an organisation's SSH keys with their dates, readable by the security team",
			tell: `Then it needs a change to cairn-api: a listing of an organisation's keys that the security team can read. I've added it to the list for the next release, with the access review as the reason, and I'll tell you when it's there.`,
			ok: [`Thanks. I'll tell the review it's coming.`, `Good, we'll use it for the next round.`]
		},
		team: {
			name: 'the security team',
			pre: `Thinking about it, the security team asked for this, so they may want it for every team at once rather than us asking one by one.`,
			handover: `{first} needs the SSH keys of everyone in {team}, with their ages, for the access review. Would you rather produce the list centrally for every team?`,
			tell: `That makes sense. I've passed it to the security team, as they run the review and can decide how they want the lists made.`
		},
		outcomes: ['workaround', 'change', 'team']
	},
	{
		id: 'host-key',
		weight: 3,
		after: FRONT_END_MOVE,
		before: Date.UTC(2026, 9, 20),
		shared: true,
		subjects: ['WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED', 'Scary SSH warning', 'Is Cairn compromised?', 'Host key changed?'],
		open: [
			`I've just tried to pull and got a huge warning that the remote host identification has changed and that someone could be eavesdropping. I haven't touched anything. Is Cairn all right?`,
			`git fetch refuses to connect and says the host key for ${HOST} has changed. I didn't want to just delete the line without asking first.`,
			`Back from leave today and git won't talk to Cairn: "Host key verification failed". Have I been hacked while I was away?`
		],
		quick: [`Is the web app on the same machine as the git service?`, `No, they're separate. The web app's certificate didn't change, only the SSH host key.`],
		reply: `Thanks for asking first, that's the right instinct. We moved Cairn's SSH front end to a new machine on Tuesday 1 September, and it has a new host key. Before you accept it, could you paste the fingerprint your warning shows, so we can check it's ours?`,
		need: 'paste the fingerprint from the warning',
		turns: [
			[`It says this.`, `That's ours: ${HOST_FP} is the new ed25519 host key. Remove the old entry with ssh-keygen -R ${HOST} and connect again, and SSH will ask you to accept the new key. Did the warning mention any other host name, such as an IP address?`, arts.hostWarning],
			[`It mentions line {line} of known_hosts as well.`, `That's the old entry, and ssh-keygen -R removes it by name. If you had also added Cairn by its IP address, run it again with the IP; otherwise you're done.`],
			[`Will this happen again?`, `Not unless we move the front end again, and we'd announce that beforehand. The 1 September move was in the platform newsletter, but plenty of people missed it.`],
			[`Do I need to do the same on our build machines?`, `Yes: any machine that talked to Cairn before 1 September still has the old key. ssh-keyscan -t ed25519 ${HOST} prints the new line for their known_hosts, but check its fingerprint against ours before you trust it.`]
		],
		need2: 'tell me whether the warning names any other host',
		fixed: [`Removed the old line, accepted the new key after checking the fingerprint, and pulling works. Thanks.`, `All good now. I checked the fingerprint against yours before typing yes.`],
		fixedArt: arts.sshOk,
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'port-22',
		weight: 2,
		subjects: ['Push times out', "Can't reach Cairn over SSH", 'Connection timed out on port 22'],
		open: [
			`I'm working from {place} this week and every git command against Cairn hangs and then says "Connection timed out". The web app loads fine.`,
			`ssh to ${HOST} times out from {place}. Everything else seems to work. Is Cairn down?`
		],
		openArt: arts.pullTimeout,
		quick: [`Is there a status page for Cairn?`, `Yes, status.saltmarsh.example.com lists Cairn's web app, API and git service, with any planned work.`],
		reply: `Cairn is up, and the web app working suggests the network you're on blocks outgoing SSH on port 22. Could you run ssh -vT git@${HOST} and paste what it prints before it gives up?`,
		need: `run ssh -vT git@${HOST} and paste the output`,
		turns: [
			[`It just sits at "Connecting to" and then gives up.`, `That's what a blocked port looks like: the connection never gets as far as SSH. Plenty of networks only let web traffic out. Can you reach anything else over SSH from there, such as a server of your own?`, arts.sshTimeout],
			[`No, nothing on port 22 works from here.`, `Then it's the network, not Cairn. The good news is that Cairn also answers SSH on port 443, the web port, at ssh.${HOST}, which networks almost never block.`]
		],
		need2: 'tell me whether anything else works over SSH from there',
		fixed: [`Thanks.`],
		workaround: {
			offer: `Add these lines to ~/.ssh/config and your existing remotes will go through port 443 with no change to the repositories. Take them out again when you're back on a normal network, or leave them: they work everywhere.`,
			art: arts.config443,
			accept: [`That works. Pushed over 443 just now. I'll leave it in for travelling.`, `Brilliant, git pull works through 443. Leaving the config in place.`, `Perfect, that's me working again.`]
		},
		team: {
			at: 1,
			pre: `I should have said: this is the staff network in our own {office} office, not a guest network. Should port 22 be blocked here?`,
			name: '{netteam}',
			handover: `Outgoing port 22 to ${HOST} seems blocked from the {office} office staff network since about {pastDay}; {first} can't reach Cairn over SSH there. Could you check the firewall rules?`,
			tell: `No, it shouldn't be. That looks like a change on the office network, so I've passed it to {netteam} with the details.`
		},
		outcomes: ['workaround', 'team', 'waiting']
	},
	{
		id: 'big-file',
		weight: 2,
		subjects: ['Push rejected: file too large', 'pre-receive hook declined', "Can't push the new data", 'Push refused by Cairn'],
		open: [
			`My push to {proj} is rejected with "pre-receive hook declined". I've pushed to this repository a hundred times. The only new thing is that the branch adds some {dataset}.`,
			`git push fails with a remote error about a size limit. I don't understand which file it means, as my last commit only changes a couple of scripts.`
		],
		quick: [`Is there a limit on the size of a whole repository?`, `Not a hard one. We look at anything over 5 GB with the team that owns it, mostly to keep clones quick.`],
		reply: `Cairn refuses any single file over 100 MB, and it checks every commit in the push, not just the last one. Could you paste the whole output of the push? The lines starting with "remote:" say which file it is.`,
		need: 'paste the whole output of the push',
		turns: [
			[`Here's the output.`, `There it is: {file} is {mb} MB, added in commit {sha7} a few commits back. Even though a later commit may delete it, the file is still in the history, so the push carries it. Do you need that file in the repository at all, or did it go in by accident?`, arts.pushTooBig],
			[`It's test data. We need it somewhere, but not necessarily in git.`, `Then the cleanest fix is to take it out of the history before pushing: git filter-repo --path {file} --invert-paths on your branch. Nobody else has those commits yet, so nobody else is affected. Then keep the data in the team's storage bucket and fetch it in the test setup.`],
			[`Will filter-repo mess up my other branches?`, `It rewrites every branch in the clone by default. Since the commit is only on this branch, run it on a fresh clone of just that branch if you want to be safe, and push from there.`],
			[`How do we stop it happening again?`, `A pre-commit hook on your side that refuses big files catches it before it's even a commit, and a .gitignore entry for the data folder helps. Cairn's limit is only the backstop.`]
		],
		need2: 'tell me whether the file needs to be in the repository',
		fixed: [`Rewrote the branch without the file, put the data in the bucket, and the push went through.`, `filter-repo did the trick. Pushed, and the test setup now downloads the data instead.`],
		fixedArt: arts.pushOk,
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'force-push',
		weight: 1,
		subjects: ['Lost commits on main', 'Help: main was overwritten', 'Force push accident'],
		open: [
			`Someone force-pushed to main on {proj} this morning, and a day's worth of commits from three of us has gone from the branch. Is there any way to get them back?`,
			`I think I've done something awful. I ran git push --force from an old clone and now main on {proj} is missing everything since {pastDay}.`
		],
		quick: [`Can I see who pushed what to a project?`, `We can, from the push log, and we're happy to look things up. There's no page for it in the web app yet.`],
		reply: `Don't worry, this is recoverable. Cairn keeps a log of every change to every branch for 90 days. Could you paste the output of the push that overwrote main, or tell me roughly when it happened? Then I can find where main pointed before.`,
		need: 'send the output of the push or the time it happened',
		turns: [
			[`Here's the push output. It was at about {time}.`, `Thanks. Before that push, main pointed at {sha1}, and the push moved it to {sha2}. Shall I send you the list of commits that were on main just before, so you can check they're the ones you lost?`, arts.forced],
			[`Yes please, I don't have them locally.`, `Here they are, newest first. If they're the ones you lost, I can put main back to {sha1}. Anything pushed to main since would need to go on top again.`, undefined, arts.commitList],
			[`That's everything, and nobody has pushed since.`, `Done: main on {proj} points at {sha1} again. Anyone who pulled in between should run git fetch and then git reset --hard origin/main on their main branch, after saving any work of their own.`],
			[`How do we stop this happening again?`, `The best habit is git push --force-with-lease instead of --force: it refuses when the branch has moved since you last fetched, which is exactly what happened here.`]
		],
		need2: 'tell me whether to send the list of commits that were on main',
		fixed: [`Everything is back. Thank you so much, you've saved our week.`, `Checked with the others and all the commits are there. Thank you!`],
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'slow-push',
		weight: 2,
		subjects: ['Push of a large repository fails', '"the remote end hung up unexpectedly"', 'First push keeps failing'],
		open: [
			`I'm bringing {proj} over to Cairn and the first push dies about halfway with "the remote end hung up unexpectedly". It's a big repository, around {gb} GB with its history.`,
			`Pushing an existing repository to a new, empty Cairn project fails every time after a while. Small pushes to other projects work fine.`
		],
		quick: [`Does Cairn keep tags when I push them?`, `Yes, tags are stored like branches. git push --tags sends them all.`],
		reply: `Thanks. Could you paste the end of the push output and say roughly how long it ran before it failed?`,
		need: 'paste the end of the push output and say how long it ran',
		turns: [
			[`It runs about {mins} minutes, then this.`, `That points at a time limit rather than the size: our front end closes a push that has run for 30 minutes, and on your connection the pack takes longer than that to upload. Are you on the office network or at home?`, arts.pushEof],
			[`At home today.`, `Then the upload is the slow part. You can push the history in parts, oldest first, so that each push finishes well inside the limit.`],
			[`How do I push it in parts?`, `Push older commits first: git push origin <commit>:refs/heads/main with a commit a few thousand back, then a later one, and finally main itself. Each push only sends what Cairn doesn't have yet. git rev-list --count main tells you how many commits there are to spread out.`],
			[`Will later pushes be slow too?`, `No, only the first one is big. After that each push sends just the new commits, which takes seconds.`]
		],
		need2: 'tell me whether you were on the office network or at home',
		fixed: [`Pushed it in four goes and the last one finished in a couple of minutes. All the history is there.`, `Did it in parts and it's all across. Branches and tags too.`],
		team: {
			at: 1,
			pre: `I'm in the {office} office, actually, on the wired network, and it's still crawling: a couple of MB a second.`,
			name: '{netteam}',
			handover: `Uploads to ${HOST} from the {office} office run at a couple of MB/s; {first}'s {gb} GB push takes longer than our 30-minute limit. Could you look at the office uplink?`,
			tell: `That's far slower than the office link should be. I've asked {netteam} to look at the uplink; the details are with them.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'sha1-agents',
		weight: 1,
		after: FRONT_END_MOVE,
		subjects: ['Builds fail at checkout since the move', 'CI agents: Permission denied (publickey)', 'Old build agents cannot clone'],
		open: [
			`Since early September the nightly builds on our old agents fail to clone {proj}: "Permission denied (publickey)". The newer agents, with the same key, are fine.`,
			`Our legacy build agents can't fetch from Cairn any more. The key hasn't changed, and the same key works from my laptop.`
		],
		openArt: arts.ciLog,
		quick: [`Do the build agents need their own Cairn account?`, `Most teams use a build account with its own key; the build team can set one up.`],
		reply: `Thanks. Could you tell me which operating system and OpenSSH version the old agents run? ssh -V on one of them prints it.`,
		need: 'send the OpenSSH version of the old agents',
		turns: [
			[`OpenSSH_7.2p2 Ubuntu-4ubuntu2.10, on 16.04.`, `That's the cause, I'm fairly sure. The new SSH front end no longer accepts RSA signatures made with SHA-1, and OpenSSH 7.2 with an RSA key signs that way by default. Our log shows exactly that for your agents. Is the agents' key an RSA key?`, undefined, arts.sha1Log],
			[`Yes, ssh-rsa, from 2019.`, `Then either the agents need a newer OpenSSH, or they need an ed25519 key, which 7.2 understands and which has no SHA-1 question at all.`]
		],
		need2: "tell me whether the agents' key is an RSA key",
		fixed: [`Thanks.`],
		workaround: {
			offer: `The quick fix you can do yourselves is a new ed25519 key on the agents, added to the build account: ssh-keygen -t ed25519 works on 7.2. The OS upgrade can wait for the agents' rebuild.`,
			accept: [`Made an ed25519 key for the agents and last night's builds went green.`, `New key on the agents, and they're cloning again. We'll leave the upgrade for the rebuild next year.`]
		},
		team: {
			pre: `The agents belong to the build team, and their images are locked, so we can't change keys on them ourselves.`,
			name: 'the build team',
			handover: `The legacy build agents (Ubuntu 16.04, OpenSSH 7.2) sign with ssh-rsa/SHA-1, which the new SSH front end refuses, so {proj}'s nightly builds can't clone. Could you give them an ed25519 key or a newer OpenSSH?`,
			tell: `Then it's one for the build team, who own the agent images. I've passed it on with our log, so they can give the agents a new key or a newer OpenSSH.`
		},
		outcomes: ['workaround', 'team', 'waiting']
	},
	{
		id: 'wrong-url',
		weight: 2,
		subjects: ['"Repository not found"', "Can't clone {projName}", 'Clone address not working'],
		open: [
			`I'm trying to clone {projName} for the first time and git says "ERROR: Repository not found". {colleague} says it's definitely there.`,
			`Cairn tells me a repository doesn't exist that I can see perfectly well in the web app. I'm using the address from the old wiki page.`
		],
		quick: [`Can project names have capital letters?`, `Names can; the slug in the address is always lower case.`],
		reply: `Could you paste the exact command you ran? The clone address has to match the project's address in Cairn letter for letter.`,
		need: 'paste the exact clone command',
		turns: [
			[`This is what I ran.`, `Thanks, I see it: the address says {wrong}, but the project lives at {orgSlug}/{proj}. Cairn's addresses are the organisation and the project's slug, all lower case, with dashes. Where did you get the address from?`, arts.cloneNotFound],
			[`From the {projName} page on the old wiki.`, `That page still has the address from {oldHost}. The right one is git@${HOST}:{orgSlug}/{proj}.git, which you can also copy from the project's page in the web app.`],
			[`Can I fix my old clones, or do I need to clone again?`, `No need to clone again: git remote set-url origin git@${HOST}:{orgSlug}/{proj}.git in each old clone points it at Cairn.`],
			[`Is there a list of the old addresses and the new ones?`, `Yes, the migration page on the platform wiki has a table of every repository we moved, with its new address.`]
		],
		need2: 'tell me where the address came from',
		fixed: [`Cloned fine with the right address. I've corrected the wiki page as well.`, `That was it. I've changed the remote on my old clones too.`],
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'slow-clone',
		weight: 2,
		shared: true,
		subjects: ['Clones are very slow', 'Cairn slow from the office', 'Fetching takes ages'],
		open: [
			`Cloning {proj} in the {office} office takes over {mins} minutes. From home it's a couple of minutes. Is something wrong with Cairn?`,
			`Since about {pastDay} every fetch from Cairn crawls along at a few hundred KB a second. Colleagues in {office} see the same.`
		],
		quick: [`Does a shallow clone save much?`, `For big histories, a lot: git clone --depth 1 fetches only the latest commit. You can deepen it later.`],
		reply: `Thanks. Could you paste the end of a clone run with --progress, so I can see the transfer speed, and tell me whether you're on wired or Wi-Fi?`,
		need: 'paste a clone run with --progress',
		turns: [
			[`Wired. Here's a clone.`, `That's very slow indeed: about {kbs} KiB/s. Our side shows no load, and clones from other places are normal today. Could you try the same clone over port 443, at ssh.${HOST}? If that's fast, something on the office network treats port 22 differently.`, arts.cloneSlow],
			[`Over 443 it's much faster: about {mbs} MB/s.`, `Then it's the office network slowing SSH on port 22, not Cairn. Port 443 isn't affected.`]
		],
		need2: 'try the same clone over port 443',
		fixed: [`Thanks.`],
		workaround: {
			offer: `Until that's looked at, you can send Cairn traffic over 443 all the time with these lines in ~/.ssh/config. Nothing else needs to change.`,
			art: arts.config443,
			accept: [`Done, and clones are quick again. We'll all use 443 from now on.`, `That's fine for us. I've shared the config with the team.`]
		},
		team: {
			name: '{netteam}',
			handover: `SSH on port 22 from the {office} office to ${HOST} runs at about {kbs} KiB/s, while port 443 is normal. It looks like traffic shaping on port 22. Could you check?`,
			tell: `I've passed it to {netteam} with your numbers: it looks as if port 22 is being slowed somewhere in the office network, and that's theirs.`
		},
		outcomes: ['workaround', 'team', 'waiting']
	},
	{
		id: 'signing',
		weight: 1,
		subjects: ['Signed commits not shown as verified', 'SSH commit signing', 'Verified badge?'],
		open: [
			`I've set git up to sign my commits with my SSH key (gpg.format ssh), and on GitHub they show as verified. On Cairn there's nothing at all. Is there a setting I've missed?`,
			`{client} wants every commit to {proj} signed. I'm signing with my SSH key, but Cairn doesn't show whether a commit is signed. How would they check?`
		],
		quick: [`Can I use one SSH key for both signing and pushing?`, `Git allows it, and nothing on Cairn's side stops you.`],
		reply: `Thanks. Could you first confirm the commits really are signed locally? git log --show-signature -1 shows it, as long as you have an allowed signers file set up.`,
		need: 'run git log --show-signature -1 and send the result',
		turns: [
			[`Yes, it says "Good git signature".`, `Good, so the signing works. The web app doesn't check signatures at the moment: it shows commits as they are, signed or not. Does {client} need to see it in Cairn, or would a check in CI satisfy them?`, arts.goodSig],
			[`They'd like to see it on the commit page, ideally.`, `Then two things are needed: Cairn has to know which of your keys are for signing, and the web app has to check. The first part is cairn-api's: it would hold signing keys next to your SSH keys.`]
		],
		need2: 'tell me whether a CI check would satisfy the client',
		fixed: [`Thanks.`],
		workaround: {
			offer: `Meanwhile a CI step can refuse unsigned commits: git verify-commit on each new commit, with an allowed signers file of the team's keys in the repository. It doesn't show a badge, but it guarantees the history.`,
			art: arts.verifyStep,
			accept: [`A CI check will satisfy them for now. I'll add it.`, `That's enough for {client}. Added the step to the pipeline and it's green.`],
			decline: `A CI check won't do, I'm afraid: their auditors look at the commit pages themselves.`
		},
		change: {
			what: 'signing keys on accounts, so the web app can check commit signatures',
			tell: `Then it starts with a change to cairn-api, to hold signing keys, and the web tools team does the checking. I've put the cairn-api half on the list for the next release and told the web tools team.`,
			ok: [`Thanks. I'll tell {client} it's on the way.`, `OK, we'll wait for it.`]
		},
		outcomes: ['workaround', 'change', 'waiting']
	},
	{
		id: 'mirror',
		weight: 1,
		subjects: ['Mirror to GitHub', 'Publishing {projName} on GitHub', 'Push mirror?'],
		open: [
			`We're open-sourcing {proj} next month and want a public copy on GitHub that follows main on Cairn. Can Cairn push to GitHub by itself?`,
			`Is there a way to have Cairn copy a project to another git host automatically? We'd like a copy of {proj} on GitHub for {client}.`
		],
		quick: [`Can Cairn serve a project to people without an account?`, `No, everything on Cairn needs an account. That's partly why teams publish on GitHub.`],
		reply: `Not by itself yet. Could you tell me which branches need to go across, and how soon after a push to Cairn?`,
		need: 'tell me which branches need mirroring and how quickly',
		turns: [
			[`Only main and the tags. Within the hour is fine.`, `Thanks. Then the usual way is a CI job on main that pushes to GitHub with a deploy key. Do you already have a pipeline for {proj}?`],
			[`Yes, it runs the tests on every push.`, `Then a step after the tests is all it takes: push main and the tags to GitHub, with the GitHub deploy key in the pipeline's secrets.`]
		],
		need2: 'tell me whether {proj} already has a pipeline',
		fixed: [`Thanks.`],
		workaround: {
			offer: `Here's the step another team uses. With it the mirror is a few minutes behind every push to main.`,
			art: arts.mirrorStep,
			accept: [`Perfect, that's all we need. Added it and GitHub is in sync.`, `Great, I'll use that. Thanks for the snippet.`]
		},
		change: {
			pre: `We'd rather not keep a GitHub key in the pipeline: the security team asked us to keep outside credentials out of CI.`,
			what: 'push mirrors run by Cairn itself',
			tell: `Understood. Then Cairn would have to push the mirror itself, which is new work in cairn-api and the git service. I've put push mirrors on the list for the next release, with your project as the first user.`,
			ok: [`Thanks. We'll hold the open-sourcing until then.`, `Great, please keep me posted.`]
		},
		outcomes: ['workaround', 'change']
	},
	{
		id: 'slug-taken',
		weight: 2,
		subjects: ['"the organisation already has a project at ..."', "Can't create a project", 'Project name taken?'],
		open: [
			`I'm creating a project for the new {newName} service and Cairn says "the organisation already has a project at {slug}". I can't see one called that in the list.`,
			`Creating {newName} fails with a 409. Is there a hidden project with that name?`
		],
		openArt: arts.create409,
		quick: [`Is there a limit on how many projects a team can have?`, `No limit. Projects cost very little until something is pushed to them.`],
		reply: `Thanks. A project's slug comes from its name, lower case with dashes, so "{newName}" becomes {slug}, and another name can give the same slug. I'll look. Is the new project for {team}?`,
		need: 'confirm which team the new project is for',
		turns: [
			[`Yes, {team}.`, `There is one: "{oldName}", started in {oldMonth} by {oldPerson}, and it has the same slug. Nothing has ever been pushed to it. Could you check with {oldFirst} whether it's still needed?`],
			[`{oldFirst} says it was a test and isn't needed.`, `Thanks for checking. I've removed the empty project, so {slug} is free again: create yours and it'll go through.`],
			[`And the clone address will be {orgSlug}/{slug}?`, `Yes: git@${HOST}:{orgSlug}/{slug}.git once you've created it.`]
		],
		need2: 'check with {oldFirst} whether the old project is needed',
		fixed: [`Created it just now. Thanks for chasing it.`, `Done, {slug} is ours. Cheers.`],
		workaround: {
			at: 1,
			pre: `{oldFirst} wants to keep theirs: it has a spike they might come back to. Could we use a slightly different name?`,
			offer: `Of course. "{newName} Service" gives {slug}-service, which is free, and the clone address follows the slug.`,
			accept: [`{newName} Service it is. Created, thanks.`, `That works. Created it under the longer name.`]
		},
		outcomes: ['sorted', 'workaround', 'waiting']
	},
	{
		id: 'import',
		weight: 2,
		subjects: ['Moving {proj} to Cairn', 'Importing a repository with its history', 'Migration from the old server'],
		open: [
			`We still have {projName} on {oldHost}, which is being switched off at the end of the year. What's the right way to bring it into Cairn with all its branches and tags?`,
			`I'd like to move {projName} from {oldHost} into Cairn, keeping history, branches and tags. Is there an import tool?`
		],
		quick: [`When is {oldHost} being switched off?`, `At the end of December. Anything still on it then is archived to tape.`],
		reply: `There's no import button, but it only takes a few commands. First, the project needs to exist in Cairn, created from the web app or with POST /projects. Has that been done already?`,
		need: 'create the project in Cairn and let me know',
		turns: [
			[`Yes, it's created and empty.`, `Good. Then from a fresh mirror clone of the old repository: git clone --mirror {oldUrl}, go into it, and git push --mirror git@${HOST}:{orgSlug}/{proj}.git. That sends every branch and tag. How big is the repository, roughly?`],
			[`About {gb} GB.`, `That's fine for one push from the office. From home it may hit our push time limit, in which case push it in parts. Only git data comes across: merge requests and issues on the old server stay there.`],
			[`What about the old server's hooks?`, `They stay behind too. If {proj} relied on one, such as a hook that emailed on push, tell me what it did and we'll find a way to do the same.`],
			[`Should we keep pushing to the old server in the meantime?`, `Better not. Once the mirror push is done, make Cairn the only place people push to, and set the old repository read-only so nobody pushes there out of habit.`]
		],
		need2: 'tell me roughly how big the repository is',
		fixed: [`Mirror push done: all {branches} branches and the tags are on Cairn. Thanks for the steps.`, `Moved it this morning, and the copy on {oldHost} is now read-only.`],
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'project-search',
		weight: 1,
		subjects: ['Finding projects in the list', 'Project list too long', 'Search for projects?'],
		open: [
			`The projects list in the web app is {nproj} entries long now and I spend ages scrolling to find the one I want. Is there a search or filter somewhere I've missed?`,
			`Our team dashboard pulls GET /projects and shows everything in the organisation. Can the API return only projects whose names match something?`
		],
		quick: [`In what order does GET /projects list projects?`, `By name, A to Z.`],
		reply: `Thanks. The list comes from GET /projects, which returns every project of the organisation, by name, with no filter yet. Do you mostly look projects up by name, or by team?`,
		need: 'tell me whether you look projects up by name or by team',
		turns: [
			[`By name, mostly.`, `Then the browser's own find, Ctrl+F or Cmd+F, on the list page is the fastest thing today, as the whole list is on one page. Is the list also getting slow to load, or only long?`],
			[`It's not slow, just long.`, `Then it's only the finding. A name filter on GET /projects is the obvious improvement, and the web app's list would use it.`]
		],
		need2: 'tell me whether the list is slow or only long',
		fixed: [`Thanks.`],
		workaround: {
			offer: `For scripts, jq does the filtering in one line, as below. In the web app, find-in-page it is for now.`,
			art: arts.jqFilter,
			accept: [`The jq line is all I need for the dashboard. Thanks.`, `Fine, find-in-page and jq will do. Thanks for looking.`]
		},
		change: {
			what: 'a name filter on GET /projects',
			tell: `I've added a name filter on GET /projects to the list for the next release, with your dashboard as one of the reasons. It's a small change in cairn-api; the web app would pick it up after.`,
			ok: [`Thanks, that would help a lot.`, `Great. Until then I'll live with the scrolling.`]
		},
		team: {
			pre: `It's really the web app I mean: a search box at the top of the list would do it.`,
			name: 'the web tools team',
			handover: `{first} would like a search box on the projects list in the web app; the list is {nproj} long now. Could you consider it?`,
			tell: `That's the web tools team's part of Cairn, so I've passed your request to them.`
		},
		outcomes: ['workaround', 'change', 'team']
	},
	{
		id: 'fork',
		weight: 1,
		subjects: ['Fork a project?', 'Copy of {projName} to experiment', 'How to fork'],
		open: [
			`I want to try a big refactor of {projName} without cluttering its branches. On GitHub I'd fork it. Is there a fork button in Cairn?`,
			`Can I make my own copy of {projName} in Cairn, like a fork, so I can experiment and maybe bring the changes back later?`
		],
		quick: [`Can I get a project's clone address from the API?`, `Not as such, but it's always git@${HOST}:<organisation>/<slug>.git, and GET /projects gives you the slug.`],
		reply: `There's no fork yet, I'm afraid. Do you need to bring the changes back into {proj} later, or is it a one-off experiment?`,
		need: 'tell me whether the changes need to go back into {proj}',
		turns: [
			[`I'd like to bring them back if it works out.`, `Then a branch in {proj} itself is the simplest: prefix it with your name, such as {u}/refactor, and the team can ignore it. Would that work, or does the team prefer people not to push experimental branches?`],
			[`The team doesn't mind branches.`, `Then that's the easiest route, and merging back later is an ordinary merge.`],
			[`Will the branch show up for everyone?`, `Everyone in the organisation sees all of the project's branches, yes. The prefix tells them it's yours, and you can delete it once it's merged or abandoned.`]
		],
		need2: 'check whether the team minds experimental branches',
		fixed: [`Branch it is. Pushed {u}/refactor and nobody has complained. Thanks.`, `Fair enough, a branch does the job. Thanks.`],
		workaround: {
			at: 1,
			pre: `The team asked us to keep {proj} to release branches only, so I'd rather have a separate copy.`,
			offer: `Then create a new project, say "{projName} Sandbox", and push a copy of the branch you start from to it. You can fetch from it into {proj} later like any other remote.`,
			accept: [`Made the sandbox project and pushed. That'll do nicely.`, `Sandbox project created. Works for me.`]
		},
		change: {
			at: 1,
			pre: `A separate project is what I want, but linked to {proj}, so merges can be proposed from it, the way GitHub does it.`,
			what: 'forks: a copy of a project that keeps a link to the original',
			tell: `That's a fork proper, and it needs new work in cairn-api to record which project a copy came from. I've put forks on the list for the next release and added your vote.`,
			ok: [`Thanks. I'll use a branch until then.`, `OK, I'll wait. Thanks for adding it.`]
		},
		outcomes: ['sorted', 'workaround', 'change']
	},
	{
		id: 'first-push',
		weight: 2,
		subjects: ['Pushing to a new project', 'error: src refspec main does not match any', 'New project: push fails'],
		open: [
			`I've created {projName} in Cairn and followed the instructions on its empty page, but the push fails with "src refspec main does not match any".`,
			`The first push to my brand-new project doesn't work. Git complains about a refspec. I've done exactly what the project page says.`
		],
		openArt: arts.refspec,
		quick: [`Can I delete a branch on Cairn?`, `Yes, git push origin --delete <branch> removes it.`],
		reply: `That error comes from git on your side, before anything reaches Cairn. Could you paste the output of git status and git branch in the folder you're pushing from?`,
		need: 'paste the output of git status and git branch',
		turns: [
			[`Here you go.`, `Thanks. Your branch is called master, and the page's instructions push main, so git can't find a branch called main. Did you make the repository with git init on this machine?`, arts.statusMaster],
			[`Yes, git init and then my files.`, `Your git names the first branch master. Either push master with git push -u origin master, or rename the branch with git branch -m main and push main, which is what the rest of the team uses.`],
			[`Which should I do?`, `Rename it to main: the build team's pipelines expect main. git config --global init.defaultBranch main makes it the default for new repositories, too.`],
			[`So the page assumes everyone's first branch is main?`, `It does, as most people's git is set up that way now. We'll mention master on the page as well.`]
		],
		need2: 'tell me how the repository was made',
		fixed: [`Renamed it to main and pushed. Set the default as well, thanks.`, `git branch -m main, push, done.`],
		fixedArt: (r, s) => arts.pushOk!(r, { ...s, pushMain: '1' }),
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'readme',
		weight: 1,
		subjects: ['Project page shows raw Markdown', 'README not rendering', 'Project page formatting'],
		open: [
			`{projName}'s page in the web app shows our README as plain text, hashes and asterisks and all. Other projects look fine. Did we break something?`,
			`The README on {projName}'s page has stopped rendering: tables show up as rows of pipes. It was fine last week.`
		],
		quick: [`Does the web app render Mermaid diagrams?`, `Not yet; they show as code.`],
		reply: `Thanks. Could you tell me the README's file name exactly, with its extension and capitals?`,
		need: "send the README's exact file name",
		turns: [
			[`It's {readme}.`, `That's the reason: the web app renders README.md and README as Markdown, but {readme} isn't on its list, so it shows the text as it is. Was it renamed recently?`],
			[`Yes, {colleague} renamed it in a tidy-up.`, `Then renaming it back to README.md fixes it straight away.`],
			[`Does it show images in the README too?`, `Yes, as long as the paths are relative to the README and the images are in the repository.`]
		],
		need2: 'tell me whether the README was renamed',
		fixed: [`Renamed it back and the page looks right again.`, `Fixed. {colleague} has been gently told.`],
		team: {
			at: 2,
			pre: `We'd rather keep {readme}: our docs tooling needs that name. Could the web app render it as well?`,
			name: 'the web tools team',
			handover: `{projName} keeps its README as {readme} for its docs tooling, and the web app shows it as plain text. Could the web app render that name too?`,
			tell: `That's the web tools team's code, so I've passed it to them with the file name.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'session-length',
		weight: 2,
		subjects: ['Signed out every morning', 'Cairn keeps logging me out', 'Session length'],
		open: [
			`Cairn signs me out whenever I close the browser, sometimes twice before lunch, and I go through the sign-on page again. Is that on purpose? It's not a big deal, just tedious.`,
			`The web app logs me out several times a day, sometimes in the middle of reading a diff. Colleagues say it doesn't happen to them.`
		],
		quick: [`Does signing out of the web app stop my pushes?`, `No, pushes use your SSH key, not your session.`],
		reply: `A session lasts 12 hours from signing in, so one sign-in a day is expected. Several a day isn't. Which browser do you use, and does it happen in a private window too?`,
		need: 'tell me which browser you use',
		turns: [
			[`{browser}, and I don't use private windows.`, `Thanks. Do you have an extension that clears cookies, or a setting that deletes site data when a tab closes? Those end the session early.`],
			[`I have {extension}.`, `That's very likely it: it deletes Cairn's session cookie when you close the last Cairn tab, which looks exactly like being signed out. Add the web app's address to its allowed sites and the session will last the full 12 hours.`],
			[`Is the 12 hours Cairn's, or the sign-on service's?`, `Cairn's. The sign-on service only proves who you are; the Cairn session that follows lasts 12 hours.`]
		],
		need2: 'check for extensions or settings that clear cookies',
		fixed: [`Allowed Cairn in the extension and I've stayed signed in all day.`, `That was it. No more surprise sign-outs.`],
		change: {
			at: 2,
			pre: `That's fixed the daytime ones, thanks. Honestly, the once-a-morning sign-in is the bit that bothers me, though. Could sessions last longer?`,
			what: 'a "keep me signed in" option, for sessions longer than 12 hours',
			tell: `12 hours is what cairn-api gives every session today, so a longer one needs a change there. I've added a "keep me signed in" option to the list for the next release; the security team will want a say in how long it can be.`,
			ok: [`Thanks, I'd use that.`, `Great, thanks for adding it.`]
		},
		outcomes: ['sorted', 'change', 'waiting']
	},
	{
		id: 'sign-in-loop',
		weight: 2,
		subjects: ['Stuck signing in', 'Sign-in loop', '"sign in first" over and over'],
		open: [
			`Since I changed my password on {pastDay} I can't get into Cairn: I sign in, it sends me back to the sign-on page, round and round.`,
			`The web app keeps sending me back to the sign-on page. Sometimes it flashes "sign in first" for a moment. Other internal sites work.`
		],
		quick: [`Can I be signed in on two browsers at once?`, `Yes, each browser gets its own session.`],
		reply: `Sorry, that sounds maddening. Could you try a private window first? If it works there, it's an old cookie in your normal browser profile.`,
		need: 'try signing in from a private window',
		turns: [
			[`A private window works.`, `Good, then it's a stale cookie, most likely from before your last password change. Clear the site data for the web app in your browser's settings and sign in again. Do you use more than one browser profile?`],
			[`Just the one. I cleared it and signed in, and it worked once, but it's back to looping after lunch.`, `Interesting. That sounds like a second, older cookie for the parent domain, saltmarsh.example.com, which your browser sends as well. Clear the site data for saltmarsh.example.com too, not only Cairn's address.`],
			[`Why would there be a cookie for the parent domain at all?`, `A few older internal sites set their cookies for the whole of saltmarsh.example.com, and one of them uses the same cookie name as Cairn. The web tools team are renaming Cairn's.`]
		],
		need2: 'clear the site data and tell me whether you use more than one browser profile',
		fixed: [`Cleared both and it has held all afternoon. Thank you!`, `Clearing the parent domain did it. Signed in and staying in.`],
		team: {
			at: 0,
			pre: `It does the same in a private window and on my phone, so I don't think it's my browser.`,
			name: '{itdesk}',
			handover: `{first} loops on the sign-on page in every browser since a password change on {pastDay}; Cairn never gets a session for them. Could you check their sign-on account?`,
			tell: `Then it isn't Cairn: the sign-on service isn't letting you through, and Cairn never sees you. I've passed it to {itdesk}, who run the sign-on accounts.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'new-starter',
		weight: 2,
		subjects: ['New starter cannot get in', 'Account for {starterFull}', 'Cairn access for a new joiner'],
		open: [
			`{starterFull} joined {team} on {pastDay} and can't get into Cairn: the sign-on page lets them through and then Cairn shows an error. Everything else of theirs works. Can you set them up?`,
			`We have a new starter, {starterFull}, who can't get into Cairn. Who sets up accounts?`
		],
		quick: [`Do new people need anything installed to use Cairn?`, `Just git and an SSH key. The web app works in any current browser.`],
		reply: `We do. Accounts are made from the starters list we get each week, so new people sometimes wait a day or two. Can you confirm {starter}'s work email and team?`,
		need: "confirm the new starter's email and team",
		turns: [
			[`{starterEmail}, in {team}.`, `Thanks. They weren't on this week's list yet, which is why there's no account. I've set it up now, in {org}. Could they try signing in again and let me know?`],
			[`They're in! Next question from them: how do they get access to {proj}?`, `Everyone in {org} can see every project of the organisation, so they have it already. To push they'll need an SSH key on their account, and the keys page walks them through it.`],
			[`Is there a guide we can give new people?`, `Yes, "Getting started with Cairn" on the platform wiki covers keys, cloning and the web app.`]
		],
		need2: 'ask the new starter to sign in again and tell me how it went',
		fixed: [`{starter} has pushed their first commit. Thanks for the quick setup.`, `All working for them now, key and all.`],
		team: {
			at: 0,
			pre: `{starterEmail}, in {team}. Correction, though: they've just told me the sign-on page itself says their account isn't active yet. They never get as far as Cairn.`,
			name: '{itdesk}',
			handover: `New starter {starterFull} ({team}) can't sign in anywhere: the sign-on page says the account isn't active. Their Cairn account is ready. Could you activate the sign-on account?`,
			tell: `Thanks. Their Cairn account is ready; the sign-on account is what's missing, and that's {itdesk}'s. I've passed it to them.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'script-token',
		weight: 2,
		subjects: ['Script stops working every day', 'API token for a script', '401 from my script'],
		open: [
			`I have a small script that posts our team's projects to #{channel} every morning. It works when I paste in my token from the browser, and the next day it gets 401 "sign in first".`,
			`Is there a long-lived token for the API? I'm automating a job against Cairn and the token I copied out of the web app keeps expiring.`
		],
		openArt: arts.cronMail,
		noteArt: ['API log for this token:', apiLog('GET', '/projects', '401', 'python-requests/2.28.1', true)],
		quick: [`Is the API's address going to change with the move to Postgres?`, `No, the address stays the same.`],
		reply: `The token in your browser is your session, and it lasts 12 hours, which is why the script dies the next day. What does the script need to do, exactly?`,
		need: 'tell me what the script needs to do',
		turns: [
			[`It calls GET /projects and posts the list.`, `Thanks, so it only reads. Where does it run: on your laptop or on a server?`, arts.pyGet],
			[`On the {proj} build box, from cron.`, `Then a session token is the wrong tool: it's tied to you, lasts 12 hours, and ends when you sign out. What you want is a long-lived token made for scripts, and cairn-api doesn't have those yet.`]
		],
		need2: 'tell me where the script runs',
		fixed: [`Thanks.`],
		workaround: {
			offer: `For something that only reads the project list, the build team already exports it every hour to a JSON file on the intranet. If the script reads that file, it needs no token at all.`,
			accept: [`The intranet file does the job. Switched the script over and it ran fine this morning.`, `Didn't know that existed. Using the file now, no token needed.`],
			decline: `An hour-old copy won't do, I'm afraid: the script runs right after a deploy and needs the list as it is at that moment.`
		},
		change: {
			what: 'long-lived API tokens for scripts',
			tell: `Then you need API tokens, which cairn-api doesn't have yet. They're on our list for the next release, and I've added your script as one of the reasons. I'll let you know when they're in.`,
			ok: [`Thanks. I'll paste the token by hand until then.`, `OK, I'll wait for those. Thanks.`]
		},
		outcomes: ['workaround', 'change', 'waiting']
	},
	{
		id: 'form-body',
		weight: 2,
		subjects: ['400 from POST /keys', 'Script to add keys fails', '"the body must be a JSON object"'],
		open: [
			`I'm writing a small script to add our build machines' keys to Cairn, and POST /keys always answers 400, "the body must be a JSON object". As far as I can tell I am sending JSON.`,
			`Our provisioning script gets a 400 from the keys endpoint. The same token works fine for GET /keys.`
		],
		openArt: arts.keyScript400,
		noteArt: ['API log for these requests:', apiLog('POST', '/keys', '400', 'python-requests/2.31.0')],
		quick: [`Does the API send JSON for errors too?`, `Yes, always: an object with an "error" message.`],
		reply: `That error comes before Cairn looks at the key: the request isn't arriving as a JSON object. Could you paste the part of the script that sends the request, without the token?`,
		need: 'paste the part of the script that sends the request',
		turns: [
			[`Here it is.`, `There it is: data= makes requests send a form, title=...&key=..., which isn't JSON. json= sends JSON with the right content type. Which version of requests do you have? json= needs 2.4.2 or later.`, arts.pyForm],
			[`2.31.`, `Then json= will work. Here's the line as it should be.`, undefined, arts.pyJson],
			[`And if a key is already there?`, `Then Cairn answers 409, "this key is already in use", and the script can carry on to the next machine.`],
			[`Do I need to set a Content-Type header as well?`, `json= sets Content-Type: application/json for you. If you build the body yourself with json.dumps, set the header by hand.`]
		],
		need2: 'tell me which version of requests you have',
		fixed: [`json= did it: 201, and the key is there. Thanks!`, `Switched to json= and the script added all {n2} keys.`],
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'auth-scheme',
		weight: 1,
		subjects: ['401 with a fresh token', 'API says sign in first', 'Authorization header problem'],
		open: [
			`Our deploy tool gets 401 "sign in first" from every API call, although the token works when I use it with curl myself.`,
			`Every call from deploybot to the API answers 401. I've checked the token three times and it's current.`
		],
		noteArt: ['API log for these requests:', apiLog('GET', '/projects', '401', 'deploybot/3.2')],
		quick: [`Does the API mind a trailing slash on paths?`, `No, /keys and /keys/ are the same.`],
		reply: `Could you turn on the tool's request logging and paste what it sends? Please replace all but the first few characters of the token with x.`,
		need: "paste the tool's request log",
		turns: [
			[`Here's the log.`, `Thanks. The tool sends "Authorization: Token tok_...", and Cairn expects "Authorization: Bearer" followed by the token. That's why curl works for you. Is the header built by the tool or by your own code?`, arts.toolLog],
			[`By the tool. It has a setting called "auth scheme".`, `Then set the scheme to Bearer and leave the token as it is.`],
			[`Would the API take the token as a query parameter instead?`, `No, only in the Authorization header, which keeps it out of logs.`]
		],
		need2: 'tell me whether the header is built by the tool or by your code',
		fixed: [`Changed the scheme to Bearer and deploybot is happy. Thanks!`, `That was it. All calls answer 200 now.`],
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'empty-204',
		weight: 1,
		subjects: ['Script crashes after deleting a key', 'DELETE /keys returns nothing?', 'JSON error from the API'],
		open: [
			`Our key rotation script deletes the old key and then crashes with "Unexpected end of JSON input". The key does get deleted. Is the API sending broken JSON?`,
			`DELETE /keys/:id seems to return an empty body, which breaks our client. Is that a bug?`
		],
		openArt: arts.trace204,
		noteArt: ['API log for these requests:', apiLog('DELETE', '/keys/key_{id}', '204', 'node')],
		quick: [`Is there a sandbox copy of the API to test scripts against?`, `Not a shared one; most people run cairn-api locally with its seed data.`],
		reply: `It's on purpose: a successful DELETE answers 204 No Content, which has no body at all. Could you paste the bit of the script that handles the response?`,
		need: 'paste the code that handles the response',
		turns: [
			[`Here's the function.`, `Thanks. It calls res.json() on every response, and a 204 has nothing to parse. Check the status first: if it's 204, there's nothing to read. Do any other calls in the script make the same assumption?`, arts.jsDelete],
			[`Only that one. So an error still has a body?`, `Yes: every error answers JSON with an "error" field, so you can show the message. Only the 204 is empty.`],
			[`Do any other endpoints answer 204?`, `Only the deletes. Everything else answers with a JSON body.`]
		],
		need2: 'check the other calls in the script',
		fixed: [`Checked for 204 first and the script runs end to end now.`, `Fixed, thanks. I'd assumed every answer had JSON.`],
		outcomes: ['sorted', 'waiting']
	},
	{
		id: 'notify',
		weight: 1,
		subjects: ['Notifications on push', 'Webhooks?', 'Tell our channel when main changes'],
		open: [
			`Could Cairn post in #{channel} when someone pushes to main on {proj}? We had that on {oldHost} through a hook.`,
			`Does Cairn have webhooks? I'd like a message in our team channel whenever someone pushes to {proj}.`
		],
		quick: [`Can I get an email when someone pushes to my project?`, `Not from Cairn today.`],
		reply: `Not yet: there are no webhooks in Cairn today. What would you want to happen, and on which events?`,
		need: 'tell me what should happen and on which events',
		turns: [
			[`A message in #{channel} for every push to main, with the commits.`, `Thanks. Do you have CI on {proj}? A pipeline step on main can post the message with the channel's incoming webhook, which gets you much the same thing.`],
			[`We do have CI.`, `Then the step needs the channel's webhook address as a secret and a curl at the end of the main pipeline. It only fires when CI runs, which for you is every push.`]
		],
		need2: 'tell me whether {proj} has CI',
		fixed: [`Thanks.`],
		workaround: {
			offer: `Here's the step another team uses; it lists the commit subjects as well.`,
			art: arts.ciStep,
			accept: [`That's exactly what we had before. Added it, and the first message came through.`, `Great, that'll do us. Thanks.`],
			decline: `CI only runs on some branches for us, and we want tags as well. A real webhook would be much better.`
		},
		change: {
			what: 'webhooks for push and tag events',
			tell: `Then it's webhooks, which need new work in cairn-api to store them and in the git service to send them. I've added them to the list for the next release with your use as an example.`,
			ok: [`Thanks, we'll wait for those.`, `Great, please let me know when they land.`]
		},
		outcomes: ['workaround', 'change', 'waiting']
	},
	{
		id: 'code-search',
		weight: 1,
		subjects: ['Search across all projects', 'Code search', 'Finding where a library is used'],
		open: [
			`Is there a way to search the code of every project in Cairn? I need to find everything that still uses {lib} before it's switched off.`,
			`On {oldHost} we had a code search page. Is there one in Cairn that I just can't find?`
		],
		quick: [`Can I download a project as a zip?`, `Not from the web app yet; git archive does it from a clone.`],
		reply: `There isn't one in Cairn today. How many projects do you need to search, and is it a one-off?`,
		need: 'tell me how many projects need searching',
		turns: [
			[`A one-off, but across the whole organisation: {nproj} projects.`, `Then the quickest is to clone them all and search locally. GET /projects gives every project's slug, and a loop of shallow clones does the rest. Shall I send you a script?`],
			[`Yes please.`, `Here it is. It needs your session token in CAIRN_TOKEN and clones into the current folder; then rg "{lib}" . finds every use.`, undefined, arts.cloneAll],
			[`How long will cloning them all take?`, `Shallow clones are quick, seconds for most projects. The whole organisation should take a few minutes from the office.`]
		],
		need2: 'tell me whether you want the clone script',
		fixed: [`Ran it over lunch and found {n2} places still using it. Exactly what I needed.`, `Worked a treat. The list is with the team now.`],
		team: {
			at: 1,
			pre: `I'd rather not clone {nproj} projects, honestly. Isn't something like this planned for the web app?`,
			name: 'the web tools team',
			handover: `{first} is asking for code search across projects in the web app, as {oldHost} had. Could you consider it?`,
			tell: `A search page would be the web tools team's, so I've passed the request to them.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'questionnaire',
		weight: 1,
		subjects: ['Where is our code stored?', 'Backup questions for {client}', 'Security questionnaire'],
		open: [
			`{client} sent us a security questionnaire, and a few questions are about our code host: where the data lives, how often it's backed up, and how long backups are kept. Can you help me answer them?`,
			`For the {client} renewal I need to say where Cairn keeps our repositories and what happens if a disk dies.`
		],
		quick: [`Is Cairn's API documented anywhere?`, `The README of cairn-api lists every endpoint.`],
		reply: `Happy to help. Could you paste the exact questions? They tend to be worded in ways that need exact answers.`,
		need: 'paste the exact questions',
		turns: [
			[`Here they are.`, `Thanks. The short answers: Cairn runs on our own servers in the Bristol data centre; repositories are backed up every night to the Leeds office, and backups are kept for 35 days. Question 7 asks about encryption: do they want details, or a yes?`, arts.questions],
			[`Details, I think.`, `Disks are encrypted at rest, and backups are encrypted before they leave the building. Pushes and clones go over SSH, and the web app over HTTPS.`],
			[`They also ask who can get at the backups.`, `Only the platform team, and every restore is logged. You can say access is limited to the team that runs the service.`]
		],
		need2: 'tell me how much detail they want on encryption',
		fixed: [`That covers everything. Sent it back to {client} this afternoon.`, `Perfect, thank you. The questionnaire is done.`],
		team: {
			at: 1,
			pre: `They also want our latest penetration test report and a signed statement, which feels above my pay grade.`,
			name: 'the security team',
			handover: `{first} is answering {client}'s security questionnaire; they also want the penetration test report and a signed statement. Could you provide those?`,
			tell: `The report and the statement are the security team's to give, so I've passed that part to them.`
		},
		outcomes: ['sorted', 'team', 'waiting']
	},
	{
		id: 'line-endings',
		weight: 1,
		subjects: ['Every file shows as changed', 'Line endings', 'Diffs show the whole file'],
		open: [
			`When I clone {proj} on Windows, git says every file is modified before I've touched anything. Is something wrong with the repository on Cairn?`,
			`My commits to {proj} show the whole file changed for a one-line edit. The reviewers are not amused.`
		],
		openArt: arts.crlfStatus,
		quick: [`Does Cairn care which editor I use?`, `Not at all.`],
		reply: `That's almost always line endings rather than Cairn. Could you paste the output of git config --get core.autocrlf and tell me which OS you're on?`,
		need: 'send the output of git config --get core.autocrlf',
		turns: [
			[`It says false. Windows 11.`, `Thanks. Then your editor is probably saving files with Windows line endings, CRLF, and git commits them as they are. Does the repository have a .gitattributes file?`],
			[`No .gitattributes.`, `Then the fix that works for everyone is a .gitattributes containing "* text=auto", committed to the repository, followed once by git add --renormalize . so git stores LF and gives each system what it expects.`],
			[`Will --renormalize rewrite the history?`, `No, it makes one new commit that fixes the stored line endings. Earlier commits stay as they are.`]
		],
		need2: 'check whether the repository has a .gitattributes file',
		fixed: [`Added .gitattributes, renormalised, and the diffs are one line again.`, `Sorted. The reviewers are happy.`],
		outcomes: ['sorted', 'waiting']
	}
];

// ---------------------------------------------------------------------------------------------------------
// The words around the matters.
const windowsOnly = new Set(['putty-format', 'line-endings']);
const vagueSubjects = ['Cairn question', 'Help please', 'Quick question', 'Problem with Cairn', 'Two things', 'Git trouble', 'Can someone help?', 'Stuck', 'A couple of Cairn things'];
const backstories = [
	`Hope you're well.`,
	`Sorry to bother you, I know it's a busy week.`,
	`I've asked around in {team} first, and nobody knew.`,
	`I've had a look through the platform wiki first.`,
	`{colleague} suggested I write to you.`,
	`I'm fairly new to Cairn, so apologies if this is in a guide somewhere.`,
	`We have a release on {day}, so I'd love to get this sorted before then.`
];
const custAcks = ['Thanks for the quick reply.', 'Thanks!', 'Cheers.', 'Ah, OK.', 'Right, that makes sense.', 'Thanks, that helps.', 'Interesting.'];
const quickLeads = ['Unrelated, but ', 'Also, while I have you: ', 'Oh, and one more small thing: ', 'Separate question: '];
const sideLeadsEarly = [
	`I'll come back to you on that. In the meantime, something else:`,
	`Let me get back to you on that. Meanwhile, a different question:`,
	`I'll find out and reply properly. While I do, one more thing:`,
	`Give me a day on that one. Before I forget, another thing:`
];
const sideLeadsLater = [`Another thing while I'm here.`, `Next question, if that's all right:`, `Something else has come up as well.`, `While we're at it:`];
const holdings = [`Thanks. I'll need to look at our logs for that; back to you shortly.`, `Thanks, give me a little while to check on our side.`, `Got it. I'll look into it this afternoon.`];
const later = [
	`Thanks, I'll do that this evening.`,
	`I'm out at a client until Thursday; I'll do it when I'm back.`,
	`Will do as soon as I'm back at my desk.`,
	`Makes sense. I'll get to it first thing tomorrow.`
];
const nudges1 = [
	`Just checking in on this one. When you have a moment, could you {need}? I'll keep the request open until then.`,
	`A gentle nudge on this. If you can {need}, I'll take it from there.`,
	`Are you still stuck? If so, please {need} and I'll have another look.`
];
const nudges2 = [
	`I haven't heard back, so I'll leave this open for another week. Reply here whenever you're ready, and if it has sorted itself out in the meantime, a quick note would be great.`,
	`One last nudge from me: once you {need}, I can carry on. The request stays open.`,
	`Still here whenever you're ready. There's nothing more I can do on this until you {need}.`
];
const closings = [`Great, glad it's working. I'll close this.`, `Good to hear. Closing this one.`, `Thanks for letting me know, and shout if it comes back.`, `Excellent. I'll mark this done.`];
const thanksLines = [`Thanks for passing it on.`, `OK, thanks. I'll wait to hear from them.`, `Thanks for the help so far.`, `Appreciated, thanks.`];
const mateAcks = [`{mateFirst} here. I've picked this up and will be in touch {when}.`, `Thanks, we have it, and I'll get back to you {when}.`, `This is with me now. I'll update you {when}.`];
const whens = ['by the end of the week', 'tomorrow', 'early next week', 'once I have looked at it properly', 'by Thursday'];
const notes = [
	`Checked the account: nothing unusual, keys and sign-ins as expected.`,
	`Similar to request {ref} a few weeks ago.`,
	`Asked in the platform channel whether anyone else has seen this today. Nobody has.`,
	`Nothing on the status page or in the alerts for that time.`,
	`Linking {ref}, from the same team.`,
	`Will pick this up properly after stand-up.`,
	`Logs for this account show nothing out of the ordinary.`,
	`{agent2} has seen this before and will look over my answer.`
];
const agentIntros = [`Thanks for the detail, that helps.`, `Thanks for writing in.`, `Thanks for getting in touch.`];
const channelLabels: Record<string, string> = {
	email: 'by email to cairn-help@saltmarsh.example.com',
	form: 'through the help form in the web app',
	chat: 'in the help chat'
};
const newNames = ['Ledger Sync', 'Rate Cards', 'Map Proxy', 'Event Bus', 'Tile Cache', 'Price Feed', 'Search Index', 'Audit Log', 'Release Notes', 'Feature Flags', 'Image Resizer', 'Quota Service'];
const machineSlugs: Record<string, string[]> = {
	'MacBook Pro': ['mbp', 'macbook', 'MBP-2024'],
	'MacBook Air': ['air', 'macbook-air'],
	ThinkPad: ['thinkpad', 'tp-x1'],
	'Dell XPS': ['xps', 'xps13'],
	'Windows laptop': ['DESKTOP-7QK2LM', 'LAPTOP-R4N8', 'SM-WIN-0412']
};

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand, day: number): Topic => {
	for (;;) {
		let roll = r() * totalWeight;
		for (const topic of topics) {
			roll -= topic.weight;
			if (roll < 0) {
				if ((topic.after && day < topic.after) || (topic.before && day > topic.before)) break;
				return topic;
			}
		}
	}
};

interface Item {
	who: 'c' | 'a' | 'note' | 'mate' | 'cc';
	paras: string[];
	art?: () => string;
	wait?: 'long';
}

const requestNumber = (index: number) => 4100 + index * 3 + Math.floor(mulberry32(0x9e11 + index)() * 3);

const request = (index: number) => {
	const r = mulberry32(0x0ca1e700 + index * 104729);
	const openDay = workDays[Math.floor((index * workDays.length) / ITEMS)]!;
	const main = weighted(r, openDay);
	const wanted = pick(r, ['sorted', 'sorted', 'sorted', 'workaround', 'workaround', 'change', 'change', 'team', 'team', 'team', 'waiting', 'waiting'] as Outcome[]);
	const outcome = main.outcomes.includes(wanted) ? wanted : pick(r, main.outcomes);
	const channel = pick(r, ['email', 'email', 'email', 'form', 'form', 'chat']);

	// Who and where.
	const isFerrow = chance(r, 0.27);
	const org = isFerrow ? ferrow : saltmarsh;
	const team = pick(r, Object.keys(org.teams));
	const [proj, projName] = pick(r, org.teams[team]!);
	const [proj2, projName2] = pick(r, Object.values(org.teams).flat().filter(([slug]) => slug !== proj));
	const first = pick(r, org.first);
	const last = pick(r, org.last);
	const colleague = pick(r, org.first.filter((name) => name !== first));
	const colleagueLast = pick(r, org.last);
	const m = windowsOnly.has(main.id) ? machines[4]! : pick(r, machines);
	const office = pick(r, org.offices);
	const agentIndex = int(r, 0, 9) < 8 ? int(r, 0, 3) : 4;
	const agent = platform[agentIndex]!;
	const agent2 = platform[(agentIndex + int(r, 1, 4)) % platform.length]!;
	const openMs = openDay + int(r, 7 * 60 + 40, 19 * 60) * MIN;
	const accountStart = Math.max(org.since, Date.UTC(2025, 10, 10)) + int(r, 0, Math.max(1, Math.floor((openDay - org.since) / DAY) - 20)) * DAY;
	const keyCount = int(r, 1, 4);
	const titles = [...keyTitles].sort(() => 0).filter((_, i) => (i + index) % 3 !== 0);
	const accountKeys = Array.from({ length: keyCount }, (_, i) => ({
		title: titles[(index + i * 5) % titles.length]!,
		type: i === 0 ? 'ssh-ed25519' : pick(r, ['ssh-ed25519', 'ssh-ed25519', 'ssh-rsa', 'ecdsa-sha2-nistp256']),
		fp: fp(r),
		added: accountStart + int(r, 0, Math.max(1, Math.floor((openDay - accountStart) / DAY) - 1)) * DAY
	}));
	const mainKey = accountKeys[0]!;
	let left = openDay - int(r, 3, 12) * DAY;
	while (utc(left).getUTCDay() % 6 === 0) left -= DAY;
	const others = org.first.filter((name) => name !== first && name !== colleague);
	const leaver = pick(r, others);
	const starter = pick(r, others.filter((name) => name !== leaver));
	const starterLast = pick(r, org.last);
	const newName = pick(r, newNames);
	const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	const oldName = pick(r, [newName.toLowerCase(), newName.replace(/ /g, '_'), newName.replace(/ /g, '-'), newName.toUpperCase()]);
	const oldFirst = pick(r, org.first.filter((name) => name !== first && name !== colleague));
	const ref = String(4100 + int(r, 0, Math.max(1, index * 3 - 10)));
	const wrongStyle = int(r, 0, 3);
	const wrongFor = (slug: string, name: string) => [`${org.name.replace(' ', '')}/${name.replace(/ /g, '-')}`, slug, `${org.slug}/${slug.replace(/-/g, '_')}`, `${org.slug}/${name.replace(/ /g, '')}`][wrongStyle]!;
	const s: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email: `${first.toLowerCase()}.${last.toLowerCase()}@${org.domain}`,
		u: first.toLowerCase(),
		team,
		org: org.name,
		orgSlug: org.slug,
		isFerrow: isFerrow ? '1' : '0',
		proj,
		projName,
		proj2,
		projName2,
		colleague,
		colleagueFull: `${colleague} ${colleagueLast}`,
		colleagueEmail: `${colleague.toLowerCase()}.${colleagueLast.toLowerCase()}@${org.domain}`,
		machine: m.machine,
		machineSlug: pick(r, machineSlugs[m.machine]!),
		home: m.home,
		win: m.windows ? '1' : '0',
		sshv: m.ssh,
		os: m.os,
		gitv: m.git,
		keyTitle: mainKey.title,
		fp: mainKey.fp,
		keyfile: m.windows ? 'id_ed25519' : pick(r, ['id_ed25519', 'id_ed25519_cairn', 'cairn_ed25519']),
		agent: agent[0],
		agent2: agent2[0],
		office,
		place: main.id === 'port-22' && outcome === 'team' ? `the ${office} office` : pick(r, places),
		itdesk: org.itdesk,
		netteam: org.netteam,
		oldHost: org.oldHost,
		oldUrl: org.oldUrl(proj),
		client: pick(r, org.clients),
		browser: pick(r, browsers),
		extension: pick(r, extensions),
		channel: pick(r, channels),
		lib: pick(r, libs),
		readme: pick(r, readmeNames),
		dataset: pick(r, datasets),
		file: pick(r, bigFiles),
		branch: pick(r, ['feature/fixtures', `${first.toLowerCase()}/test-data`, 'add-samples', 'main']),
		pushMain: '0',
		mb: String(int(r, 104, 640)),
		gb: String(int(r, 2, 9)),
		mins: String(int(r, 34, 90)),
		kbs: String(int(r, 180, 480)),
		mbs: String(int(r, 18, 60)),
		sha1: hex(r, 7),
		sha2: hex(r, 7),
		sha7: hex(r, 7),
		time: `${pad(int(r, 8, 11))}:${pad(int(r, 0, 59))}`,
		wrong: wrongFor(proj, projName),
		word: projName2.split(' ')[0]!.toLowerCase(),
		newName,
		slug,
		oldName,
		oldFirst,
		oldPerson: `${oldFirst} ${pick(r, org.last)}`,
		oldMonth: pick(r, ['March', 'April', 'May', 'June']),
		pastDay: WDL[utc(openDay - int(r, 2, 6) * DAY).getUTCDay()]!,
		leftDay: `${WDL[utc(left).getUTCDay()]} ${dayMonth(left)}`,
		leaver,
		leaverFull: `${leaver} ${pick(r, org.last)}`,
		starter,
		starterFull: `${starter} ${starterLast}`,
		starterEmail: `${starter.toLowerCase()}.${starterLast.toLowerCase()}@${org.domain}`,
		leftMs: String(left),
		day: pick(r, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
		n1: String(int(r, 7, 11)),
		n2: String(int(r, 2, 5)),
		nacc: String(int(r, 3, 14)),
		line: String(int(r, 4, 80)),
		people: String(int(r, 6, 24)),
		nproj: String(isFerrow ? int(r, 25, 60) : int(r, 70, 160)),
		branches: String(int(r, 4, 40)),
		ref,
		openMs: String(openMs),
		need: '',
		mateFirst: '',
		when: pick(r, whens)
	};
	const fillWith = (slots: Slots, text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = slots[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	const fill = (text: string) => fillWith(s, text);
	// Smaller matters are about the person's other project.
	const s2: Slots = { ...s, proj: proj2, projName: projName2, proj2: proj, projName2: projName, oldUrl: org.oldUrl(proj2), wrong: wrongFor(proj2, projName2), word: projName.split(' ')[0]!.toLowerCase() };
	let cur = s;

	// Other matters: a quick question, and up to three smaller matters discussed in full.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) =>
		!used.has(topic) && topic.outcomes.includes('sorted') && !(windowsOnly.has(topic.id) && !m.windows) && !(topic.after && openDay < topic.after) && !(topic.before && openDay > topic.before);
	const take = (ok: (topic: Topic) => boolean) => {
		const topic = pick(r, topics.filter(ok));
		used.add(topic);
		return topic;
	};
	const quick = chance(r, 0.6) ? take((topic) => !used.has(topic)) : undefined;
	const sideCount = outcome === 'waiting' ? pick(r, [0, 1, 2, 2, 3]) : pick(r, [1, 2, 2, 3, 3, 3]);
	const parting = chance(r, 0.4) ? take((topic) => !used.has(topic)) : undefined;
	const sides = Array.from({ length: sideCount }, () => take(sideOk));

	// The conversation, as a list of messages.
	const items: Item[] = [];
	let carry: string[] = [];
	const c = (paras: string[], art?: () => string) => {
		items.push({ who: 'c', paras: [...carry, ...paras.map((para) => (isPasted(para) ? para : fillWith(cur, para)))], art });
		carry = [];
	};
	/** Output pasted in the middle of a message, made now. */
	const pasted = (art?: Art) => (art ? [art(r, cur)] : []);
	const a = (paras: string[], art?: () => string, wait?: 'long') => items.push({ who: 'a', paras: paras.map((para) => (isPasted(para) ? para : fillWith(cur, para))), art, wait });
	const artOf = (art?: Art) => {
		const slots = cur;
		return art ? () => art(r, slots) : undefined;
	};
	const turn = (pair: Turn, extra?: [string, string]) => {
		const ack = !carry.length && chance(r, 0.3) ? [fillWith(cur, pick(r, custAcks))] : [];
		c([...ack, fillWith(cur, pair[0]), ...pasted(pair[2]), ...(extra ? [`${pick(r, quickLeads)}${lowerFirst(extra[0])}`] : [])]);
		a([fillWith(cur, pair[1]), ...pasted(pair[3]), ...(extra ? [`And on your other question: ${extra[1]}`] : [])]);
	};
	const runSides = () =>
		sides.forEach((topic, position) => {
			cur = s2;
			c([pick(r, position === 0 ? sideLeadsEarly : sideLeadsLater), pick(r, topic.open), ...(chance(r, 0.5) ? pasted(topic.openArt) : [])]);
			a([topic.reply]);
			topic.turns.forEach((pair) => turn(pair));
			carry = [fillWith(s2, pick(r, topic.fixed)), ...(chance(r, 0.6) ? pasted(topic.fixedArt) : [])];
			cur = s;
		});

	const machineLine = pick(r, [`I'm on a {machine} ({os}), in case that matters.`, `This is on my {machine}, {os}.`, `For what it's worth: {machine}, {os}, git {gitv}.`]);
	const opening = [...(chance(r, 0.45) ? [pick(r, backstories)] : []), pick(r, main.open), ...(chance(r, 0.65) ? pasted(main.openArt) : []), ...(channel !== 'form' && chance(r, 0.3) ? [machineLine] : [])];
	let quickUsed = !quick;
	if (quick && chance(r, 0.4)) {
		quickUsed = true;
		if (chance(r, 0.5)) {
			c([`Two things, if I may. First, a quick one: ${lowerFirst(quick.quick[0])}`, `The bigger one:`, ...opening]);
			a([`On the quick one: ${quick.quick[1]}`, `On the bigger one: ${main.reply}`]);
		} else {
			c([quick.quick[0]]);
			a([quick.quick[1]]);
			c([pick(r, [`Thanks! While I have you, the real reason I got in touch:`, `Great, thanks. The other thing, and really why I wrote:`, `Perfect. Now the thing that's actually bothering me.`]), ...opening]);
			a([main.reply]);
		}
	} else {
		c(opening);
		a([...(channel !== 'chat' && chance(r, 0.35) ? [pick(r, agentIntros)] : []), main.reply]);
	}
	let lastMainAsk = items.length - 1;
	if (main.shared && chance(r, 0.35))
		items.push({ who: 'cc', paras: [pick(r, [`Adding myself here: I see exactly the same since {pastDay}.`, `Same for me, for what it's worth. Following this one.`, `I've got this too, on a different machine. Happy to test anything.`])] });
	if (main.noteArt && chance(r, 0.6)) items.push({ who: 'note', paras: [main.noteArt[0], main.noteArt[1](r, s)] });
	else if (chance(r, 0.35)) items.push({ who: 'note', paras: [pick(r, notes)] });

	const switchAgent = chance(r, 0.15);
	const stopAt = outcome === 'waiting' ? pick(r, [0, 1, 1]) : outcome === 'sorted' ? main.turns.length : outcome === 'workaround' ? (main.workaround!.at ?? 2) : outcome === 'change' ? (main.change!.at ?? 2) : (main.team!.at ?? 1);
	const sidesEarly = stopAt < 2 || chance(r, 0.45);
	const quickLater = !quickUsed && chance(r, 0.7) ? quick!.quick : undefined;
	if (sidesEarly) runSides();
	for (let i = 0; i < stopAt; i++) {
		if (i === 1 && switchAgent) items.push({ who: 'note', paras: [`Taking this over from ${agent[0]}, who is ${pick(r, ['away until next week', 'on leave for the rest of the week', 'on the Postgres move this week', 'off sick'])}.`] });
		const pair = main.turns[i]!;
		if (i === 1 && chance(r, 0.25)) {
			c([pair[0], ...pasted(pair[2])]);
			a([pick(r, holdings)]);
			a([pair[1], ...pasted(pair[3])], undefined, 'long');
		} else turn(pair, i === 0 ? quickLater : undefined);
		lastMainAsk = items.length - 1;
		if (i === 0 && !sidesEarly) runSides();
	}
	if (stopAt === 0 && quickLater) {
		c([quickLater[0]]);
		a([quickLater[1], main.reply.split('. ').slice(-1)[0]!]);
		lastMainAsk = items.length - 1;
	}

	// How the main matter ends. A smaller matter's last word, still waiting to be said, goes first.
	const flush = () => {
		if (carry.length) c([]);
	};
	const partingWords = parting ? [`${pick(r, ['One last thing before you close this: ', 'While I think of it: ', 'Last question, promise: '])}${lowerFirst(parting.quick[0])}`] : [];
	if (outcome === 'sorted') {
		items.push({ who: 'c', paras: [...carry, fill(pick(r, main.fixed)), ...pasted(main.fixedArt), ...partingWords.map(fill)] });
		carry = [];
		const after = [...(parting ? [parting.quick[1]] : []), ...(chance(r, 0.5) ? [pick(r, closings)] : [])];
		if (after.length) a(after);
	} else if (outcome === 'workaround') {
		const w = main.workaround!;
		if (w.pre) c([w.pre]);
		else flush();
		a([w.offer, ...pasted(w.art)]);
		c([pick(r, w.accept), ...partingWords]);
		const after = [...(parting ? [parting.quick[1]] : []), ...(chance(r, 0.4) ? [pick(r, closings)] : [])];
		if (after.length) a(after);
	} else if (outcome === 'change') {
		const ch = main.change!;
		const w = main.workaround;
		if (w?.decline && !ch.pre && chance(r, 0.6)) {
			flush();
			a([w.offer, ...pasted(w.art)]);
			c([w.decline]);
		} else if (ch.pre) c([ch.pre]);
		else flush();
		a([ch.tell]);
		if (chance(r, 0.6)) items.push({ who: 'note', paras: [`Added to the cairn-api list for the next release: ${ch.what}. Asked for by {first} ({team}).`] });
		if (chance(r, 0.6)) c([pick(r, ch.ok)]);
	} else if (outcome === 'team') {
		const t = main.team!;
		const teamName = fill(t.name);
		s.mateFirst = teamPeople[teamName]!.split(' ')[0]!;
		if (t.pre) c([t.pre]);
		else flush();
		items.push({ who: 'note', paras: [`Passing to ${teamName}: ${t.handover}`] });
		a([t.tell]);
		if (chance(r, 0.4)) c([pick(r, thanksLines)]);
		if (chance(r, 0.45)) items.push({ who: 'mate', paras: [pick(r, mateAcks)], wait: 'long' });
	} else {
		s.need = fill(stopAt === 0 ? main.need : main.need2);
		// When smaller matters came after the last question about the main one, the team asks it again.
		if (carry.length || items.slice(lastMainAsk + 1).some((item) => item.who === 'c' || item.who === 'a')) {
			flush();
			a([pick(r, [`Glad that's sorted. Back to where we started: could you {need}?`, `Good. On your first question, I'm still waiting for one thing: could you {need}?`, `That's that one done. For the original problem, could you {need} when you get a chance?`])]);
		}
		if (/^(run|paste|send|try|check|create|clear|ask)\b/.test(s.need) && chance(r, 0.4)) c([pick(r, later)]);
		a([pick(r, nudges1)], undefined, 'long');
		if (chance(r, 0.55)) a([pick(r, nudges2)], undefined, 'long');
	}

	// Times. People write at any hour from 07:00; the platform team answers on weekdays, 08:30 to 18:00. Late
	// requests get shorter gaps, so that every conversation ends before the export.
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x7135 + index * 7907);
		let now = openMs;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale));
		const workHours = () => {
			for (;;) {
				const d = utc(now);
				const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
				if (d.getUTCDay() % 6 === 0 || minutes >= 18 * 60) now = midnight(now) + DAY + 8 * HOUR + int(rt, 30, 90) * MIN;
				else if (minutes < 8 * 60 + 30) now = midnight(now) + 8 * HOUR + int(rt, 30, 90) * MIN;
				else break;
			}
		};
		return items.map((item, position) => {
			if (position > 0) {
				if (item.wait === 'long') now += gap(2 * 24 * 60, 4 * 24 * 60) * MIN;
				if (item.who === 'c' || item.who === 'cc') {
					now += gap(8, 1300) * MIN;
					if (utc(now).getUTCHours() < 7) now += 7 * HOUR;
				} else if (item.who === 'note') now += int(rt, 2, 30) * MIN;
				else {
					now += gap(10, 300) * MIN;
					workHours();
				}
			}
			return now;
		});
	};
	let times = schedule(1);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.08, 0.04]) if (times.at(-1)! >= EXPORT - 8 * HOUR) times = schedule(scale);

	// The first messages of a chat are whole exchanges that end with the platform team.
	let chatUntil = 0;
	if (channel === 'chat') {
		chatUntil = Math.min(items.length, 2 + 2 * int(r, 1, 3));
		while (chatUntil > 0 && (items[chatUntil - 1]!.who !== 'a' || items.slice(0, chatUntil).some((item) => item.who !== 'a' && item.who !== 'c'))) chatUntil--;
	}

	// The file.
	const number = requestNumber(index);
	const out: string[] = [];
	const subject = quick && quickUsed && chance(r, 0.3) ? pick(r, vagueSubjects) : chance(r, 0.18) ? pick(r, vagueSubjects) : pick(r, main.subjects);
	out.push(`# Request ${number}: ${fill(subject)}`, '');
	const head: string[][] = [
		['From', `${s.full} <${s.email}>`],
		['Organisation', `${org.name}, ${team}`],
		['Came in', `${stamp(times[0]!)}, ${channelLabels[channel]}`]
	];
	if (channel === 'form' || chance(r, 0.35)) head.push(['Machine', `${m.machine}, ${m.os}`]);
	out.push(table(['', ''], head), '');
	const yearOf = (ms: number) => (ms < Date.UTC(2026, 0, 1) ? `${dayMonth(ms)} 2025` : dayMonth(ms));
	/** A time in working hours on the last weekday at or before `ms`, and before the request came in. */
	const workBefore = (ms: number) => {
		let day = midnight(ms);
		for (;;) {
			while (utc(day).getUTCDay() % 6 === 0) day -= DAY;
			const at = day + int(r, 8 * 60 + 15, 18 * 60) * MIN;
			if (at < openMs) return at;
			day -= DAY;
		}
	};
	if (chance(r, 0.85)) {
		const signInGap = main.id === 'sign-in-loop' ? 7 * DAY : 0;
		const lastSignIn = workBefore(openMs - (main.id === 'sign-in-loop' ? int(r, 7, 9) : 0) * DAY - int(r, 1, 30) * HOUR);
		const events: [number, string, string][] = [];
		let at = openMs - int(r, 12, 16) * DAY;
		for (let i = 0; i < 12; i++) {
			at = midnight(at + int(r, 18, 60) * HOUR);
			while (utc(at).getUTCDay() % 6 === 0) at += DAY;
			at += int(r, 8 * 60 + 15, 18 * 60) * MIN;
			if (at >= openMs) break;
			if (at < openMs - int(r, 10, 30) * HOUR - signInGap) {
				const key = pick(r, accountKeys);
				const roll = r();
				if (roll < 0.28) {
					if (at < lastSignIn) events.push([at, 'Sign-in', `web app, ${s.browser}`]);
				} else if (roll < 0.66) events.push([at, 'Push', `${org.slug}/${pick(r, [proj, proj, proj2])}, ${pick(r, ['1 branch', '1 branch', '2 branches', '1 tag', '3 branches'])}, key "${key.title}"`]);
				else events.push([at, 'Fetch', `${org.slug}/${pick(r, [proj, proj2, proj2])}, key "${key.title}"`]);
			}
		}
		if (events.length && lastSignIn > events[0]![0]) events.push([lastSignIn, 'Sign-in', `web app, ${s.browser}`]);
		const rows = events.sort((x, y) => x[0] - y[0]).map(([when, what, details]) => [stamp(when), what, details]);
		out.push(
			'### Cairn account, from the people tool',
			'',
			table(['', ''], [['On Cairn since', yearOf(accountStart)], ['Last signed in', stamp(lastSignIn)], ['Projects started', String(int(r, 0, 6))], ['SSH keys', String(keyCount)]]),
			'',
			table(['Key title', 'Type', 'Fingerprint', 'Added'], [...accountKeys].sort((x, y) => x.added - y.added).map((key) => [key.title, key.type, key.fp, yearOf(key.added)])),
			''
		);
		if (rows.length) out.push('Recent activity, from the git service and sign-on logs:', '', table(['When', 'What', 'Details'], rows), '');
	}
	if (accountStart < FIRST_DAY - 30 * DAY && chance(r, 0.35)) {
		const earlier: string[][] = [];
		let number = 4099 - int(r, 0, 40);
		let at = FIRST_DAY - int(r, 2, 12) * DAY;
		for (let i = int(r, 1, 4); i > 0 && at > accountStart; i--) {
			earlier.push([String(number), yearOf(at), fill(pick(r, pick(r, topics).subjects))]);
			number -= int(r, 20, 160);
			at -= int(r, 10, 50) * DAY;
		}
		if (earlier.length) out.push(`### Earlier requests from ${first}`, '', table(['Request', 'Came in', 'Subject'], earlier), '');
	}
	out.push('## Messages', '');
	const agentAt = (position: number) => (switchAgent && items.slice(0, position + 1).some((item) => item.who === 'note' && item.paras[0]!.startsWith('Taking this over')) ? agent2 : agent);
	if (chatUntil > 0) {
		const lines: string[] = [];
		items.slice(0, chatUntil).forEach((item, position) => {
			const who = item.who === 'c' ? first : agent[0];
			const at = clock(times[0]! + (position * 3 + int(r, 0, 2)) * MIN);
			if (position === 1) lines.push(`**${at} ${agent[0]}:** ${pick(r, [`Hi ${first}, ${agent[0]} from the platform team here.`, `Hello ${first}, thanks for waiting.`, `Hi ${first}!`])}`);
			item.paras.forEach((para) => lines.push(isPasted(para) ? para : `**${at} ${who}:** ${para}`));
			if (item.art) lines.push(item.art());
		});
		if (chatUntil < items.length) lines.push(`**${clock(times[0]! + (chatUntil * 3 + 2) * MIN)} ${agent[0]}:** ${pick(r, [`I'll carry on by email from here, as this will take a while.`, `I have to step away, but I'll follow up on this request by email.`, `Let's continue on the request itself; you'll get the replies by email.`])}`);
		out.push(`### Chat with ${agent[0]} ${agent[1]} · ${stamp(times[0]!)}`, '', lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 10) * MIN;
		for (let position = chatUntil; position < times.length; position++) if (times[position]! < shift) times[position] = shift + position * MIN;
	}
	let previousTeam = '';
	let teamSpoke = chatUntil > 0;
	items.slice(chatUntil).forEach((item, offset) => {
		const position = chatUntil + offset;
		const at = times[position]!;
		const body: string[] = [];
		const responder = agentAt(position);
		if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(at)}`, '');
			if (position === 0 && channel === 'form') {
				body.push(`**Subject:** ${fill(subject)}`, `**What's going on?**`, ...item.paras);
				if (item.art) body.push(item.art());
				body.push(`**How much is it holding you up?** ${pick(r, ['Not urgent', 'A bit: I can work around it today', 'Blocking me', 'Blocking the team'])}`);
			} else {
				const greeting = fill(pick(r, position === 0 ? ['Hi,', 'Hello,', 'Hi platform team,', 'Hi all,', 'Morning,', ''] : [`Hi ${responder[0]},`, `${responder[0]},`, '', '', 'Hi again,']));
				if (greeting) body.push(greeting);
				const quoted = previousTeam.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 50);
				if (quoted && chance(r, 0.2)) body.push(`> ${quoted}`);
				body.push(...item.paras);
				if (item.art) body.push(item.art());
				const signoff = fill(pick(r, position === 0 ? ['Thanks,\n{first}', 'Cheers,\n{first}', '{first}', 'Thanks in advance,\n{full}\n{team}, {org}', 'Many thanks,\n{first}'] : ['{first}', 'Thanks,\n{first}', 'Cheers', '', '']));
				if (signoff) body.push(signoff);
			}
		} else if (item.who === 'a') {
			out.push(`### ${responder[0]} ${responder[1]} (platform team) · ${stamp(at)}`, '');
			const greeting = !teamSpoke ? pick(r, [`Hi ${first},`, `Hello ${first},`]) : pick(r, [`Hi ${first},`, `${first},`, `Hi again ${first},`, '']);
			if (greeting) body.push(greeting);
			body.push(...item.paras);
			if (item.art) body.push(item.art());
			body.push(pick(r, [responder[0], `${responder[0]}\nPlatform team`, `Thanks,\n${responder[0]}`, `Cheers,\n${responder[0]}`]));
			previousTeam = [...item.paras].filter((para) => !isPasted(para)).sort((x, y) => y.length - x.length)[0] ?? '';
			teamSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note from ${responder[0]} · ${stamp(at)}`, '');
			body.push(...item.paras.map((para) => (isPasted(para) ? para : fill(para))));
			if (item.art) body.push(item.art());
		} else if (item.who === 'cc') {
			out.push(`### ${s.colleagueFull} (copied in) · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill));
		} else {
			const teamName = fill(main.team!.name);
			out.push(`### ${teamPeople[teamName]} (${teamName.replace(/^the /, '')}) · ${stamp(at)}`, '');
			body.push(`Hi ${first},`, ...item.paras.map(fill), teamPeople[teamName]!.split(' ')[0]!);
		}
		out.push(body.join('\n\n'), '');
	});
	const final = times.at(-1)!;
	if (final >= EXPORT) throw new Error(`request ${number} runs past the export: ${stamp(final)}`);
	return { name: `${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' };
};

const folder = join(root, 'docs', 'help-requests');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = request(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Help requests\n\nThe ${ITEMS} requests that the platform team's Cairn help queue took between 3 August and 13 November 2026, one\nfile each, as the queue exported them on 19 November. Requests come in by email to cairn-help@saltmarsh.example.com,\nthrough the help form in the web app, or in the help chat. Each file holds the request's details, the requester's\naccount as the people tool showed it when they asked, and every message since, chats and internal notes included. The\nexport does not keep the queue's labels or states.\n`
);
