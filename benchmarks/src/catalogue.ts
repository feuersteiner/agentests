import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const verdicts = ['as-is', 'restate-policy', 'reshape', 'drop'] as const;
const domains = ['dev', 'business'] as const;

/** A triage verdict; a rule judged `drop` yields no tests. */
export type Verdict = (typeof verdicts)[number];

/** A rule's domain. */
export type Domain = (typeof domains)[number];

/** One test of the benchmark: a rule the triage keeps, paired with one of its usable tasks. */
export interface BenchmarkTest {
	/** The rule's id. */
	rule: string;
	domain: Domain;
	/** The rule file, relative to the benchmarks folder, such as `research/dev-conventions.yaml`. */
	file: string;
	/** The rule's triage verdict, never `drop`. */
	verdict: Verdict;
	/** The task's 1-based position in the rule's `tasks` list. */
	task: number;
	/** The task prompt, as the rule file words it. */
	prompt: string;
}

/** The `research/` folder of this package. */
export const researchDirectory = join(import.meta.dirname, '..', 'research');

/** A YAML mapping, by key. */
type Fields = Record<string, unknown>;

/** Throw `message` unless `condition` holds. */
const ensure: (condition: unknown, message: string) => asserts condition = (condition, message) => {
	if (!condition) throw new Error(message);
};

const isFields = (value: unknown): value is Fields =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
	typeof value === 'string' && (values as readonly string[]).includes(value);

/** The parsed `research/<name>` in `directory`; throws when it is missing or not YAML. */
const readYaml = (directory: string, name: string): unknown => {
	const path = join(directory, name);
	ensure(existsSync(path), `Missing research file research/${name}`);
	try {
		return Bun.YAML.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid YAML in research/${name}: ${reason}`, { cause: error });
	}
};

/** The task prompts of each rule in the rule file `research/<file>.yaml`, by rule id. */
const loadTasks = (directory: string, file: string): Map<string, string[]> => {
	const name = `${file}.yaml`;
	const rules = readYaml(directory, name);
	ensure(Array.isArray(rules), `research/${name}: expected a list of rules`);
	return new Map(
		rules.map((rule: unknown, index): [string, string[]] => {
			const where = `research/${name}: rule ${index + 1}`;
			ensure(isFields(rule), `${where}: expected a mapping`);
			const { id, tasks } = rule;
			ensure(isText(id), `${where}: expected an id`);
			ensure(
				Array.isArray(tasks) && tasks.length > 0 && tasks.every(isText),
				`${where} (${id}): expected a list of task prompts`
			);
			return [id, tasks];
		})
	);
};

/** Every usable test in `research/triage.yaml` and the rule files it names, in the triage's order, then by task. */
export const loadTests = (directory: string = researchDirectory): BenchmarkTest[] => {
	const triage = readYaml(directory, 'triage.yaml');
	ensure(isFields(triage), 'research/triage.yaml: expected a mapping with a rules list');
	const { rules } = triage;
	ensure(Array.isArray(rules), 'research/triage.yaml: expected a rules list');
	const tasksByFile = new Map<string, Map<string, string[]>>();
	const seen = new Set<string>();
	return rules.flatMap((entry: unknown, index): BenchmarkTest[] => {
		const where = `research/triage.yaml: rules entry ${index + 1}`;
		ensure(isFields(entry), `${where}: expected a mapping`);
		const { id, file, domain, verdict, usable_tasks: usable } = entry;
		ensure(isText(id), `${where}: expected an id`);
		ensure(!seen.has(id), `${where}: duplicate id ${id}`);
		seen.add(id);
		ensure(
			typeof file === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(file),
			`${where} (${id}): expected a rule file name, such as dev-conventions`
		);
		ensure(isOneOf(domains, domain), `${where} (${id}): expected a domain: ${domains.join(', ')}`);
		ensure(
			isOneOf(verdicts, verdict),
			`${where} (${id}): expected a verdict: ${verdicts.join(', ')}`
		);
		if (verdict === 'drop') return [];
		if (!tasksByFile.has(file)) tasksByFile.set(file, loadTasks(directory, file));
		const tasks = tasksByFile.get(file)!.get(id);
		ensure(tasks, `research/${file}.yaml: no rule ${id}, which research/triage.yaml names`);
		const positions: unknown = usable ?? tasks.map((_, position) => position + 1);
		ensure(
			Array.isArray(positions) &&
				positions.length > 0 &&
				new Set(positions).size === positions.length &&
				positions.every(
					(position): position is number =>
						Number.isInteger(position) && position >= 1 && position <= tasks.length
				),
			`${where} (${id}): usable_tasks must list distinct task positions from 1 to ${tasks.length}`
		);
		return positions.map((task) => ({
			rule: id,
			domain,
			file: `research/${file}.yaml`,
			verdict,
			task,
			prompt: tasks[task - 1]!
		}));
	});
};
