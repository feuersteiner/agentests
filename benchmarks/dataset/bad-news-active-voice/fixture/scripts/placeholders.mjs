import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The names of the {{placeholders}} in a text, each once, in the order they first appear. */
export const findPlaceholders = (text) => [
	...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]))
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	for (const folder of ['emails', 'support/macros']) {
		for (const file of readdirSync(join(root, folder)).filter((name) => name.endsWith('.md')).sort()) {
			const names = findPlaceholders(readFileSync(join(root, folder, file), 'utf8'));
			console.log(`${folder}/${file}: ${names.join(', ') || '(none)'}`);
		}
	}
}
