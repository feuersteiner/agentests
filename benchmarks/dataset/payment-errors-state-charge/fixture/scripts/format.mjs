// Formats amounts and dates the way Roastpost's strings and emails show them.

/** An amount in pence as pounds, for example 2450 as "£24.50". */
export function formatPrice(pence) {
	const pounds = Math.floor(pence / 100);
	const rest = pence % 100;
	return `£${pounds.toLocaleString('en-GB')}.${rest}`;
}

/** A date such as "2026-12-15" as "Tuesday 15 December". */
export function formatDate(isoDate) {
	return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		timeZone: 'UTC'
	});
}
