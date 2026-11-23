/* eslint-disable -- one-off orchestration scripts, kept as they ran */
// Checks one entry's long-context material. Run from the repository root:
//   bun benchmark/v1/workbench/orchestration/check-long.ts <entry-id>
// It builds the material twice (long/files/ then long/generate.ts), checks both builds are identical, prints its
// size in characters and estimated tokens against each long task's target, and lists any material file the entry's
// own Test would select by its glob and grep (there must be none).
import { createHash } from 'node:crypto';
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { Minimatch } from 'minimatch';
import { loadEntry } from '../src/dataset.ts';

const id = process.argv[2];
if (!id) throw new Error('Usage: bun check-long.ts <entry-id>');
const entry = loadEntry(join(import.meta.dirname, '..', 'dataset'), id);

const build = (): string => {
	const dir = mkdtempSync(join(tmpdir(), 'long-check-'));
	const files = join(entry.directory, 'long', 'files');
	if (existsSync(files)) cpSync(files, dir, { recursive: true });
	if (existsSync(join(entry.directory, 'long', 'generate.ts'))) {
		const run = Bun.spawnSync(['bun', 'long/generate.ts', dir], {
			cwd: entry.directory,
			stderr: 'pipe'
		});
		if (run.exitCode !== 0)
			throw new Error(`generate.ts failed: ${run.stderr.toString().slice(0, 500)}`);
	}
	return dir;
};
const list = (dir: string) =>
	readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((item) => item.isFile())
		.map((item) => relative(dir, join(item.parentPath, item.name)))
		.sort();
const digest = (dir: string) => {
	const hash = createHash('sha256');
	for (const path of list(dir))
		hash
			.update(path)
			.update('\0')
			.update(readFileSync(join(dir, path)))
			.update('\0');
	return hash.digest('hex');
};

const started = performance.now();
const first = build();
const seconds = (performance.now() - started) / 1000;
const second = build();
const same = digest(first) === digest(second);
const paths = list(first);
const chars = paths.reduce(
	(total, path) => total + readFileSync(join(first, path), 'utf8').length,
	0
);

const test = Bun.YAML.parse(
	readFileSync(join(entry.directory, 'gate', 'test.yaml'), 'utf8')
) as any;
const toList = (value: unknown) =>
	[value].flat().filter((item): item is string => typeof item === 'string');
const globs = toList(test?.select?.glob).map(
	(p) => new Minimatch(p, { dot: true, nonegate: true, platform: 'linux' })
);
const greps = toList(test?.select?.grep).map((p) => new RegExp(p, 'g'));
const selected = paths.filter((path) => {
	const text = readFileSync(join(first, path), 'utf8');
	return (
		(globs.length === 0 || globs.some((g) => g.match(path))) &&
		(greps.length === 0 ||
			greps.some((g) => {
				g.lastIndex = 0;
				return g.test(text);
			}))
	);
});

console.log(
	`files: ${paths.length}; characters: ${chars}; estimated tokens (chars / 4): ${Math.round(chars / 4)}`
);
console.log(`build took ${seconds.toFixed(1)} s (limit 60); deterministic: ${same ? 'yes' : 'NO'}`);
for (const [key, task] of entry.tasks)
	if (key.endsWith('L'))
		console.log(
			`task ${key}: target ${task.context} tokens; material is ${Math.round((chars / 4 / (task.context ?? 1)) * 100)}% of it (aim for about 85% at a 200000 target, about 110% at 500000)`
		);
console.log(
	selected.length
		? `SELECTED BY THE ENTRY'S OWN TEST (must be none): ${selected.join(', ')}`
		: "selected by the entry's own Test: none"
);
rmSync(first, { recursive: true, force: true });
rmSync(second, { recursive: true, force: true });
if (!same || selected.length || seconds > 60) process.exitCode = 1;
