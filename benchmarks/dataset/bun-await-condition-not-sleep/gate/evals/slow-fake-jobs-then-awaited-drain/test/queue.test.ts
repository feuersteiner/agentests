import { expect, test } from 'bun:test';
import { JobQueue } from '../src/queue.ts';
import { once } from './helpers.ts';

test('processes every enqueued job in order', async () => {
	const queue = new JobQueue();
	const processed: string[] = [];
	// The first job is the slowest, so a queue that ran jobs side by side would finish it last.
	const job = (name: string, workMs: number) => async () => {
		await Bun.sleep(workMs);
		processed.push(name);
	};
	const drained = once(queue, 'drain');

	queue.enqueue(job('first', 15));
	queue.enqueue(job('second', 5));
	queue.enqueue(job('third', 1));

	await drained;
	expect(processed).toEqual(['first', 'second', 'third']);
});
