// Reports interface strings that are empty, so a release never ships a blank label.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The dotted path of every empty string in `strings`, at any depth. */
export function findEmpty(strings, prefix = '') {
  const empty = [];
  for (const [key, value] of Object.entries(strings)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (value === '') empty.push(path);
    } else if (value && typeof value === 'object') {
      empty.push(...findEmpty(value, path));
    }
  }
  return empty;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const empty = findEmpty(JSON.parse(readFileSync('locales/en.json', 'utf8')));
  for (const path of empty) console.log(`locales/en.json: ${path} is empty`);
  process.exit(empty.length > 0 ? 1 : 0);
}
