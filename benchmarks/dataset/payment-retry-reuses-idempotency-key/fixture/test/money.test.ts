import { expect, test } from 'bun:test';
import { formatAmount } from '../src/money.ts';

test('formats minor units with the currency symbol', () => {
	expect(formatAmount(123450, 'USD')).toBe('$1234.50');
	expect(formatAmount(999, 'EUR')).toBe('€9.99');
	expect(formatAmount(5, 'GBP')).toBe('£0.05');
});

test('refuses a currency it does not know', () => {
	expect(() => formatAmount(100, 'XYZ')).toThrow('Unsupported currency XYZ');
});
