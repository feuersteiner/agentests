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
	harnessHelp,
	'  --help                      print this help'
].join('\n');

/** The tests `--test` names, each `<rule-id>/<task>`, or every task of every entry. */
const toTests = (entries: DatasetEntry[], names: string[] | undefined): PlannedTest[] => {
	const all = entries.flatMap((entry) =>
		[...entry.tasks.keys()].sort((a, b) => a - b).map((task) => ({ entry, task }))
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
			help: { type: 'boolean', default: false }
		}
	});
	if (values.help) console.log(help);
	else {
		const settings = toSettings(values);
		const ids = listEntryIds(settings.datasetDirectory);
		if (ids.length === 0) throw new Error(`The dataset ${settings.datasetDirectory} has no entry`);
		const wanted = new Set(values.test?.map((name) => name.split('/')[0]));
		const entries = ids
			.filter((id) => !wanted.size || wanted.has(id))
			.map((id) => loadEntry(settings.datasetDirectory, id));
		await runBenchmark({ ...settings, tests: toTests(entries, values.test) });
	}
} catch (error) {
	console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
