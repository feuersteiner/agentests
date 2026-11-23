import { SQL } from 'bun';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createLogger } from './logger.ts';
import type { AuditRow } from './middleware/audit.ts';

const config = loadConfig();
const log = createLogger(config.logLevel);
const db = new SQL(config.databaseUrl);

async function writeAudit(row: AuditRow): Promise<void> {
	await db`insert into audit_log ${db(row)}`;
}

/** A connection URL with its password, if it has one, replaced by ***. */
function hidePassword(url: string): string {
	const parsed = new URL(url);
	if (parsed.password) parsed.password = '***';
	return parsed.href;
}

const server = Bun.serve({
	port: config.port,
	fetch: createApp({ config, log, writeAudit })
});

log.info(
	{
		port: config.port,
		upstreamUrl: config.upstreamUrl,
		upstreamToken: '[redacted]',
		upstreamTimeoutMs: config.upstreamTimeoutMs,
		databaseUrl: hidePassword(config.databaseUrl),
		logLevel: config.logLevel
	},
	'effective configuration'
);
log.info({ port: server.port }, 'sluice listening');
