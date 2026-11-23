import { createHash, randomBytes, randomUUID } from 'node:crypto';

// API keys, for scripts and integrations. Production keeps them in the Postgres table api_keys;
// this in-memory version behaves the same way and backs the tests and local runs. A key is shown
// once, when it is created, and the table keeps only its SHA-256 hash. A revoked key keeps its
// row, with revokedAt set, for the audit log.

export interface ApiKey {
	id: string;
	userId: string;
	label: string;
	hash: string;
	createdAt: Date;
	lastUsedAt: Date | null;
	revokedAt: Date | null;
}

const rows = new Map<string, ApiKey>();

const hashOf = (key: string) => createHash('sha256').update(key).digest('hex');

export const apiKeys = {
	/** Creates a key for the user; `key` is the secret, which is never stored. */
	async create(userId: string, label: string): Promise<{ key: string; record: ApiKey }> {
		const key = `lw_${randomBytes(24).toString('base64url')}`;
		const record: ApiKey = {
			id: `key_${randomUUID()}`,
			userId,
			label,
			hash: hashOf(key),
			createdAt: new Date(),
			lastUsedAt: null,
			revokedAt: null
		};
		rows.set(record.id, record);
		return { key, record: { ...record } };
	},

	/** The live key that matches the secret, or null; records when it was last used. */
	async verify(key: string): Promise<ApiKey | null> {
		const hash = hashOf(key);
		const record = [...rows.values()].find((row) => row.hash === hash && row.revokedAt === null);
		if (!record) return null;
		record.lastUsedAt = new Date();
		return { ...record };
	},

	async get(id: string): Promise<ApiKey | null> {
		const record = rows.get(id);
		return record ? { ...record } : null;
	},

	/** The user's live keys, oldest first. */
	async listForUser(userId: string): Promise<ApiKey[]> {
		return [...rows.values()]
			.filter((row) => row.userId === userId && row.revokedAt === null)
			.map((row) => ({ ...row }));
	},

	async revoke(id: string): Promise<void> {
		const record = rows.get(id);
		if (record && record.revokedAt === null) record.revokedAt = new Date();
	},

	/** Revokes every live key of the user and returns how many there were. */
	async revokeAllForUser(userId: string): Promise<number> {
		const live = [...rows.values()].filter((row) => row.userId === userId && row.revokedAt === null);
		for (const row of live) row.revokedAt = new Date();
		return live.length;
	},

	/** Empties the table; for tests. */
	reset(): void {
		rows.clear();
	}
};
