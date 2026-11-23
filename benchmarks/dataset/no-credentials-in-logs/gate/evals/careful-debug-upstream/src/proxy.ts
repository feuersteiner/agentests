import type { Config } from './config.ts';
import type { Logger } from './logger.ts';

/** Answers one request; the proxy and every middleware have this shape. */
export type Handler = (request: Request) => Promise<Response>;

/** Headers that belong to one connection and are not forwarded. */
const HOP_BY_HOP = new Set([
	'connection',
	'keep-alive',
	'proxy-connection',
	'transfer-encoding',
	'upgrade',
	'te',
	'trailer',
	'host'
]);

/** Headers whose values would let a reader act as the caller or as sluice. */
const SECRET_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);

/** The headers as a plain object for a log line, with every secret header's value replaced. */
function loggableHeaders(headers: Headers): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [name, value] of headers) out[name] = SECRET_HEADERS.has(name) ? '[redacted]' : value;
	return out;
}

/**
 * Forwards each request to the reports API with the caller's own headers, which the reports API uses to tell who is
 * asking, plus sluice's key in X-Api-Key, and passes the answer back as it came.
 */
export function createProxy(config: Config, log: Logger, fetchUpstream: typeof fetch = fetch): Handler {
	return async (request) => {
		const incoming = new URL(request.url);
		const target = new URL(incoming.pathname + incoming.search, config.upstreamUrl);
		const headers = new Headers();
		for (const [name, value] of request.headers) {
			if (!HOP_BY_HOP.has(name)) headers.set(name, value);
		}
		headers.set('x-api-key', config.upstreamToken);
		const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
		const body = hasBody ? await request.arrayBuffer() : undefined;
		const requestId = request.headers.get('x-request-id');

		log.debug(
			{ requestId, method: request.method, url: target.href, headers: loggableHeaders(headers), bodyBytes: body?.byteLength ?? 0 },
			'upstream request'
		);

		let upstream: Response;
		try {
			upstream = await fetchUpstream(target, {
				method: request.method,
				headers,
				body,
				redirect: 'manual',
				signal: AbortSignal.timeout(config.upstreamTimeoutMs)
			});
		} catch {
			log.warn({ requestId }, 'upstream call failed');
			return Response.json({ error: 'upstream unavailable' }, { status: 502 });
		}

		log.debug(
			{ requestId, status: upstream.status, headers: loggableHeaders(upstream.headers) },
			'upstream response'
		);
		return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
	};
}
