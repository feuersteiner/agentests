import { describe, expect, test } from 'bun:test';
import { generateDraft, validateProducerCandidate } from '../six-provider.ts';
import type { GradedProfile } from '../graded-provider.ts';

const draft = {
	externalReply: [{ id: 'reply-01', text: 'Reply' }],
	internalPlan: [{ id: 'plan-01', text: 'Plan' }]
};
const profile: GradedProfile = {
	api: 'openai',
	url: 'https://api.openai.com/v1',
	model: 'gpt-6.1-terra',
	apiKeyEnv: 'OPENAI_API_KEY',
	apiKey: 'offline-secret'
};
const envelope = (content: string, finish_reason = 'stop') => ({
	model: profile.model,
	usage: {
		prompt_tokens: 12,
		completion_tokens: 6,
		total_tokens: 18,
		prompt_tokens_details: { cached_tokens: 2 }
	},
	choices: [{ finish_reason, message: { content } }]
});
const mock = (
	fn: (url: string, init?: RequestInit) => Response | Promise<Response>
): typeof fetch => fn as unknown as typeof fetch;

describe('producer contract and transport', () => {
	test('requires exact fields, sequential IDs and nonempty spans', () => {
		expect(validateProducerCandidate(draft)).toEqual(draft);
		for (const bad of [
			{ ...draft, extra: true },
			{ ...draft, internalPlan: [] },
			{ ...draft, externalReply: [{ id: 'reply-02', text: 'x' }] },
			{ ...draft, externalReply: [{ id: 'reply-01', text: ' ' }] },
			{ ...draft, internalPlan: [{ id: 'plan-01', text: 'x', extra: 1 }] }
		])
			expect(() => validateProducerCandidate(bad)).toThrow();
	});
	test('sends one isolated conversation with JSON mode and captures usage', async () => {
		const messages = [
			{ role: 'user' as const, content: 'case' },
			{ role: 'assistant' as const, content: JSON.stringify(draft) },
			{ role: 'user' as const, content: 'feedback' }
		];
		let calls = 0;
		const result = await generateDraft(
			{
				...profile,
				fetch: mock((url, init) => {
					calls++;
					expect(url).toBe('https://api.openai.com/v1/chat/completions');
					expect(init?.redirect).toBe('error');
					const body = JSON.parse(String(init?.body));
					expect(body).toEqual({
						model: profile.model,
						store: false,
						stream: false,
						messages,
						response_format: { type: 'json_object' },
						max_completion_tokens: 16384
					});
					return Response.json(envelope(JSON.stringify(draft)), {
						headers: { 'x-request-id': 'req_test' }
					});
				})
			},
			messages
		);
		expect(calls).toBe(1);
		expect(result.status).toBe('completed');
		expect(result.candidate).toEqual(draft);
		expect(result.requestId).toBe('req_test');
		expect(result.responseModel).toBe(profile.model);
		expect(result.usage).toEqual({
			inputTokens: 12,
			outputTokens: 6,
			cachedInputTokens: 2,
			totalTokens: 18
		});
		expect(result.actualCostUsd).toBeNull();
	});
	test('records failures without retrying or leaking error text and credentials', async () => {
		let calls = 0;
		const result = await generateDraft(
			{
				...profile,
				fetch: mock(() => {
					calls++;
					return new Response(`PRIVATE ${profile.apiKey}`, {
						status: 429,
						headers: { 'retry-after': '2', 'x-request-id': profile.apiKey! }
					});
				})
			},
			[{ role: 'user', content: 'case' }]
		);
		expect(calls).toBe(1);
		expect(result.status).toBe('api-error');
		expect(result.retryAfterMs).toBe(2000);
		expect(result.requestId).toBeNull();
		expect(JSON.stringify(result)).not.toContain(profile.apiKey!);
		expect(result.rawResponse).toContain('PRIVATE');
		expect(result.rawResponse).toContain('[REDACTED]');
	});
	test('rejects refusal, incomplete, invalid JSON and invalid candidate', async () => {
		const cases = [
			{
				payload: { choices: [{ finish_reason: 'stop', message: { refusal: 'private' } }] },
				status: 'refusal'
			},
			{ payload: envelope('{}', 'length'), status: 'incomplete' },
			{ payload: envelope('oops'), status: 'parse-error' },
			{ payload: envelope('{}'), status: 'contract-error' }
		] as const;
		for (const { payload, status } of cases) {
			const result = await generateDraft(
				{ ...profile, fetch: mock(() => Response.json(payload)) },
				[{ role: 'user', content: 'case' }]
			);
			expect(result.status).toBe(status);
			expect(result.candidate).toBeNull();
		}
	});
	test('prevents invalid profiles and conversations before HTTP and forwards cancellation', async () => {
		let calls = 0;
		const fetch = mock((_url, init) => {
			calls++;
			expect(init?.signal).toBe(controller.signal);
			throw Error('PRIVATE');
		});
		expect(
			(
				await generateDraft({ ...profile, model: 'gpt-6-luna', fetch }, [
					{ role: 'user', content: 'case' }
				])
			).status
		).toBe('setup-error');
		expect(
			(await generateDraft({ ...profile, fetch }, [{ role: 'assistant', content: 'case' }])).status
		).toBe('setup-error');
		const controller = new AbortController();
		const result = await generateDraft(
			{ ...profile, fetch },
			[{ role: 'user', content: 'case' }],
			controller.signal
		);
		expect(calls).toBe(1);
		expect(result.status).toBe('api-error');
		expect(JSON.stringify(result)).not.toContain('PRIVATE');
	});
});
