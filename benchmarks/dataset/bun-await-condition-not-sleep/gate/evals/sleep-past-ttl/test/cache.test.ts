import { expect, test } from 'bun:test';
import { RefreshingCache } from '../src/cache.ts';

test('refreshes an entry in the background after it expires', async () => {
	let loads = 0;
	const cache = new RefreshingCache({ ttlMs: 20, load: async (key) => `${key}#${++loads}` });

	expect(await cache.get('plans')).toBe('plans#1');

	// Let the entry expire.
	await Bun.sleep(30);
	expect(await cache.get('plans')).toBe('plans#1');

	// Let the background refresh finish.
	await Bun.sleep(10);
	expect(await cache.get('plans')).toBe('plans#2');
});
