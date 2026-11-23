import { randomUUID } from 'node:crypto';

// Payment, capture and refund records. Production keeps them in the Postgres tables of the same
// names; this in-memory version behaves the same way and backs the tests and local runs.

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

export type RefundStatus = 'pending' | 'succeeded';

export interface Refund {
	id: string;
	paymentId: string;
	/** In minor units. */
	amount: number;
	status: RefundStatus;
	/** Set once the provider has confirmed the refund. */
	providerRefundId: string | null;
	createdAt: Date;
}

export interface CaptureFilter {
	paymentId?: string;
	status?: CaptureStatus;
}

export interface RefundFilter {
	paymentId?: string;
	status?: RefundStatus;
}

export interface PaymentRepo {
	addPayment(fields: Omit<Payment, 'id'>): Payment;
	getPayment(id: string): Payment;
	createCapture(paymentId: string, amount: number): Capture;
	getCapture(id: string): Capture;
	markCaptureSucceeded(id: string, providerCaptureId: string): Capture;
	listCaptures(filter?: CaptureFilter): Capture[];
	createRefund(paymentId: string, amount: number): Refund;
	markRefundSucceeded(id: string, providerRefundId: string): Refund;
	listRefunds(filter?: RefundFilter): Refund[];
}

export function createRepo(now: () => Date = () => new Date()): PaymentRepo {
	const payments = new Map<string, Payment>();
	const captures = new Map<string, Capture>();
	const refunds = new Map<string, Refund>();

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

	function findRefund(id: string): Refund {
		const refund = refunds.get(id);
		if (!refund) throw new Error(`Unknown refund ${id}`);
		return refund;
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
		},
		createRefund(paymentId, amount) {
			findPayment(paymentId);
			const refund: Refund = {
				id: `ref_${randomUUID()}`,
				paymentId,
				amount,
				status: 'pending',
				providerRefundId: null,
				createdAt: now()
			};
			refunds.set(refund.id, refund);
			return { ...refund };
		},
		markRefundSucceeded(id, providerRefundId) {
			const refund = findRefund(id);
			refund.status = 'succeeded';
			refund.providerRefundId = providerRefundId;
			return { ...refund };
		},
		listRefunds(filter = {}) {
			return [...refunds.values()]
				.filter((refund) => filter.paymentId === undefined || refund.paymentId === filter.paymentId)
				.filter((refund) => filter.status === undefined || refund.status === filter.status)
				.map((refund) => ({ ...refund }));
		}
	};
}
