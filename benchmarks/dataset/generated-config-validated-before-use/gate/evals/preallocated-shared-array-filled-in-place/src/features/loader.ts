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

// Allocated once, at MAX_FEATURES, and filled in place by every load, so loading allocates nothing.
const loaded = new Array<Feature>(MAX_FEATURES);

/**
 * Reads the features file at `path` into the shared feature array and returns it (the same array
 * on every call). The array is left empty, with the reason logged, when the file is bad.
 */
export function loadFeatures(path: string): Feature[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		log.error('features file not loaded', { path, problem: String(error) });
		loaded.length = 0;
		return loaded;
	}
	if (!Array.isArray(parsed) || parsed.length > MAX_FEATURES) {
		log.error('features file not loaded', { path, problem: 'not a list of at most MAX_FEATURES entries' });
		loaded.length = 0;
		return loaded;
	}
	const names = new Set<string>();
	for (let index = 0; index < parsed.length; index++) {
		const entry: unknown = parsed[index];
		const { name, header, contains } = (entry ?? {}) as Record<string, unknown>;
		if (!isText(name) || !isText(header) || !isText(contains) || names.has(name)) {
			log.error('features file not loaded', { path, problem: `entry ${index} is incomplete or a duplicate` });
			loaded.length = 0;
			return loaded;
		}
		names.add(name);
		loaded[index] = { name, header: header.toLowerCase(), contains };
	}
	loaded.length = parsed.length;
	return loaded;
}

function isText(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}
