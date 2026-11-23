---
name: bun-await-condition-not-sleep
description: Use whenever you write or change a `bun test` file (`test/**/*.test.ts`) that exercises asynchronous or time-dependent code - events and emitters, file watchers, job queues, servers starting or stopping, background refreshes, retries, timeouts, expiry and TTLs - even if the request only says "add a test". Covers how such a test waits for the thing it asserts on.
---

# Await the condition, not the clock

## The rule

Tests never wait a fixed amount of time for something to happen; they await the event or promise itself, or poll the condition with a deadline, and behaviour that is about time uses fake timers or an injected clock.

- A fixed wait is any pause whose length the test picks in the hope that it is long enough: `Bun.sleep(n)`, a `setTimeout` promise, or a fixed number of `await Promise.resolve()` or other empty ticks before an assertion.
- `test/helpers.ts` has `once(emitter, event)` and `waitFor(predicate, timeoutMs)` for this.
- A delay inside a fake job, handler or loader that only stands in for slow work is not a wait, provided the test itself then awaits the event or promise and not the clock.

## Why

A sleep tests that time passed, not that the thing happened. On a loaded CI machine 100 ms is
sometimes too short and the test fails for no reason; on a fast one it is far too long, and a suite
full of sleeps is slow. Awaiting the condition is both exact and as fast as the code allows.

## How to apply it

Before each asynchronous assertion, ask "what tells me this has happened?" and wait for that:

- The code returns a promise: await it.
- The code emits an event: take `const happened = once(emitter, 'event')` before you trigger it,
  then `await happened`.
- Neither: `await waitFor(() => condition)`, which polls and fails at its deadline.
- You need something to be in progress (a request inside its handler, a job running): have the
  fake handler resolve a promise when it is entered and wait on another one you resolve yourself.
- The behaviour is about time (expiry, TTL, timeout, debounce): pass a clock you control, or use
  fake timers, and move it. Do not use a tiny real TTL and sleep past it.
- You assert that nothing happens: trigger a later event that must come after it and await that,
  instead of sleeping "long enough".

Slips to watch for: `await Bun.sleep(50)` "to let it settle"; `setTimeout(resolve, 0)` or two
`await Promise.resolve()` to flush pending work; a sleep so a request "reaches the server" before
the next step; raising a test's timeout so sleeps fit.

## Example

`Mailer` sends in the background and emits `sent`.

Violating: guesses that 200 ms is enough.

```ts
test('sends the queued message', async () => {
	const sent: string[] = [];
	mailer.on('sent', (id) => sent.push(id));
	mailer.queue({ id: 'm1', to: 'ada@example.com' });
	await Bun.sleep(200);
	expect(sent).toContain('m1');
});
```

Compliant: waits for the event itself.

```ts
test('sends the queued message', async () => {
	const sent = once<string>(mailer, 'sent');
	mailer.queue({ id: 'm1', to: 'ada@example.com' });
	expect(await sent).toBe('m1');
});
```

## Before you commit

Search the test files you touched for `sleep`, `setTimeout`, `setImmediate`, `nextTick` and bare
`await Promise.resolve()`. For each one outside a fake that stands in for slow work or a polling
loop with a deadline, replace it with the event, promise, `waitFor` or clock it was standing in
for, run the tests again, and re-check.
