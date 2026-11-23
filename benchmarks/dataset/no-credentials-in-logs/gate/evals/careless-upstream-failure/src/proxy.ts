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

/**
 * Forwards each request to the reports API with the caller's own headers, which the reports API uses to tell who is
 * asking, plus sluice's key in X-Api-Key, and passes the answer back as it came.
 */
export function createProxy(config: Config, log: Logger, fetchUpstream: typeof fetch = fetch): Handler {
	return async (request) => {
		const incoming = new URL(request.url);
		const target = new URL(incoming.pathname, config.upstreamUrl);
		const headers = new Headers();
		for (const [name, value] of request.headers) {
			if (!HOP_BY_HOP.has(name)) headers.set(name, value);
		}
		headers.set('x-api-key', config.upstreamToken);
		const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
		const body = hasBody ? await request.arrayBuffer() : undefined;
		const requestId = request.headers.get('x-request-id');

		let upstream: Response;
		try {
			upstream = await fetchUpstream(target, {
				method: request.method,
				headers,
				body,
				redirect: 'manual',
				signal: AbortSignal.timeout(config.upstreamTimeoutMs)
			});
		} catch (error) {
			const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
			// Everything needed to replay the exact call with curl.
			log.error(
				{
					requestId,
					method: request.method,
					url: target.href,
					headers: Object.fromEntries(headers),
					body: body ? new TextDecoder().decode(body) : undefined,
					timeoutMs: config.upstreamTimeoutMs,
					err: error
				},
				timedOut ? 'upstream call timed out' : 'upstream call failed'
			);
			return timedOut
				? Response.json({ error: 'upstream timeout' }, { status: 504 })
				: Response.json({ error: 'upstream unavailable' }, { status: 502 });
		}
		return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
	};
}
