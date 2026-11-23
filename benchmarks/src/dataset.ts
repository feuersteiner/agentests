import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Domain, Verdict } from './catalogue.ts';

/** One dataset entry: a rule with its tasks, rubric, fixture, skill and compiled Test. */
export interface DatasetEntry {
	/** The rule id, also the entry's folder name. */
	id: string;
	domain: Domain;
	/** The research file the rule comes from, relative to the benchmarks folder. */
	research: string;
	verdict: Exclude<Verdict, 'drop'>;
	/** The rule text that the skill, the Test and the rubric each contain word for word. */
	rule: string;
	/** The usable task prompts, by the task's 1-based position in the research entry. */
	tasks: Map<number, string>;
	/** The judge's rubric for this rule. */
	rubric: string;
	/** The entry's folder. */
	directory: string;
}

/** The `dataset/` folder of this package. */
export const datasetDirectory = join(import.meta.dirname, '..', 'dataset');

const domains: readonly string[] = ['dev', 'business'];
const verdicts: readonly string[] = ['as-is', 'restate-policy', 'reshape'];
/** The only stages a benchmark Test may use. */
const stages: readonly string[] = ['glob', 'grep', 'decide'];

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

/** Text with every run of whitespace made one space, so line wrapping does not count as a difference. */
const flatten = (text: string): string => text.replace(/\s+/g, ' ').trim();

const isDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

/** The folder names in `directory`, sorted, or none when it is missing. */
const listFolders = (directory: string): string[] =>
	isDirectory(directory)
		? readdirSync(directory, { withFileTypes: true })
				.filter((item) => item.isDirectory())
				.map((item) => item.name)
				.sort()
		: [];

/** Every entry folder in `directory`, by rule id. */
export const listEntryIds = (directory: string = datasetDirectory): string[] =>
	listFolders(directory);

/** Collects an entry's problems so they are reported together. */
class Problems {
	readonly list: string[] = [];

	readonly add = (problem: string): void => {
		this.list.push(problem);
	};

	/** The file's text, or undefined after noting it missing or blank. */
	readonly readText = (path: string, name: string): string | undefined => {
		if (!existsSync(path)) return void this.add(`missing ${name}`);
		const text = readFileSync(path, 'utf8');
		if (!text.trim()) return void this.add(`${name} is empty`);
		return text;
	};

	/** The file's parsed YAML, or undefined after noting it missing or invalid. */
	readonly readYaml = (path: string, name: string): unknown => {
		const text = this.readText(path, name);
		if (text === undefined) return undefined;
		try {
			return Bun.YAML.parse(text);
		} catch (error) {
			return void this.add(
				`${name} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	};

	/** Note `name` unless its text contains the rule word for word, whitespace aside. */
	readonly requireRule = (text: string | undefined, rule: string | undefined, name: string) => {
		if (text !== undefined && rule !== undefined && !flatten(text).includes(flatten(rule)))
			this.add(`${name} does not contain benchmark.yaml's rule word for word`);
	};
}

/** The usable tasks of `benchmark.yaml`'s `tasks` mapping, noting any key or prompt that is not usable. */
const toTasks = (value: unknown, problems: Problems): Map<number, string> => {
	const tasks = new Map<number, string>();
	if (!isFields(value) || Object.keys(value).length === 0) {
		problems.add('benchmark.yaml: tasks must map task positions to prompts');
		return tasks;
	}
	for (const [key, prompt] of Object.entries(value)) {
		const position = Number(key);
		if (!/^[1-9]\d*$/.test(key))
			problems.add(`benchmark.yaml: task key "${key}" is not a 1-based position`);
		else if (!isText(prompt)) problems.add(`benchmark.yaml: task ${key} has no prompt`);
		else tasks.set(position, prompt.trim());
	}
	return tasks;
};

/** The frontmatter `name` of a `SKILL.md`, or undefined when it has none. */
const toSkillName = (text: string): unknown => {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
	if (!match) return undefined;
	try {
		const frontmatter: unknown = Bun.YAML.parse(match[1]!);
		return isFields(frontmatter) ? frontmatter.name : undefined;
	} catch {
		return undefined;
	}
};

/** Note every way `gate/test.yaml` breaks the contract: its id, and stages other than glob, grep and decide. */
const checkTest = (test: unknown, id: string, problems: Problems): void => {
	if (test === undefined) return;
	if (!isFields(test)) return problems.add('gate/test.yaml: expected a mapping');
	if (test.id !== id) problems.add(`gate/test.yaml: id is "${String(test.id)}", not "${id}"`);
	const { select, assert } = test;
	if (select !== undefined && isFields(select))
		for (const stage of Object.keys(select).filter((key) => !stages.includes(key)))
			problems.add(
				`gate/test.yaml: select uses ${stage}; a benchmark Test uses only glob, grep and decide`
			);
	if (!Array.isArray(assert) || assert.length === 0)
		return problems.add('gate/test.yaml: expected an assert list');
	for (const [index, assertion] of assert.entries())
		if (isFields(assertion) && 'reason' in assertion)
			problems.add(
				`gate/test.yaml: assertion ${index + 1} uses reason; a benchmark Test uses only glob, grep and decide`
			);
};

/** Note a missing, empty or `.git`-carrying fixture, and a `node_modules` the harness would replace. */
const checkFixture = (fixture: string, problems: Problems): void => {
	if (!isDirectory(fixture)) return problems.add('missing fixture/');
	const names = readdirSync(fixture);
	if (names.length === 0) problems.add('fixture/ is empty');
	if (names.includes('.git')) problems.add('fixture/ must not contain .git');
	if (names.includes('node_modules')) problems.add('fixture/ must not contain node_modules');
};

/** Note missing evals: `gate/evals/` needs at least one folder, each with an `eval.yaml`. */
const checkEvals = (evals: string, problems: Problems): void => {
	const folders = listFolders(evals);
	if (folders.length === 0) return problems.add('gate/evals/ has no eval folder');
	for (const folder of folders.filter((name) => !existsSync(join(evals, name, 'eval.yaml'))))
		problems.add(`missing gate/evals/${folder}/eval.yaml`);
};

/** The entry `id` in `directory`, validated against the dataset contract; throws one error naming every problem. */
export const loadEntry = (directory: string, id: string): DatasetEntry => {
	const root = join(directory, id);
	if (!isDirectory(root)) throw new Error(`No dataset entry ${id} in ${directory}`);
	const problems = new Problems();
	const meta = problems.readYaml(join(root, 'benchmark.yaml'), 'benchmark.yaml');
	let rule: string | undefined;
	let tasks = new Map<number, string>();
	const fields: Fields = isFields(meta) ? meta : {};
	if (meta !== undefined && !isFields(meta)) problems.add('benchmark.yaml: expected a mapping');
	if (isFields(meta)) {
		if (meta.id !== id) problems.add(`benchmark.yaml: id is "${String(meta.id)}", not "${id}"`);
		if (!domains.includes(meta.domain as string))
			problems.add('benchmark.yaml: domain must be dev or business');
		if (!isText(meta.research)) problems.add('benchmark.yaml: missing research');
		if (!verdicts.includes(meta.verdict as string))
			problems.add('benchmark.yaml: verdict must be as-is, restate-policy or reshape');
		if (isText(meta.rule)) rule = meta.rule.trim();
		else problems.add('benchmark.yaml: missing rule');
		tasks = toTasks(meta.tasks, problems);
	}
	const rubric = problems.readText(join(root, 'rubric.md'), 'rubric.md');
	problems.requireRule(rubric, rule, 'rubric.md');
	checkFixture(join(root, 'fixture'), problems);
	const skill = problems.readText(join(root, 'skill', 'SKILL.md'), 'skill/SKILL.md');
	if (skill !== undefined && toSkillName(skill) !== id)
		problems.add(`skill/SKILL.md: frontmatter name must be "${id}"`);
	problems.requireRule(skill, rule, 'skill/SKILL.md');
	const testMd = problems.readText(join(root, 'gate', 'TEST.md'), 'gate/TEST.md');
	problems.requireRule(testMd, rule, 'gate/TEST.md');
	checkTest(problems.readYaml(join(root, 'gate', 'test.yaml'), 'gate/test.yaml'), id, problems);
	checkEvals(join(root, 'gate', 'evals'), problems);
	if (problems.list.length)
		throw new Error(
			`Dataset entry ${id} breaks the contract:\n${problems.list.map((problem) => `  - ${problem}`).join('\n')}`
		);
	return {
		id,
		domain: fields.domain as Domain,
		research: fields.research as string,
		verdict: fields.verdict as DatasetEntry['verdict'],
		rule: rule!,
		tasks,
		rubric: rubric!,
		directory: root
	};
};

/**
 * Claude Code's argument placeholders in a skill's body: `$ARGUMENTS`, `$ARGUMENTS[N]` and `$N` not followed by a
 * word character, unless escaped as `\$`. Claude Code replaces each with the prompt or one of its words, so the
 * skill arm would get other text than the dataset's.
 */
const placeholderPattern = /(?<!\\)\$(?:ARGUMENTS(?:\[\d+\])?|\d+(?!\w))/g;

/** Each argument placeholder in the entry's `skill/SKILL.md` body, as `line <n>: <placeholder>`. */
export const findSkillPlaceholders = (entry: DatasetEntry): string[] => {
	const lines = readFileSync(join(entry.directory, 'skill', 'SKILL.md'), 'utf8').split('\n');
	const bodyStart = lines[0]?.trim() === '---' ? lines.indexOf('---', 1) + 1 : 0;
	return lines.flatMap((line, index) =>
		index < bodyStart
			? []
			: [...line.matchAll(placeholderPattern)].map((match) => `line ${index + 1}: ${match[0]}`)
	);
};
