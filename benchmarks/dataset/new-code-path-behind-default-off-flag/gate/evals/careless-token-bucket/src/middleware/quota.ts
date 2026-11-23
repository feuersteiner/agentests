import { reject, type Middleware } from '../http.ts';
import type { PolicyStore } from '../policies/store.ts';
import { createTokenBuckets } from '../quota/token-bucket.ts';

export interface QuotaDeps {
	policies: PolicyStore;
}

/** Holds each project to its quota policy before the request goes upstream. */
export function quotaMiddleware({ policies }: QuotaDeps): Middleware {
	const buckets = createTokenBuckets();
	return async (req, next) => {
		const policy = policies.get(req.projectId);
		const take = buckets.take(req.projectId, policy.dailyLimit, req.receivedAt);
		if (!take.allowed) {
			return reject(429, `Quota of ${policy.dailyLimit} requests a day used up.`, {
				'retry-after': String(take.retryAfterSeconds)
			});
		}
		return next(req);
	};
}
