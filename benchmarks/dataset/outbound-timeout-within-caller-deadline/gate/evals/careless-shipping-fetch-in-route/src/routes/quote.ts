import { getUnitPriceCents } from '../clients/pricing.ts';
import { getTaxRate } from '../clients/tax.ts';
import { SHIPPING_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import type { DeadlineRequest } from '../middleware/deadline.ts';
import { formatCents } from '../money.ts';

/** GET /quote?sku=&quantity=&customer=&region=: price, tax, shipping and total. */
export async function quote(req: DeadlineRequest): Promise<Response> {
	const params = req.url.searchParams;
	const sku = params.get('sku');
	const customer = params.get('customer');
	const region = params.get('region');
	const quantity = Number(params.get('quantity') ?? '1');
	if (!sku || !customer || !region) {
		return Response.json({ error: 'sku, customer and region are required' }, { status: 400 });
	}

	try {
		const unitPriceCents = await getUnitPriceCents(sku, customer, req.deadline);
		const taxRate = await getTaxRate(region, req.deadline);
		const shippingRes = await fetch(
			`${SHIPPING_URL}/estimates?sku=${encodeURIComponent(sku)}&quantity=${quantity}&region=${encodeURIComponent(region)}`
		);
		if (!shippingRes.ok) {
			throw new UpstreamError(
				'shipping',
				shippingRes.status,
				`Cannot estimate shipping of ${sku}: shipping answered ${shippingRes.status}`
			);
		}
		const shipping = (await shippingRes.json()) as { costCents: number; days: number };
		const subtotalCents = unitPriceCents * quantity;
		const taxCents = Math.round(subtotalCents * taxRate);
		const totalCents = subtotalCents + taxCents + shipping.costCents;
		return Response.json({
			sku,
			quantity,
			subtotalCents,
			taxCents,
			shippingCents: shipping.costCents,
			shippingDays: shipping.days,
			totalCents,
			total: formatCents(totalCents)
		});
	} catch (error) {
		if (error instanceof UpstreamError) {
			return Response.json({ error: error.message }, { status: 502 });
		}
		throw error;
	}
}
