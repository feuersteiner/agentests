import { expect, test } from 'bun:test';
import { invoiceTotal } from '../src/invoice.ts';

test('adds the lines and applies tax to the sum', () => {
	const total = invoiceTotal([{ cents: 1_000 }, { cents: 250 }], { taxRate: 0.2 });
	expect(total).toEqual({ netCents: 1_250, taxCents: 250, grossCents: 1_500 });
});

test('an empty invoice totals zero', () => {
	expect(invoiceTotal([], { taxRate: 0.2 }).grossCents).toBe(0);
});
