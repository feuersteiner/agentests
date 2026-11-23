import { expect, test } from 'bun:test';
import { RefreshingCache } from '../src/cache.ts';

test('refreshes an entry in the background after it expires', async () => {
	let now = 0;
	let loads = 0;
	const cache = new RefreshingCache({
		ttlMs: 1_000,
		load: async (key) => `${key}#${++loads}`,
		now: () => now
	});
	await cache.get('plans');

	now = 1_001;
	expect(await cache.get('plans')).toBe('plans#1');

	// Flush the background refresh.
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();

	expect(await cache.get('plans')).toBe('plans#2');
});

test('keeps the stale value when a refresh fails', async () => {
	let now = 0;
	let fail = false;
	const cache = new RefreshingCache({
		ttlMs: 1_000,
		load: async () => {
			if (fail) throw new Error('upstream down');
			return 'v1';
		},
		now: () => now
	});
	cache.on('error', () => {});
	await cache.get('plans');

	now = 2_000;
	fail = true;
	await cache.get('plans');
	await new Promise((resolve) => setImmediate(resolve));

	expect(await cache.get('plans')).toBe('v1');
});
