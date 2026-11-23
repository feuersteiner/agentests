import { readFileSync } from 'node:fs';

/**
 * A project's quota policy, as the policy service replicates it to every gateway.
 *
 * `dailyLimit` is always set. The other fields were added to the policy service this quarter:
 * records written before a field existed do not have it, and the policy console saves a field
 * left empty as null or as an empty string.
 */
export interface Policy {
	projectId: string;
	/** Requests the project may make per UTC day. */
	dailyLimit: number;
	/** Requests the project may make in any one second. */
	burstLimit?: number | null | '';
	/** The region a regional policy applies to, such as "eu-west". */
	region?: string | null;
	/** Requests per minute the project may make in `region`. */
	maxPerMinute?: number | null | '';
	/** Whether the project is suspended, for example for unpaid invoices. */
	suspended?: boolean | null | '';
}

/** Daily requests for a project with no policy of its own. */
export const FREE_TIER_DAILY_LIMIT = 1000;

export interface PolicyStore {
	/** The project's policy, or the free tier's when the project has none. */
	get(projectId: string): Policy;
	/** Every project that has a policy of its own, by project id. */
	projectIds(): string[];
}

export function createPolicyStore(records: Policy[]): PolicyStore {
	const byProject = new Map(records.map((record) => [record.projectId, record]));
	return {
		get: (projectId) =>
			byProject.get(projectId) ?? { projectId, dailyLimit: FREE_TIER_DAILY_LIMIT },
		projectIds: () => [...byProject.keys()].sort()
	};
}

/** Reads a policies file: a JSON array of policies. */
export function loadPolicies(path: string): Policy[] {
	return JSON.parse(readFileSync(path, 'utf8')) as Policy[];
}
