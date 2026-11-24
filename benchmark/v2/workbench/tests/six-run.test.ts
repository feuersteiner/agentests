import { describe, expect, test } from 'bun:test';
import { makeSixPlan } from '../six-run.ts';
import { freezeProducerCases, sixArms } from '../six-protocol.ts';

describe('six-arm frozen plan', () => {
	test('contains 180 distinct trials and fixes equal repeats per situation', () => {
		const plan = makeSixPlan('test', 'measured');
		expect(plan.jobs).toHaveLength(180);
		expect(new Set(plan.jobs.map((j) => j.id)).size).toBe(180);
		expect(sixArms).toHaveLength(6);
		for (const c of freezeProducerCases())
			for (const a of sixArms)
				expect(plan.jobs.filter((j) => j.caseId === c.id && j.arm === a.id)).toHaveLength(3);
		expect(plan.settings.producerLimit).toBe(420);
		expect(plan.settings.gateLimit).toBe(360);
		expect(plan.settings.judgeLimit).toBe(180);
	});
	test('smoke is a distinct six-job plan with a smaller hard budget', () => {
		const plan = makeSixPlan('smoke-test', 'smoke');
		expect(plan.jobs).toHaveLength(6);
		expect(plan.settings.producerLimit).toBe(14);
		expect(plan.settings.gateLimit).toBe(12);
		expect(plan.settings.judgeLimit).toBe(6);
		expect(new Set(plan.jobs.map((j) => j.caseId)).size).toBe(1);
	});
	test('rejects unsafe run IDs and mutated case inventories', () => {
		expect(() => makeSixPlan('../escape', 'measured')).toThrow();
		expect(() => makeSixPlan('test', 'measured', [])).toThrow();
	});
});

import { mkdtempSync, readFileSync, realpathSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSix } from '../six-run.ts';
import type { SixIndex } from '../six-run.ts';
import type { GradedResult } from '../graded-provider.ts';

test('isolated loops judge every final draft including three gate failures and never replay interrupted calls', async () => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'six-test-')));
	const plan = makeSixPlan('flow', 'smoke');
	let produces = 0,
		gates = 0,
		judges = 0;
	const packets: string[] = [];
	const candidate = {
		externalReply: [{ id: 'reply-01', text: 'Reply' }],
		internalPlan: [{ id: 'plan-01', text: 'Plan' }]
	};
	const usage = { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0, totalTokens: 2 };
	const generate: NonNullable<Parameters<typeof runSix>[0]['generate']> = async (
		_profile,
		messages
	) => {
		produces++;
		for (const m of messages.slice(1)) expect(m.content).not.toContain('threshold');
		return {
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
		};
	};
	const gate: NonNullable<Parameters<typeof runSix>[0]['gate']> = async () => {
		gates++;
		return {
			status: 'fail',
			scores: [],
			findings: [{ id: 'x', criterion: 'Revise', score: 0, threshold: 0.8 }],
			usage: { inputTokens: 1, outputTokens: 1 },
			telemetry: []
		};
	};
	const judge: NonNullable<Parameters<typeof runSix>[0]['judge']> = async (_p, packet) => {
		judges++;
		packets.push(packet);
		return {
			status: 'contract-error',
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
			strategy: 'test'
		} as GradedResult;
	};
	const env = { OPENAI_API_KEY: 'test-openai', TYPESAFE_AI_API_KEY: 'test-jev' };
	try {
		const { index, directory } = await runSix({ plan, root, env, generate, gate, judge });
		expect(produces).toBe(14);
		expect(gates).toBe(12);
		expect(judges).toBe(6);
		expect(index.jobs.filter((j) => j.drafts.length === 3)).toHaveLength(4);
		for (const packet of packets) {
			expect(packet).not.toContain('prompt-skill-luna');
			expect(packet).not.toContain('Revise');
		}
		const path = join(directory, 'index.json');
		const saved = JSON.parse(readFileSync(path, 'utf8')) as SixIndex;
		const baseline = saved.jobs.find((j) => j.arm === 'prompt')!;
		baseline.status = 'running';
		baseline.attempts[0]!.status = 'running';
		baseline.attempts[0]!.candidate = null;
		baseline.drafts = [];
		baseline.judgeState = 'pending';
		delete baseline.judge;
		delete baseline.judgeDraftSha256;
		delete baseline.judgePacketSha256;
		const gated = saved.jobs.find((j) => j.arm === 'prompt-luna')!;
		gated.status = 'running';
		gated.drafts = gated.drafts.slice(0, 1);
		gated.attempts = gated.attempts.slice(0, 1);
		delete gated.drafts[0]!.gate;
		gated.gateRunning = true;
		gated.judgeState = 'pending';
		delete gated.judge;
		delete gated.judgeDraftSha256;
		delete gated.judgePacketSha256;
		const judging = saved.jobs.find((j) => j.arm === 'prompt-skill')!;
		judging.judgeState = 'running';
		delete judging.judge;
		writeFileSync(path, JSON.stringify(saved));
		produces = 0;
		gates = 0;
		judges = 0;
		const resumed = await runSix({ plan, root, env, resume: true, generate, gate, judge });
		expect(produces).toBe(0);
		expect(gates).toBe(0);
		expect(judges).toBe(1);
		expect(resumed.index.jobs.find((j) => j.id === baseline.id)!.status).toBe('interrupted');
		expect(resumed.index.jobs.find((j) => j.id === judging.id)!.judgeState).toBe('interrupted');
		const altered = JSON.parse(readFileSync(path, 'utf8')) as SixIndex;
		altered.settings.producerLimit++;
		writeFileSync(path, JSON.stringify(altered));
		await expect(
			runSix({ plan, root, env, resume: true, generate, gate, judge })
		).rejects.toThrow();
		altered.settings.producerLimit--;
		const pending = altered.jobs.find((j) => j.id === baseline.id)!;
		pending.status = 'pending';
		writeFileSync(path, JSON.stringify(altered));
		await expect(
			runSix({ plan, root, env, resume: true, generate, gate, judge })
		).rejects.toThrow();
		pending.status = 'interrupted';
		const tampered = altered.jobs.find((j) => j.id === judging.id)!.drafts[0]!;
		tampered.sha256 = 'bad';
		writeFileSync(path, JSON.stringify(altered));
		await expect(
			runSix({ plan, root, env, resume: true, generate, gate, judge })
		).rejects.toThrow();
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}, 30000);
