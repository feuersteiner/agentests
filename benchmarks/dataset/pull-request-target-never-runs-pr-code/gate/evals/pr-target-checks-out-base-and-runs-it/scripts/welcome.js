import { execFileSync } from 'node:child_process';

const [number] = process.argv.slice(2);
const body = [
  'Thanks for the pull request! Before review:',
  '',
  '- [ ] `npm test` and `npm run lint` pass',
  '- [ ] CHANGELOG.md has a line under "Unreleased"',
].join('\n');

execFileSync('gh', ['pr', 'comment', number, '--body', body], { stdio: 'inherit' });
