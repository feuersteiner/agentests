import { describe, expect, test } from 'bun:test';
import { loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
	test('reads each setting from the environment', () => {
		expect(
			loadConfig({
				PORT: '8181',
				GATEWAY_REGION: 'us-east',
				UPSTREAM: 'http://maps.internal',
				POLICIES_PATH: '/etc/meridian/policies.json'
			})
		).toEqual({
			port: 8181,
			region: 'us-east',
			upstreamUrl: 'http://maps.internal',
			policiesPath: '/etc/meridian/policies.json'
		});
	});

	test('falls back to the defaults', () => {
		const config = loadConfig({});
		expect(config.port).toBe(8080);
		expect(config.region).toBe('eu-west');
		expect(config.upstreamUrl).toBe('http://localhost:9000');
	});
});
