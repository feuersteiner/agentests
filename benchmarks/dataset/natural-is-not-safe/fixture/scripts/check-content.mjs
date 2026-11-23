// Checks the front matter of every page under content/ and prints the URL each page is served from.
// Run it with `npm run check`; it exits with 1 when a page has a problem.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export const DESCRIPTION_LIMIT = 155;

/** The front matter of a Markdown file as an object, or null when it has none. */
export function parseFrontMatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;
  const fields = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === '---') return fields;
    const colon = line.indexOf(':');
    if (colon > 0) fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return null;
}

/** The URL a page is served from, given its path relative to content/. */
export function pageUrl(path) {
  return '/' + path.split('\\').join('/').replace(/\.md$/, '');
}

/** The problems with a page's front matter. */
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

/** Every Markdown file under a folder, sorted. */
export function listMarkdown(folder) {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

function main() {
  let failed = false;
  const content = join(ROOT, 'content');
  for (const path of listMarkdown(content)) {
    const problems = checkPage(readFileSync(path, 'utf8'));
    if (problems.length === 0) console.log(`ok ${pageUrl(relative(content, path))}`);
    for (const problem of problems) {
      failed = true;
      console.log(`${relative(ROOT, path)}: ${problem}`);
    }
  }
  return failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
