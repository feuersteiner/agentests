import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The keys of the English `source` strings that the `translation` does not have. */
export const findMissing = (source, translation) =>
	Object.keys(source).filter((key) => !(key in translation));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const config = JSON.parse(readFileSync(join(root, 'translation.config.json'), 'utf8'));
	const source = JSON.parse(readFileSync(join(root, config.strings), 'utf8'));
	for (const locale of config.targetLocales) {
		const file = join(root, 'locales', `${locale}.json`);
		const translation = JSON.parse(readFileSync(file, 'utf8'));
		for (const key of findMissing(source, translation)) console.log(`${locale}: ${key}`);
	}
}
