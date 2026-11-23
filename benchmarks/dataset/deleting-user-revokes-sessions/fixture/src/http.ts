import type { AuthUser } from './auth/sessions.ts';

// A small router in the style of Express, on Bun's Request and Response, so the API needs no
// framework. Handlers take an ApiRequest and return an ApiResponse; middleware is a handler that
// returns nothing to let the request through.

export interface ApiRequest {
	method: string;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	headers: Headers;
	/** The parsed JSON body; an empty object when there is none. */
	body: Record<string, unknown>;
	/** The signed-in user, set by requireUser. */
	user?: AuthUser;
	/** The session token the request was signed in with, when it used one rather than an API key. */
	sessionToken?: string;
}

export interface ApiResponse {
	status: number;
	body?: unknown;
}

export type Handler = (req: ApiRequest) => ApiResponse | void | Promise<ApiResponse | void>;

export const json = (status: number, body?: unknown): ApiResponse => ({ status, body });

interface Route {
	method: string;
	pattern: RegExp;
	keys: string[];
	handlers: Handler[];
}

export class Router {
	private readonly routes: Route[] = [];

	get = (path: string, ...handlers: Handler[]) => this.add('GET', path, handlers);
	post = (path: string, ...handlers: Handler[]) => this.add('POST', path, handlers);
	patch = (path: string, ...handlers: Handler[]) => this.add('PATCH', path, handlers);
	delete = (path: string, ...handlers: Handler[]) => this.add('DELETE', path, handlers);

	private add(method: string, path: string, handlers: Handler[]): this {
		const keys: string[] = [];
		const source = path.replace(/:(\w+)/g, (_, key: string) => {
			keys.push(key);
			return '([^/]+)';
		});
		this.routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handlers });
		return this;
	}

	/** Runs the first matching route's handlers in order, until one returns a response; undefined when no route matches. */
	async handle(req: ApiRequest): Promise<ApiResponse | undefined> {
		for (const route of this.routes) {
			if (route.method !== req.method) continue;
			const match = route.pattern.exec(req.path);
			if (!match) continue;
			route.keys.forEach((key, index) => (req.params[key] = decodeURIComponent(match[index + 1]!)));
			for (const handler of route.handlers) {
				const response = await handler(req);
				if (response) return response;
			}
			return json(204);
		}
		return undefined;
	}
}

/** Joins the routers into one fetch handler. A thrown error becomes a 500. */
export function createApp(routers: Router[]) {
	return {
		async fetch(request: Request): Promise<Response> {
			const url = new URL(request.url);
			const text = request.method === 'GET' ? '' : await request.text();
			const req: ApiRequest = {
				method: request.method,
				path: url.pathname,
				params: {},
				query: url.searchParams,
				headers: request.headers,
				body: text ? JSON.parse(text) : {}
			};
			let response: ApiResponse | undefined;
			try {
				for (const router of routers) {
					response = await router.handle(req);
					if (response) break;
				}
			} catch (error) {
				console.error(error);
				response = json(500, { error: 'internal error' });
			}
			response ??= json(404, { error: 'not found' });
			if (response.body === undefined) return new Response(null, { status: response.status });
			return Response.json(response.body, { status: response.status });
		}
	};
}
