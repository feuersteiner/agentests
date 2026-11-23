import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import type { Gate } from './types.ts';

/** The repository's root `.env`, read for the decision keys when the environment lacks them. */
export const rootEnvFile = join(import.meta.dirname, '..', '..', '.env');

/** The variables that hold the real decision keys. */
const keyNames: Gate['keyEnv'][] = ['OPENAI_API_KEY', 'TYPESAFE_AI_API_KEY'];

/** What the agent's environment holds under each key name: a non-blank value that opens nothing. */
export const placeholderKey = 'placeholder-key-the-benchmark-proxy-replaces';

/** The variable that gives the pre-commit hook the path of its log, outside the workspace. */
export const hookLogVariable = 'AGENTESTS_BENCHMARK_HOOK_LOG';

/** Claude Code variables a child keeps: authentication and provider choice; every other `CLAUDE*` variable is the caller's session. */
const keptClaudeVariables = new Set([
	'CLAUDE_CODE_OAUTH_TOKEN',
	'CLAUDE_CODE_USE_BEDROCK',
	'CLAUDE_CODE_USE_VERTEX',
	'CLAUDE_CODE_USE_FOUNDRY',
	'CLAUDE_CONFIG_DIR'
]);

/** Variables that point Git elsewhere or describe the caller's shell, package script or session. */
const isCallerVariable = (name: string): boolean =>
	(name.startsWith('CLAUDE') && !keptClaudeVariables.has(name)) ||
	/^npm_/i.test(name) ||
	[
		'INIT_CWD',
		'PWD',
		'OLDPWD',
		'GIT_DIR',
		'GIT_WORK_TREE',
		'GIT_INDEX_FILE',
		'GIT_PREFIX'
	].includes(name);

/** The real decision keys: the environment first, then the root `.env`; a blank value counts as missing. */
export const readKeys = (
	envFile: string = rootEnvFile
): Partial<Record<Gate['keyEnv'], string>> => {
	const file = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
	return Object.fromEntries(
		keyNames.flatMap((name) => {
			const value = process.env[name]?.trim() || file[name]?.trim();
			return value ? [[name, value]] : [];
		})
	);
};

/**
 * The environment for a child process: this process's, without the real decision keys, the caller's Claude
 * Code session, package-script and Git-location variables, with a placeholder under each key name and, when
 * given, the hook log's path.
 */
export const toChildEnv = (hookLog?: string): Record<string, string> => {
	const env = Object.fromEntries(
		Object.entries(process.env).filter(
			(entry): entry is [string, string] =>
				entry[1] !== undefined &&
				!isCallerVariable(entry[0]) &&
				!keyNames.includes(entry[0] as Gate['keyEnv'])
		)
	);
	for (const name of keyNames) env[name] = placeholderKey;
	if (hookLog !== undefined) env[hookLogVariable] = hookLog;
	return env;
};
