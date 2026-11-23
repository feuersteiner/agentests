import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { outbox } from '../src/mailer.ts';
import { checkout } from '../src/orders/checkout.ts';
import type { Customer } from '../src/orders/types.ts';

const ines: Customer = { name: 'Ines', email: 'ines@example.com', phone: '+31612345678' };

beforeEach(() => {
	outbox.length = 0;
});

test('prices each line from the catalogue and sums the total', async () => {
	const order = await checkout(ines, [
		{ sku: 'HOUSE-250', quantity: 2 },
		{ sku: 'ETH-250', quantity: 1 }
	]);
	assert.deepEqual(
		order.lines.map((line) => line.lineCents),
		[1580, 1180]
	);
	assert.equal(order.totalCents, 2760);
});

test('emails the confirmation with the total', async () => {
	const order = await checkout(ines, [{ sku: 'GRINDER', quantity: 1 }]);
	assert.equal(outbox.length, 1);
	assert.equal(outbox[0]!.to, 'ines@example.com');
	assert.equal(outbox[0]!.subject, `Your Fernhill order ${order.id}`);
	assert.match(outbox[0]!.text, /Total: 64\.00 EUR/);
});

test('rejects an empty cart and an unknown product', async () => {
	await assert.rejects(checkout(ines, []), /empty/);
	await assert.rejects(checkout(ines, [{ sku: 'NOPE', quantity: 1 }]), /Unknown product NOPE/);
});
