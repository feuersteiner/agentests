import type { EventEmitter } from 'node:events';

/** Resolves with the payload of the next `event` that `emitter` emits. */
export const once = <Payload = unknown>(emitter: EventEmitter, event: string): Promise<Payload> =>
	new Promise((resolve) => emitter.once(event, resolve));

/** Resolves as soon as `predicate` returns true; rejects when it has not within `timeoutMs`. */
export const waitFor = async (predicate: () => boolean, timeoutMs = 2_000): Promise<void> => {
	const deadline = Date.now() + timeoutMs;
	while (!predicate()) {
		if (Date.now() > deadline) throw new Error(`Condition not met within ${timeoutMs} ms`);
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
};

/** A promise with its `resolve` on the outside, to let a test decide when something finishes. */
export const deferred = <Value = void>() => {
	let resolve!: (value: Value) => void;
	const promise = new Promise<Value>((settle) => (resolve = settle));
	return { promise, resolve };
};
