import { SHIPPING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';

export interface ShippingEstimate {
	costCents: number;
	days: number;
}

/** Shipping estimates are slow to compute; give up after this many milliseconds. */
const SHIPPING_TIMEOUT_MS = 1500;

/** The shipping-estimate service's cost and delivery time for an order. */
export async function getShippingEstimate(
	sku: string,
	quantity: number,
	region: string
): Promise<ShippingEstimate> {
	const query = new URLSearchParams({ sku, quantity: String(quantity), region });
	const res = await fetch(`${SHIPPING_URL}/estimates?${query}`, {
		signal: AbortSignal.timeout(SHIPPING_TIMEOUT_MS)
	});
	if (!res.ok) {
		throw new UpstreamError(
			'shipping',
			res.status,
			`Cannot estimate shipping of ${sku}: shipping answered ${res.status}`
		);
	}
	return (await res.json()) as ShippingEstimate;
}
