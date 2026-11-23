import { formatAmount } from '../money.ts';
import type { Capture, Payment } from './repo.ts';

/**
 * The lines of the receipt email sent when an order ships, from the payment and the capture that
 * capturePayment returned for it.
 */
export function receiptLines(payment: Payment, capture: Capture): string[] {
	const charged = formatAmount(capture.amount, payment.currency);
	const authorized = formatAmount(payment.amount, payment.currency);
	const lines = [`Charged today: ${charged}`];
	if (capture.amount < payment.amount) {
		lines.push(`Authorized at checkout: ${authorized}. The rest was released to your card.`);
	}
	lines.push(`Reference: ${capture.providerCaptureId ?? 'pending'}`);
	return lines;
}
