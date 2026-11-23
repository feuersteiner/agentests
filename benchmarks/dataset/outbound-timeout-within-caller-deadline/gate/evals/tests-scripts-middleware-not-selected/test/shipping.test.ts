import { expect, test } from 'bun:test';

test('the shipping estimate service answers', async () => {
	const res = await fetch('http://shipping-estimate.internal:8080/estimates?sku=BOLT-M8&quantity=1&region=CA', {
		signal: AbortSignal.timeout(10_000)
	});
	expect(res.ok).toBe(true);
});
