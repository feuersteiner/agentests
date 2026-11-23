import type { PaymentRepo } from '../payments/repo.ts';

export interface SettlementLine {
	currency: string;
	count: number;
	/** In minor units. */
	total: number;
}

/** The captures created on `day` (a UTC date, YYYY-MM-DD), with their total for each currency. */
export function settlementReport(repo: PaymentRepo, day: string): SettlementLine[] {
	const lines = new Map<string, SettlementLine>();
	for (const capture of repo.listCaptures()) {
		if (capture.createdAt.toISOString().slice(0, 10) !== day) continue;
		const { currency } = repo.getPayment(capture.paymentId);
		const line = lines.get(currency) ?? { currency, count: 0, total: 0 };
		line.count += 1;
		line.total += capture.amount;
		lines.set(currency, line);
	}
	return [...lines.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
