import { parseArgs } from 'node:util';
import { listEntryIds, loadEntry } from '../src/dataset.ts';
import type { DatasetEntry } from '../src/dataset.ts';
import { runBenchmark } from '../src/harness.ts';
import type { PlannedTest } from '../src/harness.ts';
import { harnessHelp, harnessOptions, toSettings } from '../src/options.ts';

const help = [
	'Usage: bun run benchmark [options]',
	'',
	'Runs every test of the dataset, or those --test names, in every arm, or those --arm names.',
	'',
	'  --test <rule-id>/<task>     one test; repeatable; default every test of the dataset',
	'  --context <short|long>      only short tasks, or only long-context tasks (keyed <n>L); default both',
	harnessHelp,
	'  --help                      print this help'
].join('\n');

/** The tests `--test` names, each `<rule-id>/<task>`, or every task of every entry. */
const toTests = (
	entries: DatasetEntry[],
	names: string[] | undefined,
	context: string | undefined
): PlannedTest[] => {
	if (context !== undefined && context !== 'short' && context !== 'long')
		throw new Error(`--context takes short or long, not "${context}"`);
	const order = (key: string) => Number.parseInt(key, 10) + (key.endsWith('L') ? 0.5 : 0);
	const all = entries.flatMap((entry) =>
		[...entry.tasks.keys()]
			.filter((task) => context === undefined || task.endsWith('L') === (context === 'long'))
			.sort((a, b) => order(a) - order(b))
			.map((task) => ({ entry, task }))
	);
	if (!names?.length) return all;
	return names.map((name) => {
		const test = all.find(({ entry, task }) => `${entry.id}/${task}` === name);
		if (!test) throw new Error(`--test ${name}: no such test in the dataset; use <rule-id>/<task>`);
		return test;
	});
};

/** Run the benchmark over the dataset. */
try {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			...harnessOptions,
			test: { type: 'string', multiple: true },
			context: { type: 'string' },
			help: { type: 'boolean', default: false }
		}
	});
	if (values.help) console.log(help);
	else {
		const settings = toSettings(values);
		const ids = listEntryIds(settings.datasetDirectory);
		if (ids.length === 0) throw new Error(`The dataset ${settings.datasetDirectory} has no entry`);
		// Every entry is loaded, not only those --test names: each test's companions come from the whole dataset.
		const entries = ids.map((id) => loadEntry(settings.datasetDirectory, id));
		await runBenchmark({
			...settings,
			entries,
			tests: toTests(entries, values.test, values.context)
		});
	}
} catch (error) {
	console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
