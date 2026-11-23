import { expect, test } from 'bun:test';
import { settlementReport } from '../src/jobs/settlement.ts';
import { createRepo } from '../src/payments/repo.ts';

test('totals one day of captures for each currency', () => {
	let clock = new Date('2026-03-02T09:00:00Z');
	const repo = createRepo(() => clock);
	const eur = repo.addPayment({ providerPaymentId: 'px_pay_1', amount: 6900, currency: 'EUR' });
	const gbp = repo.addPayment({ providerPaymentId: 'px_pay_2', amount: 2000, currency: 'GBP' });
	repo.markCaptureSucceeded(repo.createCapture(eur.id, 5000).id, 'px_capture_1');
	repo.markCaptureSucceeded(repo.createCapture(eur.id, 1200).id, 'px_capture_2');
	repo.markCaptureSucceeded(repo.createCapture(gbp.id, 2000).id, 'px_capture_3');
	clock = new Date('2026-03-03T09:00:00Z');
	repo.markCaptureSucceeded(repo.createCapture(eur.id, 700).id, 'px_capture_4');

	expect(settlementReport(repo, '2026-03-02')).toEqual([
		{ currency: 'EUR', count: 2, total: 6200 },
		{ currency: 'GBP', count: 1, total: 2000 }
	]);
});
