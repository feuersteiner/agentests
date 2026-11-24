import { describe, expect, test } from 'bun:test';
import {
	freezeProducerCases,
	makeJudgePacket,
	makeProducerPrompt,
	sixArms,
	supportSkill
} from '../six-protocol.ts';
import { parseGradedPacket } from '../graded-contract.ts';

describe('six-arm producer protocol', () => {
	test('freezes ten cases and six distinct arms with the intended allocation', () => {
		const cases = freezeProducerCases();
		expect(cases).toHaveLength(10);
		expect(new Set(cases.map((c) => c.id)).size).toBe(10);
		expect(cases.every((c) => c.context.length === 20)).toBe(true);
		expect(sixArms).toHaveLength(6);
		expect(sixArms.filter((a) => a.skill)).toHaveLength(3);
		expect(sixArms.filter((a) => a.gate)).toHaveLength(4);
	});
	test('producer prompt omits reviewer task and skill is explicit only when selected', () => {
		const c = freezeProducerCases()[0]!;
		const base = makeProducerPrompt(c, false),
			withSkill = makeProducerPrompt(c, true);
		expect(base).not.toContain(String(c.task.instruction));
		expect(base).not.toContain(supportSkill);
		expect(withSkill).toContain(JSON.stringify(supportSkill).slice(1, -1));
		expect(JSON.parse(base).context).toEqual(c.context);
	});
	test('judge packet contains the supplied draft alone', () => {
		const c = freezeProducerCases()[0]!;
		const draft = {
			externalReply: [{ id: 'reply-01', text: 'New reply' }],
			internalPlan: [{ id: 'plan-01', text: 'New plan' }]
		};
		expect(parseGradedPacket(makeJudgePacket(c, draft)).candidate).toEqual(draft);
	});
});
