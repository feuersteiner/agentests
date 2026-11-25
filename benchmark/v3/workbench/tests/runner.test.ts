import { expect, test } from 'bun:test';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makePlan } from '../plan.ts';
import { runPilot, readIndex } from '../run.ts';
import type { RunOptions } from '../run.ts';
import { evaluateGate } from '../gate.ts';
import { Semaphore } from '../scheduler.ts';
import { main } from '../cli.ts';

const candidate = {
	externalReply: [{ id: 'reply-01', text: 'Reply' }],
	internalPlan: [{ id: 'plan-01', text: 'Plan' }]
};
const usage = { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0, totalTokens: 2 };
const env = { OPENAI_API_KEY: 'test-openai', TYPESAFE_AI_API_KEY: 'test-jev' };
const generate: NonNullable<RunOptions['generate']> = async () => ({
	status: 'completed',
	candidate,
	latencyMs: 1,
	requestId: 'request',
	responseModel: 'gpt-6.1-terra',
	usage,
	actualCostUsd: null,
	httpStatus: 200,
	retryAfterMs: null,
	error: null,
	errorCode: null,
	rawResponse: null
});
const gate: NonNullable<RunOptions['gate']> = async () => ({
	status: 'fail',
	scores: [],
	findings: [{ id: 'x', criterion: 'Revise', score: 0, threshold: 0.8 }],
	usage,
	telemetry: []
});
const judge: NonNullable<RunOptions['judge']> = async () => ({
	status: 'completed',
	assessment: null,
	latencyMs: 1,
	requestId: null,
	responseModel: 'gpt-6.1-terra',
	usage,
	actualCostUsd: null,
	httpStatus: 200,
	retryAfterMs: null,
	error: null,
	rawResponse: null,
	strategy: 'offline-mock'
});
const withRoot = async (fn: (root: string) => Promise<void>): Promise<void> => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'controlled-test-')));
	try {
		await fn(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
};
test('immutable plan fixes balanced paired assignments and strict budgets', () => {
	const a = makePlan('test'),
		b = makePlan('test');
	expect(a.planHash).toBe(b.planHash);
	expect(a.jobs).toHaveLength(12);
	expect(a.jobs.map((j) => j.arm).join('')).toBe('ABCBCACABABC');
	expect(a.settings.logicalCallLimit).toBe(84);
	expect(a.settings.httpAttemptLimit).toBe(156);
	for (const id of ['complex-support-01', 'complex-support-02'])
		for (const provider of ['luna', 'jev'])
			expect(
				a.jobs
					.filter((j) => j.caseId === id && j.gateModel === provider)
					.map((j) => j.arm)
					.sort()
			).toEqual(['A', 'B', 'C']);
	expect(() => makePlan('../bad')).toThrow();
});
test(
	'offline maximum loop preserves exact feedback, review blinding and no replay',
	async () =>
		withRoot(async (root) => {
			const messagesByPrompt = new Map<string, string[][]>();
			let gates = 0,
				reviews = 0,
				logs = 0;
			const result = await runPilot({
				plan: makePlan('flow', undefined, true),
				allowPaid: true,
				externalSpendingCapConfirmed: true,
				root,
				env,
				generate: async (profile, messages, signal) => {
					await profile.fetch!('data:application/json,{}');
					const history = messagesByPrompt.get(messages[0]!.content) ?? [];
					history.push(messages.map((m) => m.content));
					messagesByPrompt.set(messages[0]!.content, history);
					return generate(profile, messages, signal);
				},
				gate: async (input) => {
					gates++;
					for (let n = 0; n < 3; n++) input.beforeHttpAttempt?.();
					input.log?.('gate-progress');
					return gate(input);
				},
				log: () => {
					logs++;
				},
				judge: async (profile, packet, signal) => {
					reviews++;
					await profile.fetch!('data:application/json,{}');
					expect(packet).not.toContain('Revise');
					expect(packet).not.toContain('--luna--');
					return judge(profile, packet, signal);
				}
			});
			expect(result.index.stoppedReason).toBeNull();
			expect(result.index.calls).toHaveLength(84);
			expect(result.index.httpAttempts).toBe(156);
			expect(result.index.calls.every((c) => c.httpAttemptsKnown)).toBe(true);
			expect(gates).toBe(36);
			expect(reviews).toBe(12);
			expect(logs).toBe(12);
			expect(
				result.index.jobs.every(
					(j) => j.drafts.length === 3 && j.status === 'completed' && j.judgeState === 'completed'
				)
			).toBe(true);
			expect(readIndex(result.directory).planHash).toBe(result.index.planHash);
			for (const histories of messagesByPrompt.values())
				for (let revision = 0; revision < 3; revision++) {
					const matching = histories.filter((h) => h.length === revision * 2 + 1);
					expect(new Set(matching.map((m) => JSON.stringify(m))).size).toBe(1);
				}

			await expect(
				runPilot({
					plan: makePlan('flow', undefined, true),
					allowPaid: true,
					externalSpendingCapConfirmed: true,
					root,
					env,
					generate,
					gate,
					judge
				})
			).rejects.toThrow('existing');
		}),
	// The full budget loop durably rewrites the snapshot at every reservation;
	// concurrent workspace tests can exceed Bun's default five-second deadline.
	20_000
);
test('uncertain calls stop invocation with durable markers and no subsequent inference', async () =>
	withRoot(async (root) => {
		let calls = 0;
		const { index } = await runPilot({
			plan: makePlan('unknown', undefined, true),
			allowPaid: true,
			externalSpendingCapConfirmed: true,
			root,
			env,
			generate: async () => {
				calls++;
				throw new Error('outcome unknown');
			},
			gate,
			judge
		});
		expect(calls).toBe(1);
		expect(index.stoppedReason).toBe('uncertain-call-no-replay');
		expect(index.calls[0]?.state).toBe('uncertain');
		expect(index.jobs[0]?.attempts[0]?.status).toBe('interrupted-unknown');
	}));
test('gate quota errors stop immediately and paid flags are mandatory', async () =>
	withRoot(async (root) => {
		const plan = makePlan('quota', undefined, true);
		await expect(
			runPilot({
				plan,
				allowPaid: false,
				externalSpendingCapConfirmed: true,
				root,
				env,
				generate,
				gate,
				judge
			})
		).rejects.toThrow();
		const { index } = await runPilot({
			plan,
			allowPaid: true,
			externalSpendingCapConfirmed: true,
			root,
			env,
			generate,
			gate: async () => ({
				status: 'error',
				scores: [],
				findings: [],
				usage,
				telemetry: [],
				errorCode: 'insufficient_quota'
			}),
			judge
		});
		expect(index.stoppedReason).toBe('quota-exhausted');
		expect(index.calls).toHaveLength(2);
		await expect(main(['run', '--run-id', 'unauthorized'])).rejects.toThrow();
	}));
test('FIFO bounded scheduler caps active calls and releases after failure', async () => {
	const semaphore = new Semaphore(2);
	let active = 0,
		maximum = 0;
	const order: number[] = [];
	const results = await Promise.allSettled(
		Array.from({ length: 8 }, (_, i) =>
			semaphore.run(async () => {
				active++;
				maximum = Math.max(maximum, active);
				order.push(i);
				await new Promise<void>((resolve) => setTimeout(resolve, 1));
				active--;
				if (i === 0) throw new Error('release');
			})
		)
	);
	expect(maximum).toBe(2);
	expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	expect(results[0]?.status).toBe('rejected');
});
for (const model of ['luna', 'jev'] as const)
	test(`real ${model} gate supports quiet per-instance logger and offline HTTP telemetry`, async () => {
		const messages: string[] = [];
		let attempts = 0;
		const result = await evaluateGate({
			model,
			packet: 'complete input and draft',
			env,
			log: (message) => messages.push(message),
			beforeHttpAttempt: () => {
				attempts++;
			},
			fetch: (async () =>
				Response.json({
					answers:
						model === 'luna'
							? [{ type: 'predicate', name: 'criterion', probability: 0.9 }]
							: { criterion: { type: 'noul', noul: 0.9 } },
					usage: { input_tokens: 2, output_tokens: 1 }
				})) as unknown as typeof fetch
		});
		expect(result.status).toBe('pass');
		expect(attempts).toBe(1);
		expect(result.telemetry[0]?.forwarded).toBe(true);
		expect(result.telemetry[0]?.attempt).toBe(1);
		expect(messages.length).toBeGreaterThan(0);
	});
test('SDK retries remain separately metered and quota suppresses extra upstream forwarding', async () => {
	let attempts = 0;
	const result = await evaluateGate({
		model: 'luna',
		packet: 'input',
		env,
		log: () => {},
		beforeHttpAttempt: () => {
			attempts++;
		},
		fetch: (async () =>
			Response.json(
				{ error: { code: 'insufficient_quota' } },
				{ status: 429 }
			)) as unknown as typeof fetch
	});
	expect(result.status).toBe('error');
	expect(result.errorCode).toBe('insufficient_quota');
	expect(attempts).toBe(1);
	expect(result.telemetry.filter((t) => t.forwarded)).toHaveLength(1);
});

test('real gate meters a recovered SDK retry as two HTTP attempts in one logical call', async () => {
	let attempts = 0;
	const result = await evaluateGate({
		model: 'luna',
		packet: 'input',
		env,
		log: () => {},
		beforeHttpAttempt: () => {},
		fetch: (async () => {
			attempts++;
			return attempts === 1
				? Response.json(
						{ error: { message: 'limited' } },
						{ status: 429, headers: { 'retry-after-ms': '1' } }
					)
				: Response.json({
						answers: [{ type: 'predicate', name: 'criterion', probability: 0.9 }],
						usage: { input_tokens: 1, output_tokens: 1 }
					});
		}) as unknown as typeof fetch
	});
	expect(result.status).toBe('pass');
	expect(attempts).toBe(2);
	expect(result.telemetry.map((t) => t.status)).toEqual([429, 200]);
}, 15000);
test('gate refuses outbound requests when global HTTP reservation fails', async () => {
	let outgoing = 0;
	const result = await evaluateGate({
		model: 'luna',
		packet: 'input',
		env,
		log: () => {},
		beforeHttpAttempt: () => {
			throw new Error('budget exhausted');
		},
		fetch: (async () => {
			outgoing++;
			return Response.json({});
		}) as unknown as typeof fetch
	});
	expect(outgoing).toBe(0);
	expect(result.status).toBe('error');
	expect(result.telemetry[0]?.forwarded).toBe(false);
});
test('real gate SDK retries never forward more than per-call ceiling', async () => {
	let attempts = 0;
	const result = await evaluateGate({
		model: 'luna',
		packet: 'input',
		env,
		log: () => {},
		beforeHttpAttempt: () => {},
		fetch: (async () => {
			attempts++;
			return Response.json(
				{ error: { message: 'unavailable' } },
				{ status: 503, headers: { 'retry-after-ms': '1' } }
			);
		}) as unknown as typeof fetch
	});
	expect(result.status).toBe('error');
	expect(attempts).toBe(3);
	expect(result.telemetry.filter((t) => t.forwarded)).toHaveLength(3);
}, 20000);
