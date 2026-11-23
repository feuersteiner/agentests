/** Calls fn until it resolves to a response below 500, waiting longer after each failure. */
export async function withRetry(
	fn: () => Promise<Response>,
	attempts: number,
	backoffMs: number
): Promise<Response> {
	let res = await fn();
	for (let attempt = 1; attempt < attempts && res.status >= 500; attempt++) {
		await Bun.sleep(backoffMs * attempt);
		res = await fn();
	}
	return res;
}
