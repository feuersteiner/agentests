import { randomUUID } from 'node:crypto';
import { ProviderTimeoutError, type PaymentProvider } from './provider.ts';
import type { Capture, PaymentRepo } from './repo.ts';

/** How a payment shows in the back office. */
export type PaymentStatus = 'uncaptured' | 'capture_pending' | 'captured';

export interface PaymentServiceDeps {
	provider: PaymentProvider;
	repo: PaymentRepo;
}

export type PaymentService = ReturnType<typeof createPaymentService>;

const MAX_ATTEMPTS = 3;

export function createPaymentService({ provider, repo }: PaymentServiceDeps) {
	/** Captures `amount` (in minor units) of an authorized payment, retrying timeouts. */
	async function capturePayment(paymentId: string, amount: number): Promise<Capture> {
		const payment = repo.getPayment(paymentId);
		if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
			throw new RangeError(`Cannot capture ${amount} of payment ${paymentId}`);
		}
		const capture = repo.createCapture(paymentId, amount);
		for (let attempt = 1; ; attempt++) {
			try {
				const result = await provider.capture({
					providerPaymentId: payment.providerPaymentId,
					amount,
					currency: payment.currency,
					idempotencyKey: randomUUID()
				});
				return repo.markCaptureSucceeded(capture.id, result.id);
			} catch (error) {
				if (!(error instanceof ProviderTimeoutError) || attempt === MAX_ATTEMPTS) throw error;
			}
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
