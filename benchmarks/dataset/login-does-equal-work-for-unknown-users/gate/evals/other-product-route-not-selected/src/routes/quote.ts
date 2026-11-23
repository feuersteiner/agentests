import { getUnitPriceCents } from '../clients/pricing.ts';
import { formatCents } from '../money.ts';

/** GET /quote?sku=&quantity=: the price of a quantity of one product. */
export async function quote(request: Request): Promise<Response> {
	const params = new URL(request.url).searchParams;
	const sku = params.get('sku');
	const quantity = Number(params.get('quantity') ?? '1');
	if (!sku || !Number.isInteger(quantity) || quantity < 1) {
		return Response.json({ error: 'sku and a positive quantity are required' }, { status: 400 });
	}
	const unitPriceCents = await getUnitPriceCents(sku);
	const totalCents = unitPriceCents * quantity;
	return Response.json({ sku, quantity, totalCents, total: formatCents(totalCents) });
}
