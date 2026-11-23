/** Milliseconds in one of each unit that parseDuration accepts. */
export const UNIT_MS = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000
} as const;

export type DurationUnit = keyof typeof UNIT_MS;

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/;

/** Parses a duration such as `250ms`, `90s` or `1.5h` into milliseconds. */
export function parseDuration(input: string): number {
	const match = DURATION_PATTERN.exec(input.trim());
	if (match === null) {
		const units = Object.keys(UNIT_MS).join(', ');
		throw new SyntaxError(
			`Cannot parse duration as it must be a number followed by one of ${units}: current value is "${input}"`
		);
	}
	const [, amount, unit] = match;
	if (unit === undefined) {
		throw new SyntaxError(`Cannot parse duration "${input}": unit is missing`);
	}
	return Number(amount) * UNIT_MS[unit as DurationUnit];
}

/** Converts milliseconds to the given unit, so that 90000 in `m` is 1.5. */
export function convertDuration(ms: number, unit: string): number {
	if (!Object.hasOwn(UNIT_MS, unit)) {
		const units = Object.keys(UNIT_MS).join(', ');
		throw new RangeError(`cannot convert duration as unit must be one of ${units}: current value is "${unit}"`);
	}
	return ms / UNIT_MS[unit as DurationUnit];
}
