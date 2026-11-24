import { describe, expect, spyOn, test } from 'bun:test';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { freshOutput, main, preparedRoot } from '../dossier-cli.ts';
import { approvedDossierIds } from '../dossier-ids.ts';
import { loadDossierInputs, packageDossier, sha256 } from '../dossier.ts';
import {
	assertSuiteMembers,
	dossierInventory,
	loadDossierSuite,
	readSuiteRegistry,
	suiteRegistryFile
} from '../dossier-suite.ts';
import frozen from './fixtures/frozen-dossiers.json';

const scratch = (body: (root: string) => void) => {
	const root = realpathSync(mkdtempSync(resolve(tmpdir(), 'agentests-suite-')));
	try {
		body(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
};

describe('fixed complex support suite', () => {
	test('retains every frozen original fixture byte and case01 serialized packet hash', () => {
		const root = new URL('../../../../', import.meta.url);
		for (const [path, hash] of Object.entries(frozen.files))
			expect(sha256(readFileSync(new URL(path, root)))).toBe(hash);
		expect(
			packageDossier(loadDossierInputs()).map(({ candidateId, sha256, bytes }) => ({
				candidateId,
				sha256,
				bytes
			}))
		).toEqual(frozen.packets);
	});

	test('registry rejects duplicates, missing IDs, unregistered IDs and unsafe paths', () =>
		scratch((root) => {
			const original = JSON.parse(readFileSync(suiteRegistryFile, 'utf8'));
			for (const mutate of [
				(value: typeof original) => value.situations.pop(),
				(value: typeof original) => (value.situations[1].id = value.situations[0].id),
				(value: typeof original) => (value.situations[9].id = 'complex-support-11'),
				(value: typeof original) => (value.situations[1].directory = '../complex-support-02')
			]) {
				const value = structuredClone(original);
				mutate(value);
				const path = resolve(root, 'registry.json');
				writeFileSync(path, JSON.stringify(value));
				expect(() => readSuiteRegistry(path)).toThrow();
			}
		}));

	test('suite discovery rejects missing, extra and redirected registered members', () =>
		scratch((root) => {
			for (const id of approvedDossierIds.slice(0, -1)) mkdirSync(resolve(root, id));
			expect(() => assertSuiteMembers(root)).toThrow('Missing or unregistered');
			mkdirSync(resolve(root, approvedDossierIds.at(-1)!));
			expect(() => assertSuiteMembers(root)).not.toThrow();
			mkdirSync(resolve(root, 'complex-support-11'));
			expect(() => assertSuiteMembers(root)).toThrow('Missing or unregistered');
			rmSync(resolve(root, 'complex-support-11'), { recursive: true });
			rmSync(resolve(root, 'complex-support-10'), { recursive: true });
			symlinkSync(resolve(root, 'complex-support-09'), resolve(root, 'complex-support-10'));
			expect(() => assertSuiteMembers(root)).toThrow('real directory');
		}));

	test('ten complete independent contexts produce exactly fifty deterministic isolated packets', () => {
		const suites = loadDossierSuite(true);
		expect(suites.map(({ manifest }) => manifest.scenarioId)).toEqual([...approvedDossierIds]);
		const contextHashes = new Set<string>();
		for (const dossier of suites) {
			const packets = packageDossier(dossier);
			expect(packets).toHaveLength(5);
			expect(dossier.manifest.scenarioCount).toBe(1);
			expect(
				packageDossier(
					loadDossierInputs(
						new URL(`../../pilot/${dossier.manifest.scenarioId}/`, import.meta.url).pathname
					)
				)
			).toEqual(packets);
			const context = JSON.stringify(JSON.parse(packets[0]!.packet).context);
			contextHashes.add(sha256(context));
			for (const packet of packets) {
				const value = JSON.parse(packet.packet);
				expect(JSON.stringify(value.context)).toBe(context);
				expect(Object.keys(value.candidate)).toEqual(['externalReply', 'internalPlan']);
				expect(packet.bytes).toBe(Buffer.byteLength(packet.packet));
				for (const other of dossier.candidates.filter(({ id }) => id !== packet.candidateId))
					expect(packet.packet).not.toContain(other.content.internalPlan[0]!.text);
			}
		}
		expect(contextHashes.size).toBe(10);
	});

	test('output rejects traversal, absolute escape, existing sets and normal/dangling symlinks', () => {
		mkdirSync(preparedRoot, { recursive: true });
		const root = mkdtempSync(resolve(preparedRoot, 'test-safe-'));
		try {
			expect(() => freshOutput('/tmp/escaped-packets')).toThrow();
			expect(() => freshOutput(resolve(root, 'child') + '/../escape')).toThrow('traversal');
			expect(() => freshOutput(root)).toThrow('already exists');
			symlinkSync(tmpdir(), resolve(root, 'redirect'));
			expect(() => freshOutput(resolve(root, 'redirect/child'))).toThrow('symlinks');
			symlinkSync(resolve(root, 'missing'), resolve(root, 'dangling'));
			expect(() => freshOutput(resolve(root, 'dangling/child'))).toThrow('symlinks');
			expect(freshOutput(resolve(root, 'new'))).toBe(resolve(root, 'new'));
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test('suite CLI preparation is offline, never overwrites, and inventories actual fifty packet bytes', () => {
		mkdirSync(preparedRoot, { recursive: true });
		const parent = mkdtempSync(resolve(preparedRoot, 'test-suite-'));
		const output = resolve(parent, 'packets');
		const original = globalThis.fetch;
		const forbidden = () => {
			throw new Error('Network forbidden');
		};
		globalThis.fetch = Object.assign(forbidden, { preconnect: forbidden });
		const log = spyOn(console, 'log').mockImplementation(() => {});
		const error = spyOn(console, 'error').mockImplementation(() => {});
		try {
			expect(main(['prepare', '--suite', '--out', output])).toBe(0);
			expect(main(['prepare', '--suite', '--out', output])).toBe(2);
			const inventory = JSON.parse(readFileSync(resolve(output, 'inventory.json'), 'utf8'));
			expect(inventory.scenarios).toBe(10);
			expect(inventory.candidatePairs).toBe(50);
			expect(inventory.integrity).toContain('inputs-only');
			const dossiers = loadDossierSuite();
			for (const dossier of dossiers) {
				const directory = resolve(output, dossier.manifest.scenarioId);
				expect(readdirSync(directory).sort()).toEqual([
					'inventory.json',
					'p01.json',
					'p02.json',
					'p03.json',
					'p04.json',
					'p05.json'
				]);
				const expected = dossierInventory(dossier);
				for (const packet of expected.packets) {
					const bytes = readFileSync(resolve(directory, `${packet.candidateId}.json`));
					expect(bytes.length).toBe(packet.bytes);
					expect(sha256(bytes)).toBe(packet.sha256);
				}
			}
		} finally {
			globalThis.fetch = original;
			log.mockRestore();
			error.mockRestore();
			rmSync(parent, { recursive: true, force: true });
		}
	});
});
