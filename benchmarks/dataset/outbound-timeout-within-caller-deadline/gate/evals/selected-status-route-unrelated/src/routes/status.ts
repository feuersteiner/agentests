import { REQUEST_TIMEOUT_MS } from '../config.ts';

const startedAt = Date.now();

/** GET /status: what the on-call engineer checks first. */
export function status(): Response {
	return Response.json({
		uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
		requestTimeoutMs: REQUEST_TIMEOUT_MS,
		node: process.versions.bun ?? process.version
	});
}
