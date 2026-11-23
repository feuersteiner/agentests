import { expect, test } from 'bun:test';
import { RefreshingCache } from '../src/cache.ts';
import { once } from './helpers.ts';

test('serves the stale value while a slow refresh is under way', async () => {
	let now = 0;
	let version = 0;
	const cache = new RefreshingCache({
		ttlMs: 60_000,
		// Stands in for an upstream that takes a moment to answer.
		load: async () => {
			await Bun.sleep(5);
			return `v${++version}`;
		},
		now: () => now
	});
	expect(await cache.get('plans')).toBe('v1');

	now = 60_001;
	const refreshed = once(cache, 'refresh');
	expect(await cache.get('plans')).toBe('v1');
	expect(await cache.get('plans')).toBe('v1');

	await refreshed;
	expect(await cache.get('plans')).toBe('v2');
	expect(version).toBe(2);
});
