import { reject, type Middleware } from '../http.ts';
import type { PolicyStore } from '../policies/store.ts';
import type { Counter } from '../quota/counter.ts';

export interface BurstLimitDeps {
	policies: PolicyStore;
	counter: Counter;
}

/** Holds each project to its policy's burstLimit, in requests per second. */
export function burstLimitMiddleware({ policies, counter }: BurstLimitDeps): Middleware {
	return async (req, next) => {
		const limit = policies.get(req.projectId).burstLimit;
		if (typeof limit !== 'number' || limit <= 0) return next(req);
		const second = Math.floor(req.receivedAt.getTime() / 1000);
		if (counter.hit(`${req.projectId}:second:${second}`) > limit) {
			return reject(429, `Burst limit of ${limit} requests per second passed.`);
		}
		return next(req);
	};
}
