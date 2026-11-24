import type { Candidate } from './dossier.ts';
import type { GradedProfile, GradedStatus, GradedUsage } from './graded-provider.ts';

export interface ProducerMessage {
	role: 'user' | 'assistant';
	content: string;
}
export interface ProducerResult {
	status: GradedStatus;
	candidate: Candidate | null;
	latencyMs: number;
	requestId: string | null;
	responseModel: string | null;
	usage: GradedUsage;
	actualCostUsd: number | null;
	httpStatus: number | null;
	retryAfterMs: number | null;
	error: string | null;
	errorCode: string | null;
	/** Private evidence only, with the runtime credential redacted. */
	rawResponse: string | null;
}
const record = (v: unknown): Record<string, unknown> | null =>
	v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const count = (v: unknown): number | null =>
	typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
const label = (v: unknown, secret: string): string | null =>
	typeof v === 'string' &&
	/^[a-zA-Z0-9_.:-]{1,200}$/u.test(v) &&
	!v.includes(secret) &&
	!/^(sk-|Bearer)/iu.test(v)
		? v
		: null;

/** Reject all extra fields, empty text and missing or non-sequential span IDs. */
export const validateProducerCandidate = (value: unknown): Candidate => {
	const candidate = record(value);
	if (
		!candidate ||
		Object.keys(candidate).length !== 2 ||
		!Object.hasOwn(candidate, 'externalReply') ||
		!Object.hasOwn(candidate, 'internalPlan')
	)
		throw new Error('Producer candidate contract validation failed');
	for (const [field, prefix] of [
		['externalReply', 'reply'],
		['internalPlan', 'plan']
	] as const) {
		const spans = candidate[field];
		if (!Array.isArray(spans) || spans.length === 0)
			throw new Error('Producer candidate contract validation failed');
		spans.forEach((value, index) => {
			const span = record(value);
			if (
				!span ||
				Object.keys(span).length !== 2 ||
				span.id !== `${prefix}-${String(index + 1).padStart(2, '0')}` ||
				typeof span.text !== 'string' ||
				!span.text.trim()
			)
				throw new Error('Producer candidate contract validation failed');
		});
	}
	return value as Candidate;
};

/** One request only. Caller owns deadline, conversation isolation, feedback and retries. */
export const generateDraft = async (
	profile: GradedProfile,
	messages: ProducerMessage[],
	signal?: AbortSignal
): Promise<ProducerResult> => {
	const start = performance.now();
	const result: ProducerResult = {
		status: 'setup-error',
		candidate: null,
		latencyMs: 0,
		requestId: null,
		responseModel: null,
		usage: { inputTokens: null, outputTokens: null, cachedInputTokens: null, totalTokens: null },
		actualCostUsd: null,
		httpStatus: null,
		retryAfterMs: null,
		error: null,
		errorCode: null,
		rawResponse: null
	};
	const finish = (status: GradedStatus, error: string | null): ProducerResult => ({
		...result,
		status,
		error,
		latencyMs: performance.now() - start
	});
	if (signal?.aborted) return finish('aborted', 'Producer request aborted.');
	if (
		profile.api !== 'openai' ||
		profile.url !== 'https://api.openai.com/v1' ||
		profile.model !== 'gpt-6.1-terra' ||
		profile.apiKeyEnv !== 'OPENAI_API_KEY' ||
		!profile.apiKey ||
		/[\r\n]/u.test(profile.apiKey)
	)
		return finish('setup-error', 'Invalid producer configuration.');
	const max = profile.maxOutputTokens ?? 16384;
	if (
		!Number.isInteger(max) ||
		max < 1 ||
		max > 128000 ||
		!Array.isArray(messages) ||
		messages.length < 1 ||
		messages.length > 5 ||
		messages.length % 2 !== 1 ||
		messages.some(
			(m, i) =>
				!m ||
				Object.keys(m).length !== 2 ||
				m.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
				typeof m.content !== 'string' ||
				!m.content.trim()
		)
	)
		return finish('setup-error', 'Invalid producer request.');
	try {
		const response = await (profile.fetch ?? fetch)(`${profile.url}/chat/completions`, {
			method: 'POST',
			redirect: 'error',
			signal,
			headers: { Authorization: `Bearer ${profile.apiKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: profile.model,
				store: false,
				stream: false,
				messages,
				response_format: { type: 'json_object' },
				max_completion_tokens: max
			})
		});
		result.httpStatus = response.status;
		result.requestId = label(response.headers.get('x-request-id'), profile.apiKey);
		const retry = response.headers.get('retry-after');
		if (retry) {
			const seconds = Number(retry);
			const date = Date.parse(retry);
			result.retryAfterMs =
				Number.isFinite(seconds) && seconds >= 0
					? Math.ceil(seconds * 1000)
					: Number.isFinite(date)
						? Math.max(0, date - Date.now())
						: null;
		}
		const raw = await response.text();
		result.rawResponse = raw.split(profile.apiKey).join('[REDACTED]');
		if (!response.ok) {
			try {
				const code = record(record(JSON.parse(raw))?.error)?.code;
				if (
					typeof code === 'string' &&
					[
						'insufficient_quota',
						'rate_limit_exceeded',
						'invalid_api_key',
						'model_not_found',
						'context_length_exceeded',
						'billing_hard_limit_reached'
					].includes(code)
				)
					result.errorCode = code;
			} catch {
				/* retain HTTP status */
			}
			return finish('api-error', 'Producer HTTP request failed.');
		}
		let payload: Record<string, unknown> | null;
		try {
			payload = record(JSON.parse(raw));
		} catch {
			return finish('parse-error', 'Invalid producer response envelope.');
		}
		if (!payload) return finish('parse-error', 'Invalid producer response envelope.');
		result.responseModel = label(payload.model, profile.apiKey);
		const usage = record(payload.usage),
			details = record(usage?.prompt_tokens_details);
		result.usage = {
			inputTokens: count(usage?.prompt_tokens),
			outputTokens: count(usage?.completion_tokens),
			cachedInputTokens: count(details?.cached_tokens),
			totalTokens: count(usage?.total_tokens)
		};
		if (!Array.isArray(payload.choices) || payload.choices.length !== 1)
			return finish('parse-error', 'Invalid producer choices.');
		const choice = record(payload.choices[0]),
			message = record(choice?.message);
		if (message?.refusal || choice?.finish_reason === 'content_filter')
			return finish('refusal', 'Producer refused the request.');
		if (choice?.finish_reason !== 'stop')
			return finish('incomplete', 'Producer response did not finish normally.');
		if (typeof message?.content !== 'string')
			return finish('parse-error', 'Producer response text missing.');
		let draft: unknown;
		try {
			draft = JSON.parse(message.content);
		} catch {
			return finish('parse-error', 'Producer response was not JSON.');
		}
		try {
			result.candidate = validateProducerCandidate(draft);
		} catch {
			return finish('contract-error', 'Producer response failed the candidate contract.');
		}
		return finish('completed', null);
	} catch {
		return signal?.aborted
			? finish('aborted', 'Producer request aborted.')
			: finish('api-error', 'Producer transport failed.');
	}
};
