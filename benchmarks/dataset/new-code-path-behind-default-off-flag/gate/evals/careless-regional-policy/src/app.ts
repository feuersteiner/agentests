import { loadConfig } from './config.ts';
import { isEnabled } from './flags.ts';
import { compose, type GatewayRequest } from './http.ts';
import { quotaMiddleware } from './middleware/quota.ts';
import { regionalQuotaMiddleware } from './middleware/regional.ts';
import { createPolicyStore, loadPolicies, type PolicyStore } from './policies/store.ts';
import { createCounter, type Counter } from './quota/counter.ts';

export type Upstream = (request: Request) => Promise<Response>;

export interface AppDeps {
	policies: PolicyStore;
	counter: Counter;
	upstream: Upstream;
	region: string;
	now?: () => Date;
}

/** The gateway: each request passes through the middleware in order, then goes upstream. */
export function createApp({ policies, counter, upstream, region, now = () => new Date() }: AppDeps) {
	const pipeline = compose(
		[quotaMiddleware({ policies, counter }), regionalQuotaMiddleware({ policies, counter })],
		({ request }) => upstream(request)
	);
	return (request: Request): Promise<Response> => {
		const req: GatewayRequest = {
			request,
			projectId: request.headers.get('x-project-id') ?? 'anonymous',
			region,
			receivedAt: now()
		};
		return pipeline(req);
	};
}

/** Forwards a request to the maps API at baseUrl, with the same method, path, query and body. */
export function httpUpstream(baseUrl: string): Upstream {
	return (request) => {
		const url = new URL(request.url);
		const headers = new Headers(request.headers);
		if (isEnabled('stripCookies')) headers.delete('cookie');
		if (isEnabled('forwardRequestId')) headers.set('x-request-id', crypto.randomUUID());
		return fetch(baseUrl + url.pathname + url.search, {
			method: request.method,
			headers,
			body: request.body
		});
	};
}

if (import.meta.main) {
	const config = loadConfig(process.env);
	const app = createApp({
		policies: createPolicyStore(loadPolicies(config.policiesPath)),
		counter: createCounter(),
		upstream: httpUpstream(config.upstreamUrl),
		region: config.region
	});
	Bun.serve({ port: config.port, fetch: app });
	console.log(`meridian-gateway listening on port ${config.port} in ${config.region}`);
}
