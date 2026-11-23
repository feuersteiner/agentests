import { copyFileSync, cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { ClaudeEvent, ClaudeExit } from './claude.ts';
import { projectsDirectory, toEvents } from './claude.ts';
import type { ToolUse } from './observe.ts';
import { models } from './types.ts';

/** The line after every task prompt. */
export const commitLine = 'When you are done, commit your work.';

/** The agent's prompt in every arm: the task and the commit line. No skill is invoked; the agent chooses. */
export const toAgentPrompt = (task: string): string => `${task}\n\n${commitLine}`;

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
	// No subagents, in any arm: everything the agent reads stays in its own context, which the run measures.
	'--disallowedTools',
	'Agent',
	'Task',
	'--max-budget-usd',
	String(budgetUsd)
];

/** The agent's tokens, cost and context. */
export interface AgentUsage {
	costUsd: number;
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	turns: number;
	peakContextTokens: number;
	contextWindow: number | null;
	contextPercent: number | null;
	compactions: number;
}

/**
 * The agent's context: the largest prompt of any model call (uncached input, cache reads and cache writes of one
 * assistant message), the context window the `result` event reports for the agent's model, and how many times
 * Claude Code compacted the conversation (`compact_boundary` system events).
 */
const toContext = (exit: ClaudeExit) => {
	let peak = 0;
	for (const event of exit.events) {
		const message =
			event.type === 'assistant' ? (event.message as Record<string, unknown>) : undefined;
		const usage = message?.usage as Record<string, unknown> | undefined;
		if (!usage) continue;
		const prompt =
			toNumber(usage.input_tokens) +
			toNumber(usage.cache_read_input_tokens) +
			toNumber(usage.cache_creation_input_tokens);
		peak = Math.max(peak, prompt);
	}
	const usage = (exit.result?.modelUsage ?? {}) as Record<string, Record<string, unknown>>;
	const window = toNumber(
		usage[models.agent]?.contextWindow ?? Object.values(usage)[0]?.contextWindow
	);
	return {
		peakContextTokens: peak,
		contextWindow: window > 0 ? window : null,
		contextPercent: window > 0 ? Math.round((peak / window) * 1000) / 10 : null,
		compactions: exit.events.filter(
			(event) => event.type === 'system' && event.subtype === 'compact_boundary'
		).length
	};
};

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
			: events.filter((event) => event.type === 'assistant').length,
		...toContext(exit)
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

/** The skill id in a path under `.claude/skills/`. */
const skillInPath = /\.claude\/skills\/([\w.-]+)/;

/**
 * Every skill the agent loaded, by id, sorted: from Claude Code's meta message that begins
 * `Base directory for this skill:` in the session log, from the Skill tool's calls in the stream, and from any tool
 * call that reads a `.claude/skills/<id>/SKILL.md` file directly.
 */
export const toLoadedSkills = (sessionPath: string | undefined, uses: ToolUse[]): string[] => {
	const loaded = new Set<string>();
	if (sessionPath)
		for (const event of toEvents(readFileSync(sessionPath, 'utf8'))) {
			if (event.type !== 'user' || event.isMeta !== true) continue;
			const text = toText((event.message as { content?: unknown } | undefined)?.content);
			const id = text.startsWith('Base directory for this skill:')
				? skillInPath.exec(text)?.[1]
				: undefined;
			if (id) loaded.add(id);
		}
	for (const use of uses) {
		const named = use.input.skill ?? use.input.command ?? use.input.name;
		if (use.name === 'Skill' && typeof named === 'string')
			loaded.add(named.replace(/^\//, '').trim().split(/\s/)[0]!);
		for (const match of JSON.stringify(use.input).matchAll(
			/\.claude\/skills\/([\w.-]+)\/SKILL\.md/g
		))
			loaded.add(match[1]!);
	}
	return [...loaded].filter(Boolean).sort();
};
