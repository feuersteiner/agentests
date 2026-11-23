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
	for (let attempt = 1; ; attempt++) {
		const res = await fetch(url, { signal: AbortSignal.timeout(remainingMs(deadline)) });
		if (res.status >= 500) {
			const backoffMs = BACKOFF_MS * 2 ** (attempt - 1);
			if (attempt < MAX_ATTEMPTS && remainingMs(deadline) > backoffMs) {
				await Bun.sleep(backoffMs);
				continue;
			}
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
}
