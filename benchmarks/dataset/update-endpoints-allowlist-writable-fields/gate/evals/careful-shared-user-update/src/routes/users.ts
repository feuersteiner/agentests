import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';
import type { Role } from '../models.ts';

const ROLES: Role[] = ['member', 'admin'];

/** GET /users: the people in the signed-in user's organisation. */
export async function listUsers(req: ApiRequest): Promise<ApiResponse> {
	const users = await db.user.findMany({ where: { orgId: req.user.orgId }, orderBy: { id: 'asc' } });
	return json(200, users);
}

const MEMBER_FIELDS = ['displayName', 'bio'] as const;
const ADMIN_FIELDS = [...MEMBER_FIELDS, 'role'] as const;

/** PATCH /users/:id: anyone edits their own name and bio; an admin edits anyone in the organisation, role included. */
export async function updateUser(req: ApiRequest): Promise<ApiResponse> {
	const isAdmin = req.user.role === 'admin';
	if (!isAdmin && req.params.id !== req.user.id) return json(403, { error: 'you can only edit yourself' });
	const user = await db.user.findUnique({ where: { id: req.params.id } });
	if (!user || user.orgId !== req.user.orgId) return json(404, { error: 'user not found' });

	const fields = isAdmin ? ADMIN_FIELDS : MEMBER_FIELDS;
	const data: Partial<Record<(typeof ADMIN_FIELDS)[number], string>> = {};
	for (const field of fields) {
		if (req.body[field] !== undefined) data[field] = req.body[field];
	}
	const { displayName, bio, role } = data;
	if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim() === '')) {
		return json(400, { error: 'displayName must be a non-empty string' });
	}
	if (bio !== undefined && typeof bio !== 'string') return json(400, { error: 'bio must be a string' });
	if (role !== undefined && !ROLES.includes(role as Role)) {
		return json(400, { error: `role must be one of ${ROLES.join(', ')}` });
	}

	const updated = await db.user.update({ where: { id: user.id }, data });
	return json(200, updated);
}
