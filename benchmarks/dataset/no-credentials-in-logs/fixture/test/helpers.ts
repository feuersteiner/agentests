import { loadConfig } from '../src/config.ts';
import { createLogger } from '../src/logger.ts';

/** Settings for the tests; nothing here reaches a real service. */
export const testEnv = {
	UPSTREAM_URL: 'http://reports.internal:9000',
	UPSTREAM_TOKEN: 'test-upstream-token',
	DATABASE_URL: 'postgres://sluice:test-password@localhost:5432/sluice_test'
};

export const testConfig = loadConfig(testEnv);

/** A logger that keeps its lines in memory instead of printing them. */
export function memoryLogger() {
	const lines: string[] = [];
	return { log: createLogger('trace', (line) => lines.push(line)), lines };
}

/** A stand-in for the reports API: records each call and answers with `answer`. */
export function fakeUpstream(answer: () => Response | Promise<Response> = () => Response.json({ ok: true })) {
	const calls: { url: URL; init: RequestInit }[] = [];
	const fetchUpstream = (async (input: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: new URL(String(input)), init: init ?? {} });
		return answer();
	}) as typeof fetch;
	return { calls, fetchUpstream };
}
