---
name: outbound-timeout-within-caller-deadline
description: Use whenever you write or change TypeScript code under src/routes/ or src/clients/ that calls another service while handling a request - a new fetch or service client, a call added to a route, retries or backoff around a call, a fix for a slow or hanging upstream service - even if the request never mentions timeouts. Covers what timeout each outbound call and each retry gets, and how a route passes its deadline to the clients it calls.
---

# Outbound calls stay within the caller's deadline

## The rule

Every outbound call made while serving a request has a timeout derived from the time left in that request's deadline, including retries, never a hard-coded value longer than the caller will wait.

- Every request has a 5,000 ms budget (`REQUEST_TIMEOUT_MS` in `src/config.ts`). The middleware in `src/middleware/deadline.ts` sets `req.deadline`, the epoch time in milliseconds at which the caller stops waiting, and answers 504 when it passes; `remainingMs(deadline)` in the same file returns the milliseconds left.
- An outbound call is a `fetch`, or any other request to another service, made by a route or a client. A `fetch` without a `signal` has no timeout at all.
- A call's timeout is the time left, or a smaller fixed cap when more time is left, as in `Math.min(remainingMs(deadline), 1500)`. A fixed number on its own, however small, and a new deadline such as `Date.now() + 10_000` are invented, not derived: the request may have spent most of its budget before the call starts. A route that calls a client passes it `req.deadline`, or the time left or an abort signal computed from it.
- A retry is another call on the same budget: each attempt's timeout is the time left when that attempt starts, and before every wait and every new attempt the code checks the time left and gives up when it would run past the deadline.

## Why

Once the deadline passes, the caller has gone: the middleware has already answered 504. A call
still running after that is work nobody will read, and during an outage those orphaned calls pile
up on the struggling service and keep it down. Google's SRE book describes exactly this: a
backend with a hard-coded 20 s deadline kept serving requests whose caller had given up after
10 s. A fixed timeout is chosen without knowing how much of the budget earlier calls already
spent, and retries multiply it.

## How to apply it

1. A client function takes `deadline: number` and gives every `fetch` a signal built from
   `remainingMs(deadline)`; the route passes `req.deadline`.
2. To make one service fail faster, cap the time left instead of replacing it:
   `Math.min(remainingMs(deadline), capMs)`, or `AbortSignal.any([...])` of both signals.
3. In a retry loop, compute `remainingMs(deadline)` again for each attempt, and before sleeping
   a backoff check that the wait and another attempt still fit; otherwise stop and throw.

Slips to watch for: `fetch(url)` with no options; `AbortSignal.timeout(5000)` "to match the
request limit"; `const SERVICE_TIMEOUT_MS = 2000`; `Date.now() + 8000` as a deadline; a retry
helper that knows attempts and backoff but not the deadline.

## Example

A request handler looks up stock levels from an inventory service, retrying 503s.

Violating: every attempt gets 2 s and the loop never looks at the clock, so three attempts and
their backoff can take more than 6 s, long after the caller gave up.

```ts
for (let attempt = 1; attempt <= 3; attempt++) {
	const res = await fetch(stockUrl, { signal: AbortSignal.timeout(2000) });
	if (res.status !== 503) return res;
	await Bun.sleep(250 * attempt);
}
```

Compliant: each attempt gets what is left, and the loop stops when the next try would not fit.

```ts
for (let attempt = 1; ; attempt++) {
	const res = await fetch(stockUrl, { signal: AbortSignal.timeout(remainingMs(deadline)) });
	if (res.status !== 503) return res;
	const backoffMs = 250 * attempt;
	if (attempt === 3 || remainingMs(deadline) <= backoffMs) throw new Error('Cannot read stock: inventory kept answering 503');
	await Bun.sleep(backoffMs);
}
```

## Before you commit

For every `fetch` or service call in the diff, find its `signal` and trace the number back to
`deadline`. For every client call in a route, check that it is handed `req.deadline`. For every
retry loop, check the per-attempt timeout and the check before each wait. Fix what fails, run the
tests, and check again.
