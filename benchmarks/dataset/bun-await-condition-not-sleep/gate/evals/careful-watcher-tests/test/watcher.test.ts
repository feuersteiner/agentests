import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileWatcher, type ChangeEvent } from '../src/watcher.ts';
import { once, waitFor } from './helpers.ts';

let directory: string;
let watcher: FileWatcher;

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'relay-watcher-'));
	watcher = new FileWatcher({ interval: 5 });
});

afterEach(() => {
	watcher.close();
	rmSync(directory, { recursive: true, force: true });
});

test('emits change with the path when a watched file is modified', async () => {
	const file = join(directory, 'relay.config.json');
	writeFileSync(file, '{}');
	watcher.watch(file);

	const changed = once<ChangeEvent>(watcher, 'change');
	writeFileSync(file, '{"workers":4}');

	expect((await changed).path).toBe(file);
});

test('reports each modified file by its own path', async () => {
	const first = join(directory, 'first.txt');
	const second = join(directory, 'second.txt');
	writeFileSync(first, 'one');
	writeFileSync(second, 'two');
	watcher.watch(first);
	watcher.watch(second);
	const paths: string[] = [];
	watcher.on('change', (event: ChangeEvent) => paths.push(event.path));

	writeFileSync(first, 'one, edited');
	writeFileSync(second, 'two, edited');

	await waitFor(() => paths.length === 2);
	expect(paths.sort()).toEqual([first, second]);
});
