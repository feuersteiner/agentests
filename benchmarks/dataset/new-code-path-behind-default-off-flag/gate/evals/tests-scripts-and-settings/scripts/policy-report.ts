/** Prints each project's daily limit from a policies file: bun scripts/policy-report.ts [path] */
import { loadPolicies, type Policy } from '../src/policies/store.ts';

export function formatReport(policies: Policy[]): string {
	const rows = [...policies].sort((a, b) => b.dailyLimit - a.dailyLimit).map((policy) => `${policy.projectId.padEnd(24)}${policy.dailyLimit}`);
	return [`${'project'.padEnd(24)}daily limit`, ...rows].join('\n');
}

if (import.meta.main) {
	console.log(formatReport(loadPolicies(process.argv[2] ?? 'config/policies.json')));
}
