import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FOLDERS = ['src', 'test', 'bench', 'scripts'];
const MAX_LINE = 100;

function listJs(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return listJs(path);
    return path.endsWith('.js') ? [path] : [];
  });
}

const named = process.argv.slice(2).filter((path) => path.endsWith('.js'));
const files = named.length > 0 ? named : FOLDERS.flatMap(listJs);
let problems = 0;

for (const file of files) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      const report = (message) => {
        console.error(`${file}:${index + 1}  ${message}`);
        problems += 1;
      };
      if (/\s+$/.test(line)) report('trailing whitespace');
      if (line.length > MAX_LINE) report(`line longer than ${MAX_LINE} characters`);
      if (file.startsWith('src') && /console\.log/.test(line)) report('console.log in src');
    });
}

if (problems > 0) process.exit(1);
console.log(`lint: ${files.length} file(s) clean`);
