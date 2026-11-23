import type { DatasetEntry } from './dataset.ts';
import { seededRandom } from './pick.ts';

/** A 32-bit FNV-1a hash of `text`, the seed of a test's companions. */
const hash = (text: string): number => {
	let state = 0x811c9dc5;
	for (const character of text) {
		state ^= character.codePointAt(0)!;
		state = Math.imul(state, 0x01000193) >>> 0;
	}
	return state >>> 0;
};

const byId = (a: DatasetEntry, b: DatasetEntry): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The `count` other entries of the test's domain whose skills or Tests sit beside its own in the skill and gate
 * arms, drawn without replacement from the dataset with a seed made from the test's name, `<rule-id>/<task>`. Every
 * arm of a test, and every invocation over the same dataset, gets the same companions; a domain with fewer other
 * entries gives them all.
 */
export const pickCompanions = (
	entry: DatasetEntry,
	task: number,
	entries: DatasetEntry[],
	count: number
): DatasetEntry[] => {
	const pool = entries
		.filter((other) => other.domain === entry.domain && other.id !== entry.id)
		.sort(byId);
	const random = seededRandom(hash(`${entry.id}/${task}`));
	const picks: DatasetEntry[] = [];
	while (picks.length < count && pool.length > 0)
		picks.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
	return picks.sort(byId);
};
