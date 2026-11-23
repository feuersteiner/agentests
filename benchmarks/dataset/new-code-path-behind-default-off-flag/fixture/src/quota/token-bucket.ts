/**
 * The token-bucket version of the daily quota calculation. Not used yet.
 *
 * Each project has a bucket that holds up to its daily limit in tokens and refills steadily, a
 * full bucket a day. Every request takes one token. Unlike a count that resets at midnight UTC,
 * a project that uses its whole quota just before midnight cannot use it all again just after.
 */
export interface TokenBuckets {
	/** Takes a token from the project's bucket. `allowed` is false when the bucket is empty. */
	take(projectId: string, dailyLimit: number, now: Date): Take;
}

export interface Take {
	allowed: boolean;
	/** Whole seconds until the bucket holds a token again; 0 when allowed. */
	retryAfterSeconds: number;
}

const DAY_MS = 86_400_000;

export function createTokenBuckets(): TokenBuckets {
	const buckets = new Map<string, { tokens: number; updatedAt: number }>();
	return {
		take(projectId, dailyLimit, now) {
			const at = now.getTime();
			const bucket = buckets.get(projectId) ?? { tokens: dailyLimit, updatedAt: at };
			const refill = ((at - bucket.updatedAt) * dailyLimit) / DAY_MS;
			bucket.tokens = Math.min(dailyLimit, bucket.tokens + refill);
			bucket.updatedAt = at;
			buckets.set(projectId, bucket);
			if (bucket.tokens >= 1) {
				bucket.tokens -= 1;
				return { allowed: true, retryAfterSeconds: 0 };
			}
			return {
				allowed: false,
				retryAfterSeconds: Math.ceil(((1 - bucket.tokens) * DAY_MS) / dailyLimit / 1000)
			};
		}
	};
}
