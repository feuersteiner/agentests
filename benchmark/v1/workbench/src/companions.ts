import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Minimatch } from 'minimatch';
import type { DatasetEntry } from './dataset.ts';
import { seededRandom } from './pick.ts';

/** A 32-bit FNV-1a hash of `text`, the seed of a test's companions. */
const hash = (text: string): number => {
	let state = 0x811c9dc5;
	for (const character of text) {
		state ^= character.codePointAt(0)!;
		state = Math.imul(state, 0x01000193) >>> 0;
	}
	return state >>> 0;
};

const byId = (a: DatasetEntry, b: DatasetEntry): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** A Test parameter as a list of strings: one pattern or several. */
const toPatterns = (value: unknown): string[] =>
	[value].flat().filter((item): item is string => typeof item === 'string');

const globs = new Map<string, Minimatch>();
const greps = new Map<string, RegExp>();

/** Whether `path` matches any pattern, as the package's glob engine matches it. */
const matchesGlob = (path: string, patterns: string[]): boolean =>
	patterns.some((pattern) => {
		let matcher = globs.get(pattern);
		if (!matcher) {
			matcher = new Minimatch(pattern, { dot: true, nonegate: true, platform: 'linux' });
			globs.set(pattern, matcher);
		}
		return matcher.match(path);
	});

/** Whether `text` matches any pattern at least once, as the package's grep engine counts it. */
const matchesGrep = (text: string, patterns: string[]): boolean =>
	patterns.some((pattern) => {
		let matcher = greps.get(pattern);
		if (!matcher) {
			matcher = new RegExp(pattern, 'g');
			greps.set(pattern, matcher);
		}
		matcher.lastIndex = 0;
		return matcher.test(text);
	});

/** Every file under `root`, with its path relative to it, as the hook would name it. */
const readFolder = (root: string): { path: string; text: string }[] =>
	readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((item) => item.isFile())
		.map((item) => {
			const full = join(item.parentPath, item.name);
			return { path: relative(root, full), text: readFileSync(full, 'utf8') };
		});

/** Every file of an entry's fixture, and for a long task its long material too, as the workspace holds them. */
const readFixture = (
	entry: DatasetEntry,
	longMaterial?: string
): { path: string; text: string }[] => {
	const files = readFolder(join(entry.directory, 'fixture'));
	if (!longMaterial) return files;
	const extra = readFolder(longMaterial);
	const paths = new Set(extra.map((file) => file.path));
	return [...files.filter((file) => !paths.has(file.path)), ...extra];
};

/** The `select` of an entry's compiled Test. */
const readSelect = (entry: DatasetEntry): Record<string, unknown> | undefined => {
	const test = Bun.YAML.parse(readFileSync(join(entry.directory, 'gate', 'test.yaml'), 'utf8')) as {
		select?: Record<string, unknown>;
	} | null;
	return test?.select ?? undefined;
};

/**
 * Whether the companion's Test selects none of the entry's fixture files as they are before the agent starts: glob,
 * then grep, as the package selects; a `decide` in its select counts as selecting, and a Test without a select
 * selects every file. A companion that selects a fixture file could block the agent for content the agent did not
 * write, which a team's own Tests, run on every commit, would never leave in its repository.
 */
const leavesFixtureAlone = (
	companion: DatasetEntry,
	fixture: { path: string; text: string }[]
): boolean => {
	const select = readSelect(companion);
	if (!select) return fixture.length === 0;
	const glob = toPatterns(select.glob);
	const grep = toPatterns(select.grep);
	return !fixture.some(
		({ path, text }) =>
			(glob.length === 0 || matchesGlob(path, glob)) &&
			(grep.length === 0 || matchesGrep(text, grep))
	);
};

/**
 * Remembers each entry's fixture and each pair's verdict across the tests of an invocation. A long task's fixture
 * includes its entry's long material, from `longMaterial`.
 */
export const createCompanionCheck = (longMaterial: Map<string, string> = new Map()) => {
	const fixtures = new Map<string, { path: string; text: string }[]>();
	const verdicts = new Map<string, boolean>();
	return (entry: DatasetEntry, companion: DatasetEntry, long = false): boolean => {
		const key = `${entry.id}${long ? ' long' : ''} ${companion.id}`;
		let verdict = verdicts.get(key);
		if (verdict === undefined) {
			const fixtureKey = `${entry.id}${long ? ' long' : ''}`;
			let fixture = fixtures.get(fixtureKey);
			if (!fixture)
				fixtures.set(
					fixtureKey,
					(fixture = readFixture(entry, long ? longMaterial.get(entry.id) : undefined))
				);
			verdict = leavesFixtureAlone(companion, fixture);
			verdicts.set(key, verdict);
		}
		return verdict;
	};
};

/**
 * The `count` other entries of the test's domain whose skills or Tests sit beside its own in the skill and gate
 * arms, drawn without replacement, with a seed made from the test's name, `<rule-id>/<task>`, from those whose Test
 * leaves the test's fixture alone. Every arm of a test, and every invocation over the same dataset, gets the same
 * companions; fewer when fewer qualify.
 */
export const pickCompanions = (
	entry: DatasetEntry,
	task: string,
	entries: DatasetEntry[],
	count: number,
	qualifies: (entry: DatasetEntry, companion: DatasetEntry) => boolean = () => true
): DatasetEntry[] => {
	const pool = entries
		.filter(
			(other) => other.domain === entry.domain && other.id !== entry.id && qualifies(entry, other)
		)
		.sort(byId);
	const random = seededRandom(hash(`${entry.id}/${task}`));
	const picks: DatasetEntry[] = [];
	while (picks.length < count && pool.length > 0)
		picks.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
	return picks.sort(byId);
};
