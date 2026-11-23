import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const dossierDirectory = fileURLToPath(
	new URL('../pilot/complex-support-01/', import.meta.url)
);
export const dimensionIds = [
	'policyAuthority',
	'factualCommitments',
	'supportUsefulness',
	'brandTone',
	'salesEthics',
	'integratedConsistency'
] as const;
type JsonObject = Record<string, unknown>;
interface FileRef {
	path: string;
	sha256: string;
}
interface DocumentRef extends FileRef {
	id: string;
	version: string;
}
interface CandidateRef extends FileRef {
	id: string;
}
interface Manifest {
	formatVersion: string;
	scenarioId: string;
	scenarioCount: number;
	status: string;
	labelStatus: string;
	inputs: Record<'task' | 'rubric' | 'responseSchema', FileRef>;
	documents: DocumentRef[];
	candidates: CandidateRef[];
	provenance: Record<'sources' | 'summary', FileRef>;
	reviewer: FileRef;
	contextMeasurement: JsonObject;
}
export interface Span {
	id: string;
	text: string;
}
export interface Candidate {
	externalReply: Span[];
	internalPlan: Span[];
}
interface Document {
	id: string;
	version: string;
	content: string;
}
export interface Dossier {
	manifest: Manifest;
	task: JsonObject;
	rubric: JsonObject;
	responseSchema: JsonObject;
	context: Document[];
	candidates: { id: string; content: Candidate }[];
}
export const sha256 = (value: string | Buffer): string =>
	createHash('sha256').update(value).digest('hex');
export const measure = (value: string) => ({
	bytes: Buffer.byteLength(value, 'utf8'),
	words: value.trim() ? value.trim().split(/\s+/u).length : 0
});
const demand: (condition: unknown, message: string) => asserts condition = (condition, message) => {
	if (!condition) throw new Error(message);
};
const object = (value: unknown): JsonObject => {
	demand(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected object');
	return value as JsonObject;
};
const nonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const array = (value: unknown): unknown[] => {
	demand(Array.isArray(value), 'Expected array');
	return value;
};
const keys = (value: JsonObject, expected: readonly string[]) => {
	demand(
		Object.keys(value).length === expected.length &&
			expected.every((key) => Object.hasOwn(value, key)),
		'Unexpected contract fields'
	);
};
const unique = (values: unknown[]) =>
	demand(new Set(values).size === values.length, 'Duplicate ID or reference');
const json = (value: string): unknown => JSON.parse(value);
const safeFile = (directory: string, path: string): string => {
	demand(nonempty(path) && !isAbsolute(path), 'Expected relative fixture path');
	const base = realpathSync(directory);
	const target = realpathSync(resolve(base, path));
	const rel = relative(base, target);
	demand(rel !== '' && !rel.startsWith('..') && !isAbsolute(rel), 'Fixture path escapes dossier');
	return target;
};
const readRef = (directory: string, ref: FileRef): string => {
	demand(nonempty(ref.path) && /^[a-f0-9]{64}$/u.test(ref.sha256), 'Invalid frozen file reference');
	const bytes = readFileSync(safeFile(directory, ref.path));
	demand(sha256(bytes) === ref.sha256, `Frozen hash mismatch: ${ref.path}`);
	return bytes.toString('utf8');
};
const refList = (value: unknown, known: Set<string>, minimum = 1): string[] => {
	const values = array(value);
	demand(
		values.length >= minimum && values.every((id) => nonempty(id) && known.has(id)),
		'Unknown or missing evidence/span reference'
	);
	unique(values);
	return values as string[];
};

/** Explicit input allowlist. Unknown annotations can never become evaluator input. */
export const pickCandidate = (value: unknown): Candidate => {
	const record = object(value);
	const pickSpans = (value: unknown, prefix: string): Span[] => {
		const spans = array(value).map((entry, index) => {
			const span = object(entry);
			demand(
				span.id === `${prefix}-${String(index + 1).padStart(2, '0')}` && nonempty(span.text),
				'Invalid candidate span'
			);
			return { id: span.id as string, text: span.text };
		});
		demand(spans.length > 0, 'Missing reply or internal plan');
		return spans;
	};
	return {
		externalReply: pickSpans(record.externalReply, 'reply'),
		internalPlan: pickSpans(record.internalPlan, 'plan')
	};
};

const validateGradeContract = (schema: JsonObject, rubric: JsonObject) => {
	keys(rubric, [
		'version',
		'scale',
		'dimensions',
		'evidenceRules',
		'dispositions',
		'hardBreaches',
		'permittedAlternatives',
		'knownTensions',
		'outputContract'
	]);
	demand(
		nonempty(rubric.scale) && nonempty(rubric.outputContract),
		'Missing normative rubric text'
	);
	for (const field of ['evidenceRules', 'knownTensions'])
		demand(
			array(rubric[field]).length > 0 && array(rubric[field]).every(nonempty),
			'Invalid rubric text array'
		);
	for (const breach of array(rubric.hardBreaches)) {
		const item = object(breach);
		keys(item, ['code', 'effect']);
		demand(nonempty(item.code) && nonempty(item.effect), 'Invalid normative hard breach');
	}
	for (const alternative of array(rubric.permittedAlternatives)) {
		const principle = object(alternative);
		keys(principle, ['description', 'limits']);
		demand(
			nonempty(principle.description) && nonempty(principle.limits),
			'Invalid general alternatives principle'
		);
	}
	demand(
		schema.$schema === 'https://json-schema.org/draft/2020-12/schema',
		'Unsupported response schema version'
	);
	const inspect = (node: JsonObject): void => {
		const metadata = node === schema ? ['$schema', '$id'] : [];
		if (node.type === 'object') {
			keys(node, [...metadata, 'type', 'additionalProperties', 'required', 'properties']);
			const properties = object(node.properties);
			demand(
				node.additionalProperties === false &&
					JSON.stringify(node.required) === JSON.stringify(Object.keys(properties)),
				'Response objects must require their exact fields'
			);
			Object.values(properties).forEach((child) => inspect(object(child)));
		} else if (node.type === 'array') {
			keys(node, ['type', 'minItems', 'items', 'uniqueItems']);
			demand(
				Number.isInteger(node.minItems) &&
					(node.minItems as number) >= 0 &&
					node.uniqueItems === true,
				'Invalid response array contract'
			);
			inspect(object(node.items));
		} else {
			const fields =
				node.type === 'integer'
					? ['type', 'minimum', 'maximum']
					: node.type === 'string'
						? ['type', node.pattern ? 'pattern' : 'minLength']
						: node.enum
							? ['enum']
							: ['const'];
			keys(node, fields);
			demand(
				['integer', 'string'].includes(node.type as string) ||
					Array.isArray(node.enum) ||
					Object.hasOwn(node, 'const'),
				'Unsupported response schema node'
			);
			if (node.enum)
				demand(
					array(node.enum).length > 0 && array(node.enum).every(nonempty),
					'Invalid response enum'
				);
			if (node.pattern) {
				demand(nonempty(node.pattern), 'Invalid response reference pattern');
				new RegExp(node.pattern, 'u');
			}
		}
	};
	inspect(schema);
	const top = object(schema.properties);
	keys(top, ['schemaVersion', 'dimensions', 'integrated']);
	demand(object(top.schemaVersion).const === '1.0', 'Invalid assessment schema version');
	const dimensions = object(object(top.dimensions).properties);
	keys(dimensions, dimensionIds);
	for (const id of dimensionIds) {
		const definition = object(dimensions[id]);
		const fields = object(definition.properties);
		keys(fields, ['grade', 'rationale', 'evidenceIds', 'candidateSpans', 'confidence']);
		const grade = object(fields.grade);
		demand(
			grade.type === 'integer' && grade.minimum === 0 && grade.maximum === 3,
			'Grade schema must use ordinal 0..3'
		);
		demand(object(fields.confidence).type === 'object', 'Confidence must be separate from grade');
		const confidence = object(object(fields.confidence).properties);
		keys(confidence, ['level', 'rationale']);
		demand(
			JSON.stringify(object(confidence.level).enum) === JSON.stringify(['low', 'medium', 'high']),
			'Invalid confidence contract'
		);
		for (const [field, pattern] of [
			['evidenceIds', '^E[0-9]{2}$'],
			['candidateSpans', '^(reply|plan)-[0-9]{2}$']
		]) {
			const citation = object(fields[field!]);
			demand(
				citation.type === 'array' &&
					citation.minItems === 1 &&
					object(citation.items).pattern === pattern,
				'Missing grade citation requirement'
			);
		}
		demand(
			definition.additionalProperties === false &&
				JSON.stringify(definition.required) === JSON.stringify(Object.keys(fields)),
			'Incomplete grade contract'
		);
	}
	const definitions = array(rubric.dimensions).map(object);
	demand(definitions.length === dimensionIds.length, 'Missing rubric dimension');
	demand(
		definitions.every((definition, index) => definition.id === dimensionIds[index]),
		'Rubric dimension order mismatch'
	);
	for (const definition of definitions) {
		keys(definition, ['id', 'title', 'anchors']);
		demand(nonempty(definition.title), 'Missing rubric title');
		const anchors = object(definition.anchors);
		keys(anchors, ['0', '1', '2', '3']);
		demand(Object.values(anchors).every(nonempty), 'Every grade needs an anchor');
	}
	keys(object(rubric.dispositions), ['ready', 'revise', 'hold-for-review']);
	demand(Object.values(object(rubric.dispositions)).every(nonempty), 'Invalid disposition anchor');
	const integrated = object(object(top.integrated).properties);
	keys(integrated, [
		'disposition',
		'rationale',
		'evidenceIds',
		'candidateSpans',
		'hardBreaches',
		'uncertainties',
		'tradeoffs',
		'acceptableAlternatives',
		'confidence'
	]);
	demand(
		JSON.stringify(object(integrated.disposition).enum) ===
			JSON.stringify(['ready', 'revise', 'hold-for-review']),
		'Invalid integrated dispositions'
	);
};

/** No reviewer file, provider, environment lookup or network dependency. */
export const loadDossierInputs = (directory = dossierDirectory): Dossier => {
	const rawManifest = object(json(readFileSync(resolve(directory, 'manifest.json'), 'utf8')));
	keys(rawManifest, [
		'formatVersion',
		'scenarioId',
		'scenarioCount',
		'status',
		'labelStatus',
		'inputs',
		'documents',
		'candidates',
		'provenance',
		'reviewer',
		'contextMeasurement'
	]);
	demand(
		rawManifest.formatVersion === '1.0' &&
			rawManifest.scenarioId === 'complex-support-01' &&
			rawManifest.scenarioCount === 1,
		'Exactly one versioned complex scenario is required'
	);
	demand(
		rawManifest.status === 'offline-prepared-graded-evaluation-not-implemented' &&
			rawManifest.labelStatus === 'synthetic-provisional-not-human-reviewed',
		'Invalid readiness or label status'
	);
	const manifest = rawManifest as unknown as Manifest;
	keys(object(manifest.inputs), ['task', 'rubric', 'responseSchema']);
	keys(object(manifest.provenance), ['sources', 'summary']);
	const task = object(json(readRef(directory, manifest.inputs.task)));
	keys(task, [
		'version',
		'scenarioId',
		'decisionCutoff',
		'role',
		'instruction',
		'boundary',
		'inputScope'
	]);
	demand(
		Object.values(task).every(nonempty) && task.decisionCutoff === '2024-03-01T15:00:00Z',
		'Incomplete task or cutoff'
	);
	const rubric = object(json(readRef(directory, manifest.inputs.rubric)));
	const responseSchema = object(json(readRef(directory, manifest.inputs.responseSchema)));
	demand(
		task.version === '1.0' && task.scenarioId === manifest.scenarioId && rubric.version === '1.0',
		'Invalid task/rubric version'
	);
	validateGradeContract(responseSchema, rubric);
	const context = array(manifest.documents).map((entry, index) => {
		const ref = object(entry) as unknown as DocumentRef;
		demand(
			ref.id === `E${String(index + 1).padStart(2, '0')}` && nonempty(ref.version),
			'Invalid document ID/version/order'
		);
		const content = readRef(directory, ref);
		demand(
			content.startsWith(`# ${ref.id} — `) && content.includes('version:'),
			'Document header ID/version missing'
		);
		for (const version of ref.version.split('/'))
			demand(content.includes(version), 'Document header version mismatch');
		return { id: ref.id, version: ref.version, content };
	});
	demand(context.length >= 15 && context.length <= 25, 'Expected 15..25 distinct documents');
	unique(context.map((entry) => sha256(entry.content)));
	const bytes = context.reduce((sum, entry) => sum + measure(entry.content).bytes, 0);
	const words = context.reduce((sum, entry) => sum + measure(entry.content).words, 0);
	demand(
		bytes === manifest.contextMeasurement.bytes && words === manifest.contextMeasurement.words,
		'Context measurement mismatch'
	);
	demand(
		words >= 8000 &&
			manifest.contextMeasurement.tokenizer === null &&
			manifest.contextMeasurement.tokenCount === null,
		'Context/tokenizer declaration mismatch'
	);
	const candidates = array(manifest.candidates).map((entry, index) => {
		const ref = object(entry) as unknown as CandidateRef;
		demand(
			ref.id === `p${String(index + 1).padStart(2, '0')}`,
			'Candidate IDs must be neutral and ordered'
		);
		return { id: ref.id, content: pickCandidate(json(readRef(directory, ref))) };
	});
	demand(candidates.length >= 5, 'Expected multiple candidate alternatives');
	const paths = [
		...Object.values(manifest.inputs),
		...manifest.documents,
		...manifest.candidates,
		...Object.values(manifest.provenance),
		manifest.reviewer
	].map((ref) => ref.path);
	unique(paths);
	const evidenceIds = new Set(context.map((entry) => entry.id));
	for (const doc of context)
		for (const match of doc.content.matchAll(/\bE\d{2}\b/gu))
			demand(evidenceIds.has(match[0]), 'Unknown document cross-reference');

	return { manifest, task, rubric, responseSchema, context, candidates };
};

export const packageDossier = (dossier: Dossier) => {
	// Nested normative fields are strict, including every response-schema node.
	validateGradeContract(dossier.responseSchema, dossier.rubric);
	return dossier.candidates.map((candidate) => {
		const packet = JSON.stringify({
			task: {
				version: dossier.task.version,
				scenarioId: dossier.task.scenarioId,
				decisionCutoff: dossier.task.decisionCutoff,
				role: dossier.task.role,
				instruction: dossier.task.instruction,
				boundary: dossier.task.boundary,
				inputScope: dossier.task.inputScope
			},
			normativeRubric: {
				version: dossier.rubric.version,
				scale: dossier.rubric.scale,
				dimensions: dossier.rubric.dimensions,
				evidenceRules: dossier.rubric.evidenceRules,
				dispositions: dossier.rubric.dispositions,
				hardBreaches: dossier.rubric.hardBreaches,
				permittedAlternatives: dossier.rubric.permittedAlternatives,
				knownTensions: dossier.rubric.knownTensions,
				outputContract: dossier.rubric.outputContract,
				responseSchema: dossier.responseSchema
			},
			context: dossier.context.map(({ id, version, content }) => ({ id, version, content })),
			candidate: pickCandidate(candidate.content)
		});
		return { candidateId: candidate.id, packet, sha256: sha256(packet), ...measure(packet) };
	});
};

/** Full offline integrity check, including reviewer-only contract and local source representations. */
export const validateDossier = (directory = dossierDirectory): Dossier => {
	const dossier = loadDossierInputs(directory);
	const evidenceIds = new Set(dossier.context.map((entry) => entry.id));
	const sources = object(json(readRef(directory, dossier.manifest.provenance.sources)));
	demand(sources.version === '1.0', 'Invalid source registry version');
	const sourceIds = new Set<string>();
	for (const entry of array(sources.sources)) {
		const source = object(entry);
		demand(nonempty(source.id) && !sourceIds.has(source.id), 'Duplicate or invalid source ID');
		sourceIds.add(source.id);
		demand(
			nonempty(source.url) &&
				new URL(source.url).protocol === 'https:' &&
				nonempty(source.retrievalUrl) &&
				new URL(source.retrievalUrl).protocol === 'https:' &&
				nonempty(source.stableIdentifier),
			'Missing public source URL/identifier'
		);
		for (const key of ['publicationDate', 'retrievedDate'])
			demand(
				typeof source[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(source[key]),
				'Missing source date'
			);
		demand(
			nonempty(source.updateUncertainty) &&
				source.reuseBasis === 'original factual paraphrase, no transcript license asserted' &&
				source.quotesWords === 0,
			'Invalid source reuse declaration'
		);
		const representation = object(source.representation);
		const doc = dossier.context.find((doc) => doc.id === representation.documentId);
		demand(doc && nonempty(representation.paragraphPrefix), 'Unknown source representation');
		const paragraph = doc.content
			.split('\n\n')
			.find((part) => part.startsWith(representation.paragraphPrefix as string));
		demand(
			paragraph && measure(paragraph).words <= 180 && sha256(paragraph) === representation.sha256,
			'Invalid local paraphrase hash/size'
		);
		demand(
			nonempty(representation.hashScope) &&
				representation.hashScope.includes('not an original page hash'),
			'Source hash scope missing'
		);
	}
	demand(sourceIds.size === 7, 'Missing source provenance');
	const summary = object(json(readRef(directory, dossier.manifest.provenance.summary)));
	demand(summary.version === '1.0', 'Invalid summary version');
	const claims = array(summary.claims).map(object);
	unique(claims.map((claim) => claim.id));
	for (const claim of claims) {
		demand(
			nonempty(claim.id) && nonempty(claim.status) && nonempty(claim.claim),
			'Invalid summary claim'
		);
		refList(claim.evidenceIds, evidenceIds);
		refList(claim.sourceIds, sourceIds, 0);
	}
	for (const item of array(summary.uncertainties)) refList(object(item).evidenceIds, evidenceIds);
	const reviewer = object(json(readRef(directory, dossier.manifest.reviewer)));
	demand(
		reviewer.version === '1.0' && reviewer.status === dossier.manifest.labelStatus,
		'Invalid reviewer version/status'
	);
	const expectations = array(reviewer.candidateExpectations).map(object);
	demand(expectations.length === dossier.candidates.length, 'Reviewer candidate count mismatch');
	const acceptable = new Set<string>();
	for (const [index, expectation] of expectations.entries()) {
		const candidate = dossier.candidates[index]!;
		demand(
			expectation.candidateId === candidate.id &&
				typeof expectation.acceptableAsSubmitted === 'boolean',
			'Reviewer candidate/order mismatch'
		);
		const spans = new Set(
			[...candidate.content.externalReply, ...candidate.content.internalPlan].map((span) => span.id)
		);
		const ranges = object(expectation.gradeRanges);
		keys(ranges, dimensionIds);
		for (const range of Object.values(ranges)) {
			const bound = object(range);
			demand(
				Number.isInteger(bound.min) &&
					Number.isInteger(bound.max) &&
					(bound.min as number) >= 0 &&
					(bound.max as number) <= 3 &&
					(bound.min as number) <= (bound.max as number),
				'Invalid reviewer grade range'
			);
			demand(nonempty(bound.rationale), 'Missing grade rationale');
			refList(bound.evidenceIds, evidenceIds);
			refList(bound.candidateSpans, spans);
		}
		const integrated = object(expectation.integrated);
		const dispositions = refList(
			integrated.allowedDispositions,
			new Set(['ready', 'revise', 'hold-for-review'])
		);
		refList(integrated.evidenceIds, evidenceIds);
		refList(integrated.candidateSpans, spans);
		demand(
			nonempty(integrated.rationale) &&
				nonempty(expectation.uncertainty) &&
				array(expectation.acceptableAlternatives).every(nonempty),
			'Incomplete reviewer rationale/alternatives'
		);
		if (expectation.acceptableAsSubmitted) {
			demand(dispositions.includes('ready'), 'Acceptable draft must permit ready disposition');
			acceptable.add(candidate.id);
		}
	}
	const alternatives = refList(
		reviewer.distinctAcceptableRoutes,
		new Set(dossier.candidates.map((candidate) => candidate.id)),
		2
	);
	demand(
		alternatives.every((id) => acceptable.has(id)) && acceptable.size >= 2,
		'Multiple acceptable resolutions required'
	);
	unique(
		expectations
			.filter((entry) => entry.acceptableAsSubmitted)
			.map((entry) => entry.provisionalRoute)
	);
	for (const alternative of array(reviewer.caseSpecificAlternatives)) {
		const route = object(alternative);
		demand(nonempty(route.route), 'Missing reviewer-only route rationale');
		refList(route.evidenceIds, evidenceIds);
	}
	return dossier;
};
