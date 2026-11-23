import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { defaultModelsFile, loadModels, preparePilot } from './data.ts';

export const help = `agentests backend FIRST PILOT (five fixed completed refund replies)

Usage: bun --no-env-file cli.ts [validate|run] [options]
Default command: validate (offline; never creates providers or calls models).

  --help               Show this help; no inference
  --dry-run            Force offline validation, even with the run command
  --models luna,jev    Profiles to evaluate; default luna
  --repeat N           Positive integer repeats per case/profile; default 1
  --config FILE        Decision settings JSON; default workbench/models.json

Offline: bun --no-env-file cli.ts validate --models luna,jev --repeat 3
Real:    bun --env-file=../../../.env cli.ts run --models luna,jev --repeat 3

Real runs may incur provider charges. No live run is part of verification.
Results: ../results/raw/<run-id>/; no evidence text or environment values.
Exit: 0=validation succeeds/all labels agree; 1=label disagreement;
      2=setup/inference error (takes precedence over disagreement).
`;

export const main = async (args: string[]): Promise<number> => {
	const { values, positionals } = parseArgs({
		args,
		allowPositionals: true,
		strict: true,
		options: {
			help: { type: 'boolean' },
			'dry-run': { type: 'boolean' },
			models: { type: 'string', default: 'luna' },
			repeat: { type: 'string', default: '1' },
			config: { type: 'string', default: defaultModelsFile }
		}
	});
	if (values.help) {
		console.log(help);
		return 0;
	}
	const command = positionals[0] ?? 'validate';
	if (positionals.length > 1 || !['validate', 'run'].includes(command))
		throw new Error('Use validate or run; see --help');
	const repeats = Number(values.repeat);
	if (!Number.isSafeInteger(repeats) || repeats < 1)
		throw new Error('--repeat must be a positive safe integer');
	const models = values.models.split(',');
	if (
		!models.length ||
		new Set(models).size !== models.length ||
		models.some((model) => !['luna', 'jev'].includes(model))
	)
		throw new Error('--models takes luna, jev, or luna,jev without duplicates');
	const pilot = preparePilot();
	const profiles = loadModels(resolve(values.config), pilot.manifest.threshold);
	const count = pilot.inputs.length * models.length * repeats;
	if (command === 'validate' || values['dry-run']) {
		console.log(
			`Validated ${pilot.inputs.length} cases, separate expectations, policy assertion, both profiles, and ${pilot.inputs.length} evidence packets.`
		);
		console.log(
			`Plan: ${models.join(', ')}; repeat=${repeats}; ${count} logical decisions; threshold=${pilot.manifest.threshold}. Offline; no inference.`
		);
		for (const input of pilot.inputs)
			console.log(
				`${input.caseId}: ${Buffer.byteLength(input.packet)} bytes; sha256=${input.sha256}`
			);
		return 0;
	}
	const { runPilot } = await import('./run.ts');
	const result = await runPilot(pilot, profiles, models, repeats);
	console.log(`Report: ${result.directory}/report.json`);
	return result.hasErrors ? 2 : result.hasDisagreements ? 1 : 0;
};

if (import.meta.main)
	try {
		process.exitCode = await main(process.argv.slice(2));
	} catch (error) {
		console.error(
			error instanceof SyntaxError
				? 'Invalid JSON in pilot or model configuration.'
				: error instanceof Error
					? error.message
					: 'Pilot setup failed.'
		);
		process.exitCode = 2;
	}
