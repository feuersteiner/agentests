import { readFileSync } from 'node:fs';
import { log } from '../log.ts';
import { MAX_FEATURES } from './limits.ts';

/** One request feature, as scripts/build-features.ts writes it to data/features.json. */
export interface Feature {
	/** Unique name from the pipeline, such as "ua_headless". */
	name: string;
	/** Lower-case name of the request header the feature looks at. */
	header: string;
	/** The feature matches when the header's value contains this text. */
	contains: string;
}

type Checked = { ok: true; features: Feature[] } | { ok: false; problem: string };

/**
 * Reads the features file at `path`. Returns its features, or an empty list, with the reason
 * logged, when the file cannot be read or parsed or does not pass `checkFeatures`.
 */
export function loadFeatures(path: string): Feature[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		log.error('features file not loaded', { path, problem: String(error) });
		return [];
	}
	const checked = checkFeatures(parsed);
	if (!checked.ok) {
		log.error('features file not loaded', { path, problem: checked.problem });
		return [];
	}
	return checked.features;
}

/** A list of at most MAX_FEATURES entries; entries without their texts, and repeated names, are skipped. */
function checkFeatures(value: unknown): Checked {
	if (!Array.isArray(value)) return { ok: false, problem: 'not a JSON array' };
	if (value.length > MAX_FEATURES) {
		return { ok: false, problem: `${value.length} entries, more than ${MAX_FEATURES}` };
	}
	const features: Feature[] = [];
	const names = new Set<string>();
	for (const [index, entry] of value.entries()) {
		const { name, header, contains } = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;
		if (!isText(name) || !isText(header) || !isText(contains)) {
			log.warn('skipping a features entry without its texts', { index });
			continue;
		}
		if (names.has(name)) {
			log.warn('skipping a repeated feature name', { index, name });
			continue;
		}
		names.add(name);
		features.push({ name, header: header.toLowerCase(), contains });
	}
	return { ok: true, features };
}

function isText(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}
