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

/** Up to MAX_FEATURES entries with distinct names, each with its three texts. */
function checkFeatures(value: unknown): Checked {
	if (!Array.isArray(value)) return { ok: false, problem: 'not a JSON array' };
	const features = new Array<Feature>(MAX_FEATURES);
	let count = 0;
	const names = new Set<string>();
	for (const [index, entry] of value.entries()) {
		if (count === MAX_FEATURES) {
			log.warn('features file has more than MAX_FEATURES entries, ignoring the rest', { entries: value.length });
			break;
		}
		if (typeof entry !== 'object' || entry === null) {
			return { ok: false, problem: `entry ${index} is not an object` };
		}
		const { name, header, contains } = entry as Record<string, unknown>;
		if (!isText(name) || !isText(header) || !isText(contains)) {
			return { ok: false, problem: `entry ${index} needs a name, a header and a contains text` };
		}
		if (names.has(name)) return { ok: false, problem: `two entries are named "${name}"` };
		names.add(name);
		features[count++] = { name, header: header.toLowerCase(), contains };
	}
	features.length = count;
	return { ok: true, features };
}

function isText(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}
