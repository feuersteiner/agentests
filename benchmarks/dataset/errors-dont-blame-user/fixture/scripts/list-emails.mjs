import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The frontmatter of an email file, the lines between the two `---`, as an object. */
export const readFrontmatter = (text) => {
	const [, block = ''] = text.split('---\n');
	return Object.fromEntries(
		block
			.split('\n')
			.filter((line) => line.includes(':'))
			.map((line) => {
				const [key, value] = line.split(':');
				return [key.trim(), value.trim()];
			})
	);
};

const emailsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'emails');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	for (const file of readdirSync(emailsFolder).filter((name) => name.endsWith('.md')).sort()) {
		const { subject } = readFrontmatter(readFileSync(join(emailsFolder, file), 'utf8'));
		console.log(`${file}: ${subject}`);
	}
}
