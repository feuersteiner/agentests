import { expect, test } from 'bun:test';
import { JobQueue } from '../src/queue.ts';
import { deferred, once } from './helpers.ts';

test('emits drain only after the last job has finished', async () => {
	const queue = new JobQueue();
	const gate = deferred();
	let finished = false;
	const drained = once(queue, 'drain').then(() => finished);

	queue.enqueue(async () => {
		await gate.promise;
		finished = true;
	});
	gate.resolve();

	expect(await drained).toBe(true);
});

test('keeps going after a job throws', async () => {
	const queue = new JobQueue();
	const failure = once<Error>(queue, 'error');
	const drained = once(queue, 'drain');
	let ranSecond = false;

	queue.enqueue(() => {
		throw new Error('boom');
	});
	queue.enqueue(() => {
		ranSecond = true;
	});

	expect((await failure).message).toBe('boom');
	await drained;
	expect(ranSecond).toBe(true);
});
