import { PRICING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import { remainingMs } from '../middleware/deadline.ts';
import { withRetry } from './retry.ts';

/** The customer's unit price for a SKU, in cents. */
export async function getUnitPriceCents(
	sku: string,
	customer: string,
	deadline: number
): Promise<number> {
	const url = `${PRICING_URL}/prices/${encodeURIComponent(sku)}?customer=${encodeURIComponent(customer)}`;
	const res = await withRetry(
		() => fetch(url, { signal: AbortSignal.timeout(remainingMs(deadline)) }),
		3,
		500
	);
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
