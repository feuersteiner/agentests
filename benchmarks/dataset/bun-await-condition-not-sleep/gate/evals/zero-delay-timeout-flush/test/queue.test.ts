import { expect, test } from 'bun:test';
import { JobQueue } from '../src/queue.ts';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('processes every enqueued job in order', async () => {
	const queue = new JobQueue();
	const processed: string[] = [];

	queue.enqueue(async () => void processed.push('a'));
	queue.enqueue(async () => void processed.push('b'));
	queue.enqueue(async () => void processed.push('c'));

	await tick();
	expect(processed).toEqual(['a', 'b', 'c']);
});
