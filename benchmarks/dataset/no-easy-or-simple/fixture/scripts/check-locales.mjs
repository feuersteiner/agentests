import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The keys of `strings` whose value is an empty string. */
export const findEmpty = (strings) =>
	Object.entries(strings)
		.filter(([, value]) => typeof value === 'string' && value.trim() === '')
		.map(([key]) => key);

const localeFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales', 'en.json');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const empty = findEmpty(JSON.parse(readFileSync(localeFile, 'utf8')));
	for (const key of empty) console.log(`empty string: ${key}`);
	process.exit(empty.length === 0 ? 0 : 1);
}
