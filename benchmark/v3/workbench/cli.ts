import { lstatSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePlan, safeRunId } from './plan.ts';
import { readIndex, resultRoot, runPilot } from './run.ts';
import { auditV3Index, profileV3Index } from './diagnostics.ts';

export const help = `Controlled v3 support pilot (offline validation by default)
Usage: bun --no-env-file --no-install cli.ts <validate|run|report> [--run-id ID]
  run additionally requires --allow-paid --external-spending-cap-confirmed
validate freezes 2 situations x 2 gates x 3 treatments x 1 repeat without inference.
run reserves at most 36 producer + 36 gate + 12 review logical calls (84 total).
Upstream HTTP attempts, including SDK gate retries, have a separate hard cap156.
The external provider spending cap must already be configured; no dollar cap is
implemented locally. Never run before the investigation and owner authorization.
A logs; B is quiet with identical feedback; C is quiet with bounded scheduling.
The 12 isolated single-trial cohorts diagnose mechanics; caps cannot bind here.
No resume/replay command exists. Existing run directories are always refused.
report reads a saved index offline and writes private diagnostics beside it.
Credentials are in process memory only. Use Bun --no-env-file for every command.`;
export const main = async (args = process.argv.slice(2)): Promise<number> => {
	const [command, ...rest] = args;
	if (!command || ['help', '--help', '-h'].includes(command)) {
		console.log(help);
		return 0;
	}
	if (!['validate', 'run', 'report'].includes(command)) throw new Error('Unknown command');
	let runId: string | undefined,
		allowPaid = false,
		externalSpendingCapConfirmed = false;
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (arg === '--run-id' && !runId && rest[i + 1]) runId = rest[++i];
		else if (arg === '--allow-paid' && !allowPaid) allowPaid = true;
		else if (arg === '--external-spending-cap-confirmed' && !externalSpendingCapConfirmed)
			externalSpendingCapConfirmed = true;
		else throw new Error('Unknown, repeated or incomplete argument');
	}
	if (command !== 'run' && (allowPaid || externalSpendingCapConfirmed))
		throw new Error('Paid flags apply only to run');
	if (command === 'validate') {
		const plan = makePlan(runId ?? 'validation');
		console.log(
			JSON.stringify(
				{ planHash: plan.planHash, trials: plan.jobs.length, settings: plan.settings },
				null,
				2
			)
		);
		return 0;
	}
	if (!runId) throw new Error('--run-id required');
	safeRunId(runId);
	if (command === 'report') {
		const directory = resolve(resultRoot, `controlled-${runId}`);
		if (lstatSync(directory).isSymbolicLink()) throw new Error('Unsafe report directory');
		const index = readIndex(directory);
		const report = { audit: auditV3Index(index), profile: profileV3Index(index) };
		const target = resolve(directory, 'diagnostics.json');
		const temp = `${target}.${crypto.randomUUID()}.tmp`;
		writeFileSync(temp, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
		renameSync(temp, target);
		console.log(`Private diagnostics written to ${directory}`);
		return 0;
	}
	if (!allowPaid || !externalSpendingCapConfirmed)
		throw new Error('--allow-paid and --external-spending-cap-confirmed required');
	const plan = makePlan(runId, undefined, externalSpendingCapConfirmed);
	const { index, directory } = await runPilot({ plan, allowPaid, externalSpendingCapConfirmed });
	console.log(`Private invocation saved to ${directory}`);
	return index.stoppedReason ||
		index.jobs.some((j) => j.status !== 'completed' || j.judgeState !== 'completed')
		? 1
		: 0;
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
	main()
		.then((code) => {
			process.exitCode = code;
		})
		.catch(() => {
			console.error(
				'Controlled pilot command failed. No automatic replay occurs; inspect the private invocation index when present.'
			);
			process.exitCode = 1;
		});
