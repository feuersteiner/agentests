// The Redis client the API uses. In production the platform's start script points it at the
// shared Redis with useRedis(); until then, and in the tests, a MemoryRedis inside the process
// stands in for it.

export interface RedisClient {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, mode: 'EX', seconds: number): Promise<unknown>;
	del(...keys: string[]): Promise<number>;
	expire(key: string, seconds: number): Promise<number>;
	sadd(key: string, member: string): Promise<number>;
	srem(key: string, member: string): Promise<number>;
	smembers(key: string): Promise<string[]>;
}

/** A stand-in for Redis that keeps strings and sets in Maps and honours expiry. */
export class MemoryRedis implements RedisClient {
	private readonly values = new Map<string, { value: string | Set<string>; expiresAt: number }>();

	constructor(private readonly now: () => number = Date.now) {}

	private read(key: string) {
		const entry = this.values.get(key);
		if (entry && this.now() >= entry.expiresAt) {
			this.values.delete(key);
			return undefined;
		}
		return entry;
	}

	async get(key: string): Promise<string | null> {
		const value = this.read(key)?.value;
		return typeof value === 'string' ? value : null;
	}

	async set(key: string, value: string, _mode: 'EX', seconds: number): Promise<'OK'> {
		this.values.set(key, { value, expiresAt: this.now() + seconds * 1000 });
		return 'OK';
	}

	async del(...keys: string[]): Promise<number> {
		return keys.filter((key) => this.read(key) && this.values.delete(key)).length;
	}

	async expire(key: string, seconds: number): Promise<number> {
		const entry = this.read(key);
		if (!entry) return 0;
		entry.expiresAt = this.now() + seconds * 1000;
		return 1;
	}

	async sadd(key: string, member: string): Promise<number> {
		let entry = this.read(key);
		if (!entry) {
			entry = { value: new Set(), expiresAt: Infinity };
			this.values.set(key, entry);
		}
		const set = entry.value as Set<string>;
		if (set.has(member)) return 0;
		set.add(member);
		return 1;
	}

	async srem(key: string, member: string): Promise<number> {
		const set = this.read(key)?.value;
		return set instanceof Set && set.delete(member) ? 1 : 0;
	}

	async smembers(key: string): Promise<string[]> {
		const set = this.read(key)?.value;
		return set instanceof Set ? [...set] : [];
	}
}

let client: RedisClient = new MemoryRedis();

/** Points the API at another client: the shared Redis in production, a fresh MemoryRedis in a test. */
export function useRedis(next: RedisClient): void {
	client = next;
}

export const redis = (): RedisClient => client;
