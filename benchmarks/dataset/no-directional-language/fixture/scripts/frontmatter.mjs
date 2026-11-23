// Reads the front matter of articles and emails, and reports required fields that are missing.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The `key: value` fields between the opening and closing `---` lines, and the text after them. */
export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split('\n')) {
    if (!line.includes(':')) continue;
    const [key, value] = line.split(':');
    data[key.trim()] = value.trim();
  }
  return { data, body: text.slice(match[0].length) };
}

/** The fields of `required` that are missing or empty in `data`. */
export function missingFields(data, required) {
  return required.filter((field) => !data[field]);
}

const REQUIRED = { 'content/help': ['title'], emails: ['subject', 'preheader'] };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let problems = 0;
  for (const [dir, required] of Object.entries(REQUIRED)) {
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.md'))) {
      const { data } = parseFrontmatter(readFileSync(join(dir, name), 'utf8'));
      for (const field of missingFields(data, required)) {
        console.log(`${dir}/${name}: missing ${field}`);
        problems += 1;
      }
    }
  }
  process.exit(problems > 0 ? 1 : 0);
}
