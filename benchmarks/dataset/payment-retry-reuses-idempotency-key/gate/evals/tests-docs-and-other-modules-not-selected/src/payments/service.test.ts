import { randomUUID } from 'node:crypto';
import { expect, test } from 'bun:test';
import { FakeProvider } from '../../test/fake-provider.ts';

test('every new key is a new capture at the provider', async () => {
	const provider = new FakeProvider();
	for (let attempt = 0; attempt < 3; attempt++) {
		await provider.capture({
			providerPaymentId: 'px_pay_1',
			amount: 100,
			currency: 'EUR',
			idempotencyKey: randomUUID()
		});
	}
	expect(new Set(provider.calls.map((call) => call.request.idempotencyKey)).size).toBe(3);
});
