import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCommand } from './command.ts';

/** This repository's `core/`, the package the gate arms run as it ships, from its built `dist/`. */
const coreDirectory = join(import.meta.dirname, '..', '..', 'core');

/**
 * Pack `core/` and install the tarball, with its dependencies, into `folder`, once per invocation; returns the
 * `node_modules` each gate workspace links to, so `npx agentests` resolves to it with no install per run.
 */
export const prepareToolchain = async (folder: string): Promise<string> => {
	if (!existsSync(join(coreDirectory, 'dist', 'cli', 'index.js')))
		throw new Error('core/dist is not built; run bun run build once before the benchmark');
	mkdirSync(folder, { recursive: true });
	const packed = JSON.parse(
		await runCommand('npm', ['pack', '--json', '--pack-destination', folder], coreDirectory)
	) as { filename: string }[];
	const tarball = packed[0]?.filename;
	if (!tarball) throw new Error('npm pack of core/ printed no tarball');
	writeFileSync(
		join(folder, 'package.json'),
		`${JSON.stringify({ name: 'agentests-benchmark-toolchain', private: true })}\n`
	);
	await runCommand(
		'npm',
		['install', '--no-audit', '--no-fund', '--no-save', '--no-package-lock', `./${tarball}`],
		folder
	);
	const modules = join(folder, 'node_modules');
	if (!existsSync(join(modules, '.bin', 'agentests')))
		throw new Error(`The toolchain in ${folder} has no agentests binary`);
	return modules;
};

/**
 * The `node_modules` of a toolchain prepared earlier in `folder`, reused as it is, or a new one prepared there.
 * Many proofs can share one toolchain this way instead of packing and installing `core/` each time.
 */
export const useToolchain = async (folder: string): Promise<string> => {
	const modules = join(folder, 'node_modules');
	return existsSync(join(modules, '.bin', 'agentests')) ? modules : prepareToolchain(folder);
};
