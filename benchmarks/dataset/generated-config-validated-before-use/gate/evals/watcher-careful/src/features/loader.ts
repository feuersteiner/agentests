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

export type Checked = { ok: true; features: Feature[] } | { ok: false; problem: string };

/**
 * Reads and checks the features file at `path`. Never throws: an unreadable, malformed or
 * invalid file comes back as `{ ok: false, problem }`, with the problem logged.
 */
export function readFeatures(path: string): Checked {
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		log.error('features file not loaded', { path, problem: String(error) });
		return { ok: false, problem: `cannot read or parse ${path}` };
	}
	const checked = checkFeatures(parsed);
	if (!checked.ok) log.error('features file not loaded', { path, problem: checked.problem });
	return checked;
}

/** The features for startup: those of the file, or none when it does not pass. */
export function loadFeatures(path: string): Feature[] {
	const checked = readFeatures(path);
	return checked.ok ? checked.features : [];
}

/** A list of at most MAX_FEATURES entries with distinct names, each with its three texts. */
function checkFeatures(value: unknown): Checked {
	if (!Array.isArray(value)) return { ok: false, problem: 'not a JSON array' };
	if (value.length > MAX_FEATURES) {
		return { ok: false, problem: `${value.length} entries, more than ${MAX_FEATURES}` };
	}
	const features: Feature[] = [];
	const names = new Set<string>();
	for (const [index, entry] of value.entries()) {
		if (typeof entry !== 'object' || entry === null) {
			return { ok: false, problem: `entry ${index} is not an object` };
		}
		const { name, header, contains } = entry as Record<string, unknown>;
		if (!isText(name) || !isText(header) || !isText(contains)) {
			return { ok: false, problem: `entry ${index} needs a name, a header and a contains text` };
		}
		if (names.has(name)) return { ok: false, problem: `two entries are named "${name}"` };
		names.add(name);
		features.push({ name, header: header.toLowerCase(), contains });
	}
	return { ok: true, features };
}

function isText(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}
