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
	/** Sends the capture to the provider, keyed by its own id, and records the outcome. */
	async function sendCapture(capture: Capture): Promise<Capture> {
		const payment = repo.getPayment(capture.paymentId);
		try {
			const result = await provider.capture({
				providerPaymentId: payment.providerPaymentId,
				amount: capture.amount,
				currency: payment.currency,
				idempotencyKey: capture.id
			});
			return repo.markCaptureSucceeded(capture.id, result.id);
		} catch (error) {
			repo.markCaptureFailed(capture.id, error instanceof Error ? error.message : String(error));
			throw error;
		}
	}

	/** Captures `amount` (in minor units) of an authorized payment and records the capture. */
	async function capturePayment(paymentId: string, amount: number): Promise<Capture> {
		const payment = repo.getPayment(paymentId);
		if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
			throw new RangeError(`Cannot capture ${amount} of payment ${paymentId}`);
		}
		return sendCapture(repo.createCapture(paymentId, amount));
	}

	/** Tries a failed capture again with the same record, so the provider sees the same key. */
	async function retryCapture(captureId: string): Promise<Capture> {
		const capture = repo.getCapture(captureId);
		if (capture.status !== 'failed') throw new Error(`Capture ${captureId} has not failed`);
		return sendCapture(capture);
	}

	function paymentStatus(paymentId: string): PaymentStatus {
		const captures = repo.listCaptures({ paymentId });
		if (captures.some((capture) => capture.status === 'succeeded')) return 'captured';
		if (captures.some((capture) => capture.status === 'pending')) return 'capture_pending';
		return 'uncaptured';
	}

	return { capturePayment, retryCapture, paymentStatus };
}
