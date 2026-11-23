import { EventEmitter } from 'node:events';

export type Job = () => void | Promise<void>;

/**
 * Runs jobs one at a time, in the order they were enqueued. Emits `drain` each time the last
 * waiting job has finished, and `error` with the thrown value when a job fails; a failed job does
 * not stop the ones behind it.
 */
export class JobQueue extends EventEmitter {
	readonly #waiting: Job[] = [];
	#running = false;

	/** Add a job. It starts once every job before it has finished. */
	enqueue(job: Job): void {
		this.#waiting.push(job);
		if (!this.#running) void this.#run();
	}

	async #run(): Promise<void> {
		this.#running = true;
		for (let job = this.#waiting.shift(); job; job = this.#waiting.shift()) {
			try {
				await job();
			} catch (error) {
				this.emit('error', error);
			}
		}
		this.#running = false;
		this.emit('drain');
	}
}
