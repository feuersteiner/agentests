import { TAX_URL } from '../config.ts';
import { UpstreamError } from '../errors.ts';

/** Tax sometimes hangs; fail fast instead of holding the request. */
const TAX_TIMEOUT_MS = 2000;

/** The sales tax rate for a region, such as 0.0725 for CA. */
export async function getTaxRate(region: string, _deadline: number): Promise<number> {
	const url = `${TAX_URL}/rates?region=${encodeURIComponent(region)}`;
	const res = await fetch(url, { signal: AbortSignal.timeout(TAX_TIMEOUT_MS) });
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
