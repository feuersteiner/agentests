export interface CacheOptions {
	ttlMs?: number;
	maxEntries?: number;
	clock?: () => number;
}

export interface Cache<T> {
	get(key: string, load: () => Promise<T>): Promise<T>;
	clear(): void;
}

export class TtlCache<T> implements Cache<T> {
	private readonly entries = new Map<string, { value: T; at: number }>();
	private readonly ttlMs: number;
	private readonly maxEntries: number;
	private readonly clock: () => number;

	constructor(options: CacheOptions = {}) {
		this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
		this.maxEntries = options.maxEntries ?? 100;
		this.clock = options.clock ?? Date.now;
	}

	async get(key: string, load: () => Promise<T>): Promise<T> {
		const hit = this.entries.get(key);
		if (hit && this.clock() - hit.at < this.ttlMs) return hit.value;
		const value = await load();
		if (this.entries.size >= this.maxEntries) this.entries.clear();
		this.entries.set(key, { value, at: this.clock() });
		return value;
	}

	clear(): void {
		this.entries.clear();
	}
}

export function createCache<T>(options?: CacheOptions): Cache<T> {
	return new TtlCache<T>(options);
}
