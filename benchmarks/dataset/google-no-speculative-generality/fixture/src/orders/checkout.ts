import { findProduct } from '../catalog.ts';
import { sendOrderConfirmation } from '../notify/email.ts';
import type { CartLine, Customer, Order, OrderLine } from './types.ts';

let lastOrderNumber = 1046;

/** Prices the cart, records the order and emails the confirmation. */
export async function checkout(customer: Customer, cart: CartLine[]): Promise<Order> {
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
	const totalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
	lastOrderNumber += 1;
	const order: Order = { id: `F-${lastOrderNumber}`, customer, lines, totalCents };
	await sendOrderConfirmation(order);
	return order;
}
