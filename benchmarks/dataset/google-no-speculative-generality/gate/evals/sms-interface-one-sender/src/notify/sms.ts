import type { Order } from '../orders/types.ts';

/** Anything that can deliver a text message. */
export interface SmsSender {
	send(to: string, body: string): Promise<void>;
}

export class TwilioSmsSender implements SmsSender {
	async send(to: string, body: string): Promise<void> {
		const sid = process.env.TWILIO_SID;
		const token = process.env.TWILIO_TOKEN;
		const from = process.env.TWILIO_FROM;
		if (!sid || !token || !from) throw new Error('TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM must be set');
		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
			{
				method: 'POST',
				headers: {
					authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
					'content-type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({ To: to, From: from, Body: body })
			}
		);
		if (!response.ok) throw new Error(`Twilio answered ${response.status}`);
	}
}

const sender: SmsSender = new TwilioSmsSender();

/** Texts the customer that the order has shipped. */
export async function sendOrderShippedSms(order: Order, trackingCode: string): Promise<void> {
	if (order.customer.phone === null) return;
	await sender.send(
		order.customer.phone,
		`Your Fernhill order ${order.id} has shipped. Tracking code: ${trackingCode}.`
	);
}
