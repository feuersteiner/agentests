import { spawn } from 'node:child_process';
import {
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Where Claude Code keeps a folder per working directory: session logs and auto-memory. */
export const projectsDirectory = join(
	process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'),
	'projects'
);

/**
 * Remove the folder Claude Code made in `projectsDirectory` for `cwd` when it holds no file, only empty
 * folders such as `memory/`; every run has a working directory of its own, so these would pile up.
 */
export const removeProjectFolder = (cwd: string): void => {
	const folder = join(projectsDirectory, realpathSync(cwd).replace(/[^a-zA-Z0-9]/g, '-'));
	if (!existsSync(folder)) return;
	const hasFile = readdirSync(folder, { recursive: true, withFileTypes: true }).some(
		(item) => !item.isDirectory()
	);
	if (!hasFile) rmSync(folder, { recursive: true });
};

/** One parsed line of a Claude Code stream, or its single `json` output. */
export type ClaudeEvent = Record<string, unknown>;

/** How a Claude Code process ended and what it printed. */
export interface ClaudeExit {
	exitCode: number | null;
	timedOut: boolean;
	seconds: number;
	events: ClaudeEvent[];
	/** The final `result` event, when the process printed one. */
	result?: ClaudeEvent;
	stderr: string;
}

/** What to run: arguments after `claude`, where, with which environment and input, and where its output goes. */
export interface ClaudeCall {
	args: string[];
	cwd: string;
	env: Record<string, string>;
	/** Written to stdin, then closed; without it stdin is empty, so Claude Code does not wait for one. */
	input?: string;
	stdoutPath: string;
	stderrPath: string;
	timeoutMs: number;
	/**
	 * When set, the process gets a /tmp of its own: in a private mount namespace `scratch` is mounted over /tmp
	 * with only the `keep` paths bound back in (`ro:` before one makes it read-only; a path outside /tmp stays as
	 * it is). Runs side by side then neither share scratch files such as `/tmp/notes.md` nor see each other's
	 * workspaces.
	 */
	privateTmp?: { scratch: string; keep: string[] };
}

/**
 * The shell script `unshare` runs for `privateTmp`, with arguments `<scratch> <keep>... -- <cwd> <command>...`:
 * binds each kept path into the scratch folder, mounts the scratch folder over /tmp, then runs the command.
 */
const privateTmpScript = `set -eu
scratch=$1; shift
while [ "$1" != -- ]; do
	path=$1; mode=rw
	case $path in ro:*) path=\${path#ro:}; mode=ro;; esac
	case $path in /tmp/*) ;; *) shift; continue;; esac
	target="$scratch/\${path#/tmp/}"
	if [ -d "$path" ]; then mkdir -p "$target"; else mkdir -p "$(dirname "$target")"; touch "$target"; fi
	mount --rbind "$path" "$target"
	if [ $mode = ro ]; then mount -o remount,bind,ro "$target"; fi
	shift
done
shift
cwd=$1; shift
mount --rbind "$scratch" /tmp
cd "$cwd"
exec "$@"`;

/** The program and arguments that run `claude` for `call`, inside a private /tmp when it asks for one. */
const toCommand = (call: ClaudeCall): [string, string[]] => {
	if (call.privateTmp === undefined) return ['claude', call.args];
	mkdirSync(call.privateTmp.scratch, { recursive: true });
	const { scratch, keep } = call.privateTmp;
	return [
		'unshare',
		[
			'--mount',
			'--propagation',
			'private',
			'--',
			'sh',
			'-c',
			privateTmpScript,
			'private-tmp',
			scratch,
			...keep,
			'--',
			call.cwd,
			'claude',
			...call.args
		]
	];
};

/** How long a process gets to exit after SIGTERM before SIGKILL. */
const killGraceMs = 10_000;

/** Process groups still running, killed when the harness is interrupted. */
const running = new Set<number>();

/** Kill every running Claude Code process group, with the commands its tools started. */
export const killAll = (): void => {
	for (const pid of running) killGroup(pid, 'SIGKILL');
};

const killGroup = (pid: number, signal: NodeJS.Signals): void => {
	try {
		process.kill(-pid, signal);
	} catch {
		// The group already exited.
	}
};

/** The JSON lines of `text` that parse as objects; a single `json` output is one such line. */
export const toEvents = (text: string): ClaudeEvent[] =>
	text.split('\n').flatMap((line) => {
		if (!line.trim()) return [];
		try {
			const value: unknown = JSON.parse(line);
			return typeof value === 'object' && value !== null && !Array.isArray(value)
				? [value as ClaudeEvent]
				: [];
		} catch {
			return [];
		}
	});

/** Run `claude` in its own process group, killing the group at the time limit; resolves when it exits. */
export const runClaude = (call: ClaudeCall): Promise<ClaudeExit> => {
	const stdout = openSync(call.stdoutPath, 'w');
	const stderr = openSync(call.stderrPath, 'w');
	const started = performance.now();
	return new Promise((resolve) => {
		let timedOut = false;
		const [command, args] = toCommand(call);
		const child = spawn(command, args, {
			cwd: call.cwd,
			env: call.env,
			detached: true,
			stdio: [call.input === undefined ? 'ignore' : 'pipe', stdout, stderr]
		});
		const pid = child.pid;
		if (pid !== undefined) running.add(pid);
		if (call.input !== undefined) child.stdin?.end(call.input);
		let killTimer: ReturnType<typeof setTimeout> | undefined;
		const limitTimer = setTimeout(() => {
			if (pid === undefined) return;
			timedOut = true;
			killGroup(pid, 'SIGTERM');
			killTimer = setTimeout(() => killGroup(pid, 'SIGKILL'), killGraceMs);
		}, call.timeoutMs);
		let finished = false;
		const finish = (exitCode: number | null, spawnError?: string) => {
			if (finished) return;
			finished = true;
			clearTimeout(limitTimer);
			clearTimeout(killTimer);
			if (pid !== undefined) {
				running.delete(pid);
				// Leave nothing of the agent behind, such as a server a tool started.
				killGroup(pid, 'SIGKILL');
			}
			closeSync(stdout);
			closeSync(stderr);
			const events = toEvents(readFileSync(call.stdoutPath, 'utf8'));
			resolve({
				exitCode,
				timedOut,
				seconds: (performance.now() - started) / 1000,
				events,
				result: events.findLast((event) => event.type === 'result'),
				stderr: [readFileSync(call.stderrPath, 'utf8'), spawnError ?? ''].join('').trim()
			});
		};
		child.once('error', (error) => finish(null, `Could not start claude: ${error.message}`));
		child.once('exit', (code) => finish(code));
	});
};
