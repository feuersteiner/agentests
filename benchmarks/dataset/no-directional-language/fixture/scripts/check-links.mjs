// Reports links between help articles whose target file does not exist.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LINK = /\[[^\]]*\]\(([^)\s]+)\)/;

/** The relative links in a Markdown text, without web or mail links. */
export function findLinks(text) {
  const links = [];
  for (const line of text.split('\n')) {
    const match = line.match(LINK);
    if (match && !/^[a-z]+:/i.test(match[1])) links.push(match[1]);
  }
  return links;
}

/** Each "<article>: <link>" under `dir` whose target file does not exist. */
export function findBroken(dir) {
  const broken = [];
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.md'))) {
    for (const link of findLinks(readFileSync(join(dir, name), 'utf8'))) {
      if (!existsSync(join(dir, link.split('#')[0]))) broken.push(`${name}: ${link}`);
    }
  }
  return broken;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const broken = findBroken('content/help');
  for (const line of broken) console.log(line);
  process.exit(broken.length > 0 ? 1 : 0);
}
