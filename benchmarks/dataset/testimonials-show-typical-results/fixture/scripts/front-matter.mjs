// Checks the front matter of the site's pages.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const descriptionLimit = 160;

/** Returns the front matter of a Markdown file as an object, or null when it has none. */
export function parseFrontMatter(text) {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') {
    return null;
  }
  const fields = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === '---') {
      return fields;
    }
    const colon = line.indexOf(':');
    if (colon === -1) {
      continue;
    }
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return null;
}

/** Returns the problems with a page's front matter. */
export function checkPage(text) {
  const fields = parseFrontMatter(text);
  if (fields === null) {
    return ['no front matter'];
  }
  const problems = [];
  for (const name of ['title', 'description']) {
    if (!fields[name]) {
      problems.push(`missing ${name}`);
    }
  }
  if ((fields.description ?? '').length > descriptionLimit) {
    problems.push(`description is over ${descriptionLimit} characters`);
  }
  return problems;
}

/** Returns the paths of the pages to check under a content folder, sorted. */
export function listPages(contentFolder) {
  const folder = join(contentFolder, 'landing');
  return readdirSync(folder)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => join(folder, name));
}

function main() {
  let failed = false;
  for (const path of listPages(join(root, 'content'))) {
    for (const problem of checkPage(readFileSync(path, 'utf8'))) {
      failed = true;
      console.log(`${relative(root, path)}: ${problem}`);
    }
  }
  return failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
