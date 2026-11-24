import { afterEach, describe, expect, test } from 'bun:test';
import { evaluateGate, GATE_CRITERION, GATE_THRESHOLD } from '../six-gate.ts';

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});
const env = { OPENAI_API_KEY: 'secret-openai', TYPESAFE_AI_API_KEY: 'secret-jev' };
const intercept = (model: 'luna' | 'jev', probability: number) => {
	const requests: { url: string; authorization: string | null; body: string }[] = [];
	globalThis.fetch = (async (resource: string | URL | Request, init?: RequestInit) => {
		const url = String(resource);
		if (url.startsWith('http://127.0.0.1:')) return originalFetch(resource, init);
		requests.push({
			url,
			authorization: new Headers(init?.headers).get('authorization'),
			body:
				init?.body instanceof ArrayBuffer ? new TextDecoder().decode(init.body) : String(init?.body)
		});
		const answers =
			model === 'luna'
				? [{ type: 'predicate', name: 'criterion', probability }]
				: { criterion: { type: 'noul', noul: probability } };
		return Response.json({ answers, usage: { input_tokens: 12, output_tokens: 3 } });
	}) as typeof fetch;
	return requests;
};
describe('public runtime gate', () => {
	for (const model of ['luna', 'jev'] as const) {
		test(`${model} passes at threshold through its real SDK and records usage`, async () => {
			const requests = intercept(model, GATE_THRESHOLD);
			const result = await evaluateGate({ model, packet: 'all context and draft', env });
			expect(result.status).toBe('pass');
			expect(result.scores[0]?.score).toBe(GATE_THRESHOLD);
			expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 3 });
			expect(requests).toHaveLength(1);
			expect(requests[0]?.url).toBe(
				model === 'luna'
					? 'https://api.openai.com/v1/decisions'
					: 'https://api.typesafe.ai/v1/systemone'
			);
			expect(requests[0]?.authorization).toBe(
				`Bearer ${model === 'luna' ? env.OPENAI_API_KEY : env.TYPESAFE_AI_API_KEY}`
			);
			expect(requests[0]?.body).toContain('all context and draft');
			expect(requests[0]?.body).toContain(GATE_CRITERION);
			expect(JSON.stringify(result)).not.toContain('secret-');
		});
		test(`${model} returns a finding below threshold`, async () => {
			intercept(model, 0.79);
			const result = await evaluateGate({ model, packet: 'context and draft', env });
			expect(result.status).toBe('fail');
			expect(result.findings).toEqual([
				{ id: 'responsible-support-draft', criterion: GATE_CRITERION, score: 0.79, threshold: 0.8 }
			]);
		});
	}
	test('missing credentials and cancellation do not produce a finding', async () => {
		const missing = await evaluateGate({ model: 'luna', packet: 'x', env: {} });
		expect(missing.status).toBe('error');
		expect(missing.findings).toEqual([]);
		const controller = new AbortController();
		controller.abort();
		expect(
			(await evaluateGate({ model: 'luna', packet: 'x', env, signal: controller.signal })).status
		).toBe('error');
	});
	test('captures SDK retry attempts without treating a recovered request as failure', async () => {
		let attempts = 0;
		globalThis.fetch = (async (resource: string | URL | Request, init?: RequestInit) => {
			if (String(resource).startsWith('http://127.0.0.1:')) return originalFetch(resource, init);
			if (++attempts === 1)
				return Response.json({ error: { message: 'rate limited' } }, { status: 429 });
			return Response.json({
				answers: [{ type: 'predicate', name: 'criterion', probability: 0.9 }],
				usage: { input_tokens: 2, output_tokens: 1 }
			});
		}) as typeof fetch;
		const result = await evaluateGate({ model: 'luna', packet: 'x', env });
		expect(result.status).toBe('pass');
		expect(result.telemetry.map((x) => x.status)).toEqual([429, 200]);
		expect(result.usage).toEqual({ inputTokens: null, outputTokens: null });
	});
	test('provider refusal is an error rather than a failed assertion', async () => {
		globalThis.fetch = (async (resource: string | URL | Request, init?: RequestInit) =>
			String(resource).startsWith('http://127.0.0.1:')
				? originalFetch(resource, init)
				: Response.json({ answers: [{ type: 'refusal', name: 'criterion' }] })) as typeof fetch;
		const result = await evaluateGate({ model: 'luna', packet: 'x', env });
		expect(result.status).toBe('error');
		expect(result.findings).toEqual([]);
		expect(result.telemetry[0]?.refusals).toBe(1);
	});
});
