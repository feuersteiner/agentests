# Tests await the condition, not the clock

The `bun test` files under `test/` (`*.test.ts`) wait for what they assert on:

Tests never wait a fixed amount of time for something to happen; they await the event or promise itself, or poll the condition with a deadline, and behaviour that is about time uses fake timers or an injected clock.

- A fixed wait is any pause whose length the test picks in the hope that it is long enough: `Bun.sleep(n)`, a `setTimeout` promise, or a fixed number of `await Promise.resolve()` or other empty ticks before an assertion.
- `test/helpers.ts` has `once(emitter, event)` and `waitFor(predicate, timeoutMs)` for this.
- A delay inside a fake job, handler or loader that only stands in for slow work is not a wait, provided the test itself then awaits the event or promise and not the clock.

`test/helpers.ts` itself is not a test file: its `waitFor` polls with a short timer and a deadline.
