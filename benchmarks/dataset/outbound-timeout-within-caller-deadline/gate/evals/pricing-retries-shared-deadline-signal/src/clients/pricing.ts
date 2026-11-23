import { PRICING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import { remainingMs } from '../middleware/deadline.ts';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 150;

/** The customer's unit price for a SKU, in cents. */
export async function getUnitPriceCents(
	sku: string,
	customer: string,
	deadline: number
): Promise<number> {
	const url = `${PRICING_URL}/prices/${encodeURIComponent(sku)}?customer=${encodeURIComponent(customer)}`;
	// Fires when the request's deadline passes, whichever attempt is running then.
	const signal = AbortSignal.timeout(remainingMs(deadline));
	let res = await fetch(url, { signal });
	for (let attempt = 2; attempt <= MAX_ATTEMPTS && res.status >= 500; attempt++) {
		if (remainingMs(deadline) <= BACKOFF_MS) break;
		await Bun.sleep(BACKOFF_MS);
		res = await fetch(url, { signal });
	}
	if (!res.ok) {
		throw new UpstreamError(
			'pricing',
			res.status,
			`Cannot get the price of ${sku}: pricing answered ${res.status}`
		);
	}
	const body = (await res.json()) as { unitPriceCents: number };
	return body.unitPriceCents;
}
