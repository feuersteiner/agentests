import type { Logger } from '../logger.ts';
import type { Handler } from '../proxy.ts';

/** Headers whose values would let a reader act as the caller or as sluice. */
const SECRET_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);

/** The headers as a plain object, with every secret header's value replaced. */
function headersForLog(headers: Headers): Record<string, string> {
	return Object.fromEntries(
		[...headers].map(([name, value]) => [name, SECRET_HEADERS.has(name) ? '[redacted]' : value])
	);
}

/** Writes one access-log line per request: method, path, status, duration and headers. */
export function withAccessLog(next: Handler, log: Logger): Handler {
	return async (request) => {
		const started = performance.now();
		const response = await next(request);
		log.info(
			{
				method: request.method,
				path: new URL(request.url).pathname,
				status: response.status,
				durationMs: Math.round(performance.now() - started),
				headers: headersForLog(request.headers)
			},
			'request'
		);
		return response;
	};
}
