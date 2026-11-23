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
	/** Captures `amount` (in minor units) of an authorized payment and records the capture. */
	async function capturePayment(paymentId: string, amount: number): Promise<Capture> {
		const payment = repo.getPayment(paymentId);
		if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
			throw new RangeError(`Cannot capture ${amount} of payment ${paymentId}`);
		}
		const capture = repo.createCapture(paymentId, amount);
		let confirmed = false;
		try {
			const result = await provider.capture({
				providerPaymentId: payment.providerPaymentId,
				amount,
				currency: payment.currency,
				idempotencyKey: capture.id
			});
			const succeeded = repo.markCaptureSucceeded(capture.id, result.id);
			confirmed = true;
			return succeeded;
		} finally {
			// A capture the provider never confirmed must not leave the payment stuck as pending.
			if (!confirmed) repo.removeCapture(capture.id);
		}
	}

	function paymentStatus(paymentId: string): PaymentStatus {
		const captures = repo.listCaptures({ paymentId });
		if (captures.some((capture) => capture.status === 'succeeded')) return 'captured';
		if (captures.some((capture) => capture.status === 'pending')) return 'capture_pending';
		return 'uncaptured';
	}

	return { capturePayment, paymentStatus };
}
