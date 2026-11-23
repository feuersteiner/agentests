import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_FEATURES } from '../src/features/limits.ts';
import { loadFeatures } from '../src/features/loader.ts';

const dir = mkdtempSync(join(tmpdir(), 'edge-scorer-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let files = 0;
function fileWith(content: unknown): string {
	const path = join(dir, `features-${++files}.json`);
	writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
	return path;
}

const entry = (name: string) => ({ name, header: 'user-agent', contains: name, weight: 1 });

describe('loadFeatures', () => {
	test('loads the generated file', () => {
		const features = loadFeatures('data/features.json');
		expect(features).toHaveLength(7);
		expect(features[0]).toEqual({ name: 'ua_headless', header: 'user-agent', contains: 'headlesschrome' });
	});

	test('lower-cases header names', () => {
		const [feature] = loadFeatures(fileWith([{ ...entry('x'), header: 'User-Agent' }]));
		expect(feature.header).toBe('user-agent');
	});

	test('gives no features for a missing file', () => {
		expect(loadFeatures(join(dir, 'missing.json'))).toEqual([]);
	});

	test('gives no features for a file that is not JSON', () => {
		expect(loadFeatures(fileWith('[{"name": "x",'))).toEqual([]);
	});

	test('gives no features for more than MAX_FEATURES entries', () => {
		const entries = Array.from({ length: MAX_FEATURES + 1 }, (_, i) => entry(`f${i}`));
		expect(loadFeatures(fileWith(entries))).toEqual([]);
	});

	test('gives no features when two entries share a name', () => {
		expect(loadFeatures(fileWith([entry('a'), entry('b'), entry('a')]))).toEqual([]);
	});

	test('gives no features when an entry lacks a text', () => {
		expect(loadFeatures(fileWith([entry('a'), { name: 'b', header: 'accept' }]))).toEqual([]);
	});
});
