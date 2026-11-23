// Lists the support macros in support/macros/ with their titles and tags.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** A macro's title and tags, from its front matter. */
export function readMacro(text) {
	const match = text.match(/^---\n([\s\S]*?)\n---/);
	const macro = { title: '', tags: [] };
	if (!match) return macro;
	for (const line of match[1].split('\n')) {
		const colon = line.indexOf(':');
		if (colon === -1) continue;
		const key = line.slice(0, colon).trim();
		const value = line.slice(colon + 1).trim();
		if (key === 'title') macro.title = value;
		if (key === 'tags') macro.tags = value.split(',');
	}
	return macro;
}

/** One line per macro, sorted by title: the title, then its tags in brackets. */
export function listMacros(texts) {
	return texts
		.map(readMacro)
		.sort((a, b) => a.title.localeCompare(b.title))
		.map(({ title, tags }) => `${title} [${tags.join('|')}]`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const folder = 'support/macros';
	const texts = readdirSync(folder)
		.filter((name) => name.endsWith('.md'))
		.map((name) => readFileSync(join(folder, name), 'utf8'));
	for (const line of listMacros(texts)) console.log(line);
}
