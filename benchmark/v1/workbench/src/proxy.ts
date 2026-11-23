import { appendFileSync } from 'node:fs';
import { gates } from './types.ts';
import type { GateArm } from './types.ts';

/** One forwarded request, as the run's `proxy.jsonl` records it. */
export interface ProxyRecord {
	token: string;
	at: string;
	/** The upstream path, such as `/decisions`. */
	path: string;
	status: number;
	ms: number;
	inputTokens: number;
	outputTokens: number;
	/** The response's whole `usage` object, cache details included, or null when it had none. */
	usage: unknown;
	/** How many of the response's answers are refusals; the package then fails the hook or eval with exit code 2. */
	refusals: number;
	error?: string;
}

/** A run the proxy forwards for: its gate arm, its log file and its records so far. */
interface Route {
	arm: GateArm;
	logPath: string;
	records: ProxyRecord[];
}

/** The local proxy every gate workspace's `decision.url` points at. */
export interface DecisionProxy {
	/** `http://localhost:<port>`; a run's base URL is `${url}/${token}/v1`. */
	url: string;
	/** Forward requests under `token` to the arm's upstream, logging each to `logPath`. */
	open: (token: string, arm: GateArm, logPath: string) => void;
	/** Stop forwarding for `token` and return its records. */
	close: (token: string) => ProxyRecord[];
	stop: () => Promise<void>;
}

/** Request headers never forwarded: the credential is replaced and the transport ones are the client's own. */
const droppedRequestHeaders = [
	'authorization',
	'host',
	'connection',
	'content-length',
	'accept-encoding'
];

/** Response headers never returned: the body is returned decoded, with its own length. */
const droppedResponseHeaders = [
	'content-encoding',
	'content-length',
	'transfer-encoding',
	'connection'
];

const isFields = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The `usage` object of a JSON response body; both providers report `input_tokens` and `output_tokens` there. */
const readUsage = (body: string): { usage: unknown; inputTokens: number; outputTokens: number } => {
	try {
		const parsed: unknown = JSON.parse(body);
		const usage = isFields(parsed) && isFields(parsed.usage) ? parsed.usage : null;
		const count = (value: unknown): number => (typeof value === 'number' ? value : 0);
		return {
			usage,
			inputTokens: count(usage?.input_tokens),
			outputTokens: count(usage?.output_tokens)
		};
	} catch {
		return { usage: null, inputTokens: 0, outputTokens: 0 };
	}
};

/**
 * How many answers of a JSON response body are refusals. OpenAI's `answers` is a list in which a refused
 * question is `{ type: 'refusal', name }`; Jev's is a mapping by question, whose SDK knows no refusal type, so a
 * `{ type: 'refusal' }` value there is counted too, though the SDK would reject it as invalid.
 */
const countRefusals = (body: string): number => {
	try {
		const parsed: unknown = JSON.parse(body);
		const answers = isFields(parsed) ? parsed.answers : undefined;
		const list = Array.isArray(answers) ? answers : isFields(answers) ? Object.values(answers) : [];
		return list.filter((answer) => isFields(answer) && answer.type === 'refusal').length;
	} catch {
		return 0;
	}
};

const toErrorResponse = (status: number, message: string): Response =>
	Response.json({ error: { message: `Benchmark proxy: ${message}` } }, { status });

/**
 * Start the proxy on localhost. It forwards only `POST /<token>/v1<path>` for an open token and its gate's
 * decision path, to `upstreams[arm]`, with the placeholder credential replaced by `keys[arm]`.
 */
export const startProxy = (
	upstreams: Record<GateArm, string>,
	keys: Partial<Record<GateArm, string>>
): DecisionProxy => {
	const routes = new Map<string, Route>();

	const record = (route: Route, entry: ProxyRecord): void => {
		route.records.push(entry);
		appendFileSync(route.logPath, `${JSON.stringify(entry)}\n`);
	};

	const forward = async (request: Request, token: string, route: Route, path: string) => {
		const started = performance.now();
		const headers = new Headers(request.headers);
		for (const name of droppedRequestHeaders) headers.delete(name);
		headers.set('authorization', `Bearer ${keys[route.arm] ?? ''}`);
		let status = 502;
		let body: string;
		let error: string | undefined;
		let responseHeaders = new Headers({ 'content-type': 'application/json' });
		try {
			const response = await fetch(`${upstreams[route.arm].replace(/\/$/, '')}${path}`, {
				method: 'POST',
				headers,
				body: await request.arrayBuffer()
			});
			status = response.status;
			body = await response.text();
			responseHeaders = new Headers(response.headers);
			for (const name of droppedResponseHeaders) responseHeaders.delete(name);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : String(cause);
			body = JSON.stringify({
				error: { message: `Benchmark proxy: upstream unreachable: ${error}` }
			});
		}
		record(route, {
			token,
			at: new Date().toISOString(),
			path,
			status,
			ms: Math.round(performance.now() - started),
			...readUsage(body),
			refusals: countRefusals(body),
			...(error === undefined ? {} : { error })
		});
		return new Response(body, { status, headers: responseHeaders });
	};

	const server = Bun.serve({
		hostname: 'localhost',
		port: 0,
		idleTimeout: 255,
		fetch: async (request) => {
			const match = /^\/([0-9a-f]+)\/v1(\/.*)$/.exec(new URL(request.url).pathname);
			const route = match ? routes.get(match[1]!) : undefined;
			if (!match || !route) return toErrorResponse(404, 'no open benchmark run for this URL');
			const path = match[2]!;
			if (request.method !== 'POST' || path !== gates[route.arm].path)
				return toErrorResponse(403, `only POST ${gates[route.arm].path} is forwarded`);
			return forward(request, match[1]!, route, path);
		}
	});

	return {
		url: `http://localhost:${server.port}`,
		open: (token, arm, logPath) => {
			routes.set(token, { arm, logPath, records: [] });
		},
		close: (token) => {
			const records = routes.get(token)?.records ?? [];
			routes.delete(token);
			return records;
		},
		stop: () => server.stop(true)
	};
};
