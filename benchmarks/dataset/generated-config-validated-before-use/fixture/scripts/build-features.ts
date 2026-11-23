// Turns the pipeline's export into data/features.json. Run it with `bun run build:features`.
import { readFileSync, writeFileSync } from 'node:fs';

export interface BuiltFeature {
	name: string;
	header: string;
	contains: string;
	weight: number;
}

/** Builds the feature entries from the export's CSV: a header row, then name,header,contains,weight. */
export function buildFeatures(csv: string): BuiltFeature[] {
	const [, ...rows] = csv.trim().split('\n');
	return rows.map((row) => {
		const [name, header, contains, weight] = row.split(',').map((cell) => cell.trim());
		return { name, header, contains, weight: Number(weight) };
	});
}

if (import.meta.main) {
	const features = buildFeatures(readFileSync('pipeline/features.csv', 'utf8'));
	writeFileSync('data/features.json', JSON.stringify(features, null, 2) + '\n');
	console.log(`Wrote ${features.length} features to data/features.json`);
}
