import { isEnabled } from '../flags.ts';
import { reject, type Middleware } from '../http.ts';
import type { PolicyStore } from '../policies/store.ts';
import type { Counter } from '../quota/counter.ts';

export interface RegionalQuotaDeps {
	policies: PolicyStore;
	counter: Counter;
}

/** Holds a project with a regional policy to maxPerMinute in the policy's region. */
export function regionalQuotaMiddleware({ policies, counter }: RegionalQuotaDeps): Middleware {
	return async (req, next) => {
		if (!isEnabled('regionalQuota')) return next(req);
		const policy = policies.get(req.projectId);
		const region = (policy.region ?? '').trim();
		const maxPerMinute = policy.maxPerMinute ?? null;
		if (region === '' || maxPerMinute === null || maxPerMinute === '') return next(req);
		if (region !== req.region) return next(req);
		const minute = Math.floor(req.receivedAt.getTime() / 60_000);
		const used = counter.hit(`${req.projectId}:minute:${region}:${minute}`);
		if (used > maxPerMinute) {
			return reject(429, `Regional quota of ${maxPerMinute} requests a minute in ${region} used up.`, {
				'retry-after': String(60 - req.receivedAt.getUTCSeconds())
			});
		}
		return next(req);
	};
}
