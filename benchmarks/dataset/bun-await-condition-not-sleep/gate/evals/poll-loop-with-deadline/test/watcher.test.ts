import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileWatcher, type ChangeEvent } from '../src/watcher.ts';

const watcher = new FileWatcher({ interval: 5 });

afterEach(() => watcher.close());

/** Re-checks `condition` every few milliseconds and throws when it is still false after two seconds. */
const until = async (condition: () => boolean): Promise<void> => {
	const deadline = Date.now() + 2_000;
	while (!condition()) {
		if (Date.now() > deadline) throw new Error('Timed out waiting for the condition');
		await Bun.sleep(5);
	}
};

test('emits one change event per modified file', async () => {
	const directory = mkdtempSync(join(tmpdir(), 'watcher-'));
	const files = ['a.txt', 'b.txt', 'c.txt'].map((name) => join(directory, name));
	for (const file of files) writeFileSync(file, 'before');
	const changed = new Set<string>();
	watcher.on('change', (event: ChangeEvent) => changed.add(event.path));
	for (const file of files) watcher.watch(file);

	for (const file of files) writeFileSync(file, 'after, and longer');

	await until(() => changed.size === files.length);
	expect([...changed].sort()).toEqual(files);
});
