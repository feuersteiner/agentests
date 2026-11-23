import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadTests } from '../src/catalogue.ts';
import { listEntryIds, loadEntry } from '../src/dataset.ts';
import { runBenchmark } from '../src/harness.ts';
import type { PlannedTest } from '../src/harness.ts';
import { harnessHelp, harnessOptions, toSettings } from '../src/options.ts';
import { pickTests, seededRandom, toSeed } from '../src/pick.ts';

/** How many tests a pilot runs. */
const pilotSize = 3;

const help = [
	'Usage: bun run benchmark:pilot [options]',
	'',
	'Picks 3 tests at random, as bun run benchmark:pick does, and runs them in every arm, or those --arm names.',
	'',
	'  --seed <n>                  replay the pick of this seed; default a fresh one',
	harnessHelp,
	'  --help                      print this help'
].join('\n');

/** Pick a pilot's tests and run them, or stop, running nothing, when a picked test has no usable dataset entry. */
try {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			...harnessOptions,
			seed: { type: 'string' },
			help: { type: 'boolean', default: false }
		}
	});
	if (values.help) console.log(help);
	else {
		const settings = toSettings(values);
		const seed = toSeed(values.seed);
		const picks = pickTests(loadTests(), pilotSize, seededRandom(seed));
		const problems: string[] = [];
		const tests: PlannedTest[] = picks.flatMap((pick) => {
			const name = `${pick.rule}/${pick.task}`;
			if (!existsSync(join(settings.datasetDirectory, pick.rule))) {
				problems.push(`${name}: no dataset entry ${pick.rule} yet`);
				return [];
			}
			try {
				const entry = loadEntry(settings.datasetDirectory, pick.rule);
				if (entry.tasks.has(pick.task)) return [{ entry, task: pick.task }];
				problems.push(`${name}: the entry has no task ${pick.task}`);
			} catch (error) {
				problems.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
			}
			return [];
		});
		console.log(`Pilot seed: ${seed} (replay with --seed ${seed})`);
		for (const pick of picks)
			console.log(`  ${pick.rule}/${pick.task}  ${pick.domain}  ${pick.prompt}`);
		if (problems.length)
			throw new Error(
				`The pilot of seed ${seed} cannot run; nothing was run:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`
			);
		// Each test's companions come from the whole dataset, so every entry must load.
		const entries = listEntryIds(settings.datasetDirectory).map((id) =>
			loadEntry(settings.datasetDirectory, id)
		);
		await runBenchmark({ ...settings, entries, tests, seed });
	}
} catch (error) {
	console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
