import { copyFileSync, cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { ClaudeEvent, ClaudeExit } from './claude.ts';
import { projectsDirectory, toEvents } from './claude.ts';
import { models } from './types.ts';
import type { Arm } from './types.ts';

/** The line after every task prompt. */
export const commitLine = 'When you are done, commit your work.';

/** The agent's prompt: the task and the commit line, behind `/<rule-id>` in the skill arm so the skill is force-invoked. */
export const toAgentPrompt = (rule: string, task: string, arm: Arm): string =>
	`${arm === 'skill' ? `/${rule} ` : ''}${task}\n\n${commitLine}`;

/** The agent's arguments after `claude`: headless, streamed, unattended, project settings only, capped in cost. */
export const toAgentArgs = (prompt: string, budgetUsd: number): string[] => [
	'-p',
	prompt,
	'--model',
	models.agent,
	'--output-format',
	'stream-json',
	'--verbose',
	'--permission-mode',
	'bypassPermissions',
	'--setting-sources',
	'project',
	'--strict-mcp-config',
	'--max-budget-usd',
	String(budgetUsd)
];

/** The agent's tokens and cost. */
export interface AgentUsage {
	costUsd: number;
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	turns: number;
}

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

/** Token counts summed over the `result` event's `modelUsage`, which covers every model the session used. */
const sumModelUsage = (modelUsage: unknown) => {
	const entries = Object.values((modelUsage ?? {}) as Record<string, Record<string, unknown>>);
	const sum = (field: string) =>
		entries.reduce((total, entry) => total + toNumber(entry[field]), 0);
	return {
		uncached: sum('inputTokens'),
		outputTokens: sum('outputTokens'),
		cacheReadTokens: sum('cacheReadInputTokens'),
		cacheWriteTokens: sum('cacheCreationInputTokens')
	};
};

/** Token counts from the assistant messages, each counted once; for a process killed before its `result` event. */
const sumMessageUsage = (events: ClaudeEvent[]) => {
	const usages = new Map<string, Record<string, unknown>>();
	for (const event of events) {
		const message =
			event.type === 'assistant' ? (event.message as Record<string, unknown>) : undefined;
		if (message?.usage) usages.set(String(message.id), message.usage as Record<string, unknown>);
	}
	const sum = (field: string) =>
		[...usages.values()].reduce((total, usage) => total + toNumber(usage[field]), 0);
	return {
		uncached: sum('input_tokens'),
		outputTokens: sum('output_tokens'),
		cacheReadTokens: sum('cache_read_input_tokens'),
		cacheWriteTokens: sum('cache_creation_input_tokens')
	};
};

/**
 * The agent's usage from its final `result` event: `total_cost_usd`, `num_turns` and `modelUsage`. Without one, the
 * tokens come from the stream's messages, the cost is unknown and counted as 0, and the turns are the messages.
 */
export const toAgentUsage = (exit: ClaudeExit): AgentUsage => {
	const { result, events } = exit;
	const tokens = result ? sumModelUsage(result.modelUsage) : sumMessageUsage(events);
	return {
		costUsd: toNumber(result?.total_cost_usd),
		inputTokens: tokens.uncached + tokens.cacheReadTokens + tokens.cacheWriteTokens,
		outputTokens: tokens.outputTokens,
		cacheReadTokens: tokens.cacheReadTokens,
		cacheWriteTokens: tokens.cacheWriteTokens,
		turns: result
			? toNumber(result.num_turns)
			: events.filter((event) => event.type === 'assistant').length
	};
};

/** The machinery's error in an agent's exit, or undefined when the agent ran; a spent budget or turn limit is a real outcome. */
export const toAgentError = (exit: ClaudeExit): string | undefined => {
	const { result } = exit;
	if (!result)
		return `Claude Code exited with code ${exit.exitCode} and no result event${exit.stderr ? `: ${exit.stderr.slice(0, 2000)}` : ''}`;
	if (result.api_error_status != null || (result.is_error === true && result.subtype === 'success'))
		return `Claude Code reported an error (${String(result.api_error_status ?? result.subtype)}): ${String(result.result ?? '').slice(0, 2000)}`;
	if (result.subtype === 'error_during_execution')
		return `Claude Code failed during execution: ${String(result.result ?? exit.stderr).slice(0, 2000)}`;
	return undefined;
};

/** The session id of the agent's stream, from its `init` event. */
const toSessionId = (events: ClaudeEvent[]): string | undefined => {
	const id = events.find(
		(event) => event.type === 'system' && event.subtype === 'init'
	)?.session_id;
	return typeof id === 'string' ? id : undefined;
};

/**
 * Move the agent's Claude Code session log into the run folder as `session.jsonl`: unlike the stream, it holds
 * the prompt as Claude Code expanded it, a force-invoked skill's body included. Returns the copied path.
 */
export const keepSession = (events: ClaudeEvent[], runDirectory: string): string | undefined => {
	const id = toSessionId(events);
	if (!id || !existsSync(projectsDirectory)) return undefined;
	const project = readdirSync(projectsDirectory).find((name) =>
		existsSync(join(projectsDirectory, name, `${id}.jsonl`))
	);
	if (!project) return undefined;
	const folder = join(projectsDirectory, project);
	const target = join(runDirectory, 'session.jsonl');
	copyFileSync(join(folder, `${id}.jsonl`), target);
	rmSync(join(folder, `${id}.jsonl`));
	if (existsSync(join(folder, id))) {
		cpSync(join(folder, id), join(runDirectory, 'session'), { recursive: true });
		rmSync(join(folder, id), { recursive: true });
	}
	return target;
};

/** The text of a session message: its string content, or its text blocks joined. */
const toText = (content: unknown): string =>
	typeof content === 'string'
		? content
		: Array.isArray(content)
			? (content as { text?: unknown }[]).map((block) => String(block.text ?? '')).join('\n')
			: '';

/**
 * Whether the session shows the force-invoked skill with the task: Claude Code's meta message holding the body of
 * `.claude/skills/<rule>`, and the task as the command's arguments. Claude Code always records the arguments in the
 * `/<rule>` command message, and appends `ARGUMENTS: <arguments>` to the skill's body only when the body has no
 * argument placeholder such as `$ARGUMENTS` or `$1`, so the task is looked for in either.
 */
export const isSkillLoaded = (
	sessionPath: string | undefined,
	rule: string,
	task: string
): boolean => {
	if (!sessionPath) return false;
	const texts = toEvents(readFileSync(sessionPath, 'utf8'))
		.filter((event) => event.type === 'user')
		.map((event) => ({
			meta: event.isMeta === true,
			text: toText((event.message as { content?: unknown } | undefined)?.content)
		}));
	const skill = texts.find(
		({ meta, text }) =>
			meta &&
			text.startsWith('Base directory for this skill:') &&
			text.includes(`/.claude/skills/${rule}`)
	);
	const command = texts.find(
		({ meta, text }) => !meta && text.includes(`<command-name>/${rule}</command-name>`)
	);
	const args = /<command-args>([\s\S]*)<\/command-args>/.exec(command?.text ?? '')?.[1] ?? '';
	return skill !== undefined && (args.includes(task) || skill.text.includes(`ARGUMENTS: ${task}`));
};
