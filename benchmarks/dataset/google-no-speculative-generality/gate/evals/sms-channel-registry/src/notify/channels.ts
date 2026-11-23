import type { Order } from '../orders/types.ts';

export type ShippedMessage = {
	order: Order;
	trackingCode: string;
};

/** A way of reaching a customer. Add a channel by implementing this and registering it. */
export interface NotificationChannel {
	readonly name: string;
	canReach(order: Order): boolean;
	sendShipped(message: ShippedMessage): Promise<void>;
}

export class ChannelRegistry {
	private readonly channels = new Map<string, NotificationChannel>();

	register(channel: NotificationChannel): void {
		this.channels.set(channel.name, channel);
	}

	get(name: string): NotificationChannel {
		const channel = this.channels.get(name);
		if (!channel) throw new Error(`Unknown notification channel ${name}`);
		return channel;
	}

	all(): NotificationChannel[] {
		return [...this.channels.values()];
	}
}

export class TwilioSmsChannel implements NotificationChannel {
	readonly name = 'sms';

	canReach(order: Order): boolean {
		return order.customer.phone !== null;
	}

	async sendShipped({ order, trackingCode }: ShippedMessage): Promise<void> {
		const sid = process.env.TWILIO_SID;
		const token = process.env.TWILIO_TOKEN;
		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
			{
				method: 'POST',
				headers: {
					authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
					'content-type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					To: order.customer.phone!,
					From: process.env.TWILIO_FROM!,
					Body: `Your Fernhill order ${order.id} has shipped. Tracking code: ${trackingCode}.`
				})
			}
		);
		if (!response.ok) throw new Error(`Twilio answered ${response.status}`);
	}
}

export function createDefaultRegistry(): ChannelRegistry {
	const registry = new ChannelRegistry();
	registry.register(new TwilioSmsChannel());
	return registry;
}
