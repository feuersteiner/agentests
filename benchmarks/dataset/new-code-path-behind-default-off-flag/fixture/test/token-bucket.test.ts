import { describe, expect, test } from 'bun:test';
import { createTokenBuckets } from '../src/quota/token-bucket.ts';

describe('createTokenBuckets', () => {
	test('allows a full day of requests at once, then refuses', () => {
		const buckets = createTokenBuckets();
		const now = new Date('2026-11-23T12:00:00Z');
		for (let i = 0; i < 24; i++) {
			expect(buckets.take('fieldnote', 24, now).allowed).toBe(true);
		}
		expect(buckets.take('fieldnote', 24, now)).toEqual({
			allowed: false,
			retryAfterSeconds: 3600
		});
	});

	test('refills steadily, a full bucket a day', () => {
		const buckets = createTokenBuckets();
		for (let i = 0; i < 24; i++) buckets.take('fieldnote', 24, new Date('2026-11-23T12:00:00Z'));
		expect(buckets.take('fieldnote', 24, new Date('2026-11-23T13:00:00Z')).allowed).toBe(true);
		expect(buckets.take('fieldnote', 24, new Date('2026-11-23T13:00:00Z')).allowed).toBe(false);
	});

	test('keeps each project to its own bucket', () => {
		const buckets = createTokenBuckets();
		const now = new Date('2026-11-23T12:00:00Z');
		buckets.take('fieldnote', 1, now);
		expect(buckets.take('fieldnote', 1, now).allowed).toBe(false);
		expect(buckets.take('loop-cycling', 1, now).allowed).toBe(true);
	});
});
