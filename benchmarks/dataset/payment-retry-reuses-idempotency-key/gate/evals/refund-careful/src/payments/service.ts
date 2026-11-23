import type { PaymentProvider } from './provider.ts';
import type { Capture, PaymentRepo, Refund } from './repo.ts';

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
		const result = await provider.capture({
			providerPaymentId: payment.providerPaymentId,
			amount,
			currency: payment.currency,
			idempotencyKey: capture.id
		});
		return repo.markCaptureSucceeded(capture.id, result.id);
	}

	/** Refunds `amount` (in minor units) of the captured part of a payment and records the refund. */
	async function refundPayment(paymentId: string, amount: number): Promise<Refund> {
		const payment = repo.getPayment(paymentId);
		const captured = repo
			.listCaptures({ paymentId, status: 'succeeded' })
			.reduce((sum, capture) => sum + capture.amount, 0);
		const refunded = repo
			.listRefunds({ paymentId, status: 'succeeded' })
			.reduce((sum, refund) => sum + refund.amount, 0);
		if (!Number.isInteger(amount) || amount <= 0 || amount > captured - refunded) {
			throw new RangeError(`Cannot refund ${amount} of payment ${paymentId}`);
		}
		const refund = repo.createRefund(paymentId, amount);
		const result = await provider.refund({
			providerPaymentId: payment.providerPaymentId,
			amount,
			currency: payment.currency,
			idempotencyKey: refund.id
		});
		return repo.markRefundSucceeded(refund.id, result.id);
	}

	function paymentStatus(paymentId: string): PaymentStatus {
		const captures = repo.listCaptures({ paymentId });
		if (captures.some((capture) => capture.status === 'succeeded')) return 'captured';
		if (captures.some((capture) => capture.status === 'pending')) return 'capture_pending';
		return 'uncaptured';
	}

	return { capturePayment, refundPayment, paymentStatus };
}
