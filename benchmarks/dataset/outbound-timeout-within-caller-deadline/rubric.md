# Rubric: outbound calls stay within the caller's deadline

## The rule

Every outbound call made while serving a request has a timeout derived from the time left in that request's deadline, including retries, never a hard-coded value longer than the caller will wait.

- Every request has a 5,000 ms budget (`REQUEST_TIMEOUT_MS` in `src/config.ts`). The middleware in `src/middleware/deadline.ts` sets `req.deadline`, the epoch time in milliseconds at which the caller stops waiting, and answers 504 when it passes; `remainingMs(deadline)` in the same file returns the milliseconds left.
- An outbound call is a `fetch`, or any other request to another service, made by a route or a client. A `fetch` without a `signal` has no timeout at all.
- A call's timeout is the time left, or a smaller fixed cap when more time is left, as in `Math.min(remainingMs(deadline), 1500)`. A fixed number on its own, however small, and a new deadline such as `Date.now() + 10_000` are invented, not derived: the request may have spent most of its budget before the call starts. A route that calls a client passes it `req.deadline`, or the time left or an abort signal computed from it.
- A retry is another call on the same budget: each attempt's timeout is the time left when that attempt starts, and before every wait and every new attempt the code checks the time left and gives up when it would run past the deadline.

## What to look at

Before the change, the quote route passed `req.deadline` to the pricing and tax clients, and each
gave `fetch` the signal `AbortSignal.timeout(remainingMs(deadline))`. Judge every outbound call
the diff adds or changes, in routes and clients alike:

1. **A timeout at all.** Every new `fetch` has a `signal`; a bare `fetch(url)` can wait for ever.
2. **Where the number comes from.** `remainingMs(deadline)` or `deadline - Date.now()`, possibly
   capped lower with `Math.min` or combined with a shorter signal through `AbortSignal.any`, is
   derived. A constant (`AbortSignal.timeout(3000)`, `TAX_TIMEOUT_MS`, `REQUEST_TIMEOUT_MS`) or a
   client's own `Date.now() + n` deadline is not, even below 5,000 ms; nor is
   `Math.max(remaining, n)`, which can exceed the time left.
3. **Propagation.** A new client takes the deadline (or the time left or a signal from it), and
   the route passes `req.deadline`, not a number of its own.
4. **Retries.** Each attempt gets the time left when it starts, not a fixed timeout or one figure
   computed before the loop, and the loop checks the time left before each backoff wait and new
   attempt. Unchecked waits of a second or more, or attempts that can add up past 5,000 ms, break it.
5. **The hung tax service.** A cap under the time left is fine; swapping the deadline for a fixed
   timeout, or adding fixed-timeout retries, breaks the rule.

Judge only what the diff adds or changes; tests are not judged. Then check the task: every
numbered step is done. The other steps count only toward whether the task is done: a diff that
follows the rule but skips a step is a 7 to 9, and a diff that breaks the rule is a 1 to 6
however well it does the other steps.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new or changed outbound call has no timeout, or a fixed one that, alone or with
  retries, can exceed the 5,000 ms budget.
- **4 to 6**: timeouts are bounded but not derived everywhere: fixed ones that stay well under
  the budget with retries, or derived in one place and fixed or missing in another.
- **7 to 9**: every new or changed call is bounded by the time left; a minor lapse, such as one
  backoff wait that can overrun the deadline by a moment, or a step of the prompt missing.
- **10**: the whole task is done, and every new or changed call and retry is bounded by the time left.

What each looks like:
- **2**: the shipping or fraud client calls `fetch` with no signal, or with
  `AbortSignal.timeout(10_000)`; or pricing retries three times with `AbortSignal.timeout(3000)`
  per attempt and growing backoff, so one quote can wait well over 5 s.
- **5**: the new client uses `remainingMs(deadline)` but the tax fix swaps the deadline for a
  fixed `AbortSignal.timeout(2000)`; or retries use a fixed 1,000 ms per attempt with two
  attempts and short backoff, under the budget but blind to the time already spent.
- **8**: every call takes `remainingMs(deadline)` and retries recompute it, but a short backoff
  (100 ms or so) is slept unchecked, so it can overrun by that much; or a README step is missing.
- **10**: the route passes `req.deadline` to a new shipping or fraud client that uses
  `remainingMs(deadline)`; tax uses `Math.min(remainingMs(deadline), 1500)`; pricing recomputes
  the time left per attempt and stops when the next backoff would pass it. All steps are done.
