import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { loadFeatures } from './features/loader.ts';
import { log } from './log.ts';
import { scoreRequest } from './scorer.ts';

function featuresFile(): string {
	if (process.env.FEATURES_FILE) return process.env.FEATURES_FILE;
	if (process.env.FEATURES_PATH) {
		log.warn('FEATURES_PATH is deprecated, set FEATURES_FILE instead');
		return process.env.FEATURES_PATH;
	}
	return 'data/features.json';
}

const PORT = Number(process.env.PORT ?? 8080);

/** The scoring API the edge proxy calls for each request it forwards. */
export function createScoringServer(path: string): Server {
	let features = loadFeatures(path);
	log.info('features loaded', { path, count: features.length });

	return createServer(async (req, res) => {
		if (req.url === '/healthz' && req.method === 'GET') {
			return send(res, 200, { status: 'ok' });
		}
		if (req.url === '/score' && req.method === 'POST') {
			const headers = parseHeaders(await readBody(req));
			if (!headers) return send(res, 400, { error: 'expected a JSON body with a headers object' });
			return send(res, 200, scoreRequest(headers, features));
		}
		if (req.url === '/admin/reload-features' && req.method === 'POST') {
			// loadFeatures answers a file it cannot use with no features: keep the ones in use then.
			const next = loadFeatures(path);
			if (next.length === 0) {
				log.warn('features reload gave no features, keeping the features in use', { path, count: features.length });
				return send(res, 422, { reloaded: false, count: features.length });
			}
			features = next;
			log.info('features reloaded', { path, count: features.length });
			return send(res, 200, { reloaded: true, count: features.length });
		}
		send(res, 404, { error: 'not found' });
	});
}

/** The forwarded request's headers from a body such as {"headers":{"user-agent":"..."}}, names lower-cased. */
function parseHeaders(body: string): Record<string, string> | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		return undefined;
	}
	const headers = (parsed as { headers?: unknown } | null)?.headers;
	if (typeof headers !== 'object' || headers === null) return undefined;
	const result: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		if (typeof value === 'string') result[name.toLowerCase()] = value;
	}
	return result;
}

async function readBody(req: IncomingMessage): Promise<string> {
	let body = '';
	for await (const chunk of req) body += chunk;
	return body;
}

function send(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

if (import.meta.main) {
	createScoringServer(featuresFile()).listen(PORT, () => log.info('listening', { port: PORT }));
}
