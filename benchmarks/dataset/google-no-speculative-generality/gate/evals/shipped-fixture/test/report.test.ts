import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatReport, monthlyReport, type OrderRecord } from '../src/orders/report.ts';

const orders: OrderRecord[] = [
	{ id: 'F-2', placedOn: '2026-10-17', status: 'shipped', email: 'b@example.com', totalCents: 3440 },
	{ id: 'F-1', placedOn: '2026-10-02', status: 'paid', email: 'a@example.com', totalCents: 7190 },
	{ id: 'F-3', placedOn: '2026-11-03', status: 'paid', email: 'a@example.com', totalCents: 2360 }
];

test('keeps the orders of the month, oldest first', () => {
	const report = monthlyReport(orders, '2026-10');
	assert.deepEqual(
		report.orders.map((order) => order.id),
		['F-1', 'F-2']
	);
});

test('sums the revenue of the month', () => {
	assert.equal(monthlyReport(orders, '2026-10').revenueCents, 10630);
});

test('formats one line per order between a title and the revenue', () => {
	const lines = formatReport(monthlyReport(orders, '2026-10'));
	assert.equal(lines.length, 4);
	assert.equal(lines[0], 'Orders in 2026-10');
	assert.equal(lines[1], '2026-10-02  F-1  paid       71.90');
});
