import { format, parse } from '../src/index.js';

const ITERATIONS = 200_000;

const CASES = [
  ['format(90061000)', () => format(90_061_000)],
  ['format(90061000, { largest: 2 })', () => format(90_061_000, { largest: 2 })],
  ["parse('1d 1h 1m 1s')", () => parse('1d 1h 1m 1s')],
  ["parse('250ms')", () => parse('250ms')],
];

function opsPerSecond(fn) {
  for (let i = 0; i < 10_000; i++) fn();
  const start = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) fn();
  const seconds = Number(process.hrtime.bigint() - start) / 1e9;
  return ITERATIONS / seconds;
}

console.log('| Case | ops/sec |');
console.log('| --- | ---: |');
for (const [name, fn] of CASES) {
  console.log(`| \`${name}\` | ${opsPerSecond(fn)} |`);
}
