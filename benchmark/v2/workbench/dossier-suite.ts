import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedDossierIds } from './dossier-ids.ts';
import { loadDossierInputs, measure, packageDossier, validateDossier } from './dossier.ts';
import type { Dossier } from './dossier.ts';

export const pilotDirectory = fileURLToPath(new URL('../pilot/', import.meta.url));
export const suiteRegistryFile = resolve(pilotDirectory, 'complex-support-suite.json');
export interface Registration {
	id: string;
	title: string;
	directory: string;
}

/** Check the complete fixed registry even when selecting only one situation. */
export const readSuiteRegistry = (file = suiteRegistryFile): Registration[] => {
	const registry = JSON.parse(readFileSync(file, 'utf8'));
	if (
		registry.version !== '1.0' ||
		registry.status !== 'offline-prepared-graded-evaluation-not-implemented' ||
		!Array.isArray(registry.situations) ||
		registry.situations.length !== approvedDossierIds.length
	)
		throw new Error('Suite requires exactly ten registered situations');
	if (Object.keys(registry).sort().join(',') !== 'situations,status,version')
		throw new Error('Unexpected suite registry fields');
	const entries = registry.situations as Registration[];
	if (new Set(entries.map(({ id }) => id)).size !== entries.length)
		throw new Error('Duplicate suite registration');
	for (const [index, entry] of entries.entries())
		if (
			entry.id !== approvedDossierIds[index] ||
			entry.directory !== entry.id ||
			typeof entry.title !== 'string' ||
			!entry.title.trim() ||
			Object.keys(entry).sort().join(',') !== 'directory,id,title'
		)
			throw new Error('Missing, unregistered or unsafe suite registration');
	return entries;
};

export const registeredDirectory = (id: string, base = pilotDirectory): string => {
	if (!approvedDossierIds.includes(id)) throw new Error('Unregistered dossier ID');
	const directory = resolve(base, id);
	if (!lstatSync(directory).isDirectory() || realpathSync(directory) !== directory)
		throw new Error('Registered dossier must be a real directory without symlink ancestors');
	return directory;
};

export const loadRegisteredDossier = (id: string, fullIntegrity = false): Dossier => {
	readSuiteRegistry();
	const directory = registeredDirectory(id);
	const dossier = fullIntegrity ? validateDossier(directory) : loadDossierInputs(directory);
	if (dossier.manifest.scenarioId !== id) throw new Error('Registered scenario identity mismatch');
	return dossier;
};

/** No directory discovery can silently add or drop a suite member. */
export const assertSuiteMembers = (base = pilotDirectory): void => {
	const discovered = readdirSync(base).filter(
		(name) => /^complex-support-/u.test(name) && name !== 'complex-support-suite.json'
	);
	if (
		discovered.length !== approvedDossierIds.length ||
		discovered.some((id) => !approvedDossierIds.includes(id))
	)
		throw new Error('Missing or unregistered suite member');
	for (const id of approvedDossierIds) registeredDirectory(id, base);
};

export const loadDossierSuite = (fullIntegrity = false): Dossier[] => {
	const entries = readSuiteRegistry();
	assertSuiteMembers();
	return entries.map(({ id }) => loadRegisteredDossier(id, fullIntegrity));
};

export const dossierInventory = (dossier: Dossier) => ({
	scenarioId: dossier.manifest.scenarioId,
	status: 'graded evaluation not implemented',
	scenarios: 1,
	documents: dossier.context.length,
	documentSizes: dossier.context.map(({ id, version, content }) => ({
		id,
		version,
		...measure(content)
	})),
	context: dossier.manifest.contextMeasurement,
	candidates: dossier.candidates.map((candidate) => ({
		id: candidate.id,
		externalReply: measure(candidate.content.externalReply.map((span) => span.text).join('\n\n')),
		internalPlan: measure(candidate.content.internalPlan.map((span) => span.text).join('\n\n'))
	})),
	packets: packageDossier(dossier).map(({ candidateId, sha256, bytes, words }) => ({
		candidateId,
		sha256,
		bytes,
		words
	}))
});
