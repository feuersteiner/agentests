import { afterEach, beforeEach, expect, jest, test } from 'bun:test';
import { scheduleReminder } from '../src/reminder.ts';

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test('fires the reminder once its delay has passed', () => {
	const fired: string[] = [];
	scheduleReminder('stand-up', 60_000, (name) => fired.push(name));

	jest.advanceTimersByTime(59_999);
	expect(fired).toEqual([]);

	jest.advanceTimersByTime(1);
	expect(fired).toEqual(['stand-up']);
});

test('a cancelled reminder never fires', () => {
	const fired: string[] = [];
	const cancel = scheduleReminder('retro', 5_000, (name) => fired.push(name));
	const timeout = setTimeout(() => fired.push('control'), 5_000);

	cancel();
	jest.advanceTimersByTime(5_000);

	expect(fired).toEqual(['control']);
	clearTimeout(timeout);
});
