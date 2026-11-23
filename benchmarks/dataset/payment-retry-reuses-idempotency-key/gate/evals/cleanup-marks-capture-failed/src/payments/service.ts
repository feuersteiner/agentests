import type { PaymentProvider } from './provider.ts';
import type { Capture, PaymentRepo } from './repo.ts';

/** How a payment shows in the back office. */
export type PaymentStatus = 'uncaptured' | 'capture_pending' | 'captured';

export interface PaymentServiceDeps {
	provider: PaymentProvider;
	repo: PaymentRepo;
}

export type PaymentService = ReturnType<typeof createPaymentService>;

export function createPaymentService({ provider, repo }: PaymentServiceDeps) {
	/**
	 * Captures `amount` (in minor units) of an authorized payment and records the capture. When the
	 * provider call fails, the capture is kept and marked failed, and the error is passed on.
	 */
	async function capturePayment(paymentId: string, amount: number): Promise<Capture> {
		const payment = repo.getPayment(paymentId);
		if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
			throw new RangeError(`Cannot capture ${amount} of payment ${paymentId}`);
		}
		const capture = repo.createCapture(paymentId, amount);
		try {
			const result = await provider.capture({
				providerPaymentId: payment.providerPaymentId,
				amount,
				currency: payment.currency,
				idempotencyKey: capture.id
			});
			return repo.markCaptureSucceeded(capture.id, result.id);
		} catch (error) {
			repo.markCaptureFailed(capture.id, error instanceof Error ? error.message : String(error));
			throw error;
		}
	}

	/** Failed captures count for nothing: a payment whose captures all failed is uncaptured. */
	function paymentStatus(paymentId: string): PaymentStatus {
		const captures = repo.listCaptures({ paymentId });
		if (captures.some((capture) => capture.status === 'succeeded')) return 'captured';
		if (captures.some((capture) => capture.status === 'pending')) return 'capture_pending';
		return 'uncaptured';
	}

	return { capturePayment, paymentStatus };
}
