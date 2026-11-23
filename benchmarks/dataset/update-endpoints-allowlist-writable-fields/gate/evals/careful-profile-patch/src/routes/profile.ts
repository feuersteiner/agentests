import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';

/** GET /profile: the signed-in user's own account. */
export function getProfile(req: ApiRequest): ApiResponse {
	return json(200, req.user);
}

/** PATCH /profile: the signed-in user changes their own display name or bio. */
export async function updateProfile(req: ApiRequest): Promise<ApiResponse> {
	const { displayName, bio } = req.body;
	if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim() === '')) {
		return json(400, { error: 'displayName must be a non-empty string' });
	}
	if (bio !== undefined && typeof bio !== 'string') return json(400, { error: 'bio must be a string' });

	const updated = await db.user.update({
		where: { id: req.user.id },
		data: { displayName: displayName?.trim(), bio }
	});
	return json(200, updated);
}
