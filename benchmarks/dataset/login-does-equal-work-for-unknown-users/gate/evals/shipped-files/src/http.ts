/** One route of the server: a method, an exact path and the handler that answers it. */
export interface Route {
	method: 'GET' | 'POST';
	path: string;
	handler: (request: Request) => Promise<Response>;
}

/** A JSON response. */
export const json = (status: number, body: unknown, headers?: HeadersInit): Response =>
	Response.json(body, { status, headers });

/** The request's JSON body when it is an object, otherwise null. */
export const readJson = async (request: Request): Promise<Record<string, unknown> | null> => {
	try {
		const body: unknown = await request.json();
		return typeof body === 'object' && body !== null && !Array.isArray(body)
			? (body as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
};

/** A string field of a JSON body, or '' when it is missing or not a string. */
export const stringField = (body: Record<string, unknown> | null, name: string): string => {
	const value = body?.[name];
	return typeof value === 'string' ? value : '';
};

/** The value of the named cookie, when the request carries it. */
export const readCookie = (request: Request, name: string): string | undefined => {
	for (const part of (request.headers.get('cookie') ?? '').split(';')) {
		const [key, ...value] = part.trim().split('=');
		if (key === name) return value.join('=');
	}
	return undefined;
};

/** A fetch handler that answers each request with its route, or 404. */
export const router =
	(routes: Route[]) =>
	async (request: Request): Promise<Response> => {
		const { pathname } = new URL(request.url);
		const route = routes.find((r) => r.method === request.method && r.path === pathname);
		return route ? route.handler(request) : json(404, { error: 'Not found.' });
	};
