/** Counts requests per key, in memory. Each window is a key, such as a project and a day. */
export interface Counter {
	/** Counts one request under key and returns the count so far, this request included. */
	hit(key: string): number;
}

export function createCounter(): Counter {
	const counts = new Map<string, number>();
	return {
		hit(key) {
			const count = (counts.get(key) ?? 0) + 1;
			counts.set(key, count);
			return count;
		}
	};
}

/** The UTC day of a date, such as "2026-11-23". */
export function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Whole seconds from date until the next midnight UTC, rounded up. */
export function secondsUntilMidnight(date: Date): number {
	const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
	return Math.ceil((midnight - date.getTime()) / 1000);
}
