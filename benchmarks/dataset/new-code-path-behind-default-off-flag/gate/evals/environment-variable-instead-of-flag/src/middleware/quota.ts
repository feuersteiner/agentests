import { reject, type Middleware } from '../http.ts';
import type { PolicyStore } from '../policies/store.ts';
import { dayKey, secondsUntilMidnight, type Counter } from '../quota/counter.ts';

export interface QuotaDeps {
	policies: PolicyStore;
	counter: Counter;
}

/** Holds each project to its quota policy before the request goes upstream. */
export function quotaMiddleware({ policies, counter }: QuotaDeps): Middleware {
	return async (req, next) => {
		const policy = policies.get(req.projectId);
		const used = counter.hit(`${req.projectId}:day:${dayKey(req.receivedAt)}`);
		if (used > policy.dailyLimit) {
			return reject(429, `Daily quota of ${policy.dailyLimit} requests used up.`, {
				'retry-after': String(secondsUntilMidnight(req.receivedAt))
			});
		}

		if (process.env.BURST_LIMIT_CHECK === 'on') {
			const limit = policy.burstLimit;
			if (typeof limit === 'number' && limit > 0) {
				const second = Math.floor(req.receivedAt.getTime() / 1000);
				const burst = counter.hit(`${req.projectId}:second:${second}`);
				if (burst > limit) {
					return reject(429, `Burst limit of ${limit} requests per second passed.`, {
						'retry-after': '1'
					});
				}
			}
		}
		return next(req);
	};
}
