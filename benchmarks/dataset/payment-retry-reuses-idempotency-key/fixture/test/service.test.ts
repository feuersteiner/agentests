import { beforeEach, describe, expect, test } from 'bun:test';
import { ProviderError } from '../src/payments/provider.ts';
import { createRepo, type PaymentRepo } from '../src/payments/repo.ts';
import { createPaymentService, type PaymentService } from '../src/payments/service.ts';
import { FakeProvider } from './fake-provider.ts';

let provider: FakeProvider;
let repo: PaymentRepo;
let service: PaymentService;
let paymentId: string;

beforeEach(() => {
	provider = new FakeProvider();
	repo = createRepo();
	service = createPaymentService({ provider, repo });
	paymentId = repo.addPayment({ providerPaymentId: 'px_pay_1', amount: 5000, currency: 'EUR' }).id;
});

describe('capturePayment', () => {
	test('captures the amount with the provider and records it', async () => {
		const capture = await service.capturePayment(paymentId, 5000);
		expect(capture.status).toBe('succeeded');
		expect(capture.providerCaptureId).toBe('px_capture_1');
		expect(provider.calls).toHaveLength(1);
		expect(provider.calls[0]?.request).toMatchObject({
			providerPaymentId: 'px_pay_1',
			amount: 5000,
			currency: 'EUR'
		});
	});

	test('refuses more than the authorized amount', async () => {
		await expect(service.capturePayment(paymentId, 6000)).rejects.toThrow(RangeError);
		expect(provider.calls).toHaveLength(0);
	});

	test('passes a provider error on to the caller', async () => {
		provider.failNext(new ProviderError('Card expired', 'expired_card'));
		await expect(service.capturePayment(paymentId, 5000)).rejects.toThrow('Card expired');
	});
});

describe('paymentStatus', () => {
	test('is uncaptured before any capture', () => {
		expect(service.paymentStatus(paymentId)).toBe('uncaptured');
	});

	test('is captured once a capture has succeeded', async () => {
		await service.capturePayment(paymentId, 5000);
		expect(service.paymentStatus(paymentId)).toBe('captured');
	});
});
