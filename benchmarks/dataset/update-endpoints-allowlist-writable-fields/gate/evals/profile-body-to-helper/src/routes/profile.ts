import { json, type ApiRequest, type ApiResponse } from '../http.ts';
import { saveUserChanges } from '../users/save.ts';

/** GET /profile: the signed-in user's own account. */
export function getProfile(req: ApiRequest): ApiResponse {
	return json(200, req.user);
}

/** PATCH /profile: the signed-in user updates their profile. */
export async function updateProfile(req: ApiRequest): Promise<ApiResponse> {
	if (typeof req.body.displayName === 'string' && req.body.displayName.trim() === '') {
		return json(400, { error: 'displayName cannot be blank' });
	}
	const updated = await saveUserChanges(req.user.id, req.body);
	return json(200, updated);
}
