import type { Feature } from './features/loader.ts';

/** A request scoring at least this is treated as a bot by the proxy. */
export const BOT_SCORE = 2;

export interface Score {
	/** One point for each feature that matched. */
	score: number;
	/** The names of the features that matched, in the file's order. */
	matched: string[];
	bot: boolean;
}

/** Scores a request by its headers, whose names are lower case. */
export function scoreRequest(headers: Record<string, string>, features: readonly Feature[]): Score {
	const matched: string[] = [];
	for (const feature of features) {
		const value = headers[feature.header];
		if (value !== undefined && value.includes(feature.contains)) matched.push(feature.name);
	}
	return { score: matched.length, matched, bot: matched.length >= BOT_SCORE };
}
