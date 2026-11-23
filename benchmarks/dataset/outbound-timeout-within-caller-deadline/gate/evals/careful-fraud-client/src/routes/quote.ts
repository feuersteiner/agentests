import { getUnitPriceCents } from '../clients/pricing.ts';
import { getTaxRate } from '../clients/tax.ts';
import { getFraudScore } from '../clients/fraud.ts';
import { UpstreamError } from '../errors.ts';
import type { DeadlineRequest } from '../middleware/deadline.ts';
import { formatCents } from '../money.ts';

/** The lowest fraud score at which a customer is refused a quote. */
const REFUSED_SCORE = 80;

/** GET /quote?sku=&quantity=&customer=&region=: the customer's price, tax and total. */
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
		const score = await getFraudScore(customer, req.deadline);
		if (score >= REFUSED_SCORE) {
			return Response.json({ error: 'quote refused' }, { status: 403 });
		}
		const unitPriceCents = await getUnitPriceCents(sku, customer, req.deadline);
		const taxRate = await getTaxRate(region, req.deadline);
		const subtotalCents = unitPriceCents * quantity;
		const taxCents = Math.round(subtotalCents * taxRate);
		const totalCents = subtotalCents + taxCents;
		return Response.json({
			sku,
			quantity,
			subtotalCents,
			taxCents,
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
