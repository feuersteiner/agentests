import { router, type Route } from './http.ts';
import { apiRoutes } from './routes/api.ts';
import { webRoutes } from './routes/web.ts';

/** Every route: the web app's at the root, the API's under /api. */
export const routes: Route[] = [
	...webRoutes,
	...apiRoutes.map((route) => ({ ...route, path: `/api${route.path}` }))
];

export const handle = router(routes);

if (import.meta.main) {
	const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: handle });
	console.log(`sorrel-lists listening on ${server.url}`);
}
