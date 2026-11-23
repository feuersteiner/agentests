import { expect, test } from 'bun:test';
import { formatReport } from '../scripts/policy-report.ts';

test('formatReport prints a row per project under a header', () => {
	const report = formatReport([
		{ projectId: 'fieldnote', dailyLimit: 20000 },
		{ projectId: 'harbour-taxis', dailyLimit: 250000 }
	]);
	expect(report.split('\n')).toEqual([
		'project                 daily limit',
		'fieldnote               20000',
		'harbour-taxis           250000'
	]);
});
