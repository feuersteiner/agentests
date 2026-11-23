import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { researchDirectory } from '../../src/catalogue.ts';

/** One entry of the real `research/triage.yaml`, as far as the tests read it. */
export interface TriageEntry {
	id: string;
	domain: string;
	verdict: string;
	usable_tasks?: number[];
}

/** The real `research/triage.yaml`, as far as the tests read it. */
export interface Triage {
	summary: Record<string, number>;
	rules: TriageEntry[];
}

/** The real triage, parsed directly rather than through the loader under test. */
export const readTriage = (): Triage =>
	Bun.YAML.parse(readFileSync(join(researchDirectory, 'triage.yaml'), 'utf8')) as Triage;

/** A fresh real directory under the OS temp directory. */
export const makeTempDir = (): string =>
	realpathSync(mkdtempSync(join(tmpdir(), 'agentests-benchmarks-')));

/** Runs `run` on a fresh temp directory holding `files` (relative path to content), then always removes it. */
export const inResearchDir = <T>(files: Record<string, string>, run: (dir: string) => T): T => {
	const dir = makeTempDir();
	try {
		for (const [path, content] of Object.entries(files)) {
			mkdirSync(dirname(join(dir, path)), { recursive: true });
			writeFileSync(join(dir, path), content);
		}
		return run(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
};
