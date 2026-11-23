import type { Handler } from '../proxy.ts';

/** Gives every request an X-Request-Id, keeping the caller's when it sent one, so sluice's lines and the reports API's match up. */
export function withRequestId(next: Handler): Handler {
	return (request) => {
		if (request.headers.get('x-request-id')) return next(request);
		const headers = new Headers(request.headers);
		headers.set('x-request-id', crypto.randomUUID());
		return next(new Request(request, { headers }));
	};
}
