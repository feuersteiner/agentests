import type { PaymentService } from './service.ts';

export interface BulkCaptureResult {
	captured: string[];
	failed: { paymentId: string; reason: string }[];
}

/**
 * The back office's "capture selected" action: captures the full authorized amount of each chosen
 * payment, one after the other, and reports which failed so the operator can look at them.
 */
export async function captureSelected(
	service: PaymentService,
	selection: { paymentId: string; amount: number }[]
): Promise<BulkCaptureResult> {
	const result: BulkCaptureResult = { captured: [], failed: [] };
	for (const { paymentId, amount } of selection) {
		try {
			await service.capturePayment(paymentId, amount);
			result.captured.push(paymentId);
		} catch (error) {
			result.failed.push({ paymentId, reason: error instanceof Error ? error.message : String(error) });
		}
	}
	return result;
}
