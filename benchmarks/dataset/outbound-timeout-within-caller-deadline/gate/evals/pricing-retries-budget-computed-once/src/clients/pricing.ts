import { PRICING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import { remainingMs } from '../middleware/deadline.ts';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 100;

/** The customer's unit price for a SKU, in cents. */
export async function getUnitPriceCents(
	sku: string,
	customer: string,
	deadline: number
): Promise<number> {
	const url = `${PRICING_URL}/prices/${encodeURIComponent(sku)}?customer=${encodeURIComponent(customer)}`;
	const timeoutMs = remainingMs(deadline);
	let attempt = 1;
	let res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
	while (res.status >= 500 && attempt < MAX_ATTEMPTS && remainingMs(deadline) > BACKOFF_MS) {
		await Bun.sleep(BACKOFF_MS);
		attempt++;
		res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
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
