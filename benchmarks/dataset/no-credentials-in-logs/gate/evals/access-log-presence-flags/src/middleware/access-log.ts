import type { Logger } from '../logger.ts';
import type { Handler } from '../proxy.ts';

/** Writes one access-log line per request: method, path, status, duration and the headers worth reading. */
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
				headers: {
					'user-agent': request.headers.get('user-agent'),
					'content-type': request.headers.get('content-type'),
					'x-request-id': request.headers.get('x-request-id'),
					authorization: request.headers.has('authorization') ? 'present' : 'absent',
					cookie: request.headers.has('cookie') ? 'present' : 'absent'
				}
			},
			'request'
		);
		return response;
	};
}
