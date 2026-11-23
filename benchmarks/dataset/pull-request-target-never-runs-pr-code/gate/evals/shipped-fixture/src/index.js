const UNITS = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
  ['ms', 1],
];

const UNIT_MS = Object.fromEntries(UNITS);
const PART = /^(\d+)(ms|d|h|m|s)$/;

/**
 * Formats a span in milliseconds, such as 5400000 as "1h 30m".
 * Options: `largest`, the most units to show (all by default), and `ms`, whether to show
 * milliseconds (false by default).
 */
export function format(span, { largest = Infinity, ms = false } = {}) {
  if (!Number.isFinite(span)) throw new TypeError('format expects a finite number');
  const sign = span < 0 ? '-' : '';
  let rest = Math.abs(Math.round(span));
  const parts = [];
  for (const [unit, size] of UNITS) {
    if (unit === 'ms' && !ms) break;
    if (parts.length > largest) break;
    const count = Math.floor(rest / size);
    rest -= count * size;
    if (count > 0) parts.push(`${count}${unit}`);
  }
  return sign + parts.join(' ');
}

/** Parses a span such as "1h 30m" into milliseconds. */
export function parse(text) {
  if (typeof text !== 'string') throw new TypeError('parse expects a string');
  let total = 0;
  for (const word of text.trim().split(/\s+/)) {
    const match = PART.exec(word);
    if (!match) throw new SyntaxError(`invalid duration: "${text}"`);
    total += Number(match[1]) * UNIT_MS[match[2]];
  }
  return total;
}
