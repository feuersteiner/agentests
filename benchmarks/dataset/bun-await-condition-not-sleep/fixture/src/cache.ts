import { EventEmitter } from 'node:events';

export interface CacheOptions<Value> {
	/** How long an entry stays fresh, in milliseconds. */
	ttlMs: number;
	/** Loads the value for a key. */
	load: (key: string) => Promise<Value>;
	/** The current time in milliseconds. Defaults to `Date.now`. */
	now?: () => number;
}

interface Entry<Value> {
	value: Value;
	loadedAt: number;
	refreshing: boolean;
}

/**
 * A cache that never makes a caller wait for a refresh. The first `get` of a key loads it. Once an
 * entry is older than `ttlMs`, `get` still returns the stored value and starts one refresh in the
 * background. Emits `refresh` with the key when a background refresh has stored its value, and
 * `error` with the thrown value when one fails; the stale value is then kept.
 */
export class RefreshingCache<Value> extends EventEmitter {
	readonly #entries = new Map<string, Entry<Value>>();
	readonly #ttlMs: number;
	readonly #load: (key: string) => Promise<Value>;
	readonly #now: () => number;

	constructor(options: CacheOptions<Value>) {
		super();
		this.#ttlMs = options.ttlMs;
		this.#load = options.load;
		this.#now = options.now ?? Date.now;
	}

	/** The value for `key`: loaded on first use, served from the cache afterwards. */
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
			this.emit('refresh', key);
		} catch (error) {
			this.emit('error', error);
		} finally {
			entry.refreshing = false;
		}
	}
}
