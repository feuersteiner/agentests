/** FIFO logical-call semaphore. Acquiring does not create or replay provider requests. */
export class Semaphore {
	private active = 0;
	private readonly waiting: (() => void)[] = [];
	constructor(readonly limit: number) {
		if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid scheduling limit');
	}
	public readonly run = async <T>(fn: () => Promise<T>): Promise<T> => {
		if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiting.push(resolve));
		else this.active++;
		try {
			return await fn();
		} finally {
			const next = this.waiting.shift();
			if (next) next();
			else this.active--;
		}
	};
}
