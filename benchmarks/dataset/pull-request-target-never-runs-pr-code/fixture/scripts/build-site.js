import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (text) => escape(text).replace(/`([^`]+)`/g, '<code>$1</code>');

const html = [];
let code = null;
for (const line of readFileSync('README.md', 'utf8').split('\n')) {
  if (line.startsWith('```')) {
    if (code === null) code = [];
    else {
      html.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);
      code = null;
    }
  } else if (code !== null) code.push(line);
  else if (line.startsWith('## ')) html.push(`<h2>${inline(line.slice(3))}</h2>`);
  else if (line.startsWith('# ')) html.push(`<h1>${inline(line.slice(2))}</h1>`);
  else if (line.startsWith('- ')) html.push(`<li>${inline(line.slice(2))}</li>`);
  else if (line.trim() !== '') html.push(`<p>${inline(line)}</p>`);
}

mkdirSync('site/dist', { recursive: true });
writeFileSync(
  'site/dist/index.html',
  `<!doctype html>\n<meta charset="utf-8">\n<title>spanwise</title>\n${html.join('\n')}\n`
);
console.log('site/dist/index.html written');
