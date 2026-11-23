/** Whether `year` has a 29 February. */
export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** The number of days in `month`, from 1 for January to 12 for December, of `year`. */
export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The ISO weekday of a date in UTC, 1 for Monday to 7 for Sunday. */
export function isoWeekday(date: Date): number {
	const day = date.getUTCDay();
	return day === 0 ? 7 : day;
}

/** The dates from `start` to `end`, both included, one per day. */
export function eachDay(start: Date, end: Date): Date[] {
	const days: Date[] = [];
	for (let time = start.getTime(); time <= end.getTime(); time += 86_400_000) {
		days.push(new Date(time));
	}
	return days;
}
