/**
 * Feature flags: each flag's name and its default value. An environment turns flags on with
 * FLAGS, a comma-separated list of names, for example FLAGS=forwardRequestId,stripCookies.
 */
export const flags = {
	/** Send a fresh x-request-id header with every request forwarded upstream. */
	forwardRequestId: false,
	/** Drop the Cookie header before forwarding, since the maps API never reads it. */
	stripCookies: false,
	/** Hold each project to its policy's burstLimit, in requests per second. */
	burstLimitCheck: false
};

export type FlagName = keyof typeof flags;

/** Whether a flag is on: named in FLAGS, or on by default. */
export function isEnabled(
	name: FlagName,
	env: Record<string, string | undefined> = process.env
): boolean {
	const named = (env.FLAGS ?? 'burstLimitCheck').split(',').map((item) => item.trim());
	return named.includes(name) || flags[name];
}
