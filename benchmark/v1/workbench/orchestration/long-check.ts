// Checks one long-context variant. Run from anywhere:
//   bun <this file> <entry-id> <task, e.g. 4L> [output path the long task's other steps write ...]
// It generates the entry's long material twice, compares the two runs, measures the material, and checks
// which Tests select it. It calls no model. Exit code 1 when a hard check fails.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { Minimatch } from 'minimatch';
import { createCompanionCheck } from '../src/companions.ts';
import { listEntryIds, loadEntry } from '../src/dataset.ts';

const dataset = join(import.meta.dirname, '..', 'dataset');
const [id, taskKey, ...outputs] = process.argv.slice(2);
if (!id || !taskKey || !/^\d+L$/.test(taskKey)) {
	console.error('usage: bun long-check.ts <entry-id> <nL> [output paths ...]');
	process.exit(2);
}
const directory = join(dataset, id);
let failed = false;
const fail = (text: string) => {
	failed = true;
	console.log(`FAIL  ${text}`);
};
const ok = (text: string) => console.log(`ok    ${text}`);
const note = (text: string) => console.log(`note  ${text}`);

const readFolder = (root: string): { path: string; text: string }[] =>
	readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((item) => item.isFile())
		.map((item) => {
			const full = join(item.parentPath, item.name);
			return { path: relative(root, full), text: readFileSync(full, 'utf8') };
		})
		.sort((a, b) => (a.path < b.path ? -1 : 1));

const toPatterns = (value: unknown): string[] =>
	[value].flat().filter((item): item is string => typeof item === 'string');
const matchesGlob = (path: string, patterns: string[]) =>
	patterns.some((pattern) =>
		new Minimatch(pattern, { dot: true, nonegate: true, platform: 'linux' }).match(path)
	);
const matchesGrep = (text: string, patterns: string[]) =>
	patterns.some((pattern) => new RegExp(pattern, 'g').test(text));
const readTest = (entry: string) =>
	Bun.YAML.parse(readFileSync(join(dataset, entry, 'gate', 'test.yaml'), 'utf8')) as {
		select?: Record<string, unknown>;
	};

// 1. Generate twice.
const scratch = join(tmpdir(), `long-check-${id}-${process.pid}`);
const generate = (name: string): { folder: string; ms: number } => {
	const folder = join(scratch, name);
	mkdirSync(folder, { recursive: true });
	const files = join(directory, 'long', 'files');
	if (existsSync(files)) cpSync(files, folder, { recursive: true });
	const started = performance.now();
	if (existsSync(join(directory, 'long', 'generate.ts'))) {
		const run = Bun.spawnSync(['bun', 'long/generate.ts', folder], {
			cwd: directory,
			env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' },
			stdout: 'pipe',
			stderr: 'pipe'
		});
		if (run.exitCode !== 0)
			fail(`generate.ts exited ${run.exitCode}: ${run.stderr.toString().slice(0, 400)}`);
	}
	return { folder, ms: performance.now() - started };
};
const first = generate('a');
const second = generate('b');
const material = readFolder(first.folder);
const digest = (files: { path: string; text: string }[]) =>
	createHash('sha256')
		.update(files.map((file) => `${file.path}\0${file.text}\0`).join(''))
		.digest('hex');
if (digest(material) === digest(readFolder(second.folder))) ok('two runs give identical material');
else fail('two runs of the generator differ');
if (first.ms > 60_000) fail(`generator took ${Math.round(first.ms / 1000)} s`);
else ok(`generator took ${Math.round(first.ms)} ms`);

// 2. Size.
const entry = loadEntry(dataset, id);
const task = entry.tasks.get(taskKey);
const short = entry.tasks.get(taskKey.slice(0, -1));
if (!task) fail(`benchmark.yaml has no task ${taskKey}`);
if (task && short) {
	if (task.researched !== short.researched) fail('researched differs from the short task');
	if (task.tempting !== short.tempting) fail('tempting differs from the short task');
	if (task.context !== 200000 && task.context !== 500000) fail('context is not 200000 or 500000');
	const flat = (text: string) => text.replace(/\s+/g, ' ').trim();
	const steps = flat(task.prompt);
	const at = steps.indexOf(flat(task.researched));
	if (at < 0) fail('the prompt does not contain the researched prompt word for word');
	else if (at < steps.length / 2)
		note(
			'the researched step sits in the first half of the prompt: it must be last or next to last'
		);
	note(`prompt: ${task.prompt.trim().split(/\s+/).length} words`);
}
const target = task?.context ?? 0;
const characters = material.reduce((sum, file) => sum + [...file.text].length, 0);
const lines = material.map((file) => file.text.split('\n').length);
const sizes = material.map((file) => file.text.length).sort((a, b) => a - b);
console.log(
	`size  ${material.length} files, ${characters} characters (${(characters / 1000).toFixed(0)} KB), ` +
		`about ${Math.round(characters / 4)} tokens at 4 characters each, ${((characters / 4 / target) * 100).toFixed(0)}% of ${target}`
);
console.log(
	`size  per file: smallest ${sizes[0]}, median ${sizes[Math.floor(sizes.length / 2)]}, largest ${sizes.at(-1)} characters; longest ${Math.max(...lines)} lines`
);
// As the agent reads it: words about one token per 5.5 letters, digits one per 3, punctuation one each, and
// about two tokens of line number per line from the Read tool. Pasted output and tables weigh far more than chars / 4.
let asRead = 0;
for (const file of material) {
	asRead += file.text.split('\n').length * 2;
	for (const piece of file.text.match(/[A-Za-z]+|\d+|[^\sA-Za-z\d]/g) ?? [])
		asRead += /[A-Za-z]/.test(piece)
			? Math.max(1, Math.round(piece.length / 5.5))
			: /\d/.test(piece)
				? Math.ceil(piece.length / 3)
				: 1;
}
const wanted = target === 500000 ? [420000, 460000] : [145000, 165000];
console.log(
	`size  about ${asRead} tokens as the Read tool returns it (${((asRead / target) * 100).toFixed(0)}% of ${target}); aim for ${wanted[0]} to ${wanted[1]}`
);
if (asRead < wanted[0]! || asRead > wanted[1]!) fail('the as-read estimate is outside the aim');
else ok('the as-read estimate is within the aim');
if ((sizes.at(-1) ?? 0) > 60_000)
	fail('a file is over 60,000 characters: the Read tool refuses files over about 25,000 tokens');
if (Math.max(...lines) > 1900)
	fail('a file is over 1,900 lines: the Read tool returns at most 2,000');

// 3. Overwrites and ignored files.
const fixture = readFolder(join(directory, 'fixture'));
const fixturePaths = new Set(fixture.map((file) => file.path));
const overwritten = material.filter((file) => fixturePaths.has(file.path)).map((file) => file.path);
if (overwritten.length) note(`material replaces fixture files: ${overwritten.join(', ')}`);

// 4. The entry's own Test.
const own = readTest(id).select ?? {};
const ownGlob = toPatterns(own.glob);
const ownGrep = toPatterns(own.grep);
const globbed = material.filter((file) => ownGlob.length === 0 || matchesGlob(file.path, ownGlob));
const selected = globbed.filter((file) => ownGrep.length === 0 || matchesGrep(file.text, ownGrep));
if (selected.length)
	fail(`the entry's Test selects ${selected.length} material files, such as ${selected[0]!.path}`);
else if (globbed.length)
	fail(
		`the entry's Test globs ${globbed.length} material files, such as ${globbed[0]!.path}; keep the material outside its globs`
	);
else ok("the entry's Test selects none of the material");

// 5. Companions: every Test of the domain, on the fixture and on the fixture with the material.
const entries = listEntryIds(dataset).flatMap((other) => {
	try {
		return [loadEntry(dataset, other)];
	} catch {
		return [];
	}
});
const qualifies = createCompanionCheck(new Map([[id, first.folder]]));
const pool = entries.filter((other) => other.domain === entry.domain && other.id !== id);
const before = pool.filter((other) => qualifies(entry, other, false));
const lost = before.filter((other) => !qualifies(entry, other, true));
console.log(
	`pool  ${before.length} of ${pool.length} ${entry.domain} entries are possible companions of the short task`
);
if (lost.length)
	fail(`the material costs ${lost.length} companions: ${lost.map((other) => other.id).join(', ')}`);
else ok('the material costs no companion');

// 6. Output paths of the other steps.
for (const path of outputs) {
	if (matchesGlob(path, ownGlob)) fail(`output ${path} matches the entry's own glob`);
	const globbing = pool.filter((other) => {
		const glob = toPatterns(readTest(other.id).select?.glob);
		return glob.length === 0 || matchesGlob(path, glob);
	});
	if (globbing.length)
		note(
			`output ${path} matches the glob of ${globbing.length} other ${entry.domain} Tests: ${globbing.map((other) => other.id).join(', ')}`
		);
	else ok(`output ${path} matches no ${entry.domain} Test's glob`);
}

rmSync(scratch, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
