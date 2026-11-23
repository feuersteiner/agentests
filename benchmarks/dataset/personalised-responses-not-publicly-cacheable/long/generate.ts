// Writes the long material of this entry's long tasks: the tickets Ashgrove Games' support desk handled between
// 1 October and 13 November 2026, one Markdown file each, under docs/support-tickets/, as the old help desk
// exported them, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 196;

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
const euro = (cents: number) => `€${Math.floor(cents / 100)}.${pad(cents % 100)}`;
const ascii = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/[^A-Za-z]/g, '').toLowerCase();

// Time is kept in minutes since 00:00 on 1 October 2026, Irish local time.
const DAY = 1440;
const EPOCH = Date.UTC(2026, 9, 1);
const LAST_MESSAGE = 50 * DAY + 17 * 60; // 20 November, 17:00
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (m: number) => dayNames[at(m).getUTCDay()]!;
const clock = (m: number) => `${pad(at(m).getUTCHours())}:${pad(at(m).getUTCMinutes())}`;
const dayMonth = (m: number) => `${at(m).getUTCDate()} ${monthNames[at(m).getUTCMonth()]!}`;
const shortDate = (m: number) => `${at(m).getUTCDate()} ${monthNames[at(m).getUTCMonth()]!.slice(0, 3)} ${at(m).getUTCFullYear()}`;
const stampShort = (m: number) => `${weekday(m).slice(0, 3)} ${at(m).getUTCDate()} ${monthNames[at(m).getUTCMonth()]!.slice(0, 3)}, ${clock(m)}`;
const stampLong = (m: number) => `${weekday(m)} ${dayMonth(m)} ${at(m).getUTCFullYear()}, ${clock(m)}`;
const stampPanel = (m: number) => `${weekday(m).slice(0, 3)} ${shortDate(m)}, ${clock(m)}`;
const iso = (m: number) => at(m).toISOString().slice(0, 10);
const isoTime = (m: number, s: number) => `${iso(m)} ${clock(m)}:${pad(s)}`;
const minuteOfDay = (m: number) => ((m % DAY) + DAY) % DAY;
const startOfDay = (m: number) => m - minuteOfDay(m);
const isWeekend = (m: number) => at(m).getUTCDay() % 6 === 0;
/** The first weekday at or after `m`, as a weekday name. */
const weekdayFrom = (m: number) => {
	let d = m;
	while (isWeekend(d)) d += DAY;
	return weekday(d);
};

// People at Ashgrove Games, a small company in Galway.
const agents = ['Aoife', 'Lukas', 'Camille', 'Ruairí', 'Selin'];
const webTeam = ['Niamh Brennan', 'Florian Hartmann', 'Yusuf Demir'];
const payments = 'Clodagh Byrne';
const dpo = 'Henrike Vogel';
const liaison = 'Théo Marchand';
const ops = 'Kasia Nowak';

// The eight games, as in app/db.py, with what support needs to know about each.
interface Game {
	slug: string;
	title: string;
	genre: string;
	cents: number;
	studio: string;
	home: string;
	mac: boolean;
	gb: number;
	version: string;
	engine: 'unity' | 'godot' | 'own';
	exe: string;
	pegi: number;
	pegiWhy: string;
	req: string;
	sale: number;
	saves: string;
}
const games: Game[] = [
	{ slug: 'hollow-tide', title: 'Hollow Tide', genre: 'adventure', cents: 1999, studio: 'Brackwater Interactive', home: 'Cork', mac: true, gb: 6.4, version: '1.4.2', engine: 'unity', exe: 'HollowTide', pegi: 7, pegiWhy: 'for mild peril and a few frightening moments in the dark', req: 'any graphics card from the last eight years, or recent integrated graphics, and 8 GB of memory', sale: 1399, saves: 'AppData\\LocalLow\\Brackwater\\HollowTide\\saves' },
	{ slug: 'ember-road', title: 'Ember Road', genre: 'adventure', cents: 2499, studio: 'Kiln & Compass', home: 'Lyon', mac: false, gb: 11.8, version: '2.0.3', engine: 'own', exe: 'EmberRoad', pegi: 12, pegiWhy: 'for fantasy violence', req: 'a graphics card with at least 4 GB that supports DirectX 11.1, and 16 GB of memory', sale: 1749, saves: 'Documents\\My Games\\Ember Road\\caravans' },
	{ slug: 'lantern-keep', title: 'Lantern Keep', genre: 'adventure', cents: 1499, studio: 'Nightjar Games', home: 'Tallinn', mac: false, gb: 3.1, version: '1.1.0', engine: 'godot', exe: 'LanternKeep', pegi: 12, pegiWhy: 'for horror themes and sudden frights', req: 'a graphics card that supports Vulkan 1.1, and 8 GB of memory', sale: 999, saves: 'AppData\\Roaming\\Godot\\app_userdata\\Lantern Keep' },
	{ slug: 'tessellate', title: 'Tessellate', genre: 'puzzle', cents: 999, studio: 'Foldline Studio', home: 'Utrecht', mac: true, gb: 0.9, version: '1.7.1', engine: 'godot', exe: 'Tessellate', pegi: 3, pegiWhy: 'which means it’s suitable for all ages', req: 'almost anything made since 2016; it runs happily on integrated graphics', sale: 699, saves: 'AppData\\Roaming\\Godot\\app_userdata\\Tessellate' },
	{ slug: 'quiet-gears', title: 'Quiet Gears', genre: 'puzzle', cents: 1299, studio: 'Escapement Games', home: 'Graz', mac: true, gb: 1.6, version: '1.2.4', engine: 'unity', exe: 'QuietGears', pegi: 3, pegiWhy: 'which means it’s suitable for all ages', req: 'integrated graphics and 4 GB of memory', sale: 899, saves: 'AppData\\LocalLow\\Escapement\\QuietGears' },
	{ slug: 'marrow-mill', title: 'Marrow Mill', genre: 'puzzle', cents: 799, studio: 'Sluicegate Collective', home: 'Bristol', mac: false, gb: 0.7, version: '1.0.6', engine: 'own', exe: 'MarrowMill', pegi: 3, pegiWhy: 'which means it’s suitable for all ages', req: 'very little: any machine that runs Windows 10', sale: 499, saves: 'Saved Games\\Marrow Mill' },
	{ slug: 'iron-orchard', title: 'Iron Orchard', genre: 'strategy', cents: 2999, studio: 'Rootstock Works', home: 'Kraków', mac: false, gb: 8.2, version: '3.1.0', engine: 'unity', exe: 'IronOrchard', pegi: 7, pegiWhy: 'for mild violence', req: 'a graphics card with 3 GB or more, and 16 GB of memory', sale: 1999, saves: 'AppData\\LocalLow\\Rootstock\\IronOrchard\\cities' },
	{ slug: 'salt-and-sail', title: 'Salt and Sail', genre: 'strategy', cents: 1999, studio: 'Rime Harbour', home: 'Bergen', mac: false, gb: 4.5, version: '1.3.2', engine: 'godot', exe: 'SaltAndSail', pegi: 7, pegiWhy: 'for mild violence', req: 'a graphics card that supports Vulkan 1.2, and 8 GB of memory', sale: 1399, saves: 'AppData\\Roaming\\Godot\\app_userdata\\Salt and Sail' }
];
const bySlug = (slug: string) => games.find((game) => game.slug === slug)!;
const macGames = games.filter((game) => game.mac);
const windowsOnly = games.filter((game) => !game.mac);

// Customers, from across the EU.
interface Country {
	name: string;
	code: string;
	vat: number;
	first: [string, 'f' | 'm'][];
	last: string[];
	towns: [string, string][];
	street: (r: Rand, zip: string, town: string) => string;
	banks: string[];
}
const n = (r: Rand, low: number, high: number) => String(int(r, low, high));
const countries: Country[] = [
	{ name: 'Ireland', code: 'IE', vat: 23, first: [['Aoibhinn', 'f'], ['Cian', 'm'], ['Saoirse', 'f'], ['Darragh', 'm'], ['Orla', 'f'], ['Eoin', 'm'], ['Ciara', 'f'], ['Fionn', 'm']], last: ['Keane', 'Fitzgerald', 'Moran', 'Hennessy', 'Lynch', 'Duffy', 'Mulcahy', 'Brosnan'], towns: [['H91', 'Galway'], ['T12', 'Cork'], ['V94', 'Limerick'], ['F91', 'Sligo'], ['R95', 'Kilkenny'], ['X91', 'Waterford'], ['D08', 'Dublin 8'], ['V95', 'Ennis']], street: (r, zip, town) => `${n(r, 2, 90)} ${pick(r, ['Church Road', 'Main Street', 'Mill Street', 'Strand Road', 'College Road', 'Abbeygate Street'])}, ${town}, ${zip} ${pick(r, ['K2T7', 'P6W3', 'E4X9', 'Y2C8', 'R7D5'])}`, banks: ['AIB', 'Bank of Ireland', 'PTSB'] },
	{ name: 'Germany', code: 'DE', vat: 19, first: [['Katrin', 'f'], ['Jonas', 'm'], ['Lena', 'f'], ['Tobias', 'm'], ['Anja', 'f'], ['Henrik', 'm'], ['Miriam', 'f'], ['Felix', 'm']], last: ['Schulz', 'Becker', 'Hoffmann', 'Krüger', 'Wagner', 'Neumann', 'Brandt', 'Seidel'], towns: [['04109', 'Leipzig'], ['50667', 'Köln'], ['28195', 'Bremen'], ['79098', 'Freiburg'], ['90402', 'Nürnberg'], ['01067', 'Dresden'], ['24103', 'Kiel'], ['10437', 'Berlin']], street: (r, zip, town) => `${pick(r, ['Lindenallee', 'Bergstraße', 'Gartenweg', 'Schillerstraße', 'Am Markt', 'Kastanienweg'])} ${n(r, 1, 60)}, ${zip} ${town}`, banks: ['Sparkasse', 'Volksbank', 'DKB'] },
	{ name: 'France', code: 'FR', vat: 20, first: [['Camille', 'f'], ['Julien', 'm'], ['Élodie', 'f'], ['Mathieu', 'm'], ['Manon', 'f'], ['Antoine', 'm'], ['Claire', 'f'], ['Hugo', 'm']], last: ['Lefèvre', 'Moreau', 'Girard', 'Fontaine', 'Rousseau', 'Chevalier', 'Morel', 'Garnier'], towns: [['69003', 'Lyon'], ['44000', 'Nantes'], ['31000', 'Toulouse'], ['67000', 'Strasbourg'], ['35000', 'Rennes'], ['33000', 'Bordeaux'], ['59000', 'Lille'], ['13006', 'Marseille']], street: (r, zip, town) => `${n(r, 1, 80)} ${pick(r, ['rue des Lilas', 'rue Victor Hugo', 'avenue Jean Jaurès', 'rue de la République', 'boulevard Carnot', 'rue Pasteur'])}, ${zip} ${town}`, banks: ['Crédit Agricole', 'La Banque Postale', 'Boursorama'] },
	{ name: 'the Netherlands', code: 'NL', vat: 21, first: [['Sanne', 'f'], ['Daan', 'm'], ['Femke', 'f'], ['Jeroen', 'm'], ['Lotte', 'f'], ['Bram', 'm'], ['Eva', 'f'], ['Ruben', 'm']], last: ['de Vries', 'Jansen', 'Bakker', 'Visser', 'Smit', 'Mulder', 'de Boer', 'Dekker'], towns: [['3511 LX', 'Utrecht'], ['9711 HV', 'Groningen'], ['2611 KL', 'Delft'], ['6811 AA', 'Arnhem'], ['5611 EM', 'Eindhoven'], ['1015 CJ', 'Amsterdam']], street: (r, zip, town) => `${pick(r, ['Kerkstraat', 'Molenweg', 'Oudegracht', 'Stationsweg', 'Lindenlaan'])} ${n(r, 2, 140)}, ${zip} ${town}`, banks: ['ING', 'Rabobank', 'ABN AMRO'] },
	{ name: 'Belgium', code: 'BE', vat: 21, first: [['Lies', 'f'], ['Wout', 'm'], ['Margaux', 'f'], ['Thibault', 'm'], ['An', 'f'], ['Pieter', 'm']], last: ['Peeters', 'Janssens', 'Maes', 'Dubois', 'Lambert', 'Claes'], towns: [['9000', 'Gent'], ['3000', 'Leuven'], ['4000', 'Liège'], ['2000', 'Antwerpen'], ['5000', 'Namur']], street: (r, zip, town) => `${pick(r, ['Stationsstraat', 'Kerkstraat', 'Rue de la Station', 'Rue Haute', 'Veldstraat'])} ${n(r, 2, 120)}, ${zip} ${town}`, banks: ['KBC', 'Belfius', 'BNP Paribas Fortis'] },
	{ name: 'Austria', code: 'AT', vat: 20, first: [['Johanna', 'f'], ['Lukas', 'm'], ['Theresa', 'f'], ['Florian', 'm'], ['Magdalena', 'f'], ['Matthias', 'm']], last: ['Gruber', 'Huber', 'Wimmer', 'Pichler', 'Steiner', 'Moser'], towns: [['8010', 'Graz'], ['6020', 'Innsbruck'], ['5020', 'Salzburg'], ['4020', 'Linz'], ['1070', 'Wien']], street: (r, zip, town) => `${pick(r, ['Hauptstraße', 'Annenstraße', 'Mariahilfer Straße', 'Herrengasse', 'Bahnhofstraße'])} ${n(r, 1, 90)}, ${zip} ${town}`, banks: ['Erste Bank', 'Raiffeisen', 'BAWAG'] },
	{ name: 'Spain', code: 'ES', vat: 21, first: [['Lucía', 'f'], ['Javier', 'm'], ['Marta', 'f'], ['Pablo', 'm'], ['Irene', 'f'], ['Álvaro', 'm']], last: ['García', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Gil'], towns: [['46001', 'Valencia'], ['48001', 'Bilbao'], ['29001', 'Málaga'], ['50001', 'Zaragoza'], ['08012', 'Barcelona']], street: (r, zip, town) => `Calle ${pick(r, ['Mayor', 'del Carmen', 'de la Paz', 'San Vicente', 'Colón'])} ${n(r, 2, 70)}, ${n(r, 1, 6)}º ${pick(r, ['A', 'B', 'C'])}, ${zip} ${town}`, banks: ['BBVA', 'CaixaBank', 'Santander'] },
	{ name: 'Poland', code: 'PL', vat: 23, first: [['Agnieszka', 'f'], ['Michał', 'm'], ['Zofia', 'f'], ['Paweł', 'm'], ['Kasia', 'f'], ['Tomasz', 'm']], last: ['Kowalska', 'Nowicki', 'Wiśniewska', 'Zieliński', 'Lewandowska', 'Mazur'], towns: [['31-147', 'Kraków'], ['80-831', 'Gdańsk'], ['50-077', 'Wrocław'], ['61-772', 'Poznań'], ['00-950', 'Warszawa']], street: (r, zip, town) => `ul. ${pick(r, ['Długa', 'Ogrodowa', 'Krótka', 'Lipowa', 'Słoneczna'])} ${n(r, 2, 60)}/${n(r, 1, 30)}, ${zip} ${town}`, banks: ['PKO BP', 'mBank', 'ING Bank Śląski'] }
];
const providers = ['mailbox.example', 'postbox.example', 'inbox.example', 'letterbox.example', 'webpost.example'];
const kidNames: [string, 'f' | 'm'][] = [['Ella', 'f'], ['Noah', 'm'], ['Mia', 'f'], ['Leo', 'm'], ['Ava', 'f'], ['Finn', 'm'], ['Isla', 'f'], ['Theo', 'm'], ['Clara', 'f'], ['Max', 'm'], ['Lina', 'f'], ['Milo', 'm']];
const friendNames = ['Dara', 'Sophie', 'Marek', 'Inès', 'Rory', 'Hanna', 'Joost', 'Bea', 'Kai', 'Nora', 'Emil', 'Rosa'];
const companies = ['Harbourlight Design', 'Corrib Analytics', 'Feldmark Architekten', 'Atelier Verdier', 'Noordlicht Media', 'Studio Tamarisk', 'Kestrel Engineering', 'Brightwater Consulting', 'Pinewood Legal', 'Lumen Print'];
const deviceNames = { windows: ['gaming PC', 'Windows laptop', 'desktop PC', 'ThinkPad'], mac: ['MacBook Air', 'MacBook Pro', 'iMac', 'Mac mini'], linux: ['Linux desktop', 'laptop running Ubuntu', 'Fedora machine'], deck: ['Steam Deck'] } as const;
type Device = keyof typeof deviceNames;
const browsers = ['Firefox 131', 'Chrome 130', 'Firefox 132', 'Chrome 129'];

// Topics. A ticket follows one path of one topic. Nothing about the topic, its area or its outcome is written into
// the file except through the messages themselves. In any message, a line that is only `@name` becomes that paste.
type Who = 'c' | 'a' | 'n' | 'w' | 'p' | 'P' | 'd' | 'D' | 'l' | 'L' | 'o' | 's';
type Msg = [Who, string];
type Paste = 'platforms' | 'confirmation' | 'order' | 'history' | 'download' | 'payment' | 'crash' | 'specs' | 'refund' | 'account' | 'codes' | 'error' | 'trace' | 'invoice' | 'signins' | 'none';
/** What the pastes of one ticket show; a topic or path sets the parts it needs. */
interface Ctx {
	r: Rand;
	v: Record<string, string>;
	game: Game;
	game2: Game;
	device: Device;
	copies: number;
	pay: 'ok' | 'timeout' | 'declined' | 'prepaid' | 'abandoned' | 'hold';
	dl: 'complete' | 'twice' | 'stops' | 'unused' | 'played';
	crash: 'driver' | 'gpu' | 'bug' | 'glibc' | 'vulkan';
	spec: 'strong' | 'weak';
	url: string;
	codeState: 'fresh' | 'redeemed';
	twoOrders: boolean;
	refund: { cents: number; what: string; reason: string; revoke: boolean };
	signins: 'resets' | 'foreign' | 'plain';
	orderEmail: string;
	accountEmail: string;
	addressChanged: boolean;
	altAccount: boolean;
	invoiceTo: 'company' | 'school';
	invoiceDue: boolean;
	placed: number;
	open: number;
	firstDl: number;
	firstOrder: number;
	/** When the message being written is sent. */
	now: number;
}
interface Path {
	subjects?: string[];
	/** Replaces the topic's openings for this path. */
	open?: string[];
	/** Replaces the topic's question for this path. */
	ask?: string[];
	detail: string[];
	/** Pasted by the customer under the detail. */
	paste?: Paste;
	look: string[];
	lookWho?: Who;
	/** Pasted under the note; `order` when left out, `none` for tickets without an order. */
	lookPaste?: Paste;
	ends: Msg[][];
	/** Whom support waits on, if it sends a holding reply. */
	team?: string;
	/** The ticket may end with a satisfaction survey. */
	happy?: boolean;
	/** Days between the order and the ticket. */
	bought?: [number, number];
	games?: string[];
	prep?: (c: Ctx) => void;
}
interface Topic {
	subjects: string[];
	/** Empty when every path has its own openings. */
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
	/** The games {game} can be; any game when left out. */
	games?: string[];
	games2?: string[];
	devices?: Device[];
	bought?: [number, number];
	/** The customer has no order this ticket is about. */
	noOrder?: boolean;
	/** The customer has no order email to paste. */
	quiet?: boolean;
	/** Support checks who it is talking to before changing the order or account. */
	checks?: boolean;
	/** Pasted by the customer in the first message. */
	shows?: Paste;
	prep?: (c: Ctx) => void;
}
const slugs = (list: Game[]) => list.map((game) => game.slug);
const refundAll = (c: Ctx, reason: string) => {
	c.refund = { cents: c.game.cents * c.copies, what: `${c.game.title} × ${c.copies}`, reason, revoke: true };
};

const topics: Topic[] = [
	// A Windows-only game bought for a Mac.
	{
		games: slugs(windowsOnly),
		devices: ['mac'],
		bought: [0, 6],
		checks: true,
		subjects: ['Game won’t open', 'Downloaded file does nothing', 'Problem with my download', 'Can’t install {game}', 'Broken file?'],
		open: [
			'I bought {game} on {placedDay} and downloaded it, but I can’t get it to open. When I double-click the file nothing happens, or the computer asks me which app it should use. I downloaded it a second time in case the first one was broken, and it’s exactly the same.',
			'My download of {game} finished without any trouble, all {gb} GB of it, but the installer won’t start. The only thing my computer offers is to look for an app that can open it. I’ve never had this with a game before. Could you send me a copy that works?',
			'I think the file you sent me for {game} is damaged. It downloaded completely but it won’t install, and the name ends in .exe, which I don’t remember seeing with other games. Is there another link I can try?'
		],
		more: ['I was looking forward to playing it this weekend, so I’m a bit deflated.', 'I’ve restarted the computer and cleared some space on the disk in case that was it. No change.', 'The order number is {order}, if you need it.'],
		ask: [
			'Sorry about that. Could you tell me what computer you’re installing it on, and which version of its system? An installer that does nothing at all when it’s opened usually means something doesn’t match, rather than a broken file.',
			'Thanks for the details. Before I send another copy: what kind of computer is it, Windows, Mac or Linux? And if there is a message when you open the file, could you copy it for me exactly?'
		],
		paths: [
			{
				detail: ['It’s a {deviceName} on macOS {macos}. To be honest I didn’t think to check anything. Is that the problem?', 'It’s my {deviceName}, macOS {macos}. When I open the file it just says it can’t be opened.'],
				paste: 'specs',
				look: ['Order {order} paid, both downloads completed. {game} is Windows only and the customer is on a Mac, so it was never going to open.', 'Download records: the Windows installer fetched twice from a Mac, complete both times. There is no Mac build of {game}.'],
				lookPaste: 'download',
				ends: [
					[['a', 'That’s the problem, I’m afraid: {game} only runs on Windows, and {studio} has no Mac version planned. I’m sorry the product page didn’t make that clear. Our pages don’t list platforms at the moment; the web team know, and I’ve added your ticket to their request. I’ve refunded the {price} to your {brand} card ending {card}, which takes three to five working days, and switched off the download links. If you’d like something in the same spirit that does run on a Mac, Hollow Tide is the closest.'], ['n', 'Refunded and links switched off.\n\n@refund'], ['c', 'Thanks for sorting the refund so quickly. I honestly had no idea some of the games were Windows only. I might give Hollow Tide a go.']],
					[['a', '{game} only runs on Windows, sorry, and there’s no Mac version on the way. The product page should have told you, and it doesn’t: none of our pages list platforms yet, which the web team are changing. I’ve refunded you in full, {price} back to your card ending {card}, and switched off the links.'], ['c', 'OK, thank you. Please do put it on the pages, though. I can’t be the only one who has done this.'], ['a', 'You’re not, and it’s on the web team’s list with your ticket attached. The refund should be on your statement within five working days.']]
				],
				happy: true,
				prep: (c) => {
					refundAll(c, 'bought for a Mac; the game is Windows only');
				}
			},
			{
				detail: ['It’s a Mac. Oh no. Is it Windows only? My {kidRel} has a gaming PC, so I suppose {kidPron} could have it, but I bought it for myself.'],
				look: ['Customer is on a Mac and {game} is Windows only. Downloaded twice, obviously never installed. Offering a gift code or a refund.'],
				ends: [[['a', 'It is Windows only, I’m sorry, and the page should have said so. Since it never ran for you, I can either refund you in full or turn the purchase into a gift code for {kid}’s PC. Which would you prefer?'], ['c', 'Let’s do the gift code; {kid} will be delighted. I’ll check what runs on a Mac next time. Except the pages don’t say, do they?'], ['a', 'Here’s the code: {code}. {kid} can redeem it on the downloads site and install it straight away. And no, the pages don’t say yet. It’s a known gap, and I’ve added your ticket to the web team’s request.']]]
			},
			{
				detail: ['It’s a Mac mini with an M2 chip. A friend says I can run Windows games with something called CrossOver. Would that work?'],
				look: ['{game} is Windows only; customer on Apple silicon asking about CrossOver. {studio} don’t test it. Offered a refund if it doesn’t work out.'],
				ends: [[['a', 'I can’t promise {game} will work that way, I’m afraid: {studio} don’t test it under CrossOver, and if it doesn’t work out I’d rather refund you than leave you stuck. Would you like to try it first, or shall I refund the {price} now? You have until {refundBy} either way.'], ['c', 'Let me try CrossOver this weekend and I’ll let you know.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]],
				prep: (c) => {
					c.v.deviceName = 'Mac mini';
				}
			}
		],
		prep: (c) => {
			c.dl = 'twice';
		}
	},
	// Which games run on which systems, before buying.
	{
		noOrder: true,
		games: slugs(macGames),
		games2: slugs(windowsOnly),
		devices: ['linux', 'deck', 'mac'],
		subjects: ['{platform}?', 'Question before buying', 'Will it run on my {deviceName}?', 'Which games run on what', 'Before I order'],
		open: [
			'Before I buy anything: which of your games run on {platform}? I play on a {deviceName}, and I can’t find it on the store pages. I looked at {game} and {game2}, and neither page says.',
			'Will {game} and {game2} work on a {deviceName}? I’d like to buy both, but I can’t see anything about it on the product pages, and I don’t want to waste the money.',
			'Quick question before I order: does {game} run on {platform}? And {game2}? I only have a {deviceName}.'
		],
		more: ['I had a bad experience with another shop where the game turned out to be Windows only, so I’d rather ask first.', 'If they do, I’ll probably buy both this week.', 'I looked for a list of systems on your front page as well, without luck.'],
		ask: [
			'Thanks for asking first. {game} runs on Windows, macOS and Linux, so it will work on your {deviceName}. {game2} is Windows only, sadly. Of our eight games, three have Mac and Linux versions: Hollow Tide, Tessellate and Quiet Gears. The rest run on Windows only.',
			'Good question, and I’m sorry the pages don’t say. {game} will work on your {deviceName}: it runs on Windows, macOS and Linux. {game2} runs on Windows only. Altogether three of our games run on macOS and Linux as well as Windows: Hollow Tide, Tessellate and Quiet Gears.'
		],
		paths: [
			{
				detail: ['Perfect, thanks. Is the {platform} version the same as the Windows one, saves and all? And does it need anything installed first?'],
				lookPaste: 'platforms',
				look: ['Checked the studios’ notes: the Mac and Linux builds of all three are the same version as on Windows. The Linux builds are 64-bit, tested on Ubuntu 22.04 and later and on the Deck’s desktop mode; the Mac builds are signed and run natively on Apple silicon.'],
				ends: [[['a', 'Yes: same content, same version numbers, and the saves are ordinary files you can copy between machines. Nothing extra needs installing. The studios test the Linux builds on Ubuntu 22.04 and later and on the Deck’s desktop mode, and the Mac builds run natively on Apple silicon.'], ['c', 'Brilliant, I’ve just ordered {game}. It would save you emails like mine if the pages said which systems each game runs on, though!'], ['a', 'Agreed, and the web team have that on their list. I’ve added your ticket to the request so it counts.']]],
				happy: true
			},
			{
				detail: ['Thanks. Shame about {game2}, which is the one I really wanted. Any chance of a version for {platform} later?'],
				lookWho: 'l',
				lookPaste: 'platforms',
				look: ['Asked {studio2} about {game2} on Mac or Linux. Not planned for now; they may look at it after their next big update, but they won’t promise anything.'],
				ends: [[['a', 'I asked {studio2}, who make {game2}. Nothing is planned for now, and they won’t promise one. If that changes, it will be in our newsletter first.'], ['c', 'OK, thanks for asking them. I’ll buy {game} for now and keep an eye out for the other.']]]
			},
			{
				detail: ['Thanks! One more: is there a demo of {game}? I don’t want to spend {price} and find it doesn’t run well on my {deviceName}.'],
				look: ['No demo. Told the customer about the 14-day refund for games that don’t run properly on their machine.'],
				ends: [[['a', 'There’s no demo, I’m afraid. But if a game doesn’t run properly on your computer, we refund it within 14 days of purchase, so you can try it without risk.'], ['c', 'That’s fair. I’ll wait for payday and then buy it.']]]
			}
		]
	},
	// An error page from a link to a game.
	{
		noOrder: true,
		shows: 'error',
		subjects: ['Error page', 'Link doesn’t work', 'Internal Server Error', 'Page broken?', 'Can’t get to {game}'],
		open: [],
		more: ['I’m using {browser}, if that matters.', 'Same thing on my phone.', 'I tried again this morning in case it was a blip.'],
		ask: ['Sorry about that. Could you paste me the exact address from your browser’s address bar? The {game} page opens fine for me, so I’d like to see which link you followed.', 'Thanks for letting us know. Could you copy the full address of the link you clicked and send it to me? Then the web team can see what went wrong.'],
		paths: [
			{
				open: ['I clicked the link to {game} in your newsletter and got a page that just says Internal Server Error. I tried again an hour later and it’s the same. Has the game been taken off the shop?', 'The {game} link in your {month} newsletter gives me an error page. Is it still for sale?'],
				detail: ['Here it is: https://store.ashgrove.games/store/products/{badslug}'],
				lookWho: 'w',
				look: ['There is no product with that slug, so the product page raises a KeyError and the visitor gets a 500 instead of a not-found page. The link is in the {month} newsletter, which pointed to an edition we never sold. Unknown slugs should answer 404; it’s on our list.'],
				lookPaste: 'trace',
				ends: [[['a', 'Thank you, that explained it. The link in the newsletter pointed to an edition of {game} that never went on sale, and instead of saying the page doesn’t exist, the shop showed an error. {game} itself is here: https://store.ashgrove.games/store/products/{slug}. The web team are changing the shop so that a wrong link says the page doesn’t exist rather than throwing an error.'], ['c', 'Got it, and bought it. Thanks for the quick reply.']]],
				happy: true,
				prep: (c) => {
					c.url = c.v.badslug!;
				}
			},
			{
				open: ['There’s a button on {studios} website that’s supposed to take you to {game} on your shop, but all I get is an error. I wanted to buy it tonight.'],
				detail: ['It’s https://store.ashgrove.games/store/products/{typoslug}. That’s where the Buy button on {studios} site goes.'],
				lookWho: 'w',
				look: ['Typo in the slug on the studio’s button. Unknown slugs raise a KeyError in the product page and come out as a 500; they should be a 404, and that’s on our list. The studio needs to fix their link either way.'],
				lookPaste: 'trace',
				ends: [[['l', 'Asked {studio} to correct the Buy button on their site. They’ll do it with their next site update, probably next week.'], ['a', 'The button on {studios} site has a typo in the address, so our shop couldn’t find the game, and it showed an error instead of a proper not-found page. I’ve asked the studio to fix their button, and until they do, here’s the right link: https://store.ashgrove.games/store/products/{slug}'], ['c', 'Thanks. Odd that a typo gives you a server error rather than a not found page, but I’ve got the game now.']]],
				prep: (c) => {
					c.url = c.v.typoslug!;
				}
			},
			{
				open: ['A friend sent me a link to {game} on your shop and it comes up with an error. The front page of the shop works fine, so I don’t know what’s wrong.', 'Someone posted a link to {game} on a forum and it only gives me an error page.'],
				detail: ['The address is https://store.ashgrove.games/store/products/{capslug}. It was in a forum post about cosy games.'],
				lookWho: 'w',
				look: ['Slugs are lower case and the capitalised one isn’t found, so the product page raises a KeyError and the visitor sees a 500. Same fault as the other unknown-slug errors: it should be a 404. On the list.'],
				lookPaste: 'trace',
				ends: [[['a', 'The link in that post has capital letters in it, and the shop only knows the address in lower case, so it couldn’t find the game. It should have told you so instead of showing an error, and the web team are on that. Here’s the address that works: https://store.ashgrove.games/store/products/{slug}'], ['c', 'Thanks! I’ll post the right one in the thread too.']]],
				happy: true,
				prep: (c) => {
					c.url = c.v.capslug!;
				}
			}
		]
	},
	// Is this game all right for a child?
	{
		noOrder: true,
		games: ['hollow-tide', 'ember-road', 'lantern-keep', 'iron-orchard', 'salt-and-sail'],
		subjects: ['Age rating?', 'Is {game} OK for a {age} year old?', 'Question about {game}', 'Suitable for children?'],
		open: [
			'My {kidRel} {kid} is {age} and has asked for {game} for {occasion}. Is it suitable? I can’t see an age rating anywhere on the page, and I don’t know much about games.',
			'Does {game} have an age rating? I’d like to buy it for my {kidRel}, who’s {age}, and the page doesn’t say anything about it. Some of the pictures I found online look a bit dark.',
			'Hello, a quick question from a parent. Is {game} all right for a {age}-year-old? {kid} played it at a friend’s house and wants it for {occasion}.'
		],
		more: ['{kid} gets upset by anything too scary, which is why I’m asking.', 'We usually go by the PEGI rating, but I can’t find one for this game.', 'I’d rather ask than find out on the day.'],
		ask: ['Thanks for checking first. {game} is rated PEGI {pegi}, {pegiWhy}. Is there anything else you’d like to know about what’s in it?', 'Good question. {game} has a PEGI rating of {pegi}, {pegiWhy}. I’m happy to tell you more about it if that helps you decide.'],
		paths: [
			{
				detail: ['That’s fine for {kid}, then. If I buy it now, can I give it to {kidObj} on the day? It’s a surprise.'],
				look: ['Rating confirmed against {studios} press kit: PEGI {pegi}. Customer is buying it as a present.'],
				ends: [[['a', 'Of course. Buy it whenever suits you; the download email can wait in your inbox until the day. The links in it run out after seven days, but if they have by then, just reply here and I’ll send fresh ones.'], ['c', 'Lovely, thank you. It would help if the page showed the rating, though. I nearly didn’t buy it.'], ['a', 'Agreed. I’ve passed that on to the web team, who already have it on their list for the product pages.']]],
				happy: true,
				prep: (c) => {
					c.v.age = String(Math.min(16, Number(c.v.pegi) + int(c.r, 1, 4)));
				}
			},
			{
				detail: ['Ah, {kid} is only {age}, so maybe not. Is there anything {kidPron}’d enjoy that is suitable?'],
				look: ['{game} is PEGI {pegi}; the child is {age}. Suggested the puzzle games instead.'],
				ends: [[['a', 'For {age}, I’d look at Quiet Gears or Tessellate, both PEGI 3. They’re puzzle games, but gentle ones, and lots of children love Quiet Gears in particular: you repair clocks that run backwards.'], ['c', 'Quiet Gears it is, thank you. You’ve been really helpful.']]],
				happy: true,
				prep: (c) => {
					c.v.age = String(Math.max(5, Number(c.v.pegi) - int(c.r, 1, 4)));
				}
			},
			{
				detail: ['Thanks. Does it have chat with strangers, or anything you can buy inside the game?'],
				look: ['Confirmed with {studio}: no online play, no chat, nothing to buy inside the game.'],
				ends: [[['a', 'No to both. {game} has no online play or chat at all, and there’s nothing to buy inside it: you pay once and that’s it. The same goes for all our games.'], ['c', 'Perfect, that’s exactly what I wanted to hear. Buying it now.']]],
				prep: (c) => {
					c.v.age = String(Math.min(16, Number(c.v.pegi) + int(c.r, 0, 3)));
				}
			}
		]
	},
	// Will it run on this computer?
	{
		noOrder: true,
		devices: ['windows'],
		shows: 'specs',
		games: ['ember-road', 'iron-orchard', 'lantern-keep', 'salt-and-sail'],
		prep: (c) => {
			c.v.deviceName = 'Windows laptop';
		},
		subjects: ['Will it run on my laptop?', 'System requirements for {game}', 'Specs question', 'Before I buy {game}'],
		open: [
			'Can my laptop run {game}? I can’t find any system requirements on the page. This is what it says under About:',
			'I’d like to buy {game}, but I’m not sure my computer is up to it, and the product page doesn’t say what it needs. Here are my details:',
			'Before I spend {price}: will {game} run on this? I copied it from the settings screen.'
		],
		more: ['I’m not very technical, so I hope that’s the right information.', 'It’s a couple of years old now.'],
		ask: ['Thanks, that’s what I need. Is this the only computer you’d play on, and do you play with a controller or a mouse?', 'Thanks for sending the details. Just so I give you the right answer: is this the machine you’d play on, and is it usually plugged in when you play?'],
		paths: [
			{
				detail: ['Just this one, with a mouse, plugged in at my desk.', 'Yes, this is the one, and it’s always plugged in.'],
				look: ['{studios} minimum for {game}: {req}. The customer’s machine is comfortably above it.'],
				lookPaste: 'none',
				ends: [[['a', 'Good news: your computer is comfortably above what {studio} give as the minimum, which is {req}. It should run well at medium settings, and better plugged in, as you are.'], ['c', 'Great, bought it. It would help if the page listed the requirements, by the way.'], ['a', 'It would, and that’s on the web team’s list for the product pages. Enjoy the game!']]],
				happy: true,
				prep: (c) => {
					c.spec = 'strong';
				}
			},
			{
				detail: ['Only this laptop, with the touchpad mostly.', 'It’s the only one, and I play on the sofa, so not always plugged in.'],
				look: ['{studios} minimum for {game}: {req}. The customer has integrated graphics and 8 GB, well below it.'],
				lookPaste: 'none',
				ends: [[['a', 'I’m sorry to say it’s below the minimum: {studio} ask for {req}, and your laptop has integrated graphics and 8 GB of memory. It might start, but I wouldn’t expect it to be playable. Tessellate or Quiet Gears would run very well on it, if puzzles appeal.'], ['c', 'Shame, but thanks for being honest. I’ll try Tessellate instead.']]],
				prep: (c) => {
					c.spec = 'weak';
				}
			}
		]
	},
	// More than one copy of a game, and a total for one.
	{
		bought: [1, 12],
		checks: true,
		subjects: ['I think you undercharged me', 'Wrong total?', 'Order {order}', 'Paid less than expected', 'Total on my receipt'],
		open: [
			'This is an odd one to write in about, but I think you charged me too little. I bought {copies} copies of {game} on {placedDay} to give away, and my card was only charged {charged}, which is the price of one. I did get {extra} gift codes, so I’m not sure what’s happened.',
			'At checkout the total for {copies} copies of {game} said {charged}. I assumed it would be corrected when I paid, but that’s what my card was charged. I don’t want anyone coming after me for the difference later.',
			'Could you check order {order}? The receipt lists {copies} copies of {game}, but the total is for one. Either the receipt is wrong or I’ve underpaid.'
		],
		more: ['I’d rather sort it now than have a surprise on my statement in a month.', 'Happy to pay the rest if you send me a link.', 'I checked the price on the product page again afterwards, and it’s definitely {price} each.'],
		ask: ['Thank you for telling us; that’s good of you. Could you confirm the email on your account, so I’m looking at the right order?', 'Thanks for flagging it rather than keeping quiet! Which email address is the account under? Then I’ll look at the order.'],
		paths: [
			{
				detail: ['It’s {email}, and the order number is {order}.'],
				look: ['Order {order}: {copies} × {game} at {price} each, charged {charged}. The checkout total counts each game once, whatever the quantity; it’s the same on every order with more than one copy.'],
				ends: [[['w', 'Known: the checkout total adds each game’s price once and ignores the quantity, so every order with more than one copy of a game has been undercharged. The fix is on our list.'], ['P', 'Thank you for telling us; most people wouldn’t. The fault is ours: our checkout added up the games without counting the copies. The gift codes are yours to keep, and we won’t ask for the difference. Our web team are fixing the total.'], ['c', 'That’s very decent of you, thank you. Have a good weekend!']]],
				happy: true
			},
			{
				games: ['tessellate', 'quiet-gears', 'marrow-mill'],
				open: ['At checkout the total for {copies} copies of {game} said {charged}. I assumed it would be corrected when I paid, but that’s what my card was charged. I don’t want anyone coming after me for the difference later.', 'Could you check order {order}? The receipt lists {copies} copies of {game}, but the total is for one. Either the receipt is wrong or I’ve underpaid.'],
				detail: ['It’s {email}. I should have said: I’m a teacher, and this was for our computer room, {copies} copies. Our bursar needs an invoice that matches what we were charged and what we got, and at the moment the two don’t agree, so she won’t file it.'],
				look: ['Order {order}: {copies} × {game}, charged {charged} instead of {total}. School purchase; the bursar needs a correct invoice. Passing to payments.'],
				team: 'payments team',
				ends: [[['p', 'Corrected invoice made for the full {total}, with our bank details for the {diff} still owed. The checkout total is still wrong for more than one copy; the web team have it.\n\n@invoice'], ['P', 'I’ve attached a corrected invoice for the full {total}, which matches the {copies} copies you received. It shows the {charged} already paid by card and the {diff} still to pay, with our bank details for a transfer. Once that arrives, we’ll mark the order settled.'], ['c', 'Thank you, I’ve passed it to the bursar. She pays on Fridays.']]],
				prep: (c) => {
					c.copies = int(c.r, 15, 30);
					c.invoiceTo = 'school';
					c.invoiceDue = true;
				}
			},
			{
				detail: ['The email is {email}. I’ve looked again and it’s definitely {copies} copies and {charged}.'],
				look: ['Order {order}: {copies} × {game} at {price}, charged {charged}. Same checkout fault as the others this month: quantity left out of the total.'],
				ends: [[['a', 'You’re right: our checkout added up the games without counting the copies, so you paid for one. That’s our mistake, not yours. Our payments team have decided not to collect the difference on these orders, so there’s nothing more to pay, and the web team are fixing the checkout.'], ['c', 'Thanks for checking. I’ll pass the good news on to my {friendRel}, who gets one of the codes.']]]
			}
		],
		prep: (c) => {
			c.copies = int(c.r, 2, 4);
		}
	},
	// The card is refused.
	{
		noOrder: true,
		subjects: ['Payment keeps failing', 'Card declined', 'Can’t pay', 'Checkout problem', 'Payment error'],
		open: [
			'I’ve tried three times to buy {game} and each time the payment fails. My card works everywhere else. The page just says the payment couldn’t be completed and to try again.',
			'Your checkout won’t take my card. I’ve tried on my laptop and on my phone. I don’t know if it’s your end or my bank’s, but I’d like to buy {game} while it’s on sale.',
			'Is there a problem with payments? I keep getting “Payment could not be completed” when I try to buy {game}.'
		],
		more: ['It’s a {brand} card from {bank}.', 'There’s plenty of money in the account, before you ask!', 'I’ve bought from you before with the same card without any trouble.'],
		ask: ['Sorry about that. Could you tell me roughly when you tried, and the last four digits of the card? I can look up the attempts on our payment provider’s side.', 'Sorry for the trouble. If you tell me the time of your last attempt and which card it was, I can see what the payment provider recorded.'],
		paths: [
			{
				detail: ['Around {hhmm} {tryDay}, card ending {card}. Now that I think of it, my banking app did buzz, but by the time I found my phone the page had given up.'],
				look: ['Three attempts, all 3-D Secure timeouts: the approval in the bank’s app never came back in time.'],
				lookPaste: 'payment',
				ends: [[['a', 'That’s it: your bank asks you to approve online payments in its app, and each attempt ran out of time before the approval came through. If you have the app open before you press Pay, it should go straight through.'], ['c', 'That worked, thank you. Bought it on the first try.']]],
				happy: true,
				prep: (c) => {
					c.pay = 'timeout';
				}
			},
			{
				detail: ['The last try was about {hhmm} {tryDay}, with the card ending {card}.'],
				look: ['All attempts declined by the issuer, no reason given (do not honour). Nothing we can do from here.'],
				lookPaste: 'payment',
				ends: [[['a', 'Your bank declined the payments itself, without telling us why. That usually means a block on their side, often on payments to a company in another country; we’re in Ireland. They can lift it if you ring them.'], ['c', 'Annoying. I’ll ring them tomorrow and try again.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]],
				prep: (c) => {
					c.pay = 'declined';
				}
			},
			{
				detail: ['It was {tryDay}, around {hhmm}. It’s a prepaid card ending {card}; I use it for shopping online so my main card stays safe.'],
				look: ['Card refused as prepaid; our provider doesn’t take them. PayPal is the way round it.'],
				lookPaste: 'payment',
				ends: [[['a', 'That explains it: our payment provider doesn’t accept prepaid cards, I’m afraid, and the checkout message isn’t very clear about it. PayPal works, if you have it, and so does any ordinary debit or credit card.'], ['c', 'Paid with PayPal, all done. Thanks.']]],
				happy: true,
				prep: (c) => {
					c.pay = 'prepaid';
				}
			}
		]
	},
	// Two payments on the statement.
	{
		bought: [1, 5],
		checks: true,
		subjects: ['Charged twice', 'Double payment', 'Two charges for one game', 'Refund for duplicate'],
		open: [
			'My bank shows two payments of {price} to Ashgrove Games on {placedDay}, but I only bought {game} once. Please refund the extra one.',
			'I’ve been charged twice for {game}. I got one order email, but there are two payments on my statement. Can you look into it?'
		],
		more: ['The page did hang for a while when I pressed Pay, if that helps.', 'I’d like this sorted before my statement closes at the end of the month.', 'My bank says to ask you first before they open a dispute.'],
		ask: ['Sorry for the worry. Could you tell me the dates and amounts exactly as your bank shows them, and whether either of them is marked pending?', 'Sorry about that. Can you tell me whether both payments are complete or whether one of them says pending? It makes a difference to what happened.'],
		paths: [
			{
				detail: ['One of them says pending and the other doesn’t. Both are {price}, both on {placedDay}.'],
				look: ['Only one payment taken. The first attempt was authorised but never completed, and its hold was released straight away; the bank just hasn’t dropped it yet.'],
				lookPaste: 'payment',
				ends: [[['a', 'Only one payment was taken. The pending one is a hold from your first attempt, which didn’t complete; we released it at once, and your bank should drop it from your statement within a few working days.'], ['c', 'It’s gone this morning. Thanks for explaining.']]],
				happy: true,
				prep: (c) => {
					c.pay = 'hold';
				}
			},
			{
				detail: ['Both are complete: {price} and {price}, a minute apart, on {placedDay}.'],
				look: ['Two orders forty seconds apart, both paid. Pay was pressed twice while the page hung. Refunding the second one.'],
				lookPaste: 'history',
				ends: [[['n', 'Refunded the duplicate.\n\n@refund'], ['a', 'You’re right: the page hung, the button was pressed twice, and two orders went through. I’ve refunded the second one, {order2}, which takes three to five working days to reach your card. You keep the first order and its download as normal.'], ['c', 'Great, thanks for sorting it so fast.']]],
				happy: true,
				prep: (c) => {
					c.twoOrders = true;
					c.refund = { cents: c.game.cents, what: `${c.game.title} × 1 (order ${c.v.order2})`, reason: 'duplicate order', revoke: true };
				}
			}
		]
	},
	// The billing address is out of date.
	{
		bought: [3, 40],
		checks: true,
		subjects: ['Old address on my receipt', 'Change billing address', 'Moved house', 'Wrong address at checkout'],
		open: [
			'I moved in the summer and the checkout page still shows my old billing address. I can’t find anywhere to change it on my account page, and my receipts need the new one for my tax return.',
			'How do I change my billing address? My account page shows it but there’s no button to edit it, and I don’t want my next order to go out with the old one.',
			'My last receipt from you has my old address on it. Where can I update it?'
		],
		more: ['The old one is {address}; I left there in {month}.', 'I’ve looked through every page of my account, I promise.'],
		ask: ['Sorry, customers can’t change it themselves at the moment. If you send me the new address in full, I’ll change it from our side and reissue any receipts you need.', 'You’re right, there isn’t a way to do it yourself yet. Send me the new address and I’ll update it for you.'],
		paths: [
			{
				detail: ['Thank you. It’s {newAddress}. Could you also reissue the receipt for order {order}?'],
				look: ['Address changed in the back office; receipt for {order} reissued with the new one.'],
				lookPaste: 'account',
				ends: [[['a', 'Done: your new address is on your account, and the reissued receipt for {order} is attached. I’ve also asked the web team again to let customers edit their address themselves.'], ['c', 'Perfect, thanks for the quick help.']]],
				happy: true,
				prep: (c) => {
					c.addressChanged = true;
				}
			},
			{
				detail: ['It’s {newAddress}. Honestly, it’s a bit much to have to email you to change an address in 2026.'],
				look: ['Updated the address. Customer unhappy there’s no way to edit it themselves; adding the ticket to the web team’s request for an editable address.'],
				lookPaste: 'account',
				ends: [[['a', 'Fair point, and I agree. I’ve updated it for you, and I’ve added your ticket to the web team’s request for customers to be able to edit their own address.'], ['w', 'Editable billing address on the account page is on the list, after the checkout total.'], ['c', 'Thanks. Let me know when I can do it myself.']]],
				prep: (c) => {
					c.addressChanged = true;
				}
			}
		]
	},
	// An invoice for a company.
	{
		bought: [1, 20],
		checks: true,
		subjects: ['Invoice with our VAT number', 'Company invoice', 'Receipt for my employer', 'Invoice for order {order}'],
		open: [
			'I bought {copies} copies of {game} for the team at {company} as an end-of-project present. Our finance department needs an invoice with the company’s name and VAT number on it, and the receipt only has my name.',
			'Could you make me a proper invoice for order {order}? It was for work, {company}, and our accounts team won’t accept the receipt because it doesn’t show our VAT number.'
		],
		more: ['Our VAT number is {vatNo}.', 'Finance close the month on Friday, so sooner is better.'],
		ask: ['Of course. Could you send me the company’s full name and address as they should appear, and the VAT number?', 'Happy to. What name, address and VAT number should go on it?'],
		paths: [
			{
				detail: ['{company}, {companyAddress}. VAT number {vatNo}.'],
				look: ['Invoice made out to {company} with their VAT number. The order shows {copies} copies but charged {charged}: the quantity fault in the checkout total again. Asked payments.'],
				ends: [[['p', 'Invoice issued for what was actually charged. Not collecting the difference, as with the other orders of more than one copy.\n\n@invoice'], ['a', 'The invoice is attached, made out to {company} with your VAT number. You may notice it shows {charged} for {copies} copies: our checkout added up the games without counting the copies, which is our mistake, and we’re not asking for the difference. The web team are fixing the checkout.'], ['c', 'Ha, finance will like that. Thanks very much.']]]
			},
			{
				open: ['Could you make me a proper invoice for order {order}? I bought {game} for work, at {company}, and our accounts team won’t accept the receipt because it doesn’t show our VAT number.'],
				detail: ['{company}, {companyAddress}, VAT number {vatNo}. Also, can you take the VAT off? We’re a business, so it should be reverse charged.'],
				lookWho: 'p',
				look: ['We sell at prices including VAT, to businesses as well, and don’t reverse-charge. The invoice can show the VAT separately.'],
				lookPaste: 'none',
				ends: [[['P', 'I’ve attached the invoice made out to {company}, with your VAT number and the VAT shown separately. I’m afraid we can’t reverse-charge it: our prices include VAT for everyone, businesses too. Your finance team will know whether they can reclaim it.\n\n@invoice'], ['c', 'Understood. Thanks for the invoice.']]],
				prep: (c) => {
					c.copies = 1;
				}
			}
		],
		prep: (c) => {
			c.copies = int(c.r, 3, 8);
			c.invoiceTo = 'company';
		}
	},
	// A sale started just after the purchase.
	{
		checks: true,
		subjects: ['Sale started right after I bought', 'Price difference', 'Refund the difference?', '{game} now on sale'],
		open: [
			'I bought {game} on {placedDate} for {price}, and a few days later your newsletter announced it at {sale} in the autumn sale. Could you refund the difference? It feels a bit unfair.',
			'Bit cheeky, but: I paid {price} for {game} and it’s now {sale}. Is there any chance of getting the difference back?'
		],
		more: ['I’ve bought a lot from you, so I hope you don’t mind me asking.', 'I know it’s only a few euros, but still.'],
		ask: ['Thanks for asking nicely! Could you tell me the order number, or the date you bought it? It depends on how long before the sale it was.', 'Fair question. When did you buy it? The answer depends on the date.'],
		paths: [
			{
				bought: [1, 6],
				detail: ['It’s order {order}, from {placedDate}.'],
				look: ['Bought {daysAgo} days ago, within the seven days before the sale. Refunding the difference of {saleDiff}.'],
				ends: [[['n', '@refund'], ['a', 'Good news: if a game goes on sale within seven days of buying it, we refund the difference, so I’ve refunded {saleDiff} to your card. It takes three to five working days.'], ['c', 'Brilliant, thank you!']]],
				happy: true,
				prep: (c) => {
					c.refund = { cents: c.game.cents - c.game.sale, what: `difference to the sale price of ${c.game.title}`, reason: 'sale started within seven days of purchase', revoke: false };
				}
			},
			{
				bought: [20, 60],
				open: ['Bit cheeky, but: I paid {price} for {game} and it’s now {sale}. Is there any chance of getting the difference back?'],
				detail: ['Order {order}. I bought it on {placedDate}.'],
				look: ['Bought on {placedDate}, well outside the seven days. No difference to refund.'],
				ends: [[['a', 'I’m sorry, but we only refund the difference when a sale starts within seven days of buying, and yours was on {placedDate}. I know that’s disappointing.'], ['c', 'Fair enough, I thought I’d ask.']]]
			}
		]
	},
	// The order email never came.
	{
		bought: [0, 3],
		quiet: true,
		subjects: ['No download email', 'Where is my game?', 'Order not received', 'Paid but nothing arrived', 'Nothing in my inbox'],
		open: [
			'I bought {game} on {placedDay} and I still haven’t received anything. No email, nothing. I’ve checked my spam folder. Where is my game?',
			'I paid for {game} on {placedDay} but the download email never came. The money has gone from my account, so I’d like my game, please.',
			'Hello, my order for {game} hasn’t arrived. It’s been more than a day.'
		],
		more: ['It’s for my {kidRel}, who is not a patient person.', 'Usually your emails arrive within a minute.', 'I’ve looked in every folder of my email.'],
		ask: ['Sorry about that. Could you tell me the email address on your account and, if you have it, the amount and date on your bank statement?', 'Sorry for the wait. Which email address is your account under? And does your bank show the payment as complete or pending?'],
		paths: [
			{
				detail: ['My email is {email}. The bank shows {price} on {placedDay}.'],
				look: ['Found the order: paid, links sent, but the account’s email has a typo ({typo}), so the email bounced. The customer’s browser has presumably been filling in the typo when they log in.'],
				ends: [[['a', 'Found it. The order went through, but the email address on your account has a small typo, {typo}, so our email went nowhere. Your browser has probably been filling it in for you when you log in. I’ve corrected it to {email} and sent the download links again.'], ['c', 'Oh no, that’s my fault. Got the links now, thank you!']]],
				happy: true,
				prep: (c) => {
					c.orderEmail = c.v.typo!;
					c.accountEmail = c.v.typo!;
				}
			},
			{
				detail: ['{email}. The bank app shows {price} as pending, from {placedDay}.'],
				look: ['No order. The payment was never confirmed: the 3-D Secure step was left open and expired. The pending amount is the hold, which was released.'],
				lookPaste: 'payment',
				ends: [[['a', 'I’ve looked, and the payment never completed: it was waiting for approval in your bank’s app, and that ran out. So there’s no order, and the pending amount is only a hold, which we released; it will drop off your statement in a few days. You’d need to buy {game} again, I’m afraid.'], ['c', 'Done, and the email arrived in seconds this time. Thanks.']]],
				prep: (c) => {
					c.pay = 'abandoned';
				}
			},
			{
				detail: ['It’s {email}. That’s my work address, actually.'],
				look: ['Order fine, email sent and accepted by the customer’s mail server. Work address; probably their company’s filter.'],
				ends: [[['a', 'The order is fine, and our email was accepted by your mail server at {placedTime}, so I suspect your workplace’s filter has held it back. I’ve sent the links again; if they don’t appear, your IT team can release the first email, or I can change the address on your account to a home one.'], ['c', 'IT found it in quarantine. All sorted, thanks.']]]
			}
		]
	},
	// The download link has run out.
	{
		bought: [20, 200],
		checks: true,
		subjects: ['Download link expired', 'Link not working', 'Need my game again', 'Re-download {game}'],
		open: [
			'I bought {game} in {placedMonth} but only got round to installing it now, and the link in the email says it has expired. Can I still download it?',
			'The download link for {game} says expired. I’ve paid for the game, so I don’t understand why I can’t download it.',
			'My computer died and I need to download {game} again, but the old email link doesn’t work any more.'
		],
		more: ['I’d hate to have to buy it twice.', 'I’ve found the order email, so I know I bought it.'],
		ask: ['Of course you can: the game is yours, it’s only the link that runs out after seven days. Could you confirm the email on your account, so I send new links to the right place?', 'Yes, the links only last seven days, but the game is yours for good. Which email address is your account under?'],
		paths: [
			{
				detail: ['It’s {email}, the one I’m writing from.'],
				look: ['Order {order} from {placedDate}, links expired. Sent new ones.'],
				ends: [[['a', 'New links are on their way to {email}. They work for seven days, so do download {game} soon, and keep the installer somewhere safe: once you have it, it never expires.'], ['c', 'Got them and downloading now. Thanks!']]],
				happy: true
			},
			{
				detail: ['{email}. Couldn’t the links just live on my orders page instead of running out? I’ve had to write in for this before.'],
				look: ['Sent new links. Second time this customer has asked; the orders page only lists the orders, with no downloads. Adding the ticket to the request for downloads on the orders page.'],
				lookPaste: 'history',
				ends: [[['a', 'I’ve sent new links, and you’re right that you shouldn’t have to ask. The orders page only lists your orders at the moment; putting the downloads there is on the web team’s list, and I’ve added your ticket to that request.'], ['c', 'Thanks. Fingers crossed for that change.']]]
			},
			{
				detail: ['That’s the thing: I’m not sure. Probably {altEmail}, which I barely use now.'],
				look: ['Nothing under {email}. Order {order} is on an account under {altEmail}, same name. Sent the links there and offered to change the address.'],
				ends: [[['a', 'Found it: the order is on an account under {altEmail}. I’ve sent new links there. If you’d rather the account used {email} from now on, say so and I’ll change it.'], ['c', 'Yes, please change it to this one.'], ['a', 'Done. The account is now under {email}, and your orders are all still on it.']]],
				prep: (c) => {
					c.orderEmail = c.v.altEmail!;
					c.accountEmail = c.v.altEmail!;
				}
			}
		]
	},
	// The download stops partway.
	{
		bought: [0, 4],
		subjects: ['Download keeps failing', 'Download stops at {pct}%', 'Can’t finish the download', 'Network error on download'],
		open: [
			'Every time I try to download {game} it stops partway, at about {pct}%, and says network failed. I’ve tried four times. My internet is fine for everything else.',
			'The {game} download never finishes. It gets to around {gbDone} GB of {gb} GB and then just stops. Is there another way to get it?',
			'I can’t get {game} to download. It starts fine and then fails part of the way through, every single time.'
		],
		more: ['I’m on {browser}.', 'I’ve tried in the evening and in the morning, with the same result.', 'I’ve restarted the router, for what it’s worth.'],
		ask: ['Sorry about that. Could you tell me which browser you’re using, and whether you’re on Wi-Fi or a cable? I’ll look at the download records in the meantime.', 'Sorry for the trouble. Are you on a home connection, or somewhere like work or a hotel? And does anything like antivirus software pop up during the download?'],
		paths: [
			{
				detail: ['Home Wi-Fi, {browser}. Nothing pops up.', 'At home, on a cable. No pop-ups that I’ve noticed.'],
				lookWho: 'o',
				look: ['One of the download servers in Frankfurt has been resetting connections on files over 2 GB since {wday}. Taken out of service; downloads now go to the others. This customer landed on it every time.'],
				lookPaste: 'download',
				ends: [[['a', 'It wasn’t you: one of our download servers was cutting off large downloads, and yours landed on it every time. Our operations team have taken it out of service. Could you try again? It should go through now.'], ['c', 'Downloaded in twenty minutes. Thanks!']]],
				happy: true,
				prep: (c) => {
					c.v.badServer = 'yes';
				}
			},
			{
				detail: ['I’m staying in a hotel this week, so it’s their Wi-Fi.'],
				look: ['Each attempt cut at almost exactly the same size; looks like the hotel network’s limit on large downloads.'],
				lookPaste: 'download',
				ends: [[['a', 'The records show each attempt cut off at almost exactly the same point, which is what happens when a network limits the size of downloads; hotels often do. I’ve sent you fresh links, which work for seven days, so it should go through once you’re home. If you need it sooner, most browsers can resume a download from their downloads list.'], ['c', 'Makes sense. I’ll wait until I’m home on {day}.']]],
				prep: (c) => {
					c.v.hotel = 'yes';
				}
			},
			{
				detail: ['Cable at home. My antivirus does show a box saying it’s scanning the file, now you mention it.'],
				look: ['Each attempt ends just after the antivirus starts scanning the partial file. Suggested pausing the scan for the download.'],
				lookPaste: 'download',
				ends: [[['a', 'That’s probably it: some antivirus programs start scanning a large file before it has finished, and the download gets cut. Could you try with the scanner paused for the download, then scan the finished file?'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]]
			}
		],
		prep: (c) => {
			c.dl = 'stops';
		}
	},
	// A game bought months ago, somewhere on a long orders page.
	{
		bought: [10, 120],
		checks: true,
		subjects: ['Can’t find my order', 'Orders page', 'Reinstalling after a new PC', 'Lost my installer'],
		open: [
			'I have a new PC and want to reinstall {game}, which I bought this year. I went to my orders page to find it, but it starts with my orders from {since} and I gave up scrolling. Could you just send me the link?',
			'Where do I find a game I bought a few months ago? Your orders page seems to show my oldest orders first, and I can’t see {game} anywhere near the top.',
			'I’m trying to find {game} on my orders page and I’m going round in circles. Can you help?'
		],
		more: ['I’ve bought quite a lot from you over the years, so the list is long.', 'I’m sure I bought it in the spring or early summer.'],
		prep: (c) => {
			c.v.orders = String(int(c.r, 7, 12));
		},
		ask: ['Happy to help. Could you confirm the email on your account? I’ll find the order and send fresh links.', 'Of course. Which email address is your account under? Then I’ll look it up and send you new links.'],
		paths: [
			{
				detail: ['It’s {email}.'],
				look: ['{orders} orders on the account; {game} is the latest. Sent new links.'],
				lookPaste: 'history',
				ends: [[['a', 'Found it: {game} is your most recent order, {order} from {placedDate}, which is why it’s right at the bottom of the page; the orders page lists them oldest first. I’ve sent fresh links to {email}.'], ['c', 'Thanks. The orders page really should show the newest first. I’ve been a customer for years and it’s a long scroll.'], ['a', 'You’re right, and the web team have that on their list. I’ve added your ticket to it.']]],
				happy: true
			},
			{
				detail: ['{email}. And I definitely bought it with this account.'],
				look: ['No {game} on this account. There’s a second account under {altEmail}, same name, with {game} on it, bought {placedDate}.'],
				lookPaste: 'history',
				ends: [[['a', 'It isn’t on this account, which is why you couldn’t find it: it’s on a second account, under {altEmail}, bought on {placedDate}. I’ve sent the links there. If you’d like the two accounts joined, I can do that.'], ['c', 'I’d forgotten that address existed. Yes, please join them.'], ['a', 'Done: everything is now under {email}.']]],
				prep: (c) => {
					c.altAccount = true;
				}
			}
		]
	},
	// A gift code that won’t redeem.
	{
		bought: [1, 30],
		checks: true,
		subjects: ['Gift code not working', 'Friend can’t redeem', 'Code invalid', 'Problem with a gift'],
		open: [
			'I bought two copies of {game} and sent the second code to my {friendRel} {friend}, but when {friend} enters it on the downloads site it says the code isn’t valid.',
			'The gift code from my order doesn’t work. {friend} has tried it several times and gets “This code is not valid”. It was a birthday present, so it’s a bit embarrassing.',
			'Can you check a gift code for me? It was for {friend}, and it won’t redeem.'
		],
		more: ['{friend} is on a {deviceName}, if that makes a difference.', 'I’ve checked I sent the right one.'],
		ask: ['Sorry about that. Could you send me the order number, or the code itself, so I can look it up?', 'Sorry for the embarrassment! If you send me the code {friend} is typing, I’ll see what our system says about it.'],
		paths: [
			{
				detail: ['The order is {order}, and {friend} is typing {badCode}.'],
				look: ['{code} is fine and unredeemed. The friend is typing an 8 where the code has a B.'],
				lookPaste: 'codes',
				ends: [[['a', 'The code is fine and hasn’t been used. The trouble is one character: the code is {code}, with a B, and {friend} has been typing an 8. Copying and pasting it should work.'], ['c', 'B, not 8. Sorry! {friend} is in now. Thanks.']]],
				happy: true
			},
			{
				detail: ['Order {order}, code {code}. I put a photo of the card with the code on it online for {friend}’s birthday, if that matters.'],
				look: ['{code} was redeemed {redeemedWhen} on an account nobody here knows, about an hour after the photo went up. Asked payments to take it back.'],
				lookPaste: 'codes',
				ends: [[['p', 'Took the game back from the account that redeemed the code, and issued a new one.'], ['a', 'Someone redeemed the code about an hour after the photo went up, so I suspect they read it from there. We’ve taken the game back from the account that used it, and here is a new code for {friend}: {code2}. Maybe send this one by message rather than in a photo!'], ['c', 'Lesson learned. Thank you so much.']]],
				prep: (c) => {
					c.codeState = 'redeemed';
				}
			}
		],
		prep: (c) => {
			c.copies = 2;
		}
	},
	// The wrong game, or a change of heart.
	{
		bought: [0, 6],
		checks: true,
		subjects: ['Refund please', 'Refund question', 'Order {order}', 'Help with an order'],
		open: [],
		more: ['Sorry to be a nuisance.', 'I hope this is something you can help with.'],
		ask: ['Of course. Could you tell me whether {game} has been downloaded yet? It decides what I can do.', 'I’ll see what I can do. Has the game been downloaded or installed yet?'],
		paths: [
			{
				subjects: ['Bought the wrong game', 'Mistake in my order', 'Swap {game} for {game2}?'],
				open: ['I meant to buy {game2} and somehow ended up buying {game}. I clicked the wrong one in the list, I think. Can I swap it, or get a refund?'],
				detail: ['No, I haven’t downloaded it. Order {order}, from {placedDay}.'],
				look: ['Not downloaded, bought {daysAgo} days ago. Refunding in full; the customer will buy the right one.'],
				ends: [[['n', '@refund'], ['a', 'Since you haven’t downloaded it, that’s no problem. I’ve refunded {price} to your card, which takes three to five working days, and you can buy {game2} whenever you like.'], ['c', 'Thanks, I’ve just bought {game2}. Much appreciated.']]],
				happy: true,
				prep: (c) => {
					c.dl = 'unused';
					refundAll(c, 'wrong game, not downloaded');
				}
			},
			{
				open: ['I bought {game} on {placedDay} and I’m afraid it’s just not for me. Could I have a refund?'],
				detail: ['Yes, I played it for an evening. It runs fine, I just don’t enjoy it.'],
				look: ['Downloaded the day it was bought and installed; works. A change of mind after download: no refund under our terms.'],
				lookPaste: 'download',
				ends: [[['a', 'I’m sorry {game} wasn’t for you. I can’t refund it, though: once a game has been downloaded, refunds are only for games that don’t run properly, and yours works. It’s in our terms and at checkout, but I know that’s not what you wanted to hear.'], ['c', 'OK, I understand. I’ll give it another go.']]],
				prep: (c) => {
					c.dl = 'played';
				}
			},
			{
				open: ['My {kidRel} bought {game} on my account without asking, with the card saved in the browser. Is there any way to get a refund? {kid} is {age} and should know better.'],
				detail: ['Order {order}. {kid} has downloaded it already, of course.'],
				look: ['Downloaded and installed. A child’s purchase, the first on this account. Refunding as a goodwill gesture.'],
				lookPaste: 'download',
				ends: [[['n', '@refund'], ['a', 'Normally we can’t refund a game once it’s downloaded, but since this is the first time and it was {kid}, I’ve refunded the {price} as a one-off. It may be worth removing the saved card from your browser so it doesn’t happen again.'], ['c', 'That’s very kind. The card is gone and {kid} has been told!']]],
				happy: true,
				prep: (c) => {
					c.dl = 'played';
					refundAll(c, 'bought by a child without permission; goodwill');
				}
			}
		]
	},
	// The password reset never arrives.
	{
		bought: [30, 400],
		quiet: true,
		subjects: ['Can’t log in', 'Password reset not arriving', 'Locked out', 'Forgotten password'],
		open: [
			'I’ve asked for a password reset three times today and no email arrives. I’ve checked spam.',
			'My password doesn’t work any more and the reset email never comes. I’d like to get into my account to buy {game2}.',
			'I can’t get into my account. The reset link is supposed to come by email but nothing turns up.'
		],
		more: ['I’ve used the same password for years, so I don’t know why it stopped working.', 'I’ve tried on my phone and my laptop.'],
		ask: ['Sorry about that. Which email address are you entering on the reset page?', 'Sorry for the bother. Could you tell me the address you type on the reset page, exactly?'],
		paths: [
			{
				detail: ['{email}.', 'The same one I’m writing from, {email}.'],
				look: ['Account under {email}; the three resets they asked for were all accepted by the customer’s mail server. Probably filtered somewhere.'],
				lookPaste: 'signins',
				ends: [[['a', 'The three reset emails were all delivered to your mail server. Could you look in any other folders, such as Promotions or Updates, or search your mail for “Ashgrove”?'], ['c', 'Found all three in Promotions, of all places. In now, thanks.']]],
				happy: true,
				prep: (c) => {
					c.signins = 'resets';
				}
			},
			{
				detail: ['{email}, the same one I’m writing from.'],
				look: ['No account under {email}. There’s one under {altEmail}, same name.'],
				lookPaste: 'account',
				ends: [[['a', 'There’s no account under {email}, which is why no reset email came. There is one in your name under {altEmail}. Could that be it? If so, a reset will go there, or I can move the account to {email} for you.'], ['c', 'That’s my old university address. Please move it to this one.'], ['a', 'Done: the account is now under {email}, and I’ve sent you a reset.']]],
				prep: (c) => {
					c.accountEmail = c.v.altEmail!;
				}
			},
			{
				detail: ['It’s {email}, I think, but I might have signed up with another one years ago.'],
				look: ['Nothing under {email} or under the customer’s name. Asked for other addresses.'],
				lookPaste: 'none',
				ends: [[['a', 'I can’t find an account under {email}, or under your name. Could you search your inbox for an email from us, such as an old order confirmation? It will show which address we have.'], ['c', 'I’ll look tonight and come back to you.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]]
			}
		]
	},
	// A new email address for the account.
	{
		bought: [20, 300],
		quiet: true,
		subjects: ['Change my email', 'New email address', 'Leaving my job, need to change email', 'Update my account email'],
		open: [
			'I signed up with my work email, {oldEmail}, and I’m leaving the job at the end of the month. Could you change my account to {email}?',
			'How do I change the email address on my account? There’s no option on the account page. The old one is {oldEmail}, and I’d like to use {email}.'
		],
		more: ['I don’t want to lose the games I’ve bought.', 'Thanks in advance.'],
		ask: ['Of course. So that I’m sure it’s you: could you tell me the date and the game of one of your orders?', 'Happy to. Before I do, could you give me the game and rough date of a recent order? We ask everyone, to keep accounts safe.'],
		paths: [
			{
				detail: ['My last order was {game}, on {placedDate}, order {order}.'],
				look: ['Order details match. Changed the email from {oldEmail} to {email}; confirmation sent to both.'],
				lookPaste: 'account',
				ends: [[['a', 'That matches, thanks. Your account is now under {email}, and I’ve sent a note to both addresses to confirm the change.'], ['c', 'Perfect, thank you.']]],
				happy: true
			},
			{
				detail: ['I don’t remember, sorry. Something a couple of years ago. Can’t you just change it?'],
				look: ['Customer can’t give any order detail. Asked them to confirm from the old address instead.'],
				lookPaste: 'none',
				ends: [[['a', 'I’m sorry, I can’t change it without being sure it’s you. The simplest way is to send me a short email from {oldEmail} itself, saying you want the change, while you still have that address.'], ['c', 'OK, I’ll do that from work on {day}.']]]
			}
		],
		prep: (c) => {
			c.accountEmail = c.v.oldEmail!;
			c.orderEmail = c.v.oldEmail!;
		}
	},
	// Deleting an account, or a copy of its data.
	{
		bought: [60, 500],
		quiet: true,
		subjects: ['Data request', 'My account and my data', 'Request about my account'],
		open: [],
		more: ['My account is under {email}.', 'I’ve used the shop for a few years.'],
		ask: ['Of course. Could you tell me exactly what you’d like, and confirm the email address of the account?'],
		paths: [
			{
				subjects: ['Delete my account', 'Please remove my data', 'Close my account'],
				open: ['Please close my account and delete everything you have about me. I don’t play games any more and I’d rather not have accounts lying around.'],
				ask: ['I can pass that to our data protection lead. Before I do: deleting the account also removes your order history, so you won’t be able to download your games again. Are you happy to go ahead?'],
				detail: ['Yes, I understand. Please go ahead.'],
				lookWho: 'd',
				look: ['Deletion confirmed by the customer. Account and order history deleted; invoices kept for six years as tax law requires.'],
				lookPaste: 'account',
				ends: [[['D', 'Your account and the data linked to it have been deleted. The only thing we keep is the invoices for your orders, which Irish tax law requires us to hold for six years; after that they are deleted too.'], ['c', 'Thank you for doing it so quickly.']]]
			},
			{
				subjects: ['What data do you hold about me?', 'Copy of my data', 'Data access request'],
				open: ['Under the GDPR, I’d like a copy of all the data you hold about me, please.'],
				ask: ['Of course. I’ll pass this to our data protection lead, who handles these. Is it all the data for the account under {email}?'],
				detail: ['Yes, that account, and anything else you might have, like emails to support.'],
				lookWho: 'd',
				look: ['Export prepared: account, orders, payments (last four digits only), download records, support emails. Sent by a link that works for 14 days.'],
				lookPaste: 'account',
				ends: [[['D', 'Your data export is ready: I’ve sent you a link to download it, which works for 14 days. It holds your account details, orders, the last four digits of the cards you paid with, your download records and your emails to support. If anything seems to be missing, reply here.'], ['c', 'Received, thank you. That was quicker than I expected.']]]
			},
			{
				subjects: ['Delete my account', 'Too many emails', 'Remove me'],
				open: ['Please delete my account. I’ve had too many marketing emails.'],
				ask: ['Sorry about the emails. I can unsubscribe you from all marketing straight away, if that’s the main thing; deleting the account would also remove your order history and your downloads. Which would you prefer?'],
				detail: ['Hmm, I didn’t realise I’d lose the downloads. Let me think about it.'],
				look: ['Unsubscribed the customer from marketing. Waiting to hear whether they still want the account deleted.'],
				lookPaste: 'account',
				prep: (c) => {
					c.v.newsletter = 'no';
				},
				ends: [[['a', 'No rush. I’ve unsubscribed you from all marketing emails in the meantime, so you’ll only hear from us about orders. Reply here if you still want the account deleted, and I’ll pass it to our data protection lead.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]]
			}
		]
	},
	// Orders nobody here made.
	{
		bought: [0, 1],
		noOrder: true,
		subjects: ['Orders I didn’t make', 'Someone used my account', 'Strange order emails', 'I didn’t buy this'],
		open: [
			'I’ve just had three order emails from you for games I didn’t buy, {game} and {game2} among them. Has someone got into my account?',
			'There are orders on my account that aren’t mine, and I’m worried about my card. What’s going on?'
		],
		more: ['Please do something quickly.', 'I haven’t been near my computer all evening.'],
		ask: ['I’m sorry, that must be alarming. I’m looking at your account now. Could you confirm the email you use with us, and whether you use the same password anywhere else?', 'Thanks for telling us straight away. Which email address do you use with us? And have you had any other accounts compromised recently?'],
		paths: [
			{
				detail: ['{email}. And yes, I probably do use that password elsewhere.'],
				look: ['Three orders in twenty minutes from a new device abroad, after a sign-in with the right password. Looks like a reused password. Locked the account, cancelled the orders, switched off the links.'],
				lookPaste: 'signins',
				ends: [[['p', 'Refunded all three orders to the card and flagged them with the payment provider.'], ['a', 'Someone signed in to your account with your password and bought three games. I’ve locked the account, cancelled the orders and switched off their downloads, and our payments team have refunded all three to your card. Please choose a new password with the reset link I’ve sent, one you don’t use anywhere else.'], ['c', 'Changed now, and changed everywhere else too. Thank you for acting so fast.']]],
				happy: true,
				prep: (c) => {
					c.signins = 'foreign';
				}
			},
			{
				open: ['I’ve just had three order emails from you for games I didn’t buy, {game} and {game2} among them. I don’t remember ever opening an account with you. What’s going on?'],
				detail: ['The emails are to {email}, but I don’t even have an account with you!'],
				look: ['Account under {email} opened just before the order emails and paid with a card that isn’t the customer’s. Someone used their address. Passing to payments.'],
				lookPaste: 'account',
				team: 'payments team',
				ends: [[['P', 'Someone opened an account with your email address and used a card that isn’t yours, so none of this touches your money. I’ve closed the account and reported the card to our payment provider. You won’t get any more emails from it.'], ['c', 'Thanks, that’s a relief.']]],
				prep: (c) => {
					c.v.stranger = 'yes';
				}
			}
		]
	},
	// The game crashes when it starts.
	{
		bought: [0, 10],
		devices: ['windows'],
		subjects: ['Game crashes on start', '{game} won’t start', 'Crash', 'Black screen then it closes'],
		open: [
			'{game} crashes as soon as I start it. The window opens, goes black and closes after a few seconds. I’ve reinstalled it twice.',
			'I can’t get {game} to start. It shows the logo and then disappears, with no error message.',
			'Bought {game} on {placedDay} and it won’t run. Is it my computer or the game?'
		],
		more: ['Other games run fine on this PC.', 'I’ve tried running it as administrator, too.'],
		ask: ['Sorry to hear that. Could you send me the crash log? It’s the file called {logName}, in {logWhere}. And the make and model of your graphics card, if you know it.', 'Sorry about that. If you send me the log file the game writes ({logName}, in {logWhere}), I can usually tell what went wrong.'],
		paths: [
			{
				detail: ['Here it is. The graphics card is an {gpu}.'],
				paste: 'crash',
				look: ['The log shows a graphics driver from {driverYear}, too old for the game. Suggested updating it.'],
				lookPaste: 'none',
				ends: [[['a', 'The log shows your graphics driver is from {driverYear}, which is too old for {game}. If you install the latest driver from your card maker’s website and restart, it should start.'], ['c', 'Updated the driver and it works. Thank you!']]],
				happy: true,
				prep: (c) => {
					c.crash = 'driver';
				}
			},
			{
				games: ['ember-road', 'iron-orchard'],
				detail: ['Here’s the log. It’s an older PC, I’ll admit. The card is an {gpu}.'],
				paste: 'crash',
				look: ['Graphics card below the minimum; the game can’t create its renderer. Refunding under the doesn’t-run rule.'],
				lookPaste: 'none',
				ends: [[['a', 'I’m sorry: your graphics card is below what {game} needs, which is {req}, so it can’t start at all, and there’s no setting that gets round it. Since it doesn’t run on your computer, I’ve refunded the {price}.'], ['n', '@refund'], ['c', 'Shame, but thanks for the refund.']]],
				prep: (c) => {
					c.crash = 'gpu';
					refundAll(c, 'does not run on the customer’s graphics card');
				}
			},
			{
				detail: ['Log below. The card is an {gpu}, and I updated the drivers last week.'],
				paste: 'crash',
				lookWho: 'l',
				look: ['Sent the log to {studio}. They know it: a crash at start-up with some recent {gpuMaker} drivers since {version}, fixed in their next patch, due around {patchDay}.'],
				lookPaste: 'none',
				ends: [[['a', 'I sent your log to {studio}, who make {game}. They know about this one: it’s a crash at start-up with some recent {gpuMaker} drivers, and their next patch, due around {patchDay}, fixes it. I’ll send you the new download when it’s out, or if you’d rather not wait, I can refund you.'], ['c', 'I’ll wait for the patch. Thanks for finding out.']]],
				prep: (c) => {
					c.crash = 'bug';
				}
			}
		]
	},
	// Progress gone.
	{
		bought: [20, 200],
		subjects: ['Lost my save', 'Progress gone', 'Save missing after update', 'Started from the beginning??'],
		open: [
			'I updated {game} to the new version and now it starts from the beginning. I was {hours} hours in. Please tell me my save isn’t gone.',
			'After reinstalling {game}, all my progress has disappeared. Is there any way to get it back?'
		],
		more: ['I’m honestly a bit upset about it.', 'I’d nearly finished it.'],
		ask: ['Oh no, sorry. Could you tell me how you installed the new version, and whether this is the same computer as before?', 'Sorry to hear that. Did you install it on the same computer, and did you uninstall the old version first?'],
		paths: [
			{
				detail: ['Same computer. I uninstalled the old version and installed the new one in a different folder. I didn’t delete anything else.'],
				look: ['Saves live in the user folder, not where the game is installed, so they survive an uninstall. Pointed the customer to {saves}.'],
				lookPaste: 'none',
				ends: [[['a', 'Your saves should still be there: {game} keeps them in your user folder, under {saves}, not where the game is installed. If you open that folder, is there anything in it?'], ['c', 'They were there! The new version was looking in a folder with a slightly different name, so I copied them across and I’m back where I was. Phew.']]],
				happy: true
			},
			{
				open: ['After reinstalling {game} on my new laptop, all my progress has disappeared. Is there any way to get it back?', 'I’ve moved {game} to a new laptop and it starts from the very beginning. I was {hours} hours in.'],
				detail: ['New laptop, so the old saves were on the old one, which I’ve wiped and sold.'],
				look: ['Saves were on the wiped machine. Asked {studio} whether there is any online copy.'],
				lookPaste: 'none',
				ends: [[['l', '{studio} confirm there is no online copy of saves; they only exist on the machine.'], ['a', 'I’m really sorry: {game} keeps saves only on the computer you play on, and {studio} confirm there’s no copy anywhere else, so the progress went with the old laptop. For the future, the folder to back up is {saves}.'], ['c', 'Oh well. Lesson learned.']]]
			},
			{
				open: ['I updated {game} to the new version and now it starts from the beginning. I was {hours} hours in. Please tell me my save isn’t gone.'],
				detail: ['Same computer. I just installed the update over the old version, like the email said.'],
				lookWho: 'l',
				look: ['Passed to {studio} with the customer’s details. They’ve had two other reports of saves not loading after {version} and are looking into it.'],
				lookPaste: 'none',
				ends: [[['a', 'I’ve passed this to {studio}. They’ve had a couple of similar reports since {version} and are looking into it. Please don’t delete anything in the meantime: they think the saves are still there and just aren’t being read. I’ll come back to you when I hear more.'], ['c', 'Thanks, I won’t touch anything.']]]
			}
		]
	},
	// The controller is ignored.
	{
		bought: [0, 30],
		devices: ['windows'],
		games: ['salt-and-sail', 'ember-road', 'hollow-tide', 'lantern-keep'],
		subjects: ['Controller not working', 'Gamepad not detected', '{game} ignores my controller', 'Controller support?'],
		open: [
			'My {pad} works in other games, but {game} doesn’t react to it at all. I can only play with the mouse.',
			'{game} doesn’t see my {pad}. Is there a setting I’m missing?'
		],
		more: ['The product page didn’t say whether controllers are supported, so I hope they are.', 'I’ve tried unplugging and plugging it back in.'],
		ask: ['Sorry about that. Is the controller connected by cable or Bluetooth, and is anything else running that uses controllers, like Steam?', 'Sorry for the trouble. How is the controller connected, and do you have Steam or similar software open while you play?'],
		paths: [
			{
				detail: ['Bluetooth, and yes, Steam is open in the background.'],
				look: ['Known: when Steam runs in the background it takes over some controllers, and games started outside Steam don’t see them. Suggested closing Steam or adding the game to it.'],
				lookPaste: 'none',
				ends: [[['a', 'That’s the cause: Steam takes over some controllers while it’s running, and games started outside it can’t see them. If you close Steam completely before starting {game}, or add {game} to Steam as a non-Steam game, the controller should work.'], ['c', 'Closing Steam did it. Thanks!']]],
				happy: true
			},
			{
				detail: ['By cable. Nothing else is running.'],
				lookWho: 'l',
				look: ['Asked {studio}: the {pad} over cable isn’t recognised in {version}; fixed in the next patch.'],
				lookPaste: 'none',
				ends: [[['a', '{studio} tell me that controller isn’t recognised by the current version when it’s connected by cable, and their next patch fixes it. In the meantime it works over Bluetooth, if your controller has it.'], ['c', 'It does, and Bluetooth works. I’ll switch back when the patch is out.']]]
			}
		]
	},
	// A Linux build that won’t behave.
	{
		bought: [0, 20],
		games: slugs(macGames),
		devices: ['linux', 'deck'],
		subjects: ['Problem with the Linux version', '{game} on Linux', 'Linux build trouble', 'Linux version of {game}'],
		open: [],
		more: ['Other games run fine.', 'I bought it specifically because it has a Linux version, so I’d love to get it working.'],
		ask: ['Thanks for writing. Could you run it from a terminal and send me what it prints, and tell me which distribution and version you’re on?', 'Sorry about that. What does it print if you start it from a terminal? And which system is it, exactly?'],
		paths: [
			{
				open: ['The Linux version of {game} won’t start on my {deviceName}. Double-clicking does nothing; from a terminal it prints an error and stops.', 'Having trouble with the Linux build of {game}. Happy to send whatever details help.'],
				detail: ['It’s {distro}. Here’s the output:'],
				paste: 'crash',
				look: ['The C library on that release is older than the one the build needs. The studios build against Ubuntu 22.04; an upgrade fixes it.'],
				lookPaste: 'none',
				ends: [[['a', 'The error means your system’s C library is older than the one {game} was built against; the studios build for Ubuntu 22.04 and newer. Upgrading to a current release of your distribution fixes it. If that’s not possible, tell me and I’ll refund you.'], ['c', 'I’d been meaning to upgrade anyway. Done, and the game runs. Thanks.']]],
				happy: true,
				prep: (c) => {
					c.crash = 'glibc';
					c.device = 'linux';
					c.v.distro = pick(c.r, ['Debian 11', 'Ubuntu 20.04', 'Linux Mint 20.3']);
					c.v.deviceName = pick(c.r, ['Linux desktop', 'laptop running Linux']);
				}
			},
			{
				open: ['{game} starts on my {deviceName} but the screen stays black, though I can hear the music.', 'Having trouble with the Linux build of {game}: a black window and nothing else. Happy to send whatever details help.'],
				detail: ['I’m on {distro}. This is what it prints:'],
				paste: 'crash',
				look: ['No Vulkan driver found, so the renderer starts without a device. Suggested installing the Vulkan drivers for their graphics card.'],
				lookPaste: 'none',
				ends: [[['a', 'It can’t find a Vulkan driver, which {game} needs to draw anything. Installing the Vulkan drivers for your graphics card (on most distributions the package is called mesa-vulkan-drivers) should fix the black screen.'], ['c', 'Installed it and the game looks lovely. Thanks!']]],
				happy: true,
				prep: (c) => {
					c.crash = 'vulkan';
					c.device = 'linux';
					c.v.distro = pick(c.r, ['Fedora 40', 'Ubuntu 24.04', 'Pop!_OS 22.04']);
				}
			},
			{
				open: ['I’m playing {game} on my Steam Deck in desktop mode and something isn’t right with the display.', 'Having trouble with the Linux build of {game} on the Deck. Happy to send whatever details help.'],
				detail: ['It’s the Deck, in desktop mode. The game starts, but the text is tiny and the window doesn’t fill the screen.'],
				lookWho: 'l',
				look: ['Asked {studio}: the Deck’s 1280 × 800 screen isn’t in the list of sizes in {version}; their next patch adds it. Workaround: choose 1280 × 720 windowed and maximise.'],
				lookPaste: 'none',
				ends: [[['a', '{studio} tell me the Deck’s screen size is missing from the game’s list in the current version, and their next patch adds it. Until then, choosing 1280 × 720 in the display settings and maximising the window is the best workaround.'], ['c', 'That’s much better. I’ll look out for the patch.']]],
				prep: (c) => {
					c.device = 'deck';
					c.v.deviceName = 'Steam Deck';
				}
			}
		]
	},
	// A warning on a Mac.
	{
		bought: [0, 10],
		games: slugs(macGames),
		devices: ['mac'],
		subjects: ['Mac says it can’t be opened', 'Damaged app?', 'Warning on my Mac', 'Is {game} safe?'],
		open: [],
		more: ['I’m running macOS {macos}.', 'I don’t want to override a security warning without asking first.'],
		ask: ['Sorry for the scare. How did you open the download: straight from the .dmg file, or did you unpack it with another app first?', 'Thanks for checking with us first. Could you tell me how you installed it, and send me the exact wording of the message?'],
		paths: [
			{
				open: ['When I open {game} on my {deviceName}, it says the app can’t be opened because Apple cannot check it for malicious software. Is it safe?'],
				detail: ['Straight from the .dmg: I dragged the game to Applications, like it says.'],
				lookWho: 'l',
				look: ['{studios} Mac build of {version} went up without Apple’s notarisation by mistake. They are uploading a fixed build; the workaround is right-click, Open.'],
				lookPaste: 'none',
				ends: [[['a', 'Thanks for asking first. The game is safe: {studio} uploaded the latest Mac build without Apple’s check by mistake, and a fixed build is on the way. Until then, right-click the game in Applications, choose Open, and confirm; macOS will remember the choice.'], ['c', 'Right-click and Open worked. Thanks for explaining.']]],
				happy: true
			},
			{
				open: ['My Mac says {game} “is damaged and can’t be opened” and offers to move it to the bin.'],
				detail: ['I unzipped it with an app I use for archives, because the .dmg wouldn’t open in it.'],
				look: ['The third-party archive app strips the file’s signature details, which gives the damaged message. Suggested downloading again and opening the .dmg directly.'],
				lookPaste: 'download',
				ends: [[['a', 'That explains the message: some archive apps damage the signature when they unpack a Mac app, and macOS then refuses it. If you download it again and double-click the .dmg itself, without the other app, it will open normally.'], ['c', 'Downloaded again and it opened first time. Thank you.']]],
				prep: (c) => {
					c.dl = 'twice';
				}
			}
		]
	},
	// Colour, text size and other options in a game.
	{
		bought: [1, 60],
		games: ['tessellate', 'quiet-gears', 'marrow-mill', 'hollow-tide', 'salt-and-sail'],
		subjects: ['Accessibility question', 'Options in {game}', 'Question about a setting'],
		open: [],
		more: ['Otherwise I’m enjoying it a lot.', 'I play on a {deviceName}.'],
		ask: ['Happy to help. Could you tell me a bit more about what you need?'],
		paths: [
			{
				games: ['tessellate', 'marrow-mill', 'quiet-gears'],
				subjects: ['Colour-blind option?', 'Can’t tell the pieces apart', 'Accessibility question'],
				open: ['I’m colour-blind (red-green) and in {game} I can’t tell some of the pieces apart. Is there a setting that helps?'],
				ask: ['Thanks for writing. Which version of {game} do you have? It shows at the bottom of the title screen.'],
				detail: ['It says {version} on the title screen.'],
				look: ['Checked with {studios} notes: {version} has a symbols option that marks each colour with a shape.'],
				lookPaste: 'none',
				ends: [[['a', 'Good news: {version} has an option for exactly this. In Options, then Display, turn on Symbols, and every colour gets its own shape as well, so you never have to tell them apart by colour alone.'], ['c', 'That’s perfect. Thank you, I had no idea it was there.']]],
				happy: true
			},
			{
				games: ['hollow-tide', 'salt-and-sail'],
				subjects: ['Text too small', 'Subtitle size in {game}', 'Accessibility question'],
				open: ['I play {game} on the TV across the room, and the subtitles are far too small to read. Is there a way to make them bigger?'],
				ask: ['Sorry about that. Which version are you on, and have you looked under the display options?'],
				detail: ['{version}. The display options have subtitles on or off, but nothing about size.'],
				lookWho: 'l',
				look: ['Asked {studio}: no text-size option in {version}. They’ve had the request before and plan a larger-text setting, no date yet.'],
				lookPaste: 'none',
				ends: [[['a', 'I asked {studio}. There isn’t a size option in the current version, but they plan to add a larger-text setting; they couldn’t give me a date. I’ve passed on your ticket so they know another player is waiting for it.'], ['c', 'Thanks for asking them. I’ll sit closer for now!']]]
			}
		]
	},
	// A copy for a review or a stream.
	{
		noOrder: true,
		subjects: ['Review copy request', 'Streamer here', 'Press copy of {game}', 'Collaboration?'],
		open: [
			'I run a small channel about cosy games, about {followers} followers, and I’d love to feature {game}. Is there any chance of a copy for review?',
			'I write for {outlet} and I’m putting together a piece on European indie studios. Could I get a press copy of {game}?'
		],
		more: ['I can send viewing figures if that helps.', 'The piece is due at the end of next month.'],
		ask: ['Thanks for thinking of us! Review copies come from the studios themselves, so I’ll ask {studio}. Could you send me a link to your channel or your published work?', 'Thanks for getting in touch. Press copies are up to the studio, so I’ll check with {studio}. Do you have a link to something you’ve published?'],
		paths: [
			{
				detail: ['Of course: {channel}. My last video was on Quiet Gears, as it happens.', 'Sure, here’s my recent work: {channel}.'],
				lookWho: 'l',
				look: ['{studio} happy to give a copy from their press allocation.'],
				lookPaste: 'none',
				ends: [[['L', 'Hello {name}, {studio} would be glad for you to cover {game}. Here’s a code from their press allocation: {code}. They’d appreciate a link when the piece goes up.'], ['c', 'Wonderful, thank you both!']]]
			},
			{
				detail: ['Here you go: {channel}.'],
				lookWho: 'l',
				look: ['{studio} only give press copies through their own press page. Pointed the requester there.'],
				lookPaste: 'none',
				ends: [[['a', '{studio} handle press copies themselves, I’m afraid, and they’ve asked us to point people to the press page on their website rather than giving codes from here. Sorry I can’t do more.'], ['c', 'No problem, I’ll contact them directly.']]]
			}
		]
	},
	// Copies for a classroom.
	{
		noOrder: true,
		games: ['tessellate', 'quiet-gears', 'marrow-mill'],
		subjects: ['Licence for a school', 'Classroom use of {game}', 'Buying for our computer room', 'Education pricing?'],
		open: [
			'I teach at a secondary school in {city} and we’d like to use {game} in our maths club. We have {seats} computers that aren’t connected to the internet. How would that work?',
			'Is it possible to buy {game} for a whole classroom? We’re a small school in {city} with {seats} computers.'
		],
		more: ['Our budget is small, as you can imagine.', 'The pupils loved it when I showed it on the projector.'],
		ask: ['That sounds lovely. Each copy is for one person, so for {seats} computers you’d need {seats} copies, but {studio} sometimes do a classroom licence for schools. I’ll ask them. Would you pay by invoice or by card?', 'What a nice idea. I’ll ask {studio} about a classroom licence. In the meantime: does the school need to pay by invoice?'],
		paths: [
			{
				detail: ['By invoice, please. The school is {school}.'],
				lookWho: 'l',
				look: ['{studio} offer a classroom licence: one installer for up to {seats} machines at half price, invoiced through payments.'],
				lookPaste: 'none',
				ends: [[['L', 'Good news: {studio} offer schools a classroom licence, one installer for up to {seats} computers, at half the price of {seats} copies. If you’d like it, our payments team will send an invoice to the school.'], ['c', 'That’s very generous. Please send the invoice to our bursar.'], ['p', 'Invoice for the classroom licence sent to the school’s bursar.\n\n@invoice']]],
				prep: (c) => {
					c.invoiceTo = 'school';
					c.v.licence = 'yes';
				}
			},
			{
				detail: ['I have a school card, so I could just buy {seats} copies in one order.'],
				look: ['Would be {seats} copies in one order. Told them to wait: the checkout total ignores the quantity at the moment, and we’d rather not invoice the rest afterwards.'],
				lookPaste: 'none',
				ends: [[['a', 'You could, but please hold off for a few days: our checkout currently shows the wrong total when you buy more than one copy, and the web team are fixing it. I’ll write to you as soon as it’s right, so your receipt matches what you paid.'], ['c', 'No problem, I’ll wait for your email.']]]
			}
		]
	},
	// A studio that would like to sell here.
	{
		noOrder: true,
		subjects: ['Selling our game on Ashgrove', 'Studio enquiry', 'How do we get listed?', 'Partnership'],
		open: [
			'We’re a two-person studio in {city} and we’re finishing our first game. How do we get it into your shop?',
			'Hi, I’m an independent developer with a game coming out next spring. Do you take submissions?'
		],
		more: ['We like that you sell games without launchers.', 'We have a trailer and a demo build ready.'],
		ask: ['Thanks for thinking of us! Could you send me a short description of the game, the platforms it runs on, and a link to a trailer or build? I’ll pass it to our studio relations team.'],
		paths: [
			{
				detail: ['Here you go: {pitch} Trailer and build: {channel}.'],
				lookWho: 'l',
				look: ['Interesting one; asked for a build and the planned release date.'],
				lookPaste: 'none',
				ends: [[['L', 'Hello {name}, thank you for sending this. We’d love to see more: could you send a build we can play, your planned release date and the price you have in mind? We take on only a few games a year, so I can’t promise anything, but it looks like a good fit.'], ['c', 'Thank you! I’ll send a build next week.']]]
			},
			{
				detail: ['It’s a mobile game for phones, free to play with in-app purchases. {channel}.'],
				lookWho: 'l',
				look: ['Mobile, free to play with purchases inside the game. Not something we sell.'],
				lookPaste: 'none',
				ends: [[['L', 'Thank you for thinking of us. We only sell games for computers that people buy once, so a free-to-play phone game isn’t something we can take on. I’m sorry, and good luck with the launch.'], ['c', 'Understood, thanks for the quick answer.']]]
			}
		]
	}
];

// Shared pieces, combined with every topic.
/** A line about the writer, before the matter. */
const intros = [
	'I’ve been a customer since {since}.',
	'I’m fairly new to your shop, so apologies if I’ve missed something obvious.',
	'I found your shop through {studios} website a while ago.',
	'A friend put me on to your shop because you sell games without launchers.',
	'I play a few evenings a week, mostly on a {deviceName}.',
	'I live in {city}, in case that matters for anything.'
];
const contexts = [
	'I don’t have much time to play, so I tend to buy something and come back to it weeks later.',
	'I like buying from you because the installers are mine to keep, so I’d like to get this right.',
	'I’m not very technical, so please bear with me.',
	'I work in IT myself, so I’ve already tried the obvious things.',
	'I’ve tried to work it out myself before bothering you.',
	'I looked through your help pages first, but couldn’t find this.'
];
const situations = [
	'Sorry for the long email; I’d rather give you too much than too little.',
	'I’m away from {day}, so it would be lovely to have this sorted before then.',
	'Not urgent, but it has been bugging me all week.',
	'You were very helpful the last time I wrote in, so fingers crossed.',
	'It’s been a long week, so forgive me if I’ve missed something obvious.',
	'I’ve already spent an evening on this before writing.'
];
/** A one-line aside in the first message, and support’s answer to it. */
const tangents: [string, string][] = [
	['Also, do you know when the next sale is?', 'On sales: the winter sale starts in mid-December, and the newsletter announces it a few days ahead.'],
	['While I’m writing: do you have a phone number?', 'On phoning us: we only do email, I’m afraid, but we answer within a working day.'],
	['Are you planning to sell more games? Eight isn’t many!', 'On more games: yes, a few more are coming next year, and the newsletter will have them first.'],
	['Do your games need an internet connection to play?', 'On playing offline: none of our games needs a connection once it’s installed.'],
	['Do you sell gift cards?', 'On gift cards: not yet, I’m afraid, but any game can be bought as a gift code by buying an extra copy.'],
	['How many computers can I install a game on?', 'On installing: as many as you like, as long as they’re yours.'],
	['Will there ever be a boxed edition of {game3}?', 'On boxed editions: we only sell downloads, but some studios sell boxed copies themselves.'],
	['Is it true that the studios get most of the money?', 'On the studios: yes, they get 85% of every sale after VAT and payment fees.'],
	['Small thing: my bank statement says Ashgrove Games Ltd. Is that you? My bank asked.', 'On the name on your statement: yes, that’s us, a small company in Galway.']
];
/** A second matter the customer raises in a later message: the question, support’s answer, and a word of thanks. */
const sides: { q: string; a: string; then: string }[] = [
	{ q: 'Separate question: can I move a game to my {kidRel}’s account? {kid} has {kidPoss} own account now.', a: 'On moving a game to {kid}’s account: we can’t move a purchase between accounts, but {kid} can install it from your download; the licence covers your household.', then: '' },
	{ q: 'Also, I bought {game3} a while ago and never got round to it. Is the version I downloaded then still the latest?', a: 'On {game3}: the current version is {version3}. If yours is older, I’ve sent fresh links so you can get the latest; your saves carry over.', then: 'Thanks for the new {game3} links too.' },
	{ q: 'While I have you: could I get a receipt for my last order with the VAT shown separately? I sometimes claim games for work.', a: 'On the VAT receipt: attached, with the VAT on its own line.', then: '' },
	{ q: 'Do you know whether {studio3} are making a sequel to {game3}? I loved it.', a: 'On a sequel to {game3}: {studio3} haven’t announced anything, and we wouldn’t be able to say before they do.', then: '' },
	{ q: 'Lastly, could you take me off the newsletter? I get enough email.', a: 'On the newsletter: done. You’re unsubscribed and won’t get the next issue.', then: '' },
	{ q: 'Do you have a student discount?', a: 'On student discounts: no, I’m afraid, but the seasonal sales take up to 40% off.', then: '' },
	{ q: 'Is it all right to back up the installers to a USB stick?', a: 'On back-ups: please do. The installers are yours to keep, and they install without a connection.', then: 'Everything is backed up to the stick now, thanks.' },
	{ q: 'Can I pay by bank transfer next time? I’d rather not use my card online.', a: 'On paying by transfer: not for single orders, I’m afraid, only cards and PayPal. For orders over €200 we can send an invoice.', then: '' },
	{ q: 'Is there a wishlist? I’d like to know when {game3} goes on sale.', a: 'On a wishlist: there isn’t one, but every sale is in the newsletter.', then: '' },
	{ q: 'Can I get a refund on {game3}? I bought it a while ago and haven’t liked it.', a: 'On {game3}: refunds for a change of mind are only possible before a game is downloaded, and yours was downloaded a while ago, so I can’t refund it, I’m sorry.', then: 'Fair enough about {game3}; I thought I’d ask.' },
	{ q: 'Is there a way to give a game as a present on a particular day?', a: 'On presents: if you buy more than one copy of a game, each extra copy comes as a gift code that you can send whenever you like.', then: '' },
	{ q: 'Can I see what I’ve spent with you this year? It’s for my budget spreadsheet.', a: 'On this year’s spending: I’ve attached a list of your orders since January with their totals.', then: 'The spending list was just what I needed.' },
	{ q: 'Will {game3} get any more updates?', a: 'On {game3}: {studio3} are still updating it; the latest version is {version3}.', then: '' }
];
/** Support's check before changing anything on an order, and the answers that fit it. */
const checks: [string, string[]][] = [
	['Thanks. Before I make any changes: could you confirm the last four digits of the card you paid with? We ask everyone, so we know we’re dealing with the account holder.', ['It ends in {card}. It’s a {brand}.', 'Card ending {card}.']],
	['Thank you. One quick check before I go further, as we do for everyone: which town is the billing address on your account in?', ['The billing address is in {city}.', '{city}.']],
	['Thanks for that. So that I’m sure it’s your account, could you tell me roughly when you opened it, or the card you usually pay with?', ['I opened it in {since}, I think, and I pay with a {brand} card ending {card}.', 'Sometime in {since}. The card ends in {card}.']]
];
const replyNotes = ['Thanks for getting back to me so quickly.', 'Sorry for the late reply; it’s been a busy week.', 'Thanks for the quick answer.', 'Sorry, I only saw your email this evening.', 'Thank you for looking into it.'];
const closings = ['If anything else comes up, just reply here and it comes straight back to me.', 'Shout if any of that isn’t clear.', 'I’ll keep this ticket open until I hear from you.', 'Sorry again for the bother.'];
const greetings = ['Hi', 'Hello', 'Hi there', 'Good morning', 'Good evening', 'Dear Ashgrove', 'Hello Ashgrove team', 'Hey'];
const custSign = ['Thanks, {name}', 'Many thanks,\n{full}', '{name}', 'Cheers, {name}', 'Kind regards,\n{full}\n{city}', 'Thanks\n{name}\n\nSent from my phone', 'Best wishes,\n{full}', 'Thank you!\n{name}'];
const acks = ['Thanks for getting in touch.', 'Thanks for your message, and sorry for the trouble.', 'Thanks for writing in.', 'Thanks for the clear description.', ''];
const agentSign = ['Best wishes,\n{signer}', '{signer}\nAshgrove Games support', 'Thanks,\n{signer}', 'Kind regards,\n{signer} at Ashgrove Games'];
const holding = ['Quick update: I’ve asked {team} to take a look, and I’ll come back to you by {day}.', 'Thanks for bearing with us. I’m still waiting to hear back from {team}; I haven’t forgotten you.', 'Just to let you know this is with {team} now. I’ll update you as soon as I hear.'];
const chasers = ['Any news on this?', 'Just checking you got my last message.', 'Sorry to chase; I’d like to get this sorted.', 'Hello? It’s been a few days.', 'Any update?'];
const surveys: [string, string][] = [['Great', 'Quick and friendly.'], ['Good', 'Sorted in the end, thanks.'], ['Great', '{agent} was brilliant.'], ['OK', 'Took a while but got there.'], ['Good', 'Clear answers.'], ['Great', 'Really helpful, thank you.'], ['Good', '']];
const pitches = ['A short puzzle game about folding paper maps, about four hours long, for Windows and macOS.', 'A narrative game set on a night ferry, two to three hours, Windows only for now.', 'A small city-builder on floating islands, for Windows and Linux.', 'A cosy mystery about a lighthouse keeper, about six hours, Windows and macOS.'];
const outlets = ['a regional newspaper’s weekend supplement', 'Pixel Harbour, a games blog', 'a student magazine', 'a podcast about small games'];

// Pasted output.
const fence = (lines: string[]) => ['```text', ...lines, '```'].join('\n');
const fileFor = (game: Game, device: Device) => `${game.slug}-${game.version}-${!game.mac || device === 'windows' ? 'windows-x64.exe' : device === 'mac' ? 'macos.dmg' : 'linux-x86_64.tar.gz'}`;
const osName = (device: Device) => ({ windows: 'Windows', mac: 'macOS', linux: 'Linux', deck: 'SteamOS' })[device];
const ip = (r: Rand) => `${int(r, 31, 217)}.${int(r, 0, 255)}.${int(r, 0, 255)}.x`;
const giftCode = (r: Rand) => {
	const alphabet = 'ACDEFGHJKMNPQRTUVWXYZ2345679';
	const chunk = (size: number) => Array.from({ length: size }, () => pick(r, alphabet.split(''))).join('');
	return `AG${chunk(2)}-${chunk(4)}-${chunk(4)}`;
};
const vatPart = (cents: number, rate: number) => Math.round(cents - cents / (1 + rate / 100));

const confirmation = (c: Ctx) => {
	const { v } = c;
	return fence([
		'From: Ashgrove Games <orders@ashgrove.games>',
		`Subject: Your order ${v.order}`,
		`Date: ${stampLong(c.placed + 1)}`,
		'',
		`Thank you for your order, ${v.name}!`,
		'',
		`${c.game.title.padEnd(16)} ${c.copies} × ${euro(c.game.cents)}`,
		`Total paid: ${euro(c.game.cents)} (incl. VAT ${euro(vatPart(c.game.cents, Number(v.vatRate)))})`,
		'',
		`Download ${c.game.title} for ${c.game.mac ? 'Windows, macOS or Linux' : 'Windows'}: [Download]`,
		`The links work until ${shortDate(c.placed + 7 * DAY)}. Keep the installer somewhere safe: it is yours, and it never runs out.`,
		...(c.copies > 1 ? ['', `Your ${c.copies - 1} extra ${c.copies > 2 ? 'copies come as gift codes' : 'copy comes as a gift code'}: ${Array.from({ length: c.copies - 1 }, (_, i) => (i ? giftCode(c.r) : v.code)).join(', ')}`] : []),
		'',
		'Questions about your order? Just reply to this email.',
		'Ashgrove Games, Galway'
	]);
};

const orderPanel = (c: Ctx) => {
	const { v, r } = c;
	const lines: [Game, number][] = [[c.game, c.copies]];
	const charged = lines.reduce((sum, [game]) => sum + game.cents, 0);
	const rate = Number(v.vatRate);
	const bounced = c.orderEmail !== v.email && c.orderEmail === v.typo;
	const downloads = { complete: '1 download', twice: '2 downloads', stops: `${int(r, 3, 5)} attempts, none complete`, unused: 'not used', played: '1 download' }[c.dl];
	return [
		`Order ${v.order} in the back office:`,
		'',
		fence([
			`Order         ${v.order}`,
			`Placed        ${stampPanel(c.placed)}`,
			`Account       ${v.acct} · ${v.full} <${c.orderEmail}>`,
			'Status        paid',
			`Payment       ${v.brand} ending ${v.card} · 3-D Secure passed · ${v.payRef}`,
			`Billing       ${v.address}`,
			...lines.map(([game, copies], i) => `${i ? '              ' : 'Lines         '}${game.title.padEnd(16)} ${copies} × ${euro(game.cents)}`),
			`Charged       ${euro(charged)} incl. VAT ${rate}% (${euro(vatPart(charged, rate))})`,
			`Email         order confirmation, ${clock(c.placed + 1)}, ${bounced ? 'bounced: mailbox does not exist' : 'accepted by the receiving server'}`,
			`Links         sent ${stampPanel(c.placed + 1)} · expire ${shortDate(c.placed + 7 * DAY)} · ${downloads}`,
			...(c.copies > 1 ? [`Gift codes    ${c.copies - 1} issued`] : []),
			'',
			'Events',
			`  ${clock(c.placed - int(r, 2, 9))}  checkout opened from /store/products/${c.game.slug}`,
			`  ${clock(c.placed)}  payment created, ${v.payRef}`,
			`  ${clock(c.placed)}  3-D Secure passed (${v.bank})`,
			`  ${clock(c.placed + 1)}  payment captured, ${euro(charged)}`,
			`  ${clock(c.placed + 1)}  order confirmation sent to ${c.orderEmail}${bounced ? ' (bounced)' : ''}`,
			`  ${clock(c.placed + 1)}  download links issued for ${fileFor(c.game, c.device)}`,
			...(c.dl === 'unused' ? [] : [`  ${iso(c.firstDl) === iso(c.placed) ? clock(c.firstDl) : `${shortDate(c.firstDl)}, ${clock(c.firstDl)}`}  first download started`])
		])
	].join('\n');
};

const historyTable = (c: Ctx) => {
	const { v, r } = c;
	const count = Number(v.orders);
	const startMin = c.firstOrder;
	const end = c.altAccount ? c.placed - int(r, 30, 90) * DAY : c.placed;
	const rows = ['| Order | Placed | Games | Total |', '| ---: | --- | --- | ---: |'];
	const others = shuffle(r, games.filter((game) => game !== c.game));
	const own = c.altAccount ? count : count - (c.twoOrders ? 2 : 1);
	for (let i = 0; i < own; i++) {
		const when = startMin + Math.floor(((end - startMin) * (i + 0.3 + r() * 0.4)) / Math.max(1, own));
		const game = others[i % others.length]!;
		const gift = i >= others.length;
		const second = !gift && r() < 0.25 ? others[(i + 3) % others.length]! : undefined;
		const names = [`${game.title}${gift ? ' (gift)' : ''}`, ...(second && second !== game ? [second.title] : [])];
		const cents = game.cents + (second && second !== game ? second.cents : 0);
		rows.push(`| ${orderNo(when) + (i % 7)} | ${shortDate(when)} | ${names.join(', ')} | ${euro(cents)} |`);
	}
	if (!c.altAccount) {
		rows.push(`| ${v.order} | ${shortDate(c.placed)} | ${c.game.title}${c.copies > 1 ? ` × ${c.copies}` : ''} | ${euro(c.game.cents)} |`);
		if (c.twoOrders) rows.push(`| ${v.order2} | ${shortDate(c.placed)} | ${c.game.title} | ${euro(c.game.cents)} |`);
	}
	return `Orders on account ${v.acct}, as the customer’s orders page lists them:\n\n${rows.join('\n')}`;
};

const downloadLog = (c: Ctx) => {
	const { v, r } = c;
	if (c.dl === 'unused') return `Download records for order ${v.order}: none.`;
	const file = fileFor(c.game, c.device);
	const size = `${c.game.gb.toFixed(2)} GB`;
	const client = `${v.browser}, ${osName(c.device)}`;
	const address = ip(r);
	const lines: string[] = [];
	let t = c.firstDl;
	const servers = ['dub-1', 'dub-2', 'fra-1', 'fra-2', 'ams-1'];
	const minutes = (gb: number) => Math.max(2, Math.round(gb * int(r, 2, 6)));
	const row = (when: number, server: string, what: string) => lines.push(`${isoTime(when, int(r, 0, 59))}  ${server}  ${file.padEnd(36)} ${size.padStart(8)}  ${what}`);
	if (c.dl === 'stops') {
		const cap = c.v.hotel === 'yes' ? 2 : 0;
		const attempts = int(r, 3, 5);
		for (let i = 0; i < attempts; i++) {
			const server = v.badServer === 'yes' ? 'fra-2' : pick(r, servers);
			row(t, server, `started     ${address}  ${client}`);
			const done = cap ? cap + r() * 0.01 : c.game.gb * (0.25 + r() * 0.6);
			t += minutes(done);
			row(t, server, `stopped at ${done.toFixed(2)} GB (${cap ? 'closed by the client’s network' : v.badServer === 'yes' ? 'connection reset by server' : 'closed by client'})`);
			t += int(r, 20, 900);
		}
	} else {
		const times = c.dl === 'twice' ? 2 : 1;
		for (let i = 0; i < times; i++) {
			const server = pick(r, servers);
			row(t, server, `started     ${address}  ${client}`);
			t += minutes(c.game.gb);
			row(t, server, 'complete');
			t += int(r, 30, 600);
		}
	}
	return `Download records for order ${v.order}:\n\n${fence(lines)}`;
};

const paymentEvents = (c: Ctx) => {
	const { v, r } = c;
	const events: [number, string][] = [];
	const ev = (minutes: number, what: string) => events.push([minutes, what]);
	const created = () => ev(0, `payment.created          ${euro(c.game.cents).padEnd(8)} ${v.brand} •••• ${v.card} (${v.bank})`);
	const attempts = { timeout: 3, declined: 3, prepaid: 2 }[c.pay as 'timeout'] ?? 1;
	for (let i = 0; i < attempts; i++) {
		if (i) ev(int(r, 2, 14), '');
		created();
		if (c.pay === 'timeout') ev(0, '3ds.challenge_sent       method: banking app'), ev(2, '3ds.timed_out'), ev(0, 'payment.failed           reason: authentication_timeout');
		else if (c.pay === 'declined') ev(0, '3ds.not_required'), ev(0, 'payment.declined         reason: issuer_declined (do_not_honour)');
		else if (c.pay === 'prepaid') ev(0, 'payment.failed           reason: card_not_supported (funding: prepaid)');
		else if (c.pay === 'abandoned') ev(0, '3ds.challenge_sent       method: banking app'), ev(30, '3ds.expired'), ev(0, 'authorisation.released');
		else if (c.pay === 'hold') ev(0, '3ds.passed'), ev(0, 'payment.authorised'), ev(1, 'payment.capture_failed   reason: timeout'), ev(1, 'authorisation.released'), ev(1, ''), created();
		if (c.pay === 'hold' || c.pay === 'ok') ev(0, '3ds.passed'), ev(0, 'payment.authorised'), ev(1, `payment.captured         order ${v.order}`);
	}
	const span = events.reduce((sum, [gap]) => sum + gap, 0);
	let seconds = (c.placed + (c.pay === 'ok' || c.pay === 'hold' ? 1 : 0) - span) * 60 + int(r, 2, 15);
	const lines = events.map(([gap, what]) => {
		seconds += gap * 60 + int(r, 1, 9);
		const m = Math.floor(seconds / 60);
		return what ? `${clock(m)}:${pad(((seconds % 60) + 60) % 60)}  ${what}` : '';
	});
	return `Events from the payment provider, ${shortDate(c.placed)}:\n\n${fence(lines.filter(Boolean))}`;
};

const gpus: Record<'driver' | 'gpu' | 'bug', [string, string, string, string][]> = {
	driver: [['NVIDIA GeForce GTX 1060 6GB', 'NVIDIA', '26.21.14.3086', '6052'], ['AMD Radeon RX 580', 'AMD', '26.20.13031.18002', '8192'], ['NVIDIA GeForce GTX 1650', 'NVIDIA', '26.21.14.4120', '4096']],
	gpu: [['NVIDIA GeForce GTX 660', 'NVIDIA', '27.21.14.6079', '2048'], ['Intel(R) HD Graphics 4600', 'Intel', '20.19.15.5107', '1024'], ['AMD Radeon HD 7770', 'AMD', '15.201.1151.1008', '1024']],
	bug: [['AMD Radeon RX 6700 XT', 'AMD', '32.0.12011.1036', '12272'], ['NVIDIA GeForce RTX 3060', 'NVIDIA', '32.0.15.6094', '12288'], ['AMD Radeon RX 7600', 'AMD', '32.0.12019.1028', '8176']]
};
const crashLog = (c: Ctx) => {
	const { v, r } = c;
	const { exe, engine, title } = c.game;
	const elf = `./${engine === 'unity' ? 'UnityPlayer.so' : `${exe}.x86_64`}`;
	if (c.crash === 'glibc') return fence([`$ ./${exe}.x86_64`, `${elf}: /lib/x86_64-linux-gnu/libc.so.6: version \`GLIBC_2.${engine === 'unity' ? 35 : 34}' not found (required by ${elf})`, '$ ldd --version | head -1', `ldd (${v.distro!.startsWith('Debian') ? 'Debian GLIBC 2.31-13+deb11u11' : 'Ubuntu GLIBC 2.31-0ubuntu9.16'}) 2.31`]);
	if (c.crash === 'vulkan')
		return engine === 'godot'
			? fence([`$ ./${exe}.x86_64`, 'Godot Engine v4.2.2.stable.official.15073afe3', 'ERROR: Vulkan: No physical devices found.', '   at: _create_physical_device (drivers/vulkan/vulkan_context.cpp:1247)', 'ERROR: Unable to initialize Vulkan video driver.', 'Trying OpenGL compatibility renderer instead.'])
			: fence([`$ ./${exe}.x86_64`, 'Initialize engine version: 2022.3.41f1 (0f988161febf)', 'Vulkan detection: 0', 'No supported renderers found, falling back to null renderer.', 'Desktop is 2560 x 1440 @ 60 Hz']);
	const [gpu, maker, driver, vram] = [v.gpuName!, v.gpuMaker!, v.gpuDriver!, v.gpuVram!];
	const dll = maker === 'AMD' ? 'amdxx64' : 'nvwgf2umx';
	if (engine === 'unity') {
		const lines = [`Mono path[0] = 'C:/Games/${title}/${exe}_Data/Managed'`, 'Initialize engine version: 2022.3.41f1 (0f988161febf)', 'GfxDevice: creating device client; threaded=1; jobified=0', 'Direct3D:', `    Version:  Direct3D 11.0 [level ${c.crash === 'gpu' ? '10.0' : '11.1'}]`, `    Renderer: ${gpu} (ID=0x${int(r, 4096, 65535).toString(16)})`, `    Vendor:   ${maker}`, `    VRAM:     ${vram} MB`, `    Driver:   ${driver}`];
		if (c.crash === 'gpu') lines.push('Error: the graphics device does not support feature level 11_1.');
		else if (c.crash === 'driver') lines.push('d3d11: failed to create 2D texture id=1932 width=2048 height=2048 mips=12 dxgifmt=98 [D3D error was 80070057]', 'd3d11: failed to create staging 2D texture w=2048 h=2048 d3dfmt=98 [80070057]');
		else lines.push('<RI> Initializing input.', 'Input initialized.');
		lines.push('Crash!!!', ...(c.crash === 'bug' ? [`0x00007FF${int(r, 100, 999)}A1C4F2E (${dll}) (function-name not available)`, '0x00007FF7B2E10A39 (UnityPlayer) UnityMain'] : []));
		return `Player.log:\n\n${fence(lines)}`;
	}
	if (engine === 'godot') {
		const lines = ['Godot Engine v4.2.2.stable.official.15073afe3', `Vulkan API 1.${c.crash === 'gpu' ? 0 : 3}.${int(r, 100, 270)} - Forward+ - Using Vulkan Device #0: ${maker} - ${gpu}`];
		if (c.crash === 'driver') lines.push('ERROR: Your video card drivers seem not to support the required Vulkan version.', '   at: _initialize_extensions (drivers/vulkan/vulkan_context.cpp:1289)', `Driver version: ${driver}`);
		else if (c.crash === 'gpu') lines.push('ERROR: Vulkan: Did not find any compatible GPUs.', 'ERROR: Unable to initialize Vulkan video driver.');
		else lines.push('', 'CrashHandlerException: Program crashed with signal 11', '[1] RenderingDeviceVulkan::_draw_list_insert_clear_region', '[2] RenderForwardClustered::_render_scene', '-- END OF BACKTRACE --');
		return `${exe.toLowerCase()}.log:\n\n${fence(lines)}`;
	}
	let t = (c.open - int(r, 30, 600)) * 60000;
	const ms = () => {
		t += int(r, 2, 900);
		return new Date(EPOCH + t).toISOString().slice(11, 23);
	};
	const lines = [`[${ms()}] ${title} ${c.game.version} (build ${int(r, 3000, 5999)}, win64)`, `[${ms()}] cpu: ${pick(r, ['Intel Core i5-4590 @ 3.30GHz, 4 cores', 'AMD Ryzen 5 3600, 6 cores', 'Intel Core i7-8700 @ 3.20GHz, 6 cores'])}`, `[${ms()}] gpu: ${gpu}, ${vram} MB, driver ${driver}`, `[${ms()}] renderer: creating D3D11 device (feature level 11_1)`];
	if (c.crash === 'gpu') lines.push(`[${ms()}] FATAL: CreateSwapChain failed: 0x887A0004 (DXGI_ERROR_UNSUPPORTED)`);
	else if (c.crash === 'driver') lines.push(`[${ms()}] warning: driver ${driver} is older than the tested minimum`, `[${ms()}] FATAL: compute shader 'terrain_erode' failed to compile`);
	else lines.push(`[${ms()}] audio: 48000 Hz, 2 channels`, `[${ms()}] FATAL: access violation at 0x0000000000000018 in ${dll}.dll`);
	return `${exe}_crash.txt:\n\n${fence(lines)}`;
};

const specsBlock = (c: Ctx) => {
	const { r } = c;
	const spec: string[] =
		c.device === 'mac'
			? [`Device       ${{ 'MacBook Air': pick(r, ['MacBook Air (M2, 2022)', 'MacBook Air (M1, 2020)']), 'MacBook Pro': 'MacBook Pro (14-inch, M3, 2023)', iMac: 'iMac (24-inch, M1, 2021)', 'Mac mini': 'Mac mini (M2, 2023)' }[c.v.deviceName!]}`, `System       macOS ${c.v.macos}`, `Memory       ${pick(r, ['8', '16'])} GB`, `Free space   ${int(r, 40, 300)} GB`]
			: c.device === 'linux'
				? [`System       ${c.v.distro}`, `Processor    ${pick(r, ['AMD Ryzen 5 5600', 'Intel Core i7-10700', 'AMD Ryzen 7 5700U'])}`, `Graphics     ${pick(r, ['AMD Radeon RX 6600 (Mesa 24.1)', 'Intel Iris Xe (Mesa 24.0)', 'NVIDIA GeForce GTX 1660 (driver 550)'])}`, `Memory       16 GB`]
				: c.device === 'deck'
					? ['Device       Steam Deck OLED', 'System       SteamOS 3.6, desktop mode', 'Free space   212 GB']
					: c.spec === 'weak'
						? [`Device       ${pick(r, ['Lenovo IdeaPad 5', 'HP Pavilion 15', 'Dell Inspiron 14'])}`, 'System       Windows 11 Home 23H2', `Processor    ${pick(r, ['Intel Core i5-8250U @ 1.60GHz', 'Intel Core i5-1135G7 @ 2.40GHz', 'AMD Ryzen 5 4500U'])}`, 'Memory       8 GB', `Graphics     ${pick(r, ['Intel UHD Graphics 620', 'Intel Iris Xe Graphics', 'AMD Radeon Graphics (integrated)'])}`, `Free space   ${int(r, 30, 90)} GB on C:`]
						: [`Device       ${pick(r, ['MSI Katana 15', 'ASUS TUF Gaming A15', 'Lenovo Legion 5'])}`, `System       Windows 11 ${pick(r, ['Home', 'Pro'])} 23H2`, `Processor    ${pick(r, ['AMD Ryzen 5 5600', 'Intel Core i5-12400F', 'AMD Ryzen 7 5800H'])}`, `Memory       ${pick(r, ['16', '32'])} GB`, `Graphics     ${pick(r, ['NVIDIA GeForce RTX 3060 (12 GB)', 'AMD Radeon RX 6700 XT (12 GB)', 'NVIDIA GeForce RTX 4060 Laptop (8 GB)'])}`, `Free space   ${int(r, 120, 600)} GB on C:`];
	return fence(spec);
};

const refundBlock = (c: Ctx) =>
	fence([`Refund        R-${c.v.refundNo}`, `Order         ${c.twoOrders ? c.v.order2 : c.v.order}`, `Amount        ${euro(c.refund.cents)} to ${c.v.brand} ending ${c.v.card}`, `For           ${c.refund.what}`, `Downloads     ${c.refund.revoke ? 'links switched off' : 'unchanged'}`, `Reason        ${c.refund.reason}`, 'Expected      3–5 working days']);

const accountBlock = (c: Ctx) => {
	const { v, r } = c;
	if (v.stranger === 'yes')
		return fence([`Account       ${v.acct} · created ${stampPanel(c.open - int(r, 300, 900))}`, `Name          ${pick(r, ['M. Kurz', 'J. Smith', 'A. Leroy'])}`, `Email         ${v.email} (not confirmed)`, `Billing       ${pick(r, ['Hauptstraße 1, 10115 Berlin', '1 Main Street, Dublin 1', '1 rue de Paris, 75001 Paris'])}`, `Orders        3, all ${shortDate(c.open - int(r, 60, 280))}`, 'Newsletter    no', `Cards used    ${pick(r, ['Visa', 'Mastercard'])} ending ${int(r, 1000, 9999)}, issued outside the EU`]);
	return fence([
		`Account       ${v.acct} · created ${v.created}`,
		`Name          ${v.full}`,
		`Email         ${c.accountEmail} (confirmed)`,
		`Billing       ${c.addressChanged ? `${v.newAddress} (changed today; was ${v.address})` : v.address}`,
		`Orders        ${v.orders}, last on ${shortDate(c.placed)}`,
		`Newsletter    ${v.newsletter}`,
		`Last sign-in  ${stampPanel(c.placed + int(r, -40, Math.max(-39, c.open - c.placed - 60)))} · ${v.browser}`
	]);
};

const codesTable = (c: Ctx) => {
	const { v, r } = c;
	const rows = ['| Code | Game | Order | Status | Redeemed by | When |', '| --- | --- | ---: | --- | --- | --- |'];
	if (c.codeState === 'redeemed') rows.push(`| ${v.code} | ${c.game.title} | ${v.order} | redeemed | account ${int(r, 60000, 69999)} (created ${shortDate(c.open - int(r, 1, 4) * DAY)}) | ${v.redeemedWhen} |`);
	else rows.push(`| ${v.code} | ${c.game.title} | ${v.order} | not redeemed | | |`);
	return `Gift codes from order ${v.order}:\n\n${rows.join('\n')}\n\nFailed attempts on this code: ${c.codeState === 'redeemed' ? int(r, 2, 5) : 0}. Failed attempts with similar codes in the last week: ${c.codeState === 'redeemed' ? 0 : int(r, 3, 7)}.`;
};

const errorPage = () => ['What the page says:', '', fence(['Internal Server Error', '', 'Sorry, something went wrong on our side.'])].join('\n');

const traceBlock = (c: Ctx) => {
	const { r } = c;
	const when = c.open - int(r, 10, 400);
	return [
		'From the app server’s error log:',
		'',
		fence([
			`[${iso(when)} ${clock(when)}:${pad(int(r, 0, 59))} +0${at(when).getUTCMonth() === 9 && at(when).getUTCDate() < 25 ? 1 : 0}00] [${int(r, 1100, 9800)}] [ERROR] Error handling request /store/products/${c.url}`,
			'Traceback (most recent call last):',
			'  File "/srv/ashgrove-store/app/web.py", line 61, in handle',
			'    response = self._dispatch(request)',
			'  File "/srv/ashgrove-store/app/web.py", line 71, in _dispatch',
			'    return view(request, **match.groupdict())',
			'  File "/srv/ashgrove-store/app/routes/store.py", line 27, in product_page',
			'    product = db.product(slug)',
			'  File "/srv/ashgrove-store/app/db.py", line 80, in product',
			'    return PRODUCTS[slug]',
			`KeyError: '${c.url}'`
		]),
		'',
		`${int(r, 3, 40)} of these for the same path in the last fortnight.`
	].join('\n');
};

const invoiceBlock = (c: Ctx) => {
	const { v } = c;
	const rate = Number(v.vatRate);
	const school = c.invoiceTo === 'school';
	const licence = v.licence === 'yes';
	// The checkout charged each game once, whatever the quantity.
	const lineTotal = licence ? Math.round((c.game.cents * Number(v.seats)) / 2) : c.game.cents * c.copies;
	const charged = licence ? 0 : c.game.cents;
	const billed = licence || c.invoiceDue ? lineTotal : charged;
	const line = licence ? `Classroom licence, ${c.game.title}, up to ${v.seats} computers` : `${c.copies} × ${c.game.title} at ${euro(c.game.cents)}`;
	return fence([
		`Invoice       AG-2026-${v.invoiceNo}`,
		`Date          ${shortDate(c.now)}`,
		'From          Ashgrove Games Ltd, Galway, Ireland · VAT IE 3812476KH',
		`To            ${school ? v.school : `${v.company}, ${v.companyAddress} · VAT ${v.vatNo}`}`,
		...(licence ? [] : [`Order         ${v.order} of ${shortDate(c.placed)}`]),
		`Line          ${line}    ${euro(lineTotal)}`,
		...(billed < lineTotal ? [`Adjustment    −${euro(lineTotal - billed)} (checkout total; not collected)`] : []),
		`Net           ${euro(billed - vatPart(billed, rate))}`,
		`VAT ${rate}%       ${euro(vatPart(billed, rate))}`,
		`Total         ${euro(billed)}`,
		`Paid          ${charged ? `${euro(charged)} by card on ${shortDate(c.placed)}` : 'nothing yet'}`,
		...(billed > charged ? [`To pay        ${euro(billed - charged)} by bank transfer within 30 days`, 'Bank          IBAN IE29 AIBK 9311 5212 3456 78 · BIC AIBKIE2D'] : [])
	]);
};

const signinsTable = (c: Ctx) => {
	const { v, r } = c;
	const rows = ['| When | What | From | Browser |', '| --- | --- | --- | --- |'];
	let t = c.open - int(r, 3, 9) * DAY;
	const home = `${v.city}, ${v.countryCode}`;
	for (let i = int(r, 2, 4); i > 0; i--) {
		t += int(r, 600, 2400);
		rows.push(`| ${stampPanel(t)} | signed in | ${home} | ${v.browser} |`);
	}
	if (c.signins === 'resets') {
		t = c.open - int(r, 250, 420);
		for (let i = 0; i < 3; i++) {
			t += int(r, 20, 70);
			rows.push(`| ${stampPanel(t)} | password reset requested; email accepted by the receiving server | ${home} | ${v.browser} |`);
		}
	} else if (c.signins === 'foreign') {
		t = c.open - int(r, 60, 180);
		const away = pick(r, ['São Paulo, BR', 'Lagos, NG', 'Jakarta, ID', 'Hanoi, VN', 'Lima, PE']);
		rows.push(`| ${stampPanel(t)} | signed in, new device | ${away} | Chrome 126 |`);
		for (let i = 0; i < 3; i++) {
			t += int(r, 3, 9);
			rows.push(`| ${stampPanel(t)} | order ${orderNo(t) + i} placed | ${away} | Chrome 126 |`);
		}
	}
	return `Sign-ins and account events for account ${v.acct}:\n\n${rows.join('\n')}`;
};

const pasteOf = (c: Ctx, kind: Paste | undefined): string => {
	switch (kind ?? 'none') {
		case 'confirmation':
			return confirmation(c);
		case 'platforms':
			return `Builds on the downloads site today:\n\n${['| Game | Version | Windows | macOS | Linux |', '| --- | --- | --- | --- | --- |', ...shuffle(c.r, games).map((g) => `| ${g.title} | ${g.version} | ${g.gb.toFixed(1)} GB | ${g.mac ? `${(g.gb * 1.04).toFixed(1)} GB` : 'none'} | ${g.mac ? `${(g.gb * 0.97).toFixed(1)} GB` : 'none'} |`)].join('\n')}`;
		case 'order':
			return orderPanel(c);
		case 'history':
			return historyTable(c);
		case 'download':
			return downloadLog(c);
		case 'payment':
			return paymentEvents(c);
		case 'crash':
			return crashLog(c);
		case 'specs':
			return specsBlock(c);
		case 'refund':
			return refundBlock(c);
		case 'account':
			return accountBlock(c);
		case 'codes':
			return codesTable(c);
		case 'error':
			return errorPage();
		case 'trace':
			return traceBlock(c);
		case 'invoice':
			return invoiceBlock(c);
		case 'signins':
			return signinsTable(c);
		default:
			return '';
	}
};

// Numbers that grow with time: orders, so that an older order has a lower number.
const orderNo = (m: number) => 61200 + Math.floor((m / DAY) * 24);

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});

/** Keeps a message inside the hours its writer works; Ashgrove staff work 09:00 to 17:30 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 17 * 60 + 30) m = startOfDay(m) + DAY + 9 * 60 + int(r, 0, 90);
	if (minuteOfDay(m) < 9 * 60) m = startOfDay(m) + 9 * 60 + int(r, 0, 90);
	while (isWeekend(m)) m += DAY;
	return m;
};
const waking = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 23 * 60) m = startOfDay(m) + DAY + 7 * 60 + int(r, 0, 200);
	if (minuteOfDay(m) < 7 * 60) m = startOfDay(m) + 7 * 60 + int(r, 0, 200);
	return m;
};

interface Plan {
	topic: Topic;
	path: Path;
	day: number;
}
const teamOf: Partial<Record<Who, string>> = { w: 'the web team', l: 'the studio', o: 'our operations team', p: 'the payments team', d: 'our data protection lead' };

const ticket = (index: number, plan: Plan, number: number, refs: number[]): string => {
	const r = mulberry32(0x5a17e000 + index * 7919);
	const { topic, path } = plan;
	// Countries in turn, and within a country every name once before any repeats.
	const country = countries[(index * 3) % countries.length]!;
	const nth = Math.floor(index / countries.length);
	const [first] = country.first[nth % country.first.length]!;
	const last = country.last[(nth + Math.floor(nth / country.first.length)) % country.last.length]!;
	const full = `${first} ${last}`;
	const [zip, city] = pick(r, country.towns);
	const address = country.street(r, zip, city);
	let [zip2, city2] = pick(r, country.towns);
	if (city2 === city && r() < 0.6) [zip2, city2] = pick(r, country.towns);
	const newAddress = country.street(r, zip2, city2);
	const email = `${ascii(first)}.${ascii(last)}@${pick(r, providers)}`;
	const local = email.split('@')[0]!;
	const cut = int(r, 1, local.length - 2);
	const typo = `${local.slice(0, cut)}${local.slice(cut + 1)}@${email.split('@')[1]}`;
	const altEmail = `${ascii(first).charAt(0)}${ascii(last)}${int(r, 10, 99)}@${pick(r, providers.filter((p) => !email.endsWith(p)))}`;
	const company = pick(r, companies);
	const oldEmail = `${ascii(first)}.${ascii(last)}@${ascii(company)}.example`;
	const pool = (topic.games ?? slugs(games)).filter((slug) => !path.games || path.games.includes(slug));
	const game = bySlug(pick(r, pool));
	const game2 = bySlug(pick(r, (topic.games2 ?? slugs(games)).filter((slug) => slug !== game.slug)));
	const game3 = pick(r, games.filter((g) => g !== game && g !== game2));
	const device: Device = pick(r, topic.devices ?? (game.mac ? ['windows', 'windows', 'mac', 'linux'] : ['windows']));
	const open = plan.day * DAY + int(r, 7 * 60 + 10, 23 * 60);
	const [lo, hi] = path.bought ?? topic.bought ?? [0, 3];
	const placed = Math.min(open - 40, open - int(r, lo * DAY, hi * DAY + 600));
	const order = orderNo(placed) + int(r, 0, 30);
	const kid = pick(r, kidNames);
	const agent = pick(r, agents);
	const dev = pick(r, webTeam);
	const brand = pick(r, ['Visa', 'Visa', 'Mastercard']);
	const since = String(int(r, 2021, 2024));
	const firstOrder = Math.round((Date.UTC(Number(since), int(r, 0, 8), int(r, 1, 27)) - EPOCH) / 60000) + int(r, 600, 1300);
	const code = (() => {
		const base = giftCode(r).split('');
		base[pick(r, [5, 6, 7, 8, 10, 11, 12, 13])] = 'B';
		return base.join('');
	})();
	const [zip3, city3] = pick(r, country.towns);
	const days = Math.max(0, Math.round((open - placed) / DAY));
	const v: Record<string, string> = {
		name: first,
		full,
		email,
		typo,
		altEmail,
		oldEmail,
		city,
		address,
		newAddress,
		countryCode: country.code,
		vatRate: String(country.vat),
		game: game.title,
		slug: game.slug,
		studio: game.studio,
		studios: game.studio.endsWith('s') ? `${game.studio}’` : `${game.studio}’s`,
		price: euro(game.cents),
		sale: euro(game.sale),
		saleDiff: euro(game.cents - game.sale),
		version: game.version,
		gb: game.gb.toFixed(1),
		pegi: String(game.pegi),
		pegiWhy: game.pegiWhy,
		req: game.req,
		saves: game.saves,
		game2: game2.title,
		studio2: game2.studio,
		game3: game3.title,
		studio3: game3.studio,
		version3: game3.version,
		badslug: `${game.slug}-${pick(r, ['deluxe', 'collectors-edition', 'soundtrack-edition', 'complete'])}`,
		typoslug: game.slug.includes('-') ? game.slug.replace('-', '') : game.slug.replace('ll', 'l'),
		capslug: game.title.replace(/ /g, '-'),
		order: String(order),
		order2: String(order + int(r, 1, 3)),
		acct: String(int(r, 12000, 58000)),
		created: shortDate(firstOrder - int(r, 0, 40) * DAY - int(r, 10, 600)),
		placedDay: days < 6 ? weekday(placed) : dayMonth(placed),
		placedDate: dayMonth(placed),
		placedMonth: monthNames[at(placed).getUTCMonth()]!,
		placedTime: clock(placed + 1),
		daysAgo: String(Math.max(1, days)),
		refundBy: `${weekday(placed + 14 * DAY)} ${dayMonth(placed + 14 * DAY)}`,
		redeemedWhen: stampPanel(placed + int(r, 1, 6) * DAY + int(r, 40, 90)),
		wday: weekday(open - int(r, 1, 3) * DAY),
		day: weekdayFrom(startOfDay(open) + int(r, 2, 4) * DAY),
		hhmm: clock(placed + 5),
		tryDay: days < 1 && at(placed).getUTCDate() === at(open).getUTCDate() ? 'today' : `on ${weekday(placed)}`,
		patchDay: ((m: number) => `${weekday(m)} ${dayMonth(m)}`)(open + int(r, 8, 20) * DAY),
		month: pick(r, ['June', 'July', 'August', 'September']),
		since,
		orders: String(int(r, 4, 9)),
		agent,
		dev,
		brand,
		card: String(int(r, 1000, 9999)),
		bank: pick(r, country.banks),
		payRef: `pay_${giftCode(r).replace(/-/g, '').toLowerCase()}`,
		refundNo: String(int(r, 7000, 9800)),
		invoiceNo: String(int(r, 1400, 2900)),
		kid: kid[0],
		kidRel: kid[1] === 'f' ? pick(r, ['daughter', 'niece', 'granddaughter']) : pick(r, ['son', 'nephew', 'grandson']),
		kidPron: kid[1] === 'f' ? 'she' : 'he',
		kidObj: kid[1] === 'f' ? 'her' : 'him',
		kidPoss: kid[1] === 'f' ? 'her' : 'his',
		age: String(int(r, 8, 14)),
		occasion: pick(r, ['Christmas', `${kid[1] === 'f' ? 'her' : 'his'} birthday`, 'the Halloween holidays']),
		friend: pick(r, friendNames),
		friendRel: pick(r, ['brother', 'sister', 'best friend', 'flatmate', 'cousin', 'colleague']),
		code,
		badCode: code.replace('B', '8'),
		code2: giftCode(r),
		copies: '1',
		extra: '0',
		charged: euro(game.cents),
		total: euro(game.cents),
		diff: euro(0),
		company,
		companyAddress: country.street(r, zip3, city3),
		vatNo: `${country.code === 'AT' ? 'ATU' : country.code}${int(r, 100000000, 999999999)}`,
		deviceName: pick(r, deviceNames[device]),
		platform: { windows: 'Windows', mac: 'macOS', linux: 'Linux', deck: 'the Steam Deck' }[device],
		macos: pick(r, ['Sonoma 14.6', 'Sequoia 15.1', 'Ventura 13.6', 'Sequoia 15.0']),
		distro: device === 'deck' ? 'SteamOS 3.6' : pick(r, ['Fedora 40', 'Ubuntu 24.04', 'Linux Mint 22', 'Arch Linux']),
		browser: pick(r, device === 'mac' ? ['Safari 18', 'Safari 18', 'Firefox 131', 'Chrome 130'] : device === 'windows' ? browsers : ['Firefox 131', 'Firefox 132', 'Chrome 130']),
		pct: String(int(r, 30, 85)),
		gbDone: '',
		hours: String(int(r, 6, 40)),
		pad: pick(r, ['DualSense controller', 'Xbox controller', '8BitDo Pro 2', 'Switch Pro controller']),
		logName: game.engine === 'unity' ? 'Player.log' : game.engine === 'godot' ? `${game.exe.toLowerCase()}.log` : `${game.exe}_crash.txt`,
		logWhere: game.engine === 'unity' ? `your user folder, under AppData\\LocalLow\\${game.studio.split(' ')[0]}\\${game.exe}` : game.engine === 'godot' ? `AppData\\Roaming\\Godot\\app_userdata\\${game.title}\\logs` : 'the folder the game is installed in',
		gpu: '',
		gpuName: '',
		gpuMaker: '',
		gpuDriver: '',
		gpuVram: '',
		driverYear: pick(r, ['2019', '2020']),
		followers: `${int(r, 2, 19)},${int(r, 100, 999)}`,
		outlet: pick(r, outlets),
		channel: `https://video.example/@${ascii(first)}${pick(r, ['plays', 'games', 'cosy', 'puzzles'])}`,
		seats: String(int(r, 18, 32)),
		school: `${city} ${pick(r, ['Community College', 'Secondary School', 'International School', 'Grammar School'])}`,
		pitch: pick(r, pitches),
		newsletter: r() < 0.6 ? `yes, since ${since}` : 'no',
		hotel: 'no',
		badServer: 'no',
		stranger: 'no',
		licence: 'no'
	};
	v.gbDone = ((game.gb * Number(v.pct)) / 100).toFixed(1);
	const c: Ctx = {
		r,
		v,
		game,
		game2,
		device,
		copies: 1,
		pay: 'ok',
		dl: 'complete',
		crash: 'driver',
		spec: 'strong',
		url: game.slug,
		codeState: 'fresh',
		twoOrders: false,
		refund: { cents: game.cents, what: `${game.title} × 1`, reason: 'requested', revoke: true },
		signins: 'plain',
		orderEmail: email,
		accountEmail: email,
		addressChanged: false,
		altAccount: false,
		invoiceTo: 'company',
		invoiceDue: false,
		placed,
		open,
		firstOrder,
		now: open,
		firstDl: placed + (r() < 0.7 ? int(r, 2, 40) : int(r, 300, Math.max(301, Math.min(open - placed - 10, 3 * DAY))))
	};
	topic.prep?.(c);
	path.prep?.(c);
	// Facts that follow from what the topic and path set.
	if (c.copies > 1) {
		v.copies = String(c.copies);
		v.extra = String(c.copies - 1);
		v.total = euro(game.cents * c.copies);
		v.diff = euro(game.cents * (c.copies - 1));
	}
	if (c.crash !== 'glibc' && c.crash !== 'vulkan') {
		const [gpu, maker, driver, vram] = pick(r, gpus[c.crash === 'gpu' ? 'gpu' : c.crash === 'bug' ? 'bug' : 'driver']);
		Object.assign(v, { gpuName: gpu, gpu: gpu.replace('(R)', ''), gpuMaker: maker, gpuDriver: driver, gpuVram: vram });
	}
	let t = open;
	const f = (text: string) => {
		c.now = t;
		return fill(text, v)
			.split('\n')
			.map((line) => (/^@\w+$/.test(line) ? pasteOf(c, line.slice(1) as Paste) : line))
			.join('\n');
	};

	// The thread.
	const messages: string[] = [];
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		a: `**${agent} (Ashgrove support)**`,
		n: `**${agent} (Ashgrove support)** · internal note`,
		w: `**${dev} (web team)** · internal note`,
		p: `**${payments} (payments)** · internal note`,
		P: `**${payments} (payments)**`,
		d: `**${dpo} (data protection)** · internal note`,
		D: `**${dpo} (data protection)**`,
		l: `**${liaison} (studio relations)** · internal note`,
		L: `**${liaison} (studio relations)**`,
		o: `**${ops} (operations)** · internal note`,
		s: '**Help desk**'
	};
	const signers: Partial<Record<Who, string>> = { a: agent, P: payments.split(' ')[0]!, D: dpo.split(' ')[0]!, L: liaison.split(' ')[0]! };
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
		const fitting = greetings.filter((greeting) => (minuteOfDay(t) < 12 * 60 || !greeting.includes('morning')) && (minuteOfDay(t) >= 17 * 60 || !greeting.includes('evening')));
		if (r() < (opening ? 0.85 : 0.6)) parts.push(`${pick(r, opening ? fitting : fitting.slice(0, 3))},`);
		parts.push(...paragraphs, f(pick(r, opening ? custSign.filter((sign) => !form || !sign.includes('phone')) : custSign.slice(0, 4))));
		return parts.join('\n\n');
	};
	const pendingSide: string[] = [];
	const staffBody = (who: Who, paragraphs: string[], more = false) => {
		const extra = who === 'a' ? pendingSide.splice(0) : [];
		const closing = more && r() < 0.5 ? [pick(r, closings)] : [];
		const hello = [`Hi ${first},`, `Hello ${first},`, `Hi ${first},`, `Dear ${first},`];
		return [...(/^(Hello|Hi|Dear) /.test(paragraphs[0]!) ? [] : [pick(r, hello)]), ...paragraphs, ...extra, ...closing, fill(pick(r, agentSign), { signer: signers[who]! })].join('\n\n');
	};

	const form = r() < 0.3;

	// 1. The customer writes in.
	const tangent = r() < 0.45 ? pick(r, tangents) : undefined;
	// Someone who never had an account says nothing about being a customer.
	const outsider = v.stranger === 'yes';
	const opening = [f(pick(r, path.open ?? topic.open))];
	if (!outsider && r() < 0.5) opening.unshift(f(pick(r, intros)));
	if (!outsider && r() < 0.5) opening.splice(opening.length - 1, 0, f(pick(r, contexts)));
	const more = shuffle(r, topic.more);
	const told = r() < 0.35 ? 2 : r() < 0.9 ? 1 : 0;
	opening.push(...more.slice(0, told).map(f));
	if (r() < 0.5) opening.push(f(pick(r, situations)));
	if (tangent) opening.push(f(tangent[0]));
	if (topic.shows) opening.push(pasteOf(c, topic.shows));
	// The order email, pasted by customers who have it.
	const hasEmail = !topic.noOrder && !topic.quiet && c.orderEmail === email && path.lookPaste !== 'payment';
	const pasteEmail = hasEmail && r() < 0.55 ? (r() < 0.65 ? 'opening' : 'answer') : '';
	if (pasteEmail === 'opening') opening.push(`${pick(r, ['Here’s the order email:', 'This is the email I got:', 'The order email, in case it helps:', 'Pasting the confirmation below.'])}\n\n${pasteOf(c, 'confirmation')}`);
	say('c', form ? [`Name: ${full}`, `Email: ${email}`, `Order number (optional): ${topic.noOrder || r() < 0.4 ? '' : v.order}`, `Subject: ${'{subject}'}`, '', custBody(opening, true)].join('\n') : custBody(opening, true));

	// 2. Support asks.
	advance('a');
	const ask = f(pick(r, path.ask ?? topic.ask));
	const ack = /^(Thanks|Sorry|Thank you|Of course|Good|Happy|What|That|Oh|I’m sorry)/.test(ask) ? '' : pick(r, acks);
	say('a', staffBody('a', [[ack, ask].filter(Boolean).join(' '), ...(tangent ? [f(tangent[1])] : [])], true));

	// 3. The customer answers, and may raise a second matter.
	advance('c');
	const side = !outsider && r() < 0.8 ? pick(r, sides) : undefined;
	const asked = [side];
	const answer = [...(r() < 0.4 ? [pick(r, replyNotes)] : []), f(pick(r, path.detail)), pasteOf(c, path.paste)].filter(Boolean);
	// A detail the customer left out of the first message.
	if (more[told] && r() < 0.45) answer.splice(answer.length - (path.paste ? 1 : 0), 0, f(more[told]!));
	if (pasteEmail === 'answer') answer.push(`${pick(r, ['I’ve found the order email:', 'Here’s the confirmation I got:', 'The order email says:'])}\n\n${pasteOf(c, 'confirmation')}`);
	const unsubscribe = (asked: { q: string }) => {
		if (asked.q.includes('newsletter')) v.newsletter = 'no';
	};
	if (side) {
		unsubscribe(side);
		answer.push(f(side.q));
		pendingSide.push(f(side.a));
		// Now and then a third matter, when the first message had no aside.
		const third = !tangent && r() < 0.35 ? shuffle(r, sides).find((other) => other !== side) : undefined;
		if (third) asked.push(third);
		if (third) unsubscribe(third), answer.push(f(third.q)), pendingSide.push(f(third.a));
	}
	say('c', custBody(answer, false));

	// 3b. Before changing anything on an order, support may check who it is talking to.
	if (topic.checks && r() < 0.65) {
		const [question, answers] = pick(r, checks);
		advance('a');
		say('a', staffBody('a', [f(question)], false));
		advance('c');
		say('c', custBody([f(pick(r, answers))], false));
	}

	// 4. Someone looks; a holding reply comes first when another team does the looking.
	const lookWho = path.lookWho ?? 'n';
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'a');
	const second = shuffle(r, sides).find((other) => !asked.includes(other))!;
	const chase = () => {
		t += int(r, 1500, 3800);
		advance('c');
		const raise = !outsider && answered && r() < 0.65;
		say('c', custBody([f(pick(r, chasers)), ...(r() < 0.4 ? [f(pick(r, situations))] : []), ...(raise ? [f(second.q)] : [])], false));
		if (raise) unsubscribe(second), pendingSide.push(f(second.a));
	};
	const team = path.team ?? teamOf[lookWho];
	const hold = (team && r() < 0.8) || (pendingSide.length && !answered);
	const holdingReply = () => {
		advance('a');
		held = true;
		say('a', staffBody('a', [fill(pick(r, holding), { ...v, team: team ?? 'the right people' })], true));
		if (r() < 0.6) chase();
	};
	if (hold && lookWho !== 'n') holdingReply();
	advance(lookWho);
	const lookPaste = path.lookPaste ?? (topic.noOrder ? 'none' : 'order');
	const seeAlso = refs.length && lookWho !== 'd' && r() < 0.55 ? `${pick(r, ['Similar recently:', 'See also', 'Same thing in'])} ${refs.map((ref) => `ticket ${ref}`).join(', ')}.` : '';
	// Other panels support looked at on the way, for tickets about an order.
	const extras: string[] = [];
	if (!topic.noOrder) {
		const shown = new Set<string>([lookPaste, path.paste ?? '', ...path.ends.flat().flatMap(([, body]) => (body.match(/@\w+/g) ?? []).map((name) => name.slice(1)))]);
		const candidates: [Paste, number][] = [['order', 0.8], ['account', 0.55], ['history', 0.4], ['download', c.dl === 'unused' ? 0 : 0.35], ['payment', c.pay === 'ok' ? 0.3 : 0]];
		for (const [kind, chance] of shuffle(r, candidates)) if (extras.length < 3 && !shown.has(kind) && r() < chance) extras.push(kind === 'account' ? `Account ${v.acct}:\n\n${pasteOf(c, kind)}` : pasteOf(c, kind));
	}
	say(lookWho, [f(pick(r, path.look)), seeAlso, pasteOf(c, lookPaste), ...extras].filter(Boolean).join('\n\n'));

	// 5. Sometimes a wait; always when the second matter would otherwise go unanswered.
	if (hold && lookWho === 'n') holdingReply();
	else if (!hold && r() < 0.45) chase();

	// 6. The end.
	const thanks = side?.then && r() < 0.6 ? f(side.then) : '';
	end.forEach(([who, body], i) => {
		advance(who);
		const text = f(body);
		if (who === 'c') say('c', custBody(i === end.length - 1 && thanks ? [text, thanks] : [text], false));
		else if (signers[who]) say(who, staffBody(who, [text]));
		else say(who, text);
	});
	if (path.happy && r() < 0.6) {
		advance('s');
		const [rating, comment] = pick(r, surveys);
		say('s', `Satisfaction survey answered: ${rating}.${comment ? ` “${f(comment)}”` : ''}`);
	}

	const subject = f(pick(r, path.subjects ?? topic.subjects));
	messages[0] = messages[0]!.replace('{subject}', subject);
	const channel = form ? 'through the contact form' : 'by email';
	return [`# Ticket ${number}: ${subject}`, `From ${full} <${email}> · ${stampLong(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each ticket follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two tickets on one topic end differently until its paths run out.
const order = mulberry32(20261001);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
const DAYS = 44; // 1 October to 13 November
for (let index = 0; index < ITEMS; index++) {
	if (!deck.length) deck.push(...shuffle(order, topics));
	const topic = deck.shift()!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	plans.push({ topic, path: topic.paths[(seen + topics.indexOf(topic)) % topic.paths.length]!, day: Math.floor((index * DAYS) / ITEMS) });
}

const folder = join(root, 'docs', 'support-tickets');
mkdirSync(folder, { recursive: true });
let number = 31840;
const numbers = plans.map(() => (number += int(order, 1, 4)));
plans.forEach((plan, index) => {
	// Up to three recent tickets on the same matter, for the internal notes.
	const refs = numbers.filter((_, i) => i < index && plans[i]!.topic === plan.topic && index - i < 40).slice(-3);
	writeFileSync(join(folder, `ticket-${numbers[index]}.md`), ticket(index, plan, numbers[index]!, refs));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets, 1 October to 13 November 2026\n\nThe ${ITEMS} tickets the support desk handled in these six weeks, one file each, exported from the old help desk\nbefore the move. The export kept the messages and internal notes but not the tags, statuses or assignees.\nNumbers missing from the sequence were spam or were merged into another ticket. Back-office panels, logs and\nprovider events in internal notes are as support pasted them.\n`
);
