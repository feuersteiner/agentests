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
		const policy = policies.get(req.projectId);
		if (policy.region!.toLowerCase() !== req.region) return next(req);
		const minute = Math.floor(req.receivedAt.getTime() / 60_000);
		const used = counter.hit(`${req.projectId}:minute:${minute}`);
		if (used > (policy.maxPerMinute as number)) {
			return reject(429, `Regional quota of ${policy.maxPerMinute} requests a minute used up.`);
		}
		return next(req);
	};
}
