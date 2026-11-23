import { describe, expect, test } from 'bun:test';
import { loadTests } from '../src/catalogue.ts';
import { inResearchDir, readTriage } from './helpers/research.ts';

/** A small catalogue: one rule with all its tasks, one with `usable_tasks`, one dropped. */
const triageYaml = `summary:
  entries: 3
rules:
  - id: alpha
    file: rules
    domain: dev
    verdict: as-is
  - id: beta
    file: rules
    domain: business
    verdict: reshape
    usable_tasks: [3, 1]
  - id: gamma
    file: rules
    domain: dev
    verdict: drop
`;

const rulesYaml = `- id: alpha
  tasks: ['Alpha one.', 'Alpha two.']
- id: beta
  tasks: ['Beta one.', 'Beta two.', 'Beta three.']
- id: gamma
  tasks: ['Gamma one.']
`;

describe('loadTests on a small catalogue', () => {
	test('pairs every kept rule with each usable task, in the triage order', () => {
		const tests = inResearchDir({ 'triage.yaml': triageYaml, 'rules.yaml': rulesYaml }, loadTests);
		expect(tests).toEqual([
			{
				rule: 'alpha',
				domain: 'dev',
				file: 'research/rules.yaml',
				verdict: 'as-is',
				task: 1,
				prompt: 'Alpha one.'
			},
			{
				rule: 'alpha',
				domain: 'dev',
				file: 'research/rules.yaml',
				verdict: 'as-is',
				task: 2,
				prompt: 'Alpha two.'
			},
			{
				rule: 'beta',
				domain: 'business',
				file: 'research/rules.yaml',
				verdict: 'reshape',
				task: 3,
				prompt: 'Beta three.'
			},
			{
				rule: 'beta',
				domain: 'business',
				file: 'research/rules.yaml',
				verdict: 'reshape',
				task: 1,
				prompt: 'Beta one.'
			}
		]);
	});

	test('does not read the rule file of a triage whose rules are all dropped', () => {
		const triage = 'rules:\n  - id: gamma\n    file: missing\n    domain: dev\n    verdict: drop\n';
		expect(inResearchDir({ 'triage.yaml': triage }, loadTests)).toEqual([]);
	});

	test.each([
		['the triage is missing', {}, 'Missing research file research/triage.yaml'],
		[
			'a rule file is missing',
			{ 'triage.yaml': triageYaml },
			'Missing research file research/rules.yaml'
		],
		[
			'the triage is not YAML',
			{ 'triage.yaml': 'rules: [\n', 'rules.yaml': rulesYaml },
			'Invalid YAML in research/triage.yaml'
		],
		[
			'the triage has no rules list',
			{ 'triage.yaml': 'summary:\n  entries: 0\n' },
			'research/triage.yaml: expected a rules list'
		],
		[
			'a verdict is unknown',
			{ 'triage.yaml': triageYaml.replace('as-is', 'maybe'), 'rules.yaml': rulesYaml },
			'rules entry 1 (alpha): expected a verdict'
		],
		[
			'an id is repeated',
			{ 'triage.yaml': triageYaml.replace('id: gamma', 'id: alpha'), 'rules.yaml': rulesYaml },
			'rules entry 3: duplicate id alpha'
		],
		[
			'usable_tasks names a task the rule does not have',
			{ 'triage.yaml': triageYaml.replace('[3, 1]', '[4]'), 'rules.yaml': rulesYaml },
			'rules entry 2 (beta): usable_tasks must list distinct task positions from 1 to 3'
		],
		[
			'usable_tasks repeats a task',
			{ 'triage.yaml': triageYaml.replace('[3, 1]', '[1, 1]'), 'rules.yaml': rulesYaml },
			'usable_tasks must list distinct task positions'
		],
		[
			'the rule file lacks a rule the triage names',
			{ 'triage.yaml': triageYaml, 'rules.yaml': rulesYaml.replace('id: beta', 'id: other') },
			'research/rules.yaml: no rule beta, which research/triage.yaml names'
		],
		[
			'a rule has no task prompts',
			{ 'triage.yaml': triageYaml, 'rules.yaml': rulesYaml.replace("['Gamma one.']", '[]') },
			'research/rules.yaml: rule 3 (gamma): expected a list of task prompts'
		]
	])('throws a clear message when %s', (_, files, message) => {
		expect(() => inResearchDir(files, loadTests)).toThrow(message);
	});
});

describe('loadTests on the real research files', () => {
	const triage = readTriage();
	const tests = loadTests();
	const rulesOf = (domain?: string): Set<string> =>
		new Set(tests.filter((test) => !domain || test.domain === domain).map((test) => test.rule));

	test('yields the usable rules and tests the triage summary counts', () => {
		expect(rulesOf().size).toBe(triage.summary.usable!);
		expect(rulesOf('dev').size).toBe(triage.summary.usable_dev!);
		expect(rulesOf('business').size).toBe(triage.summary.usable_business!);
		expect(tests).toHaveLength(triage.summary.usable_tests!);
	});

	test('yields no test of a dropped rule', () => {
		const dropped = triage.rules.filter((entry) => entry.verdict === 'drop').map(({ id }) => id);
		expect(dropped.length).toBeGreaterThan(0);
		expect(tests.filter((test) => dropped.includes(test.rule))).toEqual([]);
	});

	test('yields exactly the usable_tasks of every rule that lists them', () => {
		const limited = triage.rules.filter((entry) => entry.usable_tasks);
		expect(limited.length).toBeGreaterThan(0);
		for (const { id, usable_tasks } of limited)
			expect(tests.filter((test) => test.rule === id).map((test) => test.task)).toEqual(
				usable_tasks!
			);
	});

	test("takes each test's prompt from its rule file", () => {
		expect(tests.find((test) => test.rule === 'po-is-not-booked-arr')).toEqual({
			rule: 'po-is-not-booked-arr',
			domain: 'business',
			file: 'research/business-policy.yaml',
			verdict: 'reshape',
			task: 1,
			prompt: 'Write the July ARR update for the leadership team in finance/arr-july.md.'
		});
	});
});
