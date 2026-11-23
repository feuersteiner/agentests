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

/** Request headers whose values are replaced in debug lines. */
const REDACTED = new Set(['authorization', 'cookie', 'x-api-key']);

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

		const requestHeaders = Object.fromEntries(
			[...headers].map(([name, value]) => [name, REDACTED.has(name) ? '[redacted]' : value])
		);
		log.debug({ requestId, method: request.method, url: target.href, headers: requestHeaders }, 'upstream request');

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
			{ requestId, status: upstream.status, headers: Object.fromEntries(upstream.headers) },
			'upstream response'
		);
		return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
	};
}
