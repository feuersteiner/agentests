import { findProduct } from '../catalog.ts';
import { sendOrderConfirmation } from '../notify/email.ts';
import type { CartLine, Customer, Order, OrderLine } from './types.ts';

export type CheckoutOptions = {
	/** Orders above this subtotal get the discount. Defaults to 200 EUR. */
	discountThresholdCents?: number;
	/** The discount as a fraction of the subtotal. Defaults to 10%. */
	discountRate?: number;
	/** The currency of the order. Defaults to EUR. */
	currency?: string;
};

let lastOrderNumber = 1046;

/** Prices the cart, records the order and emails the confirmation. */
export async function checkout(
	customer: Customer,
	cart: CartLine[],
	options: CheckoutOptions = {}
): Promise<Order> {
	const { discountThresholdCents = 20000, discountRate = 0.1, currency = 'EUR' } = options;
	if (cart.length === 0) throw new Error('The cart is empty');
	const lines: OrderLine[] = [];
	for (const line of cart) {
		const product = await findProduct(line.sku);
		lines.push({
			sku: product.sku,
			name: product.name,
			quantity: line.quantity,
			lineCents: product.priceCents * line.quantity
		});
	}
	const subtotalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
	const discountCents =
		subtotalCents > discountThresholdCents ? Math.round(subtotalCents * discountRate) : 0;
	const totalCents = subtotalCents - discountCents;
	lastOrderNumber += 1;
	const order: Order = {
		id: `F-${lastOrderNumber}`,
		customer,
		lines,
		currency,
		discountCents,
		totalCents
	};
	await sendOrderConfirmation(order);
	return order;
}
