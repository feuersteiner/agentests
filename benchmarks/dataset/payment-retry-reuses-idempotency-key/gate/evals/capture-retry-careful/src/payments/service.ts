import { ProviderTimeoutError, type PaymentProvider, type ProviderResult } from './provider.ts';
import type { Capture, PaymentRepo } from './repo.ts';

/** How a payment shows in the back office. */
export type PaymentStatus = 'uncaptured' | 'capture_pending' | 'captured';

export interface PaymentServiceDeps {
	provider: PaymentProvider;
	repo: PaymentRepo;
	/** Waits between attempts; the tests pass one that resolves at once. */
	sleep?: (ms: number) => Promise<void>;
}

export type PaymentService = ReturnType<typeof createPaymentService>;

/** Attempts per capture when the provider times out. */
export const CAPTURE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createPaymentService({ provider, repo, sleep = defaultSleep }: PaymentServiceDeps) {
	/**
	 * Captures `amount` (in minor units) of an authorized payment and records the capture. A
	 * timeout is retried up to CAPTURE_ATTEMPTS times in all; any other provider error is not.
	 */
	async function capturePayment(paymentId: string, amount: number): Promise<Capture> {
		const payment = repo.getPayment(paymentId);
		if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
			throw new RangeError(`Cannot capture ${amount} of payment ${paymentId}`);
		}
		const capture = repo.createCapture(paymentId, amount);
		let result: ProviderResult | undefined;
		for (let attempt = 1; result === undefined; attempt++) {
			try {
				result = await provider.capture({
					providerPaymentId: payment.providerPaymentId,
					amount,
					currency: payment.currency,
					idempotencyKey: capture.id
				});
			} catch (error) {
				if (!(error instanceof ProviderTimeoutError) || attempt >= CAPTURE_ATTEMPTS) throw error;
				await sleep(RETRY_DELAY_MS * attempt);
			}
		}
		return repo.markCaptureSucceeded(capture.id, result.id);
	}

	function paymentStatus(paymentId: string): PaymentStatus {
		const captures = repo.listCaptures({ paymentId });
		if (captures.some((capture) => capture.status === 'succeeded')) return 'captured';
		if (captures.some((capture) => capture.status === 'pending')) return 'capture_pending';
		return 'uncaptured';
	}

	return { capturePayment, paymentStatus };
}
