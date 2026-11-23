import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { outbox } from '../src/mailer.ts';
import { shipIt } from '../src/orders/fulfilment.ts';
import type { Order } from '../src/orders/types.ts';

const order: Order = {
	id: 'F-1044',
	customer: { name: 'Ines', email: 'ines@example.com', phone: null },
	lines: [{ sku: 'HOUSE-1000', name: 'House Blend 1 kg', quantity: 1, lineCents: 2650 }],
	totalCents: 2650
};

beforeEach(() => {
	outbox.length = 0;
});

test('emails the customer the tracking code', async () => {
	await shipIt(order, '3SFERN0042');
	assert.equal(outbox.length, 1);
	assert.equal(outbox[0]!.subject, 'Your Fernhill order F-1044 has shipped');
	assert.match(outbox[0]!.text, /3SFERN0042/);
});
