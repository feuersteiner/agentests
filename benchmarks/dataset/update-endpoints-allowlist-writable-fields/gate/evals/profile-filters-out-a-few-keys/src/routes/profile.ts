import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';

/** GET /profile: the signed-in user's own account. */
export function getProfile(req: ApiRequest): ApiResponse {
	return json(200, req.user);
}

const READ_ONLY = ['id', 'orgId', 'role', 'createdAt'];

/** PATCH /profile: the signed-in user updates their profile. */
export async function updateProfile(req: ApiRequest): Promise<ApiResponse> {
	const data = Object.fromEntries(Object.entries(req.body).filter(([field]) => !READ_ONLY.includes(field)));
	if (typeof data.displayName === 'string' && data.displayName.trim() === '') {
		return json(400, { error: 'displayName cannot be blank' });
	}
	const updated = await db.user.update({ where: { id: req.user.id }, data });
	return json(200, updated);
}
