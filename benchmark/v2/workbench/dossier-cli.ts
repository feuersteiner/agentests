import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDossierInputs, measure, packageDossier, validateDossier } from './dossier.ts';

const preparedRoot = fileURLToPath(new URL('../results/prepared/', import.meta.url));
const help = `Offline complex support dossier (no model execution)
  dossier-cli.ts validate       Check inputs, provenance, schema and reviewer contract; writes nothing.
  dossier-cli.ts prepare        Write deterministic packets under results/prepared/complex-support-01/.
  dossier-cli.ts prepare --out PATH
                               PATH must remain inside benchmark/v2/results/prepared/.
Status: graded evaluation not implemented. No credentials, provider imports or network calls.
`;

export const main = (args: string[]): number => {
	try {
		if (args.length === 1 && ['--help', '-h'].includes(args[0]!)) {
			console.log(help);
			return 0;
		}
		const command = args[0] ?? 'validate';
		if (!['validate', 'prepare'].includes(command))
			throw new Error('Only validate and prepare are supported');
		if (command === 'validate' && args.length > 1)
			throw new Error('validate takes no output option');
		if (command === 'prepare' && !(args.length === 1 || (args.length === 3 && args[1] === '--out')))
			throw new Error('Use prepare [--out PATH]');
		const dossier = command === 'validate' ? validateDossier() : loadDossierInputs();
		const packets = packageDossier(dossier);
		const inventory = {
			status: 'graded evaluation not implemented',
			scenarios: 1,
			documents: dossier.context.length,
			documentSizes: dossier.context.map(({ id, version, content }) => ({
				id,
				version,
				...measure(content)
			})),
			context: dossier.manifest.contextMeasurement,
			candidates: dossier.candidates.map((candidate) => ({
				id: candidate.id,
				externalReply: measure(
					candidate.content.externalReply.map((span) => span.text).join('\n\n')
				),
				internalPlan: measure(candidate.content.internalPlan.map((span) => span.text).join('\n\n'))
			})),
			packets: packets.map(({ candidateId, sha256, bytes, words }) => ({
				candidateId,
				sha256,
				bytes,
				words
			}))
		};
		if (command === 'prepare') {
			const output = resolve(args[2] ?? resolve(preparedRoot, 'complex-support-01'));
			const rel = relative(preparedRoot, output);
			if (!rel || rel.startsWith('..') || isAbsolute(rel))
				throw new Error('Output must be a child of results/prepared');
			// Check existing ancestors before mkdir: a symlink must not redirect ignored output elsewhere.
			let ancestor = output;
			while (!existsSync(ancestor)) ancestor = dirname(ancestor);
			if (realpathSync(ancestor) !== ancestor)
				throw new Error('Output ancestors must not contain symlinks');
			if (existsSync(output))
				throw new Error('Output already exists; choose a fresh prepared directory');
			mkdirSync(output, { recursive: true });
			for (const packet of packets)
				writeFileSync(resolve(output, `${packet.candidateId}.json`), packet.packet, { flag: 'wx' });
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
