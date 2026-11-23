import { expect, test } from 'bun:test';
import { RefreshingCache } from '../src/cache.ts';

test('loads a key once while the entry is fresh', async () => {
	let now = 0;
	let loads = 0;
	const cache = new RefreshingCache({
		ttlMs: 1_000,
		load: async (key) => `${key}#${++loads}`,
		now: () => now
	});

	expect(await cache.get('plans')).toBe('plans#1');
	now = 1_000;
	expect(await cache.get('plans')).toBe('plans#1');
	expect(loads).toBe(1);
});

test('loads each key separately', async () => {
	const cache = new RefreshingCache({ ttlMs: 1_000, load: async (key) => key.toUpperCase() });

	expect(await cache.get('plans')).toBe('PLANS');
	expect(await cache.get('seats')).toBe('SEATS');
});
