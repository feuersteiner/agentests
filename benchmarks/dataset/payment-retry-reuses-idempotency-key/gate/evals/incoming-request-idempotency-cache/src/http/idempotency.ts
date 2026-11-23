// Answers a repeated POST from the checkout with the response it got the first time. The checkout
// sends an Idempotency-Key header with every POST; entries expire after a day.

const DAY_MS = 24 * 60 * 60 * 1000;

interface Entry {
	status: number;
	body: string;
	storedAt: number;
}

export class IdempotencyCache {
	private readonly entries = new Map<string, Entry>();

	constructor(private readonly now: () => number = Date.now) {}

	async handle(request: Request, next: (request: Request) => Promise<Response>): Promise<Response> {
		const key = request.headers.get('Idempotency-Key');
		if (request.method !== 'POST' || !key) return next(request);
		const earlier = this.entries.get(key);
		if (earlier) return new Response(earlier.body, { status: earlier.status });
		const response = await next(request);
		if (response.status < 500) {
			const body = await response.clone().text();
			this.entries.set(key, { status: response.status, body, storedAt: this.now() });
		}
		return response;
	}

	/** Deletes the entries older than a day; the server calls it every hour. */
	prune(): number {
		let removed = 0;
		for (const [key, entry] of this.entries) {
			if (this.now() - entry.storedAt > DAY_MS) {
				this.entries.delete(key);
				removed += 1;
			}
		}
		return removed;
	}
}
