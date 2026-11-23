export type Handler = (request: Request) => Response | Promise<Response>;

export interface ServerOptions {
	/** The port to listen on. 0, the default, picks a free one. */
	port?: number;
}

export interface RelayServer {
	/** The server's base URL, such as `http://localhost:41873/`. */
	readonly url: string;
	/** How many requests are being handled right now. */
	readonly inFlight: number;
	/**
	 * Stop the server. Requests that arrive from now on get a 503. The promise resolves once every
	 * request that was already being handled has been answered.
	 */
	stop(): Promise<void>;
}

/** Start an HTTP server on localhost that answers every request with `handler`. */
export const createServer = (handler: Handler, options: ServerOptions = {}): RelayServer => {
	let inFlight = 0;
	let stopping = false;
	let idle: (() => void) | undefined;

	const server = Bun.serve({
		port: options.port ?? 0,
		hostname: 'localhost',
		async fetch(request) {
			if (stopping) return new Response('Server is stopping', { status: 503 });
			inFlight += 1;
			try {
				return await handler(request);
			} finally {
				inFlight -= 1;
				if (inFlight === 0) idle?.();
			}
		}
	});

	return {
		url: server.url.href,
		get inFlight() {
			return inFlight;
		},
		async stop() {
			stopping = true;
			if (inFlight > 0) await new Promise<void>((resolve) => (idle = resolve));
			await server.stop();
		}
	};
};
