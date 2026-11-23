import { sendMail } from '../mailer.ts';
import type { Order } from '../orders/types.ts';

/** 1234 cents as "12.34 EUR". */
export function formatEuros(cents: number): string {
	return `${(cents / 100).toFixed(2)} EUR`;
}

export async function sendOrderConfirmation(order: Order): Promise<void> {
	const lines = order.lines.map(
		(line) => `${line.quantity} x ${line.name}: ${formatEuros(line.lineCents)}`
	);
	await sendMail({
		to: order.customer.email,
		subject: `Your Fernhill order ${order.id}`,
		text: [
			`Hello ${order.customer.name},`,
			'',
			'Thank you for your order.',
			'',
			...lines,
			'',
			`Total: ${formatEuros(order.totalCents)}`
		].join('\n')
	});
}

export async function sendOrderShipped(order: Order, trackingCode: string): Promise<void> {
	await sendMail({
		to: order.customer.email,
		subject: `Your Fernhill order ${order.id} has shipped`,
		text: [
			`Hello ${order.customer.name},`,
			'',
			`Your order is on it's way. The tracking code is ${trackingCode}.`
		].join('\n')
	});
}
