import { SHIPPING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';

export interface ShippingEstimate {
	costCents: number;
	days: number;
}

/** The shipping-estimate service's cost and delivery time for an order. */
export async function getShippingEstimate(
	sku: string,
	quantity: number,
	region: string,
	timeoutMs: number
): Promise<ShippingEstimate> {
	const query = new URLSearchParams({ sku, quantity: String(quantity), region });
	const res = await fetch(`${SHIPPING_URL}/estimates?${query}`, {
		signal: AbortSignal.timeout(timeoutMs)
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
