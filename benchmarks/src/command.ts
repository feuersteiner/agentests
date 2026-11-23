import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { toChildEnv } from './environment.ts';

const execFileAsync = promisify(execFile);

/**
 * The stdout of `file` run with `args`, without a shell; throws with its stderr when it fails. Asynchronous, so
 * the proxy keeps answering other runs meanwhile.
 */
export const runCommand = async (
	file: string,
	args: string[],
	cwd: string,
	env: Record<string, string> = toChildEnv()
): Promise<string> => {
	try {
		const { stdout } = await execFileAsync(file, args, {
			cwd,
			env,
			encoding: 'utf8',
			maxBuffer: 256 * 1024 * 1024
		});
		return stdout;
	} catch (error) {
		const { stderr, message } = error as { stderr?: string; message: string };
		throw new Error(`${file} ${args.join(' ')} failed: ${stderr?.trim() || message}`, {
			cause: error
		});
	}
};

/** `git` with `args` in `cwd`. */
export const git = (cwd: string, ...args: string[]): Promise<string> =>
	runCommand('git', args, cwd);
