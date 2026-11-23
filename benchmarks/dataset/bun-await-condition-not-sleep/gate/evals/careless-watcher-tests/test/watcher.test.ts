import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileWatcher, type ChangeEvent } from '../src/watcher.ts';

let directory: string;
let watcher: FileWatcher;

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'relay-watcher-'));
	watcher = new FileWatcher({ interval: 10 });
});

afterEach(() => {
	watcher.close();
	rmSync(directory, { recursive: true, force: true });
});

test('emits a change event when a watched file is modified', async () => {
	const file = join(directory, 'relay.config.json');
	writeFileSync(file, '{}');
	const events: string[] = [];
	watcher.on('change', (event: ChangeEvent) => events.push(event.path));
	watcher.watch(file);

	writeFileSync(file, '{"workers":4}');
	await Bun.sleep(100);

	expect(events).toContain(file);
});

test('does not emit when the file is left alone', async () => {
	const file = join(directory, 'relay.config.json');
	writeFileSync(file, '{}');
	const events: string[] = [];
	watcher.on('change', (event: ChangeEvent) => events.push(event.path));
	watcher.watch(file);

	await Bun.sleep(100);

	expect(events).toEqual([]);
});

test('stops emitting after unwatch', async () => {
	const file = join(directory, 'relay.config.json');
	writeFileSync(file, '{}');
	const events: string[] = [];
	watcher.on('change', (event: ChangeEvent) => events.push(event.path));
	watcher.watch(file);
	watcher.unwatch(file);

	writeFileSync(file, '{"workers":4}');
	await new Promise((resolve) => setTimeout(resolve, 100));

	expect(events).toHaveLength(0);
});
