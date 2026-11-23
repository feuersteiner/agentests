import { parseArgs } from 'node:util';
import { loadTests } from '../src/catalogue.ts';
import type { BenchmarkTest } from '../src/catalogue.ts';
import { pickTests, seededRandom, toSeed } from '../src/pick.ts';

/** How many tests a pilot runs. */
const pilotSize = 3;

/** The pick as plain text: a block of fields for each test, then the seed. */
const toText = (tests: BenchmarkTest[], seed: number): string =>
	[
		...tests.flatMap((test, index) => [
			`Test ${index + 1} of ${tests.length}`,
			`  rule     ${test.rule}`,
			`  domain   ${test.domain}`,
			`  file     ${test.file}`,
			`  verdict  ${test.verdict}`,
			`  task     ${test.task}`,
			`  prompt   ${test.prompt}`,
			''
		]),
		`Seed: ${seed} (replay this pick with --seed ${seed})`
	].join('\n');

/** Pick a pilot's tests at random from the usable tests and print them with the seed that replays the pick. */
try {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: { seed: { type: 'string' }, json: { type: 'boolean', default: false } }
	});
	const seed = toSeed(values.seed);
	const tests = pickTests(loadTests(), pilotSize, seededRandom(seed));
	console.log(values.json ? JSON.stringify({ seed, tests }, null, '\t') : toText(tests, seed));
} catch (error) {
	console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
