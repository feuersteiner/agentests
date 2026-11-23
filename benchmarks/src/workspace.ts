import { createHash } from 'node:crypto';
import {
	appendFileSync,
	chmodSync,
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { git } from './command.ts';
import type { DatasetEntry } from './dataset.ts';
import { hookLogVariable } from './environment.ts';
import { gates, isGateArm } from './types.ts';
import type { Arm, GateArm } from './types.ts';

/** A workspace ready for the agent, with what the observations compare against. */
export interface Workspace {
	directory: string;
	/** The base commit: the fixture and the arm's overlay. */
	base: string;
	/** Gate arms: the pre-commit hook's path and its content-and-mode hash. */
	hookPath?: string;
	hookHash?: string;
	/** Gate arms: the hash of each file of the Test and the config, by workspace path. */
	testHashes?: Record<string, string>;
}

/** What a gate workspace needs from the invocation. */
export interface GateSetup {
	/** The run's decision base URL on the proxy, `http://localhost:<port>/<token>/v1`. */
	url: string;
	/** The toolchain's `node_modules`, linked into the workspace. */
	modules: string;
}

/** The workspace paths that are the Test or its config. */
export const testPaths = ['.agents', 'agentests.config.yaml'];

/** The config `agentests init --decision openai` or `--decision jev` writes, with `decision.url` on the proxy. */
export const toConfig = (arm: GateArm, url: string): string => {
	const gate = gates[arm];
	return [
		'decision:',
		`  api: ${gate.api}`,
		`  url: ${url}`,
		`  model: ${gate.model}`,
		`  apiKeyEnv: ${gate.keyEnv}`,
		'reasoning:',
		'  api: openai',
		'  url: https://api.openai.com/v1',
		'  model: gpt-6-sol',
		'  apiKeyEnv: OPENAI_API_KEY',
		'select:',
		'  threshold: 0.5',
		'assert:',
		'  threshold: 0.5',
		''
	].join('\n');
};

/** The hook `agentests init` writes, appending its start and end times and exit code to the log the environment names. */
const hook = [
	'#!/bin/sh',
	'start=$(date +%s)',
	'npx agentests run --staged',
	'status=$?',
	`echo "$start $(date +%s) $status" >> "$${hookLogVariable}"`,
	'exit $status',
	''
].join('\n');

/** The SHA-256 of a file's mode and content, or `missing`. */
export const hashFile = (path: string): string =>
	existsSync(path)
		? createHash('sha256')
				.update(`${statSync(path).mode.toString(8)}\n`)
				.update(readFileSync(path))
				.digest('hex')
		: 'missing';

/** Every file under the workspace paths `paths`, by workspace path. */
const listFiles = (directory: string, paths: string[]): string[] =>
	paths.flatMap((path) => {
		const full = join(directory, path);
		if (!existsSync(full)) return [];
		if (!statSync(full).isDirectory()) return [path];
		return readdirSync(full, { recursive: true, withFileTypes: true })
			.filter((item) => item.isFile())
			.map((item) => relative(directory, join(item.parentPath, item.name)));
	});

/** The hash of each file of the Test and its config, by workspace path. */
export const hashTest = (directory: string): Record<string, string> =>
	Object.fromEntries(
		listFiles(directory, testPaths)
			.sort()
			.map((path) => [path, hashFile(join(directory, path))])
	);

/**
 * Copy the fixture to `directory`, add the arm's overlay for the entry and its companions (their skills in the
 * skill arm, their Tests in a gate arm), commit it all as the base commit and, for a gate arm, install the hook and
 * link the toolchain.
 */
export const createWorkspace = async (
	entry: DatasetEntry,
	arm: Arm,
	directory: string,
	gate?: GateSetup,
	companions: DatasetEntry[] = []
): Promise<Workspace> => {
	mkdirSync(directory, { recursive: true });
	cpSync(join(entry.directory, 'fixture'), directory, { recursive: true });
	const rules = [entry, ...companions];
	if (arm === 'skill')
		for (const rule of rules)
			cpSync(join(rule.directory, 'skill'), join(directory, '.claude', 'skills', rule.id), {
				recursive: true
			});
	if (isGateArm(arm)) {
		if (!gate) throw new Error(`The ${arm} arm needs the proxy and the toolchain`);
		for (const rule of rules)
			cpSync(join(rule.directory, 'gate'), join(directory, '.agents', 'tests', rule.id), {
				recursive: true
			});
		writeFileSync(join(directory, 'agentests.config.yaml'), toConfig(arm, gate.url));
	}
	await git(directory, 'init', '--quiet', '--initial-branch=main');
	await git(directory, 'config', 'user.name', 'Sam Taylor');
	await git(directory, 'config', 'user.email', 'sam.taylor@example.com');
	await git(directory, 'config', 'commit.gpgsign', 'false');
	appendFileSync(join(directory, '.git', 'info', 'exclude'), 'node_modules\n.env\n');
	await git(directory, 'add', '--all');
	await git(directory, 'commit', '--quiet', '--no-verify', '--message', 'Initial commit');
	const base = (await git(directory, 'rev-parse', 'HEAD')).trim();
	if (!isGateArm(arm) || !gate) return { directory, base };
	const hookPath = resolve(
		directory,
		(await git(directory, 'rev-parse', '--git-path', 'hooks/pre-commit')).trim()
	);
	if (hookPath !== join(directory, '.git', 'hooks', 'pre-commit'))
		throw new Error(
			`Git puts the pre-commit hook at ${hookPath}; unset a global core.hooksPath first`
		);
	writeFileSync(hookPath, hook);
	chmodSync(hookPath, 0o755);
	symlinkSync(gate.modules, join(directory, 'node_modules'));
	return {
		directory,
		base,
		hookPath,
		hookHash: hashFile(hookPath),
		testHashes: hashTest(directory)
	};
};
