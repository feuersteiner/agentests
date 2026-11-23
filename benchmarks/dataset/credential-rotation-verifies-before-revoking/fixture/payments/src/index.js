// payments: takes card payments for print orders through Tillpoint.

const SYMBOLS = { GBP: '£', EUR: '€', USD: '$', JPY: '¥', KRW: '₩' };

/** An amount in minor units as a receipt shows it: formatAmount(1999, 'GBP') gives '£19.99'. */
export function formatAmount(minor, currency) {
	const symbol = SYMBOLS[currency] ?? `${currency} `;
	return `${symbol}${(minor / 100).toFixed(2)}`;
}

const json = (body, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (request.method !== 'POST' || url.pathname !== '/charge') return json({ error: 'not found' }, 404);

		const { order, amount, currency, token } = await request.json();
		const response = await fetch(`${env.TILLPOINT_API}/charges`, {
			method: 'POST',
			headers: { authorization: `Bearer ${env.TILLPOINT_API_KEY}`, 'content-type': 'application/json' },
			body: JSON.stringify({ reference: order, amount, currency, source: token })
		});
		if (!response.ok) return json({ error: 'payment failed' }, 402);
		return json({ order, receipt: formatAmount(amount, currency) });
	}
};
