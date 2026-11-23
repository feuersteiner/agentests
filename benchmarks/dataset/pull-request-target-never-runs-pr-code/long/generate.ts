// Writes the long material of this entry's long task: every issue that was open on spanwise's GitHub tracker when it
// was exported on 21 November 2026, one Markdown file each with its first post and whole discussion, under
// docs/issues/. The export kept no labels, assignees, milestones or states. Deterministic: fixed seeds, no clock,
// no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many issues to write. Dates, issue numbers and each topic's share all follow from it. */
const ITEMS = 222;

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
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
const fence = (lang: string, body: string) => '```' + lang + '\n' + body.replace(/\n+$/, '') + '\n```';

// Time is kept in days since 1 January 2024 (UTC).
const BASE = Date.UTC(2024, 0, 1);
const dayOf = (iso: string) => {
	const [y, m, d] = iso.split('-').map(Number);
	return Math.round((Date.UTC(y!, m! - 1, d!) - BASE) / 86400000);
};
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const asDate = (day: number) => new Date(BASE + day * 86400000);
const longDate = (day: number) => `${asDate(day).getUTCDate()} ${monthNames[asDate(day).getUTCMonth()]} ${asDate(day).getUTCFullYear()}`;
const FIRST_DAY = dayOf('2024-03-12');
const LAST_OPEN = dayOf('2026-11-18');
const END = dayOf('2026-11-20');

// spanwise's releases. The CHANGELOG lists only 0.6.0 and 0.6.1; the earlier ones are known from the tracker.
const releases: [string, number][] = [
	['0.1.0', dayOf('2024-03-04')],
	['0.2.0', dayOf('2024-06-17')],
	['0.3.0', dayOf('2024-11-05')],
	['0.4.0', dayOf('2025-03-10')],
	['0.5.0', dayOf('2025-08-25')],
	['0.5.1', dayOf('2025-12-01')],
	['0.6.0', dayOf('2026-09-14')],
	['0.6.1', dayOf('2026-10-30')]
];
const versionAt = (day: number) => releases.filter(([, d]) => d <= day).at(-1)![0];
const releaseDay = (name: string) => releases.find(([n]) => n === name)![1];
const before = (name: string) => releases[releases.findIndex(([n]) => n === name) - 1]![0];

// What spanwise 0.6.1 does, as in src/index.js, so that pasted sessions show what the library really returns.
const UNITS: [string, number][] = [['d', 86_400_000], ['h', 3_600_000], ['m', 60_000], ['s', 1_000], ['ms', 1]];
const UNIT_MS: Record<string, number> = Object.fromEntries(UNITS);
interface FormatOptions { largest?: number; ms?: boolean }
const formatSpan = (span: number, options: FormatOptions = {}): string | Error => {
	if (!Number.isFinite(span)) return new TypeError('format expects a finite number');
	const largest = options.largest ?? Infinity;
	const sign = span < 0 ? '-' : '';
	let rest = Math.abs(Math.round(span));
	const parts: string[] = [];
	for (const [unit, size] of UNITS) {
		if (unit === 'ms' && !options.ms) break;
		if (parts.length > largest) break;
		const count = Math.floor(rest / size);
		rest -= count * size;
		if (count > 0) parts.push(`${count}${unit}`);
	}
	return sign + parts.join(' ');
};
const parseSpan = (text: string): number | Error => {
	let total = 0;
	for (const word of text.trim().split(/\s+/)) {
		const match = /^(\d+)(ms|d|h|m|s)$/.exec(word);
		if (!match) return new SyntaxError(`invalid duration: "${text}"`);
		total += Number(match[1]) * UNIT_MS[match[2]!]!;
	}
	return total;
};
type Call = ['parse', string] | ['format', number, FormatOptions?];
const optionsText = (o?: FormatOptions) =>
	!o || Object.keys(o).length === 0 ? '' : `, { ${Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ')} }`;
const callText = (call: Call) =>
	call[0] === 'parse' ? `parse('${call[1]}')` : `format(${call[1]}${optionsText(call[2])})`;
const run = (call: Call) => (call[0] === 'parse' ? parseSpan(call[1]) : formatSpan(call[1], call[2]));
const shown = (value: string | number | Error) =>
	value instanceof Error ? `${value.name}: ${value.message}` : typeof value === 'string' ? `'${value}'` : String(value);

// People. The two maintainers, and everyone else who opens or comments on issues.
const LEAD = 'marta-kowal';
const CO = 'dbrennan';
const users = [
	'priyanka-v', 'jonas-ek', 'bfaulkner', 'chenwei-dev', 'lauramoss', 'a-tkachenko', 'obi-nwosu', 'rafa-mendes', 'gwen-hughes',
	'miko-lehtinen', 'samir-haddad', 'ellafitz', 'kofi-boateng', 'hannah-dk', 'minh-nguyen', 'r-ostrowski', 'leomarquez',
	'aisling-b', 'tomas-cerny', 'farid-k', 'zoe-whitaker', 'ingo-baumann', 'anya-petrova', 'matteo-dev', 'keiko-ito',
	'pablo-ruiz', 'svenholm', 'amara-n', 'jbouchard', 'lin-yifan', 'oscar-dahl', 'ruth-adebayo', 'mateus-lima', 'clara-vogt',
	'ibrahim-s', 'jess-kerr', 'ravi-menon', 'noor-ali', 'felixbrandt', 'tamara-j', 'hugo-lefevre', 'sunita-p', 'eamon-g',
	'vera-novak', 'maxschreiber', 'ama-owusu', 'kenji-mori', 'louisa-h', 'dmitri-v', 'carmen-ortiz', 'nils-andersson',
	'yusuf-demir', 'fern-oakley', 'theo-blanc', 'wanjiru-k', 'grzegorz-p', 'isla-mcrae', 'tariq-h', 'beatriz-s', 'otto-r'
];
const homeOf = (handle: string) => handle.replace(/-.*$/, '').replace(/[^a-z]/g, '') || 'dev';

// Where reporters use spanwise. Each project has a line of code with parse and one with format.
interface Project { what: string; src: string; dir: string; file: string; parse: string; format: string }
const projects: Project[] = [
	{ what: 'a terminal pomodoro timer', src: 'command-line arguments', dir: 'tomato-cli', file: 'src/cli.js',
		parse: "import { parse } from 'spanwise';\n\nconst [work = '25m', rest = '5m'] = process.argv.slice(2);\nconst rounds = [work, rest].map((text) => parse(text));\nstartTimer(rounds);",
		format: "import { format } from 'spanwise';\n\nfunction render(remaining) {\n  process.stdout.write(`\\r${format(remaining)} left   `);\n}" },
	{ what: 'a job queue worker', src: 'a YAML file the operations team edits by hand', dir: 'queue-worker', file: 'src/config.js',
		parse: "import { readFileSync } from 'node:fs';\nimport YAML from 'yaml';\nimport { parse } from 'spanwise';\n\nconst config = YAML.parse(readFileSync('queue.yml', 'utf8'));\nfor (const job of config.jobs) {\n  job.retryDelay = parse(job.retry_delay);\n  job.timeout = parse(job.timeout ?? '30s');\n}",
		format: "import { format } from 'spanwise';\n\nworker.on('done', (job) => {\n  log.info(`job ${job.id} finished in ${format(Date.now() - job.startedAt)}`);\n});" },
	{ what: 'a podcast player', src: 'the episode metadata in our CMS', dir: 'podshelf', file: 'src/components/EpisodeLength.jsx',
		parse: "import { parse } from 'spanwise';\n\nexport function toEpisode(entry) {\n  return { ...entry, durationMs: parse(entry.length) };\n}",
		format: "import { format } from 'spanwise';\n\nexport function EpisodeLength({ episode }) {\n  return <span className=\"length\">{format(episode.durationMs, { largest: 2 })}</span>;\n}" },
	{ what: 'a reminder bot for our team chat', src: 'chat messages', dir: 'nudge-bot', file: 'src/commands/remind.js',
		parse: "import { parse } from 'spanwise';\n\nbot.command('remind', async (ctx, args) => {\n  const [when, ...words] = args;\n  const delay = parse(when);\n  await schedule(ctx.user, Date.now() + delay, words.join(' '));\n});",
		format: "import { format } from 'spanwise';\n\nawait ctx.reply(`OK, I will remind you in ${format(delay)}.`);" },
	{ what: 'a time-tracking and invoicing tool', src: 'a timesheet CSV that freelancers fill in', dir: 'hourglass', file: 'lib/timesheet.js',
		parse: "import { parse } from 'spanwise';\n\nconst rows = csv.parse(text, { columns: true });\nconst billable = rows.reduce((sum, row) => sum + parse(row.time_spent), 0);",
		format: "import { format } from 'spanwise';\n\nfor (const task of tasks) {\n  invoice.lines.push({ label: task.name, time: format(task.ms, { largest: 2 }) });\n}" },
	{ what: 'a log analyser', src: 'command-line flags', dir: 'logsift', file: 'bin/logsift.js',
		parse: "import { parse } from 'spanwise';\n\nconst window = parse(flags.window ?? '15m');\nconst cutoff = Date.now() - window;",
		format: "import { format } from 'spanwise';\n\nfor (const [route, stats] of byRoute) {\n  console.log(route.padEnd(40), format(stats.p95, { ms: true }));\n}" },
	{ what: 'a workout log', src: 'a form field where people type how long they trained', dir: 'liftlog', file: 'src/forms/workout.js',
		parse: "import { parse } from 'spanwise';\n\nform.addEventListener('submit', (event) => {\n  event.preventDefault();\n  saveWorkout({ ...draft, durationMs: parse(form.elements.duration.value) });\n});",
		format: "import { format } from 'spanwise';\n\ncard.querySelector('.duration').textContent = format(workout.durationMs);" },
	{ what: 'a home automation hub', src: 'rules that people write in a small text format', dir: 'hearthstone-rules', file: 'src/rules.js',
		parse: "import { parse } from 'spanwise';\n\n// \"turn off hallway after 15m\"\nconst [, device, delay] = /^turn off (\\S+) after (.+)$/.exec(rule);\nsetTimeout(() => turnOff(device), parse(delay));",
		format: "import { format } from 'spanwise';\n\nstatus.set(device, `off in ${format(deadline - Date.now())}`);" },
	{ what: 'an API server', src: 'environment variables', dir: 'orders-api', file: 'src/settings.js',
		parse: "import { parse } from 'spanwise';\n\nexport const settings = {\n  cacheTtl: parse(process.env.CACHE_TTL ?? '10m'),\n  rateWindow: parse(process.env.RATE_WINDOW ?? '1m'),\n};",
		format: "import { format } from 'spanwise';\n\nlogger.warn(`rate limited ${ip}, retry in ${format(wait)}`);" },
	{ what: 'a speedrun timer', src: 'a settings screen', dir: 'splitstream', file: 'src/splits.js',
		parse: "import { parse } from 'spanwise';\n\nconst goal = parse(settings.goal); // e.g. \"1h 12m 30s\"",
		format: "import { format } from 'spanwise';\n\nsplits.forEach((split, i) => {\n  rows[i].textContent = `${split.name}  ${format(split.time, { ms: true })}`;\n});" },
	{ what: 'an online course platform', src: 'lesson metadata that instructors write', dir: 'coursekit', file: 'src/lessons.js',
		parse: "import { parse } from 'spanwise';\n\nlesson.length = parse(frontmatter.length);",
		format: "import { format } from 'spanwise';\n\ncard.meta = `${format(lesson.length, { largest: 2 })} · ${lesson.level}`;" },
	{ what: 'a static site generator', src: 'a config option', dir: 'quire', file: 'src/build.js',
		parse: "import { parse } from 'spanwise';\n\nconst debounce = parse(options.watchDebounce ?? '200ms');",
		format: "import { format } from 'spanwise';\n\nconsole.log(`Built ${pages.length} pages in ${format(performance.now() - started)}`);" },
	{ what: 'a kitchen timer web app', src: 'a text box next to the start button', dir: 'egg-timer', file: 'src/timer.js',
		parse: "import { parse } from 'spanwise';\n\nstartButton.onclick = () => timer.start(parse(input.value.trim()));",
		format: "import { format } from 'spanwise';\n\ndisplay.textContent = format(timer.remaining) || 'done';" },
	{ what: 'an uptime dashboard', src: 'alert rules in a JSON file', dir: 'pulseboard', file: 'src/alerts.js',
		parse: "import { parse } from 'spanwise';\n\nfor (const rule of rules) rule.forMs = parse(rule.for ?? '5m');",
		format: "import { format } from 'spanwise';\n\ncell.textContent = format(check.downtimeMs, { largest: 2 });" }
];

// Pasted output. Everything here is made from what spanwise really does.
const nodeAt = (r: Rand, day: number) => {
	if (day < dayOf('2024-10-29')) return pick(r, ['v18.19.1', 'v20.11.1', 'v20.12.2', 'v21.7.1', 'v20.15.0']);
	if (day < dayOf('2025-05-06')) return pick(r, ['v20.18.0', 'v22.11.0', 'v22.12.0', 'v23.3.0', 'v22.13.1']);
	if (day < dayOf('2026-01-01')) return pick(r, ['v22.14.0', 'v22.17.1', 'v24.4.1', 'v22.20.0', 'v24.11.0']);
	return pick(r, ['v22.22.0', 'v24.12.0', 'v24.13.1', 'v26.1.0', 'v24.14.0', 'v22.21.1']);
};
const npmFor = (node: string) => (Number(node.slice(1).split('.')[0]) >= 24 ? '11.6.2' : node.startsWith('v18') ? '10.2.4' : '10.9.2');
interface Machine { os: string; short: string; windows: boolean; cpu: string; memory: string }
const machines: Machine[] = [
	{ os: 'macOS 15.1', short: 'macOS 15 on an M3', windows: false, cpu: '(8) arm64 Apple M3', memory: '1.12 GB / 16.00 GB' },
	{ os: 'macOS 14.6.1', short: 'macOS 14 (Intel)', windows: false, cpu: '(12) x64 Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz', memory: '412.30 MB / 16.00 GB' },
	{ os: 'Linux 6.8 Ubuntu 24.04.1 LTS 24.04.1 LTS (Noble Numbat)', short: 'Ubuntu 24.04', windows: false, cpu: '(16) x64 AMD Ryzen 7 7840U w/ Radeon 780M Graphics', memory: '21.34 GB / 30.66 GB' },
	{ os: 'Linux 6.1 Debian GNU/Linux 12 (bookworm)', short: 'Debian 12 in Docker', windows: false, cpu: '(4) x64 Intel(R) Xeon(R) Platinum 8259CL CPU @ 2.50GHz', memory: '2.91 GB / 7.63 GB' },
	{ os: 'Linux 6.11 Fedora Linux 41 (Workstation Edition)', short: 'Fedora 41', windows: false, cpu: '(8) x64 11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz', memory: '9.80 GB / 15.36 GB' },
	{ os: 'Windows 11 10.0.26100', short: 'Windows 11', windows: true, cpu: '(16) x64 AMD Ryzen 9 5900HX with Radeon Graphics', memory: '17.02 GB / 31.86 GB' },
	{ os: 'Windows 10 10.0.19045', short: 'Windows 10', windows: true, cpu: '(4) x64 Intel(R) Core(TM) i5-7300U CPU @ 2.60GHz', memory: '3.21 GB / 7.88 GB' },
	{ os: 'macOS 26.1', short: 'macOS 26', windows: false, cpu: '(10) arm64 Apple M4', memory: '2.40 GB / 24.00 GB' }
];
interface Env { node: string; npm: string; machine: Machine; home: string; dir: string; ver: string }
const envBlock = (r: Rand, env: Env) => {
	const { node, npm, machine, ver } = env;
	const style = int(r, 0, 3);
	if (style === 0) return `- spanwise ${ver}\n- Node ${node}\n- ${machine.short}\n- npm ${npm}`;
	if (style === 1) return `spanwise ${ver}, Node ${node}, ${machine.short}.`;
	const binDir = machine.windows ? 'C:\\Program Files\\nodejs' : `~/.nvm/versions/node/${node}/bin`;
	const sep = machine.windows ? '\\' : '/';
	return fence(
		'',
		`  System:\n    OS: ${machine.os}\n    CPU: ${machine.cpu}\n    Memory: ${machine.memory}\n  Binaries:\n` +
			`    Node: ${node.slice(1)} - ${binDir}${sep}node${machine.windows ? '.EXE' : ''}\n    npm: ${npm} - ${binDir}${sep}npm${machine.windows ? '.CMD' : ''}\n` +
			`  npmPackages:\n    spanwise: ^${ver} => ${ver}`
	);
};
const pathIn = (env: Env, rest: string) =>
	env.machine.windows ? `file:///C:/Users/${env.home}/code/${env.dir}/${rest}` : `file:///home/${env.home}/${env.dir}/${rest}`;
const fsPath = (env: Env, rest: string) =>
	env.machine.windows ? `C:\\Users\\${env.home}\\code\\${env.dir}\\${rest.replace(/\//g, '\\')}` : `/home/${env.home}/${env.dir}/${rest}`;
const SOURCE_LINE: Record<string, [number, string, number]> = {
	parse: [38, '    if (!match) throw new SyntaxError(`invalid duration: "${text}"`);', 16],
	format: [18, "  if (!Number.isFinite(span)) throw new TypeError('format expects a finite number');", 30]
};
const internals = (r: Rand) =>
	`    at ModuleJob.run (node:internal/modules/esm/module_job:${int(r, 230, 280)}:25)\n` +
	`    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:${int(r, 480, 560)}:26)\n` +
	`    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:${int(r, 110, 130)}:5)`;
/** A script that dies on the call, as the terminal shows it. */
const stackPaste = (r: Rand, env: Env, call: Call, script: string) => {
	const fn = call[0];
	const [line, source, column] = SOURCE_LINE[fn]!;
	const error = run(call);
	const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Error';
	const lib = pathIn(env, 'node_modules/spanwise/src/index.js');
	return fence(
		'console',
		`$ node ${script}\n${lib}:${line}\n${source}\n${' '.repeat(column)}^\n\n${message}\n` +
			`    at ${fn} (${lib}:${line}:${column + 7})\n` +
			`    at ${pick(r, ['loadSettings', 'readRules', 'toEpisode', 'Command.handler', 'parseRow', 'render', 'main'])} (${pathIn(env, script)}:${int(r, 4, 60)}:${int(r, 9, 40)})\n` +
			`${internals(r)}\n\nNode.js ${env.node}`
	);
};
/** A short Node REPL session that runs the calls. */
const replPaste = (r: Rand, env: Env, calls: Call[]) => {
	const style = int(r, 0, 2);
	if (style === 2) {
		const lines = calls.map((call) => {
			const value = run(call);
			return value instanceof Error ? `${callText(call)}  // throws ${value.name}: ${value.message}` : `${callText(call)}  // ${shown(value)}`;
		});
		return fence('js', `import { format, parse } from 'spanwise';\n\n${lines.join('\n')}`);
	}
	const out: string[] = [];
	if (style === 0) out.push('$ node', `Welcome to Node.js ${env.node}.`, 'Type ".help" for more information.');
	out.push("> const { format, parse } = await import('spanwise')", 'undefined');
	for (const call of calls) {
		const value = run(call);
		out.push(`> ${callText(call)}`);
		if (value instanceof Error) {
			out.push(`Uncaught ${value.name}: ${value.message}`);
			if (chance(r, 0.5)) {
				const [line, , column] = SOURCE_LINE[call[0]]!;
				out.push(`    at ${call[0]} (${pathIn(env, 'node_modules/spanwise/src/index.js')}:${line}:${column + 7})`);
			}
		} else out.push(shown(value));
	}
	return fence('console', out.join('\n'));
};
/** The project's own code around the call. */
const snippetPaste = (project: Project, fn: 'parse' | 'format') => fence(project.file.endsWith('.jsx') ? 'jsx' : 'js', project[fn]);

// The fixture's tests, as `npm test` lists them, for a contributor's run with one extra test.
const fixtureTests = (ver: string) => [
	['format', 'formats hours and minutes'],
	['format', 'skips empty units'],
	...(ver >= '0.6.0' ? [['format', 'shows milliseconds only when asked']] : []),
	['format', 'keeps the sign of a negative span'],
	['format', 'rejects a non-finite span'],
	['parse', 'parses each unit'],
	['parse', 'adds parts separated by spaces'],
	['parse', ver >= '0.6.1' ? 'rejects an empty string and unknown units' : 'rejects unknown units'],
	['parse', 'reads back what format writes']
];
const ms = (r: Rand) => `${(r() * 1.4 + 0.05).toFixed(int(r, 3, 4))}ms`;
const testPaste = (r: Rand, env: Env, file: 'format' | 'parse', name: string, actual: string | number | Error, expected: string) => {
	const tests = fixtureTests(env.ver);
	const at = tests.filter(([f]) => f === file).length + (file === 'format' ? 0 : tests.filter(([f]) => f === 'format').length);
	tests.splice(at, 0, [file, name]);
	const lines = tests.map(([, n]) => (n === name ? `✖ ${n} (${ms(r)})` : `✔ ${n} (${ms(r)})`));
	let text = `$ npm test\n\n> spanwise@${env.ver} test\n> node --test\n\n${lines.join('\n')}\n`;
	text += `ℹ tests ${tests.length}\nℹ suites 0\nℹ pass ${tests.length - 1}\nℹ fail 1\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms ${(40 + r() * 30).toFixed(5)}`;
	const line = int(r, 24, 40);
	const failure =
		actual instanceof Error
			? `  ${actual.name}: ${actual.message}\n      at ${file} (${pathIn(env, 'src/index.js')}:${SOURCE_LINE[file]![0]}:${SOURCE_LINE[file]![2] + 7})`
			: `  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n  ${shown(actual)} !== ${expected}\n`;
	text += `\n\n✖ failing tests:\n\ntest at test/${file}.test.js:${line}:1\n✖ ${name} (${ms(r)})\n${failure}\n`;
	text += `      at TestContext.<anonymous> (${pathIn(env, `test/${file}.test.js`)}:${line + 1}:10)\n      at Test.runInAsyncScope (node:async_hooks:211:14)\n      at Test.run (node:internal/test_runner/test:${int(r, 930, 990)}:25)`;
	return fence('console', text);
};
const benchCases = ['format(90061000)', 'format(90061000, { largest: 2 })', "parse('1d 1h 1m 1s')", "parse('250ms')"];
const longDecimal = (r: Rand, base: number) => (base * (0.8 + r() * 0.4)).toFixed(int(r, 6, 11)).replace(/0+$/, '');
const benchPaste = (r: Rand, env: Env, runs: number) => {
	const out: string[] = [`$ npm run bench`, '', `> spanwise@${env.ver} bench`, '> node bench/run.js', ''];
	for (let i = 0; i < runs; i++) {
		if (i > 0) out.push('', '$ npm run bench --silent', '');
		out.push('| Case | ops/sec |', '| --- | ---: |');
		const bases = [6_300_000, 5_900_000, 2_800_000, 9_100_000].map((b) => b * (env.machine.cpu.includes('Apple') ? 1.35 : 1));
		benchCases.forEach((name, j) => out.push(`| \`${name}\` | ${longDecimal(r, bases[j]!)} |`));
	}
	return fence('console', out.join('\n'));
};
const lintPaste = (r: Rand, env: Env) => {
	const files: [string, number][] = [['src\\index.js', 43], ['test\\format.test.js', 23], ['test\\parse.test.js', 25], ...(env.ver >= '0.6.0' ? [['bench\\run.js', 25] as [string, number]] : [])];
	const out = [`PS C:\\Users\\${env.home}\\code\\spanwise> npm run lint`, '', `> spanwise@${env.ver} lint`, '> node scripts/lint.js', ''];
	let shownLines = 0;
	let total = 0;
	for (const [file, lines] of files) {
		total += lines;
		for (let line = 1; line <= lines; line++) if (shownLines < int(r, 9, 16)) { out.push(`${file}:${line}  trailing whitespace`); shownLines++; }
	}
	out.push(`... (${total + 61 - shownLines} more lines like these)`);
	return fence('console', out.join('\n'));
};
const tscPaste = (r: Rand, env: Env) => {
	const file = pick(r, ['src/lib/time.ts', 'src/utils/duration.ts', 'app/timers.ts', 'src/config.ts']);
	return fence(
		'console',
		`$ npx tsc --noEmit\n${file}:1:34 - error TS7016: Could not find a declaration file for module 'spanwise'. '${fsPath(env, 'node_modules/spanwise/src/index.js')}' implicitly has an 'any' type.\n` +
			"  Try `npm i --save-dev @types/spanwise` if it exists or add a new declaration (.d.ts) file containing `declare module 'spanwise';`\n\n" +
			"1 import { format, parse } from 'spanwise';\n                                   ~~~~~~~~~~\n\n\nFound 1 error in " + `${file}:1\n`
	);
};
const requirePaste = (r: Rand, env: Env) => {
	const lib = fsPath(env, 'node_modules/spanwise/src/index.js');
	const me = fsPath(env, 'lib/timeouts.js');
	if (Number(env.node.slice(1).split('.')[0]) < 22 || env.node === 'v22.11.0')
		return fence(
			'console',
			`$ node lib/timeouts.js\nnode:internal/modules/cjs/loader:${int(r, 1180, 1290)}\n      throw new ERR_REQUIRE_ESM(filename, true);\n      ^\n\n` +
				`Error [ERR_REQUIRE_ESM]: require() of ES Module ${lib} from ${me} not supported.\nInstead change the require of index.js in ${me} to a dynamic import() which is available in all CommonJS modules.\n` +
				`    at Object.<anonymous> (${me}:3:22) {\n  code: 'ERR_REQUIRE_ESM'\n}\n\nNode.js ${env.node}`
		);
	return fence(
		'console',
		`$ node lib/timeouts.js\n(node:${int(r, 2000, 90000)}) ExperimentalWarning: CommonJS module ${me} is loading ES Module ${lib} using require().\n` +
			'Support for loading ES Module in require() is an experimental feature and might change at any time\n(Use `node --trace-warnings ...` to show where the warning was created)\nlistening on :8080'
	);
};
const jestPaste = (r: Rand, env: Env) =>
	fence(
		'console',
		` FAIL  src/__tests__/${pick(r, ['timer', 'settings', 'remind', 'invoice'])}.test.js\n  ● Test suite failed to run\n\n    Jest encountered an unexpected token\n\n` +
			'    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.\n\n' +
			'    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.\n\n    Details:\n\n' +
			`    ${fsPath(env, 'node_modules/spanwise/src/index.js')}:${env.ver >= '0.6.0' ? 17 : 16}\n    export function format(span${env.ver >= '0.6.0' ? ', { largest = Infinity, ms = false } = {}' : env.ver >= '0.5.0' ? ', { largest = Infinity } = {}' : ''}) {\n    ^^^^^^\n\n    SyntaxError: Unexpected token 'export'\n\n` +
			"    > 1 | const { format, parse } = require('spanwise');\n        |                             ^\n\n" +
			`Test Suites: 1 failed, ${int(r, 4, 30)} passed, ${int(r, 5, 31)} total\nTests:       ${int(r, 20, 140)} passed, ${int(r, 21, 141)} total`
	);
const lsPaste = (env: Env) =>
	fence(
		'console',
		`$ ls -R node_modules/spanwise\nnode_modules/spanwise:\nCHANGELOG.md  README.md  bench  package.json  scripts  src  test\n\nnode_modules/spanwise/bench:\nrun.js\n\nnode_modules/spanwise/scripts:\nbuild-site.js  check-node.js  lint.js\n\nnode_modules/spanwise/src:\nindex.js\n\nnode_modules/spanwise/test:\nformat.test.js  parse.test.js\n\n$ du -sh node_modules/spanwise\n${env.ver >= '0.6.0' ? '48K' : '40K'}\tnode_modules/spanwise`
	);
const bundlePaste = (r: Rand) => {
	const total = 40 + r() * 160;
	const rows: [string, number][] = [
		['node_modules/react-dom/cjs/react-dom.production.min.js', total * 0.62],
		[pick(r, ['src/App.jsx', 'src/main.js', 'src/index.tsx']), total * 0.07],
		['node_modules/spanwise/src/index.js', 1.4],
		[pick(r, ['node_modules/date-fns/format.mjs', 'node_modules/zod/lib/index.mjs', 'node_modules/preact/dist/preact.module.js']), total * 0.11]
	];
	return fence('console', `$ npx esbuild src/main.js --bundle --minify --metafile=meta.json --analyze --outfile=dist/app.js\n\n  dist/app.js  ${total.toFixed(1)}kb  100.0%\n` + rows.map(([name, kb]) => `   ├ ${name.padEnd(58)} ${kb.toFixed(1)}kb  ${((kb / total) * 100).toFixed(1).padStart(5)}%`).join('\n'));
};
const sitePaste = (r: Rand, kind: 'markdown' | 'head') => {
	if (kind === 'head') return fence('html', '<!doctype html>\n<meta charset="utf-8">\n<title>spanwise</title>\n<h1>spanwise</h1>\n<p>Parse and format human-readable time spans, with no dependencies.</p>\n<pre><code>import { format, parse } from \'spanwise\';');
	const lines = shuffle(r, [
		'<p>### Options</p>',
		'<p>See [the changelog](CHANGELOG.md) for what changed.</p>',
		'<p>**Note:** <code>parse</code> throws on unknown units.</p>',
		'<p>1. Install it</p>',
		'<li>  - nested item</li>',
		'<p>| Unit | Meaning |</p>',
		'<p>|------|---------|</p>'
	]).slice(0, int(r, 3, 5));
	return fence('html', `<h2>Development</h2>\n${lines.join('\n')}\n<li><code>npm run lint</code> checks the JavaScript files, or only the ones you name:</li>`);
};

// Topics. An issue follows one path of one topic. Which part of spanwise it really concerns and where it ended are
// never written into the file; only the discussion shows them, and titles are often wrong about the cause.
type Who = 'r' | 'm' | 'c' | 'b' | 'x' | 'k';
type Msg = [Who, string];
type End = 'fixed' | 'dup' | 'answered' | 'reporter' | 'agreed' | 'declined';
type Paste = 'repl' | 'stack' | 'snippet' | 'tsc' | 'require' | 'jest' | 'ls' | 'bundle' | 'site' | 'head' | 'lint' | 'bench' | 'none';
interface Path {
	end: End;
	/** The topic whose earliest issue this one duplicates, when not its own. */
	dupOf?: string;
	titles?: string[];
	open?: string[];
	expect?: string[];
	paste?: Paste[];
	calls?: (input: string) => Call[];
	first?: Msg[][];
	mid?: Msg[];
	close: Msg[][];
}
interface Topic {
	key: string;
	/** The window in which an issue on this topic can be opened, as YYYY-MM-DD. */
	from: string;
	to?: string;
	/** The release that fixed it, for topics whose issues end fixed. */
	fixed?: string;
	kind: 'bug' | 'feature' | 'question';
	fn?: 'parse' | 'format';
	/** For an issue that is not about either function: the one the reporter's code calls. */
	uses?: 'parse' | 'format';
	titles: string[];
	inputs?: string[];
	fix?: (input: string) => string;
	calls?: (input: string) => Call[];
	test?: { file: 'format' | 'parse'; name: string; call: Call; expected: string };
	/** A call and what the reporter expects from it, for their own failing test. */
	want?: (input: string) => [Call, number | string];
	/** A contributor's sketch of the change, as a diff against main, and the first release it applies to. */
	diff?: string;
	diffFrom?: string;
	paste: Paste[];
	open: string[];
	expect: string[];
	first: Msg[][];
	chime: string[];
	paths: Path[];
}
const spaced = (input: string) => input.replace(/([a-z])(?=\d)/gi, '$1 ');
const decimals: Record<string, string> = { '1.5h': '1h 30m', '0.5d': '12h', '2.5m': '2m 30s', '1.25h': '1h 15m', '0.75h': '45m', '1.5s': '1s 500ms' };

const topics: Topic[] = [
	{
		key: 'upper', from: '2024-03-12', kind: 'bug', fn: 'parse',
		diff: "--- a/src/index.js\n+++ b/src/index.js\n@@ -9,3 +9,3 @@\n const UNIT_MS = Object.fromEntries(UNITS);\n-const PART = /^(\\d+)(ms|d|h|m|s)$/;\n+const PART = /^(\\d+)(ms|d|h|m|s)$/i;\n \n@@ -38,3 +38,3 @@ export function parse(text) {\n     if (!match) throw new SyntaxError(`invalid duration: \"${text}\"`);\n-    total += Number(match[1]) * UNIT_MS[match[2]];\n+    total += Number(match[1]) * UNIT_MS[match[2].toLowerCase()];\n   }", diffFrom: '0.6.1',
		titles: ['parse() rejects upper-case units', '"{in}" throws invalid duration', 'Case-insensitive units?', 'Units are case-sensitive'],
		inputs: ['2H 30M', '30S', '1D 12H', '15M', '1h 30M', '90S', '2D 4H'],
		fix: (i) => i.toLowerCase(),
		calls: (i) => [['parse', i], ['parse', i.toLowerCase()]],
		want: (i) => [['parse', i], parseSpan(i.toLowerCase()) as number],
		paste: ['repl', 'stack', 'stack'],
		open: [
			'parse throws on any unit written in capitals. Our durations come from {src}, and people type them however they like, so we get values such as `{in}`.',
			'`parse("{in}")` throws `invalid duration`, while the same value in lower case works. It took me a while to spot, because the error only repeats the input and the input looks fine.',
			'We moved a few settings in {proj} over to spanwise last week and some of them stopped loading. The common thread is capital letters: `{in}` fails, `{fix}` is fine.'
		],
		expect: ['I would expect the unit to match in any case. Nothing about `{in}` is ambiguous.', 'Either accept any case, or say in the error that units have to be lower case.'],
		first: [
			[['m', 'Nothing is ambiguous here, you are right: `M` can only mean minutes, because months are not a unit in spanwise. I do not see a reason to be strict about case.']],
			[['m', 'Confirmed on {ver}:\n\n{repl}\n\nThe pattern only lists lower-case units. That was deliberate at the start, to keep `m` and `ms` apart, but telling them apart does not need case.'], ['r', 'So `MS` would still be milliseconds and `M` minutes? That matches what our users type anyway.']]
		],
		chime: ['We hit this with values from a spreadsheet export where somebody had auto-capitalise switched on.', 'For anyone landing here from a search: `parse(value.toLowerCase())` works as a stopgap.', 'Same on {ver}. Our operations people write `30S` out of habit from another tool.'],
		paths: [
			{ end: 'agreed',
				mid: [['c', 'One thing to settle first: do we lower-case the whole input, or match the unit case-insensitively? The result is the same today, but it would matter if we ever added a unit where case means something.'], ['m', 'Match the unit case-insensitively and leave the number alone. There is no unit where case would matter, and I do not plan one.']],
				close: [
					[['m', 'Agreed, then: units in any case, so `parse("2H 30M")` returns 9000000. Nobody has picked it up yet. It is a change to the pattern in src/index.js and a test in test/parse.test.js, if someone wants a small first contribution.']],
					[['m', 'Let us do it: accept units in any case and keep the error for unknown ones. I will not get to it before the next release, so it is up for grabs.'], ['r', 'Thanks! I might find time next month, but no promises.']]
				] },
			{ end: 'dup',
				close: [
					[['c', 'This is the same request as {dup}, where we agreed to accept units in any case. Let us keep it in one place.'], ['r', 'Sorry, I searched for "uppercase" and not "case". Following the other one.']],
					[['m', 'Duplicate of {dup}. The plan there is to accept units in any case; nobody has started on it yet.']]
				] },
			{ end: 'reporter',
				titles: ['parse fails on durations from our config file', 'Some config values throw invalid duration'],
				open: ['Some of the durations in our settings throw `invalid duration` and others do not, and I cannot see the difference. They all look like `{fix}` to me. They come from {src}.'],
				expect: ['As far as I can tell they should all parse.'],
				paste: ['snippet'],
				calls: (i) => [['parse', i.toLowerCase()], ['parse', `  ${i.toLowerCase()}  `]],
				first: [[['m', 'I tried `{fix}` and a few variations on {ver} and they all parse:\n\n{repl}\n\nCould you paste one value that fails, exactly as your code receives it? `console.log(JSON.stringify(value))` shows invisible characters and odd spacing, which `console.log(value)` hides.']]],
				mid: [['b', 'Possibly the same as what we had: a non-breaking space pasted from a document, or capital letters. Both throw.']],
				close: [
					[['m', 'Could be either. I would rather not guess, so I will wait for the exact value from the original report.']],
					[['m', 'Gentle ping: without one failing value I cannot tell which of the known causes this is. Paste it with `JSON.stringify` when you get a chance.']]
				] }
		]
	},
	{
		key: 'decimal', from: '2024-04-01', kind: 'feature', fn: 'parse',
		diff: "--- a/src/index.js\n+++ b/src/index.js\n@@ -9,3 +9,3 @@\n const UNIT_MS = Object.fromEntries(UNITS);\n-const PART = /^(\\d+)(ms|d|h|m|s)$/;\n+const PART = /^(\\d+(?:\\.\\d+)?)(ms|d|h|m|s)$/;\n \n@@ -39,4 +39,4 @@ export function parse(text) {\n     total += Number(match[1]) * UNIT_MS[match[2]];\n   }\n-  return total;\n+  return Math.round(total);\n }", diffFrom: '0.6.1',
		titles: ['parse("{in}") throws', 'Support decimal amounts', 'Allow fractional hours', 'Decimals in durations'],
		inputs: Object.keys(decimals),
		fix: (i) => decimals[i] ?? i,
		calls: (i) => [['parse', i], ['parse', decimals[i] ?? i]],
		want: (i) => [['parse', i], parseSpan(decimals[i] ?? i) as number],
		paste: ['repl', 'stack', 'none'],
		open: [
			'Decimal amounts throw. `parse("{in}")` fails with `invalid duration`, though it is the same span as `{fix}`, which works. People write {in} all the time in {src}.',
			'We let people type how long something took, and about a fifth of them write decimals: `{in}`, `0.5h` and so on. spanwise rejects every one of them.'
		],
		expect: ['`{in}` should parse to the same number as `{fix}`.', 'Decimals in the amount should work, at least for hours and minutes.'],
		first: [
			[['m', 'I left decimals out at the start because they raise questions about rounding: `0.0001s` is a tenth of a millisecond. But that question has an answer, round to the nearest millisecond, and `{in}` is a perfectly normal thing to write.']],
			[['c', 'Reproduced on {ver}:\n\n{repl}']]
		],
		chime: ['Our users do the same: "1.5h" is easily the most common thing that fails for us.', 'Would `.5h`, with no leading zero, be accepted too? People write that.', 'Please keep `1,5h` out of it, though; a decimal comma would clash with anything that splits on commas.'],
		paths: [
			{ end: 'agreed',
				first: [[['m', 'spanwise wants whole numbers in each part, so `{fix}` is the way to write it today. I am wary of decimals; they invite questions about rounding.']]],
				mid: [['r', 'I understand, but we cannot ask our users to convert in their heads. Right now we catch the error and show "please write 90m", and people find that silly.'], ['b', '+1. Every other duration parser I have used accepts `1.5h`. Rounding to the nearest millisecond seems like the obvious answer.'], ['k', 'For what it is worth, the change is small: `(\\d+(?:\\.\\d+)?)` for the amount and `Math.round` on the product. I tried it locally and the existing tests still pass.']],
				close: [[['m', 'Fair enough, you have all convinced me. Decision: decimal amounts are allowed in any part, and the total is rounded to the nearest millisecond, so `1.5h` is 5400000. Nobody is on it yet; it needs the pattern change and tests in test/parse.test.js.']]] },
			{ end: 'agreed',
				mid: [['b', 'Should `.5h` work too, or only `0.5h`?'], ['m', 'Only with a leading digit, I think: `0.5h`. `.5h` is one more thing to explain, and nobody has asked for it except as a "should".']],
				close: [[['m', 'Agreed: decimal amounts, rounded to the nearest millisecond, leading digit required. Up for grabs; I would like it in the next minor.'], ['k', 'I can look at this after the holidays if nobody beats me to it.']]] },
			{ end: 'dup',
				close: [[['m', 'Same as {dup}, where we decided to accept decimals and round to the nearest millisecond. I will close this in favour of that one when I next tidy the tracker.']]] }
		]
	},
	{
		key: 'compact', from: '2024-03-20', kind: 'feature', fn: 'parse',
		titles: ['Support "{in}" without spaces', 'parse("{in}") throws', 'Allow compact durations like 1h30m', 'Optional spaces between parts'],
		inputs: ['1h30m', '2d4h', '45m30s', '1h15m', '3m20s', '1d12h'],
		fix: spaced,
		calls: (i) => [['parse', i], ['parse', spaced(i)]],
		want: (i) => [['parse', i], parseSpan(spaced(i)) as number],
		paste: ['repl', 'stack', 'none'],
		open: [
			'`parse("{in}")` throws `invalid duration`. Writing durations without spaces is very common, at least among the people who use {proj}, and other parsers accept it.',
			'Would you consider accepting parts without spaces between them? `{in}` reads naturally, and that is how our users type it in {src}.'
		],
		expect: ['`parse("{in}")` should return the same as `parse("{fix}")`.', 'An option, or just the default, that allows parts without a space between them.'],
		first: [
			[['m', 'This is deliberate. The README says "`parse` takes parts separated by spaces", and what `format` writes has the spaces too. One spelling per span keeps the parser and its errors simple.']],
			[['c', 'Thanks for the clear request. Where we stand: spaces between parts are part of the format, and the error you get is the intended one. Let me think about whether there is a strong reason to change that.']]
		],
		chime: ['If it helps anyone, this is what we do before calling parse: `text.replace(/([a-z])(?=\\d)/gi, "$1 ")`. Not pretty, but it handles `{in}`.', '+1 for compact input. People do not put spaces in when they type quickly on a phone.'],
		paths: [
			{ end: 'declined',
				mid: [['k', 'I opened {pr} with an implementation that splits on unit boundaries. It is about ten lines, and the tests pass.'], ['m', 'Thanks for doing the work. Having looked at it, the trouble is `1m5s` against `15ms`, and what `1m5` should mean. Each case has an answer, but every answer is one more rule to document and get wrong.'], ['k', 'The PR answers them: a number always needs a unit, and units are matched longest first, so `15ms` is milliseconds.']],
				close: [[['m', 'I have thought about it over the week, and I am going to say no. spanwise reads exactly what it writes, with spaces, and normalising input belongs in the application, where you know what your users type. I will leave this open for a while so people can find the workaround above, and close the PR.']]] },
			{ end: 'declined',
				mid: [['r', 'Would you take an option, like `parse(text, { compact: true })`? Then the default stays strict.'], ['c', 'An option does not make the rules go away. It hides them behind a flag that we would still have to test and document.']],
				close: [[['m', 'We talked about it and we are going to keep parts separated by spaces, with no option. The one-line normaliser in the comment above is what we recommend. Sorry, I know that is not the answer you wanted.'], ['r', 'Fair enough. We will keep the regex.']]] },
			{ end: 'dup',
				close: [[['c', 'This has come up before: see {dup}. The short version is that spaces between parts are part of the format, and we have said no to an option.'], ['r', 'Ah, I missed that one. Thanks.']]] }
		]
	},
	{
		key: 'words', from: '2024-03-25', kind: 'feature', fn: 'parse',
		titles: ['parse("{in}") throws', 'Support unit words (hour, minutes, ...)', 'Accept natural-language durations', 'Friendlier parsing for user input'],
		inputs: ['1 hour', '90 min', '2 hrs 15 mins', '1h, 30m', '1 h 30 m', '45 seconds', '1h and 30m'],
		calls: (i) => [['parse', i]],
		paste: ['repl', 'none'],
		open: [
			'Our users type durations by hand in {src}, and a lot of what they write does not parse: `{in}` is a typical one. spanwise is otherwise exactly what we need.',
			'Is there a way to parse things like `{in}`? We get these from {src} and I would rather not write my own parser on top of yours.'
		],
		expect: ['Accept unit words (hour, hours, hr, min, mins, minute, second) and spaces between the amount and the unit.', 'Ideally `{in}` would parse.'],
		first: [
			[['m', 'spanwise deliberately reads only its own short form, `1h 30m`, the same thing `format` writes. Words, plurals, abbreviations and separators are an open-ended list, and every parser that accepts them ends up with a page of special cases.']],
			[['c', 'Short answer: not built in, and not likely to be. Longer answer below.']]
		],
		chime: ['We went through the same thing. In the end we show the expected format next to the input field, and the complaints stopped.', 'If you need real natural-language parsing, there are libraries that do only that; spanwise is not trying to be one.'],
		paths: [
			{ end: 'answered',
				mid: [['m', 'What works well is a small normaliser in your app that knows what your users actually write:\n\n```js\nconst WORDS = { hours: \'h\', hour: \'h\', hrs: \'h\', hr: \'h\', minutes: \'m\', minute: \'m\', mins: \'m\', min: \'m\', seconds: \'s\', second: \'s\', secs: \'s\', sec: \'s\' };\n\nexport function normalise(text) {\n  return text\n    .toLowerCase()\n    .replace(/,|\\band\\b/g, \' \')\n    .replace(/(\\d+)\\s*([a-z]+)/g, (_, n, unit) => `${n}${WORDS[unit] ?? unit}`)\n    .trim();\n}\n\nparse(normalise(\'{in}\'));\n```\n\nIt is yours to extend, and spanwise keeps one strict format.']],
				close: [[['r', 'That is a good approach, thanks. I will put it in front of parse in {proj}.']], [['r', 'Makes sense. We use a version of this now and it covers everything in our logs.'], ['m', 'Glad it helped.']]] },
			{ end: 'declined',
				mid: [['r', 'I understand the concern, but surely hours, minutes and seconds in English cover most cases? That is a fixed list.'], ['b', 'It is fixed until someone asks for `Std.` or `minuti`. I have maintained a parser like that, and I would not wish it on anyone.']],
				close: [[['m', 'I am going to turn this down. spanwise reads its own format and nothing else, and I want to keep it that way. A few lines of normalising in your app, as people describe above, is the recommended route.']]] }
		]
	},
	{
		key: 'negparse', from: '2025-03-12', kind: 'bug', fn: 'parse',
		diff: "--- a/src/index.js\n+++ b/src/index.js\n@@ -33,10 +33,12 @@\n export function parse(text) {\n   if (typeof text !== 'string') throw new TypeError('parse expects a string');\n+  const negative = text.trimStart().startsWith('-');\n+  const rest = negative ? text.trimStart().slice(1) : text;\n   let total = 0;\n-  for (const word of text.trim().split(/\\s+/)) {\n+  for (const word of rest.trim().split(/\\s+/)) {\n     const match = PART.exec(word);\n     if (!match) throw new SyntaxError(`invalid duration: \"${text}\"`);\n     total += Number(match[1]) * UNIT_MS[match[2]];\n   }\n-  return total;\n+  return negative ? -total : total;\n }", diffFrom: '0.6.1',
		titles: ['parse cannot read negative spans that format writes', 'parse("{in}") throws', 'Round trip fails for negative durations', 'Negative durations in parse?'],
		inputs: ['-1m 30s', '-5m', '-2h', '-1d 2h', '-45s'],
		fix: (i) => i.slice(1),
		calls: (i) => [['format', -(parseSpan(i.slice(1)) as number)], ['parse', i]],
		want: (i) => [['parse', i], -(parseSpan(i.slice(1)) as number)],
		paste: ['repl', 'stack'],
		open: [
			'`format` keeps the sign of a negative span, but `parse` cannot read the result back:\n\n{repl}',
			'We store schedule offsets as text, and some of them are negative ("start five minutes before"). `format` writes them fine as `{in}`, and then `parse` throws when we load them.'
		],
		expect: ['`parse(format(x))` should give back `x` for negative spans too.', 'A leading minus sign should make the whole span negative.'],
		first: [
			[['m', 'My first reaction is that a duration is never negative, and a negative offset is an application concept. But you are right that `format` has written the sign since 0.4.0.']],
			[['c', 'Confirmed. There is even a test, "reads back what format writes", that only covers positive spans.']]
		],
		chime: ['We hit this with countdown timers that go past zero: we show `-2m` for overtime, and saving and reloading breaks.', 'Should `-1h -30m` be allowed, or only one sign at the front?'],
		paths: [
			{ end: 'agreed',
				mid: [['r', 'If format writes it, parse should read it, in my opinion. Otherwise the round trip only works for half the numbers.'], ['m', 'That is a fair point and I cannot argue with it.'], ['c', 'Proposal: one optional minus at the very start, applying to the whole span. `-1h 30m` is -5400000. A minus anywhere else is still invalid.']],
				close: [[['m', 'Agreed with that proposal: an optional leading minus for the whole span, nothing else. It needs the change in `parse` and a negative case in the round-trip test. Not started.']]] },
			{ end: 'agreed',
				mid: [['b', 'Only one sign at the front, please. `-1h -30m` would be a nightmare to explain.']],
				close: [[['m', 'Yes, let us accept a single leading minus, which negates the whole span, so that `parse(format(x)) === x` for negative `x`. Contributions welcome; otherwise I will get to it after the next release.']]] },
			{ end: 'dup',
				close: [[['m', 'This is {dup}, where we agreed to accept a leading minus. Let us track it there.']]] }
		]
	},
	{
		key: 'huge', from: '2024-05-01', kind: 'bug', fn: 'parse',
		diff: "--- a/src/index.js\n+++ b/src/index.js\n@@ -39,4 +39,5 @@ export function parse(text) {\n     total += Number(match[1]) * UNIT_MS[match[2]];\n   }\n+  if (!Number.isSafeInteger(total)) throw new RangeError(`duration too large: \"${text}\"`);\n   return total;\n }", diffFrom: '0.6.1',
		titles: ['parse returns imprecise numbers for very large amounts', 'Huge durations silently lose precision', 'parse("{in}") returns a wrong number'],
		inputs: ['99999999999999999999d', '9007199254740993ms', '100000000000000001h', '999999999999999999999s'],
		calls: (i) => [['parse', i], ['format', parseSpan(i) as number]],
		paste: ['repl'],
		open: [
			'We fuzz our config loader, and the fuzzer found that very large amounts parse without an error but come back as different numbers:\n\n{repl}',
			'Not a real-world problem for us yet, but `parse("{in}")` returns a number that is not the span that was written. JavaScript numbers lose precision above `Number.MAX_SAFE_INTEGER`, and spanwise does not check.'
		],
		expect: ['An error for amounts whose result is not a safe integer, rather than a quietly wrong number.', 'Throw instead of returning something imprecise.'],
		first: [
			[['m', 'Interesting find. Nobody needs a span of millions of years, but silently returning the wrong number is worse than throwing.']],
			[['c', 'For context: `Number.MAX_SAFE_INTEGER` milliseconds is about 285,000 years, so nothing realistic gets near it. The question is only what happens with nonsense input.']]
		],
		chime: ['`setTimeout` clamps anything over 2^31 - 1 ms (about 24.8 days) anyway, which bites far more people than this.', 'A RangeError seems right to me. SyntaxError would suggest the text is malformed, which it is not.'],
		paths: [
			{ end: 'agreed',
				mid: [['r', 'Would you throw a SyntaxError like for other bad input, or a RangeError?'], ['m', 'RangeError, I think: the text is well formed, the value is out of range.']],
				close: [[['m', 'Decision: `parse` throws a RangeError when the total is not a safe integer. Checking the total is enough. Nobody has taken it yet.']]] },
			{ end: 'reporter',
				open: ['Our fuzzer reported that `parse` returns wrong numbers for some long inputs. I do not have the exact case to hand, but it was a very large number of days or hours.'],
				paste: ['none'],
				calls: () => [['parse', '1000000d'], ['parse', '24000000h']],
				first: [[['m', 'Which input was it exactly? I tried a few long amounts on {ver}, and the numbers I got back look right to me:\n\n{repl}\n\nIf the fuzzer saved the failing case, could you paste it?']]],
				close: [[['m', 'Still keen to see the exact case. Without it I cannot tell whether this is the precision limit or something else.']]] }
		]
	},
	{
		key: 'errors', from: '2025-08-26', kind: 'question', fn: 'parse',
		titles: ['Error message should say which part is invalid', 'Make parse errors machine-readable', 'How do I tell bad input from a bug when parse throws?', 'Error codes for parse failures'],
		inputs: ['2h 3x', '1h 30', 'soon', '10 min', '1h -5m'],
		calls: (i) => [['parse', i]],
		paste: ['repl', 'none'],
		open: [
			'When `parse` fails, the message repeats the whole input: `invalid duration: "{in}"`. For long input it is hard to see which part was wrong, and I cannot get at it in code without picking the message apart.',
			'We show parse errors to users in {proj}. Right now we catch everything from `parse` and print a generic message, because there is no code or type that tells "your text is wrong" apart from "something broke".'
		],
		expect: ['An error code, or a custom error class with the offending part as a property.', 'Something in the error I can check without matching on the message text.'],
		first: [[['m', 'Good question. The design is: `parse` throws a `TypeError` when you pass something that is not a string (a bug in the caller), and a `SyntaxError` when the string is not a valid span (bad input). So `error instanceof SyntaxError` is the check you want.']]],
		chime: ['I did not know about the TypeError and SyntaxError split. That should be in the README.', '`instanceof SyntaxError` works for us. We show the message as it is, because it quotes what the user typed.'],
		paths: [
			{ end: 'answered',
				mid: [['r', 'That works for the "bad input or bug" part. Pointing at the wrong part would still be nice, but I can live without it.'], ['m', 'If you need to highlight the part, split on whitespace and call `parse` on each word; the first one that throws is the culprit. It is a three-line loop, and I would rather not grow the error object for it.']],
				close: [[['r', 'Fine by me, thanks for explaining.']], [['r', 'OK, the per-word loop does what we need. Thanks!']]] },
			{ end: 'declined',
				mid: [['r', 'Could you add a `code` property, like Node errors have (`ERR_SPANWISE_INVALID`)? Matching on classes feels fragile across bundles.'], ['c', 'SyntaxError and TypeError are built-ins, so they are the same class everywhere, even across bundles. That is why we did not invent our own.']],
				close: [[['m', 'I am going to say no to error codes. The two built-in classes already separate the cases, and they cannot break across bundles or realms the way a custom class can. If the README does not explain this well enough, that is a documentation problem, not an API one.']]] }
		]
	},
	{
		key: 'whitespace', from: '2024-03-12', to: '2024-10-28', fixed: '0.3.0', kind: 'bug', fn: 'parse',
		titles: ['Double space between parts throws', 'parse fails on a trailing newline', 'Whitespace handling in parse is too strict'],
		paste: ['none'],
		open: [
			'`parse` throws when there are two spaces between parts, or a space at either end:\n\n```js\nparse(\'1h  30m\'); // SyntaxError: invalid duration: "1h  30m"\nparse(\' 45s\');    // SyntaxError: invalid duration: " 45s"\n```\n\nWe read these from {src}, and stray spaces are everywhere.',
			'Reading a duration from a file with `readFileSync` leaves a trailing newline, and `parse` rejects it: `parse("1h 30m\\n")` throws. The same happens with a tab between parts.'
		],
		expect: ['Ignore leading and trailing whitespace, and accept any run of whitespace between parts.'],
		first: [[['m', 'Yes, that is too strict. `parse` splits on a single space at the moment. It should trim and split on any whitespace.']], [['c', 'Agreed that this is a bug. Thanks for the examples.']]],
		chime: ['Same here with values from a textarea, where people press Enter at the end.'],
		paths: [
			{ end: 'fixed',
				mid: [['r', 'Thanks! Is there a release planned soon?'], ['m', 'It will go out in a coming release, together with a couple of other parse changes.']],
				close: [
					[['m', 'This went out in {rel} ({reldate}): `parse` now trims the input and splits on any run of whitespace, so all the examples above work. The commit should have closed this issue, but it did not mention it.']],
					[['b', 'Confirming this works on {rel}: `parse(" 1h \\t 30m \\n")` gives 5400000.'], ['r', 'Works for us too, thanks.']]
				] }
		]
	},
	{
		key: 'emptyold', from: '2024-11-06', to: '2026-10-25', fixed: '0.6.1', kind: 'bug', fn: 'parse',
		titles: ['parse("") returns 0', 'Empty string parses as zero', 'parse accepts blank input'],
		paste: ['none'],
		open: [
			'`parse("")` returns 0 instead of throwing. We had a bug where an unset setting became an empty string, and instead of an error at startup we got a cache with no expiry at all.\n\n```js\nparse(\'\');    // 0\nparse(\'   \'); // 0\nparse(\'0s\');  // 0\n```',
			'Is it intended that `parse("")` and `parse("   ")` return `0`? Every other invalid input throws, so this surprised me when an empty field in {src} turned into a zero duration.'
		],
		expect: ['An empty string is not a duration and should throw, like any other invalid input.'],
		first: [[['m', 'Good catch. That is an accident of how the splitting works rather than a decision. `parse("0s")` is the way to say zero.']], [['c', 'I could see someone relying on it. But I agree it is surprising, and an error would have saved you a bad afternoon.']]],
		chime: ['Please make it throw. We had exactly this with an environment variable that was set but empty.', 'This would break anyone relying on it, so maybe in a minor with a note?'],
		paths: [
			{ end: 'fixed',
				mid: [['b', 'Could it return `null` instead of throwing? That is easier to default.'], ['m', 'I would rather not have a third kind of result. `text ? parse(text) : fallback` is short enough.'], ['c', 'Agreed. Throw a SyntaxError, like any other invalid input.']],
				close: [[['m', 'Shipped in {rel} on {reldate}: `parse("")` and whitespace-only strings now throw a SyntaxError. It is in the changelog.'], ['r', 'Thanks, upgraded, and our startup check caught two empty settings right away.']]] },
			{ end: 'fixed',
				close: [[['c', 'This is done in {rel}: "`parse` now rejects an empty string instead of returning 0." I forgot to link the issue in the commit.']]] }
		]
	},
	{
		key: 'emptynew', from: '2026-10-31', kind: 'bug', fn: 'parse',
		titles: ['0.6.1 breaks parse("")', 'Regression in 0.6.1: empty string throws', 'Please revert the empty-string change in 0.6.1'],
		inputs: [''],
		calls: () => [['parse', '']],
		paste: ['stack', 'snippet'],
		open: [
			'After upgrading to 0.6.1, our app fails at startup. `parse(process.env.GRACE_PERIOD ?? "")` used to return 0 when the variable is empty, and now it throws `invalid duration: ""`. A patch release should not break working code.',
			'We rely on empty strings meaning "no delay" in {proj}. 0.6.1 throws on them now, so every user with an empty field gets an error. Could the old behaviour come back, or at least sit behind an option?'
		],
		expect: ['Restore the 0.6.0 behaviour, or add an option that allows empty input.'],
		first: [[['m', 'Sorry for the trouble. The change was deliberate, and it is in the changelog for 0.6.1, but I take the point that a patch release was the wrong place for it. Before 1.0 we have been less strict about this than we should have been.']]],
		chime: ['We hit it too, but honestly it found a real bug for us: an empty setting we did not know about.', 'Pinning to 0.6.0 for now.'],
		paths: [
			{ end: 'declined',
				mid: [['r', 'So will you revert it?'], ['c', 'An empty string meaning zero hid real configuration mistakes; there were reports of exactly that. Going back would bring them back.']],
				close: [[['m', 'We are not going to revert it, and we will not add an option for it. The fix on your side is one line: `value ? parse(value) : 0`. I am sorry it came in a patch release.'], ['r', 'OK. Not thrilled, but the one-liner works.']]] },
			{ end: 'dup',
				close: [[['c', 'Same as {dup}: the change is deliberate and we are keeping it. `value ? parse(value) : 0` restores the old behaviour in your code.']]] }
		]
	},
	{
		key: 'zero', from: '2025-09-01', kind: 'bug', fn: 'format',
		diff: "--- a/src/index.js\n+++ b/src/index.js\n@@ -26,5 +26,5 @@ export function format(span, { largest = Infinity, ms = false } = {}) {\n     rest -= count * size;\n     if (count > 0) parts.push(`${count}${unit}`);\n   }\n-  return sign + parts.join(' ');\n+  return parts.length > 0 ? sign + parts.join(' ') : '0s';\n }", diffFrom: '0.6.0',
		titles: ['format(0) returns an empty string', 'Empty output for a zero duration', 'format(0) should not be ""', 'Blank cell when a duration is zero'],
		inputs: ['0'],
		calls: () => [['format', 0], ['format', 0, { largest: 2 }], ['parse', '0s']],
		test: { file: 'format', name: 'formats zero', call: ['format', 0], expected: "'0s'" },
		want: () => [['format', 0], '0s'],
		paste: ['repl', 'snippet', 'none'],
		open: [
			'`format(0)` returns an empty string. In {proj} that shows up as a blank, and people think the page is broken.',
			'Zero comes out as nothing at all:\n\n{repl}\n\nI had to read the source to see why.',
			'A timer that reaches zero shows nothing, because `format(0)` is an empty string. I expected `0s`.'
		],
		expect: ['`format(0)` should return `"0s"`.', 'Something visible for zero, ideally `0s`.'],
		first: [
			[['m', 'You are right that an empty string is a bad answer for zero: it is easy to miss and cannot be read back.\n\n{repl}']],
			[['c', 'Confirmed on {ver}. `format` skips units with a count of zero, and for zero that is all of them.']]
		],
		chime: ['Please be careful: our kitchen timer shows `format(timer.remaining) || "done"`, which relies on the empty string. Not saying do not change it, just mention it in the changelog.', 'Same here. We wrap it as `format(x) || "0s"` everywhere.', 'What about `format(400)`? That is empty today as well.'],
		paths: [
			{ end: 'agreed',
				mid: [['b', 'Should it be `0s` or `0ms`?'], ['m', '`0s`, I think. Seconds are the smallest unit `format` shows by default, and `0ms` reads oddly.'], ['k', 'Here is a test for it, failing as expected on main:\n\n{test}']],
				close: [[['m', 'Decided: `format(0)` returns `"0s"`. Not done yet; it is a small change in `format` plus a test in test/format.test.js. I would like it in the next release.']]] },
			{ end: 'agreed',
				close: [[['m', 'Yes, `format(0)` should return `"0s"`. Agreed and on the list for the next release; nobody has started it.'], ['r', 'Great, thanks. We will drop our `|| "0s"` when it lands.']]] },
			{ end: 'dup',
				close: [[['c', 'This is the same as {dup}. We agreed there that `format(0)` should return `"0s"`.']]] }
		]
	},
	{
		key: 'subsecond', from: '2026-09-16', kind: 'bug', fn: 'format',
		titles: ['format({in}) returns an empty string', 'Spans under a second disappear', 'format drops everything below one second'],
		inputs: ['400', '999', '250', '730'],
		calls: (i) => [['format', Number(i)], ['format', Number(i), { ms: true }]],
		paste: ['repl', 'snippet'],
		open: [
			'Anything under a second formats as an empty string: `format({in})` is `""`. In {proj} we show response times, and the fast ones are simply blank.',
			'Small spans come out empty:\n\n{repl}'
		],
		expect: ['Show something for spans under a second, maybe `0s`, or the milliseconds.'],
		first: [[['m', 'Two things here. By default `format` does not show milliseconds, so a span under a second has nothing to show. Since 0.6.0 you can pass `{ ms: true }` to get `{in}ms`.']]],
		chime: ['We switched to `{ ms: true }` for anything that is usually under a second, and kept the default elsewhere.'],
		paths: [
			{ end: 'answered',
				mid: [['r', 'Oh, I missed the `ms` option; we were on an older version when we wrote this code. That covers us.']],
				close: [[['m', 'Good. For spans under a second, `{ ms: true }` is the answer.'], ['r', 'Switched over, all good now. Thanks.']]] },
			{ end: 'dup', dupOf: 'zero',
				mid: [['r', 'We want the default to stay without milliseconds, though. It is the empty string that hurts.']],
				close: [[['m', 'Then this is really {dup}: an empty result should be `0s`. Once that is in, `format({in})` will return `0s` by default and `{in}ms` with `{ ms: true }`. Let us continue there.']]] }
		]
	},
	{
		key: 'largest', from: '2025-08-26', kind: 'bug', fn: 'format',
		diff: "--- a/src/index.js\n+++ b/src/index.js\n@@ -22,5 +22,5 @@ export function format(span, { largest = Infinity, ms = false } = {}) {\n   for (const [unit, size] of UNITS) {\n     if (unit === 'ms' && !ms) break;\n-    if (parts.length > largest) break;\n+    if (parts.length >= largest) break;\n     const count = Math.floor(rest / size);\n     rest -= count * size;", diffFrom: '0.6.0',
		titles: ['README example for `largest` is wrong', '`largest` shows one unit too many', 'format(..., { largest: 1 }) returns two units', 'Docs: largest option does not match output'],
		inputs: ['90061000', '93784000', '3723000', '86461000'],
		calls: (i) => [['format', Number(i), { largest: 2 }], ['format', Number(i), { largest: 1 }]],
		test: { file: 'format', name: 'shows at most largest units', call: ['format', 90061000, { largest: 2 }], expected: "'1d 1h'" },
		want: (i) => [['format', Number(i), { largest: 2 }], String(formatSpan(Number(i))).split(' ').slice(0, 2).join(' ')],
		paste: ['repl', 'snippet'],
		open: [
			'The README says `format(90_061_000, { largest: 2 })` gives `"1d 1h"`, but I get `"1d 1h 1m"`. I assume the README is out of date?',
			'`largest` seems to be off by one:\n\n{repl}\n\nWe use `largest: 2` in {proj} and always get three units.'
		],
		expect: ['Either the README or the output is wrong. I expected exactly `largest` units.', '`largest: 2` should show at most two units.'],
		first: [[['c', 'Thanks for checking against the README. Reproduced on {ver}:\n\n{repl}']], [['m', 'Hmm, that is embarrassing. Let me look at which side is wrong.']]],
		chime: ['We worked around it by passing `largest: n - 1`, which will break the day this is fixed. Please mention it in the changelog.', 'Same here. I thought I was misreading the docs.'],
		paths: [
			{ end: 'agreed',
				mid: [['m', 'I think the README is what is wrong. Let me update the example to show three units.'], ['k', 'I do not think so. The loop checks `parts.length > largest` before it adds the next unit, so it stops one unit late. With `>=` it gives `1d 1h`, which is what the option name promises. Test:\n\n{test}'], ['m', 'You are right, I misread my own loop. The README describes the intended behaviour, and the code is wrong.']],
				close: [[['m', 'So: fix `format` so that `largest` means at most that many units, and keep the README as it is. Not done yet. Whoever does it should add a test with `largest: 2` to test/format.test.js and a changelog line, because people who worked around it will see a change.']]] },
			{ end: 'agreed',
				mid: [['b', 'The off-by-one is in the loop: it checks the length before pushing, so it adds one unit too many.']],
				close: [[['m', 'Yes, it is a bug in `format`, and the README is right. Agreed to fix it in the next release; nobody has picked it up yet.'], ['r', 'Thanks. We will drop our `largest - 1` hack when it ships.']]] },
			{ end: 'dup',
				close: [[['c', 'Duplicate of {dup}: `largest` is off by one in `format`, and the README is right. Not fixed yet.']]] }
		]
	},
	{
		key: 'rounding', from: '2024-04-15', kind: 'feature', fn: 'format',
		titles: ['format({in}) returns "{out}" instead of rounding', 'format truncates instead of rounding', 'Add a rounding option to format'],
		inputs: ['1999', '59999', '119500', '3599999'],
		calls: (i) => [['format', Number(i)], ['format', Math.round(Number(i) / 1000) * 1000]],
		paste: ['repl', 'snippet', 'none'],
		open: [
			'`format({in})` returns `"{out}"`. I expected it to round to the nearest second, since that is what a person would say.',
			'We show elapsed times in {proj}, and they always come out slightly short: `format({in})` is `{out}`, and people notice when a two-minute job says `1m 59s`.'
		],
		expect: ['Round to the nearest displayed unit instead of cutting off.', 'An option such as `round: true`.'],
		first: [[['m', '`format` cuts off rather than rounding, on purpose: each unit is the whole number of that unit in what is left, the way a clock works. A countdown showing `0s` while a few hundred milliseconds remain is what people complain about with rounding.']]],
		chime: ['Truncation is right for countdowns and wrong for "how long did that take". There is no default that suits both.', 'We do `format(Math.round(ms / 1000) * 1000)` and it is fine.'],
		paths: [
			{ end: 'answered',
				mid: [['m', 'If you want rounding, round before you format: `format(Math.round(span / 1000) * 1000)` rounds to the nearest second. That keeps the decision in your code, where you know which way you want it.\n\n{repl}']],
				close: [[['r', 'Makes sense, I had not thought about countdowns. Rounding before the call works for us.']], [['r', 'OK, that is easy enough. Thanks for the explanation.']]] },
			{ end: 'declined',
				mid: [['r', 'Could `format` take a `round` option, so it is not at every call site?'], ['c', 'Rounding to what, though: the nearest second, or the smallest unit shown with `largest`? The second is what people usually want, and it is where every proposal so far got complicated.'], ['b', '`largest` plus rounding is a real mess: should 1h 59m 59s with `largest: 1` be `1h` or `2h`?']],
				close: [[['m', 'I am going to decline the option. Rounding interacts with `largest` in ways that would need a page of documentation, and rounding before the call is one line. Leaving this open a little longer for anyone searching.']]] }
		]
	},
	{
		key: 'words-out', from: '2024-09-01', kind: 'feature', fn: 'format',
		titles: ['Option to spell out units ("1 hour 30 minutes")', 'Long unit names in format', 'format output for screen readers', 'Verbose output from format'],
		paste: ['none', 'snippet'],
		open: [
			'We show durations in {proj}, and in some places `1h 30m` is too terse. Could `format` optionally write `1 hour 30 minutes`?',
			'Screen readers read `1h 30m` as "one h thirty m". An accessibility audit flagged it on our site. Spelled-out units would fix that.'
		],
		expect: ['Something like `format(5400000, { long: true })` returning `"1 hour 30 minutes"`.'],
		first: [[['m', 'I like this. The accessibility angle is a good argument; I had not thought about how `1h` sounds read aloud.']], [['c', 'Interesting. English only, I assume? The moment we do this, someone will ask for other languages.']]],
		chime: ['English only would already be useful. We would use it in tooltips.', '`aria-label={format(ms, { long: true })}` is exactly what we would do.'],
		paths: [
			{ end: 'agreed',
				mid: [['b', 'How would plurals work? `1 hour`, `2 hours`, and `1 millisecond`?'], ['m', 'Singular for 1, plural otherwise, joined with spaces, no "and". English only, deliberately; other languages are what `Intl.DurationFormat` is for.'], ['r', 'That covers our case completely.']],
				close: [[['m', 'Agreed: a `long` option on `format`, English unit names, singular for one, and nothing else. Up for grabs; it needs tests and a line in the README.']]] },
			{ end: 'dup',
				close: [[['m', 'This is {dup}, which we agreed on: a `long` option with English unit names. Nobody has started it yet.']]] }
		]
	},
	{
		key: 'locale', from: '2025-01-15', kind: 'feature', fn: 'format',
		titles: ['Localised output', 'German unit names', 'i18n support for format', 'How do I format durations in French?'],
		paste: ['none'],
		open: [
			'We ship {proj} in {langs}, and `format` only writes English abbreviations. Is localisation on the roadmap?',
			'Is there a way to get `1 Std. 30 Min.` instead of `1h 30m`? Most of our users are in Germany.'
		],
		expect: ['A `locale` option, or a way to pass unit names.'],
		first: [[['m', 'Not planned, and I would rather not: spanwise has no dependencies and no locale data, and doing localisation properly means plural rules, word order and abbreviations for every language.']]],
		chime: ['`Intl.DurationFormat` is in all the major browsers now, and in Node 23 and later, for what it is worth.'],
		paths: [
			{ end: 'declined',
				mid: [['r', 'Even a way to pass unit names would help, like `{ units: { h: " Std.", m: " Min." } }`.'], ['c', 'That only works for languages where abbreviations have no plural forms, and it would be the first thing people misuse with full words.']],
				close: [[['m', 'I am going to decline this one. The platform has `Intl.DurationFormat` now, which does it properly: `new Intl.DurationFormat("de", { style: "short" }).format({ hours: 1, minutes: 30 })`. spanwise stays with its short English units.']]] },
			{ end: 'answered',
				mid: [['m', 'The platform can do it, though: split the span with spanwise and hand it to `Intl.DurationFormat`:\n\n```js\nconst NAMES = { d: \'days\', h: \'hours\', m: \'minutes\', s: \'seconds\' };\nconst parts = Object.fromEntries(\n  format(span).split(\' \').map((part) => {\n    const [, amount, unit] = /^(\\d+)(\\w+)$/.exec(part);\n    return [NAMES[unit], Number(amount)];\n  })\n);\nnew Intl.DurationFormat(\'de\', { style: \'short\' }).format(parts); // "1 Std., 30 Min."\n```']],
				close: [[['r', 'That is clever, thanks. It works in the browsers we support.']], [['r', 'Nice, I did not know `Intl.DurationFormat` existed. That solves it.']]] }
		]
	},
	{
		key: 'clock', from: '2024-03-28', kind: 'feature', fn: 'format',
		titles: ['Clock-style output (hh:mm:ss)', 'format as 01:30:00', 'Support colon notation in parse and format'],
		paste: ['none', 'snippet'],
		open: [
			'For {proj} we need durations like `01:30:00` as well as `1h 30m`. Could `format` have a clock style?',
			'Our video timestamps look like `1:04:32`. Would you accept a `clock: true` option for `format`, and the same in `parse`?'
		],
		expect: ['`format(5400000, { style: "clock" })` returning `"01:30:00"`, or similar.'],
		first: [[['c', 'That is a different notation with its own questions: days, hours over 24, leading zeros, fractions of seconds.']]],
		chime: ['For video timestamps there is no single right answer: video sites write `1:04:32`, subtitle files write `01:04:32,000`.'],
		paths: [
			{ end: 'declined',
				mid: [['r', 'Leading zeros and hours past 24 would cover nearly everyone.']],
				close: [[['m', 'We talked about it and it is out of scope: spanwise does one notation, the one with unit letters. A clock string is a few lines with `padStart`, and every app wants it slightly differently. Declining, with thanks for the clear request.']]] },
			{ end: 'answered',
				mid: [['m', 'For what you describe it is short enough to keep in your code:\n\n```js\nconst clock = (ms) =>\n  [3_600_000, 60_000, 1_000]\n    .map((size, i) => String(Math.floor(ms / size) % (i ? 60 : Infinity)).padStart(2, \'0\'))\n    .join(\':\');\n\nclock(5_400_000); // "01:30:00"\n```']],
				close: [[['r', 'Perfect, that is all we needed. Thanks.']]] }
		]
	},
	{
		key: 'gaps', from: '2024-03-15', kind: 'question', fn: 'format',
		titles: ['format skips zero units in the middle', 'Expected "1d 0h 0m 1s"', 'Keep zero units in format output'],
		inputs: ['86401000', '3600005000', '90000000', '7260000'],
		calls: (i) => [['format', Number(i)]],
		paste: ['repl', 'none'],
		open: [
			'`format({in})` returns `{out}`, which hides that the units in between were zero. For a table in {proj} we want every unit shown so the columns line up.',
			'Is it a bug that zero units are skipped? `format({in})` gives `{out}`.'
		],
		expect: ['An option to keep zero units, for example `1d 0h 0m 1s`.'],
		first: [[['m', 'Not a bug: skipping empty units is intended, and there is a test for it ("skips empty units"). `1d 1s` is how a person would say it.']]],
		chime: ['For aligned columns you probably want fixed-width fields anyway, which is a different thing from what spanwise writes.'],
		paths: [
			{ end: 'answered',
				close: [[['r', 'Understood, I will build the table cells myself from the numbers. Thanks.']], [['r', 'OK, I see the test. Makes sense for normal text; we will do our own thing for the table.'], ['m', 'Thanks for understanding.']]] },
			{ end: 'declined',
				mid: [['r', 'Would an option, `{ zeros: true }`, be acceptable?']],
				close: [[['c', 'I do not think it pulls its weight: it is only useful for tables, and tables want fixed widths and padding as well, which spanwise will not do. Declining, sorry.']]] }
		]
	},
	{
		key: 'strings', from: '2025-08-26', kind: 'bug', fn: 'format',
		titles: ['format crashes in Safari', 'TypeError: format expects a finite number', 'format() fails on iOS but works on desktop', 'Random TypeError from format in production'],
		inputs: ['5400000', '90000', '3600000'],
		calls: () => [['format', Number.NaN]],
		paste: ['stack'],
		open: [
			'Our page crashes for some users with `TypeError: format expects a finite number`. It works on my machine, and the value is definitely a number; I can see `{in}` in the logs.',
			'`format` throws `format expects a finite number` when I pass the duration from {src}. The value prints as a number.'
		],
		expect: ['It should format the duration.'],
		first: [[['m', 'Could you log `typeof value` right before the call? `format` throws exactly this when it gets anything that is not a finite number, and strings that look like numbers are the usual suspect: `console.log` prints `"{in}"` and `{in}` the same way.']]],
		chime: ['Classic: values from `input.value`, `dataset` or a query string are always strings.'],
		paths: [
			{ end: 'answered',
				mid: [['r', 'You are right, `typeof` says string. It comes from a `data-` attribute on mobile, and on desktop we read it from our state instead. Sorry for the noise.']],
				close: [[['m', 'No problem, it is an easy one to fall into. `format(Number(value))` will do it.']], [['m', 'Glad it is found. `Number(el.dataset.duration)` before the call fixes it.'], ['r', 'Done, and the error is gone from our logs.']]] },
			{ end: 'declined',
				mid: [['r', 'It is a string, yes. Could `format` accept numeric strings? It would save a lot of `Number()` calls.'], ['c', 'Then `format("")`, `format("1e3")` and `format(" 12 ")` all need an answer, and we are back to parsing. The TypeError catches real mistakes, like this one.']],
				close: [[['m', 'Declining: `format` takes a number, and a clear error for anything else is the point. `format(Number(value))` at the call site is the fix.']]] }
		]
	},
	{
		key: 'nonfinite', from: '2024-03-20', to: '2025-08-15', fixed: '0.5.0', kind: 'bug', fn: 'format',
		titles: ['format(Infinity) returns "Infinityd"', 'format(NaN) silently returns ""', 'Non-finite input should throw'],
		paste: ['none'],
		open: [
			'`format(Infinity)` returns `"Infinityd"`, and `format(NaN)` returns an empty string. Both hide bugs in our code; I would rather get an error.\n\n```js\nformat(Infinity); // "Infinityd"\nformat(NaN);      // ""\nformat(1 / 0);    // "Infinityd"\n```',
			'We had a division by zero upstream and the UI showed "Infinityd". It took a while to find, because nothing threw.'
		],
		expect: ['Throw a TypeError for NaN and Infinity.'],
		first: [[['m', 'Agreed, both of those are garbage in, garbage out. A TypeError is the right answer.']]],
		chime: ['Please throw. "Infinityd" made it to production for us.'],
		paths: [
			{ end: 'fixed',
				mid: [['r', 'Thanks. Any chance of a release with this soon?'], ['m', 'It will be in a coming release; I want to get `largest` in at the same time.']],
				close: [
					[['m', 'Released in {rel} ({reldate}): `format` now throws `TypeError: format expects a finite number` for NaN, Infinity and anything that is not a number. There is a test, "rejects a non-finite span".']],
					[['c', 'This is in {rel}. Sorry it took a while; the release waited for another feature.'], ['r', 'Upgraded, works. Thanks!']]
				] }
		]
	},
	{
		key: 'negative', from: '2024-03-15', to: '2025-03-03', fixed: '0.4.0', kind: 'bug', fn: 'format',
		titles: ['format(-90000) returns "23h 58m 30s"', 'Negative spans format as nonsense', 'Wrong output for negative durations'],
		paste: ['none'],
		open: [
			'`format` gives strange results for negative spans:\n\n```js\nformat(-90000);   // "23h 58m 30s"\nformat(-3600000); // "23h"\n```\n\nWe show how far a train is ahead of or behind its timetable, so early trains say they are nearly a day late.',
			'Negative input produces something that looks valid but is wrong: `format(-90000)` returns `"23h 58m 30s"`. I would expect `-1m 30s`, or an error.'
		],
		expect: ['Keep the sign: `format(-90000)` should be `-1m 30s`.'],
		first: [[['m', 'Yes, that is a bug. The loop floors a negative number for days, gets -1, and carries a whole day into the remaining units. A leading minus is the obvious output.']]],
		chime: ['Would `parse` read the minus back? Asking for later.'],
		paths: [
			{ end: 'fixed',
				close: [
					[['m', 'This was fixed in {rel}, released {reldate}: `format` keeps the sign, so `format(-90000)` is `-1m 30s`. The issue should have been closed with it.'], ['r', 'Confirmed, thanks.']],
					[['c', 'Done in {rel}: negative spans keep their sign. There is a test now, "keeps the sign of a negative span".']]
				] }
		]
	},
	{
		key: 'millis', from: '2024-07-01', to: '2026-09-08', fixed: '0.6.0', kind: 'feature', fn: 'format',
		titles: ['Show milliseconds in format', 'format drops milliseconds', 'Option to include ms', 'Sub-second precision in format output'],
		paste: ['none', 'snippet'],
		open: [
			'`format(1250)` returns `"1s"`, and I cannot find a way to see the 250 ms. For {proj} the milliseconds are the interesting part.',
			'parse reads `ms`, but format never writes it. `format(parse("1s 250ms"))` is `"1s"`, so the round trip loses data.'
		],
		expect: ['An option to include milliseconds, off by default.'],
		first: [[['m', 'Fair. Milliseconds are hidden by default because most spans shown to people do not want them, but there should be a way to turn them on.']], [['c', 'Good point about the round trip. That alone is a reason to have it.']]],
		chime: ['+1, we need this for request timings.', 'Please keep it off by default. Our UI would get very noisy.'],
		paths: [
			{ end: 'fixed',
				mid: [['k', 'Name suggestions: `ms: true`, `precision: "ms"`, or `smallest: "ms"`?'], ['m', '`smallest` is tempting because it pairs with `largest`, but nobody has asked for `smallest: "m"`. `ms: true` is simplest.']],
				close: [[['m', 'This shipped in {rel} on {reldate} as the `ms` option: `format(1250, { ms: true })` is `"1s 250ms"`. It is in the changelog; I forgot to close this.'], ['b', 'Thanks! Works nicely.']]] },
			{ end: 'fixed',
				close: [[['c', 'Added in {rel}: `format(1250, { ms: true })` returns `"1s 250ms"`, and the default is unchanged.']]] }
		]
	},
	{
		key: 'types', from: '2024-04-10', kind: 'feature', uses: 'format',
		diff: "--- /dev/null\n+++ b/src/index.d.ts\n@@ -0,0 +1,12 @@\n+export interface FormatOptions {\n+  /** The most units to show; all by default. */\n+  largest?: number;\n+  /** Whether to show milliseconds; false by default. */\n+  ms?: boolean;\n+}\n+\n+/** Formats a span in milliseconds, such as 5400000 as \"1h 30m\". */\n+export function format(span: number, options?: FormatOptions): string;\n+\n+/** Parses a span such as \"1h 30m\" into milliseconds. */\n+export function parse(text: string): number;", diffFrom: '0.6.0',
		titles: ['TypeScript types', 'Could not find a declaration file for module spanwise', 'No autocomplete for spanwise in VS Code', 'Ship an index.d.ts'],
		paste: ['tsc', 'none'],
		open: [
			'spanwise has no type declarations, so in our TypeScript project every import is `any`:\n\n{tsc}',
			'VS Code shows no parameter hints or options for `format`, so I keep opening the README to check what `largest` takes. Is that expected?',
			'Would you accept a hand-written `index.d.ts`? It is only two functions.'
		],
		expect: ['A declaration file in the package and a `types` field in package.json.'],
		first: [[['m', 'There are no declarations yet, no. spanwise is plain JavaScript, and I have been reluctant to add anything that has to be kept in sync by hand.']], [['c', 'Right, nothing ships today. The editor part is a symptom of the same thing: without declarations, it can only guess.']]],
		chime: ['In the meantime, `declare module "spanwise";` in a `.d.ts` file of your own silences the error, though you get no types from it.', 'Please do this. It is the one thing that makes me hesitate to recommend spanwise at work.', 'JSDoc types in src/index.js would get the editors most of the way without a build step, if a separate file is the worry.'],
		paths: [
			{ end: 'agreed',
				mid: [['k', 'I wrote one for our project: twenty lines with doc comments. Happy to open a PR with it and a check that it matches the exports.'], ['m', 'Twenty lines I can live with, if something checks them. OK, you have convinced me.']],
				close: [[['m', 'Agreed: a hand-written `src/index.d.ts`, a `types` field in package.json, and a small test that the declared exports exist. {contrib}, it is yours if you still want it; nothing has been opened yet.']]] },
			{ end: 'agreed',
				close: [[['m', 'Let us do it: a hand-written declaration file next to `src/index.js` and a `types` field. Not started; whoever picks it up, please keep the option docs in step with the README.']]] },
			{ end: 'dup',
				close: [[['c', 'Same as {dup}, where we agreed to ship a hand-written declaration file. Nothing released yet.']]] }
		]
	},
	{
		key: 'commonjs', from: '2025-01-10', kind: 'question', uses: 'parse',
		titles: ['Cannot require spanwise', 'ERR_REQUIRE_ESM', 'CommonJS build?', 'ExperimentalWarning when requiring spanwise'],
		paste: ['require'],
		open: [
			'We have a CommonJS codebase, and `require("spanwise")` does not work the way I expected:\n\n{require}',
			'Requiring spanwise from our CommonJS server gives this:\n\n{require}\n\nAre you planning a CommonJS build?'
		],
		expect: ['A CommonJS build, or an `exports` map with a `require` condition.'],
		first: [[['m', 'spanwise is ES modules only, and that is not going to change: it is one file with no build step. Two ways to use it from CommonJS:\n\n- On Node 22.12 or later, `require("spanwise")` works; the warning is Node telling you that requiring ES modules is new, and it goes away in later versions.\n- On any version, `const { parse } = await import("spanwise")` inside an async function.']]],
		chime: ['We moved the one file that uses spanwise to `.mjs`, and the rest of the app stayed CommonJS. Painless.', 'The warning is gone on newer Node 22 and 24 releases, for what it is worth.'],
		paths: [
			{ end: 'answered',
				close: [[['r', 'Dynamic import it is. Thanks for the quick answer.']], [['r', 'We are on 22 anyway, so the warning is fine. Thanks.']]] },
			{ end: 'declined',
				mid: [['r', 'A dual build would make this a non-issue for everyone, though. Lots of packages do it.'], ['c', 'Lots of packages also have the dual-package hazard bugs that come with it. With no build step, spanwise cannot have them.']],
				close: [[['m', 'No CommonJS build, sorry: spanwise stays one ES module with nothing to build, and the README says Node 22 or later, where `require` works. Declining.']]] },
			{ end: 'answered',
				titles: ['Cannot read properties of undefined (reading "parse")', 'spanwise import works in Node but not in our bundle'],
				expect: ['It should import like any other package.'],
				open: ['After switching to spanwise, our bundled app fails with `Cannot read properties of undefined (reading \'parse\')`. We import it like this:\n\n```js\nimport spanwise from \'spanwise\';\n\nconst ms = spanwise.parse(\'5m\');\n```'],
				paste: ['none'],
				first: [[['m', 'spanwise has no default export, only the named exports `format` and `parse`. Use `import { parse } from "spanwise"`. Some bundlers invent a default export and some do not, which is why it works in one place and not in another.']]],
				close: [[['r', 'That was it. The library we replaced had a default export, and I copied the pattern. Thanks.']]] }
		]
	},
	{
		key: 'exports', from: '2024-06-01', kind: 'feature', uses: 'format',
		diff: "--- a/package.json\n+++ b/package.json\n@@ -5,4 +5,6 @@\n   \"license\": \"MIT\",\n   \"type\": \"module\",\n   \"main\": \"src/index.js\",\n+  \"exports\": \"./src/index.js\",\n+  \"sideEffects\": false,\n   \"scripts\": {",
		titles: ['Add an "exports" field and "sideEffects": false', 'package.json has no exports map', 'spanwise is not tree-shaken'],
		paste: ['bundle', 'none'],
		open: [
			'package.json only has `main`. An `exports` map would stop people importing internal files, and `"sideEffects": false` would let bundlers drop spanwise from chunks that do not use it. Here is what our analyser shows:\n\n{bundle}',
			'Our bundler keeps spanwise in every chunk, even the ones that never call it. Adding `"sideEffects": false` to package.json usually fixes that.'
		],
		expect: ['`"exports": "./src/index.js"` and `"sideEffects": false` in package.json.'],
		first: [[['m', 'Neither is there, true. spanwise is 1.4 kB, so this was never urgent, but both are cheap.']]],
		chime: ['Careful with `exports`: it breaks anyone deep-importing `spanwise/src/index.js`.', 'Is anyone actually deep-importing? There is only one file.'],
		paths: [
			{ end: 'agreed',
				mid: [['c', 'If we add `exports`, it should be in a minor with a changelog line, in case someone imports the file path directly.']],
				close: [[['m', 'Agreed: `"exports": "./src/index.js"` and `"sideEffects": false`, in the next minor, with a changelog note about deep imports. Nobody has done it yet.']]] },
			{ end: 'reporter',
				first: [[['m', 'spanwise has no side effects, so a bundler should drop it from chunks that do not import it, even without the field. Which bundler and version are you using, and could you share the config or a small repository that shows it?']]],
				close: [[['m', 'I would still like to see the bundler config. Without it I cannot tell whether the field would help or whether something else keeps the module in.']]] }
		]
	},
	{
		key: 'tarball', from: '2026-09-15', kind: 'feature',
		diff: "--- a/package.json\n+++ b/package.json\n@@ -5,4 +5,5 @@\n   \"license\": \"MIT\",\n   \"type\": \"module\",\n   \"main\": \"src/index.js\",\n+  \"files\": [\"src\"],\n   \"scripts\": {",
		titles: ['Published package includes tests and scripts', 'Add a "files" field to package.json', 'node_modules/spanwise contains bench and test folders'],
		paste: ['ls'],
		open: [
			'The published package contains the tests, the benchmark and the repository scripts, none of which a user needs:\n\n{ls}',
			'Small thing: the npm tarball ships `test/`, `bench/` and `scripts/`. A `files` field in package.json would keep it to `src/` and the README.'
		],
		expect: ['`"files": ["src"]` in package.json.'],
		first: [[['c', 'True. We never set `files`, so npm packs everything that is not ignored.']]],
		chime: ['48 kB is not going to hurt anyone, but it is tidier.'],
		paths: [
			{ end: 'agreed',
				mid: [['m', 'Agreed, but someone should check the result with `npm pack --dry-run` first, so we do not drop the README or the changelog.']],
				close: [[['m', 'Decision: add `"files": ["src"]`; npm always includes package.json, the README and the licence. Not done yet.']]] },
			{ end: 'dup',
				close: [[['m', 'This is {dup}. We agreed there to add a `files` field; nobody has got to it.']]] }
		]
	},
	{
		key: 'jest', from: '2024-05-01', kind: 'bug', uses: 'parse',
		titles: ['spanwise breaks our test suite', 'Jest: SyntaxError: Unexpected token export', 'Tests fail after adding spanwise'],
		paste: ['jest'],
		open: [
			'As soon as we import spanwise, our Jest suite fails to start:\n\n{jest}',
			'Our app runs fine, but every test file that touches spanwise fails with a syntax error:\n\n{jest}\n\nIs there a CommonJS entry point we should use?'
		],
		expect: ['The tests should run.'],
		first: [[['m', 'Jest runs your tests as CommonJS by default and does not transform `node_modules`, so it cannot load an ES module like spanwise. Two options: run Jest in ESM mode (`node --experimental-vm-modules node_modules/jest/bin/jest.js`), or let Babel transform spanwise with `transformIgnorePatterns: ["/node_modules/(?!spanwise)"]`.']]],
		chime: ['We moved to `node --test` for small projects and this whole class of problem went away.', 'Vitest handles this out of the box, if switching is an option.'],
		paths: [
			{ end: 'answered',
				close: [[['r', 'The `transformIgnorePatterns` line did it. Thanks!']], [['r', 'ESM mode works. A bit of a hassle, but not your problem. Thanks for the pointers.']]] },
			{ end: 'reporter',
				mid: [['r', 'Tried `transformIgnorePatterns`, same error.'], ['m', 'Then your Babel config probably does not apply to `node_modules` at all. Could you paste your jest.config and your babel.config (or .babelrc)? A `babel.config.js` at the root applies to dependencies; a `.babelrc` does not.']],
				close: [[['b', 'That `.babelrc` against `babel.config.js` thing got me too, last year.'], ['m', 'Still waiting on the configs to say more.']]] }
		]
	},
	{
		key: 'node', from: '2025-08-26', kind: 'question',
		diff: "--- a/package.json\n+++ b/package.json\n@@ -5,4 +5,7 @@\n   \"license\": \"MIT\",\n   \"type\": \"module\",\n   \"main\": \"src/index.js\",\n+  \"engines\": {\n+    \"node\": \">=22\"\n+  },\n   \"scripts\": {",
		titles: ['Does spanwise work on Node 20?', 'Node version support', 'Add an engines field', 'README says Node 22, but 20 seems to work'],
		paste: ['none'],
		open: [
			'The README says "Node 22 or later". We are stuck on Node 20 for a while. Does anything in spanwise actually need 22?',
			'The README says Node 22 or later, but nothing stops people installing it on older versions. Is 22 a hard requirement or a recommendation?'
		],
		expect: ['Clarify whether older versions are supported.'],
		first: [[['m', 'Nothing in src/index.js needs 22 as far as I know: it is plain modern JavaScript. But 22 is all we develop and test on, so it is what we promise.']]],
		chime: ['We run it on 20 in production without problems, for what it is worth.'],
		paths: [
			{ end: 'answered',
				close: [[['r', 'That is enough for us: it works, and we know it is unsupported. Thanks.']], [['m', 'So: it should work on 20, but if something breaks there we will only fix it if the fix does not hurt 22.'], ['r', 'Fair. Thanks for the straight answer.']]] },
			{ end: 'agreed',
				titles: ['Add an engines field', 'package.json should declare the Node version'],
				expect: ['An `engines` field that matches the README.'],
				open: ['Could you add an `engines` field to package.json? The README says Node 22 or later, but npm cannot warn anyone about it without the field.'],
				mid: [['c', 'An `engines` field is a good idea; it is the machine-readable version of what the README already says.']],
				close: [[['m', 'Agreed: add `"engines": { "node": ">=22" }` to package.json, matching the README. Nobody has done it yet.']]] }
		]
	},
	{
		key: 'site', from: '2024-06-20', kind: 'bug',
		diff: "--- a/scripts/build-site.js\n+++ b/scripts/build-site.js\n@@ -3,2 +3,6 @@\n const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');\n-const inline = (text) => escape(text).replace(/`([^`]+)`/g, '<code>$1</code>');\n+const inline = (text) =>\n+  escape(text)\n+    .replace(/`([^`]+)`/g, '<code>$1</code>')\n+    .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')\n+    .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href=\"$2\">$1</a>');\n@@ -16,2 +20,3 @@ for (const line of readFileSync('README.md', 'utf8').split('\\n')) {\n-  else if (line.startsWith('## ')) html.push(`<h2>${inline(line.slice(3))}</h2>`);\n+  else if (line.startsWith('### ')) html.push(`<h3>${inline(line.slice(4))}</h3>`);\n+  else if (line.startsWith('## ')) html.push(`<h2>${inline(line.slice(3))}</h2>`);",
		titles: ['Docs site shows "###" literally', 'Links in the README are not rendered on the docs site', 'Docs site renders Markdown badly', 'Site generator ignores bold, links and sub-headings'],
		paste: ['site'],
		open: [
			'I was adding an "Options" section to the README, and the docs site shows the sub-heading as text. The generated HTML:\n\n{site}',
			'The site generator only knows `#`, `##`, lists and code blocks. Anything else in the README turns up as raw Markdown:\n\n{site}'
		],
		expect: ['Render `###` headings, links, bold and numbered lists.'],
		first: [[['m', 'Right: scripts/build-site.js is deliberately tiny, and it only does what the README used at the time. We have been keeping the README inside that.']], [['c', 'Yes, the generator is twenty-odd lines and knows very little. That has been fine while the README was short.']]],
		chime: ['Links are the one I miss most: the README cannot point at the changelog.', 'Please keep it dependency-free if you extend it. Having nothing to install for development is lovely.'],
		paths: [
			{ end: 'agreed',
				mid: [['k', 'I can extend it: `###` headings, inline links, bold and numbered lists, still with no dependencies. Maybe forty lines in all.']],
				close: [[['m', 'Agreed: teach build-site.js `###` headings, links, bold and numbered lists, no dependencies. {contrib}, go ahead whenever you have time; nothing has been opened yet.']]] },
			{ end: 'dup',
				close: [[['c', 'Same as {dup}, where we agreed to teach the generator links, bold, `###` and numbered lists. Not done yet.']]] },
			{ end: 'declined',
				titles: ['Use a real Markdown library for the docs site', 'Switch the docs site to a static site generator'],
				expect: ['Build the site with a Markdown library instead.'],
				open: ['scripts/build-site.js handles a small subset of Markdown, and every new README feature needs a change to it:\n\n{site}\n\nWhy not use a Markdown library or a static site generator and get all of Markdown for free?'],
				mid: [['c', 'Because then there is something to install. "There is nothing to install beyond Node itself" is a promise in the README, and it covers development too.']],
				close: [[['m', 'Declining the switch: we will keep a small generator with no dependencies, and teach it the few things the README needs as they come up.']]] }
		]
	},
	{
		key: 'mobile', from: '2024-06-20', kind: 'bug',
		diff: "--- a/scripts/build-site.js\n+++ b/scripts/build-site.js\n@@ -23,4 +23,4 @@ mkdirSync('site/dist', { recursive: true });\n writeFileSync(\n   'site/dist/index.html',\n-  `<!doctype html>\\n<meta charset=\"utf-8\">\\n<title>spanwise</title>\\n${html.join('\\n')}\\n`\n+  `<!doctype html>\\n<meta charset=\"utf-8\">\\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\\n<title>spanwise</title>\\n<style>body{max-width:42rem;margin:auto;padding:1rem;font:16px/1.5 system-ui}pre{overflow-x:auto}</style>\\n${html.join('\\n')}\\n`\n );",
		titles: ['Docs site is tiny on phones', 'Docs site not readable on mobile', 'Add a viewport meta tag to the docs site', 'Code blocks overflow on the docs site'],
		paste: ['head', 'none'],
		open: [
			'On a phone the docs site renders at desktop width, and you have to zoom to read anything. The page has no viewport tag:\n\n{head}',
			'The docs site has no styles at all, and on a phone the code examples run off the screen.'
		],
		expect: ['`<meta name="viewport" content="width=device-width, initial-scale=1">` and a few lines of CSS.'],
		first: [[['m', 'Ha, true. The generator writes the bare minimum. A viewport tag and a short stylesheet are easy wins.']]],
		chime: ['A max-width on the body and `overflow-x: auto` on `pre` would cover most of it.'],
		paths: [
			{ end: 'agreed',
				mid: [['b', 'Please no web fonts or frameworks, though. The plainness is nice.']],
				close: [[['m', 'Agreed: a viewport tag, a max width and readable code blocks, all inline in what build-site.js writes. Up for grabs.']]] },
			{ end: 'dup',
				close: [[['c', 'This is {dup}: we agreed to add a viewport tag and a little CSS to the generated page. Not done yet.']]] }
		]
	},
	{
		key: 'errordocs', from: '2025-08-26', kind: 'feature',
		titles: ['Document what parse and format throw', 'README does not mention errors', 'Docs: which error does parse throw?'],
		paste: ['none'],
		open: [
			'The README says nothing about errors. I had to read src/index.js to learn that `parse` throws a SyntaxError for bad input and a TypeError for non-strings, and `format` a TypeError for non-numbers.',
			'What should I catch around `parse`? The README does not say, and I do not want to swallow real bugs.'
		],
		expect: ['A short "Errors" section in the README.'],
		first: [[['m', 'Fair. The split is deliberate (TypeError for the wrong type, SyntaxError for bad text), so it deserves to be written down.']]],
		chime: ['Including the empty-string case, please; that one caught us out.'],
		paths: [
			{ end: 'agreed',
				close: [[['m', 'Agreed: an "Errors" section in the README listing what each function throws and when. Not written yet, if anyone wants a documentation contribution.']]] },
			{ end: 'dup',
				close: [[['c', 'Duplicate of {dup}: we agreed to add an "Errors" section to the README.']]] }
		]
	},
	{
		key: 'crlf', from: '2024-06-20', kind: 'bug',
		diff: "--- a/scripts/lint.js\n+++ b/scripts/lint.js\n@@ -19,4 +19,4 @@ let problems = 0;\n for (const file of files) {\n   readFileSync(file, 'utf8')\n-    .split('\\n')\n+    .split(/\\r?\\n/)\n     .forEach((line, index) => {",
		titles: ['npm run lint reports every line on Windows', 'Linter: trailing whitespace on every line', 'Contributing on Windows: lint fails'],
		paste: ['lint'],
		open: [
			'I cloned the repository on Windows to work on a fix, and `npm run lint` reports every single line:\n\n{lint}',
			'On Windows, git checks the files out with CRLF line endings, and scripts/lint.js counts the `\\r` as trailing whitespace:\n\n{lint}\n\nSo nobody on Windows can run the linter cleanly.'
		],
		expect: ['The linter should not count the line ending as whitespace.'],
		first: [[['m', 'Thanks. I have only ever run it on macOS and Linux. `\\s+$` matches the carriage return, so every line fails.']]],
		chime: ['`git config core.autocrlf false` and a fresh clone works around it in the meantime.'],
		paths: [
			{ end: 'agreed',
				mid: [['c', 'Two parts, I think: a `.gitattributes` with `* text=auto eol=lf`, so every clone gets LF line endings, and the linter splitting on `\\r?\\n`, so it does not matter.']],
				close: [[['m', 'Agreed, both of those. Nobody has done it yet; a contributor on Windows would be ideal, since they can check it.']]] },
			{ end: 'dup',
				close: [[['m', 'This is {dup}: CRLF line endings on Windows. We agreed there to add a `.gitattributes` and make the linter ignore `\\r`.']]] }
		]
	},
	{
		key: 'benchout', from: '2026-09-16', kind: 'feature',
		diff: "--- a/bench/run.js\n+++ b/bench/run.js\n@@ -21,4 +21,4 @@ console.log('| Case | ops/sec |');\n console.log('| --- | ---: |');\n for (const [name, fn] of CASES) {\n-  console.log(`| \\`${name}\\` | ${opsPerSecond(fn)} |`);\n+  console.log(`| \\`${name}\\` | ${Math.round(opsPerSecond(fn)).toLocaleString('en-US')} |`);\n }",
		titles: ['bench output is hard to read', 'Round ops/sec in npm run bench', 'Benchmark numbers have too many decimals'],
		paste: ['bench'],
		open: [
			'`npm run bench` prints ops/sec with a long tail of decimals, which makes the table hard to scan and compare:\n\n{bench}',
			'I wanted to paste benchmark numbers into a PR description, and the table is mostly digits after the decimal point:\n\n{bench}'
		],
		expect: ['Whole numbers with thousands separators, like 6,348,634.'],
		first: [[['m', 'Agreed, the decimals are noise: nothing in a micro-benchmark is accurate to a millionth of an operation.']]],
		chime: ['`Math.round(n).toLocaleString("en-US")` gives exactly that.'],
		paths: [
			{ end: 'agreed',
				close: [[['m', 'Let us round to whole numbers with thousands separators, as suggested. A small change in bench/run.js; up for grabs.']]] },
			{ end: 'dup',
				close: [[['c', 'Same as {dup}: rounding the ops/sec column. Agreed, not done yet.']]] }
		]
	},
	{
		key: 'benchnoise', from: '2026-09-16', kind: 'feature',
		titles: ['Benchmark results vary a lot between runs', 'npm run bench is not reliable', 'Make the benchmark more stable'],
		paste: ['bench'],
		open: [
			'Running `npm run bench` twice in a row gives quite different numbers:\n\n{bench2}\n\nIt is hard to tell whether a change made things faster.',
			'Would you take a change that runs each case several times and prints the median and spread? Right now the numbers move by 10 to 20 percent between runs.'
		],
		expect: ['More iterations, several samples and a median.'],
		first: [[['c', 'Micro-benchmarks on a laptop move around that much, yes: CPU frequency, other processes, the JIT.']]],
		chime: ['Close everything else and plug the laptop in; it makes a surprising difference.'],
		paths: [
			{ end: 'declined',
				mid: [['r', 'A median of five runs would already help a lot.']],
				close: [[['m', 'I would rather keep bench/run.js small. It is there to catch large regressions, not to measure 5 percent. If you need more, run it a few times and compare, or use a proper benchmarking tool. Declining, but thanks.']]] },
			{ end: 'answered',
				close: [[['m', 'For comparing two versions: run each a few times on a quiet machine and look at the best result, not the first. The benchmark only needs to show big changes.'], ['r', 'OK, that is good enough for what I am doing. Thanks.']]] }
		]
	},
	{
		key: 'status', from: '2024-09-01', kind: 'question',
		titles: ['Is this project still maintained?', 'Project status?', 'Roadmap and release plans?'],
		paste: ['none'],
		open: [
			'There are quite a few open issues, and the last release was {lastrel}. Is spanwise still maintained? We are deciding whether to depend on it.',
			'Not a bug, just a question: what are the plans for spanwise? Is a 1.0 coming?'
		],
		expect: [''],
		first: [[['m', 'Yes, it is maintained, by {other} and me in our spare time. spanwise is small on purpose, and "done" is a perfectly good state for it, so releases are infrequent.']]],
		chime: ['We have used it in production for a year without a single problem, for what it is worth.'],
		paths: [
			{ end: 'answered',
				mid: [['c', 'On 1.0: when parsing and formatting have settled. The open issues are mostly small things or requests we have decided against; the tracker needs a tidy more than the code needs work.']],
				close: [[['r', 'Thanks, that is reassuring. We will go with it.']], [['r', 'Good to know. Thanks for the honest answer.']]] }
		]
	},
	{
		key: 'relative', from: '2024-04-20', kind: 'feature',
		titles: ['Relative time ("3 days ago")', 'Humanize dates', 'Add a between(dateA, dateB) helper'],
		paste: ['none'],
		open: [
			'Could spanwise also produce relative phrases like "3 days ago" or "in 2 hours"? We already use it for durations, and it would be nice not to need a second library.',
			'A helper that takes two dates and returns the span between them would save boilerplate: `between(start, end)`.'
		],
		expect: ['`ago(date)` or `between(a, b)`.'],
		first: [[['m', 'Thanks for the suggestion. spanwise is about spans as numbers of milliseconds, and nothing else; dates and "ago" bring in time zones and calendars.']]],
		chime: ['`Intl.RelativeTimeFormat` does "3 days ago" in every language already.', '`format(end - start)` is the whole `between` helper, though.'],
		paths: [
			{ end: 'declined',
				close: [
					[['m', 'Declining: `format(end - start)` covers the span between two dates, and `Intl.RelativeTimeFormat` does relative phrases properly. Out of scope for spanwise.']],
					[['c', 'We are going to say no to this one; it is a different library. `Intl.RelativeTimeFormat` is built into the platform and handles it well.'], ['r', 'Fair enough, thanks.']]
				] }
		]
	},
	{
		key: 'ranges', from: '2024-03-20', kind: 'question',
		titles: ['Parse business hours like "Mon-Fri 9-17"', 'Cannot parse time ranges', 'Does spanwise handle time ranges?'],
		calls: () => [['parse', '9:00-17:30'], ['parse', '8h 30m']],
		paste: ['repl'],
		open: [
			'I expected spanwise to parse spans like `Mon-Fri 9-17` or `09:00-17:30`, but everything I try throws `invalid duration`:\n\n{repl}',
			'Trying to parse opening hours with spanwise: `parse("9:00-17:30")` throws. Am I using it wrong?'
		],
		expect: [''],
		first: [[['m', 'I think the name misled you: a "span" in spanwise is a length of time, like `8h 30m`, not a range between two times of day. There is no support for times of day or weekdays, and none is planned.']]],
		chime: ['Ha, I had the same assumption from the name for about five minutes.'],
		paths: [
			{ end: 'answered',
				close: [
					[['r', 'Ah, that explains it. Sorry for the noise, and thanks.']],
					[['r', 'Understood. Back to searching, then.'], ['m', 'Good luck. For what it is worth, `parse("8h 30m")` will at least give you the length of the day once you have the range.']]
				] }
		]
	}
];

// What reporters say about their projects, with {biz} and {n} filled per issue.
const businesses = ['an online bookshop', 'a ticketing startup', 'a regional newspaper', 'a bike rental company', 'a university IT team', 'a two-person agency', 'a hospital rota team', 'a game studio', 'a logistics company', 'a language school', 'a public library service', 'a coffee roaster', 'a small software company', 'a chain of climbing gyms', 'a community radio station'];
const about: Record<string, string[]> = {
	'tomato-cli': ['It has a few hundred users who keep it open in a terminal all day: you give it a work span and a break span and it counts down.', 'People start it with something like `tomato 50m 10m` and keep the countdown in a corner of the screen.'],
	'queue-worker': ['It runs about {n} background jobs for {biz}, and every job has a timeout and a retry delay in a YAML file that the operations team edits.', 'The worker reads its schedule from queue.yml at startup, so one bad value there stops the whole thing until someone fixes the file.'],
	podshelf: ['It belongs to {biz} and has about {n} episodes, and episode lengths are shown everywhere: lists, cards and the player itself.', 'Lengths come from the CMS as text that editors type, and we show them back to listeners in a shorter form.'],
	'nudge-bot': ['It lives in the chat of {biz}: people write `/remind 20m stand-up notes`, and about {n} reminders a day go through it.', 'Everything after the command is typed by a person in a chat window, on a phone as often as not.'],
	hourglass: ['Freelancers at {biz} log their time in a CSV, and we add it up for invoices; there are about {n} rows a month.', 'The CSV is filled in by hand, by people who all have their own habits.'],
	logsift: ['We built it at {biz} to read access logs and print the slowest routes; we look at the p95 for each of about {n} routes.', 'Most of the numbers it prints are well under a second, which is why the milliseconds matter to us.'],
	liftlog: ['It has about {n} weekly users, and the duration field is free text.', 'People log a session on their phone right after training, so whatever they type is what we get.'],
	'hearthstone-rules': ['Users write rules such as "turn off hallway after 15m"; there are about {n} rules on my own install.', 'The rules are plain text that people write themselves, and most of them are not programmers.'],
	'orders-api': ['It handles orders for {biz} and is configured through environment variables, about {n} of which are spans: cache lifetimes, rate-limit windows and timeouts.', 'Settings are read once at startup, so a bad value stops the service from starting rather than failing a request.'],
	splitstream: ['About {n} runners use it, and the splits are where milliseconds matter.', 'Runners compare splits to the hundredth of a second, so whatever we display has to be exact.'],
	coursekit: ['It hosts courses for {biz}; instructors write lesson metadata in front matter, about {n} lessons so far.', 'Each lesson card shows its length, written by the instructor and shown back in a short form.'],
	quire: ['It has a watch mode, and we use it for the handbook of {biz} among other things.', 'It prints how long each build took, and most builds take a second or two.'],
	'egg-timer': ['It runs in the browser and works offline; about {n} people use it, mostly on phones.', 'You type a span or press one of the preset buttons, and it counts down.'],
	pulseboard: ['It watches about {n} services for {biz}, with alert rules in a JSON file.', 'Alert rules say how long something has to be down before anyone is woken up.']
};
// Helpers that commenters keep spanwise behind.
const helpers: { fn: 'parse' | 'format'; say: string; code: string }[] = [
	{ fn: 'parse', say: 'All our calls go through one helper, so that is where anything on our side would go:', code: "// lib/duration.js\nimport { parse } from 'spanwise';\n\nexport function toMs(text, { fallback, field } = {}) {\n  if (text === undefined || text === null) return fallback;\n  try {\n    return parse(String(text));\n  } catch (error) {\n    if (error instanceof SyntaxError) {\n      throw new Error(`${field ?? 'duration'}: cannot read \"${text}\"`, { cause: error });\n    }\n    throw error;\n  }\n}" },
	{ fn: 'parse', say: 'We check settings at startup with a small schema helper, which is where we ran into it:', code: "import { parse } from 'spanwise';\n\nexport const duration = (name) => (value) => {\n  const ms = parse(value);\n  if (ms <= 0) throw new RangeError(`${name} must be longer than zero`);\n  return ms;\n};\n\nconst schema = {\n  timeout: duration('timeout'),\n  retryDelay: duration('retry_delay'),\n};" },
	{ fn: 'format', say: 'This is the helper all our views use, for context:', code: "import { format } from 'spanwise';\n\nexport function humanSpan(ms, { short = false } = {}) {\n  if (ms === null || ms === undefined) return '–';\n  return format(ms, short ? { largest: 2 } : {});\n}" },
	{ fn: 'format', say: 'Ours goes through this, which also feeds the CSV export:', code: "import { format } from 'spanwise';\n\nexport const spanCell = (row) => ({\n  value: row.elapsedMs,\n  text: format(row.elapsedMs, { largest: 3 }),\n});" }
];
// Extra discussion by kind of issue, before the decision.
const extras: Record<Topic['kind'], Msg[][]> = {
	feature: [
		[['b', 'Whatever you decide, please keep spanwise free of dependencies. It is the main reason we picked it.']],
		[['x', 'Out of curiosity, how big is spanwise now? Small enough that I never checked.'], ['c', 'About 1.4 kB minified, before compression. Most of that is the two functions and the unit table.']],
		[['b', 'If anything changes here, a line in the changelog would help; we read it before every upgrade.']]
	],
	bug: [
		[['b', 'Is a release planned soon? Just so we know whether to keep our workaround in place.'], ['m', 'No date yet. Releases happen when there is something worth releasing.']],
		[['x', 'I checked whether this is new: {prev} behaves the same as {ver} here.']],
		[['b', 'A test for this case would be good whatever happens. Happy to help write one.']]
	],
	question: [
		[['x', 'Maybe worth a FAQ section in the README? This kind of question keeps coming up.']],
		[['b', 'Thanks for asking this; I was about to.']]
	]
};

/** The code in question, as src/index.js had it in that release. */
const sourceExcerpt = (fn: 'parse' | 'format', ver: string) => {
	if (fn === 'parse') {
		const split = ver >= '0.6.1' ? 'text.trim().split(/\\s+/)' : ver >= '0.3.0' ? 'text.split(/\\s+/).filter(Boolean)' : "text.split(' ')";
		const guard = ver >= '0.5.0' ? "  if (typeof text !== 'string') throw new TypeError('parse expects a string');\n" : '';
		return fence(
			'js',
			`const PART = /^(\\d+)(${ver >= '0.3.0' ? 'ms|d|h|m|s' : 'd|h|m|s'})$/;\n\n/** Parses a span such as "1h 30m" into milliseconds. */\nexport function parse(text) {\n${guard}  let total = 0;\n  for (const word of ${split}) {\n` +
				'    const match = PART.exec(word);\n    if (!match) throw new SyntaxError(`invalid duration: "${text}"`);\n    total += Number(match[1]) * UNIT_MS[match[2]];\n  }\n  return total;\n}'
		);
	}
	const params = ver >= '0.6.0' ? ', { largest = Infinity, ms = false } = {}' : ver >= '0.5.0' ? ', { largest = Infinity } = {}' : '';
	const lines = [`export function format(span${params}) {`];
	if (ver >= '0.5.0') lines.push("  if (!Number.isFinite(span)) throw new TypeError('format expects a finite number');");
	lines.push(...(ver >= '0.4.0' ? ["  const sign = span < 0 ? '-' : '';", '  let rest = Math.abs(Math.round(span));'] : ['  let rest = Math.round(span);']));
	lines.push('  const parts = [];', '  for (const [unit, size] of UNITS) {');
	if (ver >= '0.3.0') lines.push(ver >= '0.6.0' ? "    if (unit === 'ms' && !ms) break;" : "    if (unit === 'ms') break;");
	if (ver >= '0.5.0') lines.push('    if (parts.length > largest) break;');
	lines.push('    const count = Math.floor(rest / size);', '    rest -= count * size;', '    if (count > 0) parts.push(`${count}${unit}`);', '  }', ver >= '0.4.0' ? "  return sign + parts.join(' ');" : "  return parts.join(' ');", '}');
	return fence('js', lines.join('\n'));
};
const sourceSay: Record<'parse' | 'format', [string[], string[]]> = {
	parse: [
		['For reference, this is all `parse` does, in src/index.js on {ver}:', 'The relevant part of src/index.js, for anyone following along:', 'Here is the code in question ({ver}):'],
		['Every word has to match the pattern on its own, and the pattern is the whole grammar.', 'So the grammar is exactly the pattern: digits, then one of the units, one part per word.']
	],
	format: [
		['For reference, this is `format` on {ver}:', 'The relevant part of src/index.js, for anyone following along:', 'Here is the loop in question ({ver}):'],
		['It walks the units from days down and keeps every unit whose count is above zero.', 'Each unit takes the whole number of itself out of what is left, and units with a count of zero are skipped.']
	]
};
/** A clean project that shows the problem, from npm install to the output. */
const reproPaste = (r: Rand, env: Env, call: Call) => {
	const value = run(call);
	const dir = { ...env, dir: 'spanwise-repro' };
	const code = `import { ${call[0]} } from 'spanwise'; console.log(${callText(call)})`;
	const out = ['$ mkdir spanwise-repro && cd spanwise-repro', `$ npm init -y > /dev/null && npm install spanwise@${env.ver}`, '', `added 1 package, and audited 2 packages in ${int(r, 300, 1900)}ms`, '', 'found 0 vulnerabilities', `$ node --input-type=module -e "${code}"`];
	if (value instanceof Error) {
		const [line, source, column] = SOURCE_LINE[call[0]]!;
		const lib = pathIn(dir, 'node_modules/spanwise/src/index.js');
		out.push(`${lib}:${line}`, source, `${' '.repeat(column)}^`, '', `${value.name}: ${value.message}`, `    at ${call[0]} (${lib}:${line}:${column + 7})`, `    at ${pathIn(dir, '[eval1]')}:1:${code.indexOf(callText(call)) + call[0].length + 2}`, internals(r), '', `Node.js ${env.node}`);
	} else out.push(String(value));
	return fence('console', out.join('\n'));
};
const two = (n: number) => String(n).padStart(2, '0');
/** The reporter's own failing test, run with vitest. */
const vitestPaste = (r: Rand, project: Project, call: Call, expected: number | string) => {
	const value = run(call);
	const name = pick(r, call[0] === 'parse' ? ['reads durations from the settings', 'parses the configured span', 'accepts what users type'] : ['shows the span', 'renders the duration', 'formats the length']);
	const file = project.file.replace(/\.jsx?$/, '.test.js');
	const want = typeof expected === 'string' ? `'${expected}'` : String(expected);
	const code = fence('js', `import { expect, it } from 'vitest';\nimport { ${call[0]} } from 'spanwise';\n\nit('${name}', () => {\n  expect(${callText(call)}).toBe(${want});\n});`);
	const error =
		value instanceof Error
			? `${value.name}: ${value.message}\n ❯ ${call[0]} node_modules/spanwise/src/index.js:${SOURCE_LINE[call[0]]![0]}:${SOURCE_LINE[call[0]]![2] + 7}`
			: `AssertionError: expected ${shown(value)} to be ${want} // Object.is equality\n\n- Expected\n+ Received\n\n- ${want}\n+ ${shown(value)}`;
	const files = int(r, 6, 40);
	const tests = int(r, 40, 300);
	const run1 = fence('console', `$ npx vitest run\n\n FAIL  ${file} > ${name}\n${error}\n ❯ ${file}:5:${int(r, 10, 30)}\n\n Test Files  1 failed | ${files - 1} passed (${files})\n      Tests  1 failed | ${tests - 1} passed (${tests})\n   Start at  ${two(int(r, 8, 18))}:${two(int(r, 0, 59))}:${two(int(r, 0, 59))}\n   Duration  ${(r() * 3 + 0.4).toFixed(2)}s`);
	return `${code}\n\n${run1}`;
};

// Files and logs from reporters' projects: the spans they read, and what format writes for them.
interface Data { parse: [string, string, string, string]; format: [string, string, string]; range: [number, number]; options: FormatOptions; names?: string }
const data: Record<string, Data> = {
	'tomato-cli': { parse: ['My shell history, roughly:', 'console', '', '$ tomato {span} {span}'], format: ['What the timer prints while it runs:', 'text', 'Work: {fmt} left'], range: [1_000, 3_000_000], options: {}, names: 'tasks' },
	'queue-worker': { parse: ['Part of our queue.yml:', 'yaml', 'jobs:', '  - name: {name}\n    retry_delay: {span}\n    timeout: {span}'], format: ['A few lines from the worker log:', 'text', '{stamp} INFO job {id} ({name}) finished in {fmt}'], range: [800, 7_200_000], options: {} },
	podshelf: { parse: ['Some entries from the CMS export:', 'json', '[', '  { "slug": "{name}-{id}", "length": "{span}" },'], format: ['How lengths show up in the episode list:', 'text', '{Name} #{id}  ·  {fmt}'], range: [600_000, 9_000_000], options: { largest: 2 }, names: 'episodes' },
	'nudge-bot': { parse: ['From the chat history:', 'text', '', '[{time}] {user}: /remind {span} {name}'], format: ['And what the bot answers:', 'text', '[{time}] nudge-bot: OK, I will remind you in {fmt}.'], range: [60_000, 90_000_000], options: {}, names: 'tasks' },
	hourglass: { parse: ['A few rows of the timesheet CSV:', 'csv', 'date,client,task,time_spent', '{date},{client},{name},{span}'], format: ['The invoice lines we generate:', 'text', '{Name} ({client})  {fmt}'], range: [900_000, 30_000_000], options: { largest: 2 }, names: 'tasks' },
	logsift: { parse: ['How we run it:', 'console', '', '$ logsift --window {span} /var/log/nginx/access.log'], format: ['What it prints:', 'text', '/api/{name}/{id}  p95 {fmt}'], range: [8, 2_400], options: { ms: true }, names: 'routes' },
	liftlog: { parse: ['Some of the values people typed last week, from our logs:', 'text', '', '{stamp} workout {id} duration="{span}"'], format: ['What the cards show:', 'text', 'Workout {id}: {fmt}'], range: [600_000, 7_200_000], options: {}, names: 'tasks' },
	'hearthstone-rules': { parse: ['Part of my rules file:', 'text', '', 'turn off {name} after {span}'], format: ['The status page:', 'text', '{name}: off in {fmt}'], range: [5_000, 3_600_000], options: {}, names: 'devices' },
	'orders-api': { parse: ['Our .env:', 'ini', '', '{NAME}={span}'], format: ['Log lines:', 'text', '{stamp} WARN rate limited 203.0.113.{byte}, retry in {fmt}'], range: [1_000, 120_000], options: {} },
	splitstream: { parse: ['The settings file:', 'json', '{', '  "{name}": "{span}",'], format: ['A run as the timer shows it:', 'text', '{Name}  {fmt}'], range: [20_000, 1_500_000], options: { ms: true }, names: 'splits' },
	coursekit: { parse: ['Front matter from a few lessons:', 'yaml', '', '---\ntitle: {Name}\nlength: {span}\n---'], format: ['The lesson cards:', 'text', '{Name} · {fmt} · beginner'], range: [180_000, 5_400_000], options: { largest: 2 }, names: 'lessons' },
	quire: { parse: ['Our config:', 'js', 'export default {', "  {name}: '{span}',"], format: ['Build output:', 'text', 'Built {id} pages in {fmt}'], range: [300, 9_000], options: {} },
	'egg-timer': { parse: ['What people typed, from our analytics:', 'text', '', '"{span}"'], format: ['Display states we log:', 'text', '{stamp} display="{fmt}"'], range: [0, 1_200_000], options: {}, names: 'tasks' },
	pulseboard: { parse: ['Part of alerts.json:', 'json', '[', '  { "service": "{name}", "for": "{span}" },'], format: ['The dashboard table:', 'text', '{name}  down {fmt}'], range: [30_000, 20_000_000], options: { largest: 2 } }
};
const spanTexts = ['30s', '45s', '1m', '2m', '5m', '10m', '15m', '30m', '1h', '1h 30m', '2h', '6h', '12h', '1d', '250ms', '500ms', '90s', '3m 30s', '20m', '4h'];
const thingNames: Record<string, string[]> = {
	jobs: ['invoices', 'stock-sync', 'thumbnails', 'newsletter', 'search-index', 'backups', 'reports', 'webhooks', 'cleanup', 'emails', 'exports', 'imports', 'sitemap', 'payouts'],
	tasks: ['standup', 'review', 'deep-work', 'emails', 'planning', 'pasta', 'bread', 'support', 'design', 'call-notes'],
	routes: ['orders', 'search', 'users', 'cart', 'invoices', 'images', 'sessions', 'reports'],
	devices: ['hallway', 'porch', 'kitchen', 'landing', 'garage', 'bathroom-fan', 'desk-lamp', 'heater'],
	splits: ['tutorial', 'forest', 'castle', 'boss-1', 'caves', 'tower', 'final-boss'],
	lessons: ['intro', 'arrays', 'loops', 'functions', 'recursion', 'testing', 'closures', 'modules'],
	episodes: ['morning-brief', 'long-read', 'interview', 'roundtable', 'weekly-recap', 'field-notes']
};
const envNames = ['CACHE_TTL', 'RATE_WINDOW', 'REQUEST_TIMEOUT', 'SESSION_IDLE', 'RETRY_DELAY', 'LOCK_TTL', 'POLL_INTERVAL', 'GRACE_PERIOD', 'LINK_EXPIRY', 'QUEUE_VISIBILITY'];
const clients = ['Bramble Books', 'Northwind', 'Kestrel Tickets', 'Harbour Radio', 'Fieldnote', 'Copperleaf', 'Oxbow Studio'];
const chatNames = ['ana', 'joel', 'priya', 'tom', 'mei', 'sam', 'lena', 'kwame'];
/** Code and options as they were in a release: `ms` arrived in 0.6.0 and `largest` in 0.5.0. */
const forVersion = (code: string, ver: string) => {
	let out = code;
	if (ver < '0.6.0') out = out.replace(/, \{ ms: true \}/g, '');
	if (ver < '0.5.0') out = out.replace(/, short \? \{ largest: 2 \} : \{\}/g, '').replace(/, \{ largest: \d \}/g, '');
	return out;
};
const optionsFor = (options: FormatOptions, ver: string): FormatOptions => ({
	...(options.largest !== undefined && ver >= '0.5.0' ? { largest: options.largest } : {}),
	...(options.ms && ver >= '0.6.0' ? { ms: true } : {})
});
const sameOptions = (a: FormatOptions = {}, b: FormatOptions = {}) => a.largest === b.largest && !!a.ms === !!b.ms;
/** Lines from the project's own files or logs; `special` is put on one line: the input that fails, or the span that formats badly. */
const dataPaste = (r: Rand, project: Project, fn: 'parse' | 'format', day: number, ver: string, special?: string | number, options?: FormatOptions) => {
	const spec = data[project.dir]!;
	const [label, lang, head, template] = fn === 'parse' ? spec.parse : [...spec.format.slice(0, 2), '', spec.format[2]] as [string, string, string, string];
	const multi = template.includes('\n');
	const count = multi ? int(r, 3, 5) : int(r, 6, 12);
	const at = special === undefined ? -1 : int(r, 0, count - 1);
	const stamp = (i: number) => `${asDate(day - count + i).toISOString().slice(0, 10)}T${two(int(r, 6, 22))}:${two(int(r, 0, 59))}:${two(int(r, 0, 59))}Z`;
	const lines: string[] = head ? [head] : [];
	for (let i = 0; i < count; i++) {
		const span = () => (i === at && fn === 'parse' ? String(special) : pick(r, spanTexts));
		const value = i === at && fn === 'format' ? Number(special) : Math.round(spec.range[0] + (spec.range[1] - spec.range[0]) * Math.pow(r(), 2));
		const name = pick(r, thingNames[spec.names ?? 'jobs']!);
		lines.push(
			template
				.replace(/\{span\}/g, span)
				.replace(/\{fmt\}/g, () => String(formatSpan(value, optionsFor(options ?? spec.options, ver))))
				.replace(/\{name\}/g, name)
				.replace(/\{Name\}/g, name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '))
				.replace(/\{NAME\}/g, () => pick(r, envNames))
				.replace(/\{id\}/g, () => String(int(r, 12, 9_999)))
				.replace(/\{byte\}/g, () => String(int(r, 2, 254)))
				.replace(/\{time\}/g, () => `${two(int(r, 7, 21))}:${two(int(r, 0, 59))}`)
				.replace(/\{stamp\}/g, () => stamp(i))
				.replace(/\{date\}/g, () => asDate(day - int(r, 1, 20)).toISOString().slice(0, 10))
				.replace(/\{user\}/g, () => pick(r, chatNames))
				.replace(/\{client\}/g, () => pick(r, clients))
		);
	}
	if (head === '[' || head === '{') lines.push(head === '[' ? '  ...\n]' : '  ...\n}');
	if (head === 'export default {') lines.push('};');
	return `${label}\n\n${fence(lang, lines.join('\n'))}`;
};
/** Configuration that reporters paste on packaging and tooling issues. */
const configPaste = (r: Rand, key: string, env: Env, name: string): string => {
	const major = env.node.slice(1).split('.')[0];
	if (key === 'types')
		return `Our tsconfig.json, in case it matters:\n\n${fence('json', `{\n  "compilerOptions": {\n    "target": "${pick(r, ['ES2022', 'ES2023', 'ESNext'])}",\n    "module": "${pick(r, ['NodeNext', 'ESNext'])}",\n    "moduleResolution": "${pick(r, ['NodeNext', 'Bundler'])}",\n    "strict": true,\n    "noImplicitAny": true,\n    "skipLibCheck": true,\n    "outDir": "dist"\n  },\n  "include": ["src"]\n}`)}`;
	if (key === 'commonjs')
		return `Our package.json, trimmed:\n\n${fence('json', `{\n  "name": "${name}",\n  "private": true,\n  "type": "commonjs",\n  "main": "lib/server.js",\n  "dependencies": {\n    "express": "^${pick(r, ['4.21.2', '5.1.0'])}",\n    "pino": "^9.${int(r, 1, 7)}.0",\n    "spanwise": "^${env.ver}"\n  }\n}`)}`;
	if (key === 'jest')
		return `Our Jest setup:\n\n${fence('js', `// jest.config.js\nmodule.exports = {\n  testEnvironment: '${pick(r, ['node', 'jsdom'])}',\n  transform: { '^.+\\\\.[jt]sx?$': 'babel-jest' },\n  roots: ['<rootDir>/src'],\n};`)}\n\n${fence('json', `// .babelrc\n{ "presets": [["@babel/preset-env", { "targets": { "node": "current" } }]] }`)}`;
	if (key === 'exports')
		return `The bundler config:\n\n${fence('js', `// vite.config.js\nimport { defineConfig } from 'vite';\n\nexport default defineConfig({\n  build: {\n    target: 'es2022',\n    rollupOptions: {\n      output: { manualChunks: { vendor: ['react', 'react-dom'] } },\n    },\n  },\n});`)}`;
	if (key === 'crlf')
		return `What git and the files look like here:\n\n${fence('console', `PS C:\\Users\\${env.home}\\code\\spanwise> git config --get core.autocrlf\ntrue\nPS C:\\Users\\${env.home}\\code\\spanwise> git ls-files --eol src/index.js test/format.test.js\ni/lf    w/crlf  attr/                   src/index.js\ni/lf    w/crlf  attr/                   test/format.test.js`)}`;
	if (key === 'node') {
		const files = int(r, 8, 30);
		const tests = int(r, 100, 400);
		return `For what it is worth, our suite on Node 20${major === '20' ? ', which is what we run' : ''}:\n\n${fence('console', `$ nvm use 20\nNow using node v20.18.1 (npm v10.8.2)\n$ npx vitest run\n\n Test Files  ${files} passed (${files})\n      Tests  ${tests} passed (${tests})\n   Duration  ${(r() * 4 + 1).toFixed(2)}s`)}`;
	}
	return '';
};

// Shared pieces, combined with every topic.
const greetings = ['Hi!', 'Hello,', 'Hey there,', 'Hi all,', 'Hi, and thanks for spanwise.', '', '', ''];
const intros = [
	'We use spanwise in {proj}, mostly for {use}.',
	'spanwise replaced a forty-line helper in {proj}, and it has been great so far.',
	'I maintain {proj}, which uses spanwise for everything to do with durations.',
	'First time posting here.',
	'Not sure whether this is a bug or me holding it wrong.',
	'Thanks for a small library that does one thing well.',
	'',
	''
];
const signoffs = ['Thanks!', 'Cheers', 'Happy to send a PR if you agree on the approach.', 'Thanks for your work on this.', 'Let me know if you need anything else.', '', '', ''];
const found = ['I noticed this while moving our settings to a new format.', 'This came up while I was adding tests for edge cases.', 'Spotted while upgrading from an older version.', 'A colleague ran into it while reviewing a change.', 'Found while porting an old helper of ours to spanwise.', 'Our error tracker showed it a few times this week.'];
const impact = ['Not urgent for us; we have a workaround.', 'Low priority, but it surprised a colleague today.', 'It affects only a handful of values we see.', 'It is blocking a small release on our side.'];
const holdOpen: Partial<Record<End, string[]>> = {
	agreed: ['Leaving this open until it lands.', 'Keeping this open to track it.'],
	declined: ['I will close this in a while.'],
	reporter: ['Leaving this open for now.'],
	answered: ['Leaving this open a little while in case others have the same question.']
};
const alternatives = ['Doing it in our own code, which is what we do now.', 'Another library, but spanwise is otherwise exactly right for us.', 'A small wrapper around spanwise in our codebase.', 'None, really.'];
const acks = ['Thanks for the report.', 'Thanks for writing this up.', 'Sorry for the slow reply; it has been a busy few weeks.', 'Thanks!', 'Thanks for the clear example.', '', '', ''];
const thanks = ['Thanks for looking at this.', 'Thanks, that helps.', 'Appreciated, thanks.', 'Thanks for the explanation.'];
const sameHere: Record<Topic['kind'], string[]> = {
	bug: ['Same here, on {ver} with Node {node}.', 'Seeing this too, in {bproj}.', 'We hit exactly this last week.', 'Can confirm, same thing on {bos}.'],
	feature: ['+1, this would help us in {bproj}.', '+1 from us.', 'This would be useful for us too.', 'Would love this.'],
	question: ['Wondering the same.', 'Following; I had the same question.', 'Same question here.']
};
/** For issues about the repository itself rather than the library: the docs site, the linter, the benchmark. */
const ownRepo = ['site', 'mobile', 'errordocs', 'crlf', 'benchout', 'benchnoise'];
const sameHereRepo = ['Same here.', 'Noticed this too.', '+1, I tripped over this as well.', 'Good catch.'];
const ownCase = [
	'For what it is worth, our case is {bproj}, where the values come from {bsrc}:\n\n{bsnippet}',
	'Our code, in case another example helps:\n\n{bsnippet}',
	'Here is where we call it in {bproj}:\n\n{bsnippet}',
	'We have the same kind of thing in {bproj}. {bdata}',
	'Same pattern here, in {bproj}. {bdata}'
];
const moreDetail: [string, string][] = [
	['snippet', 'A bit more context. This is where the value goes in:\n\n{snippet}'],
	['stack', 'Full output, in case it helps:\n\n{stack}'],
	['env', 'Here is my environment; I forgot it above:\n\n{env}'],
	['repl', 'For completeness, the same thing in a REPL:\n\n{repl}'],
	['vitest', 'Here is the failing test from our suite:\n\n{vitest}'],
	['repro', 'I reproduced it in an empty project, so it is not something in our setup:\n\n{repro}'],
	['data', 'Some real values, in case they help. {data}'],
	['config', '{config}']
];
const tangents: [string, string, string][] = [
	['2024-03-01', 'Unrelated, but is there a way to get the result of `parse` in seconds?', 'Divide by 1000. spanwise always works in milliseconds, which is what `setTimeout` and date arithmetic use, so there is no unit option.'],
	['2024-03-01', 'Slightly off topic: does spanwise work in the browser without a bundler?', 'Yes. It is a single ES module with no dependencies, so a `<script type="module">` that imports it from any ESM CDN works.'],
	['2024-03-01', 'While I have you: are TypeScript types planned?', 'There is a separate issue for that; the plan is a hand-written declaration file in the package.'],
	['2026-09-14', 'Side question: why does `format` drop milliseconds unless I ask?', 'Most spans shown to people do not want `1s 250ms`. `{ ms: true }` turns them on.'],
	['2024-03-01', 'Is `parse` fast enough to run on whatever users type, even very long strings?', 'Yes. It splits on whitespace and matches each part against a short anchored pattern, so the time grows with the length of the input and nothing else. Cap the length if you accept large inputs at all.'],
	['2025-01-01', 'Any tips for using spanwise with Temporal?', '`Temporal.Duration.from({ milliseconds: parse(text) }).round({ largestUnit: "hour" })` gets you a Temporal duration. There is no built-in bridge.'],
	['2024-03-01', 'Off topic: do you have a sponsor page?', 'No, but thank you. A bug report with a reproduction is worth more to us than money.'],
	['2024-03-01', 'Unrelated: is `parse("0s")` the recommended way to write zero?', 'Yes, `0s` (or `0ms`) parses to 0.'],
	['2024-03-01', 'Quick one: does `format` ever write more than a week of days, like `9d`?', 'Yes. Days are the largest unit, so ten days is `10d`. There are no weeks, months or years.']
];
const tails: Record<End, [Who, string][]> = {
	agreed: [['b', 'Any news on this one?'], ['x', '+1, looking forward to it.'], ['b', 'Is anyone working on this? I could take it if not.']],
	declined: [['b', 'For anyone finding this later: the workaround above works fine for us.'], ['x', '+1 for reconsidering one day.']],
	dup: [['r', 'Thanks, subscribed to the other one.']],
	fixed: [['b', 'Confirmed on {rel} here too.']],
	answered: [['b', 'Thanks, this helped me as well.'], ['x', 'Bookmarking this; exactly what I needed.']],
	reporter: [['x', 'I think we have the same problem. I will try to dig out an example.']]
};
const pings: Record<Topic['kind'], string[]> = {
	bug: ['Still happening with the latest release.', 'Any news? We still carry a workaround for this.', 'Bumping this; it came up again on our team this week.', 'Ran into this again today.'],
	feature: ['Any chance this gets looked at?', 'Still interested in this.', '+1, still relevant for us.', 'Is there anything I can do to move this forward?'],
	question: ['Any thoughts on this?', 'Also curious about the answer here.']
};
const languages = ['English, German and Polish', 'French and Dutch', 'Spanish and Portuguese', 'Japanese and English', 'Swedish, Norwegian and Danish'];

interface Plan { topic: Topic; path: Path; day: number; number: number; dup?: number }

/** Spreads the comments over the days after the issue was opened; a fixed issue's closing comments come after the release. */
const schedule = (r: Rand, open: number, count: number, closeAt: number, release?: number): number[] => {
	const days: number[] = [];
	const available = END - open;
	const gapMax = Math.max(0, Math.min(12, Math.floor(available / (count + 1))));
	const longGap = available > 150 && chance(r, 0.5) ? int(r, 20, Math.min(240, Math.floor(available / 2))) : 0;
	const longAt = int(r, Math.min(2, count - 1), Math.max(1, count - 1));
	let day = open;
	for (let i = 0; i < count; i++) {
		if (release !== undefined && i === closeAt) day = Math.max(day, release + int(r, 0, 20));
		else day += i === 0 ? int(r, 0, Math.min(4, gapMax)) : int(r, 0, gapMax);
		if (release === undefined && i === longAt) day += longGap;
		if (release !== undefined && i < closeAt) day = Math.min(day, release - 1);
		days.push(Math.min(day, END));
	}
	for (let i = 1; i < days.length; i++) days[i] = Math.max(days[i]!, days[i - 1]!);
	return days;
};

const issue = (plan: Plan, numbers: Set<number>): string => {
	const r = mulberry32((plan.number * 2654435761) >>> 0);
	const { topic, path } = plan;
	const [reporter, by1, by2, contributor] = shuffle(r, users).slice(0, 4) as [string, string, string, string];
	const lead = chance(r, 0.65) ? LEAD : CO;
	const other = lead === LEAD ? CO : LEAD;
	const handle: Record<Who, string> = { r: reporter, m: lead, c: other, b: by1, x: by2, k: contributor };
	const input = topic.inputs ? pick(r, topic.inputs) : '';
	const calls = (path.calls ?? topic.calls)?.(input) ?? [];
	const fits = (p: Project) => !topic.fn || topic.fn === 'parse' || !calls.length || sameOptions(data[p.dir]!.options, calls[0]![0] === 'format' ? calls[0]![2] : {});
	const project = pick(r, projects.filter(fits));
	const theirs = pick(r, projects.filter((p) => p !== project && fits(p)));
	const third = pick(r, projects.filter((p) => p !== project && p !== theirs && fits(p)));
	const ver = versionAt(plan.day);
	const node = nodeAt(r, plan.day);
	const env: Env = { node, npm: npmFor(node), machine: pick(r, machines), home: homeOf(reporter), dir: project.dir, ver };
	const node2 = nodeAt(r, plan.day);
	const env2: Env = { node: node2, npm: npmFor(node2), machine: pick(r, machines), home: homeOf(by1), dir: theirs.dir, ver };
	const node3 = nodeAt(r, plan.day);
	const env3: Env = { node: node3, npm: npmFor(node3), machine: pick(r, machines), home: homeOf(by2), dir: third.dir, ver };
	const failing = calls.find((call) => run(call) instanceof Error);
	const fn = topic.fn ?? topic.uses ?? 'parse';
	const required = (code: string) => {
		if (!['commonjs', 'jest'].includes(topic.key)) return code;
		const names = [...code.matchAll(/^export (?:function|const) (\w+)/gm)].map((match) => match[1]);
		const out = code.replace(/^import \{ (\w+) \} from 'spanwise';/m, "const { $1 } = require('spanwise');").replace(/^export (function|const) /gm, '$1 ');
		return names.length ? `${out}\n\nmodule.exports = { ${names.join(', ')} };` : out;
	};
	const first0 = calls[0];
	const special = topic.fixed || path.calls ? undefined : fn === 'parse' ? (topic.inputs ? input : undefined) : first0?.[0] === 'format' ? first0[1] : undefined;
	let pr = plan.number + int(r, 1, 4);
	while (numbers.has(pr)) pr++;

	const memo = new Map<string, string>();
	const once = (key: string, make: () => string) => () => {
		if (!memo.has(key)) memo.set(key, make());
		return memo.get(key)!;
	};
	const values: Record<string, () => string> = {
		in: () => input,
		out: () => (calls[0] ? (() => { const v = run(calls[0]!); return v instanceof Error ? v.message : String(v); })() : ''),
		fix: () => topic.fix?.(input) ?? input,
		ver: () => ver,
		node: () => node,
		proj: () => project.what,
		src: () => project.src,
		use: () => (fn === 'parse' ? `reading durations from ${project.src}` : 'showing durations to people'),
		bproj: () => theirs.what,
		bsrc: () => theirs.src,
		bos: () => env2.machine.short,
		xproj: () => third.what,
		xsrc: () => third.src,
		xos: () => env3.machine.short,
		xsnippet: () => forVersion(required(snippetPaste(third, fn)), ver),
		xenv: once('xenv', () => envBlock(r, env3)),
		xrepl: once('xrepl', () => replPaste(r, env3, calls.slice(0, 1))),
		xdata: once('xdata', () => dataPaste(r, third, fn, plan.day, ver, chance(r, 0.5) ? special : undefined, topic.key === 'largest' ? { largest: 2 } : undefined)),
		dup: () => `#${plan.dup}`,
		pr: () => `#${pr}`,
		rel: () => topic.fixed ?? '',
		reldate: () => (topic.fixed ? longDate(releaseDay(topic.fixed)) : ''),
		lastrel: () => `${ver}, on ${longDate(releaseDay(ver))}`,
		langs: once('langs', () => pick(r, languages)),
		contrib: () => contributor,
		other: () => other,
		repl: once('repl', () => replPaste(r, env, calls)),
		brepl: once('brepl', () => replPaste(r, env2, calls.slice(0, 1))),
		stack: once('stack', () => (failing ? stackPaste(r, env, failing, project.file.replace(/\.jsx$/, '.js')) : '')),
		snippet: () => forVersion(required(snippetPaste(project, fn)), ver),
		bsnippet: () => forVersion(required(snippetPaste(theirs, fn)), ver),
		env: once('env', () => envBlock(r, env)),
		benv: once('benv', () => envBlock(r, env2)),
		test: once('test', () => {
			const t = topic.test!;
			return testPaste(r, { ...env, dir: 'spanwise' }, t.file, t.name, run(t.call), t.expected);
		}),
		bench: once('bench', () => benchPaste(r, env, 1)),
		bench2: once('bench2', () => benchPaste(r, env, 2)),
		lint: once('lint', () => lintPaste(r, { ...env, machine: machines.find((m) => m.windows)! })),
		tsc: once('tsc', () => tscPaste(r, env)),
		require: once('require', () => requirePaste(r, env)),
		jest: once('jest', () => jestPaste(r, env)),
		ls: once('ls', () => lsPaste(env)),
		bundle: once('bundle', () => bundlePaste(r)),
		site: once('site', () => sitePaste(r, 'markdown')),
		head: once('head', () => sitePaste(r, 'head')),
		prev: () => (ver === '0.1.0' ? ver : before(ver)),
		biz: once('biz', () => pick(r, businesses)),
		n: once('n', () => String(pick(r, [12, 30, 45, 60, 80, 120, 150, 200, 240, 300, 400, 650, 900, 1200]))),
		source: once('source', () => sourceExcerpt(fn, ver)),
		repro: once('repro', () => (failing ?? calls[0] ? reproPaste(r, env, (failing ?? calls[0])!) : '')),
		diff: () => fence('diff', topic.diff ?? ''),
		data: once('data', () => dataPaste(r, project, fn, plan.day, ver, special, topic.key === 'largest' ? { largest: 2 } : undefined)),
		bdata: once('bdata', () => dataPaste(r, theirs, fn, plan.day, ver, chance(r, 0.5) ? special : undefined, topic.key === 'largest' ? { largest: 2 } : undefined)),
		config: once('config', () => configPaste(r, topic.key, env, project.dir)),
		vitest: once('vitest', () => (topic.want ? vitestPaste(r, project, ...topic.want(input)) : ''))
	};
	const fill = (text: string): string => text.replace(/\{([a-z0-9]+)\}/g, (all, key: string) => (key in values ? values[key]!() : all));
	const can = (key: string) =>
		key === 'env' ||
		(key === 'snippet' && !!(topic.fn ?? topic.uses)) ||
		(key === 'repl' && calls.length > 0) ||
		(key === 'stack' && !!failing && failing[0] === fn && !path.calls) ||
		(key === 'repro' && !!(failing ?? calls[0]) && !path.calls) ||
		(key === 'vitest' && !!topic.want && !path.calls) ||
		(key === 'data' && !!topic.fn && !topic.fixed && !(fn === 'format' && Number.isNaN(Number(special)))) ||
		(key === 'config' && configPaste(mulberry32(1), topic.key, env, project.dir) !== '');

	// The first post.
	const openText = pick(r, path.open ?? topic.open);
	const pastedInOpen = /\{(repl|stack|tsc|require|jest|ls|bundle|site|head|lint|bench|bench2)\}/.test(openText);
	const roll = r();
	const pasteKind = pastedInOpen ? 'none' : roll < 0.2 && can('repro') ? 'repro' : roll < 0.4 && can('vitest') ? 'vitest' : pick(r, path.paste ?? topic.paste);
	const paste = pasteKind === 'none' || (pasteKind === 'repl' && !calls.length) || (pasteKind === 'stack' && !failing) ? '' : fill(`{${pasteKind}}`);
	const lead1 =
		pasteKind === 'stack' || pasteKind === 'repl'
			? pick(r, ['This is what I get:', 'Output:', 'Repro:', 'Minimal example:', ''])
			: pasteKind === 'vitest'
				? pick(r, ['A failing test from our suite:', 'This test fails:', 'The test that caught it:'])
				: pasteKind === 'repro'
					? pick(r, ['In an empty project:', 'Steps, from scratch:', 'Reproduced from scratch:'])
					: '';
	const code = (topic.fn ?? topic.uses) && pasteKind !== 'snippet' && chance(r, 0.55) ? fill(`${pick(r, ['Our code looks roughly like this:', 'Where we call it:', 'The relevant bit of our code:'])}\n\n{snippet}`) : '';
	const context = (topic.fn ?? topic.uses) && !openText.includes('{proj}') && chance(r, 0.6) ? fill(`${pick(r, ['We use spanwise in {proj}.', 'This is for {proj}.', 'Background: we use spanwise in {proj}.'])} ${pick(r, about[project.dir]!)}`) : '';
	const greeting = pick(r, greetings);
	const intro = fill(pick(r, intros.filter((line) => !((context || ownRepo.includes(topic.key)) && line.includes('{proj}')) && !(greeting.includes('thanks') && line.startsWith('Thanks')) && (topic.kind === 'bug' || !line.includes('bug')))));
	const added = chance(r, 0.7) ? (['data', 'config'] as const).find((key) => can(key)) : undefined;
	const addedText = added ? fill(`{${added}}`) : '';
	const expect = fill(pick(r, path.expect ?? topic.expect));
	const how = topic.kind === 'bug' && !ownRepo.includes(topic.key) && chance(r, 0.5) ? `${pick(r, found)}${chance(r, 0.5) ? ` ${pick(r, impact)}` : ''}` : '';
	const parts: string[] = [];
	const templated = topic.kind !== 'question' && chance(r, 0.45);
	if (templated && topic.kind === 'bug')
		parts.push(...(context ? ['### Context', context.replace(/^Background: w/, 'W')] : []), '### What happened', `${fill(openText)}${how && !/\n/.test(fill(openText)) ? ` ${how}` : ''}`, code, lead1, paste, addedText, '### What I expected', expect, ...(ownRepo.includes(topic.key) && topic.key !== 'crlf' ? [] : ['### Environment', fill('{env}')]));
	else if (templated)
		parts.push('### The problem', `${intro} ${fill(openText)}`.trim(), context, code, paste, addedText, '### What I would like', expect, '### Alternatives considered', pick(r, alternatives));
	else
		parts.push(greeting, `${intro} ${context}`.trim(), fill(openText), code, lead1, paste, addedText, expect, how, topic.kind === 'bug' && (!ownRepo.includes(topic.key) || topic.key === 'crlf') && chance(r, 0.75) ? fill('{env}') : '', pick(r, topic.kind === 'question' ? signoffs.filter((line) => !line.includes('PR')) : signoffs));
	const body = parts.filter((part) => part !== '').join('\n\n');

	// The discussion.
	const thread: Msg[] = [];
	const first = pick(r, path.first ?? topic.first).map(([who, text]) => [who, text] as Msg);
	const ack = pick(r, acks);
	if (ack && first[0]![0] !== 'r' && chance(r, 0.5)) first[0] = [first[0]![0], `${ack} ${first[0]![1]}`];
	if (topic.fn && calls.length && !path.calls && !first.some(([, text]) => text.includes('{repl}')) && !body.includes('> const { format') && chance(r, 0.55)) {
		const at = first.findIndex(([who]) => who !== 'r');
		first[at] = [first[at]![0], `${first[at]![1]}\n\n${pick(r, ['For reference, on {ver}:', 'What I get on {ver}:', 'Quick check here:'])}\n\n{repl}`];
	}
	thread.push(...first);
	if (topic.fn && topic.kind !== 'question' && topic.key !== 'emptynew' && chance(r, 0.5)) {
		const [before1, after1] = sourceSay[topic.fn];
		thread.push([pick(r, ['m', 'c', 'k'] as Who[]), `${pick(r, before1)}\n\n{source}\n\n${pick(r, after1)}`]);
	}
	if (thread.at(-1)![0] !== 'r' && chance(r, 0.3)) thread.push(['r', pick(r, thanks)]);
	const usedAlready = (key: string) => body.includes(fill(`{${key}}`)) || thread.some(([, text]) => text.includes(`{${key}}`));
	const reproductions = ['repl', 'stack', 'repro', 'vitest'];
	let reproduced = reproductions.some((key) => usedAlready(key));
	const details = shuffle(r, moreDetail.filter(([key]) => can(key) && !usedAlready(key) && (key !== 'env' || topic.kind === 'bug' || topic.key.startsWith('bench')))).filter(([key]) => {
		if (!reproductions.includes(key)) return true;
		if (reproduced) return false;
		return (reproduced = true);
	});
	const detailed = topic.kind !== 'question' && path.end !== 'answered';
	for (const [, text] of details.slice(0, detailed && chance(r, 0.7) ? int(r, 1, 2) : 0)) thread.push(['r', text]);
	const chimes: Msg[] = [];
	const codeFn = topic.fn ?? topic.uses;
	const pool: string[] = [...shuffle(r, topic.chime)];
	if (codeFn) {
		pool.push(...shuffle(r, topic.fn ? ownCase : ownCase.filter((line) => !line.includes('{bdata}'))).slice(0, 2));
		const helper = pick(r, helpers.filter((h) => h.fn === fn));
		pool.push(`${helper.say}\n\n${fence('js', forVersion(required(helper.code), ver))}`);
	}
	pool.push(...shuffle(r, ownRepo.includes(topic.key) ? sameHereRepo : sameHere[topic.kind]).slice(0, 2));
	const chosen = shuffle(r, pool).slice(0, int(r, Math.min(2, pool.length), Math.min(6, pool.length)));
	chosen.forEach((line, i) => {
		const who: Who = i % 2 === 0 ? 'b' : 'x';
		let text = line;
		if (chance(r, 0.35) && !text.includes('{b')) text += `\n\n${pick(r, ['My setup:', 'Environment:', 'For reference:'])}\n\n{benv}`;
		else if (topic.fn && calls.length && !path.calls && chance(r, 0.35) && !text.includes('{b')) text += '\n\n{brepl}';
		chimes.push([who, who === 'x' ? text.replace(/\{b(proj|src|os|snippet|env|repl|data)\}/g, '{x$1}') : text]);
	});
	const split = int(r, 0, chimes.length);
	const prevOk = !['largest', 'emptynew', 'strings'].includes(topic.key);
	const extra = (topic.kind !== 'bug' || (['agreed', 'dup', 'reporter', 'fixed'].includes(path.end) && !ownRepo.includes(topic.key)) ? extras[topic.kind] : []).filter(
		(group) => (prevOk || !group.some(([, text]) => text.includes('{prev}'))) && !(path.end === 'fixed' && group.some(([, text]) => text.includes('release')))
	);
	const more: Msg[] = extra.length && chance(r, 0.5) ? pick(r, extra) : [];
	const late: Msg[] = detailed && details.length > 2 && chance(r, 0.4) ? [['r', `${pick(r, ['One more data point.', 'To add to the above:', 'Following up with more detail.'])} ${details[2]![1]}`]] : [];
	thread.push(...chimes.slice(0, split), ...late, ...(path.mid ?? []), ...more, ...chimes.slice(split));
	if (chance(r, 0.15)) {
		const usable = tangents.filter(([since]) => dayOf(since) <= plan.day);
		const [, question, answer] = pick(r, usable);
		thread.push([chance(r, 0.5) ? 'b' : 'x', question], [chance(r, 0.5) ? 'm' : 'c', answer]);
	}
	if (topic.diff && path.end === 'agreed' && ver >= (topic.diffFrom ?? '0.5.0') && chance(r, 0.6))
		thread.push(['k', `${pick(r, ['Not a PR yet, just a sketch of what I have in mind:', 'Something like this, I think:', 'For discussion, the smallest change I can see:'])}\n\n{diff}`]);
	if (END - plan.day > 250 && path.end !== 'answered' && topic.kind !== 'question' && chance(r, 0.6))
		shuffle(r, pings[topic.kind]).slice(0, int(r, 1, 2)).forEach((ping, i) => thread.push([i === 0 ? 'b' : 'x', ping]));
	const closeAt = thread.length;
	const closing = pick(r, path.close).map(([who, text]) => [who, text] as Msg);
	const last = closing.findLastIndex(([who]) => who === 'm' || who === 'c');
	const hold = holdOpen[path.end];
	if (hold && last >= 0 && chance(r, 0.35)) closing[last] = [closing[last]![0], `${closing[last]![1]} ${pick(r, hold)}`];
	thread.push(...closing);
	if (chance(r, 0.3)) thread.push(pick(r, tails[path.end]));

	for (let i = 1; i < thread.length; i++) {
		const [who, text] = thread[i]!;
		if ((who === 'b' || who === 'x') && thread[i - 1]![0] === who) thread[i] = [who === 'b' ? 'x' : 'b', text];
	}
	const days = schedule(r, plan.day, thread.length, closeAt, topic.fixed && path.end === 'fixed' ? releaseDay(topic.fixed) : undefined);
	const slow = 'Sorry for the slow reply; it has been a busy few weeks. ';
	if (thread[0]![1].startsWith(slow) && days[0]! - plan.day < 7) thread[0] = [thread[0]![0], thread[0]![1].slice(slow.length)];
	const comments = thread.map(([who, text], i) => `---\n\n**${handle[who]}** commented on ${longDate(days[i]!)}${chance(r, 0.07) ? ' (edited)' : ''}\n\n${fill(text)}`);
	const title = fill(pick(r, path.titles ?? topic.titles));
	const count = thread.length === 1 ? '1 comment' : `${thread.length} comments`;
	return `# ${title}\n\n#${plan.number} opened by ${reporter} on ${longDate(plan.day)} · ${count}\n\n${body}\n\n${comments.join('\n\n')}\n`;
};

// Which topic and path each issue follows: every path of every topic goes into a deck, the deck is dealt in a
// shuffled order and dealt again when it runs out. Then the issues are put in date order and numbered.
const order = mulberry32(20261121);
const plans: Plan[] = [];
let deck: [Topic, Path][] = [];
while (plans.length < ITEMS) {
	if (!deck.length) deck = shuffle(order, topics.flatMap((topic) => topic.paths.map((path) => [topic, path] as [Topic, Path])));
	const [topic, path] = deck.shift()!;
	const from = Math.max(FIRST_DAY, dayOf(topic.from));
	const to = Math.min(LAST_OPEN, topic.to ? dayOf(topic.to) : LAST_OPEN);
	plans.push({ topic, path, day: from + Math.floor((to - from) * Math.pow(order(), 0.75)), number: 0 });
}
plans.sort((a, b) => a.day - b.day);
let number = 8;
let previous = FIRST_DAY;
for (const plan of plans) {
	number += 1 + Math.floor((plan.day - previous) * 0.22) + int(order, 0, 2);
	plan.number = number;
	previous = plan.day;
}
// A duplicate points at the earliest earlier issue of its topic that ended with the topic's main decision (that of
// its first path), which is what the duplicate's comment cites; with none, the issue takes the topic's first path.
plans.forEach((plan, index) => {
	if (plan.path.end !== 'dup') return;
	const target = topics.find((topic) => topic.key === (plan.path.dupOf ?? plan.topic.key))!;
	const earlier = plans.slice(0, index).find((other) => other.topic === target && other.path === target.paths[0]);
	if (earlier) plan.dup = earlier.number;
	else plan.path = plan.topic.paths.find((path) => path.end !== 'dup')!;
});

const folder = join(root, 'docs', 'issues');
mkdirSync(folder, { recursive: true });
const numbers = new Set(plans.map((plan) => plan.number));
for (const plan of plans) writeFileSync(join(folder, `${plan.number}.md`), issue(plan, numbers));
writeFileSync(
	join(folder, 'README.md'),
	`# spanwise issues\n\nEvery issue that was open on spanwise's GitHub tracker on 21 November 2026, ${ITEMS} in all, one file each, named by\nissue number. Each file has the first post and every comment, oldest first, exported with \`gh issue view --comments\`.\nLabels, assignees, milestones and reactions were not exported, and pull requests are not included.\n`
);
