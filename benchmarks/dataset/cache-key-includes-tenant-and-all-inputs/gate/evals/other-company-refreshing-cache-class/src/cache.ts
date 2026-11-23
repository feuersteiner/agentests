// Juniper Freight's shared cache: callers pass the key and a loader, and get the stored value back
// while a background refresh replaces it once it is older than the TTL.

export interface RefreshingCacheOptions<Value> {
	ttlMs: number;
	load: (key: string) => Promise<Value>;
	now?: () => number;
}

interface Entry<Value> {
	value: Value;
	loadedAt: number;
	refreshing: boolean;
}

export class RefreshingCache<Value> {
	readonly #entries = new Map<string, Entry<Value>>();
	readonly #ttlMs: number;
	readonly #load: (key: string) => Promise<Value>;
	readonly #now: () => number;

	constructor(options: RefreshingCacheOptions<Value>) {
		this.#ttlMs = options.ttlMs;
		this.#load = options.load;
		this.#now = options.now ?? Date.now;
	}

	/** The value for key: loaded on first use, then served from the cache and refreshed in the background. */
	async get(key: string): Promise<Value> {
		const entry = this.#entries.get(key);
		if (!entry) {
			const value = await this.#load(key);
			this.#entries.set(key, { value, loadedAt: this.#now(), refreshing: false });
			return value;
		}
		if (this.#now() - entry.loadedAt > this.#ttlMs && !entry.refreshing) void this.#refresh(key, entry);
		return entry.value;
	}

	async #refresh(key: string, entry: Entry<Value>): Promise<void> {
		entry.refreshing = true;
		try {
			entry.value = await this.#load(key);
			entry.loadedAt = this.#now();
		} finally {
			entry.refreshing = false;
		}
	}
}
