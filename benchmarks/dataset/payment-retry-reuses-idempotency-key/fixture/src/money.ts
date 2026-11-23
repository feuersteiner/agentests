// Formats amounts held in minor units, for reports and logs.

const CURRENCIES: Record<string, { symbol: string; decimals: number }> = {
	EUR: { symbol: '€', decimals: 2 },
	GBP: { symbol: '£', decimals: 2 },
	USD: { symbol: '$', decimals: 2 }
};

export function formatAmount(amount: number, currency: string): string {
	const format = CURRENCIES[currency];
	if (!format) throw new Error(`Unsupported currency ${currency}`);
	return `${format.symbol}${(amount / 10 ** format.decimals).toFixed(format.decimals)}`;
}
