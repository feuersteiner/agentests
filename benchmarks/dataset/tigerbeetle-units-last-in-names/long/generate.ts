// Writes the long material of this entry's long task: the upload problems that the Tallowmere photo desk reported to
// desk tools between 7 September and 13 November 2026, one Markdown file each, under docs/desk-reports/, as the old
// desk tools form exported them, without labels or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many reports to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 200;

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

// Time is kept in minutes since 00:00 on 1 September 2026, UK local time.
const EPOCH = Date.UTC(2026, 8, 1);
const DAY = 1440;
const LAST_MESSAGE = 80 * DAY + 17 * 60; // Friday 20 November, 17:00
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const dayMonth = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!}`;
const shortDayMonth = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}`;
const stampShort = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${shortDayMonth(minutes)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${weekday(minutes)} ${dayMonth(minutes)} 2026, ${clock(minutes)}`;
const iso = (minutes: number) => at(minutes).toISOString().slice(0, 10);
const isoTime = (minutes: number, seconds: number) => `${iso(minutes)}T${clock(minutes)}:${pad(seconds % 60)}.${pad(Math.floor(seconds * 7.3) % 1000, 3)}Z`;
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
const minuteOfDay = (minutes: number) => ((minutes % DAY) + DAY) % DAY;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
/** The next working day after `minutes`, by name. */
const nextWorkday = (minutes: number) => {
	let m = startOfDay(minutes) + DAY;
	while (isWeekend(m)) m += DAY;
	return weekday(m);
};
/** Desk tools, Depot, IT and the network team work 08:30 to 18:00 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 18 * 60) m = startOfDay(m) + DAY + 8 * 60 + 30 + int(r, 0, 80);
	if (minuteOfDay(m) < 8 * 60 + 30) m = startOfDay(m) + 8 * 60 + 30 + int(r, 0, 80);
	while (isWeekend(m)) m += DAY;
	return m;
};
/** Photographers and the picture desk write at any hour between 06:30 and midnight, weekends included. */
const waking = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 23 * 60 + 40) m = startOfDay(m) + DAY + 6 * 60 + 40 + int(r, 0, 150);
	if (minuteOfDay(m) < 6 * 60 + 30) m = startOfDay(m) + 6 * 60 + 40 + int(r, 0, 150);
	return m;
};

// The camera each photographer uses, which sets the names and sizes of the raw files on the card.
interface Kit {
	camera: string;
	ext: string;
	prefix: string;
	folder: string;
	volume: string;
	/** Raw file sizes on this camera, in decimal megabytes. */
	mbLow: number;
	mbHigh: number;
}
const kits: Record<string, Kit> = {
	r5: { camera: 'Canon EOS R5', ext: 'CR3', prefix: 'IMG_', folder: '100EOSR5', volume: 'EOS_DIGITAL', mbLow: 38, mbHigh: 53 },
	r3: { camera: 'Canon EOS R3', ext: 'CR3', prefix: 'IMG_', folder: '100EOSR3', volume: 'EOS_DIGITAL', mbLow: 22, mbHigh: 31 },
	r6: { camera: 'Canon EOS R6 Mark II', ext: 'CR3', prefix: 'IMG_', folder: '100EOSR6', volume: 'EOS_DIGITAL', mbLow: 24, mbHigh: 33 },
	z9: { camera: 'Nikon Z9', ext: 'NEF', prefix: 'DSC_', folder: '100NCZ_9', volume: 'Untitled', mbLow: 24, mbHigh: 37 },
	a1: { camera: 'Sony A1', ext: 'ARW', prefix: 'DSC', folder: '100MSDCF', volume: 'Untitled', mbLow: 44, mbHigh: 51 },
	xh2: { camera: 'Fujifilm X-H2', ext: 'RAF', prefix: 'DSCF', folder: '100_FUJI', volume: 'Untitled', mbLow: 49, mbHigh: 62 }
};

// People. Photographers report most problems; the picture desk, Depot and the freelancers report the rest.
type Desk = 'sport' | 'news' | 'features';
interface Person {
	full: string;
	user: string;
	desk: Desk;
	kit: string;
	laptop: string;
	/** A custom file prefix set in the camera, in place of the maker's own. */
	prefix?: string;
	free?: boolean;
	windows?: boolean;
}
const photographers: Person[] = [
	{ full: 'Ruth Hughes', user: 'rhughes', desk: 'sport', kit: 'r3', laptop: 'DL-07', prefix: 'RHU_' },
	{ full: 'Tobias Wren', user: 'twren', desk: 'sport', kit: 'z9', laptop: 'DL-03' },
	{ full: 'Kalinda Shaw', user: 'kshaw', desk: 'sport', kit: 'r3', laptop: 'DL-11' },
	{ full: 'Declan Moyo', user: 'dmoyo', desk: 'sport', kit: 'a1', laptop: 'DL-05' },
	{ full: 'Rhys Talbot', user: 'rtalbot', desk: 'sport', kit: 'r5', laptop: 'DL-13', prefix: 'RT5_' },
	{ full: 'Gideon Faulkner', user: 'gfaulkner', desk: 'news', kit: 'r5', laptop: 'DL-02' },
	{ full: 'Sunita Rao', user: 'srao', desk: 'news', kit: 'r6', laptop: 'DL-09', prefix: 'SR6_' },
	{ full: 'Callum Breck', user: 'cbreck', desk: 'news', kit: 'r5', laptop: 'DL-14' },
	{ full: 'Petra Lindgren', user: 'plindgren', desk: 'news', kit: 'z9', laptop: 'DL-12' },
	{ full: 'Wes Adeyemi', user: 'wadeyemi', desk: 'news', kit: 'r5', laptop: 'DL-06' },
	{ full: 'Nell Okoye', user: 'nokoye', desk: 'news', kit: 'r6', laptop: 'DL-15' },
	{ full: 'Isolde Marsh', user: 'imarsh', desk: 'features', kit: 'xh2', laptop: 'DL-04' },
	{ full: 'Hamish Doyle', user: 'hdoyle', desk: 'features', kit: 'r5', laptop: 'DL-01' },
	{ full: 'Yara Haddad', user: 'yhaddad', desk: 'features', kit: 'a1', laptop: 'DL-10' },
	{ full: 'Felix Brandt', user: 'fbrandt', desk: 'features', kit: 'r6', laptop: 'DL-08' },
	{ full: 'Josie Kettering', user: 'josie', desk: 'sport', kit: 'r6', laptop: 'Josies-MacBook-Air', free: true },
	{ full: 'Anouk de Vries', user: 'anouk', desk: 'features', kit: 'xh2', laptop: 'Anouks-MBP', free: true },
	{ full: 'Marco Bellini', user: 'marco', desk: 'news', kit: 'z9', laptop: 'MARCO-XPS', free: true, windows: true },
	{ full: 'Dara Quigley', user: 'dara', desk: 'sport', kit: 'r6', laptop: 'DARA-SURFACE', free: true, windows: true }
];
const editors: Record<Desk | 'night', string> = { sport: 'Bea Fontaine', news: 'Rafael Ortiz', features: 'Clare Ashdown', night: 'Mei Lin Tan' };
const editorRoles: Record<string, string> = { 'Bea Fontaine': 'sport picture editor', 'Rafael Ortiz': 'deputy picture editor', 'Clare Ashdown': 'picture editor', 'Mei Lin Tan': 'night picture editor' };
const deskTools = ['Nadia Brennan', 'Jonah Okafor'];
const depotTeam = ['Halvard Moe', 'Priya Raman'];
const itDesk = ['Gwen Hollis', 'Marcus Bell'];
const network = 'Stuart Achterberg';
const video = 'Femi Oduya';
const first = (full: string) => full.split(' ')[0]!;

// Assignments, with where the photographer was when they sent the pictures.
type Conn = 'studio' | 'press' | 'mobile' | 'hotel' | 'home';
interface Job {
	job: string;
	place: string;
	slug: string;
	conn: Conn;
}
const jobs: Record<Desk, Job[]> = {
	sport: [
		{ job: 'Kesterford Town v Harlow Rovers', place: 'Brackley Road', slug: 'kesterford-harlow', conn: 'press' },
		{ job: 'the county cricket final', place: 'Sandmere', slug: 'cricket-final', conn: 'mobile' },
		{ job: 'the Kesterford half marathon', place: 'the river path', slug: 'half-marathon', conn: 'mobile' },
		{ job: 'the boxing night', place: 'the Corn Exchange', slug: 'boxing', conn: 'press' },
		{ job: 'the rugby at Wexcombe Park', place: 'Wexcombe Park', slug: 'wexcombe-rugby', conn: 'press' },
		{ job: 'the women’s cup tie', place: 'Brackley Road', slug: 'womens-cup', conn: 'press' },
		{ job: 'the cyclocross', place: 'Furzedown Common', slug: 'cyclocross', conn: 'mobile' },
		{ job: 'the county swimming championships', place: 'Tidewater pool', slug: 'swimming', conn: 'press' }
	],
	news: [
		{ job: 'the sentencing at the Crown Court', place: 'the Crown Court', slug: 'crown-court', conn: 'mobile' },
		{ job: 'the warehouse fire on Mill Lane', place: 'Mill Lane', slug: 'mill-lane-fire', conn: 'mobile' },
		{ job: 'the floods at Harrowby', place: 'Harrowby', slug: 'harrowby-floods', conn: 'mobile' },
		{ job: 'the council budget protest', place: 'the Guildhall', slug: 'budget-protest', conn: 'mobile' },
		{ job: 'the by-election count', place: 'the leisure centre', slug: 'by-election', conn: 'press' },
		{ job: 'the royal visit to St Anselm’s', place: 'St Anselm’s hospital', slug: 'royal-visit', conn: 'press' },
		{ job: 'the bus drivers’ strike', place: 'the bus depot', slug: 'bus-strike', conn: 'mobile' },
		{ job: 'the Wharf Bridge closure', place: 'Wharf Bridge', slug: 'wharf-bridge', conn: 'studio' }
	],
	features: [
		{ job: 'the chef portraits for the food supplement', place: 'the studio', slug: 'chef-portraits', conn: 'studio' },
		{ job: 'the dress rehearsal at the Lyceum', place: 'the Lyceum', slug: 'lyceum-rehearsal', conn: 'press' },
		{ job: 'the autumn gardens piece', place: 'Hartwell Gardens', slug: 'hartwell-gardens', conn: 'home' },
		{ job: 'the shows at London Fashion Week', place: 'the hotel in London', slug: 'fashion-week', conn: 'hotel' },
		{ job: 'the makers’ market', place: 'the Corn Exchange', slug: 'makers-market', conn: 'home' },
		{ job: 'the lifeboat crew portraits', place: 'the lifeboat station at Saltby', slug: 'lifeboat-crew', conn: 'mobile' }
	]
};
/** Upload speeds in megabits a second for each kind of connection. */
const uplinkMbit: Record<Conn, [number, number]> = { studio: [160, 320], press: [12, 60], mobile: [6, 24], hotel: [4, 18], home: [14, 42] };
const sitters = [
	['Zoë Lindqvist', 'ë'],
	['Séverine Okafor', 'é'],
	['Jürgen Pohl', 'ü'],
	['Åsa Berg', 'Å'],
	['Siân Pritchard', 'â'],
	['Chloé Marchetti', 'é'],
	['Ramón Ibáñez', 'ó']
] as const;
const ampersandJobs = [
	{ job: 'the A&E winter pressures piece', place: 'St Anselm’s hospital', tag: 'A&E', rest: 'StAnselms' },
	{ job: 'the fire at the B&Q warehouse', place: 'Mill Lane', tag: 'B&Q', rest: 'MillLane' },
	{ job: 'the P&O ferry walkout', place: 'Saltby harbour', tag: 'P&O', rest: 'Saltby' },
	{ job: 'the M&S closure on the high street', place: 'the high street', tag: 'M&S', rest: 'HighSt' }
];

// What a report holds besides prose: terminal sessions, tracebacks, Depot's console and logs, speed tests.
interface Shot {
	name: string;
	bytes: number;
}
interface Ctx {
	r: Rand;
	who: Person;
	kit: Kit;
	shots: Shot[];
	job: Job;
	conn: Conn;
	mbit: number;
	open: number;
	home: string;
	lib: string;
	src: string;
	prompt: string;
	tokenTail: string;
	upload: string;
	editor: string;
	values: Record<string, string>;
}
const MIB = 1024 * 1024;
/** Sizes as the uploader's summary and Depot's console print them. */
const human = (sizeBytes: number) =>
	sizeBytes >= 1024 ** 3 ? `${(sizeBytes / 1024 ** 3).toFixed(1)} GiB` : sizeBytes >= MIB ? `${(sizeBytes / MIB).toFixed(1)} MiB` : sizeBytes >= 1024 ? `${(sizeBytes / 1024).toFixed(1)} KiB` : `${sizeBytes} B`;
const chunksOf = (sizeBytes: number) => Math.max(1, Math.ceil(sizeBytes / (8 * MIB)));
const block = (text: string, lang = 'text') => '```' + lang + '\n' + text.replace(/\n+$/, '') + '\n```';
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const uploadId = (r: Rand) => `u_${hex(r, 6)}`;

const makeShots = (r: Rand, kit: Kit, prefix: string, count: number, frameStart?: number): Shot[] => {
	let frame = frameStart ?? int(r, 40, 9600 - count * 2);
	const list: Shot[] = [];
	for (let i = 0; i < count; i++) {
		frame += r() < 0.82 ? 1 : int(r, 2, 7);
		// Cameras count from 0001 to 9999 and then start again at 0001.
		const wrapped = ((frame - 1) % 9999) + 1;
		const name = kit.ext === 'ARW' ? `DSC${pad(wrapped, 5)}.ARW` : `${prefix}${pad(wrapped, 4)}.${kit.ext}`;
		list.push({ name, bytes: Math.round((kit.mbLow + r() * (kit.mbHigh - kit.mbLow)) * 1e6) });
	}
	return list;
};

/** The command line the photographer ran, with however they set their Depot token. */
const command = (c: Ctx, args = `${c.src}/*.${c.kit.ext}`) => {
	if (c.who.windows) return `PS C:\\Users\\${c.who.user}\\depot-uploader> $env:DEPOT_TOKEN = "dpt_live_••••••••"\nPS C:\\Users\\${c.who.user}\\depot-uploader> python -m uploader.cli (Get-ChildItem ${args.replace(/\//g, '\\')})`;
	const style = (c.who.user.length + c.open) % 3;
	if (style === 0) return `${c.prompt}DEPOT_TOKEN=$(cat ~/.depot-token) python3 -m uploader.cli ${args}`;
	if (style === 1) return `${c.prompt}export DEPOT_TOKEN=dpt_live_••••••••\n${c.prompt}python3 -m uploader.cli ${args}`;
	return `${c.prompt}python3 -m uploader.cli ${args}`;
};

const summaryLines = (c: Ctx, files: Shot[], mbit: number, retried: number[] = []) => {
	const r = c.r;
	let seconds = 0;
	const lines = files.map((file, i) => {
		const retries = retried.includes(i) ? int(r, 1, 3) : 0;
		seconds += (file.bytes * 8) / (mbit * 1e6) + 0.35 + r() * 0.5 + retries * (0.5 + r() * 3);
		return `  ${file.name}: ${human(file.bytes)} in ${chunksOf(file.bytes)} chunk(s), ${retries} retries`;
	});
	const total = files.reduce((sum, file) => sum + file.bytes, 0);
	return { head: `Uploaded ${files.length} file(s), ${human(total)}, in ${seconds.toFixed(1)} s`, lines, seconds };
};
const cutNotes = [
	'(I’ve cut the rest, it carries on like that down to {last}.)',
	'(cut, the other {more} lines look the same)',
	'(and so on for the rest of the card)',
	'(snipped — {more} more files, all 0 retries)'
];
const summaryPaste = (c: Ctx, files = c.shots, mbit = c.mbit, retried: number[] = []) => {
	const { head, lines } = summaryLines(c, files, mbit, retried);
	const keep = lines.length > 18 ? int(c.r, 10, 16) : lines.length;
	const shown = [command(c), head, ...lines.slice(0, keep)].join('\n');
	if (keep === lines.length) return block(shown);
	const note = pick(c.r, cutNotes).replace('{last}', files.at(-1)!.name).replace('{more}', String(lines.length - keep));
	return `${block(shown)}\n\n${note}`;
};
/** Two runs of the same kind of batch, for comparing a fast day with a slow one. */
const twoRuns = (c: Ctx, slowMbit: number) => {
	const r = c.r;
	const morning = makeShots(r, c.kit, c.values.prefix!, int(r, 20, 44));
	const evening = makeShots(r, c.kit, c.values.prefix!, int(r, 20, 44));
	const a = summaryLines(c, morning, c.mbit);
	const b = summaryLines(c, evening, slowMbit);
	return `This morning, ${clock(startOfDay(c.open) + int(r, 9 * 60, 11 * 60))}:\n\n${block(`${command(c)}\n${a.head}\n${a.lines.slice(0, 3).join('\n')}`)}\n\nThis evening, ${clock(startOfDay(c.open) + int(r, 17 * 60 + 40, 19 * 60 + 30))}, same desk, same cable:\n\n${block(`${command(c)}\n${b.head}\n${b.lines.slice(0, 3).join('\n')}`)}`;
};

// Tracebacks, as Python 3.13 on the photographers' Macs prints them. H is the uploader's folder, L the standard library.
const TB_HEAD = `Traceback (most recent call last):
  File "<frozen runpy>", line 203, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "H/uploader/cli.py", line 26, in <module>
    sys.exit(main())
             ~~~~^^
  File "H/uploader/cli.py", line 20, in main
    summary = UploadClient(transport, config).upload_files(args.paths)
  File "H/uploader/client.py", line 24, in upload_files
    results = [self.upload_file(Path(path)) for path in paths]
               ~~~~~~~~~~~~~~~~^^^^^^^^^^^^`;
const AT_POST = `  File "H/uploader/client.py", line 29, in upload_file
    response = self._request("POST", f"/uploads?name={path.name}", b"")`;
const VIA_REQUEST = `  File "H/uploader/client.py", line 57, in _request
    response = self.transport.request(method, path, body, self.config.request_timeout_s)`;
const POST_STATUS = `  File "H/uploader/client.py", line 59, in _request
    raise UploadError(f"upload failed with HTTP {response.status}")`;
const AT_CHUNK = `  File "H/uploader/client.py", line 35, in upload_file
    retries += self._put_chunk(upload_id, index, chunk)
               ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^`;
const VIA_PUT = `  File "H/uploader/client.py", line 45, in _put_chunk
    response = self.transport.request(
        "PUT", f"/uploads/{upload_id}/chunks/{index}", chunk, self.config.request_timeout_s
    )`;
const CHUNK_STATUS = `  File "H/uploader/client.py", line 53, in _put_chunk
    raise UploadError(f"chunk upload failed with HTTP {response.status}")`;
const AT_COMPLETE = `  File "H/uploader/client.py", line 38, in upload_file
    self._request("POST", f"/uploads/{upload_id}/complete", b"")
    ~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`;
const URLLIB = `  File "H/uploader/transport.py", line 27, in request
    with urllib.request.urlopen(request, timeout=timeout_s) as response:
         ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "L/urllib/request.py", line 189, in urlopen
    return opener.open(url, data, timeout)
           ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
  File "L/urllib/request.py", line 489, in open
    response = self._open(req, data)
  File "L/urllib/request.py", line 506, in _open
    result = self._call_chain(self.handle_open, protocol, protocol +
                              '_open', req)
  File "L/urllib/request.py", line 466, in _call_chain
    result = func(*args)
  File "L/urllib/request.py", line 1379, in https_open
    return self.do_open(http.client.HTTPSConnection, req,
           ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                        context=self._context)
                        ^^^^^^^^^^^^^^^^^^^^^^`;
const READ_TAIL = `  File "L/urllib/request.py", line 1335, in do_open
    r = h.getresponse()
  File "L/http/client.py", line 1478, in getresponse
    response.begin()
    ~~~~~~~~~~~~~~^^
  File "L/http/client.py", line 343, in begin
    version, status, reason = self._read_status()
                              ~~~~~~~~~~~~~~~~~^^
  File "L/http/client.py", line 304, in _read_status
    line = str(self.fp.readline(_MAXLINE + 1), "iso-8859-1")
               ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "L/socket.py", line 723, in readinto
    return self._sock.recv_into(b)
           ~~~~~~~~~~~~~~~~~~~~^^^
  File "L/ssl.py", line 1327, in recv_into
    return self.read(nbytes, buffer)
           ~~~~~~~~~^^^^^^^^^^^^^^^^
  File "L/ssl.py", line 1161, in read
    return self._sslobj.read(len, buffer)
           ~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^`;
const SEND = `  File "L/urllib/request.py", line 1331, in do_open
    h.request(req.get_method(), req.selector, req.data, headers,
    ~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
              encode_chunked=req.has_header('Transfer-encoding'))
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "L/http/client.py", line 1386, in request
    self._send_request(method, url, body, headers, encode_chunked)
    ~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`;
const CONNECT = `  File "L/http/client.py", line 1432, in _send_request
    self.endheaders(body, encode_chunked=encode_chunked)
    ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "L/http/client.py", line 1381, in endheaders
    self._send_output(message_body, encode_chunked=encode_chunked)
    ~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "L/http/client.py", line 1141, in _send_output
    self.send(msg)
    ~~~~~~~~~^^^^^
  File "L/http/client.py", line 1085, in send
    self.connect()
    ~~~~~~~~~~~~^^`;
const TCP = `  File "L/http/client.py", line 1520, in connect
    super().connect()
    ~~~~~~~~~~~~~~~^^
  File "L/http/client.py", line 1051, in connect
    self.sock = self._create_connection(
                ~~~~~~~~~~~~~~~~~~~~~~~^
        (self.host,self.port), self.timeout, self.source_address)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`;
const firstParts: Record<string, string> = {
	dns: `${CONNECT}\n${TCP}
  File "L/socket.py", line 840, in create_connection
    for res in getaddrinfo(host, port, 0, SOCK_STREAM):
               ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "L/socket.py", line 977, in getaddrinfo
    for res in _socket.getaddrinfo(host, port, family, type, proto, flags):
               ~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
socket.gaierror: [Errno 8] nodename nor servname provided, or not known`,
	down: `${CONNECT}\n${TCP}
  File "L/socket.py", line 868, in create_connection
    raise exceptions[0]
  File "L/socket.py", line 853, in create_connection
    sock.connect(sa)
    ~~~~~~~~~~~~^^^^
OSError: [Errno 50] Network is down`,
	cert: `${CONNECT}
  File "L/http/client.py", line 1527, in connect
    self.sock = self._context.wrap_socket(self.sock,
                ~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
                                          server_hostname=server_hostname)
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "L/ssl.py", line 471, in wrap_socket
    return self.sslsocket_class._create(
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        sock=sock,
        ^^^^^^^^^^
    ...<5 lines>...
        session=session
        ^^^^^^^^^^^^^^^
    )
    ^
  File "L/ssl.py", line 1099, in _create
    self.do_handshake()
    ~~~~~~~~~~~~~~~~~^^
  File "L/ssl.py", line 1395, in do_handshake
    self._sslobj.do_handshake()
    ~~~~~~~~~~~~~~~~~~~~~~~~~^^
ssl.SSLCertVerificationError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: §R (_ssl.c:1032)`
};
const urlErrors: Record<string, string> = {
	dns: '[Errno 8] nodename nor servname provided, or not known',
	down: '[Errno 50] Network is down',
	cert: '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: §R (_ssl.c:1032)'
};

type TraceKind = 'post' | 'chunk' | 'complete' | 'token' | 'glob' | 'dir' | 'perm' | 'eio' | 'json' | 'space' | 'unicode' | 'timeout' | 'reset' | 'dns' | 'down' | 'cert' | 'certChain' | 'certHost';
const trace = (c: Ctx, kind: TraceKind, status = 503, file = c.shots[0]!.name): string => {
	const path = `${c.src}/${file}`;
	let text: string;
	switch (kind) {
		case 'post':
			text = `${TB_HEAD}\n${AT_POST}\n${POST_STATUS}\nuploader.client.UploadError: upload failed with HTTP ${status}`;
			break;
		case 'chunk':
			text = `${TB_HEAD}\n${AT_CHUNK}\n${CHUNK_STATUS}\nuploader.client.UploadError: chunk upload failed with HTTP ${status}`;
			break;
		case 'complete':
			text = `${TB_HEAD}\n${AT_COMPLETE}\n${POST_STATUS}\nuploader.client.UploadError: upload failed with HTTP ${status}`;
			break;
		case 'token':
			text = `Traceback (most recent call last):
  File "<frozen runpy>", line 203, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "H/uploader/cli.py", line 26, in <module>
    sys.exit(main())
             ~~~~^^
  File "H/uploader/cli.py", line 19, in main
    transport = HttpTransport(config.base_url, os.environ["DEPOT_TOKEN"])
                                               ~~~~~~~~~~^^^^^^^^^^^^^^^
  File "<frozen os>", line 717, in __getitem__
KeyError: 'DEPOT_TOKEN'`;
			break;
		case 'glob':
			text = `${TB_HEAD}
  File "H/uploader/client.py", line 28, in upload_file
    file_bytes = path.stat().st_size
                 ~~~~~~~~~^^
  File "L/pathlib/_local.py", line 515, in stat
    return os.stat(self, follow_symlinks=follow_symlinks)
           ~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: '${c.src}/*.${c.kit.ext.toLowerCase()}'`;
			break;
		case 'dir':
		case 'perm':
			text = `${TB_HEAD}
  File "H/uploader/client.py", line 33, in upload_file
    with path.open("rb") as file:
         ~~~~~~~~~^^^^^^
  File "L/pathlib/_local.py", line 537, in open
    return io.open(self, mode, buffering, encoding, errors, newline)
           ~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
${kind === 'dir' ? `IsADirectoryError: [Errno 21] Is a directory: '${c.src}'` : `PermissionError: [Errno 1] Operation not permitted: '${path}'`}`;
			break;
		case 'eio':
			text = `${TB_HEAD}
  File "H/uploader/client.py", line 34, in upload_file
    for index, chunk in enumerate(iter(lambda: file.read(self.config.chunk_bytes), b"")):
  File "H/uploader/client.py", line 34, in <lambda>
    for index, chunk in enumerate(iter(lambda: file.read(self.config.chunk_bytes), b"")):
                                               ~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
OSError: [Errno 5] Input/output error`;
			break;
		case 'json':
			text = `${TB_HEAD}
  File "H/uploader/client.py", line 30, in upload_file
    upload_id = json.loads(response.body)["upload_id"]
                ~~~~~~~~~~^^^^^^^^^^^^^^^
  File "L/json/__init__.py", line 352, in loads
    return _default_decoder.decode(s)
           ~~~~~~~~~~~~~~~~~~~~~~~^^^
  File "L/json/decoder.py", line 345, in decode
    obj, end = self.raw_decode(s, idx=_w(s, 0).end())
               ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
  File "L/json/decoder.py", line 363, in raw_decode
    raise JSONDecodeError("Expecting value", s, err.value) from None
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)`;
			break;
		case 'space':
		case 'unicode': {
			const tail =
				kind === 'space'
					? `  File "L/http/client.py", line 1231, in putrequest
    self._validate_path(url)
    ~~~~~~~~~~~~~~~~~~~^^^^^
  File "L/http/client.py", line 1331, in _validate_path
    raise InvalidURL(f"URL can't contain control characters. {url!r} "
                     f"(found at least {match.group()!r})")
http.client.InvalidURL: URL can't contain control characters. '/v2/uploads?name=${file}' (found at least ' ')`
					: `  File "L/http/client.py", line 1235, in putrequest
    self._output(self._encode_request(request))
                 ~~~~~~~~~~~~~~~~~~~~^^^^^^^^^
  File "L/http/client.py", line 1315, in _encode_request
    return request.encode('ascii')
           ~~~~~~~~~~~~~~^^^^^^^^^
UnicodeEncodeError: 'ascii' codec can't encode character '\\x${(c.values.accent ?? 'é').charCodeAt(0).toString(16)}' in position ${22 + [...file].findIndex((ch) => ch.charCodeAt(0) > 127)}: ordinal not in range(128)`;
			text = `${TB_HEAD}\n${AT_POST}\n${VIA_REQUEST}\n${URLLIB}\n${SEND}
  File "L/http/client.py", line 1397, in _send_request
    self.putrequest(method, url, **skips)
    ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
${tail}`;
			break;
		}
		case 'timeout':
		case 'reset':
			text = `${TB_HEAD}\n${AT_CHUNK}\n${VIA_PUT}\n${URLLIB}\n${READ_TAIL}\n${kind === 'timeout' ? 'TimeoutError: The read operation timed out' : 'ConnectionResetError: [Errno 54] Connection reset by peer'}`;
			break;
		default: {
			// URLError: the connection itself failed, so Python prints the first exception, then the one it caused.
			const base = kind.startsWith('cert') ? 'cert' : kind;
			const reason = kind === 'certChain' ? 'self-signed certificate in certificate chain' : kind === 'certHost' ? "Hostname mismatch, certificate is not valid for 'depot.example.com'" : 'unable to get local issuer certificate';
			const where = base === 'down' ? `${AT_CHUNK}\n${VIA_PUT}` : `${AT_POST}\n${VIA_REQUEST}`;
			const second = `${TB_HEAD}\n${where}\n${URLLIB}\n  File "L/urllib/request.py", line 1334, in do_open\n    raise URLError(err)\nurllib.error.URLError: <urlopen error ${urlErrors[base]!.replace('§R', reason)}>`;
			const full = (c.open + c.who.user.length) % 4 === 0;
			text = full ? `Traceback (most recent call last):\n${SEND}\n${firstParts[base]!.replace('§R', reason)}\n\nDuring handling of the above exception, another exception occurred:\n\n${second}` : second;
		}
	}
	return block(text.replace(/"H\//g, `"${c.home}/`).replace(/"L\//g, `"${c.lib}/`));
};
/** What the photographer saw: the command, then the traceback, or only its last lines when that is what was copied. */
const runTrace = (c: Ctx, kind: TraceKind, status?: number, file?: string, args?: string) => {
	const text = trace(c, kind, status, file);
	const lines = text.split('\n');
	if (lines.length > 40 && c.r() < 0.35) {
		const keep = lines.slice(-1 - int(c.r, 9, 15), -1).join('\n');
		return `${block(`${command(c, args)}\nTraceback (most recent call last):\n  …\n${keep}`)}\n\n${pick(c.r, ['(cut the top, it was more of the same)', '(that’s the bottom of it, the rest scrolled away)', '(only copied the end, there was a lot more)'])}`;
	}
	return text.replace('```text\n', '```text\n' + command(c, args) + '\n');
};

const lsPaste = (c: Ctx, files: Shot[], zero: number[] = []) => {
	const r = c.r;
	const day = at(c.open - int(c.r, 1, 5) * 60);
	const date = `${day.getUTCDate()} ${monthNames[day.getUTCMonth()]!.slice(0, 3)}`;
	let minute = int(r, 9 * 60, 15 * 60);
	const shown = files.slice(0, Math.min(files.length, int(r, 11, 18)));
	const rows = shown.map((file, i) => {
		minute += int(r, 0, 3);
		const sizeBytes = zero.includes(i) ? 0 : file.bytes;
		return `-rw-r--r--@ 1 ${c.who.user}  staff  ${String(sizeBytes).padStart(9)} ${date.padStart(6)} ${pad(Math.floor(minute / 60) % 24)}:${pad(minute % 60)} ${file.name}`;
	});
	const blocks = Math.round(files.reduce((sum, file) => sum + file.bytes, 0) / 512);
	return block(`${c.prompt}ls -l ${c.src.includes(' ') ? `"${c.src}"` : c.src} | head -${shown.length + 1}\ntotal ${blocks}\n${rows.join('\n')}`);
};
interface ConsoleRow {
	name: string;
	status: string;
	chunks: number | string;
	size: string;
	minute: number;
}
const consolePaste = (c: Ctx, rows: ConsoleRow[]) =>
	[`| Name | Status | Chunks | Size | Uploaded by | Started |`, `| --- | --- | --- | --- | --- | --- |`, ...rows.map((row) => `| ${row.name} | ${row.status} | ${row.chunks} | ${row.size} | ${c.who.user} (${c.who.laptop}) | ${shortDayMonth(row.minute)} ${clock(row.minute)} |`)].join('\n');
const rowsFor = (c: Ctx, files: Shot[], start: number, status = 'ready') => {
	let minute = start;
	return files.map((file) => {
		minute += c.r() < 0.4 ? 1 : 0;
		return { name: file.name, status, chunks: chunksOf(file.bytes), size: human(file.bytes), minute };
	});
};
const userAgent = 'Python-urllib/3.13';
/** Depot logs in UTC; UK clocks are an hour ahead of it until British Summer Time ends on 25 October. */
const BST_ENDS = 54 * DAY + 2 * 60;
const accessLine = (c: Ctx, minute: number, second: number, method: string, path: string, status: number, sizeBytes: number, extra = '') =>
	`${isoTime(minute - (minute < BST_ENDS ? 60 : 0), second)}  ${c.values.ip}  ${method.padEnd(4)} /v2${path}  ${status}  ${String(sizeBytes).padStart(8)}  tok=…${c.tokenTail}  ua="${userAgent}"${extra}`;
/**
 * A stretch of Depot's access log for one file: the upload, its chunks with the given statuses, and the end. `extra`
 * goes on every chunk line, or only on the refused ones when `onErrors` is set. A chunk refused five times ends it:
 * the uploader gives up there.
 */
const accessPaste = (c: Ctx, minute: number, statuses: number[][], extra = '', onErrors = false) => {
	const r = c.r;
	const lines: string[] = [];
	let second = int(r, 0, 40);
	const file = c.shots[int(r, 0, Math.min(5, c.shots.length - 1))]!;
	lines.push(accessLine(c, minute, second, 'POST', `/uploads?name=${file.name}`, 201, 0));
	const n = chunksOf(file.bytes);
	for (let i = 0; i < n; i++) {
		const tries = statuses[i] ?? [200];
		for (const status of tries) {
			second += int(r, 1, 4);
			const sizeBytes = i === n - 1 ? file.bytes - (n - 1) * 8 * MIB : 8 * MIB;
			lines.push(accessLine(c, minute + Math.floor(second / 60), second, 'PUT', `/uploads/${c.upload}/chunks/${i}`, status, sizeBytes, !onErrors || status >= 300 ? extra : ''));
		}
		if (tries.length === 5 && tries.every((status) => status >= 500)) return block(lines.join('\n'));
	}
	lines.push(accessLine(c, minute + Math.floor((second + 2) / 60), second + 2, 'POST', `/uploads/${c.upload}/complete`, 200, 0));
	return block(lines.join('\n'));
};
const speedTest = (c: Ctx, upMbit: number) => {
	const r = c.r;
	const rpm = upMbit < 10 ? int(r, 40, 180) : int(r, 300, 1400);
	return block(`${c.prompt}networkQuality\n==== SUMMARY ====\nUplink capacity: ${upMbit.toFixed(3)} Mbps\nDownlink capacity: ${(upMbit * (2.5 + r() * 6)).toFixed(3)} Mbps\nResponsiveness: ${rpm < 200 ? 'Low' : rpm < 800 ? 'Medium' : 'High'} (${rpm} RPM)`);
};
const uplinkTable = (c: Ctx, culprit: string) => {
	const r = c.r;
	const rows = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'].map((time, i) => {
		const busy = i >= 4 && i <= 7;
		const out = busy ? int(r, 880, 980) : int(r, 120, 420);
		return `| ${time} | ${out} Mbit/s | ${int(r, 60, 260)} Mbit/s | ${busy ? culprit : pick(r, ['photo desk', 'newsroom', 'web team', 'photo desk', 'video'])} |`;
	});
	return ['| Time | Outbound | Inbound | Biggest sender |', '| --- | --- | --- | --- |', ...rows].join('\n');
};
const pip39 = (c: Ctx) =>
	block(`${c.prompt}python3 --version
Python 3.9.6
${c.prompt}python3 -m pip install -e .
Defaulting to user installation because normal site-packages is not writeable
Obtaining file://${c.home}
  Installing build dependencies ... done
  Checking if build backend supports build_editable ... done
  Getting requirements to build editable ... done
  Preparing editable metadata (pyproject.toml) ... done
ERROR: Package 'depot-uploader' requires a different Python: 3.9.6 not in '>=3.11'`);
const oldCopy = (c: Ctx) =>
	block(`${c.prompt}git log -1 --format='%h %ad %s' --date=short
${hex(c.r, 7)} 2026-06-${pad(int(c.r, 8, 26))} Add the uploader command line
${c.prompt}python3 -c "import uploader; print(uploader.__version__)"
0.2.0`);
const zshNoMatch = (c: Ctx) => block(`${c.prompt}python3 -m uploader.cli ${c.src}/*.${c.kit.ext.toLowerCase()}\nzsh: no matches found: ${c.src}/*.${c.kit.ext.toLowerCase()}`);
const powershell = (c: Ctx) => {
	const src = `D:\\DCIM\\${c.kit.folder}`;
	const lib = `C:\\Users\\${c.who.user}\\AppData\\Local\\Programs\\Python\\Python313\\Lib`;
	const home = `C:\\Users\\${c.who.user}\\depot-uploader`;
	return block(`PS ${home}> DEPOT_TOKEN=dpt_live_•••••••• python -m uploader.cli ${src}\\*.${c.kit.ext}
DEPOT_TOKEN=dpt_live_•••••••• : The term 'DEPOT_TOKEN=dpt_live_••••••••' is not recognized as the name of a cmdlet,
function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that
the path is correct and try again.
At line:1 char:1
+ DEPOT_TOKEN=dpt_live_•••••••• python -m uploader.cli ${src}\\*.${c.kit.ext}
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (DEPOT_TOKEN=dpt_live_••••••••:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

PS ${home}> $env:DEPOT_TOKEN = "dpt_live_••••••••"
PS ${home}> python -m uploader.cli ${src}\\*.${c.kit.ext}
Traceback (most recent call last):
  File "<frozen runpy>", line 203, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "${home}\\uploader\\cli.py", line 26, in <module>
    sys.exit(main())
             ~~~~^^
  File "${home}\\uploader\\cli.py", line 20, in main
    summary = UploadClient(transport, config).upload_files(args.paths)
  File "${home}\\uploader\\client.py", line 24, in upload_files
    results = [self.upload_file(Path(path)) for path in paths]
               ~~~~~~~~~~~~~~~~^^^^^^^^^^^^
  File "${home}\\uploader\\client.py", line 28, in upload_file
    file_bytes = path.stat().st_size
                 ~~~~~~~~~^^
  File "${lib}\\pathlib\\_local.py", line 515, in stat
    return os.stat(self, follow_symlinks=follow_symlinks)
           ~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
OSError: [WinError 123] The filename, directory name, or volume label syntax is incorrect: '${src.replace(/\\/g, '\\\\')}\\\\*.${c.kit.ext}'`);
};
const envPaste = (c: Ctx) => block(`${c.prompt}env | grep DEPOT\nDEPOT_TOKEN='dpt_live_${c.tokenTail.slice(0, 2)}••••••••••••${c.tokenTail}'\n${c.prompt}grep DEPOT ~/.zprofile\nexport DEPOT_TOKEN="'dpt_live_${c.tokenTail.slice(0, 2)}••••••••••••${c.tokenTail}'"`);
const statusPage = (c: Ctx, start: number, cause: string, fix: string) => {
	const r = c.r;
	const a = start + int(r, 4, 12);
	const b = a + int(r, 14, 35);
	const d = b + int(r, 20, 70);
	return `> **Depot: chunk uploads failing** (${c.values.inc})\n>\n> **Resolved**, ${clock(d)}: ${fix}\n>\n> **Identified**, ${clock(b)}: ${cause}\n>\n> **Investigating**, ${clock(a)}: Uploads to the v2 API are failing with 503 for some clients. Downloads and the console are not affected.`;
};
const gitPull = (c: Ctx, kind: 'key' | 'local') =>
	kind === 'key'
		? block(`${c.prompt}git pull\ngit@git.tallowmere.example: Permission denied (publickey).\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`)
		: block(`${c.prompt}git pull\nUpdating ${hex(c.r, 7)}..${hex(c.r, 7)}\nerror: Your local changes to the following files would be overwritten by merge:\n\tuploader/config.py\nPlease commit your changes or stash them before you merge.\nAborting\n${c.prompt}git status --short\n M uploader/config.py`);

// Topics. A report follows one path of one topic. Nothing about where the trouble lay or how it ended is written into
// the file except through the messages themselves.
// Who writes: r the reporter, g the photographer when the desk reported it, d and D desk tools, p Depot, i the IT
// service desk, n the network team, v the video team, e the picture desk, s the form itself.
type Who = 'r' | 'g' | 'd' | 'D' | 'p' | 'i' | 'n' | 'v' | 'e' | 's';
type Msg = [Who, string];
interface Path {
	since?: string;
	until?: string;
	/** Special file names or assignment: spaces in the names, a sitter's accented name, or an ampersand. */
	names?: 'spaced' | 'sitter' | 'amp' | 'rollover';
	/** Pasted by the reporter in the first message, in place of the topic's. */
	shows?: string;
	/** Only a freelancer can be on this path. */
	free?: boolean;
	/** The connection the photographer was on, in place of the topic's or the assignment's. */
	conn?: Conn;
	/** Desk tools sees the cause in the first message and asks nothing first. */
	direct?: boolean;
	detail: string[];
	paste?: string;
	look: string[];
	lookWho?: Who;
	lookPaste?: string;
	/** The team desk tools waits on, if it sends a holding reply. */
	team?: string;
	ends: Msg[][];
}
interface Topic {
	from: 'photo' | 'staff' | 'free' | 'windows' | 'editor' | 'depot';
	conn?: Conn;
	/** The first reply asks where the photographer was, so the report does not say. */
	noContext?: boolean;
	shows?: string;
	subjects: string[];
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}

const topics: Topic[] = [
	// Spaces or accented letters in the file names.
	{
		from: 'photo',
		subjects: ['Upload falls over straight away', 'URL can’t contain control characters??', 'Uploader broken after renaming', 'Can’t send tonight’s set', 'Nothing will go'],
		open: [
			'Tried to send {job} from {place} and it fell over on the very first file with a wall of text. I haven’t changed anything on the laptop. The only thing that’s different is that I renamed the files in Photo Mechanic before sending.',
			'The uploader won’t take tonight’s pictures. I’ve run it the same way I always do and it stops before it has sent a single file. Whole thing pasted below.',
			'Nothing from {job} will go. Same laptop, same command as last week, but this time it gives up before anything reaches Depot.'
		],
		more: ['The desk is waiting for these, so a quick fix would be lovely.', 'I’ve tried twice and restarted the laptop in between. Same result.', 'I can email a couple of frames to the desk in the meantime but not the whole set.'],
		ask: [
			'Thanks for pasting all of it. Could you send me a listing of the folder, so I can see exactly what the files are called now?',
			'That error comes from before anything reaches Depot. Can you tell me exactly how the files are named at the moment? A copy of `ls -l` on the folder would be perfect.'
		],
		paths: [
			{
				names: 'spaced',
				shows: 'tb:space',
				detail: ['Here you go. They’re named after the job and the frame number, the way Photo Mechanic does it for us since the desk asked for readable names.', 'Listing below. Photo Mechanic renames them from the job template: the job, then a number.'],
				paste: 'ls',
				look: ['The names have spaces in them. The uploader puts the file name straight into the address of its first request to Depot, and Python refuses to send an address with a space in it. Nothing wrong with the files or the laptop.', 'Spaces in the file names. We put the name into the request to Depot as it is, and Python rejects a request line with a space before anything is sent. Anyone on the new rename template will hit this.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Found it: it’s the spaces in the new names. The uploader can’t send a name with a space in it yet. If you change the rename template in Photo Mechanic to put underscores where the spaces are, the files will go straight away. I’ll make the uploader cope with spaces properly, but that won’t be in your hands tonight.'],
						['r', 'Changed the template, renamed the set and they’re all going up now. Underscores are fine by me as long as the desk can still read them.¶'],
						['d', 'They can: Depot shows the names exactly as they were sent. Glad you’re moving.']
					],
					[
						['d', 'It’s the spaces. The uploader puts the name into its request to Depot as it is, and spaces aren’t allowed there. Renaming with underscores would get you going tonight; doing it properly is on our side.'],
						['r', 'I’d rather not. The desk asked for spaces because the names read better in the inbox. Can it just be fixed?'],
						['d', 'Fair enough. Sending any file name intact is going into the next release. Until then underscores are the only thing that works, sorry.'],
						['r', 'OK. I’ve sent tonight’s by the shared drive and {editor} has pulled them in. I’ll wait for the fix rather than change the template.']
					]
				]
			},
			{
				names: 'sitter',
				shows: 'tb:unicode',
				detail: ['Portraits are always named after the sitter, so it’s {sitter} this time. Listing below.', 'They’re the portraits of {sitter}, named after her, like every portrait job. Folder below.'],
				paste: 'ls',
				look: ['It’s the {accent} in the sitter’s name. The first request to Depot carries the file name as it is, and Python can only put plain letters there, so it gives up before anything is sent.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'It’s the {accent} in the names. The uploader can only send plain letters in a file name at the moment. If you rename them without it the set will go; I’m making the uploader send names like this intact in the next release.'],
						['r', 'Renamed them without the accent and they’ve gone. Not ideal for a portrait of someone called {sitterFirst}, but the desk can put it right in the caption.¶']
					],
					[
						['d', 'It’s the {accent} in the names. The uploader can only send plain letters in a file name for now, so it stops before anything leaves the laptop.'],
						['r', 'I can’t rename these: the client’s licensing system matches on the file names. Can you fix it before {day}?'],
						['d', 'Not by {day}, I’m afraid, but it’s in hand for the next release. For this set, {editor} says the features share is fine.'],
						['e', 'Yes, drop them in the features share and I’ll pull them in from there.'],
						['r', 'Done through the share. Please tell me when the uploader takes names like these.']
					]
				]
			}
		]
	},
	// An ampersand in the names: Depot keeps only what comes before it.
	{
		from: 'editor',
		subjects: ['Half the file names missing in Depot', 'Odd names in the inbox', 'Names cut short', 'Dozens of files with the same name'],
		shows: 'consoleCut',
		open: [
			'{photog}’s pictures from {job} have arrived in the inbox, but most of them have names that stop after a letter or two. We match names against the caption sheet, so I can’t tell which is which. Copied from the console below.',
			'Something has gone wrong with the names on {photog}’s set from {place}. They’re cut off after the first few characters, and dozens have exactly the same name. Could someone look before the night desk starts?'
		],
		more: ['The pictures themselves open fine.', 'Nothing like this on anyone else’s uploads today.'],
		ask: ['Thanks, {name}. Could you ask {photog} what the files were called on the laptop? I suspect a character in the names rather than Depot.', 'Can you or {photog} tell me what the names looked like before sending? The console usually shows them exactly as sent.'],
		paths: [
			{
				names: 'amp',
				detail: ['From {photog}: “They’re named {tag} plus the place and the frame, because that’s what the story is filed under.”', 'I asked. {photog} names every file with {tag} at the front, then the place and a number, because the story slug is {tag}.'],
				paste: 'ls',
				look: ['Depot reads everything after the “&” as a separate setting, so it only keeps the part before it as the name. The uploader should be packing the name up so that can’t happen, and it doesn’t.', 'Our access log shows the names arriving as “{tagFirst}” followed by a stray setting called “{tagRest}_…”. The uploader sends the name without packing it up, so the “&” splits it.'],
				lookWho: 'p',
				lookPaste: 'none',
				ends: [
					[
						['d', 'It’s the “&” in the names: the uploader sends the name in a way that cuts it off at that character. The pictures are fine. {depot} can put the right names back from the upload log, and I’m changing the uploader so it sends any name intact.'],
						['p', 'Renamed all {count} from our log; they should look right in the inbox now.'],
						['e', 'They do. Thanks both.'],
						['d', 'Leaving this open until the uploader change is out.']
					],
					[
						['d', 'It’s the “&”: the uploader sends the name in a way that cuts it off there. Leaving the “&” out of the names avoids it until the uploader is fixed.'],
						['g', 'I’ll drop the “&” from the template from now on. I had no idea it mattered.'],
						['e', 'And I’ve matched the {count} cut-off ones against the caption sheet by the time they were shot, so we’re fine for tonight.']
					]
				]
			}
		]
	},
	// No DEPOT_TOKEN in the terminal.
	{
		from: 'staff',
		shows: 'tb:token',
		subjects: ['KeyError on new laptop', 'Uploader says KeyError', 'DEPOT_TOKEN?', 'Is my account broken?', 'Fails before doing anything'],
		open: [
			'New laptop from IT this morning ({laptop}). I set up the uploader the way the README says and it dies immediately with KeyError: ‘DEPOT_TOKEN’. Is my Depot account not set up?',
			'Since the Mac updated last night the uploader just says KeyError DEPOT_TOKEN. It worked yesterday afternoon.',
			'Opened a fresh terminal window, ran the same command as always, and now it fails on DEPOT_TOKEN without sending anything.'
		],
		more: ['I have {job} to send later today.', 'I’ve tried logging out and back in.', ''],
		ask: [
			'It isn’t your account. The uploader reads your Depot token from DEPOT_TOKEN in the terminal, and that terminal doesn’t have it. How do you normally set it?',
			'Nothing wrong at Depot’s end: the uploader didn’t find your token in the terminal. Do you know where it was set on your old setup?'
		],
		paths: [
			{
				detail: ['I had an export line in .bash_profile on the old laptop, and I copied that file across with everything else.', 'It was in my .bash_profile, I think. I copied my home folder over from the old Mac.'],
				look: ['New laptops run zsh, which never reads .bash_profile, so the export line is there but nothing runs it.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'That explains it. New Macs use zsh, which doesn’t read .bash_profile. Put the same export line in ~/.zprofile instead, then open a new terminal window.'],
						['r', 'That was it, working now. Thanks!¶']
					],
					[
						['d', 'The new laptops use zsh, and zsh never reads .bash_profile. Moving the export line to ~/.zprofile will fix it.'],
						['r', 'Moved it and opened a new window. It found the token, and {job} went up fine.¶']
					]
				]
			},
			{
				detail: ['No idea, IT set the old one up for me. I think it was something they put on the machine.', 'I never set it myself. It just worked on {oldLaptop}.'],
				look: ['The old desk image set DEPOT_TOKEN at login from the keychain. The new image for this batch of laptops doesn’t have that yet.'],
				lookWho: 'i',
				lookPaste: 'none',
				team: 'the IT service desk',
				ends: [
					[
						['d', 'The old laptops got your token at login from something IT put on them, and the new ones don’t have it yet. {it} is adding it to the new image for everyone.'],
						['i', 'Added it to {name}’s login by hand for now; the image change goes out with next week’s build.'],
						['r', 'Confirmed, it works now.']
					],
					[
						['d', 'IT used to set the token for you at login, and the new laptops don’t do that yet. {it} has the ticket to add it to the image. Until then you can set it yourself with the export line from the README.'],
						['r', 'I’ll wait for IT, I’m not confident in the terminal. I’ll send from {editor}’s machine in the meantime.']
					]
				]
			},
			{
				direct: true,
				detail: [],
				look: ['Nothing wrong apart from the token not being set. Worth making the uploader say “DEPOT_TOKEN is not set” in plain words instead of a KeyError: this is the third one this month.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'This one is simply the token not being set in that window. Run the export line from the README again (or add it to ~/.zprofile so every window has it) and it will go. The uploader should say that in plain words rather than “KeyError”; I’m changing it to do so.'],
						['r', 'Please do, I thought I’d broken something. Working again now.¶']
					]
				]
			}
		]
	},
	// Depot refuses the token.
	{
		from: 'photo',
		subjects: ['HTTP 401 on everything', 'Upload refused', 'upload failed with HTTP 403', 'Access denied?', 'Depot won’t accept anything from me'],
		open: [
			'Every upload since this morning fails at once with “upload failed with HTTP {status}”. I haven’t touched anything on the laptop.',
			'Depot refuses me. The uploader stops on the first file with HTTP {status}. Is it me or is it Depot?',
			'Can’t send {job}: it says HTTP {status} straight away, before any of the files go.'
		],
		more: ['Colleagues at {place} seem to be sending fine.', 'I’ve checked the Wi-Fi, everything else works.', ''],
		ask: ['Thanks. A {status} means Depot didn’t accept your token. I’ll check with the Depot team which token is arriving; can you tell me when you last changed it?', 'That’s Depot turning the token down. When did you last set your token on this laptop, and where did you get it from?'],
		paths: [
			{
				since: '2026-10-19',
				shows: 'tb:post:401',
				detail: ['I set it up in the summer and haven’t touched it since.', 'Never changed it, it’s the one I got when I started using the uploader.'],
				look: ['That token was one of the old ones. We reissued every token on 12 October and the old ones stopped working on the 19th. {name}’s new one has been in the desk vault since the 12th.'],
				lookWho: 'p',
				lookPaste: 'access401',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Your token was replaced in Depot’s October change: the old ones stopped working on the 19th. Your new one is in the desk vault under “Depot tokens”. Swap it in and you’re away.'],
						['r', 'Found it in the vault, swapped it in and it’s all working. Must have missed the email.¶']
					],
					[
						['d', 'Depot replaced every token in October and the old ones stopped on the 19th. The new one is in the vault under “Depot tokens”.'],
						['r', 'I can’t get into the vault from this laptop, it asks for a code from my old phone.'],
						['d', 'The vault is IT’s. I’ve asked {it} to reset your vault login; once you’re in, the token is there.'],
						['i', 'Vault login reset, {name} has a new set-up email.'],
						['r', 'In, token swapped, working. Thanks all.¶']
					]
				]
			},
			{
				free: true,
				shows: 'tb:post:403',
				detail: ['I’m freelance, {editor} gave me a token in September when I started doing the weekend shifts.', 'It’s the token I was sent when I started freelancing for the desk.'],
				look: ['Freelance tokens are issued read-only unless the picture desk asks for upload rights. Nobody asked for {name}’s.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Your token can read from Depot but not upload: freelance tokens start that way until the desk asks for more. {editor} has asked, and {depot} is adding upload rights.'],
						['p', 'Upload rights added to {name}’s token.'],
						['r', 'Works now, cheers. {job} is going up.¶']
					],
					[
						['d', 'Freelance tokens are read-only until the picture desk asks for upload rights, and Depot needs {editor}’s OK for that. I’ve asked {editor}.'],
						['e', 'I’ll sort it on {day}. I need to check the freelance budget covers uploads before we give out more tokens.'],
						['r', 'OK, I’ll send by WeTransfer until then.']
					]
				]
			},
			{
				shows: 'tb:post:401',
				detail: ['I put it in my .zprofile last week when I set up the new laptop, copied from the vault.'],
				paste: 'env',
				look: ['The token is arriving with a quote mark stuck to the front of it, which is why Depot doesn’t recognise it. The export line has two sets of quotes.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Found it: the line in your .zprofile has quotes inside quotes, so the token reaches Depot with a quote mark on the front. Take out the single quotes, open a new window, and it will go.'],
						['r', 'Oh good grief. Fixed, and the set is going up. Thanks.¶']
					]
				]
			}
		]
	},
	// The pattern matched nothing.
	{
		from: 'photo',
		subjects: ['No matches found?', 'Uploader can’t see my files', 'No such file or directory', 'Card full but nothing to upload', 'Uploader says the folder is empty'],
		open: [
			'The uploader tells me there are no matches, but the card is full of pictures. I can see them in Finder.',
			'It says No such file or directory, but the files are right there in the folder. What am I doing wrong?',
			'Sending from {place} and the uploader can’t find anything to send. Same command I used on {lastJob}.'
		],
		more: ['I’ve tried the card in two readers.', 'Photo Mechanic sees all of them.', ''],
		ask: ['Can you paste the exact command you ran and a listing of the folder?', 'Could you send me the command as you typed it, and the output of `ls -l` on that folder?'],
		paths: [
			{
				shows: 'zsh',
				detail: ['Command is above. Listing below.', 'Here’s the folder.'],
				paste: 'ls',
				look: ['The camera writes the extension in capitals and the pattern in the command is lower case. The shell’s matching is case-sensitive, so nothing matches. The README example uses lower case, which is where people copy it from.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Your camera writes .{ext} in capitals, and the shell matches patterns letter for letter, so *.{extLower} finds nothing. Use *.{ext} and it will pick them all up.'],
						['r', 'Capitals worked. Might be worth changing the README, I copied the command from there.¶'],
						['d', 'Good point, I’ll change the README example so it doesn’t catch anyone else.']
					],
					[
						['d', 'It’s the capitals: the files end in .{ext} and the command asks for .{extLower}. Type it the way the camera writes it and you’re fine.'],
						['r', 'Sorted, thanks. Everything from {job} is up.¶']
					]
				]
			},
			{
				shows: 'tb:glob',
				detail: ['I put it in a little script so I don’t have to type it every time. Script below, and the folder.'],
				paste: 'ls',
				look: ['The script is run with bash and quotes the pattern, so the uploader is handed the pattern itself rather than the files. The uploader takes files, not patterns or folders.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The quotes round the pattern in your script mean the uploader gets the pattern itself, not the files it matches. Take the quotes off and it will work. Several people have asked for the uploader to take a folder and find the pictures itself, and we’re going to do that.'],
						['r', 'Quotes off, works. A folder option would be great, I always get this wrong.¶']
					],
					[
						['d', 'Because of the quotes in your script, the uploader is handed the pattern rather than the files. Remove them and it will find the files.'],
						['r', 'I’ll try that tonight when I’m back at the laptop.'],
						['s', 'Reminder sent to {name} after seven days without a reply.']
					]
				]
			}
		]
	},
	// A folder instead of files.
	{
		from: 'photo',
		shows: 'tb:dir',
		subjects: ['Is a directory??', 'Uploader crashed on the folder', 'Can’t upload a folder', 'IsADirectoryError'],
		open: [
			'I pointed the uploader at the folder, the way I would with any other program, and it crashed with “Is a directory”.',
			'Tried to send the whole folder from {job} in one go and it crashed straight away. Do I really have to list every file?'
		],
		more: ['And now there’s something odd in the inbox with the folder’s name on it.', ''],
		ask: ['Thanks. It only takes files at the moment, not a folder. Did anything appear in Depot?'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['It created an empty upload named after the folder before trying to read it. The uploader only takes files today.'],
				lookWho: 'd',
				lookPaste: 'consoleEmpty',
				ends: [
					[
						['d', 'The uploader only takes files today. Put /*.{ext} after the folder name and it will send everything in it. It also left an empty entry named after the folder in the inbox, which {depot} can remove.'],
						['r', 'Fine, that works. Folder sent.¶'],
						['p', 'Removed the empty upload.']
					],
					[
						['d', 'It only takes files at the moment, so it tried to read the folder as a picture. Taking a folder and sending what’s in it is a reasonable thing to expect; it’s planned for the next release.'],
						['r', 'Great. I’ll type the pattern until then.']
					]
				]
			}
		]
	},
	// Python too old.
	{
		from: 'photo',
		shows: 'pip39',
		subjects: ['Can’t install the uploader', 'pip says wrong Python', 'Install fails on my Mac', 'Requires a different Python?'],
		open: [
			'pip refuses to install the uploader on my Mac. It says it requires a different Python.',
			'The README says Python 3.9 is fine, which is what this laptop has, but the install fails with the message below.',
			'Setting up on {laptop} for the first time and the install stops with an error about the Python version.'
		],
		more: ['I followed the README step by step.', 'This is the laptop I use for weekend jobs.', ''],
		ask: ['The uploader needs Python 3.11 or later; the README is wrong about 3.9, sorry. Is this a desk laptop or your own?', 'Thanks. It needs at least Python 3.11 — the README is out of date there. Whose laptop is it?'],
		paths: [
			{
				detail: ['It’s a desk laptop, {laptop}.', 'Desk one, {laptop}, from the pool.'],
				look: ['Python 3.13 is in Self Service for desk laptops. Pushed it to {laptop}.'],
				lookWho: 'i',
				lookPaste: 'none',
				team: 'the IT service desk',
				ends: [
					[
						['d', 'I’ve asked IT to put a current Python on {laptop}, and I’ll correct the README so it doesn’t say 3.9.'],
						['i', 'Python 3.13 installed on {laptop}.'],
						['r', 'Installed the uploader again and it went through. All working.']
					]
				]
			},
			{
				detail: ['It’s my own, an older MacBook. I don’t think it can take anything newer than what it has.', 'My own. It’s a 2015 MacBook Pro and Apple stopped updating it.'],
				look: ['Python 3.13 still installs on that macOS from python.org, so it should be possible without changing the laptop.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'You can still install a newer Python from python.org on that Mac without updating macOS. The installer for 3.13 is the one marked “macOS 64-bit universal2”. Once that’s in, the uploader will install.'],
						['r', 'I’ll give it a go at the weekend.'],
						['s', 'Reminder sent to {name} after seven days without a reply.']
					],
					[
						['d', 'The python.org installer for 3.13 will work on that Mac. If you’d rather not, the desk has a pool laptop you can borrow for jobs.'],
						['r', 'I’ll borrow the pool laptop for now. Easier than messing with mine before the season starts.']
					]
				]
			}
		]
	},
	// Certificate errors.
	{
		from: 'photo',
		noContext: true,
		subjects: ['CERTIFICATE_VERIFY_FAILED', 'Certificate error on every file', 'SSL error', 'Uploader doesn’t trust Depot?'],
		open: [
			'Every file fails with CERTIFICATE_VERIFY_FAILED. Depot opens fine in the browser.',
			'Getting a certificate error from the uploader at {place}. Whole thing below.',
			'Something about SSL and certificates, and nothing goes. Is Depot’s certificate broken?'
		],
		more: ['I need to get {job} out tonight.', 'Never seen this one before.', ''],
		ask: ['Thanks. Where were you, and on which network? And how did you install Python on that laptop?', 'Could you tell me which network you were on, and whether this is the first time you’ve uploaded from that laptop?'],
		paths: [
			{
				shows: 'tb:cert',
				conn: 'home',
				detail: ['At home, on my own broadband. I installed Python myself from python.org last week because the desk laptop was in for repair.', 'At home. Python came from python.org: I put it on my own laptop last week while {laptop} was away being fixed.'],
				look: ['python.org’s Python on macOS doesn’t use the system’s certificates until you run its “Install Certificates” step. Nothing to do with Depot.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'That’s python.org’s Python on a Mac: it comes without a list of trusted certificates until you run “Install Certificates.command” in the Python 3.13 folder in Applications. Run that once and the uploader will connect.'],
						['r', 'Ran it, uploads go now. Thanks.¶']
					]
				]
			},
			{
				shows: 'tb:certChain',
				conn: 'press',
				detail: ['On the press Wi-Fi at {place}. Same laptop works fine at home.', 'Press room Wi-Fi at {place}. Other photographers had trouble too.'],
				look: ['The error names a self-signed certificate in the chain, and only on that Wi-Fi. The venue’s network is inspecting secure traffic and putting its own certificate in front of Depot’s.'],
				lookWho: 'n',
				lookPaste: 'none',
				team: 'the network team',
				ends: [
					[
						['d', 'The press Wi-Fi at {place} is putting its own certificate in front of Depot’s, which the uploader rightly refuses. Your phone’s hotspot will get you round it, and {net} is talking to the venue.'],
						['r', 'Hotspot works. Slower but fine for now.'],
						['n', 'Venue says the inspection is on their guest network only. Asked them to exempt depot.example.com before the next home game; no answer yet.']
					],
					[
						['d', 'That Wi-Fi is putting its own certificate in front of Depot’s, so the uploader refuses to talk to it. Sending over your phone’s hotspot avoids it.'],
						['r', 'Used the hotspot and the set went in about twenty minutes. Fine for me, I’ll stay off their Wi-Fi.']
					]
				]
			},
			{
				shows: 'tb:certHost',
				conn: 'hotel',
				detail: ['In the hotel. The Wi-Fi works for email.', 'Hotel Wi-Fi in London. I think it works, email comes through.'],
				look: ['Hostname mismatch: something on the hotel network answered instead of Depot. Usually the sign-in page of a hotel Wi-Fi that has timed out.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The certificate that came back wasn’t Depot’s, so something on the hotel network answered instead. Usually it’s the Wi-Fi sign-in page wanting you to accept the terms again. Open any website in the browser, sign in, then try again.'],
						['r', 'Spot on, the sign-in page had expired. All sent now.¶']
					]
				]
			}
		]
	}
];

topics.push(
	// No route to Depot at all.
	{
		from: 'photo',
		noContext: true,
		conn: 'press',
		shows: 'tb:dns',
		subjects: ['nodename nor servname??', 'Uploader can’t find Depot', 'What is a nodename', 'Can’t connect from {place}'],
		open: [
			'It just says “nodename nor servname provided, or not known”. What’s a nodename? I need to get {job} out.',
			'The uploader can’t seem to find Depot at all. Pasted below. I’m at {place}.',
			'Error about a nodename, and nothing goes. Depot’s down?'
		],
		more: ['The laptop says it’s connected.', 'The desk wants the first pictures within the hour.', ''],
		ask: ['That means the laptop couldn’t look up Depot’s address, so it never got as far as Depot. Which network are you on, and does a website open in the browser?'],
		paths: [
			{
				detail: ['Press room Wi-Fi. Now that you mention it, the browser doesn’t load anything either.', 'On the venue Wi-Fi. Browser just spins.'],
				look: ['The venue Wi-Fi had no internet behind it. Nothing at Depot.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'If the browser can’t load anything either, the Wi-Fi has no internet behind it. Your phone’s hotspot will get the pictures out; the uploader will work as soon as there’s a connection.'],
						['r', 'Switched to the hotspot and the first half has gone. The Wi-Fi came back at half time anyway.¶']
					]
				]
			},
			{
				detail: ['On the guest Wi-Fi at {place}. The browser opens a page asking me to accept terms.', 'Guest Wi-Fi at {place}. The browser shows a sign-in page.'],
				look: ['Guest Wi-Fi with a sign-in page; until it’s accepted, nothing else resolves.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Accept the terms on that sign-in page and try again. Until you do, the Wi-Fi won’t let the laptop look up anything outside.'],
						['r', 'Accepted, and the set is going. Thanks.¶']
					]
				]
			},
			{
				conn: 'studio',
				detail: ['In the office, wired. Everything else works fine, including the Depot console.', 'At the office on the wired network. The Depot console opens in the browser.'],
				look: ['Our fault: a DNS change this morning briefly removed the API name for anyone outside the console’s cache. Put back at {fixTime}.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'This one was Depot’s: a change to their addresses this morning removed the name the uploader uses for a while. {depot} put it back at {fixTime}. Try again now.'],
						['r', 'Went first time. Thanks for chasing.¶']
					],
					[
						['d', 'Depot had a problem with their addresses this morning. It’s been put right; try again.'],
						['r', 'All gone through now.¶'],
						['p', 'Added a check to our change process so the API name can’t be removed without a warning.']
					]
				]
			}
		]
	},
	// Slow and failing over mobile data from the van or the field.
	{
		from: 'staff',
		noContext: true,
		conn: 'mobile',
		subjects: ['Uploading from the van is hopeless', 'TimeoutError from the field', 'Painfully slow over 4G', 'Upload died in the van'],
		open: [
			'Sending from the van at {place} is painfully slow, and tonight it died partway with TimeoutError. I have no idea which files made it.',
			'Uploads over the van’s router have been crawling all week, and today it gave up halfway through {job}.',
			'Is there any way to make it work over 4G? I sat in the car park at {place} for forty minutes and it still failed.'
		],
		more: ['The signal bars look fine.', '{editor} was waiting for the pictures and had to use the agency instead.', ''],
		shows: 'tb:timeout',
		ask: ['Sorry about that. Can you run a speed test from the same spot next time and send me the result? And were you on the van’s router or your phone?', 'Thanks. Were you on the van’s router or your own phone, and could you paste a speed test from there?'],
		paths: [
			{
				detail: ['Van router. Speed test from the same place below.', 'The van’s router. Ran the speed test this morning in the same car park.'],
				paste: 'netq',
				look: ['That router is the old 4G one; uplink is a few megabits on a good day. The 5G routers for the vans are ordered but not here yet.'],
				lookWho: 'i',
				lookPaste: 'none',
				team: 'the IT service desk',
				ends: [
					[
						['d', 'The van’s router is the old one and can barely send at all; {it} has 5G routers on order for the vans. Nothing in the uploader will fix a link that slow.'],
						['i', 'Routers due the week after next. {name}’s van is first on the list.'],
						['r', 'OK, thanks. I’ll use my phone until then.']
					]
				]
			},
			{
				detail: ['My phone, tethered. Speed test below, it was a bad day.', 'Phone hotspot. Here’s the speed test.'],
				paste: 'netq',
				look: ['A few megabits up. A full set of raws won’t go over that in reasonable time.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'At that speed, a full card of raws takes the best part of an hour, and a dropped signal partway kills it. What works for others: pick the ten or so the desk needs, send those from the field, and send the full card from the office.'],
						['r', 'Makes sense. Did exactly that today, picks went in a few minutes.'],
						['e', 'Works for us, as long as the picks come first.']
					],
					[
						['d', 'With that speed and a weak signal, a large set will rarely get through. Sending only the picks from the field and the rest from the office is the reliable way for now.'],
						['r', 'Fine for news, but for sport the desk wants everything during the match. Can the uploader at least carry on from where it stopped, instead of me working out which files went?'],
						['d', 'That needs Depot to tell us which files it already has. I’ve asked the Depot team whether they can add that; I’ll come back to you.'],
						['p', 'On our list for the next quarter. Nothing before Christmas, sorry.']
					]
				]
			},
			{
				detail: ['Van router again. It was fine until about a week ago.', 'The van router. It got much worse this month.'],
				paste: 'netq',
				look: ['The van’s SIM hit its monthly data allowance on the 3rd and has been throttled since. Topped up and raised the allowance for the sport vans.'],
				lookWho: 'i',
				lookPaste: 'none',
				team: 'the IT service desk',
				ends: [
					[
						['d', 'Turns out the van’s SIM ran out of data for the month and was slowed right down. {it} has topped it up.'],
						['r', 'Night and day. {job} went in eight minutes.']
					]
				]
			}
		]
	},
	// Slow in the office in the evenings.
	{
		from: 'staff',
		conn: 'studio',
		shows: 'twoRuns',
		subjects: ['Office uploads slow in the evening', 'Uploads crawl after 6', 'Studio uplink slow?', 'Why is it so slow tonight'],
		open: [
			'Uploads from the office are quick in the morning and crawl in the evening. Same laptop, same desk, same cable. Two runs below.',
			'Is something happening on the network after six? Uploads take five times as long as they do at lunchtime.'
		],
		more: ['It matters for the evening football.', 'The night desk has noticed too.', ''],
		ask: ['Thanks for the comparison, that helps. I’ll ask the network team to look at the uplink in the evenings.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['Off-site backup of the archive was moved to 18:00 in August and fills the uplink until about 20:00.'],
				lookWho: 'n',
				lookPaste: 'uplink:archive backup',
				team: 'the network team',
				ends: [
					[
						['d', '{net} found it: the archive backup was moved to the early evening in the summer and fills the line. He has moved it back to 02:00 from tonight.'],
						['r', 'Much better tonight. Thanks both.¶']
					]
				]
			},
			{
				direct: true,
				detail: [],
				look: ['The video team’s rushes go to the edit house over the same line from about 18:00.'],
				lookWho: 'n',
				lookPaste: 'uplink:video rushes',
				team: 'the network team',
				ends: [
					[
						['d', 'The video team’s rushes go out over the same line in the evening. {net} is setting the line up so photo uploads go first, but that needs new kit and won’t be in before the end of the month.'],
						['v', 'We can hold rushes until after the match on football nights in the meantime, if the desk tells us which nights.'],
						['r', 'That would help. I’ll ask {editor} to send you the fixture list.']
					]
				]
			},
			{
				direct: true,
				detail: [],
				look: ['Uplink is quiet in the evenings. {name}’s laptop was on the Wi-Fi in both runs, not the dock: the evening one was from the canteen.'],
				lookWho: 'n',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The network team says the line is quiet in the evenings. Your laptop was on the Wi-Fi rather than the cable in the evening run, from the canteen end of the building where the signal is weakest.'],
						['r', 'Ah. Yes, I was eating. Fair enough, I’ll send from the desk.']
					]
				]
			}
		]
	},
	// The laptop went to sleep partway.
	{
		from: 'photo',
		subjects: ['Upload died when I closed the laptop', 'Connection reset by peer', 'Uploader stopped overnight', 'Lost half the upload'],
		open: [
			'I closed the laptop to drive back from {place}, and when I opened it again the uploader had died with the error below.',
			'Started the upload, went to grab food, came back and it had stopped with “Connection reset by peer”.',
			'Left it uploading overnight from home and this morning it had died. No summary, so I don’t know what went.'
		],
		more: ['Which files made it?', 'I re-ran it and it started from the beginning again.', ''],
		shows: 'tb:reset',
		ask: ['Was the laptop asleep, or the lid closed, at any point? And do you know roughly how far it got?'],
		paths: [
			{
				detail: ['Lid closed, yes. No idea how far it got.', 'It went to sleep, I think. The screen was off when I came back.'],
				look: ['Lid closed, Mac asleep, connection dropped. Depot has the first {count} files complete.'],
				lookWho: 'd',
				lookPaste: 'consoleIncomplete',
				ends: [
					[
						['d', 'When the Mac sleeps it drops the connection, and the uploader stops. Depot has the first {count} complete (the one marked incomplete is the file it was on). If you start the upload with `caffeinate -i` in front of the command, the Mac stays awake until it finishes, even with the screen off.'],
						['r', 'Used caffeinate today with the lid open and the screen off. Went through fine.¶']
					],
					[
						['d', 'The Mac went to sleep and the connection dropped. `caffeinate -i` in front of the command keeps it awake. Depot already has the first {count}.'],
						['r', 'Thanks. Could the uploader carry on where it stopped, rather than sending the whole card again? It took ages.'],
						['d', 'It can’t yet: it has no way of asking Depot which files it already has. We’ve asked Depot for that and it’s on their list.']
					]
				]
			}
		]
	},
	// Duplicates in the inbox after running it again.
	{
		from: 'editor',
		shows: 'consoleDupes',
		subjects: ['Duplicates in the inbox', 'Two copies of everything from {photog}', 'Why are there three of each?', 'Inbox full of repeats'],
		open: [
			'We have two or three copies of half of {photog}’s set from {job} in the inbox. It makes picking very slow. Copied from the console below.',
			'{photog}’s pictures from {place} are in the inbox twice, some three times, and one of each looks broken.'
		],
		more: ['Not the first time this week.', 'The night desk lost twenty minutes on it.', ''],
		ask: ['I think I know what happened, but let me check with {photog} first.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['The first run died partway; {photog} ran the whole card again, twice. The uploader has no idea what Depot already has, so it sends everything every time.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The first run stopped partway, and {photog} ran the whole card again (twice). The uploader sends everything it’s given every time, because it can’t ask Depot what’s already there. Skipping files Depot already has needs Depot to answer that question, so I’ve passed it to the Depot team.'],
						['p', 'We can add a lookup by name and checksum. Pencilled in for January.'],
						['e', 'OK. Can someone at least clear the duplicates from this one?'],
						['p', 'Done.']
					],
					[
						['d', 'The run stopped partway, and the whole card was sent again. Until the uploader can skip what’s already there, the quickest way after a failure is to send only the files that aren’t in the inbox yet. I’ve shown {photog} how to see that in the console.'],
						['g', 'Got it. I’ll check the console and send just the missing ones next time.'],
						['e', 'Fine by us.']
					],
					[
						['d', 'It stopped partway and the full card went again. {depot} has removed the extra copies. I’m changing the uploader so a second run skips files that went through the first time.'],
						['e', 'Thank you. Let me know when that’s out and I’ll tell the photographers.']
					]
				]
			}
		]
	},
	// Empty files from a bad card.
	{
		from: 'photo',
		shows: 'tb:complete:422',
		subjects: ['HTTP 422 on the same file every time', 'Upload stops at one file', 'One file won’t go', 'Stuck on {file}'],
		open: [
			'The upload stops at the same file every time with HTTP 422, and nothing after it goes.',
			'Every time I run it, it gets to {file} and dies. The files before it are in Depot.'
		],
		more: ['The card has been playing up a bit.', 'I’ve run it three times now.', ''],
		ask: ['Could you send me a listing of the folder? I’d like to see that file’s size.'],
		paths: [
			{
				detail: ['Listing below. A few of them say 0.', 'Here. {file} and a couple of others look odd.'],
				paste: 'lsZero',
				look: ['Several files are 0 bytes on the card. Depot refuses to finish an upload with nothing in it, the uploader stops there, and nothing after it is sent.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'A few files on the card are empty, which usually means the card or the reader failed while writing. Depot refuses an empty file, and the uploader stops at the first one. Recovery software can often get the frames back; IT has a copy.'],
						['i', 'Recovered all but one frame from the card. New card issued, the old one is in the bin.'],
						['r', 'Sent the recovered ones. Thanks all.¶']
					],
					[
						['d', 'Those files are empty on the card itself; Depot won’t take an empty file, and the uploader stops at the first one. If you move the empty ones out of the folder, the rest will go.'],
						['r', 'Moved them aside, the rest went. Could it not just skip empty files and carry on? I didn’t notice they were empty.'],
						['d', 'Agreed, it should. I’m changing it to skip empty files and list them at the end.']
					]
				]
			}
		]
	},
	// A file the card can't read.
	{
		from: 'photo',
		shows: 'tb:eio',
		subjects: ['Input/output error', 'Upload dies on the card', 'OSError Errno 5', 'Card problem or uploader problem?'],
		open: [
			'The upload dies partway with “Input/output error”. Photo Mechanic also complained about one frame on this card.',
			'Got about a third of the way through {job} and it died with Errno 5. Is it the card?'
		],
		more: ['It’s a fairly new card.', 'Everything after that file never went.', ''],
		ask: ['That error comes from the card, not from Depot. Do you know which file it was on?'],
		paths: [
			{
				detail: ['Photo Mechanic says it can’t read {file}.', 'Probably {file}, that’s the one Photo Mechanic can’t show.'],
				look: ['One unreadable frame on the card; the uploader stops at the first error and everything after it waits.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'One frame on the card can’t be read, and the uploader stops at the first problem. Copy the card to the laptop first (Photo Mechanic will skip the bad frame), then upload from the copy.'],
						['r', 'Copied, uploaded from the laptop, all through except that one frame. Fine.¶']
					],
					[
						['d', 'One unreadable frame, and the uploader stops there, leaving everything after it. That isn’t great: one bad file shouldn’t hold up two hundred good ones. I’m changing it to carry on with the rest and list the files it couldn’t send at the end.'],
						['r', 'Yes please. For now I’ve moved that frame aside and the rest went.']
					]
				]
			}
		]
	},
	// Nothing on the screen until the end.
	{
		from: 'photo',
		shows: 'summary',
		subjects: ['Is it meant to show nothing?', 'No progress while uploading', 'Blank screen for 20 minutes', 'How do I know it’s working'],
		open: [
			'Is the uploader meant to sit there with nothing on the screen for twenty minutes? I nearly stopped it. It did finish in the end:',
			'There’s no way to tell how far it has got. I sent {n} files from {place} and stared at a blinking cursor until the summary came up.'
		],
		more: ['Some sort of counter would help.', 'The desk keeps ringing to ask how long.', ''],
		ask: ['Fair question. Do you mainly need to know it’s still alive, or how far through it is?'],
		paths: [
			{
				detail: ['How far through, so I can tell the desk when to expect the pictures.', 'Both, really. Mostly how far through.'],
				look: ['Same request as several others. A line per file as it finishes would do it.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'It prints nothing until the end today. We’re going to print a line for each file as it finishes, so you can see where it is. That’s planned for the next release.'],
						['r', 'Great, thanks.']
					],
					[
						['d', 'Until the uploader shows progress itself, the inbox in the Depot console is the best guide: each file appears there as soon as it’s finished.'],
						['r', 'Watching the console on my phone works for me. Thanks.']
					]
				]
			},
			{
				detail: ['Mainly that it hasn’t hung.', 'Just that it’s still doing something.'],
				look: ['Nothing to fix for {name}; explained that silence means it’s working.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'If it hasn’t printed an error, it’s working: it only prints when it’s finished or when something goes wrong. Your files also appear in the Depot console one by one as they arrive.'],
						['r', 'Good to know, I’ll stop worrying.']
					]
				]
			}
		]
	},
	// macOS won't let Terminal read the card.
	{
		from: 'staff',
		shows: 'tb:perm',
		subjects: ['Operation not permitted', 'Can’t read the card', 'PermissionError', 'Uploader not allowed to read my files'],
		open: [
			'Since the Mac updated, the uploader says “Operation not permitted” when I send straight from the card.',
			'PermissionError on the first file. The files aren’t locked, I can open them in Photo Mechanic.'
		],
		more: ['It works if I copy the files to the desktop first.', ''],
		ask: ['That’s macOS refusing to let Terminal read the card. Is this a desk laptop?'],
		paths: [
			{
				detail: ['Yes, {laptop}.', 'Desk laptop, {laptop}.'],
				look: ['The setting can be changed by the user on this build.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Open System Settings, then Privacy & Security, then Files and Folders, find Terminal and turn on “Removable Volumes”. Then quit Terminal and open it again.'],
						['r', 'Done. Works from the card again.¶']
					]
				]
			},
			{
				detail: ['Yes, {laptop}. I found the setting but it’s greyed out.', 'Desk laptop. The switch in Privacy & Security won’t move.'],
				look: ['The new management profile locks Files and Folders. We need to add Terminal to the allowed list.'],
				lookWho: 'i',
				lookPaste: 'none',
				team: 'the IT service desk',
				ends: [
					[
						['d', 'The new IT profile on the desk laptops locks that setting. {it} is adding Terminal to the allowed list.'],
						['i', 'Profile updated for all desk laptops. Restart to pick it up.'],
						['r', 'Restarted, works from the card again.¶']
					],
					[
						['d', 'IT’s profile locks the setting. {it} is changing it for the desk laptops; until then, copying the files to the laptop first works.'],
						['r', 'I’ll copy first. Let me know when IT has done it.'],
						['i', 'Change is with the Mac team for approval.']
					]
				]
			}
		]
	},
	// Depot answered with its maintenance page.
	{
		from: 'photo',
		shows: 'tb:json',
		subjects: ['JSONDecodeError', 'Expecting value: line 1 column 1', 'Uploader crashed early this morning', 'Weird error at 6am'],
		open: [
			'Early start for {job} and the uploader crashed on the first file with a JSONDecodeError. I don’t know what that is.',
			'“Expecting value: line 1 column 1 (char 0)” on the first file. I was sending at {time}.'
		],
		more: ['The desk wants them for the lunchtime update.', 'Never seen this one before.', ''],
		ask: ['What time exactly did you try? That error means Depot answered with something that wasn’t what the uploader expected.'],
		paths: [
			{
				detail: ['About {time}.', 'Just before {time}, I think.'],
				look: ['Inside the Tuesday maintenance window. During maintenance the load balancer answers every request with the maintenance page and a 200, so the uploader thinks it worked and tries to read it.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'You hit Depot’s maintenance window. During maintenance Depot answers with a web page instead of an error, which confused the uploader. The Depot team are changing that to a proper “unavailable” answer.'],
						['p', 'Change is ready and goes live with next Tuesday’s maintenance.'],
						['r', 'OK. I’ll avoid early Tuesdays.']
					],
					[
						['d', 'It was Depot’s weekly maintenance, and Depot answers with a web page during it instead of an error. The Depot team are changing that.'],
						['r', 'Is there a list of when maintenance is? I had no idea.'],
						['p', 'Tuesdays, 06:00 to 06:30. We’ll post it in the desk channel too.']
					]
				]
			},
			{
				detail: ['It was about {time}, and it’s still doing it now.', 'Started at {time} and still going.'],
				look: ['Unplanned: the upload service was restarted after a bad deploy and the load balancer served the maintenance page in the meantime.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Depot had an unplanned problem this morning and answered with a holding page. It’s back now; try again.'],
						['r', 'Went through. Thanks.¶']
					]
				]
			}
		]
	},
	// Files sitting in the console but not usable.
	{
		from: 'editor',
		subjects: ['Files stuck in Depot', 'Can’t open {photog}’s pictures', 'Stuck on “assembling”', 'Pictures in the inbox but won’t open'],
		open: [
			'{photog}’s set from {job} is in the inbox but I can’t open any of it. Copied the console below.',
			'Half of {photog}’s pictures from {place} won’t open in Depot. They’ve been like that for an hour.'
		],
		more: ['Deadline is at ten.', ''],
		ask: ['Thanks. Let me check what the console says about them.'],
		paths: [
			{
				shows: 'consoleAssembling',
				direct: true,
				detail: [],
				look: ['Assembly queue stuck after this afternoon’s deploy. Restarted the workers.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'They arrived complete but Depot hasn’t put them together yet. Its assembly queue got stuck; {depot} has restarted it.'],
						['e', 'They’re opening now. Thanks.']
					]
				]
			},
			{
				shows: 'consoleIncomplete',
				direct: true,
				detail: [],
				look: ['These are marked incomplete: the uploader stopped partway on {photog}’s laptop and never told Depot it was finished. Nothing wrong at Depot.'],
				lookWho: 'p',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Depot says the incomplete ones never finished: the upload stopped on {photog}’s laptop partway through. {photog} will need to send the missing ones again.'],
						['g', 'My battery died in the press room. Sending the rest now.'],
						['e', 'All there now.']
					],
					[
						['d', 'The incomplete ones never finished arriving: the upload stopped on {photog}’s laptop. I’ve asked {photog} to send them again.'],
						['s', 'Reminder sent to {photog} after seven days without a reply.']
					]
				]
			}
		]
	},
	// Depot flags the chunks as form posts.
	{
		from: 'depot',
		shows: 'accessForm',
		subjects: ['Uploader chunks flagged as form posts', 'Content type on chunk uploads', 'Firewall rule and the uploader'],
		open: [
			'Our new firewall rules flag every chunk the uploader sends as a form post, because each one arrives labelled as form data. Nothing is blocked yet, but from {blockDate} the firewall will reject form posts to the chunk endpoint. Sample from the access log below.',
			'Heads-up from Depot: the uploader’s chunk uploads arrive labelled as form data, which the firewall treats as suspicious. We start blocking that on {blockDate}.'
		],
		more: ['Every other client sends them as plain binary data.', ''],
		ask: ['Thanks. Can you hold the rule back for the uploader’s tokens until we have a release out?'],
		paths: [
			{
				detail: ['We can exempt the desk tokens until the end of the month, not longer.', 'We can hold it for desk tokens for a few weeks.'],
				look: ['The uploader never sets a content type on chunk uploads, so Python labels them as form data. One-line change on our side.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Thanks. The uploader doesn’t say what the chunks are, so Python labels them as form data. We’ll send them as binary data in the next release, well before the end of the month.'],
						['p', 'Good. Exemption in place for the desk tokens until the 30th.']
					],
					[
						['d', 'Confirmed on our side: the chunks go out with Python’s default label. We’ll change it in the next release.'],
						['p', 'Thanks. Please tell us the day it ships so we can switch the rule on.']
					]
				]
			}
		]
	},
	// Folders per assignment.
	{
		from: 'editor',
		subjects: ['Can uploads go into a folder per job?', 'Request: sort uploads by assignment', 'Inbox is chaos on match days'],
		shows: 'consoleMixed',
		open: [
			'On busy days the inbox is one long list and we spend ages working out which frames belong to which job. Could the uploader put each set into a folder for its assignment, like “{date} {jobShort}”?',
			'Request from the desk: when a photographer sends a set, could it land in a folder named after the job instead of the shared inbox?'
		],
		more: ['Saturday we had five matches arriving at once. This is what the top of the inbox looked like:', 'It would save the night desk a lot of scrolling. A few minutes of this afternoon’s inbox, for example:'],
		ask: ['I like the idea. The uploader can only do what Depot’s API allows, so let me check with the Depot team.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['The upload API has no way to choose a folder at the moment; it’s planned for v3 next year.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Depot’s upload API can’t put files into a folder yet; it’s coming in their next version next year. Once it’s there, the uploader can ask for the job’s folder. I’ve left it with the Depot team.'],
						['e', 'OK, thanks. Disappointing but understood.']
					]
				]
			},
			{
				direct: true,
				detail: [],
				look: ['Folders aren’t possible yet, but the console can filter the inbox by uploader and by time, which covers most of this.'],
				lookWho: 'p',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The upload API can’t choose a folder yet. In the meantime the console can filter the inbox by photographer and by time: “Uploaded by” and “Started” at the top of the list. {depot} can show the night desk.'],
						['e', 'Tried the filters with {depot} this afternoon. That does the job for now.']
					]
				]
			}
		]
	},
	// Pictures sent that shouldn't have been.
	{
		from: 'photo',
		shows: 'none',
		subjects: ['Please delete some files', 'Sent the wrong card!', 'Wrong pictures in the inbox', 'Embargoed pictures uploaded by mistake'],
		open: [
			'I sent the wrong card by mistake: {count} frames from a private job are now in the desk inbox. Can they be deleted, please?',
			'Embargoed pictures from {job} went into the inbox with the rest of the card. The embargo runs until {day} morning. Can someone remove them?'
		],
		more: ['Sorry, my mistake.', 'They start at {file}.'],
		ask: ['Not a problem. Only Depot can remove files from the inbox; I’ll pass it to them now.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['Removed the {count} files and checked nobody had downloaded them. First rows of what went:'],
				lookWho: 'p',
				lookPaste: 'consoleRemoved',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Passed to Depot.'],
						['p', 'Done: the {count} files are gone, and nobody had downloaded them.'],
						['r', 'Thank you, panic over.']
					],
					[
						['d', 'Passed to Depot, who will remove them.'],
						['p', 'Removed. {editor} had already put two of them in a gallery, which we’ve taken down too.'],
						['e', 'Sorry, I hadn’t seen the embargo note. All clear now.']
					]
				]
			}
		]
	},
	// Windows laptops.
	{
		from: 'windows',
		shows: 'powershell',
		subjects: ['Can’t get it working on Windows', 'Uploader on a PC?', 'The term DEPOT_TOKEN is not recognized', 'Windows help please'],
		open: [
			'I’m on a Windows laptop. The README command doesn’t work at all, and when I set the token another way it says the file name syntax is incorrect.',
			'Freelancer here, PC user. Can the uploader be used on Windows? This is what happens:'
		],
		more: ['Python is installed, 3.13.', ''],
		ask: ['It works on Windows, the README just assumes a Mac. Let me write out the commands for you.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['PowerShell sets the token differently and doesn’t expand the pattern for the uploader, so it gets the pattern itself.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Two differences on Windows. Set the token with `$env:DEPOT_TOKEN = "…"`, and let PowerShell find the files with `Get-ChildItem`, because unlike a Mac it doesn’t expand the pattern for you. Command below.'],
						['r', 'That works. Thanks, the whole set went.¶']
					],
					[
						['d', 'On Windows, set the token with `$env:DEPOT_TOKEN = "…"`, and list the files with `Get-ChildItem`, because PowerShell passes the pattern on as it is. The uploader should really expand the pattern itself on Windows; I’ll change it so the README command works there too.'],
						['r', 'The Get-ChildItem version works. Would be good if the simple one did as well.']
					]
				]
			}
		]
	},
	// An old copy of the uploader.
	{
		from: 'staff',
		subjects: ['Uploads keep failing, everyone else is fine', 'HTTP 503 and it gives up', 'Only my uploads fail', 'Why does mine fail and theirs don’t'],
		open: [
			'My uploads fail whenever Depot has a wobble, but {colleague} sent from the same room at the same time and was fine.',
			'Two failures this week with HTTP 503 on the first bad answer from Depot. Everyone else seems to get through.'
		],
		more: ['Same laptop model as everyone.', ''],
		shows: 'tail:503',
		ask: ['Which version of the uploader do you have? `git log -1` in the folder will tell me.'],
		paths: [
			{
				detail: ['Here you go.', 'This is what it says.'],
				paste: 'oldCopy',
				look: ['0.2.0, from June. Doesn’t send a chunk again after a 5xx.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'You have 0.2.0 from June. Since 0.3.0 the uploader sends a piece again when Depot has a wobble, which is why the others get through. Run `git pull` in the folder and you’ll be on 0.3.0.'],
						['r', 'Pulled, now on 0.3.0. Sent tonight’s set through a couple of wobbles without trouble.¶']
					]
				]
			}
		]
	},
	// Same file names from two photographers.
	{
		from: 'editor',
		subjects: ['Two photographers, same file names', 'Whose IMG_ is whose?', 'Can’t tell sets apart', 'Clashing names in the inbox'],
		shows: 'consoleClash',
		open: [
			'{photog} and {colleague} both covered {job}, and both sets are full of {prefix}… names. Half of them clash, and the caption sheet can’t tell us whose is whose.',
			'Request: could the uploader put the photographer’s initials in front of each file name? We keep getting identical names from different cameras.'
		],
		more: ['The agency asked us twice on Saturday who shot what. Here’s a bit of the inbox; I’ve switched on every column I could find.', 'Copied a few rows from the inbox below.'],
		ask: ['Let me check what Depot already shows about who sent what.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['The console can show “Uploaded by” for every file; it’s hidden by default on the inbox view.'],
				lookWho: 'p',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Depot already records who sent each file. The column “Uploaded by” is hidden in the inbox view; {depot} has switched it on for the desk accounts.'],
						['e', 'Perfect, I can see it now. That’s enough for us.']
					]
				]
			},
			{
				direct: true,
				detail: [],
				look: ['Cameras can set their own file prefix; that’s the simplest fix.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Most of the desk’s cameras let you set the start of the file name. If each photographer uses their initials there (Ruth already does), the names stop clashing at source. I’ve written the steps for each camera on the desk wiki.'],
						['e', 'I’ll ask everyone to do it before the weekend.'],
						['g', 'Done mine.']
					],
					[
						['d', 'Two ways: each camera can set its own prefix, or the uploader can add the sender’s initials. The camera way needs nothing from us; the uploader way needs a change.'],
						['e', 'Camera settings get reset every time a body goes for repair. I’d rather the uploader did it.'],
						['d', 'Fair. I’ll add the sender’s initials as an option in the next release.']
					]
				]
			}
		]
	},
	// Video files.
	{
		from: 'photo',
		shows: 'none',
		subjects: ['Video takes forever', 'Can the uploader send video?', 'Clip took an hour to send', 'Uploading video clips'],
		open: [
			'I shot some video at {job} for the website. A {gb} GB clip took over an hour through the uploader. Is that normal, or should video go another way?',
			'Can I send video with the uploader? I tried with one clip and it was still going when I left.'
		],
		more: ['The web team wanted it the same evening.', ''],
		ask: ['It will send anything, but it isn’t built for big files. Let me ask the video team how they want clips.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['Video should go through our transfer tool, not Depot: it goes straight to the edit and gets transcoded.'],
				lookWho: 'v',
				lookPaste: 'none',
				team: 'the video team',
				ends: [
					[
						['d', 'The video team would rather have clips through their own transfer tool, which goes straight to the edit. {video} will set you up.'],
						['v', 'Login sent. Drop clips in the “photo desk” folder and we’ll take it from there.'],
						['r', 'Got it, thanks.']
					]
				]
			},
			{
				direct: true,
				detail: [],
				look: ['Short clips are fine through Depot; only long ones are a problem.'],
				lookWho: 'v',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The video team says short clips through the uploader are fine; it’s the long raw files that take forever. Trimming in camera or in Photos before sending keeps them small.'],
						['r', 'Trimmed the next ones to the bits the web team wanted and they went in a couple of minutes.']
					]
				]
			}
		]
	},
	// What the retries in the summary mean.
	{
		from: 'photo',
		shows: 'summaryRetries',
		subjects: ['Retries in the summary?', 'Is something wrong with my pictures?', 'What do retries mean', 'Summary says retries'],
		open: [
			'The summary says some of my files needed retries. Does that mean the pictures are damaged? It never said that before.',
			'Quick question about the summary: a few files from {job} show retries. Should I be worried?'
		],
		more: ['They look fine in the inbox as far as I can tell.', ''],
		ask: ['No need to worry, but let me check the files at Depot’s end to be sure.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['Depot was briefly busy around {time}; the pieces were sent again and every file is complete.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'Nothing wrong. Depot was busy for a moment around {time}, so the uploader sent a few pieces of those files a second time, which is exactly what it’s meant to do. Every file is complete in Depot.'],
						['r', 'Great, thanks for checking.']
					],
					[
						['d', 'The retries just mean Depot was busy for a moment and the uploader sent those pieces again. The files are complete; {editor} opened a couple to be sure.'],
						['e', 'All fine at this end.'],
						['r', 'Thanks both.']
					]
				]
			}
		]
	},
	// Captions missing.
	{
		from: 'editor',
		shows: 'none',
		subjects: ['Captions missing on {photog}’s pictures', 'No captions in the inbox', 'Where have the captions gone?'],
		open: [
			'{photog}’s pictures from {job} arrived without any captions. Photo Mechanic says they were captioned on the laptop.',
			'None of {photog}’s frames from {place} have captions in Depot, which holds up the whole set.'
		],
		more: ['Everyone else’s captions came through.', ''],
		ask: ['I think the captions are in separate files next to the pictures. Let me check with {photog}.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['{photog}’s Photo Mechanic writes captions into .xmp files next to the raws. The upload only had *.{ext}. {photog} sent me a listing:'],
				lookWho: 'd',
				lookPaste: 'lsSidecar',
				ends: [
					[
						['d', '{photog}’s captions are in .xmp files next to each picture, and only the raw files were sent. Sending the .xmp files too (for example `*.{ext} *.xmp`) brings the captions with them.'],
						['g', 'Sent the .xmp files now. Didn’t know mine worked differently.'],
						['e', 'Captions are showing. Thanks.']
					],
					[
						['d', 'The captions are in .xmp files beside each picture, and only the raws went. They can be sent separately, but it would be easier if the uploader always sent a picture’s .xmp with it.'],
						['e', 'Yes please, we have three photographers who work that way.'],
						['d', 'I’ll make it send matching .xmp files along with each picture.']
					]
				]
			}
		]
	},
	// A token shown in a screenshot.
	{
		from: 'photo',
		shows: 'none',
		subjects: ['Token visible in my screenshot', 'Posted my token by mistake', 'Oops, token in the channel'],
		open: [
			'I posted a screenshot of my terminal in the desk channel to show the error, and someone pointed out my Depot token is visible in it. I’ve deleted the post. What do I do?',
			'My token was in a screenshot I sent to the agency picture desk. Is that bad?'
		],
		more: ['Sorry!', ''],
		ask: ['Thanks for saying so quickly. I’ll ask Depot to cancel that token and issue a new one.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['Old token revoked, new one in the vault. No use of the old token from anywhere unexpected.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Depot has cancelled the old token and put a new one in the vault. To keep it off the screen in future, keep it in a file and use `DEPOT_TOKEN=$(cat ~/.depot-token)`, as several people do.'],
						['r', 'New token in, and I’ve set it up the file way. Thanks.']
					],
					[
						['d', 'Depot has cancelled the old token; your new one is in the vault. Typing it on the command line is what puts it on the screen.'],
						['r', 'Could the uploader just get it from the keychain? Then nobody would have to type it.'],
						['d', 'Reasonable. I’ll look at reading it from the keychain on Macs for the next release.']
					]
				]
			}
		]
	},
	// Depot itself failing.
	{
		from: 'photo',
		shows: 'tb:chunk:503',
		subjects: ['Uploader crashed with HTTP 503', 'Depot down?', 'Upload failed partway', 'chunk upload failed with HTTP 503', 'Big red error, did my pictures go?'],
		open: [
			'Big red error halfway through {job}. Did my pictures go? Some of them, all of them?',
			'Upload failed partway with “chunk upload failed with HTTP 503”. Is Depot down?',
			'Sending from {place}, it got through some of the card and then died. The screen filled with red text and I have no idea what went.'
		],
		more: ['The desk is waiting.', 'I re-ran it and it failed again.', ''],
		ask: ['A 503 comes from Depot, not from your laptop. Let me check with the Depot team what happened at that time.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['Incident {inc}: a storage node behind the upload service filled up between {incStart} and {incEnd}; uploads in that window got 503s.'],
				lookWho: 'p',
				lookPaste: 'status503',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Depot had an incident at that time: uploads were refused for about an hour. It’s fixed now. The files that finished before it are in the inbox; send the rest again.'],
						['r', 'Sent the rest, all there now.¶']
					],
					[
						['d', 'Depot had an incident while you were sending. It’s over now, so sending the rest of the card will work.'],
						['r', 'Done. Honestly, the error was scarier than the problem. Could it say something in plain words instead of all that red text?'],
						['d', 'It should, and it will: the next release prints a one-line message when an upload fails instead of the traceback.']
					]
				]
			},
			{
				direct: true,
				detail: [],
				look: ['No incident. The desk inbox hit its storage quota at {time}; every upload after that got a 503 from the storage layer. Raised the quota and asked the desk to archive older shoots.'],
				lookWho: 'p',
				lookPaste: 'access503',
				team: 'the Depot team',
				ends: [
					[
						['d', 'The desk inbox was full: Depot refuses new files once it reaches its storage limit. {depot} has raised the limit, and the desk is archiving older shoots to make room.'],
						['e', 'Archiving now. Sorry, that’s on us.'],
						['r', 'Sent again, all through.¶']
					]
				]
			}
		]
	},
	// Updating the uploader fails.
	{
		from: 'staff',
		subjects: ['Can’t update the uploader', 'git pull fails', 'Update instructions don’t work', 'Permission denied when updating'],
		open: [
			'I tried to update the uploader the way the release note in #desk-tools said, and git refuses.',
			'Ran `git pull` in the uploader folder to get the latest version and it errors out. Pasted below.'
		],
		more: ['The old version still works for now.', 'I’d like the new one before {day}.', ''],
		ask: ['Thanks. Is this the laptop you’ve always used, or a new one?', 'Has anything changed on that laptop recently, or is it new?'],
		paths: [
			{
				shows: 'gitKey',
				detail: ['New one, {laptop}, since last month.', 'It’s the replacement laptop IT gave me in {month}.'],
				look: ['New laptops don’t get an SSH key for the git server any more. Desk laptops are meant to fetch over HTTPS, which the office network allows without a key.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The new laptops don’t have a key for the git server, but they don’t need one: switch the folder to fetch over HTTPS with `git remote set-url origin https://git.tallowmere.example/desk-tools/depot-uploader.git`, then `git pull` works from the office network.'],
						['r', 'Done, pulled fine.']
					],
					[
						['d', 'New laptops fetch over HTTPS instead of with a key. I’ve asked IT to set that up on your laptop along with the other new machines.'],
						['i', 'Switched all the new desk laptops’ uploader folders to HTTPS.'],
						['r', 'Confirmed, `git pull` works now.']
					]
				]
			},
			{
				shows: 'gitLocal',
				detail: ['Same laptop as always. I did change something in the settings file in August when Depot was testing their new servers, Halvard asked a few of us to.', 'Same one. Depot had me point it at their test server back in August, maybe that’s it?'],
				look: ['Leftover edit to uploader/config.py from Depot’s migration test in August. Throwing it away is safe; the test server has gone.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'That’s the change from Depot’s test in August, still sitting in uploader/config.py. The test server has gone, so it’s safe to throw away: run `git checkout -- uploader/config.py`, then `git pull`.'],
						['r', 'Did both, it updated. Thanks.']
					]
				]
			}
		]
	},
	// Straight from the camera.
	{
		from: 'photo',
		shows: 'none',
		subjects: ['Upload straight from the camera?', 'Request: FTP from the camera', 'Can Depot take pictures from the camera directly', 'Leaving the laptop at home'],
		open: [
			'The {camera} can send pictures over FTP straight from the camera to a server. Could Depot take them that way, so I don’t need the laptop at all at matches?',
			'Request: most of us have cameras that can push frames to an FTP server as we shoot. Could the uploader, or Depot, take them like that?'
		],
		more: ['The agencies have done it for years.', 'It would get pictures to the desk minutes earlier.'],
		ask: ['It’s a good question, but it’s Depot that would have to accept them. Let me ask.'],
		paths: [
			{
				direct: true,
				detail: [],
				look: ['Depot has no FTP and won’t open one on the public side. An FTP gateway that feeds the inbox is on the 2027 list.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'The uploader can’t help here: the camera would have to talk to Depot directly. Depot doesn’t accept FTP today, and a gateway for it is on their list for next year. I’ve left the request with them.'],
						['r', 'Next year then. Thanks for asking.']
					],
					[
						['d', 'Depot doesn’t take FTP, and won’t this year. I asked the desk whether the old picture server could take frames from the cameras in the meantime.'],
						['e', 'I’d rather not: we’ve just moved everything into Depot and I don’t want two places to look on match days.'],
						['r', 'Understood. Laptop it is.']
					]
				]
			}
		]
	},
	// Grey thumbnails in the console.
	{
		from: 'editor',
		shows: 'none',
		subjects: ['Grey thumbnails on {photog}’s pictures', 'No previews in Depot', '“Format not supported” in the console'],
		open: [
			'{photog}’s pictures from {job} show grey squares instead of thumbnails, and the preview says “format not supported”. Everyone else’s are fine.',
			'Every frame {photog} has sent since {weekday} has no preview in the console, so we can’t pick from it.'
		],
		more: ['The files download and open fine in Photoshop.', ''],
		ask: ['Has {photog} changed camera recently?'],
		paths: [
			{
				detail: ['Yes, {photog} started on a new body this week, the {newCamera}.', 'Just checked: new camera, a {newCamera}, since last week.'],
				look: ['Our preview service doesn’t know that camera’s raw files yet. The library update that adds it is due in next week’s release.'],
				lookWho: 'p',
				lookPaste: 'none',
				team: 'the Depot team',
				ends: [
					[
						['d', 'Depot’s preview service doesn’t know the {newCamera} yet. The files are fine; the update that adds it goes out next week, and {depot} will rebuild the previews for everything already sent.'],
						['p', 'Update is live and the previews for {photog}’s uploads have been rebuilt.'],
						['e', 'Thumbnails are there now. Thanks.']
					],
					[
						['d', 'Depot can’t make previews for the {newCamera} yet; the update is due next week. In the meantime, if {photog} shoots raw plus JPEG and sends both, the desk can pick from the JPEGs.'],
						['g', 'Switched the camera to raw plus JPEG and sent both.'],
						['e', 'Picking from the JPEGs works for us until Depot catches up.']
					]
				]
			}
		]
	},
	// The set arrives out of order.
	{
		from: 'editor',
		shows: 'consoleOrder',
		subjects: ['{photog}’s set arrived in the wrong order', 'End of the match first?', 'Pictures out of order in the inbox'],
		open: [
			'{photog}’s set from {job} arrived in a strange order: the end of the match is at the top and the warm-up at the bottom. Copied the first rows below.',
			'The pictures from {job} came in out of order, so the inbox shows the last frames first. It slowed the night desk down a lot.'
		],
		more: ['Not the first time with {photog}’s card.', ''],
		ask: ['Thanks. Let me look at the names on the card.'],
		paths: [
			{
				names: 'rollover',
				direct: true,
				detail: [],
				look: ['The camera’s frame counter went past 9999 and started again at 0001 during the match. The uploader sends files in the order of their names, so the frames after the rollover went first.'],
				lookWho: 'd',
				lookPaste: 'none',
				ends: [
					[
						['d', 'The camera’s counter went past 9999 and started again at 0001 during the match, and the uploader sends files in name order, so the later frames went first. The uploader should send them in the order they were taken; I’m changing that.'],
						['e', 'Thanks. Until then I’ll sort by the time they were taken in the console.']
					],
					[
						['d', 'The frame counter rolled over from 9999 to 0001 partway through, and files go in name order. Resetting the counter before a big job (or starting a new folder on the card) avoids it.'],
						['g', 'Reset the counter on both bodies. Should be fine for a while now.'],
						['e', 'Great, thanks.']
					],
					[
						['d', 'The camera’s counter rolled over, so the names don’t follow the order of the match. The console can sort the inbox by when each picture was taken rather than by arrival: “Sort by” above the list.'],
						['e', 'Didn’t know that was there. Sorted by time taken and it’s fine.']
					]
				]
			}
		]
	}
);

// The talk around the matter: greetings, sign-offs, where the photographer was, a second question raised on the way,
// the picture desk asking after its pictures, chasers.
const greetings = ['Hi both,', 'Hi desk tools,', 'Hello,', 'Hi,', '', '', 'Hi Nadia, hi Jonah,'];
const reporterSigns = ['{name}', 'Cheers, {name}', 'Thanks, {name}', '{name}\n\nSent from my iPhone', '— {name}', 'Thanks\n{full}', ''];
const devOpens = ['Hi {name},', '{name},', 'Hi {name},', 'Hello {name},'];
const devSigns = ['{dev}', '— {dev}', 'Thanks,\n{dev}', '{dev}\nDesk tools'];
const acks = ['Thanks for the report.', 'Sorry about that, and thanks for writing it all down.', 'Thanks for pasting the error, that helps.', 'Sorry for the trouble.', 'Thanks for raising it here rather than struggling on.', ''];
const situations: Record<Conn, string[]> = {
	studio: ['I’m at my desk in the office, on the cable.', 'This is from the office, docked at the desk next to the picture desk.', 'At the office, wired in, nothing unusual.'],
	press: ['I’m in the press room at {place}, on their Wi-Fi.', 'Sending from the media centre at {place}; the Wi-Fi there has been fine all season.', 'At {place}, on the press Wi-Fi, with {n} frames to send.'],
	mobile: ['I’m in the car at {place}, sending over my phone.', 'Sending from the van at {place}.', 'On my phone’s hotspot at {place}; the signal looks fine.'],
	hotel: ['Back at {place} after the shows, on the hotel Wi-Fi.', 'In my room at {place}, editing and sending as I go.'],
	home: ['Sending from home, on my own broadband.', 'From home this evening, after editing the set at the kitchen table.']
};
const nudges = [
	'Any idea when {photog}’s pictures from {job} will be in? We’re holding a space for them.',
	'Is there anything the desk can do? We need at least the picks from {job} tonight.',
	'{photog}, if it’s quicker, email me five picks and send the rest once this is sorted.',
	'Following this one: the pictures from {job} are for tomorrow’s paper.'
];
const retried = ['Ran it again just now, same thing:', 'Tried once more before replying. Same again:', 'Second go, same result:'];
const tries = [
	'I’ve restarted the laptop since, no change.',
	'Tried a second time a few minutes later, same thing.',
	'I closed everything else on the laptop in case that mattered.',
	'I checked I was in the depot-uploader folder, which I was.',
	'I haven’t updated anything on the laptop that I know of.',
	'Ran it from a fresh terminal window as well, same result.',
	'I’m on the version from the last release note, I think.'
];
const thanksBack = ['Great, glad it’s working.', 'Good to hear. Shout if it happens again.', 'Thanks for confirming.', 'Glad that did it.'];
const clarify: [string, string][] = [
	['How many files were in the batch, roughly?', '{n}, after the edit.'],
	['And roughly what time was the first failure? I’d like to line it up with Depot’s logs.', 'About {time}, give or take.'],
	['Did it get as far as sending anything, as far as you could tell?', 'No idea, honestly. It didn’t say.']
];
const reassure = ['Whatever it turns out to be, the pictures themselves are safe: the uploader only reads them.', 'Nothing is lost: anything that didn’t reach Depot is still where it was on your side.'];
const meanwhile = ['In the meantime I’ve emailed {editor} a few picks so the desk isn’t stuck.', 'For now I’ve put the best ten on the shared drive for the desk.', 'I’ve sent the picks by WeTransfer for now.'];
const deadline = ['I’ve got {nextJob} on {day}, so it would be good to have this working by then.', 'It would help to have it sorted before {nextJob}.'];
const goAhead = ['Let me know how you get on.', 'Give it a go and tell me if it works.', 'Shout if it still fails.'];
const onIt = ['{editor}: on it, I’ll update here.', '({editor}, looking at it now.)', '{editor}, I’ll keep you posted here.'];
const stories: Record<Desk, string[]> = {
	sport: ['Shot the first half, edited at half time and started sending straight away.', 'Full card after a quick edit, {n} frames, and the desk wanted them straight away.', 'I’d edited down to {n} frames in Photo Mechanic and set it going.'],
	news: ['Edited down to {n} frames and started sending before the next briefing.', 'I had about an hour before moving on, so I edited quickly and set it going.', 'Only {n} frames after the edit, so it should have been quick.'],
	features: ['The client wanted the full edit the same day, {n} frames.', 'Finished the shoot, edited the selects and started the upload.', 'It’s {n} frames after the edit, nothing unusual.']
};
const checks: Partial<Record<Who, string[]>> = {
	d: ['Checked Depot’s log for {photog}’s token around {time}.', 'Went through the paste line by line.', 'Rang {photog} to go through it.', ''],
	p: ['Looked at this with {depotOther}.', 'Checked our logs for that token.', ''],
	i: ['Looked {laptop} up in the asset list.', '']
};
const deskContext = ['It’s the busiest night of the week for us.', 'The agency is waiting on our selection.', 'We’re short-handed tonight, so anything that slows picking hurts.', ''];
const holdingMore = ['They’re usually quick.', 'It may be tomorrow before they get to it.', 'I’ve marked it as blocking your uploads so it doesn’t sit in their queue.'];
const thanksLine = ['Thanks for the quick reply.', 'Much appreciated.', '', ''];
const deskAcks = ['Got them, thanks.', 'All in, thanks {photog}.', 'Picking now, thanks.'];
const oneMore = ['One more thing while I think of it: ', 'Also, unrelated: ', 'Oh, and ', 'Last thing, I promise: '];
const confirmations = ['For the record:', 'Summary below in case it’s useful.', 'Here’s the summary.', ''];
const holding = [
	'This one needs {team}, so I’ve passed it over with your details. I’ll come back to you when I hear.',
	'I’ve asked {team} to take a look and will update you here.',
	'Waiting on {team} for this; I’ll let you know as soon as I hear.'
];
const chasers = ['Any news on this?', 'Just checking this hasn’t got lost.', 'Sorry to chase. I’ve got {nextJob} coming up and need it working.', 'Hello? Still stuck on this.'];
const sides: [string, string][] = [
	['While I have you: is it fine to send JPEGs as well as raws?', 'And yes, JPEGs are fine: it sends whatever files you give it.'],
	['Also, do I need to keep the card in until the summary comes up?', 'On the card: yes, keep it in until the summary appears, because the files are read straight from it as it goes.'],
	['Unrelated, but can I run two uploads at once from two card readers?', 'Two at once is fine. Each run is separate, though each will be a bit slower.'],
	['Does the uploader delete anything from the card once it’s sent?', 'And no, it never deletes or changes anything on the card. It only reads.'],
	['Is there a way to see what I’ve sent today?', 'For what you’ve sent today: the Depot console’s inbox, filtered on your name, shows every file and when it arrived.'],
	['Should I be updating the uploader myself, or does IT do that?', 'Updates are yours to do: `git pull` in the depot-uploader folder. We announce each release in #desk-tools.'],
	['Can I use it on the iPad?', 'Not on the iPad, sorry: it needs a Mac or a PC with Python.'],
	['Where’s the token kept, in case I lose it again?', 'Your token is in the desk vault under “Depot tokens”.'],
	['Does it matter if I rename the files after they’ve gone?', 'Renaming them afterwards makes no difference to Depot: it keeps the name each file had when it was sent.'],
	['Can the desk see the files before the summary comes up?', 'And yes, the desk sees each file as soon as it has finished, even while the rest are still going.'],
	['Is 0.3.0 the latest version, by the way?', '0.3.0 is the latest; the next one is due before Christmas.'],
	['Do I need the VPN for Depot?', 'No VPN needed: Depot can be reached from anywhere with your token.'],
	['Can my assistant use my token at the weekend?', 'Please don’t share tokens: ask {editor}, and Depot will issue one for your assistant.']
];
const channels = ['desk tools form', 'desk tools form', 'email to desk tools', 'the #desk-tools channel'];
const newCameras = ['Canon EOS R1', 'Nikon Z6III', 'Sony A9 III', 'Canon EOS R5 Mark II'];

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});
const titleOf = (slug: string) => slug.split('-').map(cap).join(' ');
const hash = (text: string) => [...text].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
/** Says whether a message already places the photographer somewhere. */
const placed = (text: string) => /\{place\}|home|office|van|car park|hotel|press|Wi-Fi|field|from the|room/.test(text);

/** The pasted output a key names, built for this report. */
const pasteOf = (key: string | undefined, c: Ctx): string => {
	if (!key || key === 'none') return '';
	const r = c.r;
	const [kind, arg, extra] = key.split(':');
	const minute = c.open - int(r, 15, 80);
	switch (kind) {
		case 'tb':
			return runTrace(c, arg as TraceKind, extra ? Number(extra) : undefined, c.shots[arg === 'glob' || arg === 'perm' ? 0 : int(r, 0, Math.min(3, c.shots.length - 1))]!.name, arg === 'dir' ? c.src : undefined);
		case 'tail':
			return block(`${command(c)}\n…\nuploader.client.UploadError: chunk upload failed with HTTP ${arg}`) + '\n\n(there was a lot more above it)';
		case 'summary':
			return summaryPaste(c);
		case 'renamed': {
			const files = c.shots.map((shot) => ({ ...shot, name: shot.name.replace(/ /g, '_').normalize('NFD').replace(/[̀-ͯ]/g, '').replace('Å', 'A') }));
			return summaryPaste(c, files);
		}
		case 'summaryRetries': {
			const picks = shuffle(r, c.shots.map((_, i) => i).slice(0, Math.min(10, c.shots.length))).slice(0, int(r, 2, 3));
			return summaryPaste(c, c.shots.slice(0, Math.min(c.shots.length, 14)), c.mbit, picks);
		}
		case 'twoRuns':
			return twoRuns(c, c.mbit / (4 + r() * 3));
		case 'ls':
			return lsPaste(c, c.shots);
		case 'lsZero':
			return lsPaste(c, c.shots, [Number(c.values.zeroAt), Number(c.values.zeroAt) + 1 + int(r, 0, 2), Number(c.values.zeroAt) + 4]);
		case 'consoleCut':
			return consolePaste(c, rowsFor(c, c.shots.slice(0, int(r, 7, 12)), minute).map((row) => ({ ...row, name: c.values.tagFirst! })));
		case 'consoleAssembling':
			return consolePaste(c, rowsFor(c, c.shots.slice(0, int(r, 6, 11)), minute, 'assembling'));
		case 'consoleOrder':
			return consolePaste(c, rowsFor(c, [...c.shots].sort((a, b) => (a.name < b.name ? -1 : 1)).slice(0, int(r, 8, 12)), minute));
		case 'consoleEmpty':
			return consolePaste(c, [{ name: c.src.split('/').at(-1)!, status: 'empty', chunks: 0, size: '0 B', minute: c.open - int(r, 2, 9) }]);
		case 'consoleIncomplete': {
			const done = Number(c.values.count);
			const rows = rowsFor(c, c.shots.slice(Math.max(0, done - int(r, 4, 7)), done), Number(c.values.stoppedAt));
			const next = c.shots[done]!;
			const all = chunksOf(next.bytes);
			return `Last few rows of the inbox, newest at the bottom:\n\n${consolePaste(c, [...rows, { name: next.name, status: 'incomplete', chunks: `${int(r, 0, all - 1)} of ${all}`, size: human(next.bytes), minute: rows.at(-1)!.minute + 1 }])}`;
		}
		case 'consoleDupes': {
			const rows: ConsoleRow[] = [];
			let m = minute - 90;
			const base = c.shots.slice(0, int(r, 4, 6));
			for (let round = 0; round < 3; round++) {
				m += int(r, 18, 40);
				base.forEach((file, i) => {
					if (round === 2 && i > 2) return;
					const broken = round === 0 && i === base.length - 1;
					rows.push({ name: file.name, status: broken ? 'incomplete' : 'ready', chunks: broken ? `1 of ${chunksOf(file.bytes)}` : chunksOf(file.bytes), size: human(file.bytes), minute: m + i });
				});
			}
			return consolePaste(c, rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.minute - b.minute)));
		}
		case 'access401': {
			let m = c.open - int(r, 30, 200);
			const lines = Array.from({ length: int(r, 3, 6) }, () => accessLine(c, (m += int(r, 1, 40)), int(r, 0, 59), 'POST', `/uploads?name=${c.shots[0]!.name}`, 401, 0, ' err=token_retired'));
			return block(lines.join('\n'));
		}
		case 'access503':
			return accessPaste(c, Number(c.values.timeAt) - int(r, 0, 2), [[200], [503, 503, 503, 503, 503]], ' err=quota_exceeded', true);
		case 'accessForm':
			return accessPaste(c, minute, [], ' ct=application/x-www-form-urlencoded rule=form-post(log-only)');
		case 'status503':
			return statusPage(c, Number(c.values.incStartAt), 'A storage node behind the upload service ran out of disk space. Moving new chunks to the other nodes.', 'Uploads are being accepted again. Clients should send any files that failed during this window again.');
		case 'netq':
			return speedTest(c, c.conn === 'mobile' ? 1.5 + r() * 4.5 : c.mbit);
		case 'uplink':
			return uplinkTable(c, arg!);
		case 'pip39':
			return pip39(c);
		case 'oldCopy':
			return oldCopy(c);
		case 'zsh':
			return zshNoMatch(c);
		case 'powershell':
			return powershell(c);
		case 'env':
			return envPaste(c);
		case 'consoleMixed':
		case 'consoleClash': {
			// The desk inbox on a busy afternoon: several photographers' sets arriving at once.
			const senders = shuffle(r, photographers.filter((p) => !p.windows && p.desk === c.who.desk && p !== c.who)).slice(0, kind === 'consoleClash' ? 1 : 3);
			const sets = [c.who, ...senders].map((p) => {
				const kitOf = kits[p.kit]!;
				const start = kind === 'consoleClash' ? Number(c.values.frameAt) : undefined;
				return { p, files: makeShots(r, kitOf, kind === 'consoleClash' ? kitOf.prefix : (p.prefix ?? kitOf.prefix), int(r, 3, 5), start) };
			});
			let m = minute;
			const rows: string[] = [];
			for (let i = 0; i < 5; i++)
				for (const { p, files } of sets) {
					const file = files[i];
					if (!file) continue;
					m += r() < 0.5 ? 1 : 0;
					rows.push(`| ${file.name} | ready | ${chunksOf(file.bytes)} | ${human(file.bytes)} | ${p.user} (${p.laptop}) | ${shortDayMonth(m)} ${clock(m)} |`);
				}
			return [`| Name | Status | Chunks | Size | Uploaded by | Started |`, `| --- | --- | --- | --- | --- | --- |`, ...rows].join('\n');
		}
		case 'consoleRemoved':
			return consolePaste(c, rowsFor(c, c.shots.slice(0, Math.min(Number(c.values.count), int(r, 6, 10))), minute, 'removed'));
		case 'lsSidecar': {
			const files = c.shots.slice(0, int(r, 5, 8)).flatMap((shot) => [shot, { name: shot.name.replace(/\.\w+$/, '.xmp'), bytes: int(r, 2600, 7400) }]);
			return lsPaste(c, files);
		}
		case 'gitKey':
			return gitPull(c, 'key');
		case 'gitLocal':
			return gitPull(c, 'local');
	}
	throw new Error(`unknown paste ${key}`);
};

interface Plan {
	topic: Topic;
	path: Path;
	day: number;
}

const report = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x5eed4000 + index * 7919);
	const { topic, path } = plan;

	// Who reports, and whose laptop and pictures are involved.
	const pool =
		topic.from === 'windows'
			? photographers.filter((p) => p.windows)
			: path.free
				? photographers.filter((p) => p.free && !p.windows)
				: path.names === 'sitter'
					? photographers.filter((p) => p.desk === 'features')
					: path.names === 'amp'
						? photographers.filter((p) => p.desk !== 'sport' && !p.windows)
						: topic.from === 'staff'
							? photographers.filter((p) => !p.free)
							: photographers.filter((p) => !p.windows);
	const who = pool[(index * 5 + int(r, 0, 6)) % pool.length]!;
	const desk = who.desk;
	const kit = kits[who.kit]!;
	const prefix = who.prefix ?? kit.prefix;
	const sitter = sitters[(index + int(r, 0, 6)) % sitters.length]!;
	const amp = ampersandJobs[(index + int(r, 0, 3)) % ampersandJobs.length]!;
	const deskJobs = jobs[desk];
	const wanted = path.conn ?? topic.conn;
	const fitting = deskJobs.filter((j) => !wanted || j.conn === wanted);
	const choices = fitting.length ? fitting : deskJobs;
	const job: Job =
		path.names === 'amp'
			? { job: amp.job, place: amp.place, slug: amp.rest.toLowerCase(), conn: 'press' }
			: path.names === 'sitter'
				? { job: `the portrait of ${sitter[0]}`, place: 'the studio', slug: `portrait-${sitter[0].split(' ')[1]!.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase()}`, conn: 'studio' }
				: choices[(index * 3 + int(r, 0, 5)) % choices.length]!;
	const conn = path.conn ?? topic.conn ?? job.conn;
	const [low, high] = uplinkMbit[conn];
	const mbit = low + r() * (high - low);

	// When it was opened.
	let open = plan.day * DAY + (topic.from === 'editor' ? int(r, 8 * 60, 23 * 60) : int(r, 7 * 60, 22 * 60 + 30));
	if (topic.from === 'depot') open = office(r, plan.day * DAY + int(r, 9 * 60, 16 * 60));
	if (topic.shows === 'twoRuns') open = plan.day * DAY + int(r, 19 * 60 + 40, 21 * 60);
	if (topic.shows === 'tb:json') {
		let d = plan.day * DAY;
		if (path.look[0]!.includes('Tuesday')) while (at(d).getUTCDay() !== 2) d -= DAY;
		open = d + int(r, 6 * 60 + 2, 6 * 60 + 40);
	}

	const editor = topic.from === 'editor' || open % DAY < 19 * 60 ? editors[desk] : editors.night;
	const reporter = topic.from === 'editor' ? editor : topic.from === 'depot' ? depotTeam[index % 2]! : who.full;
	const role = topic.from === 'editor' ? editorRoles[editor]! : topic.from === 'depot' ? 'Depot team' : `${who.free ? 'freelance' : 'staff'} photographer (${desk})`;
	const dev = deskTools[(index + int(r, 0, 1)) % 2]!;
	const dev2 = deskTools.find((name) => name !== dev)!;
	const depot = topic.from === 'depot' ? reporter : pick(r, depotTeam);
	const it = pick(r, itDesk);
	const n = int(r, 18, 140);
	const special = path.names;
	const tag = amp.tag;
	const shots: Shot[] = makeShots(r, kit, prefix, n, special === 'rollover' ? 9999 - int(r, 4, 12) * 7 : undefined).map((shot, i) => {
		if (special === 'spaced') return { ...shot, name: `${titleOf(job.slug)} ${pad(i + 1, 3)}.${kit.ext}` };
		if (special === 'sitter') return { ...shot, name: `${sitter[0].replace(' ', '_')}_${pad(i + 1, 2)}.${kit.ext}` };
		if (special === 'amp') return { ...shot, name: `${tag}_${amp.rest}_${pad(i + 1, 3)}.${kit.ext}` };
		return shot;
	});
	const card = ['tb:perm', 'tb:eio', 'tb:complete:422', 'zsh', 'tb:glob'].includes(path.shows ?? topic.shows ?? '') || (!special && r() < 0.45);
	const home = `/Users/${who.user}/depot-uploader`;
	const brew = hash(who.user) % 3 === 0;
	const lib = brew ? `/opt/homebrew/Cellar/python@3.13/3.13.${int(r, 5, 9)}/Frameworks/Python.framework/Versions/3.13/lib/python3.13` : '/Library/Frameworks/Python.framework/Versions/3.13/lib/python3.13';
	const src = card ? `/Volumes/${kit.volume}/DCIM/${kit.folder}` : `/Users/${who.user}/Pictures/Ingest/${iso(open)}_${job.slug}`;
	const count = Math.min(n - 6, int(r, 6, 48));
	const incStartAt = open - int(r, 40, 110);
	const timeAt = open - int(r, 3, 25);
	const others = photographers.filter((p) => p.desk === desk && p !== who && !p.windows);
	const colleague = others[int(r, 0, others.length - 1)]!;
	const otherJobs = deskJobs.filter((j) => j !== job);

	const values: Record<string, string> = {
		name: first(reporter),
		full: reporter,
		photog: first(who.full),
		photogFull: who.full,
		job: job.job,
		jobShort: titleOf(job.slug),
		place: job.place,
		n: String(n),
		count: String(count),
		file: shots[int(r, 3, Math.min(20, n - 1))]!.name,
		laptop: who.laptop,
		oldLaptop: `DL-${pad(int(r, 20, 31))}`,
		camera: kit.camera,
		newCamera: pick(r, newCameras),
		day: nextWorkday(open),
		weekday: weekday(open - int(r, 1, 4) * DAY),
		month: monthNames[at(open - int(r, 20, 40) * DAY).getUTCMonth()]!,
		date: dayMonth(open),
		time: clock(timeAt),
		timeAt: String(timeAt),
		fixTime: clock(open + int(r, 35, 95)),
		incStart: clock(incStartAt),
		incStartAt: String(incStartAt),
		incEnd: clock(open + int(r, 10, 50)),
		blockDate: dayMonth(startOfDay(open) + int(r, 14, 21) * DAY),
		dev: first(dev),
		dev2: first(dev2),
		editor: first(editor),
		depot: first(depot),
		depotOther: first(depotTeam.find((name) => name !== depot)!),
		it: first(it),
		net: first(network),
		video: first(video),
		inc: `INC-${int(r, 2210, 2390)}`,
		ext: kit.ext,
		extLower: kit.ext.toLowerCase(),
		prefix,
		sitter: sitter[0],
		sitterFirst: sitter[0].split(' ')[0]!,
		accent: sitter[1],
		tag,
		tagFirst: tag.split('&')[0]!,
		tagRest: tag.split('&')[1]!,
		status: (path.shows ?? topic.shows ?? '').split(':')[2] ?? '401',
		lastJob: pick(r, otherJobs).job,
		nextJob: pick(r, otherJobs).job,
		colleague: first(colleague.full),
		gb: String(int(r, 4, 9)),
		zeroAt: String(int(r, 3, Math.min(12, n - 6))),
		stoppedAt: String(open - (topic.shows === 'tb:reset' ? int(r, 180, 540) : int(r, 60, 130))),
		frameAt: String(int(r, 300, 9000)),
		ip: conn === 'studio' ? `203.0.113.${int(r, 10, 60)}` : `198.51.100.${int(r, 2, 250)}`
	};
	const c: Ctx = { r, who, kit, shots, job, conn, mbit, open, home, lib, src, prompt: `${who.user}@${who.laptop} depot-uploader % `, tokenTail: hex(r, 4), upload: uploadId(r), editor, values };
	const f = (text: string) => fill(text, values);

	// The thread.
	const names: Record<Who, string> = { r: reporter, g: who.full, d: dev, D: dev2, p: depot, i: it, n: network, v: video, e: topic.from === 'editor' ? reporter : editor, s: '' };
	const labels: Partial<Record<Who, string>> = { d: ' (desk tools)', D: ' (desk tools)', p: ' (Depot)', i: ' (IT service desk)', n: ' (network)', v: ' (video)', e: ' (picture desk)' };
	if (topic.from === 'depot') labels.r = ' (Depot)';
	if (topic.from === 'editor') labels.r = ' (picture desk)';
	const messages: string[] = [];
	let t = open;
	const advance = (w: Who) => {
		if (w === 'r' && topic.from === 'depot') t = office(r, t + int(r, 20, 300));
		else if (w === 'r' || w === 'g' || w === 'e') t = waking(r, t + int(r, 6, 200));
		else if (w === 'd' || w === 'D') t = office(r, t + int(r, 8, 150));
		else if (w === 's') t = startOfDay(t) + 7 * DAY + 9 * 60;
		else t = office(r, t + int(r, 25, 900));
		values.day = nextWorkday(t);
	};
	const say = (w: Who, body: string, internal = false) => {
		if (w === 's') {
			messages.push(`_${body}_ · ${stampShort(t)}`);
			return;
		}
		messages.push(`**${names[w]}**${labels[w] ?? ''} · ${stampShort(t)}${internal ? ' · internal note' : ''}\n\n${body}`);
	};
	const photographerReports = topic.from !== 'editor' && topic.from !== 'depot';
	const greetingFor = () => {
		const hour = minuteOfDay(t) / 60;
		return pick(r, [...greetings, hour < 12 ? 'Morning,' : hour >= 17 ? 'Evening,' : 'Afternoon,']);
	};
	const channel = pick(r, channels);
	const email = channel.startsWith('email');
	const mobile = `07700 900${pad(int(r, 0, 999), 3)}`;
	const reporterBody = (parts: string[], opening: boolean, photographer = false) => {
		const greeting = opening && photographerReports ? greetingFor() : '';
		const sign = photographer
			? pick(r, [first(who.full), `Thanks, ${first(who.full)}`, `— ${first(who.full)}`, ''])
			: email
				? `${reporter}\n${cap(role.replace(/ \(.*\)$/, ''))}, Tallowmere${photographerReports ? `\nM: ${mobile}` : ''}`
				: topic.from === 'depot'
					? first(reporter)
					: f(pick(r, reporterSigns));
		return [greeting, ...parts.filter(Boolean), sign].filter(Boolean).join('\n\n');
	};
	const devBody = (parts: string[], greet: boolean) => [greet ? f(pick(r, devOpens)) : '', ...parts.filter(Boolean), email ? `${dev}\nDesk tools · Tallowmere` : f(pick(r, devSigns))].filter(Boolean).join('\n\n');
	const blocking = photographerReports && /^(tb:|zsh|pip39|powershell)/.test(path.shows ?? topic.shows ?? '');
	let nudged = false;
	const askText = () => {
		const ask = f(pick(r, topic.ask));
		const parts = [nudged ? f(pick(r, onIt)) : '', ask.startsWith('Thanks') ? '' : f(pick(r, acks)), ask, blocking && r() < 0.5 ? pick(r, reassure) : ''];
		nudged = false;
		return parts;
	};
	const pending: string[] = [];
	const side = photographerReports && r() < 0.85 ? pick(r, sides) : undefined;
	const shows = path.shows ?? topic.shows;

	// 1. The report.
	const opening = f(pick(r, topic.open));
	const extras = shuffle(r, topic.more.filter((text) => text && !text.endsWith(':')));
	const lead = pick(r, topic.more);
	const openParts = [opening, f(lead), !lead.endsWith(':') && extras[0] && extras[0] !== lead && r() < 0.6 ? f(extras[0]) : '', topic.from === 'editor' ? pick(r, deskContext) : ''];
	if ((blocking || shows?.startsWith('summary')) && !topic.noContext && !placed(opening) && r() < 0.75) openParts.unshift(f(pick(r, situations[conn])));
	if (blocking && shows !== 'pip39' && r() < 0.8) openParts.splice(openParts.length - 1, 0, f(pick(r, stories[desk])));
	if (photographerReports && /^(tb:|zsh|pip39|powershell|git)/.test(shows ?? '') && r() < 0.6) openParts.push(shuffle(r, tries).slice(0, int(r, 1, 2)).join(' '));
	openParts.push(pasteOf(shows, c));
	if (side && path.direct) {
		openParts.push(f(side[0]));
		pending.push(f(side[1]));
	}
	say('r', reporterBody(openParts, true));
	if (blocking && !who.free && r() < 0.55) {
		advance('e');
		say('e', `${f(pick(r, nudges))}\n\n${first(editor)}`);
		nudged = true;
	}

	// 2. Desk tools asks, and the reporter answers.
	if (!path.direct) {
		advance('d');
		say('d', devBody(askText(), true));
		advance('r');
		const answer = [f(pick(r, path.detail)), pasteOf(path.paste, c)];
		if (photographerReports && shows?.startsWith('tb:') && r() < 0.3) answer.push(pick(r, retried), pasteOf(shows, c));
		if (blocking && r() < 0.25) answer.push(f(pick(r, deadline)));
		if (side) {
			answer.push(f(side[0]));
			pending.push(f(side[1]));
		}
		say('r', reporterBody(answer, false));
		if (blocking && r() < 0.6) {
			const [q, a] = pick(r, clarify);
			advance('d');
			say('d', devBody([f(q)], false));
			advance('r');
			say('r', reporterBody([f(a), r() < 0.4 ? f(pick(r, meanwhile)) : ''], false));
		}
	} else if (r() < 0.5) {
		advance('d');
		say('d', devBody(askText(), true));
	}

	// 3. Someone looks; if it is another team, desk tools may say so first. A wait may follow, and always does when a
	// second question would otherwise go unanswered.
	const lookWho = path.lookWho ?? 'd';
	const end = pick(r, path.ends);
	const devAnswers = end.some(([w]) => w === 'd');
	const hold = (path.team && r() < 0.55) || (pending.length > 0 && !devAnswers);
	const holdingReply = () => {
		advance('d');
		say('d', devBody([nudged ? f(pick(r, onIt)) : '', fill(pick(r, holding), { team: path.team ?? 'the right people' }), pick(r, holdingMore), ...pending.splice(0)], true));
		nudged = false;
		if (photographerReports && r() < 0.45) {
			advance('r');
			const second = devAnswers && r() < 0.5 ? sides.find((s) => s !== side && s[0].length % 3 === index % 3) : undefined;
			say('r', reporterBody([f(pick(r, chasers)), blocking && r() < 0.3 ? f(pick(r, meanwhile)) : '', second ? f(second[0]) : ''], false));
			if (second) pending.push(f(second[1]));
		}
	};
	if (hold && lookWho !== 'd') holdingReply();
	advance(lookWho);
	say(lookWho, [[blocking && checks[lookWho] ? f(pick(r, checks[lookWho]!)) : '', f(pick(r, path.look))].filter(Boolean).join(' '), pasteOf(path.lookPaste, c)].filter(Boolean).join('\n\n'), true);
	if (hold && lookWho === 'd') holdingReply();

	// 4. The end.
	let greeted = false;
	for (const [i, [w, body]] of end.entries()) {
		if (w === 's' && t + 7 * DAY > LAST_MESSAGE) continue;
		advance(w);
		const success = body.endsWith('¶');
		const text = f(body.replace('¶', ''));
		if (w === 'd') {
			const next = end[i + 1];
			const prompt = next && next[0] === 'r' && next[1].endsWith('¶') && r() < 0.5 ? pick(r, goAhead) : '';
			say('d', devBody([nudged ? f(pick(r, onIt)) : '', text, ...pending.splice(0), prompt], !greeted));
			nudged = false;
			greeted = true;
		} else if (w === 'r' || w === 'g') {
			const proof = success && r() < 0.55 ? [pick(r, confirmations), pasteOf(special === 'spaced' || special === 'sitter' ? 'renamed' : 'summary', c)] : [];
			say(w, reporterBody([success ? [text, pick(r, thanksLine)].filter(Boolean).join(' ') : text, ...proof], false, w === 'g'));
		} else if (w === 'e' && topic.from !== 'editor') say(w, `${text}\n\n${first(editor)}`);
		else say(w, text);
	}
	// 5. Sometimes desk tools answers the confirmation, or the reporter raises one more thing.
	const last = end.at(-1)!;
	if (last[0] === 'r' && photographerReports) {
		if (last[1].endsWith('¶') && !who.free && r() < 0.25) {
			advance('e');
			say('e', `${f(pick(r, deskAcks))}\n\n${first(editor)}`);
		}
		if (last[1].endsWith('¶') && r() < 0.3) {
			advance('d');
			say('d', devBody([pick(r, thanksBack)], false));
		} else if (r() < 0.6) {
			const extra = sides.find((s) => s !== side && (s[0].length + index) % 4 === 0) ?? sides[index % sides.length]!;
			advance('r');
			say('r', reporterBody([pick(r, oneMore) + f(extra[0]).replace(/^(While I have you: |Also, |Unrelated, but )/, '').replace(/^./, (ch) => ch.toLowerCase())], false));
			advance('d');
			say('d', devBody([cap(f(extra[1]).replace(/^(And yes, |And no, |On the card: |For what you’ve sent today: )/, ''))], false));
		}
	}
	if (t > LAST_MESSAGE) throw new Error(`report ${number} runs past the export: ${stampLong(t)}`);

	const subject = f(pick(r, topic.subjects));
	return [`# DT-${number} · ${subject}`, `${reporter}, ${role} · ${stampLong(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each report follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two reports on one topic end differently until its paths run out.
const order = mulberry32(20260907);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const day = 6 + Math.floor((index * 68) / ITEMS); // 7 September to 13 November
	const date = iso(day * DAY);
	const fits = (p: Path) => (!p.since || date >= p.since) && (!p.until || date <= p.until);
	const allowed = (topic: Topic) => topic.paths.some(fits);
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	const paths = topic.paths.filter(fits);
	plans.push({ topic, path: paths[(seen + topics.indexOf(topic)) % paths.length]!, day });
}

const folder = join(root, 'docs', 'desk-reports');
mkdirSync(folder, { recursive: true });
let number = 2140;
plans.forEach((plan, index) => {
	number += int(order, 1, 4);
	writeFileSync(join(folder, `DT-${number}.md`), report(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Upload problems reported to desk tools, 7 September to 13 November 2026\n\nThe ${ITEMS} reports about the uploader that came in through the desk tools form, email and #desk-tools in these\nten weeks, one file each, exported from the old form before it was switched off. The export kept the messages and\ninternal notes but not the labels, statuses or assignees. Numbers missing from the sequence belong to the other desk\ntools (the caption checker and the picture planner). Terminal output, console views and log extracts are as people\npasted them.\n`
);
