import { sendOrderShipped } from '../notify/email.ts';
import type { Order } from './types.ts';

/** Called by the warehouse screen when a parcel is handed to the carrier. */
export async function shipIt(order: Order, trackingCode: string): Promise<void> {
	await sendOrderShipped(order, trackingCode);
}
