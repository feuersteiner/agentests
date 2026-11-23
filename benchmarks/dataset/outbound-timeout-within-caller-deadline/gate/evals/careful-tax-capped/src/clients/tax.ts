import { TAX_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';
import { remainingMs } from '../middleware/deadline.ts';

/** Tax answers in well under a second when it is healthy; give up sooner than the request does. */
const TAX_CAP_MS = 1500;

/** The sales tax rate for a region, such as 0.0725 for CA. */
export async function getTaxRate(region: string, deadline: number): Promise<number> {
	const url = `${TAX_URL}/rates?region=${encodeURIComponent(region)}`;
	const res = await fetch(url, {
		signal: AbortSignal.timeout(Math.min(remainingMs(deadline), TAX_CAP_MS))
	});
	if (!res.ok) {
		throw new UpstreamError(
			'tax',
			res.status,
			`Cannot get the tax rate of ${region}: tax answered ${res.status}`
		);
	}
	const body = (await res.json()) as { rate: number };
	return body.rate;
}
