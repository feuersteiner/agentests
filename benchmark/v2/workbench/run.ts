import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, relative } from 'node:path';
import { coreDirectory, hash, loadExpectations, v2Directory } from './data.ts';
import type { ModelProfiles, PreparedPilot } from './data.ts';
import { createEvaluator } from './evaluate.ts';
import { joinExpectations, summarize } from './metrics.ts';
import type { Observation } from './metrics.ts';

const writeJson = (path: string, value: unknown): void =>
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

/** Hash the actual compiled runtime, including internal modules rather than just its barrel export. */
const runtimeHash = (): string => {
	const root = join(coreDirectory, 'dist');
	const walk = (directory: string): string[] =>
		readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
			entry.isDirectory()
				? walk(join(directory, entry.name))
				: entry.name.endsWith('.js')
					? [join(directory, entry.name)]
					: []
		);
	return hash(
		walk(root)
			.sort()
			.map((path) => `${relative(root, path)}:${hash(readFileSync(path, 'utf8'))}`)
			.join('\n')
	);
};

export const runPilot = async (
	pilot: PreparedPilot,
	profiles: ModelProfiles,
	models: string[],
	repeats: number
): Promise<{ directory: string; hasErrors: boolean; hasDisagreements: boolean }> => {
	// Fail setup before creating a run or making any calls. Read only named credential values.
	const evaluators = Object.fromEntries(
		models.map((model) => {
			const config = profiles[model]!;
			const keyName = config.decision.apiKeyEnv;
			if (!process.env[keyName]?.trim())
				throw new Error(`Missing configured credential: ${keyName}`);
			return [
				model,
				createEvaluator(model, config, pilot.test, { [keyName]: process.env[keyName] })
			];
		})
	);
	const startedAt = new Date().toISOString();
	const runId = `${startedAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
	const directory = join(v2Directory, 'results', 'raw', runId);
	mkdirSync(directory, { recursive: true });
	const metadata = {
		runId,
		status: 'running',
		startedAt,
		completedAt: null as string | null,
		pilotId: pilot.manifest.id,
		labelStatus: pilot.manifest.labelStatus,
		dataRole: 'development-only; no held-out performance claim',
		models: Object.fromEntries(models.map((model) => [model, profiles[model]])),
		repeats,
		plannedEvaluations: models.length * pilot.inputs.length * repeats,
		order: 'model, then repeat, then manifest case order; sequential; no conversational state',
		inputs: pilot.inputs.map(({ caseId, sha256 }) => ({ caseId, sha256 })),
		test: pilot.test,
		testSha256: hash(JSON.stringify(pilot.test)),
		coreVersion: (
			JSON.parse(readFileSync(join(coreDirectory, 'package.json'), 'utf8')) as { version: string }
		).version,
		runtimeSha256: runtimeHash(),
		bunVersion: Bun.version,
		usageAndCostAvailability:
			'Unavailable from the public decision engine; null throughout. No price assumptions.',
		retries:
			'SDK-managed; HTTP attempt counts are not exposed. logicalDecisionCalls counts runtime engine invocations.'
	};
	writeJson(join(directory, 'metadata.json'), metadata);
	const observations: Observation[] = [];
	for (const model of models)
		for (let repeat = 1; repeat <= repeats; repeat++)
			for (const input of pilot.inputs) {
				const row = await evaluators[model]!(input, repeat);
				observations.push(row);
				appendFileSync(join(directory, 'observations.jsonl'), `${JSON.stringify(row)}\n`);
				console.log(
					`${model} ${input.caseId} repeat=${repeat}: ${row.status === 'completed' ? row.actual : row.status}`
				);
			}

	// Join provisional labels only after all inference. Evaluators never receive this object.
	const expectations = loadExpectations(pilot.manifest.caseIds);
	const rows = joinExpectations(observations, expectations);
	const byModel = Object.fromEntries(
		models.map((model) => [
			model,
			summarize(
				observations.filter((row) => row.model === model),
				expectations,
				repeats
			)
		])
	);
	writeJson(join(directory, 'report.json'), {
		runId,
		labelStatus: pilot.manifest.labelStatus,
		interpretation:
			'Agreement with five synthetic provisional development labels; repeated trials are not independent cases.',
		byModel,
		rows
	});
	metadata.status = 'finished';
	metadata.completedAt = new Date().toISOString();
	writeJson(join(directory, 'metadata.json'), metadata);
	return {
		directory,
		hasErrors: observations.some((row) => row.status === 'inference-error'),
		hasDisagreements: rows.some((row) => row.matches === false)
	};
};
