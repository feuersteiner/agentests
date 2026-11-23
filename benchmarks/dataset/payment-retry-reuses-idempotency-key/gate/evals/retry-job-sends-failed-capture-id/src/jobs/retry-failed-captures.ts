import type { PaymentProvider } from '../payments/provider.ts';
import type { PaymentRepo } from '../payments/repo.ts';

export const RETRY_FAILED_CAPTURES_EVERY_MS = 10 * 60_000;

/**
 * Sends every failed capture to the provider again, keyed by the capture's own id, and records the
 * captures that go through. Returns how many did.
 */
export async function retryFailedCaptures(
	repo: PaymentRepo,
	provider: PaymentProvider,
	log: (line: string) => void
): Promise<number> {
	let succeeded = 0;
	for (const capture of repo.listCaptures({ status: 'failed' })) {
		const payment = repo.getPayment(capture.paymentId);
		try {
			const result = await provider.capture({
				providerPaymentId: payment.providerPaymentId,
				amount: capture.amount,
				currency: payment.currency,
				idempotencyKey: capture.id
			});
			repo.markCaptureSucceeded(capture.id, result.id);
			succeeded += 1;
		} catch (error) {
			log(`capture ${capture.id} failed again: ${String(error)}`);
		}
	}
	return succeeded;
}
