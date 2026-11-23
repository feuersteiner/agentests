import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A decision model's list prices, in the file's currency. */
export interface ModelPrice {
	inputPerMillion: number;
	outputPerMillion: number;
	perRequest: number;
}

/** `prices.yaml`: when the prices were read, their currency, and each model's prices or null when one is unknown. */
export interface Prices {
	readOn: string;
	currency: string;
	models: Record<string, ModelPrice | null>;
}

/** What a gate arm's decisions used. */
export interface DecisionUsage {
	inputTokens: number;
	outputTokens: number;
	requests: number;
}

/** The `prices.yaml` of this package. */
export const pricesFile = join(import.meta.dirname, '..', 'prices.yaml');

const fields = ['inputPerMillion', 'outputPerMillion', 'perRequest'] as const;

const isFields = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** A model's prices, or null when any of them is null; throws on anything else that is not a price. */
const toPrice = (model: string, value: unknown): ModelPrice | null => {
	if (!isFields(value)) throw new Error(`prices.yaml: models.${model} must be a mapping`);
	for (const field of fields) {
		const price = value[field];
		if (price === null) return null;
		if (typeof price !== 'number' || !Number.isFinite(price) || price < 0)
			throw new Error(
				`prices.yaml: models.${model}.${field} must be a number of 0 or more, or null`
			);
	}
	return {
		inputPerMillion: value.inputPerMillion as number,
		outputPerMillion: value.outputPerMillion as number,
		perRequest: value.perRequest as number
	};
};

/** The prices in `file`; throws when it is missing or malformed. */
export const loadPrices = (file: string = pricesFile): Prices => {
	if (!existsSync(file)) throw new Error(`Missing prices file ${file}`);
	const parsed: unknown = Bun.YAML.parse(readFileSync(file, 'utf8'));
	if (!isFields(parsed) || !isFields(parsed.models))
		throw new Error(`${file}: expected readOn, currency and a models mapping`);
	return {
		readOn: String(parsed.readOn),
		currency: String(parsed.currency),
		models: Object.fromEntries(
			Object.entries(parsed.models).map(([model, value]) => [model, toPrice(model, value)])
		)
	};
};

/** The cost of the usage at the price: tokens per million plus a fee per request. */
export const toCost = (price: ModelPrice, usage: DecisionUsage): number =>
	(usage.inputTokens * price.inputPerMillion) / 1e6 +
	(usage.outputTokens * price.outputPerMillion) / 1e6 +
	usage.requests * price.perRequest;
