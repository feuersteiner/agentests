type Upstream = (url: URL, init?: RequestInit) => Response | Promise<Response>;

/**
 * Replaces the global fetch with fake services, keyed by origin such as
 * "http://pricing.internal:8080". Records every URL fetched; call restore() after the test.
 */
export function fakeUpstreams(upstreams: Record<string, Upstream>) {
	const original = globalThis.fetch;
	const calls: URL[] = [];
	globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(input instanceof Request ? input.url : String(input));
		calls.push(url);
		const upstream = upstreams[url.origin];
		if (!upstream) throw new Error(`Cannot reach ${url.origin}: the test set up no fake for it`);
		return upstream(url, init);
	}) as typeof fetch;
	return {
		calls,
		restore() {
			globalThis.fetch = original;
		}
	};
}
