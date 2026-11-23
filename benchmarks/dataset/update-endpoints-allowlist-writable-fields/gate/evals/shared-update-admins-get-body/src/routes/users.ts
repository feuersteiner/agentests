import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';
import type { Role } from '../models.ts';

const ROLES: Role[] = ['member', 'admin'];

/** GET /users: the people in the signed-in user's organisation. */
export async function listUsers(req: ApiRequest): Promise<ApiResponse> {
	const users = await db.user.findMany({ where: { orgId: req.user.orgId }, orderBy: { id: 'asc' } });
	return json(200, users);
}

/** PATCH /users/:id: anyone edits their own name and bio; admins can edit anything about anyone in the organisation. */
export async function updateUser(req: ApiRequest): Promise<ApiResponse> {
	const isAdmin = req.user.role === 'admin';
	if (!isAdmin && req.params.id !== req.user.id) return json(403, { error: 'you can only edit yourself' });
	const user = await db.user.findUnique({ where: { id: req.params.id } });
	if (!user || user.orgId !== req.user.orgId) return json(404, { error: 'user not found' });

	if (req.body.role !== undefined && !ROLES.includes(req.body.role)) {
		return json(400, { error: `role must be one of ${ROLES.join(', ')}` });
	}
	const { displayName, bio } = req.body;
	const data = isAdmin ? req.body : { displayName, bio };

	const updated = await db.user.update({ where: { id: user.id }, data });
	return json(200, updated);
}
