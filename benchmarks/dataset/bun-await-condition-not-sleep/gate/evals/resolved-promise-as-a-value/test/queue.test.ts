import { expect, test } from 'bun:test';
import { JobQueue } from '../src/queue.ts';
import { once } from './helpers.ts';

test('accepts jobs that return a promise and jobs that return nothing', async () => {
	const queue = new JobQueue();
	const ran: string[] = [];
	const drained = once(queue, 'drain');

	queue.enqueue(() => {
		ran.push('plain');
	});
	queue.enqueue(() => {
		ran.push('promise');
		return Promise.resolve();
	});

	await drained;
	expect(ran).toEqual(['plain', 'promise']);
});
