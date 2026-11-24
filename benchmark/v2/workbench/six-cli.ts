import { renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSixPlan, readSixIndex, runSix, sixRoot } from './six-run.ts';
import { reportSix } from './six-metrics.ts';

export const sixHelp = `Six-arm support-draft study
Usage: bun --no-env-file --no-install six-cli.ts <validate|smoke|run|resume|report> [--run-id ID]
validate freezes and checks the ten-situation plan without inference.
smoke runs one situation across six arms once; excluded from measured reporting.
run executes 10 situations x 6 arms x 3 repeats; resume skips unknown interrupted calls.
report writes report.json and report.md in the ignored private run directory.
Credentials must be in process memory; no environment files are loaded.`;
export const sixMain = async (args = process.argv.slice(2)): Promise<number> => {
	const [command, ...rest] = args;
	if (!command || ['help', '--help', '-h'].includes(command)) {
		console.log(sixHelp);
		return 0;
	}
	if (!['validate', 'smoke', 'run', 'resume', 'report'].includes(command))
		throw new Error('Unknown command');
	if (rest.length && (rest.length !== 2 || rest[0] !== '--run-id' || !rest[1]))
		throw new Error('Expected --run-id ID');
	const runId = rest[1];
	if (command === 'validate') {
		const plan = makeSixPlan('validation', 'measured');
		console.log(
			JSON.stringify(
				{ planHash: plan.planHash, trials: plan.jobs.length, settings: plan.settings },
				null,
				2
			)
		);
		return 0;
	}
	if (!runId || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/u.test(runId))
		throw new Error('A safe --run-id is required');
	const directory = resolve(sixRoot, `six-${runId}`);
	if (command === 'report') {
		const result = reportSix(readSixIndex(directory));
		const json = JSON.stringify(result, null, 2) + '\n';
		const markdown =
			'# Six-arm study report\n\nThis report contains provisional model judgments, not human labels. The study is not held out; gated arms receive extra feedback and compute. Missing values are unavailable, not zero.\n\n```json\n' +
			json +
			'```\n';
		for (const [name, content] of [
			['report.json', json],
			['report.md', markdown]
		] as const) {
			const target = resolve(directory, name),
				temp = resolve(directory, `.${name}.${crypto.randomUUID()}.tmp`);
			writeFileSync(temp, content, { mode: 0o600, flag: 'wx' });
			renameSync(temp, target);
		}
		console.log(`Private reports written to ${directory}`);
		return 0;
	}
	const saved = command === 'resume' ? readSixIndex(directory) : null;
	const plan = makeSixPlan(runId, saved?.kind ?? (command === 'smoke' ? 'smoke' : 'measured'));
	const { index } = await runSix({ plan, resume: command === 'resume' });
	console.log(
		JSON.stringify(
			{
				runId,
				kind: index.kind,
				stoppedReason: index.stoppedReason,
				trialStatuses: Object.fromEntries(
					[...new Set(index.jobs.map((j) => j.status))].map((s) => [
						s,
						index.jobs.filter((j) => j.status === s).length
					])
				),
				judgeStatuses: Object.fromEntries(
					[...new Set(index.jobs.map((j) => j.judgeState))].map((s) => [
						s,
						index.jobs.filter((j) => j.judgeState === s).length
					])
				)
			},
			null,
			2
		)
	);
	return index.stoppedReason ||
		index.jobs.some((j) => j.status !== 'completed' || j.judgeState !== 'completed')
		? 1
		: 0;
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
	sixMain()
		.then((code) => {
			process.exitCode = code;
		})
		.catch(() => {
			console.error('Six-arm command failed; check the private run index for progress.');
			process.exitCode = 1;
		});
