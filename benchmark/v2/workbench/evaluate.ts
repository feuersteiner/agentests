import { AssertOrchestrator, InMemorySource, createEngines } from '../../../core/dist/index.js';
import type {
	AgentTestConfig,
	AgentTestDefinition,
	AgentTestEnv
} from '../../../core/dist/types.js';
import type { EvaluationInput } from './data.ts';
import type { Observation } from './metrics.ts';

/** No expected labels are accepted here. All verdicts come from the public runtime. */
export const createEvaluator = (
	model: string,
	config: AgentTestConfig,
	test: AgentTestDefinition,
	env: AgentTestEnv
) => {
	const engines = createEngines(config, env);
	return async (input: EvaluationInput, repeat: number): Promise<Observation> => {
		const started = performance.now();
		let score: number | undefined;
		let calls = 0;
		const base = {
			model,
			caseId: input.caseId,
			repeat,
			inputSha256: input.sha256,
			costUsd: null,
			usage: null,
			telemetryUnavailableReason:
				'Public runtime exposes score only; SDK HTTP retries and usage are not exposed.'
		};
		try {
			const observedEngines = {
				...engines,
				decide: async (packet: string, criterion: Parameters<typeof engines.decide>[1]) => {
					calls++;
					score = await engines.decide(packet, criterion);
					if (!Number.isFinite(score) || score < 0 || score > 1)
						throw new Error('Invalid engine score');
					return score;
				}
			};
			const findings = await new AssertOrchestrator(observedEngines, config.assert).run(
				test.assert,
				[new InMemorySource('evidence.json', input.packet)]
			);
			if (score === undefined || calls !== 1) throw new Error('Unexpected runtime decision count');
			return {
				...base,
				status: 'completed',
				actual: findings.length ? 'fail' : 'pass',
				score,
				latencyMs: performance.now() - started,
				logicalDecisionCalls: calls
			};
		} catch {
			// Provider messages can include request data. Persist only this fixed, non-sensitive error.
			return {
				...base,
				status: 'inference-error',
				actual: null,
				score: null,
				error:
					'Runtime evaluation failed; no verdict recorded. Provider error text is intentionally omitted.',
				latencyMs: performance.now() - started,
				logicalDecisionCalls: calls
			};
		}
	};
};
