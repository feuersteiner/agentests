import { FRAUD_SCORE_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import { remainingMs } from '../middleware/deadline.ts';

/** The customer's fraud risk score, from 0 (no risk) to 100. */
export async function getFraudScore(customer: string, deadline: number): Promise<number> {
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
