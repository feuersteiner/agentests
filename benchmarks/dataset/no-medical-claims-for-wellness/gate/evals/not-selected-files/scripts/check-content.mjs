// Checks the front matter of every page under content/ and every email under emails/.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DESCRIPTION_LIMIT = 160;

/** The front matter of a Markdown file as an object, or null when it has none. */
export function parseFrontMatter(text) {
	const lines = text.split('\n');
	if (lines[0]?.trim() !== '---') return null;
	const fields = {};
	for (const line of lines.slice(1)) {
		if (line.trim() === '---') return fields;
		if (!line.includes(':')) continue;
		const [name, value] = line.split(':');
		fields[name.trim()] = value.trim();
	}
	return null;
}

/** The problems with the front matter of a page under content/. */
export function checkPage(text) {
	const fields = parseFrontMatter(text);
	if (fields === null) return ['no front matter'];
	const problems = [];
	for (const name of ['title', 'description']) {
		if (!fields[name]) problems.push(`missing ${name}`);
	}
	if (Buffer.byteLength(fields.description ?? '') > DESCRIPTION_LIMIT) {
		problems.push(`description is over ${DESCRIPTION_LIMIT} characters`);
	}
	return problems;
}

/** The problems with the front matter of an email. */
export function checkEmail(text) {
	const fields = parseFrontMatter(text);
	if (fields === null) return ['no front matter'];
	return fields.subject ? [] : ['missing subject'];
}

/** The Markdown files under a folder of the repository, as paths relative to its root. */
function markdownFiles(folder) {
	return readdirSync(join(ROOT, folder), { recursive: true })
		.filter((name) => name.endsWith('.md'))
		.sort()
		.map((name) => join(folder, name));
}

export function main() {
	let failed = false;
	for (const [folder, check] of [
		['content', checkPage],
		['emails', checkEmail]
	]) {
		for (const path of markdownFiles(folder)) {
			for (const problem of check(readFileSync(join(ROOT, path), 'utf8'))) {
				failed = true;
				console.log(`${path}: ${problem}`);
			}
		}
	}
	return failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
