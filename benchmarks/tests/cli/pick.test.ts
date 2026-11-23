import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import type { BenchmarkTest } from '../../src/catalogue.ts';
import { makeTempDir } from '../helpers/research.ts';

const entry = join(import.meta.dirname, '..', '..', 'cli', 'pick.ts');

/** The JSON that `--json` prints. */
interface PickOutput {
	seed: number;
	tests: BenchmarkTest[];
}

describe('cli/pick.ts', () => {
	let cwd = '';

	beforeAll(() => {
		cwd = makeTempDir();
	});

	afterAll(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	/** Runs the entry with Bun in an empty temp directory, so no `.env` is loaded, and only `HOME` set. */
	const pick = (...args: string[]): { exitCode: number; stdout: string; stderr: string } => {
		const result = Bun.spawnSync([process.execPath, entry, ...args], { cwd, env: { HOME: cwd } });
		return {
			exitCode: result.exitCode,
			stdout: result.stdout.toString(),
			stderr: result.stderr.toString()
		};
	};

	/** The seed on the last line of a plain-text pick. */
	const seedOf = (stdout: string): string => /^Seed: (\d+) /m.exec(stdout)?.[1] ?? '';

	test('prints 3 tests and a seed, and --seed replays that pick exactly', () => {
		const first = pick();
		expect(first.exitCode).toBe(0);
		expect(first.stdout.match(/^Test \d of 3$/gm)).toEqual([
			'Test 1 of 3',
			'Test 2 of 3',
			'Test 3 of 3'
		]);
		const seed = seedOf(first.stdout);
		expect(seed).not.toBe('');
		expect(pick('--seed', seed).stdout).toBe(first.stdout);
	});

	test('uses a fresh seed on every run without --seed', () => {
		expect(seedOf(pick().stdout)).not.toBe(seedOf(pick().stdout));
	});

	test('--json prints the same pick as JSON', () => {
		const result = pick('--seed', '7', '--json');
		expect(result.exitCode).toBe(0);
		const output = JSON.parse(result.stdout) as PickOutput;
		expect(output.seed).toBe(7);
		expect(output.tests).toHaveLength(3);
		const text = pick('--seed', '7').stdout;
		for (const test of output.tests) {
			expect(text).toContain(`  rule     ${test.rule}\n`);
			expect(text).toContain(`  prompt   ${test.prompt}\n`);
		}
	});

	test.each([
		[['--seed', 'abc'], 'Error: --seed takes a whole number from 0 to 4294967295, not "abc"'],
		[['--seed', '4294967296'], 'Error: --seed takes a whole number'],
		[['--nope'], "Error: Unknown option '--nope'"],
		[['extra'], "Error: Unexpected argument 'extra'"]
	])('fails with an error on %p', (args, message) => {
		const result = pick(...args);
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr).toStartWith(message);
	});
});
