import { describe, expect, spyOn, test } from 'bun:test';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { main } from '../dossier-cli.ts';
import {
	dossierDirectory,
	loadDossierInputs,
	packageDossier,
	sha256,
	validateDossier
} from '../dossier.ts';
import { preparePilot } from '../data.ts';

type RecordValue = Record<string, unknown>;
const read = (root: string, path: string): RecordValue =>
	JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const write = (root: string, path: string, value: unknown) =>
	writeFileSync(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`);
const copied = (body: (root: string) => void) => {
	const root = mkdtempSync(resolve(tmpdir(), 'agentests-dossier-'));
	try {
		cpSync(dossierDirectory, root, { recursive: true });
		body(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
};
const refresh = (root: string, path: string) => {
	const manifest = read(root, 'manifest.json');
	const refs = [
		...Object.values(manifest.inputs as Record<string, RecordValue>),
		...Object.values(manifest.provenance as Record<string, RecordValue>),
		...(manifest.candidates as RecordValue[]),
		...(manifest.documents as RecordValue[]),
		manifest.reviewer as RecordValue
	];
	const ref = refs.find((entry) => entry.path === path)!;
	ref.sha256 = sha256(readFileSync(resolve(root, path)));
	write(root, 'manifest.json', manifest);
};

describe('complex dossier offline preparation', () => {
	test('one situation, full identical ordered context, neutral alternatives and distinct defensible routes', () => {
		const dossier = validateDossier();
		const packets = packageDossier(dossier);
		expect(dossier.manifest.scenarioCount).toBe(1);
		expect(dossier.context).toHaveLength(20);
		expect(dossier.manifest.contextMeasurement.words).toBeGreaterThanOrEqual(8000);
		expect(packets).toHaveLength(5);
		const context = JSON.stringify(JSON.parse(packets[0]!.packet).context);
		for (const packet of packets) {
			const value = JSON.parse(packet.packet);
			expect(Object.keys(value)).toEqual(['task', 'normativeRubric', 'context', 'candidate']);
			expect(JSON.stringify(value.context)).toBe(context);
			expect(Object.keys(value.candidate)).toEqual(['externalReply', 'internalPlan']);
			expect(packet.sha256).toBe(sha256(packet.packet));
			expect(value.expected).toBeUndefined();
			expect(packet.packet).not.toContain('synthetic-provisional-not-human-reviewed');
			expect(packet.packet).not.toContain('provisionalRoute');
			for (const other of dossier.candidates.filter(
				(candidate) => candidate.id !== packet.candidateId
			))
				expect(packet.packet).not.toContain(other.content.internalPlan[0]!.text);
		}
		expect(packageDossier(loadDossierInputs())).toEqual(packets);
		const reviewer = read(dossierDirectory, 'reviewer/expectations.json');
		const acceptable = (reviewer.candidateExpectations as RecordValue[]).filter(
			(entry) => entry.acceptableAsSubmitted
		);
		expect(acceptable.map((entry) => entry.candidateId)).toEqual(['p01', 'p02']);
		expect(acceptable[0]!.provisionalRoute).not.toBe(acceptable[1]!.provisionalRoute);
	});

	test('reviewer perturbation and injected canaries cannot change any model packet', () =>
		copied((root) => {
			const before = packageDossier(loadDossierInputs(root));
			// Deliberately corrupt the reviewer file and its hash: preparation must never read it.
			writeFileSync(resolve(root, 'reviewer/expectations.json'), 'REVIEWER_CANARY not even JSON');
			const manifest = read(root, 'manifest.json');
			(manifest.reviewer as RecordValue).sha256 = '0'.repeat(64);
			write(root, 'manifest.json', manifest);
			for (const id of ['p01', 'p02', 'p03', 'p04', 'p05']) {
				const path = `candidates/${id}.json`;
				const candidate = read(root, path);
				candidate.expected = 'CANDIDATE_CANARY';
				candidate.reviewerNotes = 'CANDIDATE_CANARY';
				for (const span of [
					...(candidate.externalReply as RecordValue[]),
					...(candidate.internalPlan as RecordValue[])
				])
					span.expectedGrade = 'SPAN_CANARY';
				write(root, path, candidate);
				refresh(root, path);
			}
			expect(packageDossier(loadDossierInputs(root))).toEqual(before);
			expect(() => validateDossier(root)).toThrow('Frozen hash mismatch');
		}));

	test('rejects corrupted frozen evidence and unknown cross-references', () =>
		copied((root) => {
			const path = 'documents/19-publishing-records.md';
			writeFileSync(resolve(root, path), `${readFileSync(resolve(root, path), 'utf8')}\nE99\n`);
			expect(() => validateDossier(root)).toThrow('Frozen hash mismatch');
			refresh(root, path);
			// Update measurement to isolate the reference error from frozen size enforcement.
			const manifest = read(root, 'manifest.json');
			const measurement = manifest.contextMeasurement as RecordValue;
			measurement.bytes = (measurement.bytes as number) + 5;
			measurement.words = (measurement.words as number) + 1;
			write(root, 'manifest.json', manifest);
			expect(() => validateDossier(root)).toThrow('Unknown document cross-reference');
		}));

	test('rejects nested reviewer annotations in rubric and response contract before packaging', () => {
		const injections: [string, (value: RecordValue) => void][] = [
			[
				'rubric.json',
				(value) => {
					(value.dimensions as RecordValue[])[0]!.reviewerNote = 'NESTED_CANARY';
				}
			],
			[
				'rubric.json',
				(value) => {
					(value.hardBreaches as RecordValue[])[0]!.expected = 'NESTED_CANARY';
				}
			],
			[
				'rubric.json',
				(value) => {
					(value.dispositions as RecordValue).reviewerNote = 'NESTED_CANARY';
				}
			],
			[
				'rubric.json',
				(value) => {
					(value.evidenceRules as unknown[]).push({ reviewerNote: 'NESTED_CANARY' });
				}
			],
			[
				'response.schema.json',
				(value) => {
					((value.properties as RecordValue).dimensions as RecordValue).reviewerNote =
						'NESTED_CANARY';
				}
			]
		];
		for (const [path, inject] of injections)
			copied((root) => {
				const value = read(root, path);
				inject(value);
				write(root, path, value);
				refresh(root, path);
				expect(() => packageDossier(loadDossierInputs(root))).toThrow();
			});
		const inMemory = loadDossierInputs();
		(inMemory.rubric.dimensions as RecordValue[])[0]!.reviewerNote = 'NESTED_CANARY';
		expect(() => packageDossier(inMemory)).toThrow('Unexpected contract fields');
	});

	test('rejects invalid reviewer ranges, source references and local provenance hashes', () => {
		copied((root) => {
			const path = 'reviewer/expectations.json';
			const reviewer = read(root, path);
			const first = (reviewer.candidateExpectations as RecordValue[])[0]!;
			((first.gradeRanges as RecordValue).policyAuthority as RecordValue).min = 4;
			write(root, path, reviewer);
			refresh(root, path);
			expect(() => validateDossier(root)).toThrow('Invalid reviewer grade range');
		});
		copied((root) => {
			const path = 'summary.json';
			const summary = read(root, path);
			(summary.claims as RecordValue[])[0]!.sourceIds = ['S99'];
			write(root, path, summary);
			refresh(root, path);
			expect(() => validateDossier(root)).toThrow('Unknown or missing evidence/span reference');
		});
		copied((root) => {
			const path = 'sources.json';
			const sources = read(root, path);
			((sources.sources as RecordValue[])[0]!.representation as RecordValue).sha256 = '0'.repeat(
				64
			);
			write(root, path, sources);
			refresh(root, path);
			expect(() => validateDossier(root)).toThrow('Invalid local paraphrase');
		});
	});

	test('rejects a grade-as-probability schema and removal of a defensible alternative', () => {
		copied((root) => {
			const path = 'response.schema.json';
			const schema = read(root, path);
			const dimensions = ((schema.properties as RecordValue).dimensions as RecordValue)
				.properties as RecordValue;
			const fields = (dimensions.policyAuthority as RecordValue).properties as RecordValue;
			(fields.grade as RecordValue).maximum = 1;
			write(root, path, schema);
			refresh(root, path);
			expect(() => validateDossier(root)).toThrow('Grade schema must use ordinal 0..3');
		});
		copied((root) => {
			const path = 'reviewer/expectations.json';
			const reviewer = read(root, path);
			(reviewer.candidateExpectations as RecordValue[])[1]!.acceptableAsSubmitted = false;
			write(root, path, reviewer);
			refresh(root, path);
			expect(() => validateDossier(root)).toThrow('Multiple acceptable resolutions required');
		});
	});

	test('offline CLI validation/help writes nothing, rejects live commands and unsafe output', () => {
		const results = new URL('../../results/', import.meta.url);
		const before = readdirSync(results).sort();
		const original = globalThis.fetch;
		const forbidden = () => {
			throw new Error('Network forbidden');
		};
		globalThis.fetch = Object.assign(forbidden, { preconnect: forbidden });
		const log = spyOn(console, 'log').mockImplementation(() => {});
		const error = spyOn(console, 'error').mockImplementation(() => {});
		try {
			expect(main([])).toBe(0);
			expect(main(['validate'])).toBe(0);
			expect(main(['--help'])).toBe(0);
			expect(main(['run'])).toBe(2);
			expect(main(['prepare', '--out', '/tmp/forbidden-dossier-packet'])).toBe(2);
			expect(readdirSync(results).sort()).toEqual(before);
		} finally {
			globalThis.fetch = original;
			log.mockRestore();
			error.mockRestore();
		}
	});

	test('the original five evaluator packet hashes remain frozen', () => {
		expect(preparePilot().inputs.map(({ caseId, sha256 }) => ({ caseId, sha256 }))).toEqual([
			{
				caseId: 'refund-01',
				sha256: '218ae4a4d0fc40e70cabe93c3f1d2ff4f1a8c30cacd2fff5c0ceefb9e76472ea'
			},
			{
				caseId: 'refund-02',
				sha256: '6b4737518612f1dc23f6e75f33ec1145fb9ed132ef6308b31f06366dc4c51f3f'
			},
			{
				caseId: 'refund-03',
				sha256: 'ef8e6773b9f95ad10fd3dcfcf9979ef4bc2db402427e66c558952db95a7f4b3f'
			},
			{
				caseId: 'refund-04',
				sha256: '148b3eea96245a7747d456c82ad66b895f34af40973a61d4da245beb78e800f6'
			},
			{
				caseId: 'refund-05',
				sha256: 'a365fccd75bde6b8734c881dbb40f4575f1499712f83255ead68c674709c8aaa'
			}
		]);
	});
});
