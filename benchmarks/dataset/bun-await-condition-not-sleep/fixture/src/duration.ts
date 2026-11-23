const units: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 6_000
};

/** The milliseconds in a duration such as `250ms`, `5s` or `2m`. Throws on anything else. */
export const parseDuration = (text: string): number => {
	const match = /^(\d+)(ms|s|m)$/.exec(text.trim());
	if (!match) throw new Error(`Not a duration: "${text}"`);
	return Number(match[1]) * units[match[2]!]!;
};
