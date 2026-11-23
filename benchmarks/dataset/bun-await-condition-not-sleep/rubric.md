# Rubric: tests await the condition, not the clock
## The rule

Tests never wait a fixed amount of time for something to happen; they await the event or promise itself, or poll the condition with a deadline, and behaviour that is about time uses fake timers or an injected clock.

- A fixed wait is any pause whose length the test picks in the hope that it is long enough: `Bun.sleep(n)`, a `setTimeout` promise, or a fixed number of `await Promise.resolve()` or other empty ticks before an assertion.
- `test/helpers.ts` has `once(emitter, event)` and `waitFor(predicate, timeoutMs)` for this.
- A delay inside a fake job, handler or loader that only stands in for slow work is not a wait, provided the test itself then awaits the event or promise and not the clock.

## What to look at

Read every test the diff adds or changes, in any test file, and for each asynchronous step ask how
the test knows that the thing has happened before it asserts or moves on:

1. **Fixed waits.** `await Bun.sleep(n)`, `await new Promise((r) => setTimeout(r, n))`, a `delay`
   or `sleep` helper, with any `n` including 0, followed by an assertion or by a step that depends
   on it (for example a sleep "so the request reaches the handler" before `stop()`).
2. **Disguised waits.** A fixed run of `await Promise.resolve()`, `setImmediate` or `nextTick`
   ticks to "flush" pending work, a busy loop on `Date.now()`, or a test timeout raised so that
   sleeps fit. These count as fixed waits.
3. **Time as the subject.** Expiry and timeouts are tested by moving the injected clock (the cache
   takes a `now` function) or fake timers, never by a short real TTL and a sleep past it.
4. **What is fine.** Awaiting a promise the code returns, `once`, a promise the test resolves
   itself, `waitFor` or a hand-written loop that re-checks a condition and gives up at a deadline,
   however generous; and a delay inside a fake that stands in for slow work, as the rule says.
5. **Tests that nothing happens** (no event after `unwatch`, no second load) get no pass for
   sleeping "long enough": the compliant form awaits a later event that proves the moment has
   passed. One such sleep is a minor lapse next to sleeps before positive assertions.

Then check the task: every numbered step of the prompt is done, and the requested test would fail
if the behaviour it names broke. The other steps count only toward whether the task is done: a diff
that follows the rule but skips a step is a 7 to 9, and a diff that breaks the rule is a 1 to 6
however well it does the other steps. Ignore style and the number of tests. The tests and helpers
that existed before already comply; judge only what the diff adds or changes.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the requested test exists, but its asynchronous assertions rest on fixed waits.
- **4 to 6**: awaited events or promises in some places, fixed waits in others.
- **7 to 9**: no fixed wait before a positive assertion; a minor lapse, or a task partly done.
- **10**: the whole task is done and no new or changed test waits a fixed time.

What each looks like:

- **2**: the new test registers a listener or fires the work, does `await Bun.sleep(100)` and then
  asserts; or expiry is reached with a 20 ms TTL and a 30 ms sleep. Every asynchronous assertion
  in the new tests follows a sleep, a timer promise or counted ticks.
- **5**: one new test awaits the event or uses `waitFor`, while another sleeps before asserting; or
  the clock is injected for expiry but the background work is then given `await Bun.sleep(10)` or
  two `await Promise.resolve()` to finish.
- **8**: every positive assertion follows an awaited event, promise or deadline poll and time is
  driven through the clock, but one "nothing happens" check sleeps a fixed time, or one step of
  the prompt is missing or incomplete.
- **10**: for example the change event is awaited with `once` before the write and its path
  asserted; queue order is asserted after awaiting `drain`; the in-flight request is held open
  with a promise the test controls and both the response and `stop()` are awaited; expiry is
  reached by advancing the injected clock and the `refresh` event is awaited. All other steps of
  the prompt are done.
