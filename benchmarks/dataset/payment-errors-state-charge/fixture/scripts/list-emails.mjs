// Lists each transactional email in app.config.json with its trigger and subject.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The key-value pairs of a Markdown file's front matter, between the two "---" lines. */
export function readFrontmatter(text) {
	const match = text.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const values = {};
	for (const line of match[1].split('\n')) {
		const colon = line.indexOf(':');
		if (colon === -1) continue;
		values[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
	}
	return values;
}

/** One line per email: its trigger and subject, or what is wrong with it. */
export function listEmails(config, read = (path) => readFileSync(path, 'utf8'), exists = existsSync) {
	return config.emails.transactional.map(({ file, trigger }) => {
		if (!exists(file)) return `${trigger}  MISSING ${file}`;
		const { subject } = readFrontmatter(read(file));
		return subject ? `${trigger}  ${subject}` : `${trigger}  NO SUBJECT ${file}`;
	});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const config = JSON.parse(readFileSync('app.config.json', 'utf8'));
	for (const line of listEmails(config)) console.log(line);
}
