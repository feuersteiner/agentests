import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageDossier } from './dossier.ts';
import {
	dossierInventory,
	loadDossierSuite,
	loadRegisteredDossier,
	readSuiteRegistry
} from './dossier-suite.ts';

export const preparedRoot = fileURLToPath(new URL('../results/prepared/', import.meta.url));
const help = `Offline complex support dossiers (no model execution)
  dossier-cli.ts validate [--case ID | --suite]
      Check inputs, provenance, schema and reviewer integrity; write nothing.
  dossier-cli.ts prepare [--case ID | --suite] [--out PATH]
      Prepare deterministic input-only packets without opening reviewer files.
      Run validate separately for complete provenance/reviewer integrity.
Defaults: case complex-support-01; output results/prepared/<case-ID>/ or suite/.
Suite preparation writes ten case subdirectories and a suite inventory (50 packets).
PATH must be a fresh child of benchmark/v2/results/prepared/; no traversal or symlinks.
Examples (from repository root):
  bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts validate --suite
  bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts prepare --case complex-support-02
  bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts prepare --suite --out benchmark/v2/results/prepared/review-suite
Status: graded evaluation not implemented. No credentials, provider imports or network calls.
`;

/** Reject lexical escapes, existing destinations and redirected ancestors before writing. */
export const freshOutput = (requested: string): string => {
	if (requested.split(/[\\/]/u).includes('..'))
		throw new Error('Output path traversal is forbidden');
	const output = resolve(requested);
	const rel = relative(preparedRoot, output);
	if (!rel || rel.startsWith('..') || isAbsolute(rel))
		throw new Error('Output must be a child of results/prepared');
	let ancestor = output;
	while (!existsSync(ancestor)) {
		// lstat also detects a dangling symlink, which existsSync follows and misses.
		try {
			if (lstatSync(ancestor).isSymbolicLink())
				throw new Error('Output ancestors must not contain symlinks');
		} catch (error) {
			if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
		}
		ancestor = dirname(ancestor);
	}
	if (realpathSync(ancestor) !== ancestor)
		throw new Error('Output ancestors must not contain symlinks');
	if (existsSync(output))
		throw new Error('Output already exists; choose a fresh prepared directory');
	return output;
};

export const main = (args: string[]): number => {
	try {
		if (args.length === 1 && ['--help', '-h'].includes(args[0]!)) {
			console.log(help);
			return 0;
		}
		const command = args[0] ?? 'validate';
		if (!['validate', 'prepare'].includes(command))
			throw new Error('Only validate and prepare are supported');
		let id = 'complex-support-01';
		let suite = false;
		let selection = false;
		let requested: string | undefined;
		for (let index = 1; index < args.length; index++) {
			const option = args[index];
			if (option === '--suite' && !selection) {
				suite = true;
				selection = true;
			} else if (
				option === '--case' &&
				!selection &&
				args[index + 1] &&
				!args[index + 1]!.startsWith('--')
			) {
				id = args[++index]!;
				selection = true;
			} else if (
				option === '--out' &&
				command === 'prepare' &&
				!requested &&
				args[index + 1] &&
				!args[index + 1]!.startsWith('--')
			)
				requested = args[++index]!;
			else
				throw new Error(
					'Use validate [--case ID | --suite] or prepare [--case ID | --suite] [--out PATH]'
				);
		}
		const dossiers = suite
			? loadDossierSuite(command === 'validate')
			: [loadRegisteredDossier(id, command === 'validate')];
		const inventories = dossiers.map(dossierInventory);
		const integrity =
			command === 'validate'
				? 'full-offline-integrity'
				: 'inputs-only; provenance and reviewer files not opened';
		const inventory = suite
			? {
					status: 'graded evaluation not implemented',
					integrity,
					scenarios: dossiers.length,
					candidatePairs: inventories.reduce((sum, entry) => sum + entry.candidates.length, 0),
					tokenizer: null,
					tokenCount: null,
					situations: inventories.map((entry) => ({
						...entry,
						title: readSuiteRegistry().find(({ id }) => id === entry.scenarioId)!.title,
						directory: entry.scenarioId
					}))
				}
			: { ...inventories[0], integrity };
		if (command === 'prepare') {
			const output = freshOutput(requested ?? resolve(preparedRoot, suite ? 'suite' : id));
			mkdirSync(dirname(output), { recursive: true });
			mkdirSync(output); // Exclusive creation: never reuse an existing prepared set.
			for (const [index, dossier] of dossiers.entries()) {
				const target = suite ? resolve(output, dossier.manifest.scenarioId) : output;
				if (suite) mkdirSync(target);
				for (const packet of packageDossier(dossier))
					writeFileSync(resolve(target, `${packet.candidateId}.json`), packet.packet, {
						flag: 'wx'
					});
				if (suite)
					writeFileSync(
						resolve(target, 'inventory.json'),
						`${JSON.stringify({ ...inventories[index], integrity }, null, 2)}\n`,
						{ flag: 'wx' }
					);
			}
			writeFileSync(resolve(output, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`, {
				flag: 'wx'
			});
		}
		console.log(JSON.stringify(inventory, null, 2));
		return 0;
	} catch (error) {
		console.error(error instanceof Error ? error.message : 'Invalid dossier');
		return 2;
	}
};

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
