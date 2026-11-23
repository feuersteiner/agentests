/** A time of day on a 24-hour clock. */
export interface TimeOfDay {
	hours: number;
	minutes: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

/** Parses a calendar date written as `YYYY-MM-DD` into a `Date` at midnight UTC. */
export function parseDate(input: string): Date {
	const match = DATE_PATTERN.exec(input.trim());
	if (match === null) {
		throw new SyntaxError(
			`Cannot parse date as it must have the form YYYY-MM-DD: current value is "${input}"`
		);
	}
	const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		throw new RangeError(
			`Cannot parse date "${input}" as it must be a day in the calendar: current value rolls over to ${date.toISOString().slice(0, 10)}`
		);
	}
	return date;
}

/** Parses a time of day written as `H:MM` or `HH:MM`. */
export function parseTime(input: string): TimeOfDay {
	const match = TIME_PATTERN.exec(input.trim());
	if (match === null) {
		throw new SyntaxError(
			`Cannot parse time as it must have the form HH:MM: current value is "${input}"`
		);
	}
	return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** A span of calendar days, both ends included. */
export interface DateRange {
	start: Date;
	end: Date;
}

/** Parses a range of dates written as `YYYY-MM-DD..YYYY-MM-DD`. */
export function parseRange(input: string): DateRange {
	const text = input.trim();
	const separator = text.indexOf('..');
	if (separator === -1) {
		throw new SyntaxError(
			`Cannot parse range "${input}" as it must have the form YYYY-MM-DD..YYYY-MM-DD: separator ".." is missing.`
		);
	}
	const startText = text.slice(0, separator);
	const endText = text.slice(separator + 2);
	const start = parseDate(startText);
	const end = parseDate(endText);
	if (end < start) {
		throw new RangeError(`Cannot parse range "${input}": end ${endText} is before start ${startText}.`);
	}
	return { start, end };
}
