import { describe, expect, test } from 'bun:test';
import type { Feature } from '../src/features/loader.ts';
import { scoreRequest } from '../src/scorer.ts';

const features: Feature[] = [
	{ name: 'ua_curl', header: 'user-agent', contains: 'curl/' },
	{ name: 'lang_wildcard', header: 'accept-language', contains: '*' },
	{ name: 'conn_close', header: 'connection', contains: 'close' }
];

describe('scoreRequest', () => {
	test('scores one point per matching feature', () => {
		const result = scoreRequest({ 'user-agent': 'curl/8.4.0', connection: 'keep-alive' }, features);
		expect(result).toEqual({ score: 1, matched: ['ua_curl'], bot: false });
	});

	test('marks a request with two matches as a bot', () => {
		const result = scoreRequest({ 'user-agent': 'curl/8.4.0', connection: 'close' }, features);
		expect(result).toEqual({ score: 2, matched: ['ua_curl', 'conn_close'], bot: true });
	});

	test('ignores features whose header is missing', () => {
		expect(scoreRequest({}, features)).toEqual({ score: 0, matched: [], bot: false });
	});

	test('scores 0 with no features', () => {
		expect(scoreRequest({ 'user-agent': 'curl/8.4.0' }, []).score).toBe(0);
	});
});
