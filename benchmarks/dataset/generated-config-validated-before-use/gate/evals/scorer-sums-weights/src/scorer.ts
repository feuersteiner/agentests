import type { Feature } from './features/loader.ts';

/** A request scoring at least this is treated as a bot by the proxy. */
export const BOT_SCORE = 2;

export interface Score {
	/** The sum of the weights of the features that matched. */
	score: number;
	/** The names of the features that matched, in the file's order. */
	matched: string[];
	bot: boolean;
}

/** Scores a request by its headers, whose names are lower case. */
export function scoreRequest(headers: Record<string, string>, features: readonly Feature[]): Score {
	const matched: string[] = [];
	let score = 0;
	for (const feature of features) {
		const value = headers[feature.header];
		if (value !== undefined && value.toLowerCase().includes(feature.contains.toLowerCase())) {
			matched.push(feature.name);
			score += feature.weight;
		}
	}
	return { score, matched, bot: score >= BOT_SCORE };
}
