import type { PaymentRepo } from '../payments/repo.ts';
import type { PaymentService } from '../payments/service.ts';

export const RETRY_FAILED_CAPTURES_EVERY_MS = 10 * 60_000;

/** Retries every failed capture once; returns how many went through this time. */
export async function retryFailedCaptures(
	repo: PaymentRepo,
	service: PaymentService,
	log: (line: string) => void
): Promise<number> {
	let succeeded = 0;
	for (const capture of repo.listCaptures({ status: 'failed' })) {
		if (service.paymentStatus(capture.paymentId) === 'captured') continue;
		try {
			await service.capturePayment(capture.paymentId, capture.amount);
			succeeded += 1;
		} catch (error) {
			log(`retry of capture ${capture.id} failed: ${String(error)}`);
		}
	}
	return succeeded;
}
