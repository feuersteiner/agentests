import { parseArgs } from 'node:util';
import { listEntryIds, loadEntry } from '../src/dataset.ts';
import { proveHelp, proveOptions, toProveSettings } from '../src/options.ts';
import { runProof } from '../src/prove.ts';

const help = [
	'Usage: bun run benchmark:prove [options]',
	'',
	"Runs each dataset entry's evals on each decision model through the proxy, one eval per folder, and reports",
	'expected and actual outcomes. It makes decision calls only: no agent and no judge.',
	'',
	proveHelp,
	'  --help                      print this help'
].join('\n');

/** Prove the dataset's Tests on their evals. */
try {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: { ...proveOptions, help: { type: 'boolean', default: false } }
	});
	if (values.help) console.log(help);
	else {
		const settings = toProveSettings(values);
		const ids = listEntryIds(settings.datasetDirectory);
		const wanted = values.entry ?? [];
		for (const id of wanted)
			if (!ids.includes(id))
				throw new Error(`--entry ${id}: no such entry in ${settings.datasetDirectory}`);
		const chosen = wanted.length ? ids.filter((id) => wanted.includes(id)) : ids;
		if (chosen.length === 0)
			throw new Error(`The dataset ${settings.datasetDirectory} has no entry`);
		await runProof({
			...settings,
			entries: chosen.map((id) => loadEntry(settings.datasetDirectory, id))
		});
	}
} catch (error) {
	console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
