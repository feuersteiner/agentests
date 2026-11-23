import { EventEmitter } from 'node:events';
import { statSync } from 'node:fs';

export interface WatcherOptions {
	/** How often the watched files are checked, in milliseconds. */
	interval?: number;
}

export interface ChangeEvent {
	path: string;
}

/** What a file looked like at the last check, or undefined when it did not exist. */
const stamp = (path: string): string | undefined => {
	try {
		const stats = statSync(path);
		return `${stats.mtimeMs}:${stats.size}`;
	} catch {
		return undefined;
	}
};

/**
 * Watches files by polling. Emits `change` with `{ path }` each time a watched file's modification
 * time or size differs from the last check. A file's state is recorded as soon as `watch` returns,
 * so a write made right after it is reported.
 */
export class FileWatcher extends EventEmitter {
	readonly #stamps = new Map<string, string | undefined>();
	readonly #interval: number;
	#timer: ReturnType<typeof setInterval> | undefined;

	constructor(options: WatcherOptions = {}) {
		super();
		this.#interval = options.interval ?? 20;
	}

	/** Start watching `path`. */
	watch(path: string): void {
		this.#stamps.set(path, stamp(path));
		this.#timer ??= setInterval(() => this.#check(), this.#interval);
	}

	/** Stop watching `path`. */
	unwatch(path: string): void {
		this.#stamps.delete(path);
	}

	/** Stop watching everything and release the timer. */
	close(): void {
		clearInterval(this.#timer);
		this.#timer = undefined;
		this.#stamps.clear();
	}

	#check(): void {
		for (const [path, previous] of this.#stamps) {
			const current = stamp(path);
			if (current === previous) continue;
			this.#stamps.set(path, current);
			this.emit('change', { path } satisfies ChangeEvent);
		}
	}
}
