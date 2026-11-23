/** Unit labels for each locale that formatDuration writes. */
const LABELS = {
	en: { h: 'h', min: 'min', s: 's', ms: 'ms' },
	de: { h: 'Std.', min: 'Min.', s: 'Sek.', ms: 'ms' },
	fr: { h: 'h', min: 'min', s: 's', ms: 'ms' }
} as const;

export type Locale = keyof typeof LABELS;

export interface FormatDurationOptions {
	/** Digits after the decimal point, at most; default 1. */
	precision?: number;
	/** A locale of LABELS; default `en`. */
	locale?: string;
}

const STEPS = [
	['h', 3_600_000],
	['min', 60_000],
	['s', 1_000],
	['ms', 1]
] as const;

/** Formats milliseconds in the largest unit that fits, such as `1.5 h` or `250 ms`. */
export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
	const { precision = 1, locale = 'en' } = options;
	const [unit, size] = STEPS.find(([, size]) => Math.abs(ms) >= size) ?? STEPS[STEPS.length - 1]!;
	const amount = new Intl.NumberFormat(locale, { maximumFractionDigits: precision }).format(
		ms / size
	);
	return `${amount} ${LABELS[locale as Locale][unit]}`;
}

/** Formats a date as `YYYY-MM-DD`, in UTC. */
export function formatDate(date: Date): string {
	return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}
