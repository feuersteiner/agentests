import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileWatcher, type ChangeEvent } from '../src/watcher.ts';
import { once } from './helpers.ts';

let file: string;
let watcher: FileWatcher;

beforeEach(() => {
	file = join(mkdtempSync(join(tmpdir(), 'watcher-')), 'settings.json');
	writeFileSync(file, '{}');
	watcher = new FileWatcher({ interval: 5 });
});

afterEach(() => watcher.close());

test('emits change when a watched file is modified', async () => {
	watcher.watch(file);
	const changed = once<ChangeEvent>(watcher, 'change');

	writeFileSync(file, '{"debug":true}');

	expect((await changed).path).toBe(file);
});

test('emits nothing for a file that is no longer watched', async () => {
	let events = 0;
	watcher.on('change', () => events++);
	watcher.watch(file);
	watcher.unwatch(file);

	writeFileSync(file, '{"debug":true}');
	await Bun.sleep(50);

	expect(events).toBe(0);
});
