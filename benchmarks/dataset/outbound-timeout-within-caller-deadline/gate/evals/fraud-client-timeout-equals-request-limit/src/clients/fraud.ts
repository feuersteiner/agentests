import { FRAUD_SCORE_URL, REQUEST_TIMEOUT_MS } from '../config.ts';
import { UpstreamError } from '../errors.ts';

/** The customer's fraud risk score, from 0 (no risk) to 100. */
export async function getFraudScore(customer: string): Promise<number> {
	const url = `${FRAUD_SCORE_URL}/scores?customer=${encodeURIComponent(customer)}`;
	// Never wait longer than the API itself does.
	const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
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
