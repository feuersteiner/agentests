import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter } from './front-matter.mjs';

const ROOT = join(import.meta.dirname, '..');
const FOLDERS = ['content/landing', 'content/push', 'emails'];
export const DESCRIPTION_LIMIT = 155;

/** The Markdown files directly inside `folder`, sorted by name. */
export function listMarkdown(folder) {
	return readdirSync(folder)
		.filter((name) => name.endsWith('.md'))
		.sort()
		.map((name) => join(folder, name));
}

/** The problems with one file's front matter: emails need a subject and a preheader, other files a title and a description. */
export function checkFile(path, text) {
	const fields = parseFrontMatter(text);
	if (fields === null) return ['no front matter'];
	const isEmail = path.split(/[\\/]/).includes('emails');
	const required = isEmail ? ['subject', 'preheader'] : ['title', 'description'];
	const problems = required.filter((name) => !fields[name]).map((name) => `missing ${name}`);
	if (!isEmail && (fields.description ?? '').length > DESCRIPTION_LIMIT)
		problems.push(`description is over ${DESCRIPTION_LIMIT} characters`);
	return problems;
}

function main() {
	let failed = false;
	for (const folder of FOLDERS) {
		for (const path of listMarkdown(join(ROOT, folder))) {
			for (const problem of checkFile(path, readFileSync(path, 'utf8'))) {
				failed = true;
				console.log(`${relative(ROOT, path)}: ${problem}`);
			}
		}
	}
	process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
