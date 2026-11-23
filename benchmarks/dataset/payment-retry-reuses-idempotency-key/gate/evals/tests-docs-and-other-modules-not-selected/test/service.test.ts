import { beforeEach, expect, test } from 'bun:test';
import { ProviderTimeoutError } from '../src/payments/provider.ts';
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

test('a second capturePayment after a timeout records a second capture', async () => {
	provider.failNext(new ProviderTimeoutError());
	await expect(service.capturePayment(paymentId, 5000)).rejects.toThrow(ProviderTimeoutError);
	await service.capturePayment(paymentId, 5000);
	expect(repo.listCaptures({ paymentId })).toHaveLength(2);
});

test('the fake answers a repeated key with the first result', async () => {
	const first = await provider.capture({
		providerPaymentId: 'px_pay_1',
		amount: 100,
		currency: 'EUR',
		idempotencyKey: 'key-1'
	});
	const again = await provider.capture({
		providerPaymentId: 'px_pay_1',
		amount: 100,
		currency: 'EUR',
		idempotencyKey: 'key-1'
	});
	expect(again).toEqual(first);
});
