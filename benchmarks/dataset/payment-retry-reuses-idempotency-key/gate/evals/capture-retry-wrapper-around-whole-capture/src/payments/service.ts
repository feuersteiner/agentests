import { ProviderTimeoutError, type PaymentProvider } from './provider.ts';
import type { Capture, PaymentRepo } from './repo.ts';

/** How a payment shows in the back office. */
export type PaymentStatus = 'uncaptured' | 'capture_pending' | 'captured';

export interface PaymentServiceDeps {
	provider: PaymentProvider;
	repo: PaymentRepo;
}

export type PaymentService = ReturnType<typeof createPaymentService>;

/** Runs `operation` again when it throws a ProviderTimeoutError, up to `attempts` times in all. */
async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await operation();
		} catch (error) {
			if (!(error instanceof ProviderTimeoutError) || attempt >= attempts) throw error;
		}
	}
}

export function createPaymentService({ provider, repo }: PaymentServiceDeps) {
	async function captureOnce(paymentId: string, amount: number): Promise<Capture> {
		const payment = repo.getPayment(paymentId);
		const capture = repo.createCapture(paymentId, amount);
		const result = await provider.capture({
			providerPaymentId: payment.providerPaymentId,
			amount,
			currency: payment.currency,
			idempotencyKey: capture.id
		});
		return repo.markCaptureSucceeded(capture.id, result.id);
	}

	/** Captures `amount` (in minor units) of an authorized payment, retrying timeouts. */
	async function capturePayment(paymentId: string, amount: number): Promise<Capture> {
		const payment = repo.getPayment(paymentId);
		if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
			throw new RangeError(`Cannot capture ${amount} of payment ${paymentId}`);
		}
		return withRetry(() => captureOnce(paymentId, amount));
	}

	function paymentStatus(paymentId: string): PaymentStatus {
		const captures = repo.listCaptures({ paymentId });
		if (captures.some((capture) => capture.status === 'succeeded')) return 'captured';
		if (captures.some((capture) => capture.status === 'pending')) return 'capture_pending';
		return 'uncaptured';
	}

	return { capturePayment, paymentStatus };
}
