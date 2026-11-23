import type {
	CaptureRequest,
	PaymentProvider,
	ProviderResult,
	RefundRequest
} from '../src/payments/provider.ts';

export type ProviderCall =
	| { kind: 'capture'; request: CaptureRequest }
	| { kind: 'refund'; request: RefundRequest };

/** Stands in for the card provider in tests, and records every call made to it. */
export class FakeProvider implements PaymentProvider {
	readonly calls: ProviderCall[] = [];
	private readonly results = new Map<string, ProviderResult>();
	private readonly failures: Error[] = [];
	private sequence = 0;

	/** Makes the next `times` calls throw `error`. */
	failNext(error: Error, times = 1): void {
		for (let i = 0; i < times; i++) this.failures.push(error);
	}

	async capture(request: CaptureRequest): Promise<ProviderResult> {
		return this.answer({ kind: 'capture', request });
	}

	async refund(request: RefundRequest): Promise<ProviderResult> {
		return this.answer({ kind: 'refund', request });
	}

	private answer(call: ProviderCall): ProviderResult {
		this.calls.push(call);
		const failure = this.failures.shift();
		if (failure) throw failure;
		const earlier = this.results.get(call.request.idempotencyKey);
		if (earlier) return earlier;
		const result = { id: `px_${call.kind}_${++this.sequence}` };
		this.results.set(call.request.idempotencyKey, result);
		return result;
	}
}
