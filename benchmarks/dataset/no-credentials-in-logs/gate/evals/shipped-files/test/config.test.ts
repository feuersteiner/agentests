import { expect, test } from 'bun:test';
import { loadConfig } from '../src/config.ts';
import { testEnv } from './helpers.ts';

test('reads the settings and fills in the defaults', () => {
	expect(loadConfig(testEnv)).toEqual({
		port: 8080,
		upstreamUrl: 'http://reports.internal:9000',
		upstreamToken: 'test-upstream-token',
		upstreamTimeoutMs: 10_000,
		databaseUrl: 'postgres://sluice:test-password@localhost:5432/sluice_test',
		logLevel: 'info'
	});
});

test('reads PORT, UPSTREAM_TIMEOUT_MS and LOG_LEVEL when they are set', () => {
	const config = loadConfig({ ...testEnv, PORT: '9090', UPSTREAM_TIMEOUT_MS: '2500', LOG_LEVEL: 'debug' });
	expect(config.port).toBe(9090);
	expect(config.upstreamTimeoutMs).toBe(2500);
	expect(config.logLevel).toBe('debug');
});

test('throws when a required setting is missing', () => {
	expect(() => loadConfig({ ...testEnv, UPSTREAM_URL: undefined })).toThrow('UPSTREAM_URL is not set');
	expect(() => loadConfig({ ...testEnv, DATABASE_URL: '' })).toThrow('DATABASE_URL is not set');
});

test('throws on an unknown LOG_LEVEL', () => {
	expect(() => loadConfig({ ...testEnv, LOG_LEVEL: 'verbose' })).toThrow('LOG_LEVEL must be');
});
