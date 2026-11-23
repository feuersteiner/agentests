import { REQUEST_TIMEOUT_MS } from '../config.ts';

/** A request as the route handlers see it. */
export interface DeadlineRequest {
	url: URL;
	/** Epoch milliseconds at which the API stops waiting and answers 504. */
	deadline: number;
}

/** Milliseconds left before the deadline, never below zero. */
export function remainingMs(deadline: number): number {
	return Math.max(0, deadline - Date.now());
}

/**
 * Wraps a route handler: gives each request its deadline, REQUEST_TIMEOUT_MS from now, and
 * answers 504 if the handler has not answered by then.
 */
export function withDeadline(handler: (req: DeadlineRequest) => Promise<Response>) {
	return async (request: Request): Promise<Response> => {
		const deadline = Date.now() + REQUEST_TIMEOUT_MS;
		const req: DeadlineRequest = { url: new URL(request.url), deadline };
		let timer: ReturnType<typeof setTimeout> | undefined;
		const expired = new Promise<Response>((resolve) => {
			timer = setTimeout(
				() => resolve(Response.json({ error: 'deadline exceeded' }, { status: 504 })),
				REQUEST_TIMEOUT_MS
			);
		});
		try {
			return await Promise.race([handler(req), expired]);
		} finally {
			clearTimeout(timer);
		}
	};
}
