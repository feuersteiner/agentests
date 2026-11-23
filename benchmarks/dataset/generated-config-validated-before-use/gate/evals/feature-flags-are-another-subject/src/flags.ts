/** Feature flags, read from FLAG_<NAME> environment variables set to 1 or 0. */
const DEFAULTS = {
	weightedScore: false,
	adminEndpoints: false
} as const;

export type Flag = keyof typeof DEFAULTS;

/** Whether `flag` is on: its variable when set, else its default. */
export function isEnabled(flag: Flag, env: Record<string, string | undefined> = process.env): boolean {
	if (!(flag in DEFAULTS)) throw new Error(`unknown feature flag "${flag}"`);
	const variable = `FLAG_${flag.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`;
	const value = env[variable];
	return value === undefined ? DEFAULTS[flag] : value === '1';
}
