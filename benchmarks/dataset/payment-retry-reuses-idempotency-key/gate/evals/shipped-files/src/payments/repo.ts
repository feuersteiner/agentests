import { randomUUID } from 'node:crypto';

// Payment and capture records. Production keeps them in the Postgres tables of the same names;
// this in-memory version behaves the same way and backs the tests and local runs.

export interface Payment {
	id: string;
	/** The provider's id for the authorization. */
	providerPaymentId: string;
	/** The authorized amount, in minor units. */
	amount: number;
	currency: string;
}

export type CaptureStatus = 'pending' | 'succeeded';

export interface Capture {
	id: string;
	paymentId: string;
	/** In minor units. */
	amount: number;
	status: CaptureStatus;
	/** Set once the provider has confirmed the capture. */
	providerCaptureId: string | null;
	createdAt: Date;
}

export interface CaptureFilter {
	paymentId?: string;
	status?: CaptureStatus;
}

export interface PaymentRepo {
	addPayment(fields: Omit<Payment, 'id'>): Payment;
	getPayment(id: string): Payment;
	createCapture(paymentId: string, amount: number): Capture;
	getCapture(id: string): Capture;
	markCaptureSucceeded(id: string, providerCaptureId: string): Capture;
	listCaptures(filter?: CaptureFilter): Capture[];
}

export function createRepo(now: () => Date = () => new Date()): PaymentRepo {
	const payments = new Map<string, Payment>();
	const captures = new Map<string, Capture>();

	function findPayment(id: string): Payment {
		const payment = payments.get(id);
		if (!payment) throw new Error(`Unknown payment ${id}`);
		return payment;
	}

	function findCapture(id: string): Capture {
		const capture = captures.get(id);
		if (!capture) throw new Error(`Unknown capture ${id}`);
		return capture;
	}

	return {
		addPayment(fields) {
			const payment = { id: `pay_${randomUUID()}`, ...fields };
			payments.set(payment.id, payment);
			return { ...payment };
		},
		getPayment: (id) => ({ ...findPayment(id) }),
		createCapture(paymentId, amount) {
			findPayment(paymentId);
			const capture: Capture = {
				id: `cap_${randomUUID()}`,
				paymentId,
				amount,
				status: 'pending',
				providerCaptureId: null,
				createdAt: now()
			};
			captures.set(capture.id, capture);
			return { ...capture };
		},
		getCapture: (id) => ({ ...findCapture(id) }),
		markCaptureSucceeded(id, providerCaptureId) {
			const capture = findCapture(id);
			capture.status = 'succeeded';
			capture.providerCaptureId = providerCaptureId;
			return { ...capture };
		},
		listCaptures(filter = {}) {
			return [...captures.values()]
				.filter((capture) => filter.paymentId === undefined || capture.paymentId === filter.paymentId)
				.filter((capture) => filter.status === undefined || capture.status === filter.status)
				.map((capture) => ({ ...capture }));
		}
	};
}
