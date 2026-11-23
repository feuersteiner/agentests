import { apiKeys } from '../auth/apiKeys.ts';
import { requireAdmin } from '../auth/middleware.ts';
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

/** PATCH /admin/users/:id: changes a user's display name or role. Setting the role to member removes admin rights. */
adminRoutes.patch('/admin/users/:id', requireAdmin, async (req) => {
	const user = await users.get(req.params.id!);
	if (!user) return json(404, { error: 'user not found' });
	const { displayName, role } = req.body;
	if (displayName !== undefined && (typeof displayName !== 'string' || !displayName.trim())) {
		return json(400, { error: 'displayName must be a non-empty string' });
	}
	if (role !== undefined && role !== 'member' && role !== 'admin') {
		return json(400, { error: 'role must be member or admin' });
	}
	if (role === 'member' && user.id === req.user!.id) {
		return json(400, { error: 'you cannot remove your own admin rights' });
	}
	const updated = await users.update(user.id, {
		...(typeof displayName === 'string' && { displayName: displayName.trim() }),
		...(role !== undefined && { role })
	});
	return json(200, summary(updated));
});
