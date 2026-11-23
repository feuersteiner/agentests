import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The targets of the Markdown links in `text` that point at other files, not at websites. */
export const findLocalLinks = (text) =>
	[...text.matchAll(/\]\(([^)\s]+)\)/g)]
		.map((match) => match[1])
		.filter((target) => !/^(https?:|mailto:)/.test(target));

/** The local links of `text` whose file does not exist, given a function that says whether one does. */
export const findBrokenLinks = (text, exists) =>
	findLocalLinks(text).filter((target) => !exists(target));

const helpDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'help');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	let broken = 0;
	for (const file of readdirSync(helpDirectory).filter((name) => name.endsWith('.md'))) {
		const text = readFileSync(join(helpDirectory, file), 'utf8');
		for (const target of findBrokenLinks(text, (link) => existsSync(join(helpDirectory, link)))) {
			console.log(`${file}: broken link ${target}`);
			broken += 1;
		}
	}
	process.exit(broken === 0 ? 0 : 1);
}
