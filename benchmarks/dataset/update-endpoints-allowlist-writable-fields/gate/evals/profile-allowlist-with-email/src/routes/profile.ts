import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';

/** GET /profile: the signed-in user's own account. */
export function getProfile(req: ApiRequest): ApiResponse {
	return json(200, req.user);
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** PATCH /profile: the signed-in user changes their display name, bio or email address. */
export async function updateProfile(req: ApiRequest): Promise<ApiResponse> {
	const { displayName, bio, email } = req.body;
	if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim() === '')) {
		return json(400, { error: 'displayName must be a non-empty string' });
	}
	if (bio !== undefined && typeof bio !== 'string') return json(400, { error: 'bio must be a string' });
	if (email !== undefined && (typeof email !== 'string' || !EMAIL.test(email))) {
		return json(400, { error: 'email must be an email address' });
	}

	const updated = await db.user.update({
		where: { id: req.user.id },
		data: { displayName: displayName?.trim(), bio, email: email?.toLowerCase() }
	});
	return json(200, updated);
}
