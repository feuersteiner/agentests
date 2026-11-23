import { beforeEach, describe, expect, test } from 'bun:test';
import { MemoryRedis, useRedis } from '../src/cache.ts';
import type { RequestContext } from '../src/context.ts';
import { warehouseQueryCount } from '../src/db.ts';
import { runReport } from '../src/reports/service.ts';

const analyst: RequestContext = { orgId: 'org_lumen', userId: 'u-anna', roles: ['analyst'], locale: 'en-GB' };

beforeEach(() => useRedis(new MemoryRedis()));

describe('report caching', () => {
	test('a second identical run is served from Redis', async () => {
		const before = warehouseQueryCount();
		await runReport(analyst, 'orders', {});
		await runReport(analyst, 'orders', {});
		expect(warehouseQueryCount() - before).toBe(1);
	});

	test('the cache key is the report id and params only', async () => {
		const redis = new MemoryRedis();
		useRedis(redis);
		await runReport(analyst, 'orders', { region: 'north' });
		expect(await redis.get('report:orders:{"region":"north"}')).not.toBeNull();
	});
});
