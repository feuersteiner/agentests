import { PRICING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import { remainingMs } from '../middleware/deadline.ts';

const MAX_ATTEMPTS = 4;

/** The customer's unit price for a SKU, in cents. */
export async function getUnitPriceCents(
	sku: string,
	customer: string,
	deadline: number
): Promise<number> {
	const url = `${PRICING_URL}/prices/${encodeURIComponent(sku)}?customer=${encodeURIComponent(customer)}`;
	let res: Response;
	let attempt = 0;
	do {
		if (attempt > 0) await Bun.sleep(1000 * attempt);
		attempt++;
		res = await fetch(url, { signal: AbortSignal.timeout(remainingMs(deadline)) });
	} while (res.status >= 500 && attempt < MAX_ATTEMPTS);
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
