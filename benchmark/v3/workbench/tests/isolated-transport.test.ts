import { describe, expect, test } from 'bun:test';
import { setImmediate } from 'node:timers/promises';
import { createEngines } from '../../../../core/dist/index.js';
import {
	createIsolatedTransport,
	ISOLATED_EVIDENCE_SCHEMA,
	ISOLATED_EVIDENCE_PROMPT
} from '../isolated-transport.ts';
import type { IsolatedJudgment, IsolatedTransportOptions } from '../isolated-transport.ts';

const apiKey = 'offline-private-credential';
const model = 'offline-judge';
const packet = JSON.stringify({
	context: [{ id: 'E01', content: 'Current policy permits a bounded response.' }],
	candidate: {
		externalReply: [{ id: 'reply-01', text: 'We can review your request.' }],
		internalPlan: [{ id: 'plan-01', text: 'Check the applicable current policy.' }]
	}
});
const judgment: IsolatedJudgment = {
	score: 0.81,
	rationale: 'The proposed reply remains bounded.',
	evidence: [{ id: 'E01', quote: 'permits a bounded response' }],
	candidateSpans: [{ id: 'reply-01', quote: 'review your request' }]
};
const response = (content: unknown = judgment) =>
	Response.json(
		{
			id: 'offline-response',
			object: 'chat.completion',
			created: 0,
			model,
			choices: [
				{
					index: 0,
					finish_reason: 'stop',
					message: { role: 'assistant', content: JSON.stringify(content) }
				}
			],
			usage: {
				prompt_tokens: 100,
				completion_tokens: 20,
				total_tokens: 120,
				prompt_tokens_details: { cached_tokens: 10 }
			}
		},
		{ headers: { 'x-request-id': 'req-offline' } }
	);
const body = (criterion = 'The reply is bounded.') => ({
	model,
	messages: [
		{ role: 'system', content: 'Existing core system prompt.' },
		{ role: 'user', content: JSON.stringify({ input: packet, criterion }) }
	],
	response_format: {
		type: 'json_schema',
		json_schema: { name: 'score', strict: true, schema: { type: 'object' } }
	},
	temperature: 0.1,
	max_tokens: 9000
});
const post = (url: string, payload: unknown) =>
	fetch(`${url}/chat/completions`, {
		method: 'POST',
		headers: { authorization: 'Bearer local-placeholder', 'content-type': 'application/json' },
		body: JSON.stringify(payload)
	});
const withTransport = async (
	options: Partial<IsolatedTransportOptions>,
	run: (transport: ReturnType<typeof createIsolatedTransport>) => Promise<void>
) => {
	const transport = createIsolatedTransport({
		apiKey,
		model,
		fetch: (async () => response()) as unknown as typeof fetch,
		...options
	});
	try {
		await run(transport);
	} finally {
		await transport.stop();
	}
};

test.each([
	['empty', ''],
	['space', 'unsafe key'],
	['tab', 'unsafe\tkey'],
	['newline', 'unsafe\nkey'],
	['unicode whitespace', 'unsafe\u00a0key'],
	['double quote', 'unsafe"key'],
	['backslash', 'unsafe\\key']
])('rejects an in-memory key containing %s before creating a transport', (_name, unsafeKey) => {
	expect(() => createIsolatedTransport({ apiKey: unsafeKey!, model })).toThrow(
		'Invalid in-memory transport settings'
	);
});

test('real core reason SDK receives a bare numeric score while validated evidence stays in transport records', async () => {
	let forwarded: Record<string, unknown> | undefined;
	const originalFetch = globalThis.fetch;
	await withTransport(
		{
			fetch: (async (url: unknown, init?: RequestInit) => {
				expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
				expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${apiKey}`);
				forwarded = JSON.parse(String(init?.body));
				return response();
			}) as unknown as typeof fetch
		},
		async (transport) => {
			const config = {
				api: 'openai' as const,
				url: transport.url,
				model,
				apiKeyEnv: 'JUDGE_PLACEHOLDER'
			};
			const engines = createEngines({ decision: config, reasoning: config }, transport.env);
			expect(await engines.reason(packet, 'The reply is bounded.')).toBe(0.81);
			expect(forwarded?.max_completion_tokens).toBe(2048);
			expect(forwarded).not.toHaveProperty('max_tokens');
			expect(
				(forwarded?.response_format as { json_schema: { schema: unknown } }).json_schema.schema
			).toEqual(ISOLATED_EVIDENCE_SCHEMA);
			expect((forwarded?.messages as { content: string }[]).at(-1)?.content).toBe(
				ISOLATED_EVIDENCE_PROMPT
			);
			expect(transport.records).toHaveLength(1);
			const record = transport.records[0]!;
			expect(record.judgment).toEqual(judgment);
			expect(record.criterion).toBe('The reply is bounded.');
			expect(record.forwarded).toBe(true);
			expect(record.status).toBe(200);
			expect(record.inputTokens).toBe(100);
			expect(record.outputTokens).toBe(20);
			expect(record.cachedInputTokens).toBe(10);
			expect(record.totalTokens).toBe(120);
			expect(record.requestId).toBe('req-offline');
			expect(record.responseModel).toBe(model);
			expect(record.requestBytes).toBeGreaterThan(0);
			expect(record.responseBytes).toBeGreaterThan(0);
			expect(record.requestHash).toMatch(/^[a-f0-9]{64}$/);
			expect(JSON.stringify(transport.records)).not.toContain(apiKey);
		}
	);
	expect(globalThis.fetch).toBe(originalFetch);
});

test('strict route, placeholder authorization and model checks prevent unintended forwarding', async () => {
	let forwards = 0;
	await withTransport(
		{
			fetch: (async () => {
				forwards++;
				return response();
			}) as unknown as typeof fetch
		},
		async ({ url, records }) => {
			expect((await fetch(`${url}/chat/completions`)).status).toBe(403);
			expect(
				(await fetch(`${url}/chat/completions`, { method: 'POST', body: JSON.stringify(body()) }))
					.status
			).toBe(403);
			expect((await post(`${url}?wrong`, body())).status).toBe(403);
			expect((await post(url, { ...body(), model: 'other-model' })).status).toBe(400);
			expect(forwards).toBe(0);
			expect(records.every((record) => !record.forwarded)).toBe(true);
		}
	);
});

test('request reservations and FIFO concurrency hold across overlapping criterion requests', async () => {
	let active = 0,
		maximum = 0,
		forwards = 0;
	await withTransport(
		{
			maxRequests: 3,
			concurrency: 2,
			maxCompletionTokens: 512,
			fetch: (async (_url: unknown, init?: RequestInit) => {
				forwards++;
				active++;
				maximum = Math.max(maximum, active);
				const sent = JSON.parse(String(init?.body));
				expect(sent.max_completion_tokens).toBe(512);
				expect(sent.temperature).toBe(0.1);
				await setImmediate();
				active--;
				return response();
			}) as unknown as typeof fetch
		},
		async ({ url, records }) => {
			const replies = await Promise.all(
				Array.from({ length: 5 }, (_, index) => post(url, body(`criterion-${index}`)))
			);
			expect(replies.map((reply) => reply.status).sort()).toEqual([200, 200, 200, 400, 400]);
			expect(forwards).toBe(3);
			expect(maximum).toBe(2);
			expect(records.filter((record) => record.error === 'request-limit')).toHaveLength(2);
		}
	);
});

test('identical SDK request retries never produce a second upstream HTTP attempt', async () => {
	let forwards = 0;
	await withTransport(
		{
			fetch: (async () => {
				forwards++;
				return Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429 });
			}) as unknown as typeof fetch
		},
		async ({ url, records }) => {
			expect((await post(url, body())).status).toBe(429);
			const retry = { ...body(), messages: body().messages };
			expect((await post(url, retry)).status).toBe(400);
			expect(forwards).toBe(1);
			expect(records[1]?.error).toBe('duplicate-request');
		}
	);
});

test('real core SDK retries a provider failure locally without forwarding it twice', async () => {
	let forwards = 0;
	await withTransport(
		{
			fetch: (async () => {
				forwards++;
				return Response.json({ error: { message: 'Temporary upstream failure' } }, { status: 503 });
			}) as unknown as typeof fetch
		},
		async (transport) => {
			const config = {
				api: 'openai' as const,
				url: transport.url,
				model,
				apiKeyEnv: 'JUDGE_PLACEHOLDER'
			};
			const engines = createEngines({ decision: config, reasoning: config }, transport.env);
			await expect(engines.reason(packet, 'The reply is bounded.')).rejects.toThrow();
			expect(forwards).toBe(1);
			expect(transport.records.map((record) => record.forwarded)).toEqual([true, false]);
			expect(transport.records[1]?.error).toBe('duplicate-request');
		}
	);
});

test.each(['insufficient_quota', 'billing_hard_limit_reached'])(
	'quota %s halts queued and future forwards',
	async (code) => {
		let forwards = 0;
		await withTransport(
			{
				concurrency: 1,
				fetch: (async () => {
					forwards++;
					await setImmediate();
					return Response.json({ error: { code, message: apiKey } }, { status: 429 });
				}) as unknown as typeof fetch
			},
			async ({ url, records }) => {
				await Promise.all([post(url, body('first')), post(url, body('queued'))]);
				expect((await post(url, body('future'))).status).toBe(400);
				expect(forwards).toBe(1);
				expect(records.filter((record) => record.error === 'quota-halted')).toHaveLength(2);
				expect(JSON.stringify(records)).not.toContain(apiKey);
				expect(records.every((record) => record.errorCode === code)).toBe(true);
			}
		);
	}
);

describe('supplemental evidence contract', () => {
	test.each([
		['score-only', { score: 0.8 }],
		['extra-field', { ...judgment, extra: true }],
		['missing-evidence', { ...judgment, evidence: [] }],
		['missing-spans', { ...judgment, candidateSpans: [] }],
		['unknown-context', { ...judgment, evidence: [{ id: 'E99', quote: 'permits' }] }],
		['paraphrase', { ...judgment, evidence: [{ id: 'E01', quote: 'allows responses' }] }],
		[
			'wrong-source',
			{ ...judgment, candidateSpans: [{ id: 'reply-01', quote: 'current policy' }] }
		],
		['blank-rationale', { ...judgment, rationale: ' ' }],
		['out-of-range', { ...judgment, score: 2 }]
	])('rejects %s as contract error, never a zero score', async (_label, invalid) => {
		await withTransport(
			{ fetch: (async () => response(invalid)) as unknown as typeof fetch },
			async ({ url, records }) => {
				const result = await post(url, body());
				expect(result.status).toBe(422);
				expect(records[0]?.error).toBe('contract-error');
				expect(records[0]?.judgment).toBeNull();
				expect(await result.text()).not.toContain('"score"');
			}
		);
	});
});

test('redacts literal secrets before response metadata can be persisted', async () => {
	const captured: unknown[] = [];
	await withTransport(
		{
			onRecord: (record) => captured.push(record),
			fetch: (async () =>
				response({ ...judgment, rationale: `Never persist ${apiKey}` })) as unknown as typeof fetch
		},
		async ({ url, records }) => {
			const result = await post(url, body());
			expect(result.status).toBe(200);
			expect(JSON.stringify(records)).not.toContain(apiKey);
			expect(JSON.stringify(captured)).not.toContain(apiKey);
			expect(await result.text()).not.toContain(apiKey);
			expect(records[0]?.judgment?.rationale).toContain('[REDACTED]');
		}
	);
});

test('redacts credentials escaped inside provider JSON strings before persistence', async () => {
	await withTransport(
		{
			fetch: (async () => {
				const raw = await response({ ...judgment, rationale: `Never persist ${apiKey}` }).text();
				return new Response(raw.replace(apiKey, apiKey.replace('private', '\\u0070rivate')), {
					headers: { 'content-type': 'application/json' }
				});
			}) as unknown as typeof fetch
		},
		async ({ url, records }) => {
			expect((await post(url, body())).status).toBe(200);
			expect(JSON.stringify(records)).not.toContain(apiKey);
			expect(records[0]?.judgment?.rationale).toContain('[REDACTED]');
		}
	);
});

test.each(['external', 'timeout'] as const)(
	'%s cancels active and queued work within each request deadline',
	async (kind) => {
		const controller = new AbortController();
		let forwards = 0;
		await withTransport(
			{
				signal: controller.signal,
				timeoutMs: kind === 'timeout' ? 20 : 1000,
				fetch: (async (_url: unknown, init?: RequestInit) => {
					forwards++;
					if (kind === 'external') setTimeout(() => controller.abort(), 5);
					return await new Promise<Response>((_resolve, reject) =>
						init?.signal?.addEventListener('abort', () => reject(new Error('Cancelled')), {
							once: true
						})
					);
				}) as unknown as typeof fetch
			},
			async ({ url, records }) => {
				const replies = await Promise.all([post(url, body('first')), post(url, body('second'))]);
				expect(replies.every((reply) => reply.status === 400)).toBe(true);
				expect(forwards).toBeGreaterThanOrEqual(1);
				expect(forwards).toBeLessThanOrEqual(kind === 'external' ? 1 : 2);
				expect(
					records.every(
						(record) =>
							record.error === kind || record.error === 'aborted' || record.error === 'timeout'
					)
				).toBe(true);
			}
		);
	}
);

test('an already aborted external signal never forwards and stop is idempotent', async () => {
	const controller = new AbortController();
	controller.abort();
	let forwards = 0;
	const transport = createIsolatedTransport({
		apiKey,
		model,
		signal: controller.signal,
		fetch: (async () => {
			forwards++;
			return response();
		}) as unknown as typeof fetch
	});
	try {
		expect((await post(transport.url, body())).status).toBe(400);
		expect(forwards).toBe(0);
	} finally {
		await transport.stop();
		await transport.stop();
	}
});
