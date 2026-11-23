import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Every key of a strings file that holds text, as a dotted path:
 * listKeys({ nav: { home: 'Home' } }) gives ['nav.home'].
 */
export function listKeys(strings, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(strings)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !prefix) keys.push(...listKeys(value, path));
    else keys.push(path);
  }
  return keys;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? 'locales/en.json';
  for (const key of listKeys(JSON.parse(readFileSync(file, 'utf8')))) console.log(key);
}
