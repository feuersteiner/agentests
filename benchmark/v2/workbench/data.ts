import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateConfig, validateTest } from '../../../core/dist/index.js';
import type { AgentTestConfig, AgentTestDefinition } from '../../../core/dist/types.js';

export const v2Directory = fileURLToPath(new URL('../', import.meta.url));
export const coreDirectory = fileURLToPath(new URL('../../../core/', import.meta.url));
export const defaultModelsFile = fileURLToPath(new URL('./models.json', import.meta.url));
const pilotDirectory = resolve(v2Directory, 'pilot');

export type Verdict = 'pass' | 'fail';
export interface Expectation {
	verdict: Verdict;
	rationale: string;
}
export interface CaseRecord {
	id: string;
	context: {
		product: string;
		customerRequest: string;
		verifiedFacts: string[];
		priorCommitments: string[];
		exceptionApproval: null | { authority: string; scope: string; record: string };
	};
	completedReply: string;
}
export interface EvaluationInput {
	caseId: string;
	packet: string;
	sha256: string;
}
export interface Manifest {
	id: string;
	status: string;
	labelStatus: string;
	caseIds: string[];
	threshold: number;
	defaultRepeat: number;
	cases: string;
	expectations: string;
	test: string;
}
export interface PreparedPilot {
	manifest: Manifest;
	inputs: EvaluationInput[];
	test: AgentTestDefinition;
}

export const hash = (text: string): string => createHash('sha256').update(text).digest('hex');
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const demand: (condition: unknown, message: string) => asserts condition = (condition, message) => {
	if (!condition) throw new Error(message);
};
const object = (value: unknown): Record<string, unknown> => {
	demand(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected object');
	return value as Record<string, unknown>;
};
const exactKeys = (value: Record<string, unknown>, keys: string[]): void => {
	demand(
		Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)),
		'Unexpected or missing data fields'
	);
};
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);

/** Allowlist the evidence fields: expectations and reviewer commentary cannot enter the packet. */
export const packageEvidence = (record: CaseRecord): EvaluationInput => {
	const { product, customerRequest, verifiedFacts, priorCommitments, exceptionApproval } =
		record.context;
	const packet = JSON.stringify({
		context: {
			product,
			customerRequest,
			verifiedFacts,
			priorCommitments,
			exceptionApproval: exceptionApproval
				? {
						authority: exceptionApproval.authority,
						scope: exceptionApproval.scope,
						record: exceptionApproval.record
					}
				: null
		},
		completedReply: record.completedReply
	});
	return { caseId: record.id, packet, sha256: hash(packet) };
};

export const loadManifest = (): Manifest => {
	const value = object(readJson(resolve(pilotDirectory, 'manifest.json')));
	exactKeys(value, [
		'id',
		'status',
		'labelStatus',
		'caseIds',
		'threshold',
		'defaultRepeat',
		'cases',
		'expectations',
		'test'
	]);
	demand(text(value.id), 'Missing pilot ID');
	demand(value.status === 'development-data-not-run', 'Unexpected pilot status');
	demand(
		value.labelStatus === 'synthetic-provisional-not-human-reviewed',
		'Unexpected label status'
	);
	demand(strings(value.caseIds) && value.caseIds.length === 5, 'Pilot requires exactly five IDs');
	demand(new Set(value.caseIds).size === 5, 'Case IDs must be unique');
	demand(
		value.threshold === 0.5 && value.defaultRepeat === 1,
		'Pilot settings changed; version protocol first'
	);
	demand(
		value.cases === 'cases.json' &&
			value.expectations === 'expectations.json' &&
			value.test === 'test.json',
		'Unexpected pilot paths'
	);
	return value as unknown as Manifest;
};

export const loadExpectations = (ids: string[]): Record<string, Expectation> => {
	const value = object(readJson(resolve(pilotDirectory, 'expectations.json')));
	exactKeys(value, ids);
	for (const id of ids) {
		const expected = object(value[id]);
		exactKeys(expected, ['verdict', 'rationale']);
		demand(expected.verdict === 'pass' || expected.verdict === 'fail', 'Invalid expected verdict');
		demand(text(expected.rationale), 'Missing independent rationale');
	}
	return value as unknown as Record<string, Expectation>;
};

/** Offline only. No provider construction and no environment access. */
export const preparePilot = (): PreparedPilot => {
	const manifest = loadManifest();
	const values = readJson(resolve(pilotDirectory, manifest.cases));
	demand(Array.isArray(values) && values.length === 5, 'Pilot requires exactly five case records');
	const records = values.map((entry) => {
		const record = object(entry);
		exactKeys(record, ['id', 'context', 'completedReply']);
		demand(text(record.id) && text(record.completedReply), 'Missing case ID or completed reply');
		const context = object(record.context);
		exactKeys(context, [
			'product',
			'customerRequest',
			'verifiedFacts',
			'priorCommitments',
			'exceptionApproval'
		]);
		demand(text(context.product) && text(context.customerRequest), 'Missing case context');
		demand(
			strings(context.verifiedFacts) && context.verifiedFacts.length > 0,
			'Missing verified facts'
		);
		demand(strings(context.priorCommitments), 'Invalid prior commitments');
		if (context.exceptionApproval !== null) {
			const approval = object(context.exceptionApproval);
			exactKeys(approval, ['authority', 'scope', 'record']);
			demand(Object.values(approval).every(text), 'Invalid exception evidence');
		}
		return record as unknown as CaseRecord;
	});
	demand(
		records.every((record, index) => record.id === manifest.caseIds[index]),
		'Case IDs/order must exactly match manifest'
	);
	loadExpectations(manifest.caseIds);
	const test = validateTest(readJson(resolve(pilotDirectory, manifest.test)));
	demand(
		test.select === undefined && test.assert.length === 1,
		'Pilot evaluates every packet once'
	);
	const assertion = test.assert[0]!;
	demand(
		typeof assertion.decide === 'string' &&
			assertion.grep === undefined &&
			assertion.reason === undefined,
		'Pilot requires one decision-only assertion, without filtering or fallback'
	);
	return { manifest, inputs: records.map(packageEvidence), test };
};

export type ModelProfiles = Record<string, AgentTestConfig>;
export const loadModels = (path: string, threshold: number): ModelProfiles => {
	const definitions = object(readJson(path));
	exactKeys(definitions, ['luna', 'jev']);
	return Object.fromEntries(
		Object.entries(definitions).map(([name, value]) => {
			const decision = object(value);
			const config = validateConfig({
				decision,
				// Required by createEngines even though no reason assertion exists. Never invoked.
				reasoning: { ...decision, api: 'openai' },
				select: { threshold },
				assert: { threshold }
			});
			demand(
				config.decision.api === (name === 'luna' ? 'openai' : 'jev'),
				'Profile/provider mismatch'
			);
			return [name, config];
		})
	);
};
