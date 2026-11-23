import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';
import { fingerprint, parsePublicKey } from '../keys/parse.ts';

const MAX_TITLE_LENGTH = 100;

/** GET /keys: the signed-in user's SSH keys. */
export async function listKeys(req: ApiRequest): Promise<ApiResponse> {
	const keys = await db.publicKey.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' } });
	return json(200, keys);
}

/** POST /keys: adds an SSH key to the signed-in user's account. */
export async function createKey(req: ApiRequest): Promise<ApiResponse> {
	const { title, key } = req.body;
	if (typeof title !== 'string' || title.trim() === '' || title.length > MAX_TITLE_LENGTH) {
		return json(400, { error: `title must be 1 to ${MAX_TITLE_LENGTH} characters` });
	}
	const parsed = typeof key === 'string' ? parsePublicKey(key) : null;
	if (!parsed) return json(400, { error: 'key must be an OpenSSH public key' });

	const print = fingerprint(parsed.data);
	const inUse = await db.publicKey.findMany({ where: { fingerprint: print } });
	if (inUse.length > 0) return json(409, { error: 'this key is already in use' });

	const created = await db.publicKey.create({
		data: {
			userId: req.user.id,
			title: title.trim(),
			key: `${parsed.type} ${parsed.data}`,
			fingerprint: print
		}
	});
	return json(201, created);
}

/** DELETE /keys/:id: removes one of the signed-in user's keys. */
export async function deleteKey(req: ApiRequest): Promise<ApiResponse> {
	const existing = await db.publicKey.findUnique({ where: { id: req.params.id } });
	if (!existing || existing.userId !== req.user.id) return json(404, { error: 'key not found' });
	await db.publicKey.delete({ where: { id: existing.id } });
	return json(204);
}
