import { apiKeys } from '../auth/apiKeys.ts';
import { requireUser } from '../auth/middleware.ts';
import { sessions, toAuthUser } from '../auth/sessions.ts';
import { json, Router } from '../http.ts';
import { users } from '../users/repo.ts';

export const accountRoutes = new Router();

/** GET /account: the signed-in user's profile. */
accountRoutes.get('/account', requireUser, async (req) => {
	const user = await users.get(req.user!.id);
	if (!user) return json(404, { error: 'account not found' });
	return json(200, { ...toAuthUser(user), createdAt: user.createdAt.toISOString() });
});

/** PATCH /account: changes the signed-in user's display name. */
accountRoutes.patch('/account', requireUser, async (req) => {
	const { displayName } = req.body;
	if (typeof displayName !== 'string' || displayName === '') {
		return json(400, { error: 'displayName must be a non-empty string' });
	}
	const user = await users.update(req.user!.id, { displayName });
	return json(200, toAuthUser(user));
});

/** GET /account/api-keys: the signed-in user's live API keys, without their secrets. */
accountRoutes.get('/account/api-keys', requireUser, async (req) => {
	const keys = await apiKeys.listForUser(req.user!.id);
	return json(
		200,
		keys.map(({ id, label, createdAt, lastUsedAt }) => ({ id, label, createdAt, lastUsedAt }))
	);
});

/** POST /account/api-keys: creates an API key; the answer is the only time its secret is shown. */
accountRoutes.post('/account/api-keys', requireUser, async (req) => {
	const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
	if (!label) return json(400, { error: 'label is required' });
	const { key, record } = await apiKeys.create(req.user!.id, label);
	return json(201, { id: record.id, label: record.label, key });
});

/** DELETE /account/api-keys/:id: revokes one of the signed-in user's API keys. */
accountRoutes.delete('/account/api-keys/:id', requireUser, async (req) => {
	const key = await apiKeys.get(req.params.id!);
	if (!key || key.userId !== req.user!.id || key.revokedAt) return json(404, { error: 'API key not found' });
	await apiKeys.revoke(key.id);
	return json(204);
});

/** Deletes the user, after ending everything that signs them in. */
async function closeAccount(userId: string): Promise<void> {
	await sessions.revokeAllForUser(userId);
	await apiKeys.revokeAllForUser(userId);
	await users.delete(userId);
}

/** DELETE /account: deletes the signed-in user's account. */
accountRoutes.delete('/account', requireUser, async (req) => {
	await closeAccount(req.user!.id);
	return json(204);
});
