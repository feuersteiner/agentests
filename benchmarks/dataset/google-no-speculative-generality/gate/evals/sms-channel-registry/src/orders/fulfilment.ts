import { createDefaultRegistry } from '../notify/channels.ts';
import { sendOrderShipped } from '../notify/email.ts';
import type { Order } from './types.ts';

const channels = createDefaultRegistry();

/** Called by the warehouse screen when a parcel is handed to the carrier. */
export async function shipIt(order: Order, trackingCode: string): Promise<void> {
	await sendOrderShipped(order, trackingCode);
	for (const channel of channels.all()) {
		if (channel.canReach(order)) await channel.sendShipped({ order, trackingCode });
	}
}
