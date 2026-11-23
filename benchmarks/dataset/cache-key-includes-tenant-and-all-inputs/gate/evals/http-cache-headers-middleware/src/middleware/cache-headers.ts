// Sets the Cache-Control header on every API response. Nothing here stores a response: browsers
// and the CDN decide what to keep from the header.

export type Handler = (request: Request) => Promise<Response>;

/** Responses under /api/public may be kept by shared caches for a minute; everything else is no-store. */
export function cacheHeaders(next: Handler): Handler {
	return async (request) => {
		const response = await next(request);
		const { pathname } = new URL(request.url);
		const value = pathname.startsWith('/api/public/') ? 'public, max-age=60' : 'no-store';
		const headers = new Headers(response.headers);
		headers.set('Cache-Control', value);
		return new Response(response.body, { status: response.status, headers });
	};
}
