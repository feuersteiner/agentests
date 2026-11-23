/** The month of a date, as YYYY-MM. */
export function monthOf(date: Date): string {
	return date.toISOString().slice(0, 7);
}

/** The month before the given one, both as YYYY-MM. */
export function previousMonth(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number) as [number, number];
	return monthNumber === 1
		? `${year - 1}-12`
		: `${year}-${String(monthNumber - 1).padStart(2, '0')}`;
}

/** Whether the text is a real calendar day written as YYYY-MM-DD. */
export function isDay(text: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
	const date = new Date(`${text}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}
