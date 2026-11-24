import { describe, expect, test } from 'bun:test';
import { dimensionIds, loadDossierInputs, packageDossier } from '../dossier.ts';
import { loadDossierSuite } from '../dossier-suite.ts';
import { parseGradedPacket, validateGradedAssessment } from '../graded-contract.ts';
import type { GradedAssessment } from '../graded-contract.ts';
import { evaluateGraded, gradedCapability, gradedPrompt } from '../graded-provider.ts';
import type { GradedProfile } from '../graded-provider.ts';

const packet = packageDossier(loadDossierInputs())[0]!.packet;
const clone = <T>(value: T): T => structuredClone(value);
const fixtureAssessment = (): GradedAssessment => ({
	schemaVersion: '1.0',
	dimensions: Object.fromEntries(
		dimensionIds.map((id) => [
			id,
			{
				grade: 2,
				rationale: 'Synthetic transport fixture; no measured assessment.',
				evidenceIds: ['E01'],
				candidateSpans: ['reply-01'],
				confidence: { level: 'medium', rationale: 'Synthetic confidence fixture.' }
			}
		])
	) as GradedAssessment['dimensions'],
	integrated: {
		disposition: 'revise',
		rationale: 'Synthetic integrated fixture.',
		evidenceIds: ['E01'],
		candidateSpans: ['plan-01'],
		hardBreaches: [],
		uncertainties: [
			{
				question: 'Synthetic question?',
				impact: 'Synthetic impact.',
				neededToResolve: 'Synthetic requirement.',
				evidenceIds: ['E02']
			}
		],
		tradeoffs: [
			{
				dimensions: ['policyAuthority', 'supportUsefulness'],
				explanation: 'Synthetic tradeoff.',
				evidenceIds: ['E01'],
				candidateSpans: ['reply-01', 'plan-01']
			}
		],
		acceptableAlternatives: [
			{ description: 'Synthetic alternative.', limits: 'Synthetic limits.', evidenceIds: ['E03'] }
		],
		confidence: { level: 'low', rationale: 'Synthetic fixture.' }
	}
});
const profile: GradedProfile = {
	api: 'openai',
	model: 'gpt-6-luna',
	url: 'https://api.openai.com/v1',
	apiKeyEnv: 'OPENAI_API_KEY',
	apiKey: 'offline-mock-credential'
};
const envelope = (
	assessment: unknown = fixtureAssessment(),
	overrides: Record<string, unknown> = {}
) => ({
	model: 'gpt-6-luna',
	usage: {
		prompt_tokens: 42,
		completion_tokens: 20,
		total_tokens: 62,
		prompt_tokens_details: { cached_tokens: 10 }
	},
	choices: [
		{ finish_reason: 'stop', message: { content: JSON.stringify(assessment), refusal: null } }
	],
	...overrides
});
const mockFetch = (
	callback: (url: string, init?: RequestInit) => Response | Promise<Response>
): typeof fetch => callback as unknown as typeof fetch;

describe('full frozen graded contract', () => {
	test('accepts input-only packets for all fifty frozen alternatives', () => {
		let count = 0;
		for (const dossier of loadDossierSuite())
			for (const item of packageDossier(dossier)) {
				expect(parseGradedPacket(item.packet).task.scenarioId).toBe(dossier.manifest.scenarioId);
				count++;
			}
		expect(count).toBe(50);
	});
	test('returns six actual ordinal grades and all integrated fields unchanged', () => {
		const assessment = fixtureAssessment();
		expect(validateGradedAssessment(assessment, packet)).toBe(assessment);
		expect(Object.keys(assessment.dimensions)).toEqual([...dimensionIds]);
	});
	test('rejects missing/extra fields, probabilities, decimals, invalid references and duplicate citations', () => {
		const mutations: ((assessment: GradedAssessment) => void)[] = [
			(a) => {
				delete (a.dimensions as Partial<GradedAssessment['dimensions']>).salesEthics;
			},
			(a) => {
				Object.assign(a.dimensions.brandTone, { probability: 0.9 });
			},
			(a) => {
				Object.assign(a.dimensions.policyAuthority, { grade: 0.8 });
			},
			(a) => {
				Object.assign(a.dimensions.policyAuthority, { grade: '2' });
			},
			(a) => {
				a.dimensions.policyAuthority.evidenceIds = ['E99'];
			},
			(a) => {
				a.dimensions.policyAuthority.candidateSpans = ['reply-99'];
			},
			(a) => {
				a.integrated.uncertainties[0]!.evidenceIds = ['E99'];
			},
			(a) => {
				a.integrated.tradeoffs[0]!.candidateSpans = ['plan-99'];
			},
			(a) => {
				a.integrated.acceptableAlternatives[0]!.evidenceIds = ['E99'];
			},
			(a) => {
				a.integrated.evidenceIds = ['E01', 'E01'];
			},
			(a) => {
				a.integrated.tradeoffs[0]!.dimensions = ['brandTone', 'brandTone'];
			},
			(a) => {
				a.integrated.confidence.rationale = '   ';
			},
			(a) => {
				Object.assign(a.integrated.confidence, { level: 0.9 });
			},
			(a) => {
				a.integrated.tradeoffs = [];
			},
			(a) => {
				a.integrated.hardBreaches = [
					{
						code: 'invented-code',
						rationale: 'Synthetic breach.',
						evidenceIds: ['E01'],
						candidateSpans: ['reply-01']
					}
				];
			}
		];
		for (const mutate of mutations) {
			const assessment = fixtureAssessment();
			mutate(assessment);
			expect(() => validateGradedAssessment(assessment, packet)).toThrow();
		}
	});
	test('blocks readiness while preserving dimensional grades for supported hard breaches', () => {
		const assessment = fixtureAssessment();
		assessment.integrated.hardBreaches = [
			{
				code: 'unauthorized-financial-action',
				rationale: 'Synthetic breach.',
				evidenceIds: ['E01'],
				candidateSpans: ['plan-01']
			}
		];
		expect(validateGradedAssessment(assessment, packet).dimensions.brandTone.grade).toBe(2);
		assessment.integrated.disposition = 'ready';
		expect(() => validateGradedAssessment(assessment, packet)).toThrow();
		assessment.integrated.disposition = 'hold-for-review';
		expect(validateGradedAssessment(assessment, packet)).toBe(assessment);
		assessment.integrated.hardBreaches.push(clone(assessment.integrated.hardBreaches[0]!));
		expect(() => validateGradedAssessment(assessment, packet)).toThrow();
	});
	test('rejects private annotations at packet, candidate, rubric and schema boundaries', () => {
		for (const field of ['reviewer', 'sources', 'summary']) {
			const input = JSON.parse(packet);
			input[field] = 'PRIVATE_CANARY';
			expect(() => parseGradedPacket(JSON.stringify(input))).toThrow();
		}
		for (const path of ['candidate', 'rubric', 'schema']) {
			const input = JSON.parse(packet);
			const target =
				path === 'candidate'
					? input.candidate.externalReply[0]
					: path === 'rubric'
						? input.normativeRubric.dimensions[0].anchors
						: input.normativeRubric.responseSchema.properties.integrated.properties.rationale;
			target.reviewer = 'PRIVATE_CANARY';
			expect(() => parseGradedPacket(JSON.stringify(input))).toThrow();
		}
	});
});

describe('graded provider transport, using mock HTTP only', () => {
	test('sends exactly the input-only packet, native JSON mode and explicit full-schema prompt', async () => {
		let calls = 0;
		const result = await evaluateGraded(
			{
				...profile,
				fetch: mockFetch((url, init) => {
					calls++;
					expect(url).toBe('https://api.openai.com/v1/chat/completions');
					expect(init?.redirect).toBe('error');
					const body = JSON.parse(String(init?.body));
					expect(body.messages).toEqual([
						{ role: 'system', content: gradedPrompt },
						{ role: 'user', content: packet }
					]);
					expect(body.response_format).toEqual({ type: 'json_object' });
					expect(body.store).toBe(false);
					expect(JSON.stringify(body)).not.toContain(profile.apiKey!);
					return Response.json(envelope(), { headers: { 'x-request-id': 'req_offline' } });
				})
			},
			packet
		);
		expect(calls).toBe(1);
		expect(result.status).toBe('completed');
		expect(result.assessment).toEqual(fixtureAssessment());
		expect(result.requestId).toBe('req_offline');
		expect(result.usage).toEqual({
			inputTokens: 42,
			outputTokens: 20,
			cachedInputTokens: 10,
			totalTokens: 62
		});
		expect(result.actualCostUsd).toBeNull();
		expect(result.rawResponse).toContain('Synthetic');
	});
	test('blocks unsupported Jev, absent credentials, profile redirects and contaminated packets before HTTP', async () => {
		let calls = 0;
		const fetch = mockFetch(() => {
			calls++;
			throw new Error('Unexpected HTTP');
		});
		expect(gradedCapability({ api: 'jev' }).supported).toBe(false);
		expect((await evaluateGraded({ ...profile, api: 'jev', fetch }, packet)).status).toBe(
			'unsupported-provider'
		);
		expect((await evaluateGraded({ ...profile, apiKey: undefined, fetch }, packet)).status).toBe(
			'setup-error'
		);
		expect(
			(await evaluateGraded({ ...profile, url: 'https://unapproved.invalid/v1', fetch }, packet))
				.status
		).toBe('setup-error');
		const contaminated = { ...JSON.parse(packet), reviewer: 'PRIVATE_CANARY' };
		expect((await evaluateGraded({ ...profile, fetch }, JSON.stringify(contaminated))).status).toBe(
			'contract-error'
		);
		expect(calls).toBe(0);
	});
	test('records refusal, truncated output, invalid JSON and invalid contract as no assessment', async () => {
		const cases = [
			{
				payload: envelope(null, {
					choices: [
						{ finish_reason: 'stop', message: { refusal: 'PRIVATE_REFUSAL', content: null } }
					]
				}),
				status: 'refusal'
			},
			{
				payload: envelope(null, {
					choices: [{ finish_reason: 'length', message: { content: '{}' } }]
				}),
				status: 'incomplete'
			},
			{
				payload: envelope(null, {
					choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }]
				}),
				status: 'parse-error'
			},
			{ payload: envelope({ score: 0.9 }), status: 'contract-error' }
		] as const;
		for (const { payload, status } of cases) {
			const result = await evaluateGraded(
				{ ...profile, fetch: mockFetch(() => Response.json(payload)) },
				packet
			);
			expect(result.status).toBe(status);
			expect(result.assessment).toBeNull();
			const { rawResponse, ...safe } = result;
			expect(JSON.stringify(safe)).not.toContain('PRIVATE_REFUSAL');
			expect(rawResponse).not.toBeNull();
		}
	});
	test('preserves sanitized HTTP status, retry delay and raw private errors with no hidden retry', async () => {
		let calls = 0;
		const result = await evaluateGraded(
			{
				...profile,
				fetch: mockFetch(() => {
					calls++;
					return new Response(`PRIVATE_ERROR ${profile.apiKey}`, {
						status: 429,
						headers: { 'retry-after': '2', 'x-request-id': profile.apiKey! }
					});
				})
			},
			packet
		);
		expect(calls).toBe(1);
		expect(result.status).toBe('api-error');
		expect(result.httpStatus).toBe(429);
		expect(result.retryAfterMs).toBe(2000);
		expect(result.requestId).toBeNull();
		const { rawResponse, ...safe } = result;
		expect(rawResponse).toContain('PRIVATE_ERROR');
		expect(rawResponse).not.toContain(profile.apiKey!);
		expect(rawResponse).toContain('[REDACTED]');
		expect(JSON.stringify(safe)).not.toContain(profile.apiKey!);
		expect(JSON.stringify(safe)).not.toContain('PRIVATE_ERROR');
	});
	test('exposes only known error codes to distinguish exhausted quota from rate limits', async () => {
		for (const code of ['insufficient_quota', 'rate_limit_exceeded', 'PRIVATE_ERROR_CODE']) {
			const result = await evaluateGraded(
				{
					...profile,
					fetch: mockFetch(() =>
						Response.json({ error: { code, message: 'PRIVATE_ERROR_MESSAGE' } }, { status: 429 })
					)
				},
				packet
			);
			expect(result.errorCode).toBe(code === 'PRIVATE_ERROR_CODE' ? null : code);
			const safe = { ...result, rawResponse: null };
			expect(JSON.stringify(safe)).not.toContain('PRIVATE_ERROR');
		}
	});
	test('sanitizes transport exceptions and forwards cancellation', async () => {
		const aborted = new AbortController();
		aborted.abort();
		expect((await evaluateGraded(profile, packet, aborted.signal)).status).toBe('aborted');
		const controller = new AbortController();
		const result = await evaluateGraded(
			{
				...profile,
				fetch: mockFetch((_url, init) => {
					expect(init?.signal).toBe(controller.signal);
					throw new Error(`PRIVATE_EXCEPTION ${profile.apiKey}`);
				})
			},
			packet,
			controller.signal
		);
		expect(result.status).toBe('api-error');
		expect(JSON.stringify(result)).not.toContain('PRIVATE_EXCEPTION');
		expect(JSON.stringify(result)).not.toContain(profile.apiKey!);
	});
});
