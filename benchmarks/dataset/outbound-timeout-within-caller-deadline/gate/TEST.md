# Outbound calls stay within the caller's deadline

The TypeScript routes and service clients under `src/routes/` and `src/clients/` bound every call
they make to another service by the request's deadline:

Every outbound call made while serving a request has a timeout derived from the time left in that request's deadline, including retries, never a hard-coded value longer than the caller will wait.

- Every request has a 5,000 ms budget (`REQUEST_TIMEOUT_MS` in `src/config.ts`). The middleware in `src/middleware/deadline.ts` sets `req.deadline`, the epoch time in milliseconds at which the caller stops waiting, and answers 504 when it passes; `remainingMs(deadline)` in the same file returns the milliseconds left.
- An outbound call is a `fetch`, or any other request to another service, made by a route or a client. A `fetch` without a `signal` has no timeout at all.
- A call's timeout is the time left, or a smaller fixed cap when more time is left, as in `Math.min(remainingMs(deadline), 1500)`. A fixed number on its own, however small, and a new deadline such as `Date.now() + 10_000` are invented, not derived: the request may have spent most of its budget before the call starts. A route that calls a client passes it `req.deadline`, or the time left or an abort signal computed from it.
- A retry is another call on the same budget: each attempt's timeout is the time left when that attempt starts, and before every wait and every new attempt the code checks the time left and gives up when it would run past the deadline.

Tests, scripts and the middleware itself are not judged.
