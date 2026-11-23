import { PRICING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';

const MAX_RETRIES = 3;
const ATTEMPT_TIMEOUT_MS = 3000;

/** The customer's unit price for a SKU, in cents. */
export async function getUnitPriceCents(
	sku: string,
	customer: string,
	deadline: number
): Promise<number> {
	const url = `${PRICING_URL}/prices/${encodeURIComponent(sku)}?customer=${encodeURIComponent(customer)}`;
	let res = await fetch(url, { signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
	for (let retry = 1; retry <= MAX_RETRIES && res.status >= 500; retry++) {
		await Bun.sleep(500 * 2 ** retry);
		res = await fetch(url, { signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
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
