import type { Order } from '../orders/types.ts';

/** Texts the customer that the order has shipped, through Twilio's REST API. */
export async function sendOrderShippedSms(order: Order, trackingCode: string): Promise<void> {
	if (order.customer.phone === null) return;
	const sid = process.env.TWILIO_SID;
	const token = process.env.TWILIO_TOKEN;
	const from = process.env.TWILIO_FROM;
	if (!sid || !token || !from) throw new Error('TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM must be set');
	const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
		method: 'POST',
		headers: {
			authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			To: order.customer.phone,
			From: from,
			Body: `Your Fernhill order ${order.id} has shipped. Tracking code: ${trackingCode}.`
		})
	});
	if (!response.ok) throw new Error(`Twilio answered ${response.status}`);
}
