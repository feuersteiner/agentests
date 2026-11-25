import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	writeFileSync
} from 'node:fs';
import { resolve } from 'node:path';
import {
	AssertOrchestrator,
	InMemorySource,
	createEngines,
	loadDefinitions,
	parseTest
} from '../../../core/dist/index.js';
import type { AgentTestConfig, AgentTestEngines, AgentTestEnv } from '../../../core/dist/types.js';
import { dimensionIds, sha256 } from '../../v2/workbench/dossier.ts';
import {
	compileIsolatedCriteria,
	isolatedProtocol,
	isolatedThresholds
} from './isolated-criteria.ts';
import type { DimensionId, IsolatedCompilation, IsolatedCriterion } from './isolated-criteria.ts';

export type Acceptance = 'pass' | 'fail' | 'uncertain' | 'error' | 'not-run';
export interface IsolatedCheckResult {
	id: string;
	kind: IsolatedCriterion['kind'];
	dimensionId?: DimensionId;
	level?: 1 | 2 | 3;
	breachCode?: string;
	score: number | null;
	acceptance: Acceptance;
	nativeFlagged: boolean | null;
	startedAt: string | null;
	finishedAt: string | null;
	error: 'reason-engine-error' | 'call-budget' | 'aborted' | null;
}
export interface OrdinalResult {
	grade: 0 | 1 | 2 | 3 | null;
	/** Logical bounds from determinate anchored checks, never rounded scores. */
	certifiedFloor: 0 | 1 | 2 | 3 | null;
	possibleCeiling: 0 | 1 | 2 | 3 | null;
	state: 'determinate' | 'incomplete' | 'uncertain' | 'nonmonotone';
	checks: string[];
}
export interface IsolatedAssessment {
	protocol: typeof isolatedProtocol;
	dimensions: Record<DimensionId, OrdinalResult>;
	integrated: {
		disposition: 'ready' | 'revise' | 'hold-for-review';
		state:
			| 'certified-ready'
			| 'supported-correction'
			| 'material-authority-conflict'
			| 'judgment-unresolved';
		supportedHardBreaches: string[];
		uncertainHardBreaches: string[];
		reasons: string[];
	};
}
export interface IsolatedJudgeResult extends IsolatedAssessment {
	packetSha256: string;
	criterionSetSha256: string;
	checks: IsolatedCheckResult[];
	calls: number;
	maxCalls: number;
	coverage: IsolatedCompilation['coverage'];
	capabilities: IsolatedCompilation['capabilities'];
}
export const classifyAcceptance = (score: number): 'pass' | 'fail' | 'uncertain' => {
	if (!Number.isFinite(score) || score < 0 || score > 1)
		throw new Error('Invalid native reason score');
	return score >= isolatedThresholds.pass
		? 'pass'
		: score <= isolatedThresholds.fail
			? 'fail'
			: 'uncertain';
};
/** Native findings certify the .8 boundary; the separate conservative fail boundary
 * avoids interpreting an insufficiently confident native assertion as its opposite. */
export const deriveIsolatedAssessment = (
	checks: readonly IsolatedCheckResult[]
): IsolatedAssessment => {
	if (new Set(checks.map((c) => c.id)).size !== checks.length)
		throw new Error('Duplicate check result');
	const dimensions = Object.fromEntries(
		dimensionIds.map((id) => {
			const levels = [1, 2, 3].map((level) =>
				checks.find(
					(c) => c.kind === 'dimension-level' && c.dimensionId === id && c.level === level
				)
			);
			const acceptances = levels.map((c) => c?.acceptance ?? 'not-run');
			const lower = Math.max(
				0,
				...acceptances.flatMap((acceptance, i) => (acceptance === 'pass' ? [i + 1] : []))
			);
			const upper = Math.min(
				3,
				...acceptances.flatMap((acceptance, i) => (acceptance === 'fail' ? [i] : []))
			);
			const conflicting = lower > upper;
			const incomplete = acceptances.some((v) => v === 'error' || v === 'not-run');
			const state: OrdinalResult['state'] = conflicting
				? 'nonmonotone'
				: incomplete
					? 'incomplete'
					: lower === upper
						? 'determinate'
						: 'uncertain';
			const certifiedFloor = conflicting ? null : (lower as 0 | 1 | 2 | 3);
			const possibleCeiling = conflicting ? null : (upper as 0 | 1 | 2 | 3);
			const grade = state === 'determinate' ? certifiedFloor : null;
			return [
				id,
				{
					grade,
					certifiedFloor,
					possibleCeiling,
					state,
					checks: levels.flatMap((c) => (c ? [c.id] : []))
				} satisfies OrdinalResult
			];
		})
	) as Record<DimensionId, OrdinalResult>;
	const critical = checks.filter((c) => c.kind === 'breach-absence');
	const authority = checks.find((c) => c.kind === 'authority-clarity');
	const ready = checks.find((c) => c.kind === 'draft-ready');
	const supportedHardBreaches = critical
		.filter((c) => c.acceptance === 'fail')
		.map((c) => c.breachCode!);
	const uncertainHardBreaches = critical
		.filter((c) => !['pass', 'fail'].includes(c.acceptance))
		.map((c) => c.breachCode!);
	const reasons: string[] = [];
	const unresolved =
		Object.values(dimensions).some(
			(d) =>
				d.state === 'incomplete' ||
				d.state === 'nonmonotone' ||
				d.certifiedFloor === null ||
				d.possibleCeiling === null ||
				(d.certifiedFloor < 2 && d.possibleCeiling >= 2)
		) ||
		critical.length !== 4 ||
		critical.some((c) => !['pass', 'fail'].includes(c.acceptance)) ||
		!authority ||
		!ready ||
		!['pass', 'fail'].includes(authority.acceptance) ||
		!['pass', 'fail'].includes(ready.acceptance);
	let disposition: IsolatedAssessment['integrated']['disposition'] = 'hold-for-review';
	let state: IsolatedAssessment['integrated']['state'] = 'judgment-unresolved';
	if (unresolved)
		reasons.push(
			'At least one required judgment is missing, invalid, nonmonotone or uncertain across the readiness boundary; no complete readiness certification is available.'
		);
	else if (authority.acceptance === 'fail') {
		state = 'material-authority-conflict';
		reasons.push(
			'A confident negative authority-clarity check requires reviewer resolution of the assessment.'
		);
	} else {
		const belowReady = Object.values(dimensions).some((d) => d.possibleCeiling! < 2);
		const defect = supportedHardBreaches.length > 0 || belowReady;
		if (ready.acceptance === 'pass' && defect)
			reasons.push(
				'The overall readiness acceptance conflicts with a supported critical issue or a dimension below the minimum acceptable anchor; the judgment is unresolved.'
			);
		else if (ready.acceptance === 'pass') {
			disposition = 'ready';
			state = 'certified-ready';
			reasons.push(
				'Every dimension has a certified floor of at least level2, all critical-absence and authority-clarity checks pass, and overall draft readiness passes.'
			);
		} else {
			disposition = 'revise';
			state = 'supported-correction';
			reasons.push(
				'Readiness is confidently rejected while authority is clear; the submitted draft requires correction.'
			);
		}
	}
	return {
		protocol: isolatedProtocol,
		dimensions,
		integrated: { disposition, state, supportedHardBreaches, uncertainHardBreaches, reasons }
	};
};

/** Writes native Tests only into a fresh private directory. JSON is valid YAML and
 * goes through the shipped YAML parser, schema validator and folder loader. */
export const materializeIsolatedTests = (
	packet: string,
	directory: string
): IsolatedCompilation => {
	const compilation = compileIsolatedCriteria(packet),
		root = resolve(directory);
	mkdirSync(root, { recursive: true, mode: 0o700 });
	if (realpathSync(root) !== root) throw new Error('Unsafe native Test directory');
	const agentRoot = resolve(root, '.agents');
	if (
		existsSync(agentRoot) &&
		(lstatSync(agentRoot).isSymbolicLink() || realpathSync(agentRoot) !== agentRoot)
	)
		throw new Error('Unsafe native Test parent');
	const testRoot = resolve(agentRoot, 'tests');
	if (existsSync(testRoot)) throw new Error('Native Tests already exist; no overwrite or replay');
	mkdirSync(testRoot, { recursive: true, mode: 0o700 });
	for (const criterion of compilation.criteria) {
		const folder = resolve(testRoot, criterion.id);
		mkdirSync(folder, { mode: 0o700 });
		const yaml = JSON.stringify(criterion.definition, null, 2) + '\n';
		writeFileSync(resolve(folder, 'test.yaml'), yaml, { flag: 'wx', mode: 0o600 });
		parseTest(yaml);
	}
	// The public loader uses cwd. Keep the cwd change wholly synchronous and
	// restore it before any request, callback or asynchronous operation.
	const original = process.cwd();
	try {
		process.chdir(root);
		const loaded = loadDefinitions();
		if (
			loaded.length !== compilation.criteria.length ||
			loaded.some(
				(test) =>
					JSON.stringify(test) !==
					JSON.stringify(compilation.criteria.find((c) => c.id === test.id)?.definition)
			)
		)
			throw new Error('Native Test loader mismatch');
	} finally {
		process.chdir(original);
	}
	return compilation;
};
export interface IsolatedJudgeOptions {
	packet: string;
	directory: string;
	config: AgentTestConfig;
	env: AgentTestEnv;
	maxCalls?: number;
	signal?: AbortSignal;
	/** Offline tests only. Production callers leave the native createEngines path. */
	engines?: AgentTestEngines;
	onCriterionStart?: (criterion: IsolatedCriterion, inputSha256: string) => void | Promise<void>;
	onResult?: (result: IsolatedCheckResult) => void | Promise<void>;
}
/** Runs one actual native reason-only Test at a time, using exactly the same
 * complete source and no prior score, finding or judgment as provider input. */
export const runIsolatedJudge = async (
	options: IsolatedJudgeOptions
): Promise<IsolatedJudgeResult> => {
	const maxCalls = options.maxCalls ?? 24;
	if (!Number.isInteger(maxCalls) || maxCalls < 0 || maxCalls > 24)
		throw new Error('Invalid isolated logical call budget');
	if (options.config.assert.threshold !== isolatedThresholds.pass)
		throw new Error('Isolated native assertion threshold must remain0.8');
	const compilation = materializeIsolatedTests(options.packet, options.directory);
	const engines = options.engines ?? createEngines(options.config, options.env);
	const checks: IsolatedCheckResult[] = [];
	let calls = 0;
	for (const criterion of compilation.criteria) {
		const { id, kind, dimensionId, level, breachCode } = criterion;
		const result: IsolatedCheckResult = {
			id,
			kind,
			dimensionId,
			level,
			breachCode,
			score: null,
			acceptance: 'not-run',
			nativeFlagged: null,
			startedAt: null,
			finishedAt: null,
			error: null
		};
		if (options.signal?.aborted || calls >= maxCalls) {
			result.error = options.signal?.aborted ? 'aborted' : 'call-budget';
			checks.push(result);
			await options.onResult?.(result);
			continue;
		}
		// Re-read the actual native Test rather than bypassing it with an ad-hoc criterion.
		const path = resolve(options.directory, '.agents/tests', id, 'test.yaml');
		if (lstatSync(path).isSymbolicLink()) throw new Error('Unsafe native Test file');
		const definition = parseTest(readFileSync(path, 'utf8'));
		if (JSON.stringify(definition) !== JSON.stringify(criterion.definition))
			throw new Error('Native Test changed after compilation');
		await options.onCriterionStart?.(criterion, compilation.packetSha256);
		result.startedAt = new Date().toISOString();
		let observed = false;
		const observedEngines: AgentTestEngines = {
			...engines,
			decide: async () => {
				throw new Error('Decision engine is forbidden in isolated judge');
			},
			reason: async (input, reason) => {
				if (
					observed ||
					calls >= maxCalls ||
					input !== options.packet ||
					typeof reason !== 'string' ||
					reason !== definition.assert[0]?.reason
				)
					throw new Error('Native isolated request invariant');
				observed = true;
				calls++;
				const score = await engines.reason(input, reason);
				classifyAcceptance(score);
				result.score = score;
				return score;
			}
		};
		try {
			const findings = await new AssertOrchestrator(
				observedEngines,
				options.config.assert,
				() => {}
			).run(definition.assert, [new InMemorySource('candidate.json', options.packet)]);
			if (!observed || result.score === null || findings.length > 1)
				throw new Error('Missing native judgment');
			result.nativeFlagged = findings.length === 1;
			result.acceptance = classifyAcceptance(result.score);
			if (result.nativeFlagged !== result.score < isolatedThresholds.pass)
				throw new Error('Native finding disagreement');
		} catch {
			result.score = null;
			result.nativeFlagged = null;
			result.acceptance = 'error';
			result.error = 'reason-engine-error';
		}
		result.finishedAt = new Date().toISOString();
		checks.push(result);
		await options.onResult?.(result);
	}
	return {
		...deriveIsolatedAssessment(checks),
		packetSha256: compilation.packetSha256,
		criterionSetSha256: sha256(JSON.stringify(compilation.criteria)),
		checks,
		calls,
		maxCalls,
		coverage: compilation.coverage,
		capabilities: compilation.capabilities
	};
};
