import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The number of words in `text` as the translators count them: runs of characters that hold a letter or a digit. */
export const countWords = (text) =>
	text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

/** Every string value of `strings`, at any depth. */
export const collectStrings = (strings) =>
	Object.values(strings).flatMap((value) =>
		typeof value === 'string' ? [value] : collectStrings(value)
	);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const config = JSON.parse(readFileSync(join(root, 'translation.config.json'), 'utf8'));
	const strings = JSON.parse(readFileSync(join(root, config.strings), 'utf8'));
	let total = 0;
	const report = (file, words) => {
		console.log(`${file}: ${words} words`);
		total += words;
	};
	report(config.strings, collectStrings(strings).reduce((sum, text) => sum + countWords(text), 0));
	for (const article of config.helpArticles) {
		const file = `content/help/${article}.md`;
		report(file, countWords(readFileSync(join(root, file), 'utf8')));
	}
	console.log(`total: ${total} words`);
}
