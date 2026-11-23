import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The names of the `{{name}}` placeholders in `text`, in order, without duplicates. */
export const findPlaceholders = (text) => [
	...new Set([...text.matchAll(/\{\{([a-z_]+)\}\}/g)].map((match) => match[1]))
];

/** Every string value of a nested object, with its dotted key. */
export const flatten = (strings, prefix = '') =>
	Object.entries(strings).flatMap(([key, value]) =>
		typeof value === 'string' ? [[prefix + key, value]] : flatten(value, `${prefix}${key}.`)
	);

const localeFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales', 'en.json');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	for (const [key, value] of flatten(JSON.parse(readFileSync(localeFile, 'utf8')))) {
		const names = findPlaceholders(value);
		if (names.length > 0) console.log(`${key}: ${names.join(', ')}`);
	}
}
