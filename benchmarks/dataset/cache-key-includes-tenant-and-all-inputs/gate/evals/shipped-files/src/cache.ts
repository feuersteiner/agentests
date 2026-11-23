// Redis helpers for the API. At startup the server passes the shared Redis client to useRedis();
// until then, and in the tests, values live in a MemoryRedis inside the process.

export interface RedisClient {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, mode: 'EX', seconds: number): Promise<unknown>;
	del(key: string): Promise<number>;
}

/** A stand-in for Redis that keeps values in a Map and honours EX expiry. */
export class MemoryRedis implements RedisClient {
	private readonly values = new Map<string, { value: string; expiresAt: number }>();

	constructor(private readonly now: () => number = Date.now) {}

	async get(key: string): Promise<string | null> {
		const entry = this.values.get(key);
		if (!entry) return null;
		if (this.now() >= entry.expiresAt) {
			this.values.delete(key);
			return null;
		}
		return entry.value;
	}

	async set(key: string, value: string, _mode: 'EX', seconds: number): Promise<'OK'> {
		this.values.set(key, { value, expiresAt: this.now() + seconds * 1000 });
		return 'OK';
	}

	async del(key: string): Promise<number> {
		return this.values.delete(key) ? 1 : 0;
	}
}

let client: RedisClient = new MemoryRedis();

/** Points the helpers at another client: the shared one in production, a fresh MemoryRedis in a test. */
export function useRedis(next: RedisClient): void {
	client = next;
}

/** The JSON value stored under key, or null when there is none or it has expired. */
export async function getJson<T>(key: string): Promise<T | null> {
	const raw = await client.get(key);
	return raw === null ? null : (JSON.parse(raw) as T);
}

/** Stores value as JSON under key for ttlSeconds. */
export async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
	await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

/** Removes the value stored under key, if any. */
export async function deleteKey(key: string): Promise<void> {
	await client.del(key);
}
