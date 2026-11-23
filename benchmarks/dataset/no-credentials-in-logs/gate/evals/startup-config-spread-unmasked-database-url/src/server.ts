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

const server = Bun.serve({
	port: config.port,
	fetch: createApp({ config, log, writeAudit })
});

log.info({ ...config, upstreamToken: '[redacted]' }, 'effective configuration');
log.info({ port: server.port }, 'sluice listening');
