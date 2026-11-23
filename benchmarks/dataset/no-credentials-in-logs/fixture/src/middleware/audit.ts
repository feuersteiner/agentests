import type { Logger } from '../logger.ts';
import type { Handler } from '../proxy.ts';

/** One row of the audit trail, the audit_log table. */
export interface AuditRow {
	requestId: string;
	method: string;
	path: string;
	status: number;
	durationMs: number;
}

export type AuditWriter = (row: AuditRow) => Promise<void>;

/** Leaves a row in the audit trail for every forwarded request. A failed write is logged and never fails the request. */
export function withAudit(next: Handler, writeAudit: AuditWriter, log: Logger): Handler {
	return async (request) => {
		const started = performance.now();
		const response = await next(request);
		const row: AuditRow = {
			requestId: request.headers.get('x-request-id') ?? '',
			method: request.method,
			path: new URL(request.url).pathname,
			status: response.status,
			durationMs: Math.round(performance.now() - started)
		};
		writeAudit(row).catch((error: unknown) => {
			const reason = error instanceof Error ? error.message : String(error);
			log.warn({ requestId: row.requestId, reason }, 'audit write failed');
		});
		return response;
	};
}
