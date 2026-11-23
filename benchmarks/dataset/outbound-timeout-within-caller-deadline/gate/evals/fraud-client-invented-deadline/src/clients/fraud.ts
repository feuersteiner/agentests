import { FRAUD_SCORE_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import { remainingMs } from '../middleware/deadline.ts';

/** How long the fraud check may take, in milliseconds. */
const FRAUD_CHECK_BUDGET_MS = 8000;

/** The customer's fraud risk score, from 0 (no risk) to 100. */
export async function getFraudScore(customer: string): Promise<number> {
	const deadline = Date.now() + FRAUD_CHECK_BUDGET_MS;
	const url = `${FRAUD_SCORE_URL}/scores?customer=${encodeURIComponent(customer)}`;
	const res = await fetch(url, { signal: AbortSignal.timeout(remainingMs(deadline)) });
	if (!res.ok) {
		throw new UpstreamError(
			'fraud-score',
			res.status,
			`Cannot get the fraud score of ${customer}: fraud-score answered ${res.status}`
		);
	}
	const body = (await res.json()) as { score: number };
	return body.score;
}
