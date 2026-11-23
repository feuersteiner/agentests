/* eslint-disable -- one-off orchestration scripts, kept as they ran */
// Collects every run of the redesigned benchmark into one JSON file for the Arm Scoreboard page.
// Usage: bun make-data.ts <output.json> <runs directory>
// Set SKIP to comma-separated invocation IDs; filter quality comparisons and retries separately.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[3];
if (!process.argv[2] || !root)
	throw new Error('Usage: bun make-data.ts <output.json> <runs directory>');
const rows: Record<string, unknown>[] = [];

/** Peak context and window from a run's saved stream, for runs from before the harness recorded them. */
const contextFromTranscript = (path: string) => {
	if (!existsSync(path)) return { peak: null, percent: null, compactions: null };
	let peak = 0;
	let window = 0;
	let compactions = 0;
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		if (!line.trim()) continue;
		let event: any;
		try {
			event = JSON.parse(line);
		} catch {
			continue;
		}
		const usage = event.type === 'assistant' ? event.message?.usage : undefined;
		if (usage)
			peak = Math.max(
				peak,
				(usage.input_tokens ?? 0) +
					(usage.cache_read_input_tokens ?? 0) +
					(usage.cache_creation_input_tokens ?? 0)
			);
		if (event.type === 'system' && event.subtype === 'compact_boundary') compactions++;
		if (event.type === 'result')
			for (const model of Object.values(event.modelUsage ?? {}) as any[])
				window = model.contextWindow ?? window;
	}
	return { peak, percent: window ? Math.round((peak / window) * 1000) / 10 : null, compactions };
};
const invocations: string[] = [];
for (const name of readdirSync(root).sort()) {
	const folder = join(root, name);
	const manifest = join(folder, 'run.json');
	const results = join(folder, 'results.json');
	if (name.startsWith('prove-') || !existsSync(manifest) || !existsSync(results)) continue;
	const run = JSON.parse(readFileSync(manifest, 'utf8'));
	if (run.rulesPerRun === undefined) continue; // runs of the earlier design are left out
	if (process.env.SKIP?.split(',').includes(name)) continue;
	invocations.push(name);
	for (const result of Object.values(JSON.parse(readFileSync(results, 'utf8'))) as any[]) {
		const saved =
			result.agent?.peakContextTokens === undefined
				? contextFromTranscript(join(folder, result.folder, 'transcript.jsonl'))
				: null;
		rows.push({
			invocation: name,
			key: result.key,
			rule: result.rule,
			task: result.task,
			test: `${result.rule}/${result.task}`,
			arm: result.arm,
			domain: result.domain,
			tempting: result.tempting,
			status: result.status,
			score: result.score,
			seconds: result.durationSeconds,
			costUsd: result.costUsd,
			judgeCostUsd: result.judge?.costUsd ?? null,
			judgeModel: result.judge?.model ?? null,
			tier: result.targetContext ? `${Math.round(result.targetContext / 1000)}k` : 'short',
			targetContext: result.targetContext ?? null,
			peakContextTokens: saved ? saved.peak : (result.agent?.peakContextTokens ?? null),
			contextPercent: saved ? saved.percent : (result.agent?.contextPercent ?? null),
			compactions: saved ? saved.compactions : (result.agent?.compactions ?? null),
			skillLoaded: result.agent?.skillLoaded ?? null,
			blocked: result.gate?.blocked ?? null
		});
	}
}
writeFileSync(
	process.argv[2]!,
	`${JSON.stringify({
		rows,
		meta: [
			{
				label: 'make-data.ts',
				value: readFileSync(import.meta.path, 'utf8'),
				type: 'code',
				lang: 'typescript'
			},
			{
				label: 'Input',
				value: `results.json of ${invocations.length} invocation(s): ${invocations.join(', ')}`
			}
		]
	})}\n`
);
console.log(`${rows.length} run(s) from ${invocations.length} invocation(s)`);
