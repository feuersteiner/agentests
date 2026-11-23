/** 1234 cents as "12.34 EUR", or as "12.34" without the currency. */
export function formatEuros(cents: number, withCurrency: boolean = true): string {
	const amount = (cents / 100).toFixed(2);
	return withCurrency ? `${amount} EUR` : amount;
}

/** One line of an order email: "2 x House Blend 250 g: 15.80 EUR". */
export function formatLine(quantity: number, name: string, lineCents: number): string {
	return `${quantity} x ${name}: ${formatEuros(lineCents)}`;
}

/** The amount as the accounting export wants it: digits only, no currency. */
export function formatForExport(cents: number): string {
	return formatEuros(cents, false);
}
