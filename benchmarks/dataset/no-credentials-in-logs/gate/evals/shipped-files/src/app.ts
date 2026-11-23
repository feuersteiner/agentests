import type { Config } from './config.ts';
import { health } from './health.ts';
import type { Logger } from './logger.ts';
import { withAudit, type AuditWriter } from './middleware/audit.ts';
import { withRequestId } from './middleware/request-id.ts';
import { createProxy, type Handler } from './proxy.ts';

export interface AppOptions {
	config: Config;
	log: Logger;
	writeAudit: AuditWriter;
	/** The fetch that reaches the reports API; the tests pass a fake. */
	fetchUpstream?: typeof fetch;
}

/** The whole of sluice: /healthz is answered here, and every other request goes to the reports API. */
export function createApp({ config, log, writeAudit, fetchUpstream = fetch }: AppOptions): Handler {
	const forward = withRequestId(withAudit(createProxy(config, log, fetchUpstream), writeAudit, log));
	return async (request) => {
		const { pathname } = new URL(request.url);
		if (request.method === 'GET' && pathname === '/healthz') return health();
		return forward(request);
	};
}
