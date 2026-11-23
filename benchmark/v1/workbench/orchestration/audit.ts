/* eslint-disable -- one-off orchestration scripts, kept as they ran */
// @ts-nocheck -- a one-off script, kept as it ran
// Audit every dataset entry beyond loadEntry: run from the repository root with `bun <this file>`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadEntry, listEntryIds } from '../src/dataset.ts';
import { loadTests } from '../src/catalogue.ts';

const dir = join(import.meta.dirname, '..', 'dataset');
const flatten = (t: string) => t.replace(/\s+/g, ' ').trim();
const usable = new Map<string, Set<number>>();
for (const t of loadTests())
	(usable.get(t.rule) ?? usable.set(t.rule, new Set()).get(t.rule)!).add(t.task);
const ids = listEntryIds(dir);
const walk = (d: string): string[] =>
	readdirSync(d, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? [join(d, e.name) + '/', ...walk(join(d, e.name))] : [join(d, e.name)]
	);
let bad = 0;
for (const id of ids) {
	const problems: string[] = [];
	try {
		const entry = loadEntry(dir, id);
		const want = usable.get(id);
		if (!want) problems.push('not a usable rule in triage');
		else {
			const have = new Set(entry.tasks.keys());
			for (const t of want) if (!have.has(t)) problems.push(`missing task ${t}`);
			for (const t of have) if (!want.has(t)) problems.push(`task ${t} is not usable`);
		}
		const firstSentence = flatten(entry.rule.split('\n')[0]!);
		for (const f of walk(join(dir, id, 'fixture'))) {
			if (
				/(^|\/)(\.git|node_modules|__pycache__|\.pytest_cache|\.claude|\.agents)\/$/.test(f) ||
				f.endsWith('agentests.config.yaml')
			)
				problems.push(`fixture holds ${f}`);
			if (
				!f.endsWith('/') &&
				statSync(f).size < 2_000_000 &&
				flatten(readFileSync(f, 'utf8')).includes(firstSentence)
			)
				problems.push(`rule text in ${f}`);
		}
		for (const [n, t] of entry.tasks)
			if (/agentests|benchmark|skill/i.test(t.prompt))
				problems.push(`task ${n} prompt mentions agentests, benchmark or skill`);
	} catch (e) {
		problems.push((e as Error).message.split('\n').slice(1, 4).join(' | '));
	}
	if (problems.length) {
		bad++;
		console.log(`${id}: ${problems.join('; ')}`);
	}
}
const missing = [...usable.keys()].filter((id) => !ids.includes(id));
console.log(
	`${ids.length} entries, ${bad} with problems; ${missing.length} usable rules without an entry${missing.length ? ': ' + missing.join(', ') : ''}`
);
