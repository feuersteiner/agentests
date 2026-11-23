import { createApp } from './http.ts';
import { accountRoutes } from './routes/account.ts';
import { adminRoutes } from './routes/admin.ts';
import { authRoutes } from './routes/auth.ts';
import { boardRoutes } from './routes/boards.ts';
import { scimRoutes } from './routes/scim.ts';

export const app = createApp([authRoutes, accountRoutes, boardRoutes, adminRoutes, scimRoutes]);

// `bun run start` serves the API with the in-memory stores. In production the platform's start
// script connects Redis and Postgres first.
if (import.meta.main) {
	const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: app.fetch });
	console.log(`Larchwood API on ${server.url}`);
}
