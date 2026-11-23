import type { Request as ExpressRequest, Response } from 'express';
import { orders } from '../store/orders.ts';
import { priceFor } from '../pricing.ts';

/** POST /orders: a trade customer of Pellham Supply places an order for one SKU. */
export async function placeOrder(req: ExpressRequest, res: Response) {
	const { sku, quantity, note = '' } = req.body;
	if (typeof sku !== 'string' || !Number.isInteger(quantity) || quantity < 1) {
		return res.status(400).json({ error: 'sku and a whole quantity are required' });
	}
	const unitPriceCents = await priceFor(sku, req.customer.id);
	const order = await orders.insert({
		customerId: req.customer.id,
		sku,
		quantity,
		note: String(note).slice(0, 500),
		totalCents: unitPriceCents * quantity,
		placedAt: new Date().toISOString()
	});
	return res.status(201).json(order);
}

/** GET /orders/:id: one of the customer's orders. */
export async function getOrder(req: ExpressRequest, res: Response) {
	const order = await orders.find(req.params.id);
	if (!order || order.customerId !== req.customer.id) return res.status(404).json({ error: 'order not found' });
	return res.json(order);
}
