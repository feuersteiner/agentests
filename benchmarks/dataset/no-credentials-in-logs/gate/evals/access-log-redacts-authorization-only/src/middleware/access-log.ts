import type { Logger } from '../logger.ts';
import type { Handler } from '../proxy.ts';

/** Writes one access-log line per request: method, path, status, duration and headers. */
export function withAccessLog(next: Handler, log: Logger): Handler {
	return async (request) => {
		const started = performance.now();
		const response = await next(request);
		const headers = Object.fromEntries(request.headers);
		if (headers.authorization) headers.authorization = '[redacted]';
		log.info(
			{
				method: request.method,
				path: new URL(request.url).pathname,
				status: response.status,
				durationMs: Math.round(performance.now() - started),
				headers
			},
			'request'
		);
		return response;
	};
}
