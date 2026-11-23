/** Formats an amount in cents as US dollars, such as 123456 as "$1,234.56". */
export function formatCents(cents: number): string {
	const dollars = Math.trunc(cents / 100);
	const rest = Math.abs(cents % 100);
	return `$${dollars.toLocaleString('en-US')}.${rest}`;
}
