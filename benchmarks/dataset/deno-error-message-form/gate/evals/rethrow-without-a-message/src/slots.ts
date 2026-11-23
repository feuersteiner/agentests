import { parseDate, parseTime, type TimeOfDay } from './parse.ts';

/** One bookable slot: a calendar day and a time on it. */
export interface Slot {
	date: Date;
	time: TimeOfDay;
}

/**
 * Parses lines such as `2024-11-23 09:30` into slots, ignoring blank lines and `#` comments.
 * With `lenient`, a line that does not parse is left out instead of stopping the whole list.
 */
export function parseSlots(text: string, lenient = false): Slot[] {
	const slots: Slot[] = [];
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (trimmed === '' || trimmed.startsWith('#')) continue;
		const [day = '', time = ''] = trimmed.split(/\s+/);
		try {
			slots.push({ date: parseDate(day), time: parseTime(time) });
		} catch (error) {
			if (!lenient) throw error;
		}
	}
	return slots;
}

/** Loads slots from a file, passing on the parser's error unchanged when a line is wrong. */
export async function loadSlots(path: string): Promise<Slot[]> {
	const text = await Bun.file(path).text();
	return parseSlots(text);
}
