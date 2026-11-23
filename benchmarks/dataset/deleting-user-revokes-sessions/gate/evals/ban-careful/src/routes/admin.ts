import { apiKeys } from '../auth/apiKeys.ts';
import { requireAdmin } from '../auth/middleware.ts';
import { sessions } from '../auth/sessions.ts';
import { boards } from '../boards/repo.ts';
import { json, Router } from '../http.ts';
import { users, type User } from '../users/repo.ts';

// The support team's back office. Every route needs an admin.

export const adminRoutes = new Router();

const summary = ({ id, email, displayName, role, anonymous, createdAt }: User) => ({
	id,
	email,
	displayName,
	role,
	anonymous,
	createdAt: createdAt.toISOString()
});

/** GET /admin/users?q=: every user, or those whose email or display name contains q. */
adminRoutes.get('/admin/users', requireAdmin, async (req) => {
	const q = req.query.get('q')?.trim();
	const all = await users.list();
	const found = q ? all.filter((user) => user.email?.includes(q) || user.displayName.includes(q)) : all;
	return json(200, found.map(summary));
});

/** GET /admin/users/:id: one user, with how many boards and live API keys they have. */
adminRoutes.get('/admin/users/:id', requireAdmin, async (req) => {
	const user = await users.get(req.params.id!);
	if (!user) return json(404, { error: 'user not found' });
	return json(200, {
		...summary(user),
		boards: (await boards.listForOwner(user.id)).length,
		apiKeys: (await apiKeys.listForUser(user.id)).length
	});
});

/** POST /admin/users/:id/ban: bans a user from Larchwood. */
adminRoutes.post('/admin/users/:id/ban', requireAdmin, async (req) => {
	const user = await users.get(req.params.id!);
	if (!user) return json(404, { error: 'user not found' });
	if (user.id === req.user!.id) return json(400, { error: 'you cannot ban yourself' });
	await users.update(user.id, { bannedAt: new Date() });
	await sessions.revokeAllForUser(user.id);
	await apiKeys.revokeAllForUser(user.id);
	return json(204);
});

/** POST /admin/users/:id/unban: lifts a ban. */
adminRoutes.post('/admin/users/:id/unban', requireAdmin, async (req) => {
	const user = await users.get(req.params.id!);
	if (!user) return json(404, { error: 'user not found' });
	await users.update(user.id, { bannedAt: null });
	return json(204);
});
