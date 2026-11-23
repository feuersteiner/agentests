import { expect, test } from 'bun:test';
import { JobQueue } from '../src/queue.ts';
import { once } from './helpers.ts';

test('emits drain after the last job', async () => {
	const queue = new JobQueue();
	const drained = once(queue, 'drain');
	let ran = false;

	queue.enqueue(() => {
		ran = true;
	});

	await drained;
	expect(ran).toBe(true);
});

test('processes every enqueued job in order', async () => {
	const queue = new JobQueue();
	const processed: number[] = [];

	for (const id of [1, 2, 3, 4, 5]) {
		queue.enqueue(async () => {
			processed.push(id);
		});
	}

	await new Promise((resolve) => setTimeout(resolve, 50));
	expect(processed).toEqual([1, 2, 3, 4, 5]);
});
