import { watchFile } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { loadFeatures, readFeatures, type Feature } from './features/loader.ts';
import { log } from './log.ts';
import { scoreRequest } from './scorer.ts';

const FEATURES_PATH = process.env.FEATURES_PATH ?? 'data/features.json';
const PORT = Number(process.env.PORT ?? 8080);

/** The scoring API the edge proxy calls for each request it forwards. */
export function createScoringServer(getFeatures: () => readonly Feature[]): Server {
	return createServer(async (req, res) => {
		if (req.url === '/healthz' && req.method === 'GET') {
			return send(res, 200, { status: 'ok' });
		}
		if (req.url === '/score' && req.method === 'POST') {
			const headers = parseHeaders(await readBody(req));
			if (!headers) return send(res, 400, { error: 'expected a JSON body with a headers object' });
			return send(res, 200, scoreRequest(headers, getFeatures()));
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
	let features = loadFeatures(FEATURES_PATH);
	log.info('features loaded', { path: FEATURES_PATH, count: features.length });

	// Pick up a rebuilt features file without a restart; a file that fails its checks changes nothing.
	watchFile(FEATURES_PATH, { interval: 1000 }, () => {
		const checked = readFeatures(FEATURES_PATH);
		if (!checked.ok) {
			log.warn('new features file rejected, keeping the features in use', { path: FEATURES_PATH, count: features.length });
			return;
		}
		features = checked.features;
		log.info('features reloaded', { path: FEATURES_PATH, count: features.length });
	});

	createScoringServer(() => features).listen(PORT, () => log.info('listening', { port: PORT }));
}
