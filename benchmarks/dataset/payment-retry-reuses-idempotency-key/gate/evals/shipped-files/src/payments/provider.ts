// The card provider's API, as this service uses it. The platform team's HTTP client implements it
// in production; the tests use test/fake-provider.ts.

export interface CaptureRequest {
	/** The provider's id for the authorized payment. */
	providerPaymentId: string;
	/** In minor units. */
	amount: number;
	currency: string;
	/** Required on every request that moves money. */
	idempotencyKey: string;
}

export interface RefundRequest {
	/** The provider's id for the captured payment. */
	providerPaymentId: string;
	/** In minor units. */
	amount: number;
	currency: string;
	/** Required on every request that moves money. */
	idempotencyKey: string;
}

export interface ProviderResult {
	/** The provider's id for the capture or refund. */
	id: string;
}

export interface PaymentProvider {
	capture(request: CaptureRequest): Promise<ProviderResult>;
	refund(request: RefundRequest): Promise<ProviderResult>;
}

/** The provider answered with an error, such as a declined or expired card. */
export class ProviderError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = 'ProviderError';
		this.code = code;
	}
}

/** The provider did not answer within the client's timeout. */
export class ProviderTimeoutError extends ProviderError {
	constructor(message = 'The provider did not answer in time') {
		super(message, 'timeout');
		this.name = 'ProviderTimeoutError';
	}
}
