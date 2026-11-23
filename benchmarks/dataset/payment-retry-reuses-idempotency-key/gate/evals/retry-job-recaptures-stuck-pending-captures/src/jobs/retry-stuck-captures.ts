import type { PaymentRepo } from '../payments/repo.ts';
import type { PaymentService } from '../payments/service.ts';

export const RETRY_STUCK_CAPTURES_EVERY_MS = 10 * 60_000;
const STUCK_AFTER_MS = 10 * 60_000;

/**
 * A capture still pending after ten minutes never got an answer from the provider, so the job
 * captures the payment again. Returns how many went through this time.
 */
export async function retryStuckCaptures(
	repo: PaymentRepo,
	service: PaymentService,
	log: (line: string) => void,
	now: () => number = Date.now
): Promise<number> {
	let succeeded = 0;
	for (const capture of repo.listCaptures({ status: 'pending' })) {
		if (now() - capture.createdAt.getTime() < STUCK_AFTER_MS) continue;
		try {
			await service.capturePayment(capture.paymentId, capture.amount);
			succeeded += 1;
		} catch (error) {
			log(`capture of payment ${capture.paymentId} failed again: ${String(error)}`);
		}
	}
	return succeeded;
}
