import { isLogLevel, type LogLevel } from './logger.ts';

/** Where sluice listens, where it forwards requests and what it needs to do so, read from the environment. */
export interface Config {
	/** The port sluice listens on (PORT, default 8080). */
	port: number;
	/** Base URL of the reports API that requests are forwarded to (UPSTREAM_URL). */
	upstreamUrl: string;
	/** The key sluice sends to the reports API in the X-Api-Key header (UPSTREAM_TOKEN). */
	upstreamToken: string;
	/** How long to wait for the reports API, in milliseconds (UPSTREAM_TIMEOUT_MS, default 10000). */
	upstreamTimeoutMs: number;
	/** The Postgres database the audit trail is written to (DATABASE_URL). */
	databaseUrl: string;
	/** The lowest level that is logged (LOG_LEVEL, default info). */
	logLevel: LogLevel;
}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

/** Reads the configuration from `env`. A missing required setting or an unknown LOG_LEVEL throws. */
export function loadConfig(env: Env = process.env): Config {
	const logLevel = env.LOG_LEVEL ?? 'info';
	if (!isLogLevel(logLevel)) {
		throw new Error(`LOG_LEVEL must be trace, debug, info, warn or error, not "${logLevel}"`);
	}
	return {
		port: Number(env.PORT ?? 8080),
		upstreamUrl: required(env, 'UPSTREAM_URL'),
		upstreamToken: required(env, 'UPSTREAM_TOKEN'),
		upstreamTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS ?? 10_000),
		databaseUrl: required(env, 'DATABASE_URL'),
		logLevel
	};
}
