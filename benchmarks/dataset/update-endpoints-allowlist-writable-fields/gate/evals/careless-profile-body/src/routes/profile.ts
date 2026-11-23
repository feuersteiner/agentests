import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';

/** GET /profile: the signed-in user's own account. */
export function getProfile(req: ApiRequest): ApiResponse {
	return json(200, req.user);
}

/** PATCH /profile: the signed-in user updates their profile. */
export async function updateProfile(req: ApiRequest): Promise<ApiResponse> {
	if (req.body.displayName !== undefined && typeof req.body.displayName !== 'string') {
		return json(400, { error: 'displayName must be a string' });
	}
	if (req.body.bio !== undefined && typeof req.body.bio !== 'string') {
		return json(400, { error: 'bio must be a string' });
	}
	const updated = await db.user.update({ where: { id: req.user.id }, data: req.body });
	return json(200, updated);
}
