/* eslint-disable -- one-off orchestration scripts, kept as they ran */
// Summarises the final proofs: one line per entry and model, then every mismatch, and fixture evals that fail.
// Usage: bun summarise-proofs.ts <folder of <entry>.proof.json files> > summary.md
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const folder = process.argv[2]!;
const lines: string[] = [
	'| Entry | luna | jev | refused | errors |',
	'| --- | ---: | ---: | ---: | ---: |'
];
const misses: string[] = [];
const fixtureFails: string[] = [];
let totals = { luna: [0, 0], jev: [0, 0], cost: 0 };
for (const file of readdirSync(folder)
	.filter((name) => name.endsWith('.proof.json'))
	.sort()) {
	const proof = JSON.parse(readFileSync(join(folder, file), 'utf8'));
	for (const [id, arms] of Object.entries(proof.entries ?? {}) as [string, any][]) {
		const cell = (arm: string) => (arms[arm] ? `${arms[arm].matches}/${arms[arm].total}` : '-');
		const refused = (arms.luna?.refused ?? 0) + (arms.jev?.refused ?? 0);
		const errors = (arms.luna?.errors ?? 0) + (arms.jev?.errors ?? 0);
		lines.push(`| ${id} | ${cell('luna')} | ${cell('jev')} | ${refused} | ${errors} |`);
		for (const arm of ['luna', 'jev'] as const) {
			const result = arms[arm];
			if (!result) continue;
			totals[arm][0] += result.matches;
			totals[arm][1] += result.total;
			totals.cost += result.costUsd;
			for (const evalProof of result.evals.filter((e: any) => !e.matches)) {
				misses.push(
					`- ${id} on ${arm}: ${evalProof.eval} expected ${evalProof.expected}, got ${evalProof.actual}${evalProof.error ? ` (${evalProof.error.slice(0, 120)})` : ''}`
				);
				if (
					/fixture|unchanged|as-shipped|shipped|existing/.test(evalProof.eval) &&
					evalProof.expected !== 'fail'
				)
					fixtureFails.push(
						`- ${id} on ${arm}: ${evalProof.eval} (${evalProof.expected} expected, ${evalProof.actual})`
					);
			}
		}
	}
}
console.log(
	`# Final proof\n\nluna ${totals.luna[0]}/${totals.luna[1]}, jev ${totals.jev[0]}/${totals.jev[1]}; decision calls cost ${totals.cost.toFixed(4)} USD.\n`
);
console.log(
	`## Fixture evals that do not get their expected outcome\n\n${fixtureFails.join('\n') || 'None.'}\n`
);
console.log(`## Per entry\n\n${lines.join('\n')}\n`);
console.log(`## Every mismatch\n\n${misses.join('\n') || 'None.'}`);
