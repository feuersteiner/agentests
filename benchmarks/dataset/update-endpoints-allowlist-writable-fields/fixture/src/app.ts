import { authenticate } from './auth.ts';
import type { Handler } from './http.ts';
import { createKey, deleteKey, listKeys } from './routes/keys.ts';
import { getProfile } from './routes/profile.ts';
import { createProject, getProject, listProjects } from './routes/projects.ts';
import { adminUpdateUser, listUsers } from './routes/users.ts';

type Route = [method: string, path: string, handler: Handler];

const routes: Route[] = [
	['GET', '/profile', getProfile],
	['GET', '/keys', listKeys],
	['POST', '/keys', createKey],
	['DELETE', '/keys/:id', deleteKey],
	['GET', '/projects', listProjects],
	['POST', '/projects', createProject],
	['GET', '/projects/:id', getProject],
	['GET', '/users', listUsers],
	['PATCH', '/admin/users/:id', adminUpdateUser]
];

/** The route for a method and path, with the values of its `:name` parameters. */
function findRoute(method: string, pathname: string) {
	const parts = pathname.split('/').filter(Boolean);
	for (const [routeMethod, path, handler] of routes) {
		const pattern = path.split('/').filter(Boolean);
		if (routeMethod !== method || pattern.length !== parts.length) continue;
		const params: Record<string, string> = {};
		const matches = pattern.every((segment, index) => {
			if (segment.startsWith(':')) {
				params[segment.slice(1)] = decodeURIComponent(parts[index]);
				return true;
			}
			return segment === parts[index];
		});
		if (matches) return { handler, params };
	}
	return null;
}

/** Answers one HTTP request: finds its route, signs the user in, reads the JSON body and runs the handler. */
export async function handle(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const route = findRoute(request.method, url.pathname);
	if (!route) return Response.json({ error: 'not found' }, { status: 404 });

	const user = await authenticate(request);
	if (!user) return Response.json({ error: 'sign in first' }, { status: 401 });

	let body: unknown = {};
	if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
		body = await request.json().catch(() => undefined);
		if (typeof body !== 'object' || body === null || Array.isArray(body)) {
			return Response.json({ error: 'the body must be a JSON object' }, { status: 400 });
		}
	}

	try {
		const result = await route.handler({ user, params: route.params, query: url.searchParams, body });
		if (result.body === undefined) return new Response(null, { status: result.status });
		return Response.json(result.body, { status: result.status });
	} catch (error) {
		console.error(error);
		return Response.json({ error: 'internal error' }, { status: 500 });
	}
}
