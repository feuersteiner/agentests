import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseTest } from '../../../../core/dist/index.js';
import type { AgentTestConfig, AgentTestEngines } from '../../../../core/dist/types.js';
import { dimensionIds } from '../../../v2/workbench/dossier.ts';
import { freezeProducerCases, makeJudgePacket } from '../../../v2/workbench/six-protocol.ts';
import { compileIsolatedCriteria } from '../isolated-criteria.ts';
import {
	classifyAcceptance,
	deriveIsolatedAssessment,
	runIsolatedJudge
} from '../isolated-judge.ts';
import type { IsolatedCheckResult } from '../isolated-judge.ts';

const candidate = {
	externalReply: [{ id: 'reply-01', text: 'A bounded support reply.' }],
	internalPlan: [{ id: 'plan-01', text: 'Keep an owner and review policy authority.' }]
};
const packets = freezeProducerCases().map((c) => makeJudgePacket(c, candidate));
const packet = packets[0]!;
const compilation = compileIsolatedCriteria(packet);
const config: AgentTestConfig = {
	ignore: [],
	decision: { api: 'openai', model: 'offline', url: 'http://127.0.0.1:1', apiKeyEnv: 'OFFLINE' },
	reasoning: { api: 'openai', model: 'offline', url: 'http://127.0.0.1:1', apiKeyEnv: 'OFFLINE' },
	select: { threshold: 0.8 },
	assert: { threshold: 0.8 }
};
const checks = (score = 0.9): IsolatedCheckResult[] =>
	compilation.criteria.map(({ id, kind, dimensionId, level, breachCode }) => ({
		id,
		kind,
		dimensionId,
		level,
		breachCode,
		score,
		acceptance: classifyAcceptance(score),
		nativeFlagged: score < 0.8,
		startedAt: null,
		finishedAt: null,
		error: null
	}));
const setScore = (check: IsolatedCheckResult, score: number): void => {
	check.score = score;
	check.acceptance = classifyAcceptance(score);
	check.nativeFlagged = score < 0.8;
};
const withDirectory = async (fn: (directory: string) => Promise<void>): Promise<void> => {
	const directory = realpathSync(mkdtempSync(join(tmpdir(), 'isolated-native-offline-')));
	try {
		await fn(directory);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
};
test('every frozen case compiles24 reason-only native Tests with explicit all-clause coverage', () => {
	for (const input of packets) {
		const result = compileIsolatedCriteria(input);
		expect(result.criteria).toHaveLength(24);
		expect(new Set(result.criteria.map((c) => c.id)).size).toBe(24);
		expect(result.uncovered).toEqual([]);
		expect(result.coverage.every((entry) => entry.testIds.length > 0)).toBe(true);
		expect(result.coverage.some((entry) => entry.path.startsWith('/permittedAlternatives/'))).toBe(
			true
		);
		expect(result.coverage.some((entry) => entry.path.startsWith('/knownTensions/'))).toBe(true);
		expect(
			result.coverage
				.filter((entry) => entry.path.startsWith('/responseSchema/'))
				.every((entry) => entry.status === 'replaced-output-contract')
		).toBe(true);
		expect(result.capabilities.frozenFreeformAssessment).toBe(false);
		for (const criterion of result.criteria) {
			const native = parseTest(JSON.stringify(criterion.definition));
			expect(native.assert).toHaveLength(1);
			expect(Object.keys(native.assert[0]!)).toEqual(['id', 'description', 'error', 'reason']);
			expect(typeof native.assert[0]!.reason).toBe('string');
			expect(native.assert[0]!.reason).toContain('complete supplied packet');
		}
	}
});
test('ternary boundaries preserve insufficient confidence as uncertainty', () => {
	expect(classifyAcceptance(0.2)).toBe('fail');
	expect(classifyAcceptance(0.8)).toBe('pass');
	for (const value of [0.21, 0.5, 0.79]) expect(classifyAcceptance(value)).toBe('uncertain');
	for (const value of [NaN, Infinity, -0.1, 1.1]) expect(() => classifyAcceptance(value)).toThrow();
	const uncertain = checks(0.79),
		assessment = deriveIsolatedAssessment(uncertain);
	expect(Object.values(assessment.dimensions).every((d) => d.grade === null)).toBe(true);
	expect(assessment.integrated.disposition).toBe('hold-for-review');
	expect(assessment.integrated.supportedHardBreaches).toEqual([]);
});
test('only determined monotone patterns establish exact ordinal grades', () => {
	const expected = new Map<string, 0 | 1 | 2 | 3>([
		['000', 0],
		['100', 1],
		['110', 2],
		['111', 3]
	]);
	for (let pattern = 0; pattern < 8; pattern++) {
		const bits = pattern.toString(2).padStart(3, '0'),
			rows = checks();
		for (const check of rows.filter((c) => c.dimensionId === dimensionIds[0]))
			setScore(check, bits[check.level! - 1] === '1' ? 0.9 : 0.1);
		const result = deriveIsolatedAssessment(rows).dimensions[dimensionIds[0]];
		expect(result.grade).toBe(expected.get(bits) ?? null);
		expect(result.state).toBe(expected.has(bits) ? 'determinate' : 'nonmonotone');
	}
});
test('readiness needs all minimum levels, critical absence and clear authority without contradictions', () => {
	expect(deriveIsolatedAssessment(checks()).integrated.disposition).toBe('ready');
	const breach = checks();
	setScore(
		breach.find((c) => c.kind === 'breach-absence')!,
		0.1
	);
	expect(deriveIsolatedAssessment(breach).integrated.disposition).toBe('hold-for-review');
	setScore(
		breach.find((c) => c.kind === 'draft-ready')!,
		0.1
	);
	expect(deriveIsolatedAssessment(breach).integrated.disposition).toBe('revise');
	expect(deriveIsolatedAssessment(breach).integrated.supportedHardBreaches).toHaveLength(1);
	const unknown = checks();
	setScore(
		unknown.find((c) => c.kind === 'breach-absence')!,
		0.5
	);
	expect(deriveIsolatedAssessment(unknown).integrated.disposition).toBe('hold-for-review');
	const authority = checks();
	setScore(
		authority.find((c) => c.kind === 'authority-clarity')!,
		0.1
	);
	expect(deriveIsolatedAssessment(authority).integrated.state).toBe('material-authority-conflict');
	const low = checks();
	for (const c of low.filter((c) => c.dimensionId === dimensionIds[0] && c.level! >= 2))
		setScore(c, 0.1);
	expect(deriveIsolatedAssessment(low).integrated.disposition).toBe('hold-for-review');
	setScore(
		low.find((c) => c.kind === 'draft-ready')!,
		0.1
	);
	expect(deriveIsolatedAssessment(low).integrated.disposition).toBe('revise');
});
test('native loader and real assertion runtime invoke exactly24 isolated full-context reason calls', async () =>
	withDirectory(async (directory) => {
		const requests: { input: string; criterion: string }[] = [];
		const engines: AgentTestEngines = {
			glob: async () => {
				throw new Error('glob');
			},
			grep: async () => {
				throw new Error('grep');
			},
			decide: async () => {
				throw new Error('decide');
			},
			reason: async (input, criterion) => {
				requests.push({ input, criterion: String(criterion) });
				return 0.9;
			}
		};
		const cwd = process.cwd();
		const result = await runIsolatedJudge({ packet, directory, config, env: {}, engines });
		expect(process.cwd()).toBe(cwd);
		expect(result.calls).toBe(24);
		expect(result.integrated.disposition).toBe('ready');
		expect(requests).toHaveLength(24);
		expect(new Set(requests.map((r) => r.criterion)).size).toBe(24);
		expect(requests.every((r) => r.input === packet)).toBe(true);
		expect(result.checks.every((c) => c.nativeFlagged === false && c.score === 0.9)).toBe(true);
		for (const criterion of compilation.criteria)
			expect(
				parseTest(readFileSync(join(directory, '.agents/tests', criterion.id, 'test.yaml'), 'utf8'))
			).toEqual(criterion.definition);
		await expect(runIsolatedJudge({ packet, directory, config, env: {}, engines })).rejects.toThrow(
			'already exist'
		);
	}));
test('native runtime findings remain distinct from uncertain negative support and engine failures', async () =>
	withDirectory(async (directory) => {
		let calls = 0;
		const engines: AgentTestEngines = {
			glob: async () => 0,
			grep: async () => 0,
			decide: async () => 0,
			reason: async () => {
				calls++;
				if (calls === 1) throw new Error('provider secret should not leak');
				return 0.79;
			}
		};
		const result = await runIsolatedJudge({ packet, directory, config, env: {}, engines });
		expect(result.calls).toBe(24);
		expect(result.checks[0]?.acceptance).toBe('error');
		expect(result.checks[0]?.score).toBeNull();
		expect(result.checks[1]?.nativeFlagged).toBe(true);
		expect(result.checks[1]?.acceptance).toBe('uncertain');
		expect(result.dimensions[dimensionIds[0]].grade).toBeNull();
		expect(result.integrated.disposition).toBe('hold-for-review');
		expect(JSON.stringify(result)).not.toContain('provider secret');
	}));
test('hard logical budget and abort cannot generate missing scores as grade0 or readiness', async () =>
	withDirectory(async (directory) => {
		let calls = 0;
		const engines: AgentTestEngines = {
			glob: async () => 0,
			grep: async () => 0,
			decide: async () => 0,
			reason: async () => {
				calls++;
				return 0.1;
			}
		};
		const result = await runIsolatedJudge({
			packet,
			directory,
			config,
			env: {},
			engines,
			maxCalls: 2
		});
		expect(calls).toBe(2);
		expect(result.checks.filter((c) => c.acceptance === 'not-run')).toHaveLength(22);
		expect(result.dimensions[dimensionIds[0]].grade).toBeNull();
		expect(result.integrated.disposition).toBe('hold-for-review');
	}));
test('aborted candidate never calls an engine or manufactures a grade', async () =>
	withDirectory(async (directory) => {
		let calls = 0;
		const controller = new AbortController();
		controller.abort();
		const engines: AgentTestEngines = {
			glob: async () => 0,
			grep: async () => 0,
			decide: async () => 0,
			reason: async () => {
				calls++;
				return 0;
			}
		};
		const result = await runIsolatedJudge({
			packet,
			directory,
			config,
			env: {},
			engines,
			signal: controller.signal
		});
		expect(calls).toBe(0);
		expect(result.calls).toBe(0);
		expect(
			result.checks.every((check) => check.acceptance === 'not-run' && check.error === 'aborted')
		).toBe(true);
		expect(Object.values(result.dimensions).every((dimension) => dimension.grade === null)).toBe(
			true
		);
		expect(result.integrated.disposition).toBe('hold-for-review');
	}));
test('uncertainty only between adequate and excellent preserves the certified readiness floor', () => {
	const rows = checks();
	for (const check of rows.filter((c) => c.kind === 'dimension-level' && c.level === 3))
		setScore(check, 0.5);
	const result = deriveIsolatedAssessment(rows);
	for (const dimension of Object.values(result.dimensions)) {
		expect(dimension.grade).toBeNull();
		expect(dimension.state).toBe('uncertain');
		expect(dimension.certifiedFloor).toBe(2);
		expect(dimension.possibleCeiling).toBe(3);
	}
	expect(result.integrated.disposition).toBe('ready');
});
test('intervals that straddle readiness, incomplete results and conflicting bounds cannot certify readiness', () => {
	const uncertain = deriveIsolatedAssessment(checks(0.5));
	expect(uncertain.dimensions[dimensionIds[0]].certifiedFloor).toBe(0);
	expect(uncertain.dimensions[dimensionIds[0]].possibleCeiling).toBe(3);
	expect(uncertain.integrated.disposition).toBe('hold-for-review');
	const rows = checks();
	for (const check of rows.filter((c) => c.dimensionId === dimensionIds[0] && c.level! >= 2))
		setScore(check, 0.5);
	const straddled = deriveIsolatedAssessment(rows);
	expect(straddled.dimensions[dimensionIds[0]].certifiedFloor).toBe(1);
	expect(straddled.dimensions[dimensionIds[0]].possibleCeiling).toBe(3);
	expect(straddled.integrated.disposition).toBe('hold-for-review');
	const missing = checks();
	const last = missing.find((c) => c.dimensionId === dimensionIds[0] && c.level === 3)!;
	last.score = null;
	last.acceptance = 'error';
	last.error = 'reason-engine-error';
	last.nativeFlagged = null;
	const incomplete = deriveIsolatedAssessment(missing);
	expect(incomplete.dimensions[dimensionIds[0]].certifiedFloor).toBe(2);
	expect(incomplete.dimensions[dimensionIds[0]].state).toBe('incomplete');
	expect(incomplete.integrated.disposition).toBe('hold-for-review');
	const conflict = checks();
	setScore(
		conflict.find((c) => c.dimensionId === dimensionIds[0] && c.level === 1)!,
		0.1
	);
	const contradiction = deriveIsolatedAssessment(conflict);
	expect(contradiction.dimensions[dimensionIds[0]].state).toBe('nonmonotone');
	expect(contradiction.dimensions[dimensionIds[0]].certifiedFloor).toBeNull();
	expect(contradiction.dimensions[dimensionIds[0]].possibleCeiling).toBeNull();
	expect(contradiction.integrated.disposition).toBe('hold-for-review');
});
test('redundant uncertain checks can leave exact bounds, but absent checks cannot manufacture a grade', () => {
	const rows = checks();
	setScore(
		rows.find((c) => c.dimensionId === dimensionIds[0] && c.level === 1)!,
		0.5
	);
	const result = deriveIsolatedAssessment(rows);
	expect(result.dimensions[dimensionIds[0]].grade).toBe(3);
	expect(result.integrated.disposition).toBe('ready');
	const missing = rows.find((c) => c.dimensionId === dimensionIds[0] && c.level === 1)!;
	missing.score = null;
	missing.acceptance = 'not-run';
	missing.nativeFlagged = null;
	const incomplete = deriveIsolatedAssessment(rows);
	expect(incomplete.dimensions[dimensionIds[0]].grade).toBeNull();
	expect(incomplete.dimensions[dimensionIds[0]].state).toBe('incomplete');
	expect(incomplete.integrated.disposition).toBe('hold-for-review');
});
