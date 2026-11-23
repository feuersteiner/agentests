// Writes the long material of this entry's long task: the DNS tickets that Pellmoor support escalated to the
// edge DNS team, one Markdown file each, under docs/tickets/, with a short README. Deterministic: fixed seeds,
// no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The number of tickets. The topic mix, the ticket numbers and the dates all follow from it.
const ITEMS = 342;

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
const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64 = (r: Rand, length: number) => Array.from({ length }, () => B64[int(r, 0, 63)]).join('');

// Dates. Day 0 is 1 September 2026; the helpdesk export was taken on 19 November, so nothing happens after day 78.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FIRST_OPEN = 0;
const LAST_OPEN = 73;
const LAST_DAY = 78;
const day = (offset: number) => new Date(Date.UTC(2026, 8, 1 + offset));
const longDate = (offset: number) => `${day(offset).getUTCDate()} ${MONTHS[day(offset).getUTCMonth()]}`;
const isoDate = (offset: number) => day(offset).toISOString().slice(0, 10);
const weekday = (offset: number) => WEEKDAYS[day(offset).getUTCDay()]!;
const stampOf = (offset: number, minute: number) =>
	`${day(offset).getUTCDate()} ${MONTHS[day(offset).getUTCMonth()]!.slice(0, 3)} 2026, ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;

type S = Record<string, string>;
const fill = (text: string, s: S): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		if (!(key in s)) throw new Error(`unknown slot {${key}} in: ${text.slice(0, 80)}`);
		return s[key]!;
	});
const fence = (lines: string[]) => '```text\n' + lines.join('\n') + '\n```';

// People at Pellmoor.
const agents = ['Hanna Vogel', 'Kwame Asante', 'Lucía Ferreira', 'Tom Abernethy', 'Saoirse Quinn', 'Ruben Smit', 'Mei Lin Tan', 'Dorota Mazur'];
const engineers = ['Priya Raman', 'Mateusz Wójcik', 'Inês Duarte', 'Oluwaseun Bello', 'Jakob Lindgren'];
const resolverPlatform = ['Gregor Lindahl', 'Farah Haddad'];
const network = ['Ayesha Siddiqui', 'Bram Verhoeven'];

// Customers.
const firstNames = ['Lena', 'Marcus', 'Aisha', 'Pieter', 'Chloé', 'Rafael', 'Ingrid', 'Tomasz', 'Nadia', 'Oscar', 'Yuki', 'Fergus', 'Leila', 'Henrik', 'Beatriz', 'Dmitri', 'Sinéad', 'Amir', 'Klara', 'Jonah', 'Zofia', 'Mateo', 'Freya', 'Kofi', 'Elif', 'Gareth', 'Noor', 'Anders', 'Paola', 'Ruairí'];
const surnames = ['Hoffmann', 'Okonkwo', 'Bergström', 'Rossi', 'Dubois', 'Kowalczyk', 'Nakamura', 'Fitzgerald', 'Haddad', 'van Dijk', 'Moreau', 'Jensen', 'Ferreira', 'Novak', 'MacLeod', 'Schäfer', 'Petrov', 'Lindqvist', 'Ozturk', 'García', 'Byrne', 'Adeyemi', 'Kovacs', 'Larsen', 'Brennan', 'Silva', 'Wright', 'Horvath', 'Lambert', 'Eriksen'];
const companyHeads = ['Coldwater', 'Brightline', 'Harrowgate', 'Northfold', 'Tidewell', 'Ashgrove', 'Fernlea', 'Quillon', 'Marlowe', 'Oakridge', 'Saltmarsh', 'Kinross', 'Valemont', 'Juniper', 'Copperleaf', 'Redfern', 'Halcyon', 'Westmere', 'Larchmont', 'Pemberton', 'Glenmore', 'Riverbend', 'Stonechat', 'Wrenfield'];
const companyTails = ['Analytics', 'Labs', 'Studio', 'Logistics', 'Health', 'Software', 'Media', 'Travel', 'Robotics', 'Finance', 'Games', 'Commerce', 'Data', 'Print', 'Security', 'Learning'];
const plans = ['Starter', 'Standard', 'Standard', 'Business', 'Business', 'Dedicated'];
const roles = ['app', 'web', 'api', 'worker', 'db', 'ci', 'batch', 'edge', 'jobs'];
const subs = ['app', 'api', 'shop', 'portal', 'hooks', 'status', 'admin', 'dash', 'files', 'id'];
const shorts = ['billing', 'search', 'users', 'orders', 'reports', 'inventory', 'auth', 'notify', 'pricing', 'catalog'];
const nodes: [string, string][] = [['ams', 'Amsterdam'], ['fra', 'Frankfurt'], ['lon', 'London'], ['par', 'Paris'], ['waw', 'Warsaw'], ['mad', 'Madrid'], ['dub', 'Dublin'], ['sto', 'Stockholm']];
const registrars = ['Nameforge', 'Registrum', 'Domainvault', 'Porthole Names', 'Netcastle'];
const dnsHosts = ['Zonehaus', 'Kestrel DNS', 'NameHarbor', 'Cloudmere', 'Quadrant DNS', 'Tidepool DNS'];
const oldClouds = ['Stratocloud', 'Nimbuscore', 'Altitude Compute'];
const monitors: [string, string][] = [['Watchkeeper', '4.2'], ['Pulsegate', '7.0'], ['Nightowl', '3.11']];
const webPlatforms = ['Sitebarn', 'Pagewharf', 'Hostfolio'];
const cdns: [string, string][] = [['Globecache', 'globecache.example'], ['Edgefold', 'edgefold.example'], ['Relaybox', 'relaybox.example']];
const vendors = [
	{ name: 'Payquill', domain: 'payquill.example', sub: 'api', purpose: 'card payments' },
	{ name: 'Parcelbay', domain: 'parcelbay.example', sub: 'api', purpose: 'shipping labels' },
	{ name: 'Ledgerkite', domain: 'ledgerkite.example', sub: 'sync', purpose: 'the accounting sync' },
	{ name: 'Textwren', domain: 'textwren.example', sub: 'gateway', purpose: 'SMS notifications' },
	{ name: 'Idvane', domain: 'idvane.example', sub: 'verify', purpose: 'identity checks' },
	{ name: 'Postlark', domain: 'postlark.example', sub: 'send', purpose: 'transactional email' },
	{ name: 'Taxhollow', domain: 'taxhollow.example', sub: 'calc', purpose: 'VAT calculation' },
	{ name: 'Stockfern', domain: 'stockfern.example', sub: 'feeds', purpose: 'stock levels from our suppliers' },
	{ name: 'Mapquarry', domain: 'mapquarry.example', sub: 'geo', purpose: 'geocoding addresses' },
	{ name: 'Inkseal', domain: 'inkseal.example', sub: 'api', purpose: 'e-signatures' }
];
const badNames = ['cdn-telemetry-sync.example', 'invoice-docs-portal.example', 'update-check-service.example', 'secure-login-verify.example', 'paste-mirror-files.example'];
const bigDomains = ['larkspur-retail.example', 'oxbow-insurance.example', 'pennant-group.example', 'highmoor-council.example'];
const proxies = ['proxy.office.internal', 'squid.hq.lan', 'webproxy.corp.internal'];
const noise = ['archive.ubuntu.com', 'security.ubuntu.com', 'api.github.com', 'registry.npmjs.org', 'pypi.org', 'files.pythonhosted.org', 'objects.githubusercontent.com', 'registry-1.docker.io', 'auth.docker.io', 'deb.debian.org', 'production.cloudflare.docker.com', 'esm.ubuntu.com', 'motd.ubuntu.com', 'changelogs.ubuntu.com'];
const digVersions = ['9.18.30-0ubuntu0.24.04.2-Ubuntu', '9.18.30-0ubuntu0.22.04.2-Ubuntu', '9.18.33-1~deb12u2-Debian', '9.18.28-0ubuntu0.24.04.1-Ubuntu'];
const stacks = ['node', 'python', 'java', 'go', 'php', 'ruby'];

const ip198 = (r: Rand) => `198.18.${int(r, 1, 254)}.${int(r, 2, 250)}`;

const slotsFor = (r: Rand, opened: number, role?: string): S => {
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const head = pick(r, companyHeads);
	const tail = pick(r, companyTails);
	const slug = head.toLowerCase() + pick(r, ['', '', `-${tail.toLowerCase()}`, 'hq', '-group']);
	const domain = `${slug}.example`;
	const short = head.toLowerCase().slice(0, 4);
	const [nodeCode, city] = pick(r, nodes);
	const roleA = role ?? pick(r, roles);
	const roleB = pick(r, roles.filter((role) => role !== roleA));
	const vendor = pick(r, vendors);
	const [cdnName, cdnDomain] = pick(r, cdns);
	const engineer = pick(r, engineers);
	const agent = pick(r, agents);
	const rp = pick(r, resolverPlatform);
	const net = pick(r, network);
	const oldp = pick(r, dnsHosts);
	const newp = pick(r, dnsHosts.filter((name) => name !== oldp));
	const webp = pick(r, webPlatforms);
	const [mon, ver] = pick(r, monitors);
	const hour = int(r, 8, 17);
	const third = int(r, 1, 254);
	return {
		first,
		last,
		full: `${first} ${last}`,
		company: `${head} ${tail}`,
		acct: String(int(r, 30000, 59999)),
		plan: pick(r, plans),
		domain,
		host: `${pick(r, subs)}.${domain}`,
		short: pick(r, shorts),
		wild: ip198(r),
		vm: `${short}-${roleA}-${pad(int(r, 1, 9))}`,
		vm2: `${short}-${roleB}-${pad(int(r, 1, 9))}`,
		ip: `10.20.${third}.${int(r, 2, 120)}`,
		ip2: `10.20.${third}.${int(r, 121, 250)}`,
		node: `edge-${nodeCode}-${pad(int(r, 1, 14))}`,
		city,
		agent,
		agentFirst: agent.split(' ')[0]!,
		eng: engineer,
		engFirst: engineer.split(' ')[0]!,
		rp,
		rpFirst: rp.split(' ')[0]!,
		net,
		netFirst: net.split(' ')[0]!,
		reg: pick(r, registrars),
		oldp,
		oldpd: `${oldp.split(' ')[0]!.toLowerCase()}.example`,
		newp,
		newpd: `${newp.split(' ')[0]!.toLowerCase()}.example`,
		vname: vendor.name,
		vendor: vendor.domain,
		vhost: `${vendor.sub}.${vendor.domain}`,
		valt: `${vendor.sub}-eu.${vendor.domain}`,
		vcdn: `${vendor.name.toLowerCase()}-${vendor.sub}.${hex(r, 4)}.${cdnDomain}`,
		cdnd: cdnDomain,
		cdnname: cdnName,
		purpose: vendor.purpose,
		webp,
		webhost: `${slug}.${webp.toLowerCase()}.example`,
		site: ip198(r),
		oldip: ip198(r),
		oldip2: ip198(r),
		nsip: ip198(r),
		nsip2: ip198(r),
		pubip: ip198(r),
		k1: String(int(r, 1000, 65535)),
		k2: String(int(r, 1000, 65535)),
		k3: String(int(r, 1000, 65535)),
		n: String(int(r, 2, 5)),
		n2: String(int(r, 30, 80)),
		hh: pad(hour),
		mm: pad(int(r, 0, 59)),
		hh2: pad(hour + int(r, 2, 5)),
		mm2: pad(int(r, 0, 59)),
		d0: longDate(Math.max(0, opened - int(r, 1, 3))),
		d1: longDate(Math.max(0, opened - int(r, 2, 9))),
		d2: longDate(opened),
		d3: longDate(Math.max(0, opened - int(r, 3, 8))),
		weekday: weekday(opened + int(r, 2, 5)),
		oldcloud: pick(r, oldClouds),
		mon,
		ver,
		v6gw: `2001:db8:20:${hex(r, 2)}::1`,
		bad: pick(r, badNames),
		newsub: pick(r, ['release', 'preview', 'canary', 'staging', 'pr-' + int(r, 100, 999)]),
		bigdom: pick(r, bigDomains),
		rbl: 'zen.mailshield.example',
		rblname: 'Mailshield',
		colleague: `${pick(r, firstNames)} ${pick(r, surnames)}`,
		admin: `${pick(r, firstNames)} ${pick(r, surnames)}`,
		proxy: pick(r, proxies),
		digv: pick(r, digVersions),
		stack: pick(r, stacks),
		later: pick(r, ['tonight', 'in the morning', 'after lunch', 'later today', 'tomorrow']),
		today: isoDate(opened)
	};
};

// ---------------------------------------------------------------------------------------------------------------
// Pasted output.

const rr = (name: string, ttl: number, type: string, data: string) => `${name}.\t\t${ttl}\tIN\t${type}\t${data}`;
interface Dig {
	args: string;
	q: string;
	type?: string;
	status?: string;
	flags?: string;
	answer?: string[];
	authority?: string[];
	additional?: string[];
	ede?: string;
	edns?: boolean;
}
const digFull = (r: Rand, s: S, o: Dig): string => {
	const flags = o.flags ?? 'qr rd ra';
	const answer = o.answer ?? [];
	const authority = o.authority ?? [];
	const additional = o.additional ?? [];
	const edns = o.edns ?? true;
	const lines = [
		`$ dig ${o.args}`,
		'',
		`; <<>> DiG ${s.digv} <<>> ${o.args}`,
		';; global options: +cmd',
		';; Got answer:',
		`;; ->>HEADER<<- opcode: QUERY, status: ${o.status ?? 'NOERROR'}, id: ${int(r, 1024, 65535)}`,
		`;; flags: ${flags}; QUERY: 1, ANSWER: ${answer.length}, AUTHORITY: ${authority.length}, ADDITIONAL: ${additional.length + (edns ? 1 : 0)}`
	];
	if (!flags.includes('ra') && !o.args.includes('+norec')) lines.push(';; WARNING: recursion requested but not available');
	if (edns) {
		lines.push('', ';; OPT PSEUDOSECTION:', '; EDNS: version: 0, flags:; udp: 1232');
		if (o.ede) lines.push(`; EDE: ${o.ede}`);
	}
	lines.push(';; QUESTION SECTION:', `;${o.q}.\t\t\tIN\t${o.type ?? 'A'}`);
	if (answer.length) lines.push('', ';; ANSWER SECTION:', ...answer);
	if (authority.length) lines.push('', ';; AUTHORITY SECTION:', ...authority);
	if (additional.length) lines.push('', ';; ADDITIONAL SECTION:', ...additional);
	return fence(lines);
};
const soaOf = (r: Rand, zone: string, ns: string, mbox: string) =>
	rr(zone, int(r, 300, 3600), 'SOA', `${ns}. ${mbox}. 2026${pad(int(r, 6, 11))}${pad(int(r, 1, 28))}${pad(int(r, 1, 9))} 7200 3600 1209600 3600`);

const queryLog = (r: Rand, s: S, offset: number, rows: [string, string, string][], client = s.ip): string => {
	let second = int(r, 6 * 3600, 20 * 3600);
	const lines = rows.map(([name, type, rcode]) => {
		second += int(r, 1, 240);
		return `{"ts": "${isoDate(offset)}T${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}.${pad(int(r, 0, 999), 3)}+00:00", "client": "${client}", "name": "${name.toLowerCase()}.", "type": "${type}", "upstream": "192.0.2.53:53", "rcode": "${rcode}"}`;
	});
	const command = pick(r, [
		`grep -F '"client": "${client}"' /var/log/edge-resolver/queries.jsonl | tail -n ${rows.length}`,
		`grep -F '"${client}"' /var/log/edge-resolver/queries.jsonl | tail -n ${rows.length}`,
		`zgrep -hF '"client": "${client}"' /var/log/edge-resolver/queries.jsonl.${int(r, 1, 6)}.gz | head -n ${rows.length}`
	]);
	return fence([`$ ${command}`, ...lines]);
};
const withNoise = (r: Rand, rows: [string, string, string][], count: number): [string, string, string][] => {
	const out = [...rows];
	for (let i = 0; i < count + 4; i++) {
		const at = int(r, 0, out.length);
		out.splice(at, 0, [pick(r, noise), pick(r, ['A', 'A', 'AAAA', 'A', 'TYPE65']), 'NOERROR']);
	}
	return out;
};
const repeat = (r: Rand, row: [string, string, string], low: number, high: number) =>
	Array.from({ length: int(r, low, high) }, () => [row[0], r() < 0.7 ? row[1] : 'AAAA', row[2]] as [string, string, string]);

const appLog = (r: Rand, s: S, offset: number, name: string, kind: 'nx' | 'fail', count: number, start?: number): string => {
	const path = `/v${int(r, 1, 3)}/${pick(r, ['events', 'orders', 'labels', 'charges', 'contacts', 'status', 'documents', 'lookups'])}`;
	const component = pick(r, ['sync', 'webhooks', 'checkout', 'worker', 'importer', 'notifier', 'scheduler']);
	let minute = start ?? int(r, 6 * 60, 19 * 60);
	const lines: string[] = [];
	for (let i = 0; i < count; i++) {
		minute += start === undefined ? int(r, 1, 25) : i === 0 ? 0 : 1;
		const h = pad(Math.floor(minute / 60) % 24);
		const m = pad(minute % 60);
		const sec = pad(int(r, 0, 59));
		const date = isoDate(offset);
		const [y, mo, d] = date.split('-');
		const java = kind === 'nx' ? 'Name or service not known' : 'Temporary failure in name resolution';
		lines.push(
			s.stack === 'node'
				? `${date}T${h}:${m}:${sec}.${pad(int(r, 0, 999), 3)}Z error [${component}] request to https://${name}${path} failed: getaddrinfo ${kind === 'nx' ? 'ENOTFOUND' : 'EAI_AGAIN'} ${name}`
				: s.stack === 'python'
					? `${date} ${h}:${m}:${sec},${pad(int(r, 0, 999), 3)} ERROR ${component}: Failed to resolve '${name}' ([Errno ${kind === 'nx' ? '-2] Name or service not known' : '-3] Temporary failure in name resolution'})`
					: s.stack === 'java'
						? `${date} ${h}:${m}:${sec}.${pad(int(r, 0, 999), 3)} ERROR [pool-${int(r, 1, 4)}-thread-${int(r, 1, 12)}] c.${s.domain.split('.')[0]!.replace(/-/g, '')}.client.ApiClient - Call failed: java.net.UnknownHostException: ${name}: ${java}`
						: s.stack === 'go'
							? `${y}/${mo}/${d} ${h}:${m}:${sec} ${component}: Post "https://${name}${path}": dial tcp: lookup ${name} on 10.20.0.1:53: ${kind === 'nx' ? 'no such host' : 'server misbehaving'}`
							: s.stack === 'php'
								? `[${d}-${MONTHS[Number(mo) - 1]!.slice(0, 3)}-${y} ${h}:${m}:${sec} UTC] PHP Warning:  file_get_contents(): php_network_getaddresses: getaddrinfo for ${name} failed: ${java} in /var/www/app/src/Client.php on line ${int(r, 40, 220)}`
								: `E, [${date}T${h}:${m}:${sec}.${pad(int(r, 0, 999999), 6)} #${int(r, 1000, 9999)}] ERROR -- : Faraday::ConnectionFailed: Failed to open TCP connection to ${name}:443 (getaddrinfo(3): ${java})`
		);
	}
	return fence(lines);
};
const getentFail = (s: S, name: string) => fence([`$ getent hosts ${name}; echo $?`, '2', `$ curl -sS https://${name}/`, `curl: (6) Could not resolve host: ${name}`]);
const resolvConf = (lines: string[]) => fence(['$ cat /etc/resolv.conf', ...lines]);

// ---------------------------------------------------------------------------------------------------------------
// Topics. `cause` is how the ticket's problem turned out in the end; it never appears in a file.

type Cause = 'customer' | 'domain' | 'upstream' | 'forwarder' | 'not-dns' | 'request' | 'unknown';
type Outcome = 'confirmed' | 'unconfirmed' | 'workaround' | 'owed' | 'waiting' | 'silent';
type Paste = (r: Rand, s: S, offset: number) => string;
interface Topic {
	key: string;
	role?: string;
	cause: Cause;
	weight: number;
	subjects: string[];
	open: string[];
	more: string[];
	brief: string;
	paste?: Paste;
	guess: string[];
	probe: string;
	reply: string[];
	paste2?: Paste;
	look: string[];
	evidence?: Paste;
	lead?: [string, string | null, string];
	found: string[];
	foundBy?: 'rp' | 'net';
	evidence2?: Paste;
	explain: string[];
	explainBy?: 'net';
	explainPaste?: Paste;
	did?: string;
	fix?: string;
	done?: string[];
	around?: string;
	aroundLead?: string;
	aroundOk?: string[];
	owe?: string;
	oweAfter?: boolean;
	ask?: string;
	outcomes: Outcome[];
}

const topics: Topic[] = [
	{
		key: 'ds',
		cause: 'domain',
		weight: 9,
		subjects: ['{host} fails from your network only', 'Our site resolves everywhere except on Pellmoor', 'SERVFAIL for our own domain since moving DNS'],
		open: [
			'Since we moved the DNS for {domain} from {oldp} to {newp} on {d1}, none of our VMs can resolve anything under it. {host} gives SERVFAIL. From my laptop at home and from the office it resolves fine, so the records are there.',
			'Our VMs on {node} cannot look up our own domain. Every name under {domain} answers SERVFAIL, while other domains are fine. We changed DNS provider on {d1}, {oldp} to {newp}, but the new zone is a copy of the old one and it works from everywhere else I have tried.',
			'Something is wrong between your resolver and our domain. {host}, www.{domain}, all of it: SERVFAIL from every VM. It started the day we switched our DNS hosting to {newp} ({d1}), but {newp} insist everything is right on their end, and an online checker shows the records.'
		],
		more: ['The app on {vm} calls {host} for its own webhooks, so those have stopped.', 'Our office uses the ISP\'s resolver and that gives the right answer.', '{newp} support checked the zone and say it is served correctly by their nameservers.', 'We did not change any records during the move, only where they are hosted.'],
		brief: 'SERVFAIL for every name under {domain} from {node}; resolves from the customer\'s office. Customer changed DNS provider on {d1}.',
		paste: (r, s) => digFull(r, s, { args: s.host!, q: s.host!, status: 'SERVFAIL', ede: `9 (DNSKEY Missing): (no SEP matching the DS found for ${s.domain}.)` }),
		guess: [
			'Changes of DNS provider can take a while to reach every resolver, up to 48 hours in some cases, so this may sort itself out. I will check with the team in the meantime.',
			'As other domains resolve from the same VM, our resolver itself is working. It could be that the new provider does not answer our upstream resolvers; let me find out.'
		],
		probe: 'Could you tell me when exactly the nameservers were changed at the registrar, and what `dig NS {domain}` shows from outside Pellmoor?',
		reply: ['It has been {n} days, so I doubt it is still settling. The nameservers were changed at {reg} on the morning of {d1}. Below is what my laptop gets; from {vm} it is the same SERVFAIL as before.', 'Changed at {reg} on {d1}. Here are the nameservers and the address as my laptop sees them.'],
		paste2: (r, s) => fence([`$ dig +short NS ${s.domain}`, `ns1.${s.newpd}.`, `ns2.${s.newpd}.`, `$ dig +short ${s.host}`, s.site!]),
		look: [
			'The queries arrive and go to 192.0.2.53 like everything else, and it answers SERVFAIL for every name under {domain}. The other two upstreams, asked directly from the node, say the same. All three validate DNSSEC; a resolver that does not, like the one in the customer\'s office, would get an answer, which fits what they see.',
			'Query log for {ip} below: anything under {domain} is SERVFAIL, everything else NOERROR. Same answer from all three upstreams when I ask them from the node, and the extended error says DNSKEY Missing, so this looks like a DNSSEC chain problem rather than anything on the node.'
		],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, [...repeat(r, [s.host!, 'A', 'SERVFAIL'], 2, 4), [`www.${s.domain}`, 'A', 'SERVFAIL'], [s.domain!, 'MX', 'SERVFAIL']], int(r, 3, 6))),
		lead: ['Do you know whether {newp} restrict which resolvers may query their nameservers? A few providers block large shared resolvers, and ours relay for thousands of VMs.', 'Not as far as I know, and {newp} say they block nobody.', 'Ruled out blocking: {rpFirst} on the resolver platform team queried {newp}\'s nameservers from the upstream hosts and got proper answers with the records.'],
		found: [
			'Found it. The registry still holds a DS record for {domain} with key tag {k1}, which was the signing key at {oldp}. The zone at {newp} is signed with a different key, tag {k2}, so nothing matches the DS and every validating resolver treats the whole domain as bogus.',
			'The parent still publishes DS {k1} for {domain}. The DNSKEY set at {newp} only has keys {k2} and {k3}. That is the whole story: the chain of trust ends at a DS that points to a key nobody serves any more.'
		],
		evidence2: (r, s) =>
			fence([
				`$ dig +noall +answer DS ${s.domain} @a.nic.example`,
				rr(s.domain!, 86400, 'DS', `${s.k1} 13 2 ${hex(r, 64).toUpperCase()}`),
				`$ dig +noall +answer +multi DNSKEY ${s.domain} @ns1.${s.newpd}`,
				`${s.domain}.\t\t3600 IN DNSKEY 257 3 13 (`,
				`\t\t\t\t${b64(r, 56)}`,
				`\t\t\t\t${b64(r, 30)}== ) ; KSK; alg = ECDSAP256SHA256 ; key id = ${s.k2}`,
				`${s.domain}.\t\t3600 IN DNSKEY 256 3 13 (`,
				`\t\t\t\t${b64(r, 56)}`,
				`\t\t\t\t${b64(r, 30)}== ) ; ZSK; alg = ECDSAP256SHA256 ; key id = ${s.k3}`,
				`$ delv @192.0.2.53 ${s.host} A`,
				';; resolution failed: broken trust chain'
			]),
		explain: [
			'Your registrar, {reg}, still publishes the DS record from your old provider. Validating resolvers, ours included, see that the new zone is signed with a key that does not match it and refuse to trust anything under {domain}. Resolvers that do not check signatures are not affected, which is why it works from your office. The fix is at {reg}: either remove the DS record, or replace it with the DS that {newp} shows for the new key.',
			'When you moved to {newp}, the DNSSEC record at the registrar stayed behind. It tells resolvers which key signs {domain}, and that key was {oldp}\'s. {newp} sign with their own key, so to a resolver that checks, every answer looks forged and it returns SERVFAIL. Please either delete the DS record at {reg} or replace it with the one in {newp}\'s DNSSEC settings.'
		],
		did: 'replaced the DS record at {reg} with the one from {newp}',
		done: ['I replaced the DS at {reg} with the one from {newp}. {host} resolves from {vm} now, and our app is happy again.', 'Removed the DS record this morning. Everything under {domain} works from the VMs again. Odd that nothing else complained.'],
		owe: 'clear the failed answers for {domain} from the upstream caches and confirm here',
		oweAfter: true,
		ask: 'let us know once the DS record at {reg} has been changed',
		outcomes: ['confirmed', 'confirmed', 'unconfirmed', 'owed', 'waiting']
	},
	{
		key: 'lame',
		cause: 'domain',
		weight: 6,
		subjects: ['Some lookups for {domain} fail, others work', 'Half our hostnames not resolving', 'Flaky resolution of {domain}'],
		open: [
			'Lookups for names under {domain} work some of the time and fail the rest. {host} failed for most of this morning, then worked, then failed again. We moved our DNS to {newp} {n} weeks ago and nothing looked wrong until {d1}.',
			'Our deploy pipeline on {vm} keeps failing at the step that pulls from {host}. Some runs get SERVFAIL, the next one gets an answer. Other domains behave.',
			'We see intermittent SERVFAIL for our own names ({host}, mail.{domain}) from the VMs on {node}. Trying again usually works after a while. Is one of your resolvers misbehaving?'
		],
		more: ['We have not touched the zone since the move.', 'Our office sees it now and then too, so maybe it is not only your side.', '{newp}\'s status page shows no incident.'],
		brief: 'Intermittent SERVFAIL for names under {domain} from {node}; the same name works a little later.',
		paste: (r, s) => digFull(r, s, { args: s.host!, q: s.host!, status: 'SERVFAIL', ede: `22 (No Reachable Authority): (at delegation ${s.domain}.)` }),
		guess: [
			'As it comes and goes, it sounds like one of your provider\'s nameservers is having trouble, but I will get the team to check our resolvers too.',
			'We had a short incident on {node} on {d0} that caused some SERVFAIL answers. It should be over, but it may be related. I will ask the edge DNS team to look.'
		],
		probe: 'Which nameservers should {domain} be using? And could you send `dig NS {domain}` from one of the VMs?',
		reply: ['It should be ns1 and ns2 at {newp}. Output below.', 'Two nameservers at {newp}, as below. That is what the zone says.'],
		paste2: (r, s) => fence([`$ dig +noall +answer NS ${s.domain}`, rr(s.domain!, 3600, 'NS', `ns1.${s.newpd}.`), rr(s.domain!, 3600, 'NS', `ns2.${s.newpd}.`)]),
		look: [
			'The query log for {ip} shows a mix: the same name gets NOERROR, then SERVFAIL a little later, then NOERROR again. The upstreams keep whichever answer they got last for a while, which explains the coming and going.',
			'Same names, alternating NOERROR and SERVFAIL, from all of this customer\'s VMs. Not specific to the node either: other nodes\' logs show the same pattern for {domain}.'
		],
		evidence: (r, s, offset) =>
			queryLog(r, s, offset, withNoise(r, shuffle(r, [[s.host!, 'A', 'NOERROR'], [s.host!, 'A', 'SERVFAIL'], [s.host!, 'A', 'SERVFAIL'], [s.host!, 'AAAA', 'NOERROR'], [`mail.${s.domain}`, 'A', 'SERVFAIL'], [`mail.${s.domain}`, 'A', 'NOERROR']]), int(r, 2, 5))),
		lead: ['Checking whether 192.0.2.53 is the odd one out, since every node sends to it and a bad cache there would explain the pattern.', null, 'Not the upstream: 198.51.100.53 and 203.0.113.53 give the same mix when asked directly over an hour.'],
		found: [
			'The delegation is the problem. The registry has four nameservers for {domain}: the two at {newp} and two at {oldp}, ns1.{oldpd} and ns2.{oldpd}. The old ones answer REFUSED because {oldp} no longer has the zone. A resolver that happens to ask an old one gets REFUSED, may give up, and keeps that failure for a while.',
			'The registry\'s NS set for {domain} still includes ns1.{oldpd} and ns2.{oldpd}. Both refuse queries for the zone. Half the delegation is dead, so roughly half of fresh lookups fail.'
		],
		evidence2: (r, s) =>
			[
				digFull(r, s, {
					args: `+norec NS ${s.domain} @a.nic.example`,
					q: s.domain!,
					type: 'NS',
					flags: 'qr',
					authority: [`ns1.${s.newpd}.`, `ns2.${s.newpd}.`, `ns1.${s.oldpd}.`, `ns2.${s.oldpd}.`].map((ns) => rr(s.domain!, 86400, 'NS', ns))
				}),
				digFull(r, s, { args: `${s.host} @ns1.${s.oldpd}`, q: s.host!, status: 'REFUSED', flags: 'qr rd' })
			].join('\n\n'),
		explain: [
			'Your registrar still lists the two nameservers of {oldp} next to the new ones. {oldp} no longer holds your zone and refuses to answer for it, so any resolver that asks them first fails. Your own `dig NS` shows the NS records inside the zone, which are right; resolvers start from the registry\'s list, which is not. Remove ns1.{oldpd} and ns2.{oldpd} at {reg} and the failures will stop as caches refresh.'
		],
		did: 'removed the two old nameservers at {reg}',
		done: ['Took the old nameservers off at {reg}. Not a single failure in the pipeline since.', 'Fixed at the registrar. {host} has resolved every time since yesterday.'],
		owe: 'flush {domain} from the upstream caches now that the registry is right, and confirm here',
		oweAfter: true,
		ask: 'confirm once the nameservers at {reg} are corrected',
		outcomes: ['confirmed', 'unconfirmed', 'waiting', 'owed', 'confirmed']
	},
	{
		key: 'hold',
		cause: 'domain',
		weight: 4,
		subjects: ['Our whole domain is gone from your DNS', 'NXDOMAIN for {domain} since this morning', 'Urgent: {domain} not resolving after your maintenance'],
		open: [
			'As of this morning every name under {domain} returns NXDOMAIN from our VMs. You had maintenance on {node} last night, so I assume something went wrong there. Please check urgently, our site is effectively down.',
			'Our shop at {host} stopped resolving at around {hh}:00. NXDOMAIN for the domain itself, not just one record. We have changed nothing.',
			'{domain} does not exist any more, according to your DNS. It certainly does, we have owned it for years. What happened?'
		],
		more: ['Customers are emailing us that the site is gone, so it might not only be your resolver.', 'Our DNS provider\'s panel shows all the records as normal.', 'We have not logged in to the registrar in months.'],
		brief: 'NXDOMAIN for {domain} and everything under it from {node} since this morning; customer blames last night\'s maintenance.',
		paste: (r, s) => digFull(r, s, { args: s.domain!, q: s.domain!, status: 'NXDOMAIN', authority: [soaOf(r, 'example', 'a.nic.example', 'hostmaster.nic.example')] }),
		guess: [
			'The maintenance on {node} last night was a kernel update that finished without errors, but I will ask the edge DNS team to check.',
			'NXDOMAIN usually means the name really does not exist in DNS. If your provider shows the records, it might be a problem one step higher up, at the registry. I will get the team to look.'
		],
		probe: 'Could you tell me who your registrar is, and whether anything changed with the domain\'s registration lately?',
		reply: ['{reg}. Nothing changed as far as I know; it renews automatically.', 'The registrar is {reg}. I do not think anything changed, but I am not the one who deals with it. I have asked {colleague}.'],
		look: [
			'The edge resolver just relays NXDOMAIN from 192.0.2.53. Asking the registry\'s servers directly gives NXDOMAIN too, so this is not a cache: the domain is no longer delegated at all.',
			'The node is fine. The registry\'s own servers say {domain} does not exist, so every resolver anywhere will say the same; the customer\'s colleagues outside Pellmoor will see it as soon as their caches empty.'
		],
		evidence: (r, s) => digFull(r, s, { args: `NS ${s.domain} @a.nic.example`, q: s.domain!, type: 'NS', status: 'NXDOMAIN', flags: 'qr aa rd', authority: [soaOf(r, 'example', 'a.nic.example', 'hostmaster.nic.example')] }),
		lead: ['Checking whether anything went wrong on {node} during last night\'s maintenance.', null, 'The maintenance is not it: the answer is the same from every node and from outside Pellmoor.'],
		found: ['The registry lists the domain with status clientHold, which removes it from the zone. A registrar sets that, usually when the owner\'s contact details were not confirmed or a payment failed.', 'whois shows clientHold on {domain}. That is the registrar pulling the domain out of DNS, not anything technical.'],
		evidence2: (r, s) =>
			fence([
				`$ whois ${s.domain}`,
				`Domain Name: ${s.domain!.toUpperCase()}`,
				`Registry Domain ID: D${int(r, 100000000, 999999999)}-EXAMPLE`,
				`Registrar WHOIS Server: whois.${s.reg!.split(' ')[0]!.toLowerCase()}.example`,
				`Registrar: ${s.reg}`,
				`Registrar IANA ID: ${int(r, 1000, 3999)}`,
				'Domain Status: clientHold',
				'Domain Status: clientTransferProhibited',
				`Name Server: NS1.${s.newpd!.toUpperCase()}`,
				`Name Server: NS2.${s.newpd!.toUpperCase()}`,
				'DNSSEC: unsigned'
			]),
		explain: [
			'This is not a Pellmoor problem, nor your DNS provider\'s: your registrar, {reg}, has put the domain on hold, which takes it out of DNS for the whole internet. Registrars do that when the owner\'s email address was not confirmed after a change of contact details, or when a renewal payment failed. {reg} can tell you which and lift it; resolvers will pick the domain up again soon after.'
		],
		did: 'sorted it out with {reg}',
		done: ['{reg} had sent a verification email to a colleague who has left. Confirmed it, the hold is gone and the shop resolves again.', 'It was a failed card payment at {reg}. Paid, and {domain} is back.'],
		owe: 'flush the cached NXDOMAIN for {domain} from the upstreams and confirm here',
		oweAfter: true,
		ask: 'let us know once {reg} has lifted the hold',
		outcomes: ['confirmed', 'confirmed', 'owed', 'waiting', 'unconfirmed']
	},
	{
		key: 'vendor',
		cause: 'domain',
		weight: 6,
		subjects: ['Cannot reach {vname} API from our VMs', '{vhost} lookups failing', 'Integration with {vname} broken, DNS?'],
		open: [
			'Our integration with {vname} has been failing since {d1}. The app on {vm} logs that it cannot resolve {vhost}. {vname}\'s status page is all green and their support says it must be our side.',
			'Lookups for {vhost} fail from all of our VMs on {node}. It is the API of {vname}, which we use for {purpose}, so that part of our product is down.',
			'We cannot resolve {vhost} from Pellmoor. Every other name works. Could you check whether your resolvers have a problem with {vname}?'
		],
		more: ['From a VM at another provider it resolves, sometimes.', 'We have a ticket open with {vname} too, no answer yet.', 'Nothing changed in our code or configuration.'],
		brief: 'SERVFAIL for {vhost} ({vname}, a third party) from {node}; other names fine.',
		paste: (r, s, offset) => appLog(r, s, offset, s.vhost!, 'fail', int(r, 4, 8)),
		guess: ['As it is a third-party name and everything else resolves, our resolver is probably fine; but I will get the edge DNS team to check, in case our upstreams have trouble with that provider.', 'It may be that {vname} is blocking queries from our resolvers. I will ask the team.'],
		probe: 'Could you send `dig {vhost}` from one of the VMs?',
		reply: ['Here it is.', 'Below. Same on all three VMs.'],
		paste2: (r, s) => digFull(r, s, { args: s.vhost!, q: s.vhost!, status: 'SERVFAIL', ede: '22 (No Reachable Authority)' }),
		look: [
			'Every query for {vhost} from this customer ends in SERVFAIL from 192.0.2.53. Followed the chain by hand from the node: {vhost} is a CNAME to {vcdn}, at {vname}\'s CDN, and that is where it breaks.',
			'Not just this customer: {n2} other VMs on various nodes asked for {vhost} today and all got SERVFAIL. The name is a CNAME into {cdnd}.'
		],
		evidence: (r, s) =>
			[fence([`$ dig +noall +answer ${s.vhost} @ns1.${s.vendor}`, rr(s.vhost!, 300, 'CNAME', `${s.vcdn}.`)]), digFull(r, s, { args: `${s.vcdn} @ns1.${s.cdnd}`, q: s.vcdn!, status: 'REFUSED', flags: 'qr rd' })].join('\n\n'),
		lead: ['I first suspected our upstreams, because a public resolver I tried gave an answer.', null, 'That public resolver had an old copy in its cache. A second one fails the same way as ours, so it is not us.'],
		found: [
			'The CDN\'s nameservers refuse queries for {vcdn}: the name was removed on their side, probably when {vname} changed its CDN setup, while {vname}\'s own zone still points {vhost} at it. Any resolver without an old copy fails.',
			'{vcdn} is gone from {cdnd}. {vname}\'s zone still has the CNAME to it. Broken on their side; reported to {vname} with the output above.'
		],
		explain: [
			'The fault is in {vname}\'s DNS: {vhost} points to a name at their CDN that the CDN no longer serves. Neither we nor you can fix that; {vname} has to correct the record. We have reported it to them with the output below, and it would help if you sent it to their support as well.',
			'We traced it to {vname}\'s side. Their API name is an alias for a name at their CDN, and the CDN has stopped answering for that name, so every resolver that does not happen to hold an old copy fails. We have sent {vname} the details. It may move sooner if you, as their customer, point their support at it too.'
		],
		done: ['{vname} fixed the record this afternoon after we forwarded your output. Everything works again.', 'Resolves again since about noon; {vname} admitted a change on their side went wrong.'],
		around: 'point the integration at {valt}, the second endpoint {vname} lists in their documentation, which resolves correctly',
		aroundLead: 'Until they fix it,',
		aroundOk: ['Switched to {valt} and the integration is running again. We will move back once {vname} fix their record.', 'The second endpoint works. Thanks for digging.'],
		owe: 'tell you as soon as {vname}\'s DNS team answers the report we sent them',
		outcomes: ['confirmed', 'workaround', 'owed', 'silent', 'confirmed']
	},
	{
		key: 'glue',
		role: 'ns',
		cause: 'domain',
		weight: 4,
		subjects: ['Domain stopped resolving after we moved our nameservers', 'SERVFAIL for everything on {domain}', 'Our own nameservers unreachable through your DNS?'],
		open: [
			'We run our own nameservers, ns1.{domain} and ns2.{domain}, on two Pellmoor VMs. On {d1} we moved them to new VMs with new addresses and updated the A records for ns1 and ns2 in the zone. Since then {domain} fails from the Pellmoor VMs and, we now hear, for some of our customers too.',
			'Since we replaced our two nameserver VMs on {d1}, {host} and everything else under {domain} is SERVFAIL. BIND on the new VMs answers correctly when I query it directly.'
		],
		more: ['The old nameserver VMs were deleted on {d1}.', '`dig @ns1.{domain} {host}` from the VM itself gives the right answer.', 'The zone serial was bumped and both new servers have it.'],
		brief: 'SERVFAIL for {domain}; customer runs its own nameservers and moved them to new VMs on {d1}.',
		paste: (r, s) => [digFull(r, s, { args: s.host!, q: s.host!, status: 'SERVFAIL', ede: '22 (No Reachable Authority)' }), fence([`$ dig +short ${s.host} @${s.nsip}`, s.site!])].join('\n\n'),
		guess: ['If BIND answers directly, the zone is fine. Maybe our upstreams still have the old addresses of your nameservers cached; I will ask the team to clear them.', 'That sounds as if our resolvers cannot reach the new nameservers. Is port 53 open on them for everyone, not only your own network?'],
		probe: 'Which addresses did the nameservers have before the move, and which now?',
		reply: ['Before: {oldip} and {oldip2}. Now: {nsip} and {nsip2}. Port 53 is open to the world on both.', 'Old: {oldip}, {oldip2}. New: {nsip}, {nsip2}.'],
		look: ['The upstreams keep sending their queries for {domain} to {oldip} and {oldip2}, which belonged to the deleted VMs. Nothing answers there.', 'Upstream logs show {domain} lookups going to {oldip} and {oldip2} and getting nothing back. Those are the old VMs\' addresses.'],
		lead: ['Asked the resolver platform team to clear {domain} from the upstream caches, in case they hold the old addresses.', null, 'Clearing made no difference; the upstreams went straight back to {oldip}. So the old addresses are not a stale cache, they are being handed out fresh.'],
		found: ['The glue at the registry is out of date. For nameservers named inside their own domain, a resolver cannot look up ns1.{domain} without first knowing where {domain} is, so it uses the addresses the registry publishes next to the delegation, and those are still {oldip} and {oldip2}.'],
		evidence2: (r, s) =>
			digFull(r, s, {
				args: `+norec NS ${s.domain} @a.nic.example`,
				q: s.domain!,
				type: 'NS',
				flags: 'qr',
				authority: [rr(s.domain!, 86400, 'NS', `ns1.${s.domain}.`), rr(s.domain!, 86400, 'NS', `ns2.${s.domain}.`)],
				additional: [rr(`ns1.${s.domain}`, 86400, 'A', s.oldip!), rr(`ns2.${s.domain}`, 86400, 'A', s.oldip2!)]
			}),
		explain: ['Changing the A records of ns1 and ns2 in your zone is not enough when the nameservers are named inside the domain they serve. The registry keeps its own copy of their addresses, the glue records, and resolvers use those to find your servers. Update the host records for ns1.{domain} and ns2.{domain} at {reg} to {nsip} and {nsip2}.'],
		did: 'updated the host records at {reg}',
		done: ['Updated the host records at {reg}. Resolves everywhere again, including from the VMs.', 'Glue fixed. Should have known that one. Thanks.'],
		owe: 'flush {domain} from the upstream caches once the registry shows the new glue, and confirm here',
		oweAfter: true,
		ask: 'tell us once the glue at {reg} has been updated',
		outcomes: ['confirmed', 'unconfirmed', 'waiting', 'owed', 'confirmed']
	},
	{
		key: 'apex',
		role: 'mail',
		cause: 'domain',
		weight: 4,
		subjects: ['Mail from our VM to our own domain fails', 'Notifications to our own addresses not delivered', 'MX lookup for {domain} looks wrong from your DNS'],
		open: [
			'Our app on {vm} sends notification emails to addresses at {domain}. Since {d1} they are deferred and then bounce; mail to other domains goes out fine. Postfix seems to be trying to deliver to our web host instead of our mail provider.',
			'Emails from {vm} to anyone at {domain} do not arrive. The bounce shows Postfix connecting to a server we do not recognise. Our mail provider sees nothing.'
		],
		more: ['We moved the website to {webp} on {d1}, nothing to do with mail.', 'Incoming mail from outside seems to arrive, mostly.'],
		brief: 'Mail from {vm} to the customer\'s own domain goes to the wrong host; MX for {domain} looks wrong from {node}.',
		paste: (r, s) =>
			fence([
				`This is the mail system at host ${s.vm}.${s.domain}.`,
				'',
				"I'm sorry to have to inform you that your message could not",
				'be delivered to one or more recipients. It\'s attached below.',
				'',
				`<${pick(r, ['ops', 'alerts', 'support', 'billing', 'team'])}@${s.domain}>: connect to ${s.webhost}[${s.wild}]:25:`,
				'    Connection refused'
			]),
		guess: ['Could it be that outbound port 25 is closed for your account? It is closed by default on new accounts until they are verified.', 'Our resolver does not change MX answers, but I will have the DNS team look.'],
		probe: 'Could you send `dig MX {domain}` from {vm}?',
		reply: ['Here. I expected to see our mail provider in there.', 'Output below. That is not our MX.'],
		paste2: (r, s) => digFull(r, s, { args: `MX ${s.domain}`, q: s.domain!, type: 'MX', answer: [rr(s.domain!, 300, 'CNAME', `${s.webhost}.`)], authority: [soaOf(r, `${s.webp!.toLowerCase()}.example`, `ns1.${s.webp!.toLowerCase()}.example`, `dns.${s.webp!.toLowerCase()}.example`)] }),
		look: ['Port 25 is open for this account; the bounces show connections being made and refused, so outbound mail works. The MX lookup is the odd thing: it returns a CNAME at the top of the domain, pointing at {webhost}.'],
		found: ['A name that has a CNAME may not have any other records. The resolver follows the CNAME, finds no MX at {webhost}, and Postfix then falls back to the address of {domain} itself, which is now the web host\'s.'],
		explain: [
			'Your DNS provider has let a CNAME record be created on {domain} itself, next to your MX records. DNS does not allow that combination: a resolver that sees the CNAME ignores everything else at that name. That is why mail from the VM goes to {webp}\'s servers, which refuse it. Mail from outside arrives only when the sender\'s resolver still has your MX records from before. Replace the CNAME at the apex with an ALIAS or flattened record, which {newp} offers, and the MX records will be seen again.'
		],
		did: 'replaced the apex CNAME with an ALIAS record',
		done: ['Swapped the CNAME for an ALIAS record. Notifications to our own addresses are delivered again.', 'Fixed the apex record and the deferred queue emptied within minutes.'],
		around: 'send the notifications through your mail provider\'s SMTP relay instead of delivering directly from the VM',
		aroundLead: 'If the DNS change cannot be made soon,',
		aroundOk: ['We have set Postfix to relay through our provider, which sidesteps it. The DNS change needs our agency, which will take a while.'],
		outcomes: ['confirmed', 'workaround', 'unconfirmed', 'silent']
	},
	{
		key: 'oldres',
		cause: 'customer',
		weight: 7,
		subjects: ['DNS completely broken on new VM', 'Nothing resolves on {vm}', 'Imported VM has no name resolution'],
		open: [
			'We moved {vm} to Pellmoor last week from {oldcloud}, by importing its disk image. It boots and we can reach it, but it cannot resolve any name at all. apt fails, our app fails, everything.',
			'Brand new VM, {vm}, from an image we built at {oldcloud}. No name resolution whatsoever. VMs created from your own images are fine.',
			'We are migrating from {oldcloud}. The first VM we brought over, {vm}, is up and reachable over SSH, but every lookup fails, from apt to curl. Is DNS switched off for imported images?'
		],
		more: ['Pinging 198.51.100.53 by address works, so the network is up.', 'We followed your image import guide step by step.', 'We need this VM live by {weekday}.'],
		brief: 'No name resolution at all on {vm}, imported from an {oldcloud} image.',
		paste: (r, s) => {
			const line = `;; UDP setup with 169.254.169.253#53(169.254.169.253) for ${s.host} failed: network unreachable.`;
			return fence([`$ dig ${s.host}`, line, line, line, '', `; <<>> DiG ${s.digv} <<>> ${s.host}`, ';; global options: +cmd', ';; no servers could be reached']);
		},
		guess: ['There was a short problem with the resolver on {node} on {d0}. Could you try again now?', 'It looks as if the VM cannot reach our resolver. Could you check that its network interface is up and has the default route?'],
		probe: 'Could you send the contents of /etc/resolv.conf?',
		reply: ['Still broken. resolv.conf below.', 'The network is fine, I can reach other servers by address. Here is resolv.conf.'],
		paste2: (r, s) => resolvConf([`# Generated by ${s.oldcloud} cloud-init on first boot`, 'nameserver 169.254.169.253', `search ${pick(r, ['eu-west-2', 'eu-central-1', 'fra1', 'lon1'])}.compute.internal`, 'options edns0 trust-ad']),
		look: ['The node\'s resolver has not seen a single query from {ip} since the VM started. The VM is sending its queries somewhere else.'],
		evidence: (r, s) => fence([`$ grep -cF '"client": "${s.ip}"' /var/log/edge-resolver/queries.jsonl`, '0']),
		lead: ['Checked the node first, since the customer mentioned the incident on {d0}.', null, 'The node\'s resolver is answering everyone else normally.'],
		found: ['resolv.conf still names 169.254.169.253, the internal resolver of {oldcloud}, which only exists inside their network. The image carried its old network settings with it.'],
		explain: [
			'The image still has {oldcloud}\'s network settings: resolv.conf points at their internal resolver, which only exists inside their network. On Pellmoor the resolver is 10.20.0.1. Change the nameserver in your netplan file (or wherever your image sets it) to 10.20.0.1, or let cloud-init configure the network from our metadata, and lookups will work.'
		],
		did: 'changed the nameserver to 10.20.0.1 in the netplan file',
		done: ['Changed the netplan file to 10.20.0.1 and rebooted. Everything resolves.', 'That was it. Our image build hard-codes the old address; fixed there as well.'],
		owe: 'add a note on resolver settings to the image import guide',
		outcomes: ['confirmed', 'unconfirmed', 'confirmed', 'silent', 'owed']
	},
	{
		key: 'docker',
		cause: 'customer',
		weight: 6,
		subjects: ['Containers cannot resolve names', 'DNS works on the host but not in Docker', 'Docker containers on {vm} have no DNS'],
		open: [
			'On {vm}, DNS works from the host but not from inside our Docker containers. Every container fails to resolve, even a plain alpine image. This started after we restored the VM from a backup of our old setup.',
			'Our containers cannot look up anything, while the host itself resolves fine. The same images work on our laptops. Is the Docker network blocked from reaching your resolver?',
			'Since we restored {vm} from our backups, our docker compose stack is down: every service logs name resolution errors. On the host, dig works for the same names.'
		],
		more: ['Docker is the version from Docker\'s own apt repository.', 'We restored /etc from the old server to get our configuration back.', 'Restarting Docker did not help.'],
		brief: 'Containers on {vm} cannot resolve; the host can.',
		paste: (r, s) => fence([`$ docker run --rm alpine getent hosts ${s.host}; echo $?`, '2', `$ getent hosts ${s.host}`, `${s.site}    ${s.host}`]),
		guess: ['Docker passes the host\'s resolver settings to containers by default, so if the host resolves, the containers should too. Could a firewall rule be blocking traffic from the Docker bridge?', 'It may be the Docker bridge network clashing with our private range. Which subnet does docker0 use?'],
		probe: 'Could you run `docker run --rm alpine cat /etc/resolv.conf` and send /etc/docker/daemon.json if there is one?',
		reply: ['Results below. daemon.json came back with the old /etc.', 'Here you go.'],
		paste2: (r, s) =>
			fence(['$ docker run --rm alpine cat /etc/resolv.conf', 'nameserver 10.0.0.2', 'nameserver 10.0.0.3', '$ cat /etc/docker/daemon.json', '{', '  "dns": ["10.0.0.2", "10.0.0.3"],', '  "log-driver": "json-file",', `  "log-opts": { "max-size": "${pick(r, ['10m', '50m', '100m'])}", "max-file": "${int(r, 3, 5)}" },`, '  "live-restore": true', '}']),
		look: ['Only the host\'s own lookups from {ip} reach the node\'s resolver; nothing arrives when a container tries.'],
		lead: ['Checked whether the Docker bridge (172.17.0.0/16) overlaps anything on the node.', null, 'No overlap, and the host\'s NAT for the bridge works: containers reach the internet by address.'],
		found: ['daemon.json sets the containers\' DNS servers to 10.0.0.2 and 10.0.0.3. Those do not exist here; they look like the resolvers of the old network. Docker writes them into every container\'s resolv.conf in place of the host\'s settings.'],
		explain: ['Remove the dns entry from /etc/docker/daemon.json, or set it to 10.20.0.1, and restart Docker. Containers will then use the host\'s settings. The restored /etc brought the old network\'s resolver addresses with it, and Docker hands those to every container.'],
		did: 'removed the dns line from daemon.json and restarted Docker',
		done: ['Removed the dns line, restarted Docker, containers resolve. Thanks!', 'That was it. I had forgotten that file existed.'],
		outcomes: ['confirmed', 'unconfirmed', 'silent', 'confirmed']
	},
	{
		key: 'coredns',
		role: 'k8s',
		cause: 'customer',
		weight: 8,
		subjects: ['DNS failing inside our Kubernetes cluster', 'Pods cannot resolve external names', 'CoreDNS keeps crashing, your resolver?'],
		open: [
			'We run a small Kubernetes cluster on three VMs ({vm}, {vm2} and one more). Since we rebuilt the VMs on Ubuntu 24.04 last week, pods cannot resolve external names and CoreDNS keeps restarting. We think your resolver is sending back something CoreDNS does not like.',
			'CoreDNS in our cluster on {node} goes into CrashLoopBackOff a few minutes after it starts. Pods lose DNS. The nodes themselves resolve fine. Did something change in your resolver?',
			'Since the rebuild of our Kubernetes nodes ({vm}, {vm2} and a third) on {d1}, nothing inside the cluster can resolve names. kubectl works, the nodes resolve, the pods do not. The CoreDNS pods restart every few minutes.'
		],
		more: ['We kept the kubelet configuration from the old nodes.', 'The cluster ran for a year on Ubuntu 20.04 without trouble.', 'Internal service names do not resolve either while CoreDNS is down.'],
		brief: 'CoreDNS in the customer\'s Kubernetes cluster on {vm}/{vm2} crash-loops; pods have no DNS.',
		paste: (r) =>
			fence([
				'$ kubectl -n kube-system logs deploy/coredns',
				'.:53',
				'[INFO] plugin/reload: Running configuration SHA512 = ' + hex(r, 64),
				'CoreDNS-1.11.3',
				'linux/amd64, go1.21.11, a6338e9',
				`[FATAL] plugin/loop: Loop (127.0.0.1:${int(r, 32000, 60999)} -> :53) detected for zone ".", see https://coredns.io/plugins/loop#troubleshooting. Query: "HINFO ${int(r, 1e8, 9e8)}${int(r, 1e8, 9e8)}.${int(r, 1e8, 9e8)}${int(r, 1e8, 9e8)}."`
			]),
		guess: ['Our resolver only relays answers from Pellmoor\'s upstream resolvers, so it is unlikely to confuse CoreDNS, but I will ask the team.', 'Could the pods be blocked from reaching 10.20.0.1? Some network policies block traffic to the node network.'],
		probe: 'Could you send your Corefile and /etc/resolv.conf from one of the nodes?',
		reply: ['Corefile and resolv.conf below.', 'Here. The Corefile is the default one.'],
		paste2: () =>
			fence([
				'$ kubectl -n kube-system get configmap coredns -o jsonpath=\'{.data.Corefile}\'',
				'.:53 {',
				'    errors',
				'    health {',
				'       lameduck 5s',
				'    }',
				'    ready',
				'    kubernetes cluster.local in-addr.arpa ip6.arpa {',
				'       pods insecure',
				'       fallthrough in-addr.arpa ip6.arpa',
				'    }',
				'    prometheus :9153',
				'    forward . /etc/resolv.conf',
				'    cache 30',
				'    loop',
				'    reload',
				'    loadbalance',
				'}',
				'$ cat /etc/resolv.conf',
				'# This is /run/systemd/resolve/stub-resolv.conf managed by man:systemd-resolved(8).',
				'nameserver 127.0.0.53',
				'options edns0 trust-ad',
				'search .'
			]),
		look: ['Since {d1}, the node\'s resolver sees the hosts\' own lookups from {ip} and {ip2}, but almost nothing that looks like pod traffic.'],
		lead: ['Looked for a network policy in the customer\'s description that could block pods from 10.20.0.1.', null, 'None; and the log message in the first paste is the real clue.'],
		found: ['This is the loop CoreDNS detects. Its forward line uses /etc/resolv.conf, and on 24.04 that file names 127.0.0.53, the local systemd-resolved stub. Inside the CoreDNS pod, 127.0.0.53 is CoreDNS\'s own loopback, so it forwards queries to itself, notices, and stops.'],
		explain: [
			'The kubelet hands CoreDNS the node\'s /etc/resolv.conf, which on Ubuntu 24.04 points at 127.0.0.53, the local resolver stub. From inside the pod that address loops back to CoreDNS itself, and CoreDNS shuts down on purpose when it detects the loop. Set `resolvConf: /run/systemd/resolve/resolv.conf` in the kubelet configuration (that file lists the real resolver, 10.20.0.1) and restart the kubelet and CoreDNS. Your old kubelet configuration comes from before systemd-resolved ran on the nodes, which is why it worked there.'
		],
		did: 'changed resolvConf in the kubelet configuration',
		done: ['Changed resolvConf on all three nodes and restarted. CoreDNS has been up since and pods resolve.', 'Fixed, thank you. The loop message makes sense now.'],
		around: 'put `forward . 10.20.0.1` in the Corefile instead of /etc/resolv.conf',
		aroundLead: 'If changing the kubelet needs a maintenance window, a quicker way is to',
		aroundOk: ['We put forward . 10.20.0.1 in the Corefile for now; changing the kubelet configuration needs a maintenance window.'],
		outcomes: ['confirmed', 'workaround', 'unconfirmed', 'confirmed']
	},
	{
		key: 'hosts',
		cause: 'customer',
		weight: 8,
		subjects: ['Wrong IP returned for {host}', 'Your DNS gives one VM the old address of our database', 'Stale answer for {host} on {vm}'],
		open: [
			'We moved our database to a new VM and changed {host} to point at {site}. All our VMs picked up the new address except {vm}, which still connects to the old one at {oldip}. Your resolver must have kept the old record for that VM.',
			'{vm} keeps going to {oldip} for {host}, though the record has said {site} for {n} days. The other VMs are fine. Can you clear whatever cache this is?',
			'Your resolver gives {vm} a wrong address for {host}. It should be {site}; {vm} connects to {oldip}, the server we retired on {d1}. Only that VM. Please check.'
		],
		more: ['We lowered the TTL to 300 before the change.', 'Restarting the app on {vm} made no difference.', 'It is the same image as the other VMs.'],
		brief: '{vm} resolves {host} to the old address {oldip}; other VMs get {site}.',
		paste: (r, s) => fence([`$ psql "host=${s.host} dbname=${pick(r, ['app', 'orders', 'main', 'prod'])} user=${pick(r, ['app', 'svc', 'deploy'])}"`, `psql: error: connection to server at "${s.host}" (${s.oldip}), port 5432 failed: Connection refused`, '\tIs the server running on that host and accepting TCP/IP connections?']),
		guess: ['The upstream resolvers keep records for as long as their TTL says. If it was long before the change, the old address may still be cached; I will ask the team to check.', 'Each VM asks our resolver on its own, so it is odd that only one VM is affected. I will ask the edge DNS team.'],
		probe: 'Could you send `dig +short {host}` and `getent hosts {host}` from {vm}?',
		reply: ['dig shows the new one! getent shows the old one. Confused.', 'Odd: the two disagree.'],
		paste2: (r, s) => fence([`$ dig +short ${s.host}`, s.site!, `$ getent hosts ${s.host}`, `${s.oldip}    ${s.host}`]),
		look: ['Query log: {vm} ({ip}) asks for {host} now and then and gets {site} every time. Nothing on our side has answered {oldip} since the change.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, repeat(r, [s.host!, 'A', 'NOERROR'], 3, 5), int(r, 2, 4))),
		lead: ['Does the VM run a local cache, such as nscd or dnsmasq, that might hold the old answer?', 'No nscd, no dnsmasq, nothing like that installed.', 'So not a local cache.'],
		found: ['dig asks the resolver directly; getent asks the system, which reads /etc/hosts first. When the two disagree, there is almost always a line for the name in /etc/hosts.'],
		explain: ['Our resolver gives {vm} the new address, as dig shows. getent, and your application, consult /etc/hosts first, and there must be a line there mapping {host} to {oldip}. Something wrote it there, maybe a migration script or your configuration management. Remove it, and make sure it is not put back on the next run.'],
		did: 'removed the line from /etc/hosts',
		done: ['There it was, put there by our Ansible role from the old setup. Removed the line and the task; {vm} connects to the new database.', 'Found it in /etc/hosts. Embarrassing. Thanks.'],
		outcomes: ['confirmed', 'confirmed', 'unconfirmed', 'silent']
	},
	{
		key: 'dot',
		cause: 'customer',
		weight: 5,
		subjects: ['Name resolution stopped after security hardening', 'DNS fails since applying our CIS baseline', 'No DNS on {vm} and {vm2} after hardening'],
		open: [
			'We applied our security baseline (a CIS hardening role) to {vm} and {vm2} yesterday, and since then neither can resolve anything. Rolling back the firewall part did not help.',
			'After our hardening run, systemd-resolved on {vm} cannot resolve anything. Hardening touched the firewall, SSH and some systemd settings. We reverted the firewall and SSH changes, still broken.'
		],
		more: ['The role is from a public collection, with our own variables.', 'Other VMs without the baseline are fine.', 'Our auditors need the baseline on every VM by the end of the month.'],
		brief: 'No resolution on {vm} and {vm2} after the customer applied a hardening baseline.',
		paste: (r, s) => fence([`$ resolvectl query ${s.host}`, `${s.host}: resolve call failed: All attempts to contact name servers or networks failed`]),
		guess: ['The hardening may have closed outbound UDP port 53. Could you check the rules for traffic to 10.20.0.1?', 'Perhaps the baseline removed the resolver address. Could you check /etc/resolv.conf?'],
		probe: 'Could you send `resolvectl status` and anything in /etc/systemd/resolved.conf.d/?',
		reply: ['Below.', 'The firewall is open for 53. Files below.'],
		paste2: (r) =>
			fence([
				'$ resolvectl status',
				'Global',
				'         Protocols: -LLMNR -mDNS +DNSOverTLS DNSSEC=allow-downgrade/supported',
				'  resolv.conf mode: stub',
				'',
				'Link 2 (eth0)',
				'    Current Scopes: DNS',
				'         Protocols: +DefaultRoute -LLMNR -mDNS +DNSOverTLS DNSSEC=allow-downgrade/supported',
				'Current DNS Server: 10.20.0.1',
				'       DNS Servers: 10.20.0.1',
				'$ cat /etc/systemd/resolved.conf.d/' + pick(r, ['60-hardening.conf', 'cis.conf', '99-baseline.conf']),
				'[Resolve]',
				'DNSOverTLS=yes',
				'DNSSEC=allow-downgrade',
				'LLMNR=no',
				'MulticastDNS=no'
			]),
		look: ['No queries from either VM since the hardening run. They are not reaching us over UDP 53 at all.'],
		lead: ['Checked whether the baseline put an nftables rule in place that the customer\'s rollback missed.', null, 'The customer\'s ruleset allows output; not the firewall.'],
		found: ['The drop-in sets DNSOverTLS=yes. In that strict mode, systemd-resolved only talks to resolvers over TLS on port 853 and never falls back. The edge resolver listens on UDP port 53 only, so every lookup fails.'],
		explain: ['Your baseline turned on DNS over TLS in strict mode. Our edge resolver does not offer DNS over TLS; it answers on UDP port 53 on the node, and that traffic never leaves the host the VM runs on. Set DNSOverTLS=no (or opportunistic) in the drop-in and restart systemd-resolved.'],
		did: 'set DNSOverTLS=no and restarted systemd-resolved',
		done: ['Set DNSOverTLS=no and both VMs resolve again.', 'Fixed with opportunistic mode. Our auditors accepted the explanation about the node.'],
		owe: 'pass your request for DNS over TLS to the product team and report back',
		around: 'set DNSOverTLS=opportunistic, so the baseline\'s check still passes while lookups use plain DNS on the node',
		aroundLead: 'If your auditors insist on the setting,',
		aroundOk: ['Opportunistic it is. The scanner is happy and so are we.'],
		outcomes: ['confirmed', 'workaround', 'owed', 'unconfirmed']
	},
	{
		key: 'search',
		cause: 'customer',
		weight: 5,
		subjects: ['Short hostnames resolve to the wrong server', 'Hostname "{short}" goes to the wrong place', 'Internal service names broken on Pellmoor'],
		open: [
			'Our services call each other by short names, like `{short}`. Since we moved to Pellmoor, {short} on {vm} resolves to {wild}, which is our web server, not the service. With the full name it works.',
			'On {vm}, `curl http://{short}:8080/health` hits our marketing site instead of the {short} service. The full name {short}.{domain} works. Is your resolver adding something to short names?'
		],
		more: ['At our old provider this worked for years.', 'Our resolv.conf is the one our image always had.'],
		brief: 'Short names on {vm} resolve to the customer\'s web server ({wild}); full names are correct.',
		paste: (r, s) => fence([`$ getent hosts ${s.short}`, `${s.wild}    ${s.short}.corp.${s.domain}`, `$ getent hosts ${s.short}.${s.domain}`, `${s.site}    ${s.short}.${s.domain}`]),
		guess: ['Our resolver only receives full names from the VM; short names are expanded on the VM itself, using the search line in /etc/resolv.conf. Could you send that file?', 'I will check whether our resolver treats short names differently.'],
		probe: 'Could you send /etc/resolv.conf from {vm}?',
		reply: ['Here it is.', 'resolv.conf below. corp.{domain} is our internal zone.'],
		paste2: (r, s) => resolvConf(['nameserver 10.20.0.1', `search corp.${s.domain} ${s.domain}`, 'options ndots:1']),
		look: ['The query log shows {vm} asking for {short}.corp.{domain} and getting NOERROR. It never goes on to ask for {short}.{domain}, because the first try succeeded.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, repeat(r, [`${s.short}.corp.${s.domain}`, 'A', 'NOERROR'], 3, 6), int(r, 1, 3))),
		found: ['The VM tries the search domains in order. {short}.corp.{domain} is asked first, and the customer\'s public zone has a wildcard, *.corp.{domain}, pointing at {wild}. So the first try succeeds with the wildcard, and {short}.{domain} is never asked.'],
		evidence2: (r, s) => fence([`$ dig +noall +answer ${s.short}.corp.${s.domain} @ns1.${s.newpd}`, rr(`${s.short}.corp.${s.domain}`, 3600, 'A', s.wild!), `$ dig +noall +answer nonexistent-${hex(r, 4)}.corp.${s.domain} @ns1.${s.newpd}`, rr(`nonexistent-${hex(r, 4)}.corp.${s.domain}`, 3600, 'A', s.wild!)]),
		explain: ['The edge resolver answers exactly what the VM asks. Because corp.{domain} is first in your search list and your zone has a wildcard under corp.{domain}, every short name matches the wildcard first. Either remove corp.{domain} from the search line on these VMs, remove the wildcard from your zone, or use full names in the service configuration.'],
		did: 'removed corp.{domain} from the search line',
		done: ['Removed the wildcard; it was left over from an old setup. Short names work again.', 'Changed the search line and everything talks to the right service now.'],
		around: 'use full names in the service configuration',
		aroundLead: 'If neither can change soon,',
		aroundOk: ['We will use full names; the wildcard has to stay for now for reasons beyond my control.'],
		outcomes: ['confirmed', 'workaround', 'silent', 'confirmed']
	},
	{
		key: 'nft',
		cause: 'customer',
		weight: 5,
		subjects: ['DNS stopped after firewall change', 'Your resolver refuses queries from {vm}?', 'Name resolution fails since we tightened nftables'],
		open: [
			'After we tightened the firewall on {vm} with nftables (drop everything outbound except what we allow), DNS stopped working. We did add a rule for port 53 to your resolver, so I think your resolver must be refusing us.',
			'{vm} cannot resolve anything since our firewall change on {d1}. The rule for DNS to 10.20.0.1 is there. Does your resolver block VMs with strict firewalls?'
		],
		more: ['Rolling the firewall back fixes it, but we need the new rules for a customer audit.', 'HTTPS and SSH work fine with the new rules.'],
		brief: 'No resolution on {vm} since the customer\'s nftables change; customer says DNS is allowed.',
		paste: (r, s) => getentFail(s, s.host!),
		guess: ['Our resolver does not refuse queries based on the client\'s firewall, but I will check the logs.', 'It may be that replies from the resolver are blocked on the way in. Could you check the input chain?'],
		probe: 'Could you send the output of `nft list ruleset`?',
		reply: ['Ruleset below.', 'Here.'],
		paste2: (r) =>
			fence([
				'$ sudo nft list ruleset',
				'table inet filter {',
				'\tchain input {',
				'\t\ttype filter hook input priority filter; policy drop;',
				'\t\tct state established,related accept',
				'\t\tiif "lo" accept',
				`\t\ttcp dport { 22, ${pick(r, ['443', '80, 443', '443, 8443'])} } accept`,
				'\t}',
				'\tchain output {',
				'\t\ttype filter hook output priority filter; policy drop;',
				'\t\tct state established,related accept',
				'\t\toif "lo" accept',
				'\t\ttcp dport { 22, 80, 443 } accept',
				'\t\ttcp dport 53 ip daddr 10.20.0.1 accept',
				'\t}',
				'}'
			]),
		look: ['Nothing from {ip} has reached the resolver since {d1}.'],
		found: ['The rule allows TCP to port 53, but DNS queries go over UDP; TCP is only used for large answers, and the edge resolver listens on UDP only anyway. So every query is dropped on the VM before it leaves.'],
		explain: ['Your rule allows TCP to port 53, but ordinary DNS queries use UDP, so they hit the output policy and are dropped on the VM. Change the rule to `udp dport 53 ip daddr 10.20.0.1 accept`. Our edge resolver only answers over UDP, so TCP to port 53 is not needed for it.'],
		did: 'changed the rule to UDP',
		done: ['UDP. Of course. Fixed, thanks.', 'Changed to udp and it works. The audit can go ahead.'],
		outcomes: ['confirmed', 'confirmed', 'unconfirmed', 'silent']
	},
	{
		key: 'proxy',
		cause: 'customer',
		weight: 4,
		subjects: ['Our app cannot resolve hosts on your network', '"Could not resolve proxy" errors', 'Outbound HTTP from {vm} fails with DNS errors'],
		open: ['Every outbound HTTP call from our app on {vm} fails with "Could not resolve proxy". It worked on our old server. Is your DNS blocking something?', 'pip and our app both fail on {vm} with name resolution errors, but `dig` works for the same names. We are stuck.'],
		more: ['The VM was built from our usual Ansible playbook.', 'apt works, which is strange.'],
		brief: 'HTTP clients on {vm} fail with resolution errors; dig for the same names works.',
		paste: (r, s) => fence([`$ curl -sS https://${s.vhost}/`, `curl: (5) Could not resolve proxy: ${s.proxy}`, `$ dig +short ${s.vhost}`, ip198(r), ip198(r)]),
		guess: ['If dig works, our resolver is answering. Is there a proxy configured on the VM?', 'Could you check whether your app has DNS settings of its own?'],
		probe: 'Could you send the output of `env | grep -i proxy` on {vm}?',
		reply: ['Oh. I did not know these were set.', 'Output below.'],
		paste2: (r, s) => fence(['$ env | grep -i proxy', `HTTPS_PROXY=http://${s.proxy}:3128`, `https_proxy=http://${s.proxy}:3128`, `http_proxy=http://${s.proxy}:3128`, 'no_proxy=localhost,127.0.0.1']),
		look: ['Query log shows {vm} asking for {proxy} and getting NXDOMAIN, many times. The names the customer is trying to reach are hardly ever asked for.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, repeat(r, [s.proxy!, 'A', 'NXDOMAIN'], 4, 7), int(r, 1, 3))),
		found: ['The VM has proxy variables pointing at {proxy}, a host in the customer\'s old office network that does not exist in public DNS. HTTP clients try to resolve the proxy first and fail; apt has its own configuration and does not use them.'],
		explain: ['Your HTTP clients are being told to go through a proxy, {proxy}, by the HTTPS_PROXY and http_proxy variables. That name only exists in your old network, so they fail before even trying the real destination. Remove the variables from /etc/environment (your playbook seems to set them) and log in again.'],
		did: 'removed the proxy variables from the playbook and /etc/environment',
		done: ['Removed them from the playbook and /etc/environment. Everything works.', 'That was a leftover from the office days. Thanks!'],
		outcomes: ['confirmed', 'confirmed', 'silent', 'unconfirmed']
	},
	{
		key: 'blocklist',
		cause: 'upstream',
		weight: 7,
		subjects: ['{vhost} does not exist according to your DNS', 'NXDOMAIN for a supplier\'s domain', 'Your resolver blocks {vendor}?'],
		open: ['Since {d1}, our VMs get NXDOMAIN for {vhost}, the API of {vname}, which we use for {purpose}. It resolves from everywhere else. {vname} confirm nothing changed on their side.', 'Lookups of anything under {vendor} fail from {node} with "no such host". {vname} is our provider for {purpose}. It works from home.',
			'{vname} ({purpose}) stopped working for us on {d1}. Our app on {vm} says {vhost} does not exist. Their status page is fine, and a colleague resolves it from the office without trouble.'],
		more: ['We noticed because the jobs that call {vname} started failing overnight.', 'Other customers of {vname} are not affected, according to them.'],
		brief: 'NXDOMAIN for {vhost} ({vname}) from {node}; resolves outside Pellmoor.',
		paste: (r, s) => digFull(r, s, { args: s.vhost!, q: s.vhost!, status: 'NXDOMAIN', ede: '15 (Blocked): (listed by threat feed)', authority: [soaOf(r, s.vendor!, `ns1.${s.vendor}`, `hostmaster.${s.vendor}`)] }),
		guess: ['NXDOMAIN means the name does not exist in DNS. It may be worth checking with {vname} that the hostname is right.', 'I will ask the edge DNS team whether anything is filtered.'],
		probe: 'Could you double-check the exact hostname your app uses?',
		reply: ['The hostname is right; it is in {vname}\'s documentation and it worked until {d1}.', 'Checked. It is correct, and it has not changed in two years.'],
		paste2: (r, s, offset) => appLog(r, { ...s, stack: 'go' }, offset, s.vhost!, 'nx', int(r, 3, 6)),
		look: ['The answers from the upstreams carry extended error 15, Blocked: the name is on the threat feed the resolver platform loads. All three upstreams agree.'],
		evidence: (r, s) => fence([`$ for u in 192.0.2.53 198.51.100.53 203.0.113.53; do dig +noall +comments ${s.vhost} @$u | grep -E 'status|EDE'; done`, ...['192.0.2.53', '198.51.100.53', '203.0.113.53'].flatMap(() => [`;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: ${int(r, 1024, 65535)}`, '; EDE: 15 (Blocked): (listed by threat feed)'])]),
		lead: ['Checked {vname}\'s delegation in case it had changed on {d1}.', null, 'The delegation is unchanged and their nameservers answer normally.'],
		found: ['{vendor} was added to the threat feed on {d1}, most likely because a phishing site shared an address with {vname}\'s new hosting. It is a false positive; I can add an exception on the upstreams.'],
		foundBy: 'rp',
		explain: ['Our upstream resolvers filter names that appear on a threat feed, and {vendor} was added to it by mistake. That is why it fails only through Pellmoor\'s resolvers.', 'The resolvers behind our edge nodes refuse names on a list of known malicious domains, and {vname}\'s domain landed on that list by mistake, probably because a bad site shared one of its addresses. Nothing is wrong with {vname} or with your setup.'],
		fix: 'added an exception for {vendor} on the upstream resolvers',
		done: ['Works again since this morning. Thanks for chasing it.', 'Resolves now. The jobs caught up.'],
		owe: 'have the resolver platform team add the exception in their next change window, and tell you here when it is live',
		outcomes: ['confirmed', 'owed', 'unconfirmed', 'confirmed']
	},
	{
		key: 'stale',
		cause: 'upstream',
		weight: 8,
		subjects: ['Old address still served for {host}', 'Our VMs still see the old IP of {host}', '{host} resolves to the old server on Pellmoor'],
		open: ['We moved {host} to a new server ({site}) yesterday afternoon. Everyone sees the new address except our own VMs on {node}, which still go to {oldip}. It has been {n} hours.', 'Changed the A record of {host} from {oldip} to {site} this morning. Our VMs at Pellmoor still get the old one, and we are about to switch the old server off.',
			'We cut {host} over to {site} today. Our monitoring outside sees the new server; our own VMs on {node} keep talking to the old one at {oldip}, which means half our traffic still lands there.'],
		more: ['Public resolvers all have the new address.', 'We need to switch the old server off by {weekday}.'],
		brief: 'VMs on {node} still get {oldip} for {host} after the customer changed it to {site}.',
		paste: (r, s) => fence([`$ dig +noall +answer ${s.host}`, rr(s.host!, int(r, 40000, 82000), 'A', s.oldip!)]),
		guess: ['DNS changes can take a while to reach every resolver. What was the record\'s TTL before the change?', 'Our edge resolver keeps no cache itself, but the upstream resolvers behind it do. I will ask the team.'],
		probe: 'When exactly was the record changed, and what was its TTL before?',
		reply: ['Changed at about {hh}:00. The TTL was 86400; I know, I should have lowered it first.', 'TTL was a day. Changed around {hh}:{mm}.'],
		look: ['192.0.2.53 still has the old record cached; 198.51.100.53 and 203.0.113.53 have the new one. The forwarder sends everything to 192.0.2.53, so the VMs see the old one.'],
		evidence: (r, s) => fence([`$ for u in 192.0.2.53 198.51.100.53 203.0.113.53; do dig +short ${s.host} @$u; done`, s.oldip!, s.site!, s.site!]),
		found: ['192.0.2.53 fetched {host} shortly before the change and holds it for the full day the old TTL allows.'],
		explain: ['Our upstream resolver had your old record cached from just before you changed it, and with a TTL of a day it would hold it until tomorrow afternoon. Other resolvers happened to fetch it after the change.'],
		fix: 'removed {host} from the upstream resolver\'s cache',
		done: ['New address everywhere now. Lesson learned about the TTL.', 'Confirmed, the VMs see {site}. The old server can go.'],
		around: 'add {host} with {site} to /etc/hosts on the VMs until tomorrow afternoon, and take the line out again after that',
		aroundLead: 'Flushing needs the resolver platform team, who are not reachable today. Until then,',
		aroundOk: ['We put a hosts entry in for today and will take it out tomorrow.'],
		outcomes: ['confirmed', 'unconfirmed', 'confirmed', 'workaround']
	},
	{
		key: 'ecs',
		cause: 'upstream',
		weight: 4,
		subjects: ['{vname} sends our VMs to the wrong region', 'Wrong regional endpoint for {vhost}', 'Geo DNS answers wrong from {node}'],
		open: ['Our VMs on {node} get sent to the wrong region by {vname}. Their API answers that our account belongs to the EU region and refuses the request. From the office we get the EU addresses and it works.', '{vhost} resolves to {vname}\'s North American endpoints from our VMs, which reject our EU account. From any EU network it gives the EU endpoints. What does your DNS do differently?'],
		more: ['{vname} support says it is the resolver\'s fault, without saying why.', 'It started when we moved from our old host to Pellmoor.'],
		brief: '{vname}\'s geo DNS gives the customer\'s VMs on {node} North American endpoints instead of EU ones.',
		paste: (r, s) => fence([`$ dig +short ${s.vhost}    # on ${s.vm}`, `${s.vname.toLowerCase()}-na.${s.cdnd}.`, `198.18.${int(r, 200, 230)}.${int(r, 2, 250)}`, `198.18.${int(r, 200, 230)}.${int(r, 2, 250)}`, `$ dig +short ${s.vhost}    # in the office`, `${s.vname.toLowerCase()}-eu.${s.cdnd}.`, `198.18.${int(r, 60, 90)}.${int(r, 2, 250)}`]),
		guess: ['Our resolver relays the upstream\'s answer unchanged; it does not pick addresses. I will ask the team why it differs.', 'Maybe {vname} has a problem with our network. I will check.'],
		probe: 'Could you send the full error from {vname}\'s API?',
		reply: ['Here it is.', 'Below, from our logs.'],
		paste2: (r, s) => fence([`HTTP/1.1 421 Misdirected Request`, 'content-type: application/json', '', `{"error": "region_mismatch", "message": "Account ${int(r, 100000, 999999)} belongs to region eu-central. Use the eu-central endpoint.", "request_id": "${hex(r, 24)}"}`]),
		look: ['The upstreams do not pass the client\'s subnet on to other nameservers (no EDNS Client Subnet), as a matter of policy. {vname}\'s nameservers therefore only see the upstream\'s own address.'],
		found: ['The upstream ranges are registered to Pellmoor\'s entity in Toronto, and that is what the geo databases go by, so services like {vname} place our resolvers in North America.'],
		foundBy: 'rp',
		explain: ['{vname} picks its endpoint from where it thinks the request comes from, and all it sees is our upstream resolvers\' addresses, never your VM\'s: our upstreams do not pass on any part of your address, for privacy. Geo databases place those addresses in North America. {vname} publishes region-specific names; {valt} always gives the EU endpoints and avoids the guess altogether.'],
		around: 'use the region-specific hostname {valt}',
		aroundLead: 'The simplest way round it is to',
		aroundOk: ['Switched to {valt}. Works. It would still be nice if the guess were right.', 'Using the EU name now; all good.'],
		owe: 'ask the resolver platform team to get the upstream addresses\' location corrected in the main geo databases, and report back',
		outcomes: ['workaround', 'owed', 'workaround', 'silent']
	},
	{
		key: 'dnsbl',
		role: 'mail',
		cause: 'upstream',
		weight: 4,
		subjects: ['Mail server rejecting every incoming message', 'All inbound mail blocked on {vm}', 'Blocklist lookups broken from Pellmoor?'],
		open: ['Our mail server on {vm} has started rejecting every incoming message. The logs say the sending servers are on a blocklist, but it is all of them, including big providers and our own staff.', 'Since we moved our mail server to Pellmoor, Postfix rejects all mail with {rbl} in the reason. Nothing was rejected at our old host with the same configuration.'],
		more: ['We use {rbl} like everyone else; it never caused trouble.', 'Outbound mail works.'],
		brief: 'Postfix on {vm} rejects all inbound mail as blocklisted via {rbl}.',
		paste: (r, s, offset) => {
			const lines: string[] = [];
			const [, mo, d] = isoDate(offset).split('-');
			for (let i = int(r, 3, 5); i > 0; i--) {
				const ip = ip198(r);
				lines.push(`${MONTHS[Number(mo) - 1]!.slice(0, 3)} ${d} ${pad(int(r, 6, 20))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))} ${s.vm} postfix/smtpd[${int(r, 2000, 40000)}]: NOQUEUE: reject: RCPT from mail-${hex(r, 6)}.${pick(r, ['outbound.example', 'mx.example', s.vendor!])}[${ip}]: 554 5.7.1 Service unavailable; Client host [${ip}] blocked using ${s.rbl}; Error: open resolver; https://mailshield.example/returnc/pub; from=<${pick(r, ['noreply', 'invoices', 'news', 'j.smith'])}@${pick(r, ['outbound.example', s.vendor!])}> to=<${pick(r, ['info', 'sales', 'support'])}@${s.domain}> proto=ESMTP helo=<mail-${hex(r, 6)}>`);
			}
			return fence(lines);
		},
		guess: ['That sounds like a Postfix configuration question rather than DNS, but I will ask the team to check.', 'Perhaps the blocklist has listed our address range. I will check.'],
		probe: 'Could you send the smtpd_recipient_restrictions part of your main.cf?',
		reply: ['Here.', 'Below. Unchanged from the old server.'],
		paste2: (r, s) => fence(['$ postconf smtpd_recipient_restrictions', `smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination, reject_rbl_client ${s.rbl}`]),
		look: ['Lookups against {rbl} from {ip} come back as 127.255.255.254 for every address, listed or not.'],
		evidence: (r, s) => fence([`$ dig +short 2.0.0.127.${s.rbl} @10.20.0.1`, '127.255.255.254', `$ dig +short ${int(r, 2, 250)}.${int(r, 1, 250)}.18.198.${s.rbl} @10.20.0.1`, '127.255.255.254']),
		found: ['127.255.255.254 is {rblname}\'s way of saying "you are asking through a large shared resolver, which we do not answer". Our upstreams resolve for thousands of VMs, so {rblname} refuses them, and Postfix, told to reject on any answer, reads the refusal code as a listing.'],
		explain: ['{rblname} does not answer queries that come through large shared resolvers like ours, and replies with a special code instead, 127.255.255.254. Your Postfix line rejects on any answer, so it treats that code as a listing. Tell Postfix to accept only the real listing codes (`reject_rbl_client {rbl}=127.0.0.[2..11]`), and to get real answers you need your own access: {rblname} offers free keys for small mail servers, used through a local resolver such as Unbound on the VM.'],
		around: 'accept only real listing codes in Postfix and query {rbl} with your own key through a local Unbound',
		aroundLead: 'In short,',
		aroundOk: ['Changed the Postfix line and set up Unbound with our key. Mail is flowing.', 'Mail is coming in again with the listing codes fixed; the key is requested.'],
		owe: 'find out whether {rblname} offers an arrangement for Pellmoor\'s resolvers, and report back',
		outcomes: ['workaround', 'workaround', 'silent', 'owed']
	},
	{
		key: 'negcache',
		cause: 'upstream',
		weight: 5,
		subjects: ['New subdomain not resolving on Pellmoor', 'NXDOMAIN for a record we just created', '{newsub}.{domain} missing from your DNS'],
		open: ['We added a new record, {newsub}.{domain}, at {hh}:{mm} for a deploy. It resolves everywhere except on our VMs, which say NXDOMAIN.', 'Our deploy creates {newsub}.{domain} and then the VMs cannot find it. From outside it is there.'],
		more: ['The deploy script creates the record through our DNS provider\'s API.', 'This happens on every deploy, now that I think of it.'],
		brief: 'NXDOMAIN for the newly created {newsub}.{domain} from {node}; resolves outside.',
		paste: (r, s) => digFull(r, s, { args: `${s.newsub}.${s.domain}`, q: `${s.newsub}.${s.domain}`, status: 'NXDOMAIN', authority: [soaOf(r, s.domain!, `ns1.${s.newpd}`, `hostmaster.${s.domain}`)] }),
		guess: ['Could the record have a typo? Our resolver just relays.', 'New records can take a little while to show up everywhere. I will check with the team.'],
		probe: 'When exactly was the record created?',
		reply: ['{hh}:{mm}, according to our DNS provider\'s audit log.', 'The deploy log says {hh}:{mm}.'],
		look: ['Query log: {newsub}.{domain} was first asked for before the record existed; the deploy script looks for the name before it creates it. 192.0.2.53 got NXDOMAIN then, and has been handing that answer out since.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, repeat(r, [`${s.newsub}.${s.domain}`, 'A', 'NXDOMAIN'], 3, 6), int(r, 1, 3))),
		found: ['The NXDOMAIN is cached on 192.0.2.53 for as long as the last field of the customer\'s SOA allows, which is 3600: an hour after the first lookup.'],
		explain: ['Your deploy script asked for {newsub}.{domain} before creating it. Our upstream resolver got NXDOMAIN from your nameservers at that moment and, as resolvers do, held on to the "does not exist" answer for as long as your zone\'s SOA record allows, an hour. Create the record before anything looks it up, or lower the last field of your SOA.'],
		fix: 'removed the cached NXDOMAIN for {newsub}.{domain} from the upstream',
		done: ['Resolves now. We have moved the check after the creation step.', 'Thanks, it is there. Deploy script fixed as well.'],
		around: 'create the record before the deploy\'s first lookup',
		aroundLead: 'For the future, the way round it is to',
		aroundOk: ['We reordered the deploy steps; no more NXDOMAIN.'],
		outcomes: ['confirmed', 'workaround', 'unconfirmed', 'silent']
	},
	{
		key: 'tcp',
		cause: 'forwarder',
		weight: 9,
		subjects: ['Large TXT record lookups fail from VMs', 'Some lookups fail with "Truncated, retrying in TCP mode"', 'Domain verification fails on our VM for some domains'],
		open: [
			'Our app checks domain ownership for our customers by reading their TXT records. From {vm} it fails for some domains, those with many TXT records such as {bigdom}, and works for small ones. From outside it works for all of them.',
			'Lookups of {host} fail from {vm}. It is a name with a lot of A records (we use it as a pool of {n2} workers). Our code gets "Temporary failure in name resolution"; smaller pools are fine.',
			'Our mail checker reads DKIM and SPF records for customer domains. A few domains always fail from {vm} with "no servers could be reached", while dig from my laptop gets their TXT records straight away. {bigdom} is one of them.'
		],
		more: ['It is not new: we just never had a customer with that many TXT records before.', 'Lookups of the same names from our office work.'],
		brief: 'Lookups with large answers fail from {vm}; small answers are fine.',
		paste: (r, s) => {
			const refused = ';; communications error to 10.20.0.1#53: connection refused';
			return fence([`$ dig TXT ${s.bigdom}`, ';; Truncated, retrying in TCP mode.', refused, refused, refused, '', `; <<>> DiG ${s.digv} <<>> TXT ${s.bigdom}`, ';; global options: +cmd', ';; no servers could be reached']);
		},
		guess: ['Some TXT record sets are very large; I will check whether our resolver has a limit.', 'That error suggests the VM could not reach our resolver. Is there a firewall on the VM?'],
		probe: 'Could you run `dig +notcp TXT {bigdom}` and send the output?',
		reply: ['Below. It says truncated.', 'Here. That one gets an answer, sort of.'],
		paste2: (r, s) => digFull(r, s, { args: `+notcp TXT ${s.bigdom}`, q: s.bigdom!, type: 'TXT', flags: 'qr tc rd ra' }),
		look: ['The UDP answer comes back from 192.0.2.53 with the TC bit set because it does not fit in 1232 bytes, and the forwarder relays it as it is. The client then tries again over TCP, and nothing listens on TCP port 53 on the node.'],
		evidence: (r, s) => fence([`$ sudo ss -lnup 'sport = :53'`, 'State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process', `UNCONN  0       0              0.0.0.0:53          0.0.0.0:*      users:(("python3",pid=${int(r, 800, 2400)},fd=3))`, `$ sudo ss -lntp 'sport = :53'`, 'State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process']),
		found: ['The edge forwarder only serves UDP. Answers bigger than about 1232 bytes come back truncated, and the client\'s fallback to TCP is refused.'],
		explain: ['Our edge resolver currently only answers over UDP. An answer too big for one UDP packet comes back marked as truncated, and your resolver library then asks again over TCP, which the edge resolver does not accept. That is a limitation on our side, not something in your setup.'],
		owe: 'add TCP to the edge forwarder; it is on the edge DNS team\'s list, with no date yet',
		around: 'look up the large record sets over TCP at the domain\'s own nameservers, which the VM can reach directly',
		aroundLead: 'Until we add TCP, a way round it is to',
		aroundOk: ['We have changed the job to ask the domain\'s own nameservers over TCP. Works, but please do add TCP.', 'Workable for now. Please keep us posted on TCP.'],
		outcomes: ['owed', 'workaround', 'owed', 'silent']
	},
	{
		key: 'cookie',
		cause: 'forwarder',
		weight: 6,
		subjects: ['Monitoring alerts from your DNS', 'FORMERR from 10.20.0.1 for health checks', 'DNS health check failing on all VMs on {node}'],
		open: ['Our monitoring ({mon}) runs a DNS check against each VM\'s resolver. Since we upgraded it to version {ver}, every check against 10.20.0.1 fails with FORMERR and "recursion not available". Against our office resolver it passes.', 'All our DNS checks on {node} went red after the {mon} upgrade on {d1}. Apparently your resolver answers FORMERR. Our app seems fine, so is this a real problem?',
			'Since {d1} our on-call phone goes off all night: {mon} reports every VM\'s DNS as critical, with FORMERR from 10.20.0.1. Lookups from the VMs themselves work. Which one is lying?'],
		more: ['We have the same check on {n} VMs; all red.', 'The release notes of {mon} {ver} mention "cookie-aware DNS checks".'],
		brief: '{mon} {ver} DNS checks against 10.20.0.1 fail with FORMERR on all the customer\'s VMs on {node}; real lookups work.',
		paste: (r, s) => fence([`${s.mon.toUpperCase()} CRITICAL - dns ${s.vm}: server 10.20.0.1 answered FORMERR (flags: qr; recursion not available)`, `${s.mon.toUpperCase()} CRITICAL - dns ${s.vm2}: server 10.20.0.1 answered FORMERR (flags: qr; recursion not available)`, `${s.mon.toUpperCase()} OK - dns office-gw: server 192.168.${int(r, 0, 9)}.1 answered NOERROR`]),
		guess: ['FORMERR means the server could not read the query. Did anything change in how the check is set up?', 'If real lookups work, it is probably the check itself, but I will ask the team.'],
		probe: 'Could you tell us exactly what the check sends?',
		reply: ['Not sure, it is the default check in {ver}. Debug output below.', 'Debug output from {mon} below.'],
		paste2: (r, s) => fence([`$ ${s.mon.toLowerCase()} check dns --server 10.20.0.1 --debug`, 'probe 1/2: server cookie (QDCOUNT=0, EDNS COOKIE client=' + hex(r, 16) + ')', 'probe 1/2: rcode=FORMERR flags=qr qdcount=0 ancount=0 edns=absent', 'probe 1/2: recursion not available', 'probe 2/2: skipped (probe 1 failed)', 'result: CRITICAL']),
		look: ['The query log has nothing for the probes, since it only records queries the forwarder could read. tcpdump on the node shows them: a header with QDCOUNT 0 and an EDNS COOKIE option, which is a legitimate way to ask for a server cookie.'],
		evidence: (r, s) => {
			const port = int(r, 32768, 60999);
			const id = int(r, 1000, 65000);
			const at = `${pad(int(r, 6, 20))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}`;
			const micro = int(r, 0, 999000);
			return fence([`$ sudo tcpdump -ni any udp port 53 and host ${s.ip}`, `${at}.${pad(micro, 6)} IP ${s.ip}.${port} > 10.20.0.1.53: ${id} [0q] [1au] (23)`, `${at}.${pad(micro + int(r, 40, 900), 6)} IP 10.20.0.1.53 > ${s.ip}.${port}: ${id} FormErr [0q] 0/0/0 (12)`]);
		},
		found: ['The forwarder only accepts queries with exactly one question and answers FORMERR to anything else. Its own error answers also carry neither RD nor RA, which is where the "recursion not available" part comes from.'],
		explain: ['The new {mon} check starts with a cookie probe that carries no question, and our edge forwarder answers FORMERR to any query without exactly one question. That is a limitation on our side; your VMs\' real lookups are not affected. The "recursion not available" message comes from the same place: the forwarder\'s error answers leave out the flags that say recursion is available.'],
		owe: 'change the forwarder so that it answers question-less cookie queries properly and sets the recursion flags on its error answers; it is filed for the edge resolver, with no release date yet',
		around: 'switch the {mon} check back to plain mode (an A query for a name you choose), which passes',
		aroundLead: 'Until the forwarder handles the probe,',
		aroundOk: ['Plain mode works. Please let us know when the forwarder handles the cookie probe.', 'Switched to plain mode, all green.'],
		outcomes: ['owed', 'workaround', 'workaround', 'owed']
	},
	{
		key: 'v6listen',
		cause: 'forwarder',
		weight: 4,
		subjects: ['DNS not working on IPv6-only VM', 'Resolver unreachable over IPv6', 'IPv6 resolver address in the panel does not answer'],
		open: ['We are testing an IPv6-only setup on {vm}: we removed the IPv4 address and put the node\'s IPv6 resolver address from the panel, {v6gw}, in resolv.conf. Nothing resolves.', 'The panel shows {v6gw} as the DNS server for our IPv6 network. Queries to it are refused. IPv4 DNS works.'],
		more: ['IPv6 connectivity to the internet works from the VM.', 'We need IPv6-only for a customer project.'],
		brief: '{v6gw}, the IPv6 resolver address the panel shows, refuses DNS from {vm}.',
		paste: (r, s) => {
			const refused = `;; communications error to ${s.v6gw}#53: connection refused`;
			return fence([`$ dig ${s.host} @${s.v6gw}`, refused, refused, refused, '', `; <<>> DiG ${s.digv} <<>> ${s.host} @${s.v6gw}`, ';; global options: +cmd', ';; no servers could be reached']);
		},
		guess: ['Is IPv6 enabled for the VM\'s network in the panel?', 'Could you check that the VM has an IPv6 default route?'],
		probe: 'Could you send `ip -6 route` from {vm}?',
		reply: ['IPv6 is enabled. Routes below.', 'Here.'],
		paste2: (r, s) => fence(['$ ip -6 route', `2001:db8:20:${s.v6gw!.split(':')[3]}::/64 dev eth0 proto ra metric 100 pref medium`, 'fe80::/64 dev eth0 proto kernel metric 256 pref medium', 'default via fe80::1 dev eth0 proto ra metric 100 pref medium']),
		look: ['The resolver on the node is bound to 0.0.0.0, IPv4 only. {v6gw} is the node\'s gateway address; it answers, but nothing listens on UDP port 53 there, hence the "port unreachable".'],
		evidence: (r) => fence([`$ sudo ss -lnup 'sport = :53'`, 'State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process', `UNCONN  0       0              0.0.0.0:53          0.0.0.0:*      users:(("python3",pid=${int(r, 800, 2400)},fd=3))`]),
		found: ['The edge forwarder only listens on IPv4. The panel is wrong to show {v6gw} as a resolver address.'],
		explain: ['Our edge resolver currently only answers on IPv4, at 10.20.0.1. The panel shows the gateway\'s IPv6 address as a DNS server, which is a mistake on our side. For now, keep the private IPv4 address on the VM for DNS only; the edge resolver answers questions about IPv6 records (AAAA) over IPv4 without trouble.'],
		owe: 'make the edge forwarder listen on IPv6 as well, and correct the panel; there is no date yet',
		around: 'keep the VM\'s private IPv4 address and use 10.20.0.1 for DNS while everything else runs over IPv6',
		aroundLead: 'Until the forwarder listens on IPv6,',
		aroundOk: ['We kept the private IPv4 address for DNS. The project can go ahead.'],
		outcomes: ['owed', 'workaround', 'owed', 'silent']
	},
	{
		key: 'crash',
		cause: 'forwarder',
		weight: 4,
		subjects: ['DNS dropped out on all VMs for a few minutes', 'Short DNS outage on {node} again', 'All lookups failed briefly, twice today'],
		open: ['Twice today (around {hh}:{mm} and again at {hh2}:{mm2}) every lookup from our VMs on {node} failed for a few minutes. Our app logged "connection refused" from 10.20.0.1, then it came back by itself.', 'We had two short DNS outages on {node} this week. Every VM affected, nothing resolved, then back to normal. No maintenance was announced.'],
		more: ['Our status page went red because of it.', 'Our VMs on other nodes were fine.'],
		brief: 'Two short DNS outages for all of the customer\'s VMs on {node}; 10.20.0.1 refused queries.',
		paste: (r, s, offset) =>
			[appLog(r, s, offset, s.vhost!, 'fail', int(r, 2, 4), Number(s.hh) * 60 + Number(s.mm)), appLog(r, s, offset, s.vhost!, 'fail', int(r, 2, 4), Number(s.hh2) * 60 + Number(s.mm2))].join('\n\n'),
		guess: ['We had no maintenance on {node} today. I will ask the team to look at the node.', 'That does sound like the resolver on the node. Escalating.'],
		probe: 'Could you send the times of the failures, as exactly as you have them?',
		reply: ['From about {hh}:{mm} for a few minutes, and again from {hh2}:{mm2}. UTC.', 'The two windows are in the log above; both UTC.'],
		look: ['The forwarder on {node} exited and was restarted by systemd several times at each of those times. Journal below.'],
		evidence: (r, s) => {
			const [, mo, d] = s.today!.split('-');
			const time = `${MONTHS[Number(mo) - 1]!.slice(0, 3)} ${d} ${s.hh}:${s.mm}:${pad(int(r, 0, 59))}`;
			const pid = int(r, 2000, 30000);
			return fence([
				`$ journalctl -u edge-resolver --since "${s.today} ${s.hh}:00"`,
				`${time} ${s.node} python3[${pid}]: Traceback (most recent call last):`,
				`${time} ${s.node} python3[${pid}]:   File "<frozen runpy>", line 198, in _run_module_as_main`,
				`${time} ${s.node} python3[${pid}]:   File "<frozen runpy>", line 88, in _run_code`,
				`${time} ${s.node} python3[${pid}]:   File "/opt/edge-resolver/resolver/server.py", line 40, in <module>`,
				`${time} ${s.node} python3[${pid}]:     main()`,
				`${time} ${s.node} python3[${pid}]:   File "/opt/edge-resolver/resolver/server.py", line 34, in main`,
				`${time} ${s.node} python3[${pid}]:     answer = forwarder.handle(host, packet)`,
				`${time} ${s.node} python3[${pid}]:   File "/opt/edge-resolver/resolver/forwarder.py", line 39, in handle`,
				`${time} ${s.node} python3[${pid}]:     question = parse_question(packet)`,
				`${time} ${s.node} python3[${pid}]:   File "/opt/edge-resolver/resolver/message.py", line 67, in parse_question`,
				`${time} ${s.node} python3[${pid}]:     labels.append(packet[offset + 1 : offset + 1 + length].decode("ascii").lower())`,
				`${time} ${s.node} python3[${pid}]: UnicodeDecodeError: 'ascii' codec can't decode byte 0x${pick(r, ['c3', 'c5', 'e2', 'd0'])} in position ${int(r, 0, 6)}: ordinal not in range(128)`,
				`${time} ${s.node} systemd[1]: edge-resolver.service: Main process exited, code=exited, status=1/FAILURE`,
				`${time} ${s.node} systemd[1]: edge-resolver.service: Failed with result 'exit-code'.`,
				`${time} ${s.node} systemd[1]: edge-resolver.service: Scheduled restart job, restart counter is at ${int(r, 2, 9)}.`
			]);
		},
		found: ['A VM on the node, not this customer\'s, sent queries with raw UTF-8 bytes in the name: an app passing a non-ASCII hostname without converting it. The forwarder\'s parser only expects ASCII labels, that error is not caught, so the process exits on such a query, and the app kept sending it.'],
		explain: ['This was a bug in our edge forwarder: a query from another customer\'s VM, for a hostname with non-ASCII characters in it, made the forwarder stop, and systemd restarted it. The other customer\'s app kept sending the same name, so the resolver kept stopping until the app gave up. The other customer has since fixed their app.'],
		owe: 'release a fix to the forwarder so that such a query gets FORMERR instead of stopping the service',
		outcomes: ['owed', 'owed']
	},
	{
		key: 'querylog',
		cause: 'request',
		weight: 4,
		subjects: ['Request for DNS query records for our VMs', 'Which of our VMs looked up {bad}?', 'Security incident: need DNS logs for {node}'],
		open: ['Our security team found {bad} in the logs of a laptop that connected to our VPN gateway on {vm}. We would like to know whether any of our VMs on {node} looked that name up between {d1} and {d2}, and if so which.', 'We are investigating a possible compromise. Can you tell us whether any of our VMs queried {bad} in the last two weeks? We understand you keep DNS logs.'],
		more: ['Our incident response provider asked for this.', 'We have no DNS logging of our own on these VMs.'],
		brief: 'Customer asks which of its VMs on {node} looked up {bad} between {d1} and {d2}.',
		guess: ['We do keep a log of DNS queries on each node. Let me check what we can share and how.', 'I will ask the edge DNS team; they hold the query logs.'],
		probe: 'For a data request like this we need it from an account administrator, by email from the address on the account. Could you arrange that?',
		reply: ['{admin} has just sent it from the admin address.', 'Done, our administrator {admin} emailed this morning.'],
		look: ['Request confirmed by the account administrator. Searching the query logs of {node} for {bad} with the customer\'s addresses.'],
		explainPaste: (r, s, offset) => {
			const one = queryLog(r, s, Math.max(0, offset - int(r, 3, 8)), repeat(r, [s.bad!, 'A', 'NOERROR'], 2, 4), s.ip);
			const two = queryLog(r, s, Math.max(0, offset - int(r, 3, 8)), repeat(r, [s.bad!, 'A', 'NOERROR'], 1, 3), s.ip2);
			return `${one}\n\n${two}`;
		},
		found: ['Two of the customer\'s VMs asked for {bad}: {vm} ({ip}) and {vm2} ({ip2}). Nothing from their other addresses.'],
		explain: ['Two of your VMs looked up {bad} in that period: {vm} ({ip}) and {vm2} ({ip2}). The lines from our query log are below; the times are UTC. No other VM of yours on {node} asked for it.'],
		done: ['That is exactly what we needed, thank you. It matches the laptop\'s VPN session.', 'Thanks, this narrows it down a lot.'],
		owe: 'search the archived logs for the first days of that period as well, which are on cold storage and take a few days to restore, and send any further lines',
		outcomes: ['confirmed', 'owed', 'confirmed']
	},
	{
		key: 'ptr',
		role: 'mail',
		cause: 'request',
		weight: 4,
		subjects: ['Reverse DNS for {pubip}', 'Please set the PTR record for our mail server', 'Need rDNS for {vm}'],
		open: ['We need reverse DNS for {pubip}, the public address of {vm}, set to mail.{domain}. Some recipients reject our mail without it.', 'Can you set the PTR record of {pubip} to mail.{domain}? Our mail server\'s address has no reverse name, and some big mail providers refuse our mail because of it.'],
		more: ['The panel does not seem to have an option for it.', 'mail.{domain} already points at {pubip}.'],
		brief: 'Customer wants the PTR record of {pubip} set to mail.{domain}.',
		paste: (r, s) => fence([`$ dig +short -x ${s.pubip}`, `${s.pubip!.split('.').join('-')}.customer.pellmoor.example.`]),
		guess: ['Reverse DNS for public addresses is handled by our network team rather than the DNS team, but requests come to this queue. Let me pass it on.', 'I will check how we set reverse records.'],
		probe: 'Could you confirm that mail.{domain} points at {pubip}?',
		reply: ['Yes, see below.', 'Confirmed.'],
		paste2: (r, s) => fence([`$ dig +short mail.${s.domain}`, s.pubip!]),
		look: ['Not ours: the edge resolver only answers the VMs\' own lookups, and the reverse zones for our public ranges are run by the network team. Moving it to {netFirst}.'],
		found: ['Forward record checked: mail.{domain} points at {pubip}. The reverse record can be set as asked.'],
		foundBy: 'net',
		explain: ['Reverse records for our public ranges are kept by the network team. We set them when the name you ask for points back at the address, which mail.{domain} does.'],
		explainBy: 'net',
		fix: 'set the reverse record of {pubip} to mail.{domain}',
		done: ['Thanks, mail to the fussy providers goes through now.', 'Shows up correctly here. Much appreciated.'],
		owe: 'set the record in the next change window for the reverse zones, on {weekday}, and confirm here',
		outcomes: ['confirmed', 'unconfirmed', 'owed']
	},
	{
		key: 'condfwd',
		cause: 'request',
		weight: 4,
		subjects: ['Forward our internal zone to our office DNS', 'Conditional forwarding for corp.{domain}', 'Resolve our internal names over the VPN'],
		open: ['We have an IPsec tunnel from {vm} to our office, and our internal names under corp.{domain} are served by a DNS server there, 10.150.0.10. Can the edge resolver forward corp.{domain} to it?', 'Is it possible to make your resolver send queries for corp.{domain} to our own DNS server at 10.150.0.10, over our VPN? At our old host we could set that up in the panel.'],
		more: ['Right now we keep a long /etc/hosts file, which is getting out of hand.', 'The tunnel itself works; we can reach 10.150.0.10 from {vm}.'],
		brief: 'Customer asks for corp.{domain} to be forwarded to its office DNS server over its VPN.',
		guess: ['I will ask the edge DNS team whether that is possible.', 'I do not think the panel has that option, but let me check with the team.'],
		probe: 'Which VMs need this, all of them or only {vm}?',
		reply: ['Only {vm} and {vm2}, the ones on the tunnel.', 'Just {vm} and {vm2}.'],
		look: ['The edge forwarder relays every query to the upstream resolvers and has no per-domain forwarding; and it could not reach the customer\'s office network anyway, which is only reachable through their tunnel on {vm}.'],
		found: ['The way to do this is on the VMs, with systemd-resolved\'s per-link settings. Drop-in below for the customer.'],
		evidence2: (r, s) => {
			const link = pick(r, ['vti0', 'xfrm0', 'ipsec0']);
			return fence([`# /etc/systemd/network/${pick(r, ['20', '30', '40'])}-${link}.network`, '[Match]', `Name=${link}`, '', '[Network]', 'DNS=10.150.0.10', `Domains=~corp.${s.domain}`]);
		},
		explain: ['The edge resolver cannot do this: it sends every query to Pellmoor\'s upstream resolvers, and it has no route to your office network anyway, which only your VMs reach through the tunnel. The way to do it is on the VMs: systemd-resolved can send queries for corp.{domain} to 10.150.0.10 through the tunnel interface, and everything else to 10.20.0.1. The drop-in above does that.'],
		around: 'use those systemd-resolved settings on the VMs that need the internal names',
		aroundLead: 'So the answer is to',
		aroundOk: ['Set it up on both VMs and the internal names resolve. Much better than the hosts file.'],
		owe: 'pass the request for per-domain forwarding in the edge resolver to the product team, and report back',
		outcomes: ['workaround', 'workaround', 'silent', 'owed']
	},
	{
		key: 'v6route',
		cause: 'not-dns',
		weight: 6,
		subjects: ['DNS intermittently broken for {vhost}', 'Our app cannot connect to {vname}, DNS?', 'IPv6 answers from your resolver break our app'],
		open: ['Our app on {vm} fails to connect to {vhost} about half the time with "Network is unreachable". Our developer says it is DNS, because your resolver gives back an IPv6 address.', 'Connections from {vm} to {vhost} fail with ENETUNREACH and an IPv6 address in the error. Can you stop your resolver returning IPv6 addresses?',
			'Since we moved our integration to {vm}, calls to {vname} fail now and then with "Network is unreachable". Our old server never did this. Is your DNS returning addresses we cannot reach?'],
		more: ['curl from the command line works every time, which confuses us.', 'We do not use IPv6 anywhere.'],
		brief: 'App on {vm} fails to connect to {vhost} with "Network is unreachable" on an IPv6 address.',
		paste: (r, s, offset) => fence(Array.from({ length: int(r, 3, 5) }, () => `${isoDate(offset)}T${pad(int(r, 6, 20))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}Z error [${pick(r, ['sync', 'checkout', 'worker'])}] connect ENETUNREACH 2001:db8:${hex(r, 3)}::${hex(r, 2)}:443 - Local (:::0)`)),
		guess: ['Our resolver returns whatever records the domain publishes, both IPv4 (A) and IPv6 (AAAA). I will ask the team whether something is off.', 'Could you check whether the VM has IPv6 configured?'],
		probe: 'Could you send `curl -v https://{vhost}/` and `ip -6 route` from {vm}?',
		reply: ['Below.', 'Here you go.'],
		paste2: (r, s) => {
			const v6 = `2001:db8:${hex(r, 3)}::${hex(r, 2)}`;
			const v4 = ip198(r);
			return fence([`$ curl -sv -o /dev/null https://${s.vhost}/`, `* Host ${s.vhost}:443 was resolved.`, `* IPv6: ${v6}`, `* IPv4: ${v4}`, `*   Trying [${v6}]:443...`, `* Immediate connect fail for ${v6}: Network is unreachable`, `*   Trying ${v4}:443...`, `* Connected to ${s.vhost} (${v4}) port 443`, '$ ip -6 route', 'fe80::/64 dev eth0 proto kernel metric 256 pref medium']);
		},
		look: ['Query log: A and AAAA for {vhost}, both NOERROR, as for any dual-stack name.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, shuffle(r, [[s.vhost!, 'A', 'NOERROR'], [s.vhost!, 'AAAA', 'NOERROR'], [s.vhost!, 'A', 'NOERROR'], [s.vhost!, 'AAAA', 'NOERROR']]), int(r, 2, 4))),
		found: ['The VM has an IPv6 link-local address but no IPv6 route, because IPv6 is not enabled for the account\'s network. curl tries IPv6, fails at once and moves on to IPv4; the app\'s HTTP client takes the first address it gets and stops there.'],
		explain: ['This is not DNS: your VM has no IPv6 connectivity, since IPv6 is not enabled for its network, but the app tries the IPv6 address first and gives up when it fails, where curl moves on to the IPv4 address. Either enable IPv6 for the VM\'s network in the panel (it costs nothing), or make the system prefer IPv4 by adding `precedence ::ffff:0:0/96 100` to /etc/gai.conf.'],
		did: 'enabled IPv6 for the network in the panel',
		done: ['Enabled IPv6 in the panel and the errors stopped.', 'Went with gai.conf. No more failures.'],
		around: 'prefer IPv4 through /etc/gai.conf',
		aroundLead: 'If you would rather not enable IPv6 yet,',
		aroundOk: ['gai.conf changed; the errors are gone. We will look at IPv6 later.'],
		outcomes: ['confirmed', 'workaround', 'silent', 'unconfirmed']
	},
	{
		key: 'port25',
		role: 'mail',
		cause: 'not-dns',
		weight: 5,
		subjects: ['MX lookups failing from {vm}?', 'New mail server cannot send any mail', 'Outgoing mail stuck on {vm}'],
		open: ['Our new mail server on {vm} cannot send to anyone. Everything sits in the queue. I suspect MX lookups are failing from your DNS.', 'Outbound mail from {vm} does not leave. Postfix says "No route to host" for every recipient\'s mail server. Is your resolver giving it wrong MX records?'],
		more: ['The same configuration worked at our old host.', 'Inbound mail works.'],
		brief: 'Outbound mail from {vm} stays queued; customer suspects MX lookups.',
		paste: (r) => {
			const lines = ['$ mailq'];
			for (let i = int(r, 2, 4); i > 0; i--) {
				const domain = pick(r, ['outbound.example', 'mx.example', 'mailhub.example', 'post.example']);
				lines.push(`${hex(r, 10).toUpperCase()}     ${int(r, 900, 9000)} ${pick(r, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])} ${pick(r, ['Sep', 'Oct', 'Nov'])} ${int(r, 1, 28)} ${pad(int(r, 6, 20))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}  ${pick(r, ['noreply', 'billing', 'alerts'])}@${pick(r, ['shop.example', 'app.example'])}`, `(connect to mx${int(r, 1, 3)}.${domain}[${ip198(r)}]:25: No route to host)`, `                                         ${pick(r, ['anna', 'orders', 'info', 'j.berg'])}@${domain}`, '');
			}
			return fence(lines);
		},
		guess: ['If the error names the recipient\'s mail server and its address, the MX lookup worked. This looks like a network question; I will check.', 'I will ask the DNS team to check the MX lookups.'],
		probe: 'Could you tell me when the account was opened?',
		reply: ['On {d0}, so very new.', 'Last week, {d0}.'],
		look: ['MX and A lookups from {ip} for the recipients\' domains are all NOERROR in the query log. DNS is fine.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, shuffle(r, [['outbound.example', 'MX', 'NOERROR'], ['mx1.outbound.example', 'A', 'NOERROR'], ['mailhub.example', 'MX', 'NOERROR'], ['mx2.mailhub.example', 'A', 'NOERROR'], ['post.example', 'MX', 'NOERROR'], ['mx1.post.example', 'AAAA', 'NOERROR']])),
		found: ['Outbound port 25 is closed on this account. It is closed by default on new accounts until they are verified, and this account was opened on {d0}.'],
		foundBy: 'net',
		explain: ['DNS is working: your server finds the recipients\' mail servers, as the error message shows. What fails is the connection on port 25, which we close by default on new accounts to keep spam off our network. It is opened once the account is verified.'],
		fix: 'opened outbound port 25 for your account',
		ask: 'complete the account verification in the panel (Account › Verification), after which port 25 is opened',
		done: ['The queue has emptied. Thanks.', 'Mail is going out. Thank you.'],
		around: 'relay outbound mail through your mail provider on the submission port, 587, which is open',
		aroundLead: 'If you would rather not verify the account,',
		aroundOk: ['We relay through our provider now; that is what we wanted to do eventually anyway.'],
		outcomes: ['confirmed', 'waiting', 'workaround', 'silent']
	},
	{
		key: 'cert',
		cause: 'not-dns',
		weight: 4,
		subjects: ['Certificate errors for {host} from your network', 'Your DNS sends us to the wrong server for {host}?', 'TLS name mismatch only from Pellmoor VMs'],
		open: ['Since moving {host} to {cdnname}, our VMs get a certificate error when calling it: the certificate is for *.{cdnd}. From the office it is fine. Your DNS must be returning a different server.', 'Our backend on {vm} cannot call {host} any more: "certificate does not match". Browsers are fine. Different DNS answers on your side?'],
		more: ['The backend is an older Java service we have not touched in years.', 'The move to {cdnname} was on {d1}.'],
		brief: 'TLS certificate mismatch when {vm} calls {host}; customer suspects a different DNS answer.',
		paste: (r, s) => fence([`javax.net.ssl.SSLHandshakeException: No subject alternative DNS name matching ${s.host} found.`, '\tat sun.security.ssl.Alerts.getSSLException(Alerts.java:192)', '\tat sun.security.ssl.SSLSocketImpl.fatal(SSLSocketImpl.java:1946)', '\tat sun.security.ssl.Handshaker.fatalSE(Handshaker.java:316)', '\tat sun.security.ssl.ClientHandshaker.serverCertificate(ClientHandshaker.java:1514)']),
		guess: ['I will check whether our resolver gives a different answer for {host}.', 'Certificate problems are usually on the server\'s side, but I will ask the team to compare the DNS answers.'],
		probe: 'Could you send `dig +short {host}` from {vm} and from the office?',
		reply: ['Below. They look the same to me, but what do I know.', 'Here.'],
		paste2: (r, s) => {
			const a = ip198(r);
			const b = ip198(r);
			return fence([`$ dig +short ${s.host}    # ${s.vm}`, `${s.host!.split('.')[0]}.${s.cdnd}.`, a, b, `$ dig +short ${s.host}    # office`, `${s.host!.split('.')[0]}.${s.cdnd}.`, a, b]);
		},
		look: ['Same addresses from the node and from outside; the query log agrees.'],
		found: ['The addresses are the same. The difference is the client: the old Java runtime on {vm} does not send the server name in the TLS handshake (SNI), so {cdnname} serves its default certificate.'],
		explain: ['Our resolver gives your VM the same addresses as your office gets. The difference is in the TLS handshake: browsers tell the server which name they want (SNI), and {cdnname} uses that to pick your certificate. The Java runtime of your backend is old enough not to send it by default, so it gets {cdnname}\'s default certificate. Updating the runtime, or setting `-Djsse.enableSNIExtension=true`, should fix it.'],
		did: 'updated the Java runtime on {vm}',
		done: ['Updated the JRE and it works.', 'Set the SNI flag; the backend talks to {host} again.'],
		around: 'have the backend call your origin server directly instead of going through {cdnname}',
		aroundLead: 'If the runtime cannot be touched,',
		aroundOk: ['We pointed the backend at the origin for now. The runtime upgrade is on our list.'],
		outcomes: ['confirmed', 'workaround', 'silent']
	},
	{
		key: 'blocked',
		cause: 'not-dns',
		weight: 4,
		subjects: ['Cannot connect to {vname} from our new VM', 'Connections to {vhost} reset, DNS?', '{vhost} unreachable from {vm} only'],
		open: ['Our new VM {vm} cannot connect to {vhost}; connections are reset immediately. The old VM {vm2} works fine. We think the new VM gets a different DNS answer.', 'From {vm} every request to {vname}\'s API ends with "connection reset by peer". {vm2} on the same node works. Is DNS different per VM?'],
		more: ['Both VMs run the same image.', 'We created {vm} on {d1} to replace {vm2}.'],
		brief: 'Connections from {vm} to {vhost} are reset; {vm2} works. Customer suspects DNS.',
		paste: (r, s) => fence([`$ curl -sS https://${s.vhost}/v1/ping`, 'curl: (35) Recv failure: Connection reset by peer']),
		guess: ['Each VM asks our resolver the same way, so they should get the same answer, but let me check.', 'I will ask the team to compare what the two VMs are told.'],
		probe: 'Could you send `dig +short {vhost}` from both VMs?',
		reply: ['Below. Same, as far as I can see.', 'Here.'],
		paste2: (r, s) => {
			const a = ip198(r);
			return fence([`$ dig +short ${s.vhost}    # ${s.vm}`, a, `$ dig +short ${s.vhost}    # ${s.vm2}`, a]);
		},
		look: ['Both VMs ask for {vhost} and get the same answers in the query log.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, repeat(r, [s.vhost!, 'A', 'NOERROR'], 2, 4), int(r, 1, 3))),
		found: ['Same answers. The resets come from {vname}\'s side: their API only accepts connections from addresses on the customer\'s allowlist, and {vm} has a new public address, {pubip}, which is not on it.'],
		explain: ['DNS gives both VMs the same addresses. The connection is reset by {vname}\'s servers, and the likeliest reason is an allowlist on their side: {vm} is new and has a different public address, {pubip}, from {vm2}. If your {vname} account restricts API access by address, add {pubip} there.'],
		did: 'added {pubip} to the allowlist in {vname}\'s dashboard',
		done: ['There was an allowlist in their dashboard, set up years ago. Added the address and it works.', 'That was it. Nobody here remembered the allowlist.'],
		outcomes: ['confirmed', 'confirmed', 'silent', 'unconfirmed']
	},
	{
		key: 'flaky',
		cause: 'unknown',
		weight: 5,
		subjects: ['Occasional lookup errors in our app', 'Intermittent DNS failures on {vm}', 'A few name resolution failures a day'],
		open: ['Our app logs a few name resolution failures a day ("Temporary failure in name resolution") for {vhost} and other names. Not many, maybe a dozen a day out of thousands of lookups, but each one fails a job.', 'We see sporadic EAI_AGAIN errors from {vm}, a handful each day, for names that work the rest of the time. Can you check your resolver around these times?'],
		more: ['It has been going on for about two weeks.', 'Our other VMs on {node} do not show it, but they do less.'],
		brief: 'A handful of "temporary failure in name resolution" errors a day on {vm}; most lookups fine.',
		paste: (r, s, offset) => appLog(r, s, offset, s.vhost!, 'fail', int(r, 4, 8)),
		guess: ['A small number of failures could be anything from the VM to the upstream. I will ask the team to look at the times in your log.', 'We had no incident on {node} at those times, but I will check.'],
		probe: 'Are the times in your log UTC?',
		reply: ['Yes, UTC.', 'They are UTC, yes.'],
		look: ['Around each of the times in the customer\'s log, the query log has no query at all from {ip} for the failing names, only successful lookups a little before and after. So these lookups never reached the node.'],
		evidence: (r, s, offset) => queryLog(r, s, offset, withNoise(r, repeat(r, [s.vhost!, 'A', 'NOERROR'], 3, 5), int(r, 3, 5))),
		lead: ['Checked the node for dropped packets on the VM\'s tap interface at those times.', null, 'No drops recorded on the node side.'],
		found: ['Something on the VM itself is failing these lookups before they leave: a local cache, a full connection-tracking table, or the resolver library. We cannot see inside the VM.'],
		explain: ['We do not see the failing lookups arrive at all: around each of your times, the resolver received nothing from {vm} for those names. That points at something on the VM. A packet capture of port 53 on the VM while a failure happens would show where the query goes, together with `resolvectl statistics` if systemd-resolved runs there.'],
		ask: 'run a packet capture of port 53 on {vm} until the next failure and send it with the time it happened',
		outcomes: ['waiting', 'silent', 'waiting']
	},
	{
		key: 'diffans',
		cause: 'unknown',
		weight: 4,
		subjects: ['Two VMs get different answers for {host}', 'Inconsistent DNS answers between our VMs', '{vm} and {vm2} disagree on {host}'],
		open: ['{vm} and {vm2} get different answers for {host}: one gets {site}, the other {oldip}. Same node, same resolver. How is that possible?', 'This morning half our workers connected to {oldip} for {host} and half to {site}. We changed the record on {d1}. Is your resolver serving both?'],
		more: ['We restarted the workers and the problem went away, for now.', 'The record has said {site} since {d1}.'],
		brief: '{vm} and {vm2} reportedly got different answers for {host} ({site} and {oldip}).',
		guess: ['Both VMs ask the same resolver, so they should get the same answer. I will ask the team.', 'That is odd. Let me get the edge DNS team to look at the logs for both.'],
		probe: 'Is it still happening now? If so, could you send `dig +short {host}` from both VMs?',
		reply: ['Now both say {site}. It was definitely different this morning.', 'Not any more, after the restart. Both get {site}.'],
		look: ['Query log for both VMs since {d1}: every answer for {host} from the node was {site}. Nothing answered {oldip}.'],
		evidence: (r, s, offset) => `${queryLog(r, s, offset, repeat(r, [s.host!, 'A', 'NOERROR'], 2, 3), s.ip)}\n\n${queryLog(r, s, offset, repeat(r, [s.host!, 'A', 'NOERROR'], 2, 3), s.ip2)}`,
		lead: ['Do the workers run a local DNS cache, or a language runtime that keeps its own?', 'They are Java services, if that matters.', 'It might: a Java runtime can keep lookups in the process, depending on its settings.'],
		found: ['We cannot tell where {oldip} came from. Our resolver never gave it out after the change; a cache inside the workers is the likeliest explanation, but the restart cleared any trace.'],
		explain: ['Our resolver gave both VMs {site} every time since you changed the record, so the old address came from somewhere else. The likeliest place is inside the workers themselves: Java keeps its own copy of lookups unless told otherwise. The restart wiped whatever was there, so we cannot be sure. If it happens again, please capture `dig +short {host}` and what the app is connecting to before restarting anything.'],
		ask: 'send both views if it happens again, before restarting anything',
		outcomes: ['silent', 'waiting', 'silent']
	}
];

// A question the customer asks once the cause is explained, with the engineer's answer.
const follows: Record<string, [string, string][]> = {
	ds: [
		['Why did nothing complain when we moved? {newp} even showed DNSSEC as active.', '{newp} sign the zone, so from their side DNSSEC is on. The link between the registry and the zone is the DS record, and only the registrar can change that; the provider cannot see it go out of date. It is one of the most common things to miss in a move.'],
		['Will this happen again if we ever change provider?', 'Only if the domain stays signed through the move. The safe order is to remove the DS at the registrar first, wait a day, move, and add the new provider\'s DS once the new zone is live.']
	],
	lame: [
		['Why did it only start on {d1}, when the move was weeks ago?', '{oldp} probably kept answering for your zone for a while after you left, then deleted it. From then on the two old nameservers refused, and the failures began.'],
		['Does it matter that the NS records in our zone are right?', 'They matter once a resolver has reached your zone, but the first step always uses the registry\'s list. The two lists should match.']
	],
	hold: [
		['Why did our office still reach the site this morning, then?', 'Their resolver still had the domain cached from before the hold. Caches empty in their own time, so different networks lose a domain at different moments.'],
		['Can you stop this happening again?', 'Not from our side; the hold is between you and {reg}. It helps to keep the registrant email address on a shared mailbox rather than one person\'s address.']
	],
	vendor: [
		['Why could {vname}\'s support not see it?', 'Their own office probably uses a resolver that still had the old answer. From any resolver without an old copy the name fails.'],
		['Could you not just point {vhost} at the right place for us?', 'We do not change answers for other companies\' names on the upstream resolvers. If we did, you would not see their real record once they fix it.']
	],
	glue: [
		['Why did it work for a day after the move?', 'The old VMs were still running and still had the zone. Once they were deleted, nothing answered at the glue addresses.'],
		['Do we need glue if we move the nameservers out of our own domain?', 'No. Nameservers named in another domain, like those of a DNS provider, need no glue from you.']
	],
	apex: [
		['Why did {newp} let us create it at all?', 'Some providers do not check for it. Several offer ALIAS or flattening precisely so that nobody needs a CNAME at the apex.'],
		['Is our incoming mail at risk too?', 'Yes, from senders whose resolvers do not have your MX records cached. The sooner the apex record is fixed, the better.']
	],
	oldres: [
		['Why does ping by address work but not names?', 'Ping by address never asks DNS. Only names need the resolver, and the VM is asking one that is not there.'],
		['Will cloud-init overwrite our change on the next boot?', 'Only if the image tells it to manage the network. If your netplan file is written by cloud-init, set the nameserver in the cloud-init network configuration instead, or switch that module off.']
	],
	docker: [
		['Why does the host work if Docker uses the same settings?', 'The host uses its own settings. Docker only copies them into containers when daemon.json does not name servers of its own, and yours does.'],
		['Do we need to rebuild the containers?', 'No, restarting Docker is enough for new containers. Running containers need a restart to get the new resolv.conf.']
	],
	coredns: [
		['Why did it work on 20.04?', 'On your old nodes /etc/resolv.conf named the real resolver, so CoreDNS forwarded to it. On 24.04 it names the local stub, and the old kubelet setting carried that into the pod.'],
		['Is there anything wrong with your resolver, then?', 'No. CoreDNS never reached it; the queries went round in a circle inside the pod.']
	],
	hosts: [
		['Why did the other VMs not have the line?', 'Probably because the task that writes it only ran on {vm}, or ran before the others existed. It is worth searching your configuration repository for {oldip}.'],
		['Should we use dig to test in future?', 'dig tells you what DNS says; getent tells you what your applications will get. When they differ, look at /etc/hosts and /etc/nsswitch.conf.']
	],
	dot: [
		['Is our DNS traffic to 10.20.0.1 visible to anyone?', 'It goes from your VM to the node it runs on and is answered there; the queries to the upstreams cross Pellmoor\'s own network. Nothing between your VM and the edge resolver crosses the internet.'],
		['Can we keep DNSSEC=allow-downgrade?', 'Yes, that setting is fine with the edge resolver. Only the TLS setting needs changing.']
	],
	search: [
		['Why did it work at our old provider?', 'Most likely the search line or the zone was different there. With the wildcard in place, any VM that tries corp.{domain} first will see this.'],
		['Can the resolver ignore the wildcard for us?', 'No. The wildcard is part of your public zone, and the upstreams answer it like any other record.']
	],
	nft: [
		['Do we need TCP 53 at all, then?', 'Not for the edge resolver, which only answers over UDP. Keep it if the VM talks to other DNS servers that need it.'],
		['Why did the input chain not need a rule?', 'The replies match the established,related rule in your input chain once the query has gone out.']
	],
	proxy: [
		['Why did apt work?', 'apt reads its own proxy setting from /etc/apt/apt.conf.d, not the environment, and yours has none.'],
		['Where would the playbook set these?', 'Look for a task that writes /etc/environment or a file under /etc/profile.d; searching the repository for 3128 usually finds it.']
	],
	blocklist: [
		['Will this happen again with other suppliers?', 'It can. The feed catches far more bad domains than good ones, but mistakes happen. If a supplier\'s name suddenly returns NXDOMAIN from our VMs only, the "Blocked" line in the dig output is the sign.'],
		['Can we opt out of the filtering?', 'Not per VM at the moment; the upstreams filter for everyone.']
	],
	stale: [
		['Is there a way to avoid this next time?', 'Lower the TTL to a few minutes a day before you change a record, and raise it again afterwards. Resolvers then let go of the old value soon after the change.'],
		['Why only our Pellmoor VMs?', 'Every node sends its queries to the same upstream, and that one happened to fetch your record shortly before the change. Others fetched it after.']
	],
	ecs: [
		['Could you send our subnet for {vname} only?', 'No, the upstreams treat every domain the same. Sending part of your address to some companies and not to others is not something we do.'],
		['Would our own resolver on the VM fix it?', 'If it asked {vname}\'s nameservers directly, they would see the VM\'s public address, which geo databases place correctly. The region-specific name is simpler.']
	],
	dnsbl: [
		['Why did it work at our old host?', 'Your old host\'s resolver was probably small enough, or had its own arrangement, so {rblname} answered it.'],
		['Is our server listed anywhere?', 'Not as far as we can tell; the code your server got back is not a listing at all.']
	],
	negcache: [
		['Why does the SOA decide this?', 'The last field of the SOA tells resolvers how long they may remember that a name does not exist. Yours says an hour.'],
		['Could your resolvers stop remembering NXDOMAIN?', 'They follow the zone owner\'s SOA, as every resolver does.']
	],
	tcp: [
		['Does this affect normal lookups?', 'Only answers too big for one UDP packet, roughly 1,200 bytes: big TXT sets, names with many addresses, DNSKEY sets. Ordinary lookups fit easily.'],
		['Can we ask for a bigger UDP size?', 'The upstreams cap UDP answers at 1232 bytes to avoid fragmented packets, so asking for more does not help.']
	],
	cookie: [
		['Should we be worried about our real lookups?', 'No. They carry a question and are answered normally; only the question-less probe gets FORMERR.'],
		['Will older {mon} versions keep working?', 'Yes, the plain check works with every version.']
	],
	v6listen: [
		['When will IPv6 DNS be available?', 'There is no date yet. This ticket stays linked to the work.'],
		['Does the panel show the wrong address for every node?', 'For every node with IPv6 enabled, yes. The panel team has the correction.']
	],
	crash: [
		['Could this happen again from another customer?', 'Yes, until the fix is out: any VM on the node sending such a name could cause it. The node restarts the forwarder by itself each time.'],
		['Why did our monitoring see "connection refused"?', 'While the forwarder was stopped, nothing listened on port 53, so the node refused the queries.']
	],
	querylog: [
		['How long do you keep these logs?', 'On the node for a couple of weeks; older logs are archived. We only search them on a request like yours.'],
		['Can we get this regularly?', 'Not as a service. For ongoing monitoring, a local resolver on your VMs with logging turned on gives you your own record.']
	],
	ptr: [
		['Can we change it ourselves next time?', 'Not yet; the panel does not offer reverse records. Ask here and we will set it.'],
		['Does the reverse record need to match exactly?', 'It should name a host that points back at the same address, as mail.{domain} does. Mail servers check both directions.']
	],
	condfwd: [
		['Will other VMs be affected by this?', 'No, the settings only apply to the VMs you put them on.'],
		['What happens if the tunnel is down?', 'Lookups under corp.{domain} fail on those VMs; everything else still goes to 10.20.0.1.']
	],
	v6route: [
		['Why does the VM have an IPv6 address at all?', 'That is a link-local address, which every interface gets. It cannot reach the internet.'],
		['Is enabling IPv6 safe for our firewall?', 'Check that your firewall rules cover IPv6 too before enabling it; nftables\' inet tables cover both.']
	],
	port25: [
		['Why is it closed?', 'New accounts are a common source of spam, so port 25 opens only once an account is verified.'],
		['Does this affect receiving mail?', 'No, inbound port 25 is open.']
	],
	cert: [
		['Why did it work before the move?', 'Your old server only had your certificate, so it did not need to know which name the client wanted.'],
		['Is anything wrong with {cdnname}?', 'No; serving a default certificate to a client that does not say which name it wants is normal.']
	],
	blocked: [
		['Why does {vm} have a different public address?', 'Each VM gets its own public address when it is created; the address does not move with the role.'],
		['Could we keep the old address?', 'Addresses can be moved between VMs in the panel, under Networking › Public addresses, before the old VM is deleted.']
	],
	flaky: [
		['Could it be your resolver dropping queries when it is busy?', 'If it were, we would see the queries arrive. Around your times, nothing arrived from {vm} at all.'],
		['What should we look for in the capture?', 'Whether a query for the failing name leaves the VM, and whether an answer comes back.']
	],
	diffans: [
		['Could two upstreams have given different answers?', 'Every query from the node goes to the same upstream, and our log shows {site} for every answer.'],
		['How do we stop Java keeping old lookups?', 'The runtime\'s networkaddress.cache.ttl security property controls it; your Java version\'s documentation describes it.']
	]
};

// The application errors a customer pastes along with the first message, for topics where a lookup fails.
const logs: Record<string, ['nx' | 'fail', string]> = {
	ds: ['fail', '{host}'],
	lame: ['fail', '{host}'],
	hold: ['nx', '{host}'],
	glue: ['fail', '{host}'],
	oldres: ['fail', '{vhost}'],
	coredns: ['fail', '{vhost}'],
	dot: ['fail', '{vhost}'],
	nft: ['fail', '{vhost}'],
	negcache: ['nx', '{newsub}.{domain}'],
	tcp: ['fail', '{host}']
};

// What first line support sees when it repeats the lookup from its own test VM on the node.
const tests: Record<string, [string, 'NOERROR' | 'SERVFAIL' | 'NXDOMAIN', string?]> = {
	ds: ['{host}', 'SERVFAIL'],
	hold: ['{domain}', 'NXDOMAIN'],
	vendor: ['{vhost}', 'SERVFAIL'],
	glue: ['{host}', 'SERVFAIL'],
	oldres: ['{host}', 'NOERROR', '{site}'],
	docker: ['{host}', 'NOERROR', '{site}'],
	hosts: ['{host}', 'NOERROR', '{site}'],
	dot: ['{host}', 'NOERROR', '{site}'],
	nft: ['{host}', 'NOERROR', '{site}'],
	blocklist: ['{vhost}', 'NXDOMAIN'],
	stale: ['{host}', 'NOERROR', '{oldip}'],
	negcache: ['{newsub}.{domain}', 'NXDOMAIN'],
	v6route: ['{vhost}', 'NOERROR', '{wild}'],
	blocked: ['{vhost}', 'NOERROR', '{wild}'],
	cert: ['{host}', 'NOERROR', '{wild}']
};

// ---------------------------------------------------------------------------------------------------------------
// The parts of a thread every topic shares.

const backgrounds = [
	'Some background: we run {product} on a handful of VMs on {node}, and {vm} is our {roledesc}.',
	'For context, {company} runs {product}; {vm} is the {roledesc}.',
	'We are a small team running {product} on Pellmoor. {vm} is the {roledesc}.',
	'Context: {vm} is the {roledesc} for {product}, on the {plan} plan.'
];
const products = ['an online shop for outdoor gear', 'a booking system for physiotherapy clinics', 'an invoicing service for freelancers', 'a mobile game backend', 'our customer portal', 'an analytics pipeline for retailers', 'a learning platform for schools', 'the website and API of a local newspaper', 'a ticketing service for small venues', 'a fleet tracking service', 'a recruitment platform', 'an internal tool for our warehouse staff', 'a photo printing service', 'a property listings site', 'a donations platform for charities', 'a support desk for our own customers'];
const roleDescs: Record<string, string[]> = {
	app: ['main application server', 'application server'],
	web: ['web server', 'front-end web server'],
	api: ['API server', 'public API server'],
	worker: ['background job worker', 'queue worker'],
	db: ['database server', 'main database'],
	ci: ['build server', 'CI runner'],
	batch: ['batch processing VM', 'nightly batch machine'],
	edge: ['public-facing proxy', 'edge proxy'],
	jobs: ['job runner', 'scheduled jobs VM'],
	mail: ['mail server'],
	k8s: ['first Kubernetes node'],
	ns: ['first nameserver']
};
const tried = ['We restarted the VM, which changed nothing.', 'I flushed the local cache with `resolvectl flush-caches`; no difference.', 'We checked the VM\'s disk and memory; both fine.', 'A reboot did not help.'];
const nodeChecks = [
	'Node side first: the forwarder is up and answering everyone else.',
	'Quick health check on {node} before anything else; nothing unusual.',
	'Node looks normal: service active, answering, SERVFAIL count in line with other nodes today.'
];
const testIntro: Record<string, string[]> = {
	NOERROR: ['I tried the same name from our own test VM on {node}, and it resolves there:', 'From our test VM on the same node it works:'],
	SERVFAIL: ['I tried the same name from our own test VM on {node}, and it fails there too:', 'Our test VM on {node} gets the same failure:'],
	NXDOMAIN: ['Our test VM on {node} gets NXDOMAIN as well:', 'I see the same from our own test VM on {node}:']
};
const dnsQuestions: [string, string][] = [
	['Unrelated: dig on our VMs shows the "ad" flag on some answers and not on others. Should we worry?', 'No. The upstreams set it when they could check the signatures of a signed domain; unsigned domains never get it.'],
	['Also, what are the TYPE65 lookups our local resolver logs? There are lots of them.', 'Those are HTTPS records, type 65, which recent browsers and some HTTP libraries ask for alongside A and AAAA. Harmless.'],
	['Side question: should we run a local cache on the VMs, or is 10.20.0.1 enough?', 'Either works. A local cache saves repeated lookups for busy applications, but the edge resolver is fine on its own.'],
	['Do you log our DNS queries, by the way?', 'Each node keeps a log of queries for troubleshooting, for a couple of weeks; it is described in our privacy notice.'],
	['Is there a second resolver address we should put in resolv.conf?', 'No, 10.20.0.1 is the only one. It is served on the node itself, so it is there whenever your VM is.'],
	['Will the resolver address change if a VM moves to another node?', 'No, it is 10.20.0.1 on every node.'],
	['Could we point our VMs at a public resolver instead?', 'You can, outbound DNS is not blocked, but the edge resolver keeps your lookups inside Pellmoor\'s network.'],
	['Does your resolver do DNSSEC?', 'The edge resolver relays queries and answers as they are; the upstream resolvers behind it validate DNSSEC.'],
	['Can we get the addresses of your upstream resolvers for our firewall rules?', 'You do not need them: your VMs only ever talk to 10.20.0.1, and the node does the rest.'],
	['What does SERVFAIL mean exactly, compared with NXDOMAIN?', 'SERVFAIL means the resolver could not get a usable answer, for example because the domain\'s nameservers failed or its signatures did not check out. NXDOMAIN is a definite "no such name".'],
	['Does Pellmoor offer DNS hosting for our own zones?', 'Not at the moment; most customers use their registrar or a DNS provider.'],
	['Our security scanner flags 10.20.0.1 as an open resolver. Is that a problem?', 'It only answers VMs on the node and cannot be reached from outside it, so it is not open in the sense the scanner means.'],
	['Can we see the query log for our own VMs ourselves?', 'Not as self-service; we can extract it on request from an account administrator.'],
	['Is EDNS supported?', 'Yes; queries and answers are relayed as they are, options included.']
];
const interim = [
	'A quick update: we can see the problem in our logs and are working out where it comes from. More soon.',
	'We are looking at this now. I will update the ticket when I know more.',
	'Quick note to say this is with me. I am going through the resolver logs for {node}.',
	'Thanks for the details so far. I am comparing what your VM sends with what reaches us; back to you shortly.',
	'Still on this. Nothing wrong with the node itself so far.'
];
const handoffs = ['Handing over to {agent2}. Waiting on edge DNS.', 'Shift change: {agent2} has this now. Customer has been told edge DNS is looking.', 'Off for the next few days; {agent2} is covering this one.'];
const greetings = ['Hi,', 'Hello,', 'Hi there,', 'Good morning,', 'Hello Pellmoor support,', 'Hi team,', ''];
const signoffs = ['Thanks,\n{first}', 'Regards,\n{full}\n{company}', 'Cheers, {first}', '{first}', 'Best,\n{full}', 'Thanks in advance,\n{full}', 'Kind regards,\n{full} | {company}'];
const urgency = ['This is affecting production, so a quick answer would be appreciated.', 'Not urgent, but it is annoying.', 'We have a release on {weekday}, so we would like this sorted before then.', 'Our customers are noticing.', 'Please treat this as high priority.', 'No rush, but I would like to understand it.'];
const acks = ['Thanks for getting in touch, {first}.', 'Hi {first}, thanks for the details.', 'Thank you for reporting this.', 'Hello {first},', 'Hi {first},', 'Thanks for the clear description, {first}.'];
const handover = [
	'I have passed this to our edge DNS team, who run the resolver on the nodes. They will reply here.',
	'I have escalated this to the team that looks after DNS on the edge nodes; they can see more than I can.',
	'This needs someone from our edge DNS team, so I have moved it to them. You will hear from them on this ticket.',
	'I have asked our edge DNS engineers to take a look. They can check the resolver logs on {node} directly.'
];
const checks = ['other names resolve from the same VM', 'no incident open for the node', 'customer\'s output is in the thread', 'nothing on the status page', 'not seen any similar tickets this week', 'customer has restarted the VM once already', 'VM shows healthy in the panel'];
const engIntro = ['Hi {first}, I am {engFirst} from the edge DNS team.', 'Hello {first}, {engFirst} here; I look after the resolver on the edge nodes.', 'Hi {first},', 'Hello {first}, thanks for your patience.', 'Hi {first}, {engFirst} from edge DNS, picking this up.'];
const lookOpen = ['Looking at this.', 'Picked up.', 'Taking this one.', 'Had a look on {node}.', ''];
const chase = ['Any news?', 'Hi, is there an update on this?', 'This is still happening. Can someone look, please?', 'Following up on this one.', 'Hello? We are still affected.', 'Any progress? My manager is asking.'];
const chaseReply = ['Sorry for the wait, {first}. The team is on it and I will update you as soon as I hear.', 'I have chased the edge DNS team; they are looking at it today.', 'Apologies for the silence. An engineer is investigating and will post here directly.', 'Thanks for your patience. The team has found something and is checking it now.'];
const closes = ['I will close this ticket now. If anything else comes up, reply here and it will reopen.', 'Glad it is working. Closing this one.', 'Great, thanks for confirming. I am closing the ticket.', 'Thanks for letting us know. Marking this as solved.'];
const autocloses = ['We have not heard back since {last}, so I am closing this ticket. Replying to it reopens it.', 'Closing: no reply since {last}. If you still need help, reply and we will pick it up again.', 'As we have had no answer since {last}, this ticket is now closed. Just reply if the problem comes back.'];
const thanks = ['Thanks for your help.', 'Brilliant, thank you.', 'Thanks all, much appreciated.', 'Cheers for sorting this.', 'Thank you, that was quick work once it reached the right people.', 'Many thanks.'];
const confirmAsks = ['Could you check from {vm} and let us know?', 'Could you try again from {vm} and confirm?', 'Please check on your side and tell us whether it works.'];
const nudges = ['Hi {first}, could you confirm whether this is sorted now?', 'Hi {first}, just checking: is it working for you now?', 'Hello {first}, did that solve it?'];
const waitNudges = ['Hi {first}, just checking in on this one. We are waiting to hear from you before we can go further.', 'Hello {first}, a gentle reminder that we need your reply to carry on.', 'Hi {first}, is there any news on your side?'];
const owedReplies = ['OK, thanks. Please keep us posted.', 'Understood. Any idea when?', 'Fine. Please let us know as soon as there is news.', 'Thanks for explaining. We will wait for your update.'];
const owedUpdates = ['No date yet, I am afraid, but this ticket stays open and you will hear here first.', 'Nothing to report yet; it is still on the list. I will update this ticket when it moves.', 'Still open on our side. I have asked for a date and will pass it on.'];
const stillFailing = ['It still fails from the VMs, though.', 'Is there anything to do on your side?', 'The VMs still get the old answer.', 'Outside it works already; the VMs not yet.'];
const sides: [string, string][] = [
	['Unrelated, but while I have you: our invoice for {month} shows two charges for the backup add-on. Could someone look?', 'I have passed the invoice question to billing; they will email you separately.'],
	['Also, can we move {vm} to a bigger plan?', 'Yes, you can resize it in the panel under the VM\'s settings. It needs a restart of the VM, which you can schedule.'],
	['One more thing: is IPv6 available on our plan?', 'Yes, IPv6 can be enabled for the VM\'s network in the panel, at no extra cost.'],
	['Separate question: can two people share the panel login, or do we need seats?', 'Each person should have their own login; you can invite colleagues under Team in the panel.'],
	['By the way, the panel\'s console button gives a blank page in Firefox.', 'Thanks, I have reported the console problem to the panel team.'],
	['Do you have a data processing agreement we can sign?', 'Yes, it is under Account › Legal in the panel.'],
	['Could you also tell me which data centre {node} is in?', '{node} is in our {city} site.'],
	['Is there a way to get an alert when a VM runs out of disk?', 'Not built in yet; most customers use their own monitoring agent for that.'],
	['And can we get our VMs\' backups copied to a second site?', 'Off-site copies are an option on the Business and Dedicated plans; I can send you the details.']
];
const colleagueNotes = ['Adding to what {first} wrote:', 'Jumping in here, I am {first}\'s colleague.', 'One more detail from our side:', 'For what it is worth:'];

// ---------------------------------------------------------------------------------------------------------------
// One ticket.

type Who = 'customer' | 'colleague' | 'support' | 'support-note' | 'eng' | 'eng-note' | 'rp-note' | 'net' | 'net-note';

const ticket = (index: number, topic: Topic, number: number, opened: number): string => {
	const r = mulberry32(0x7e1c0000 + index * 104729);
	const s = slotsFor(r, opened, topic.role);
	s.month = MONTHS[day(opened).getUTCMonth() - 1]!;
	s.product = pick(r, products);
	s.roledesc = pick(r, roleDescs[s.vm!.split('-')[1]!]!);
	s.agent2 = pick(r, agents.filter((name) => name !== s.agent));
	const f = (text: string) => fill(text, s);

	let outcome = topic.outcomes[(index * 3 + int(r, 0, topic.outcomes.length - 1)) % topic.outcomes.length]!;
	if (outcome === 'unconfirmed' && !topic.fix && !topic.did) outcome = 'confirmed';
	if (outcome === 'workaround' && !topic.around) outcome = 'confirmed';
	if (outcome === 'owed' && !topic.owe) outcome = 'confirmed';
	if (outcome === 'waiting' && !topic.ask) outcome = topic.owe ? 'owed' : 'confirmed';
	if (outcome === 'confirmed' && !topic.done) outcome = topic.owe ? 'owed' : 'waiting';
	if (opened > LAST_DAY - 12 && outcome === 'silent') outcome = topic.ask ? 'waiting' : topic.owe ? 'owed' : 'confirmed';

	// The clock of the thread: a day offset and a minute of the day.
	let dayAt = opened;
	let minute = int(r, 7 * 60, 18 * 60);
	const move = (kind: 'soon' | 'later' | 'days', most = 3) => {
		if (kind === 'days' && dayAt < LAST_DAY) {
			dayAt = Math.min(LAST_DAY, dayAt + int(r, 1, most));
			minute = int(r, 8 * 60, 17 * 60);
			return;
		}
		minute += kind === 'soon' ? int(r, 12, 110) : int(r, 90, 330);
		if (minute > 22 * 60) {
			if (dayAt < LAST_DAY) {
				dayAt++;
				minute = int(r, 8 * 60, 11 * 60);
			} else minute = Math.min(minute, 23 * 60 + 50);
		}
	};
	const messages: string[] = [];
	let escalated = opened;
	const authors: Record<Who, () => string> = {
		customer: () => `**${s.full}** (${s.company})`,
		colleague: () => `**${s.colleague}** (${s.company})`,
		support: () => `**${s.agent}** (Pellmoor support)`,
		'support-note': () => `**${s.agent}** (Pellmoor support, internal note)`,
		eng: () => `**${s.eng}** (Pellmoor edge DNS)`,
		'eng-note': () => `**${s.eng}** (Pellmoor edge DNS, internal note)`,
		'rp-note': () => `**${s.rp}** (Pellmoor resolver platform, internal note)`,
		net: () => `**${s.net}** (Pellmoor network team)`,
		'net-note': () => `**${s.net}** (Pellmoor network team, internal note)`
	};
	const say = (who: Who, parts: string[]) => {
		const body = parts.filter((part) => part.trim() !== '').join('\n\n');
		messages.push(`${authors[who]()} · ${stampOf(dayAt, minute)}\n\n${body}`);
	};
	const sign = () => f(pick(r, signoffs));
	let engIntroduced = false;
	const engHello = () => {
		if (engIntroduced) return f(pick(r, ['Hi {first},', 'Hello {first},', '{first},', '']));
		engIntroduced = true;
		return f(pick(r, engIntro));
	};

	// 1. The customer's first message.
	const more = shuffle(r, topic.more).slice(0, int(r, 0, 2));
	const pasteFirst = topic.paste && r() < 0.75;
	const background = r() < 0.7 ? f(pick(r, backgrounds)) : '';
	const backgroundFirst = r() < 0.5;
	say('customer', [
		f(pick(r, greetings)),
		backgroundFirst ? background : '',
		f(pick(r, topic.open)),
		backgroundFirst ? '' : background,
		...more.map(f),
		r() < 0.45 ? f(pick(r, tried)) : '',
		r() < 0.4 ? f(pick(r, urgency)) : '',
		pasteFirst ? pick(r, ['Output:', 'Here is what I see:', 'For reference:', 'From the VM:', '']) : '',
		pasteFirst ? topic.paste!(r, s, opened) : '',
		logs[topic.key] && r() < 0.65 ? `${pick(r, ['From our app\'s log:', 'The app logs this:', 'Errors from the application:', 'Our logs:'])}\n\n${appLog(r, s, opened, f(logs[topic.key]![1]), logs[topic.key]![0], int(r, 3, 7))}` : '',
		sign()
	]);

	// 2. First line support.
	move('soon');
	const test = tests[topic.key];
	let testPaste = '';
	if (test && r() < 0.7) {
		const [name, status, address] = test;
		const q = f(name);
		testPaste = `${f(pick(r, testIntro[status]!))}\n\n${
			status === 'NOERROR'
				? fence([`$ dig +short ${q}`, f(address!)])
				: fence([`$ dig +noall +comments ${q} | grep status`, `;; ->>HEADER<<- opcode: QUERY, status: ${status}, id: ${int(r, 1024, 65535)}`])
		}`;
	}
	say('support', [f(pick(r, acks)), f(pick(r, topic.guess)), testPaste, f(topic.probe), f(pick(r, ['Best regards,\n{agentFirst}', 'Thanks,\n{agentFirst}', '{agentFirst}, Pellmoor support', 'Kind regards,\n{agent}']))]);

	// 3. The customer answers, sometimes with a colleague's note or a side question.
	move(r() < 0.6 ? 'later' : 'days', 2);
	const side = r() < 0.55 ? pick(r, sides) : undefined;
	const leftover = topic.more.filter((line) => !more.includes(line));
	if (leftover.length && r() < 0.3) {
		say('colleague', [f(pick(r, colleagueNotes)), f(pick(r, leftover)), f(pick(r, ['{colleague}', 'Thanks,\n{colleague}']))]);
		move('soon');
	}
	const secondPaste = topic.paste2 ? topic.paste2(r, s, opened) : topic.paste && !pasteFirst ? topic.paste(r, s, opened) : '';
	say('customer', [f(pick(r, topic.reply)), secondPaste, side ? f(side[0]) : '', f(pick(r, ['{first}', 'Thanks,\n{first}', 'Cheers', '']))]);

	// 4. Support hands over.
	move('soon');
	say('support', [side ? f(side[1]) : '', f(pick(r, handover)), f(pick(r, ['{agentFirst}', 'Thanks,\n{agentFirst}', '']))]);
	move('soon');
	escalated = dayAt;
	say('support-note', [`${pick(r, ['Escalating to edge DNS.', 'For edge DNS:', 'Passing to edge DNS.', 'Edge DNS, please take a look.'])} ${f(topic.brief)} VM ${f('{vm} ({ip})')}. ${pick(r, ['First-line checks', 'Checked so far', 'Done on our side'])}: ${shuffle(r, checks).slice(0, int(r, 1, 3)).join('; ')}.`]);

	if (r() < 0.25) {
		move('later');
		say('support-note', [f(pick(r, handoffs))]);
	}

	// 5. The edge DNS engineer looks.
	move(r() < 0.5 ? 'later' : 'days', 2);
	if (r() < 0.5) {
		const lines = int(r, 900000, 2600000);
		say('eng-note', [
			f(pick(r, nodeChecks)),
			fence(['$ systemctl is-active edge-resolver', 'active', `$ wc -l < /var/log/edge-resolver/queries.jsonl`, String(lines), `$ grep -c '"rcode": "SERVFAIL"' /var/log/edge-resolver/queries.jsonl`, String(Math.floor(lines * (0.001 + r() * 0.004)))])
		]);
		move('soon');
	}
	say('eng-note', [f(pick(r, lookOpen)), f(pick(r, topic.look)), topic.evidence ? f(pick(r, ['On {node}:', 'From the node:', 'Details:', ''])) : '', topic.evidence ? topic.evidence(r, s, dayAt) : '']);

	// 6. A lead that goes nowhere, now and then.
	if (topic.lead && r() < 0.7) {
		const [hypothesis, answer, ruledOut] = topic.lead;
		move('soon');
		if (answer) {
			say('eng', [engHello(), f(hypothesis)]);
			move('later');
			say('customer', [f(answer), f(pick(r, ['{first}', '']))]);
			move('soon');
			say('eng-note', [f(ruledOut)]);
		} else {
			say('eng-note', [f(hypothesis)]);
			move('soon');
			say('eng-note', [f(ruledOut)]);
		}
	}

	if (r() < 0.55) {
		move('soon');
		say('eng', [engHello(), f(pick(r, interim))]);
	}
	const questions = shuffle(r, dnsQuestions).slice(0, r() < 0.65 ? (r() < 0.3 ? 2 : 1) : 0);
	for (const [question, answer] of questions) {
		move('later');
		say('customer', [f(pick(r, ['While you look into it:', 'Another thing, not urgent:', 'Something else I have been meaning to ask:', 'And one more:', ''])), f(question)]);
		move('soon');
		say(r() < 0.5 ? 'support' : 'eng', [f(answer)]);
	}

	// 7. The customer chases, sometimes.
	if (r() < 0.5) {
		move('days', 2);
		say('customer', [f(pick(r, chase))]);
		move('soon');
		say('support', [f(pick(r, chaseReply))]);
	}

	// 8. The finding.
	move('later');
	const foundWho: Who = topic.foundBy === 'rp' ? 'rp-note' : topic.foundBy === 'net' ? 'net-note' : 'eng-note';
	say(foundWho, [f(pick(r, topic.found)), topic.evidence2 ? topic.evidence2(r, s, dayAt) : '']);

	// 9. The explanation to the customer, and how the ticket ended.
	move('soon');
	const explainWho: Who = topic.explainBy === 'net' ? 'net' : 'eng';
	const hello = explainWho === 'net' ? f('Hello {first}, {netFirst} from the network team here.') : engHello();
	const explanation = f(pick(r, topic.explain)) + (topic.explainPaste ? `\n\n${topic.explainPaste(r, s, dayAt)}` : '');
	const followUp = () => {
		const pairs = follows[topic.key];
		if (!pairs || r() >= 0.85) return;
		for (const [question, answer] of shuffle(r, pairs).slice(0, r() < 0.3 ? 2 : 1)) {
			move('later');
			say('customer', [f(pick(r, ['Thanks, that makes sense. One question:', 'Thanks for explaining.', 'OK, understood.', 'Thanks.', 'Another question, if I may:'])), f(question)]);
			move('soon');
			say(explainWho, [f(answer)]);
		}
	};
	const close = () => {
		move('soon');
		say('support', [f(pick(r, closes))]);
	};
	const autoclose = () => {
		const last = longDate(dayAt);
		if (dayAt + 8 > LAST_DAY) return;
		dayAt = Math.min(LAST_DAY, dayAt + int(r, 8, 14));
		minute = int(r, 8 * 60, 17 * 60);
		say('support', [fill(pick(r, autocloses), { ...s, last })]);
	};

	if (outcome === 'confirmed') {
		say(explainWho, [hello, explanation, topic.fix ? `${cap(f(`we have ${topic.fix}.`))} ${f(pick(r, confirmAsks))}` : '']);
		followUp();
		move(r() < 0.5 ? 'later' : 'days', 2);
		say('customer', [f(pick(r, topic.done!)), f(pick(r, thanks)), f(pick(r, ['{first}', '']))]);
		close();
	} else if (outcome === 'unconfirmed') {
		if (topic.fix) {
			say(explainWho, [hello, explanation, `${cap(f(`we have ${topic.fix}.`))} ${f(pick(r, confirmAsks))}`]);
			followUp();
		} else {
			say(explainWho, [hello, explanation]);
			followUp();
			move('later');
			say('customer', [f(`Thanks. I have ${topic.did} and will check from the VMs {later}.`), f(pick(r, ['{first}', '']))]);
		}
		move('days', 3);
		say('support', [f(pick(r, nudges))]);
		autoclose();
	} else if (outcome === 'workaround') {
		say(explainWho, [hello, explanation, `${topic.aroundLead ?? 'In the meantime,'} ${f(topic.around!)}.`.replace(/^(.)/, (c) => c.toUpperCase())]);
		followUp();
		move(r() < 0.5 ? 'later' : 'days', 2);
		say('customer', [f(topic.aroundOk ? pick(r, topic.aroundOk) : 'That works for us for now.'), f(pick(r, ['{first}', 'Thanks,\n{first}', '']))]);
		if (r() < 0.6) close();
	} else if (outcome === 'owed') {
		if (topic.oweAfter && topic.did) {
			say(explainWho, [hello, explanation]);
			followUp();
			move(r() < 0.5 ? 'later' : 'days', 2);
			say('customer', [f(`Thanks. I have ${topic.did}.`), f(pick(r, stillFailing)), f(pick(r, ['{first}', '']))]);
			move('soon');
			say('eng', [f(pick(r, ['Thanks, {first}.', 'Good, thank you.', 'Great.'])), f(`We will ${topic.owe}.`)]);
		} else {
			say(explainWho, [hello, explanation, f(`On our side, we will ${topic.owe}. I will keep this ticket open until then.`)]);
			followUp();
			move('later');
			say('customer', [f(pick(r, owedReplies))]);
			if (r() < 0.6) {
				move('days', 4);
				say('customer', [f(pick(r, chase))]);
				move('soon');
				say('support', [f(pick(r, owedUpdates))]);
			}
		}
	} else if (outcome === 'waiting') {
		say(explainWho, [hello, explanation, f(`Could you ${topic.ask}?`)]);
		followUp();
		if (r() < 0.6) {
			move('days', 4);
			say('support', [f(pick(r, waitNudges))]);
		}
	} else {
		say(explainWho, [hello, explanation, topic.ask ? f(`Could you ${topic.ask}?`) : '']);
		move('days', 3);
		say('support', [f(pick(r, waitNudges))]);
		autoclose();
	}

	const sizes = ['1 vCPU / 2 GB', '2 vCPU / 4 GB', '4 vCPU / 8 GB', '8 vCPU / 16 GB', '16 vCPU / 64 GB'];
	const images = ['Ubuntu 24.04', 'Ubuntu 22.04', 'Debian 12', 'Ubuntu 24.04', 'Rocky Linux 9'];
	const vmRows = [
		[s.vm!, s.node!, s.ip!, s.pubip!, pick(r, sizes), topic.key === 'oldres' ? 'custom (imported)' : topic.key === 'coredns' ? 'Ubuntu 24.04' : pick(r, images)],
		[s.vm2!, s.node!, s.ip2!, ip198(r), pick(r, sizes), topic.key === 'coredns' ? 'Ubuntu 24.04' : pick(r, images)]
	];
	const prefix = s.vm!.split('-')[0]!;
	for (const role of shuffle(r, roles).slice(0, int(r, 0, 4))) {
		const name = `${prefix}-${role}-${pad(int(r, 1, 9))}`;
		if (vmRows.some((row) => row[0] === name)) continue;
		const elsewhere = r() < 0.3;
		vmRows.push([name, elsewhere ? `edge-${pick(r, nodes)[0]}-${pad(int(r, 1, 14))}` : s.node!, `10.20.${int(r, 1, 254)}.${int(r, 2, 250)}`, ip198(r), pick(r, sizes), pick(r, images)]);
	}
	const account = ['| VM | Node | Private address | Public address | Size | Image |', '| --- | --- | --- | --- | --- | --- |', ...vmRows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
	const subject = f(pick(r, topic.subjects));
	const channel = pick(r, ['email', 'email', 'the panel\'s contact form', 'chat']);
	const header = [
		`# PH-${number}: ${subject}`,
		'',
		`Customer: ${s.company} (account ${s.acct}, ${s.plan} plan) · contact: ${s.full}`,
		`About: ${s.vm} (${s.ip}) on ${s.node}`,
		`Opened ${longDate(opened)} 2026 by ${channel} · escalated to edge DNS on ${longDate(escalated)}`
	].join('\n');
	return `${header}\n\n${account}\n\n---\n\n${messages.join('\n\n---\n\n')}\n`;
};

// ---------------------------------------------------------------------------------------------------------------
// Which topic each ticket has: the weights shared out over ITEMS by largest remainder, then shuffled once.

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const shares = topics.map((topic) => (topic.weight * ITEMS) / totalWeight);
const counts = shares.map(Math.floor);
const byRemainder = shares.map((share, i) => ({ i, rest: share - Math.floor(share) })).sort((a, b) => b.rest - a.rest || a.i - b.i);
for (let k = 0; counts.reduce((a, b) => a + b, 0) < ITEMS; k++) counts[byRemainder[k % topics.length]!.i]!++;
const order = shuffle(mulberry32(20261119), topics.flatMap((topic, i) => Array.from({ length: counts[i]! }, () => topic)));

const folder = join(root, 'docs', 'tickets');
mkdirSync(folder, { recursive: true });
const numbers = mulberry32(48211);
let number = 48210;
order.forEach((topic, index) => {
	number += int(numbers, 3, 41);
	const opened = FIRST_OPEN + Math.floor((index * (LAST_OPEN - FIRST_OPEN + 1)) / ITEMS);
	writeFileSync(join(folder, `PH-${number}.md`), ticket(index, topic, number, opened));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Escalated DNS tickets\n\nThe ${ITEMS} tickets that Pellmoor support escalated to the edge DNS team between ${longDate(FIRST_OPEN)} and ${longDate(LAST_OPEN)} 2026, one\nfile each, exported from the helpdesk on 19 November 2026 with their whole thread, internal notes included.\nThe export keeps the subject and the messages; it drops tags, statuses and assignees. Pasted output is as its\nwriter pasted it.\n`
);
