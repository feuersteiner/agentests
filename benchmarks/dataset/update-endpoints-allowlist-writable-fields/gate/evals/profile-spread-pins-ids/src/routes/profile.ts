import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';

/** GET /profile: the signed-in user's own account. */
export function getProfile(req: ApiRequest): ApiResponse {
	return json(200, req.user);
}

/** PATCH /profile: the signed-in user updates their profile; they cannot move account or organisation. */
export async function updateProfile(req: ApiRequest): Promise<ApiResponse> {
	const updated = await db.user.update({
		where: { id: req.user.id },
		data: { ...req.body, id: req.user.id, orgId: req.user.orgId }
	});
	return json(200, updated);
}
