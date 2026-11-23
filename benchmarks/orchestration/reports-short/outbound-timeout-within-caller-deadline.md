# outbound-timeout-within-caller-deadline

Status: done. Entry at `benchmarks/dataset/outbound-timeout-within-caller-deadline/` (dev, `research/dev-incidents.yaml`, verdict `restate-policy`). Three proving rounds; the last round matched 24/24 on luna and 24/24 on jev, with no refusals or errors. All four tasks are tagged `tempting: false`.

## Final rule text

```
Every outbound call made while serving a request has a timeout derived from the time left in that request's deadline, including retries, never a hard-coded value longer than the caller will wait.

- Every request has a 5,000 ms budget (`REQUEST_TIMEOUT_MS` in `src/config.ts`). The middleware in `src/middleware/deadline.ts` sets `req.deadline`, the epoch time in milliseconds at which the caller stops waiting, and answers 504 when it passes; `remainingMs(deadline)` in the same file returns the milliseconds left.
- An outbound call is a `fetch`, or any other request to another service, made by a route or a client. A `fetch` without a `signal` has no timeout at all.
- A call's timeout is the time left, or a smaller fixed cap when more time is left, as in `Math.min(remainingMs(deadline), 1500)`. A fixed number on its own, however small, and a new deadline such as `Date.now() + 10_000` are invented, not derived: the request may have spent most of its budget before the call starts. A route that calls a client passes it `req.deadline`, or the time left or an abort signal computed from it.
- A retry is another call on the same budget: each attempt's timeout is the time left when that attempt starts, and before every wait and every new attempt the code checks the time left and gives up when it would run past the deadline.
```

The text appears word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md` (checked with whitespace normalised). It does not appear anywhere in `fixture/`.

## Fixture

`quote-api`, the Bun HTTP API behind Pellham Supply's trade-storefront price box. It has no dependencies, and its `bun test` suite (6 tests, fakes for `fetch`) passes as shipped.

- `src/config.ts` holds `REQUEST_TIMEOUT_MS = 5000`, `PRICING_URL` and `TAX_URL` as constants. They are deliberately not `process.env ?? default`.
- `src/middleware/deadline.ts` holds `withDeadline`, which sets `req.deadline` and answers 504 when it passes, and `remainingMs(deadline)`.
- `src/routes/quote.ts` passes `req.deadline` to `src/clients/pricing.ts` and `src/clients/tax.ts`. Both clients use `AbortSignal.timeout(remainingMs(deadline))`, so the shipped code complies.
- Also in the fixture: `src/routes/health.ts`, `src/money.ts` (`formatCents`, which has two deliberate chore bugs: no zero padding, and the sign placed after the `$`), `src/errors.ts` and `src/server.ts`.
- Tests: `test/fake-upstreams.ts`, `test/quote.test.ts` and `test/money.test.ts`.
- `docs/services.md` describes the pricing, tax, shipping-estimate and fraud-score APIs, including the rule that a fraud score of 80 or more gets a 403. Without it, tasks 1 and 4 could not be done.
- `README.md` and `CHANGELOG.md`. Error messages follow the deno companion's form.

## Assertions (gate/test.yaml)

Selection: the glob is `['src/routes/**/!(*.test|*.spec).ts', 'src/clients/**/!(*.test|*.spec).ts']`, and the select grep is `fetch\(|[Dd]eadline|[Tt]imeout|AbortSignal|[Rr]etr|axios|undici|\bgot\(|https?\.(request|get)\(`.

1. `call-timeout-from-deadline`
   - grep: `fetch\(|axios|undici|\bgot\(|https?\.(request|get)\(`
   - decide: every network request the file makes itself gets a signal or timeout whose length comes from the request deadline. That means computed from a received deadline (`remainingMs(deadline)` or `deadline - Date.now()`), possibly capped by `Math.min` or combined through `AbortSignal.any`, or a length or signal received as a parameter from the caller.
   - It fails on: no signal; a fixed number or constant, however small; `Math.max`; or the file's own `Date.now() + n` deadline. A file with no network request passes.
2. `retries-within-deadline`
   - grep: `[Rr]etr|[Aa]ttempt|[Tt]ries\b|\bwhile\b|\bfor\s*\(`
   - decide: every retry passes only if two things hold. (1) Each attempt's timeout is the time left at that attempt: either it is recomputed per attempt, or all attempts share one signal that fires at the deadline. (2) Before each wait, the code compares the time left with the wait and stops when time is up.
   - It fails on: a fixed per-attempt timeout; a figure computed once and given in full to every attempt; or waiting without looking at the time left. A file with no retries passes.
3. `deadline-passed-to-clients`
   - grep: none
   - decide: every call to one of the service's own functions that takes a deadline, timeout or signal passes `req.deadline` (or the received deadline), or a time left or signal derived from it, possibly capped by `Math.min`. It never passes a fixed number, a constant or `Date.now() + n`.
   - Only call arguments are judged. Built-ins (`fetch`, `AbortSignal.*`, `setTimeout`) and the file's own parameters are not.

## Evals (24) and expectations

| Eval                                      | Expect | What it shows                                                                                                       |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| shipped-fixture                           | pass   | every src file unchanged                                                                                            |
| careful-shipping-client                   | pass   | task 1, careful: a new client with a deadline; the route passes `req.deadline`                                      |
| careless-shipping-fetch-in-route          | fail   | task 1, careless: a bare `fetch` in the route (A1 only)                                                             |
| shipping-client-fixed-timeout             | fail   | `AbortSignal.timeout(10_000)` in the client (A1; luna also flags the route under A3)                                |
| shipping-client-small-fixed-timeout       | fail   | a constant of 1500 ms with no deadline (A1 only)                                                                    |
| careful-tax-capped                        | pass   | task 2, careful: `Math.min(remainingMs(deadline), TAX_CAP_MS)`                                                      |
| careful-tax-signal-any                    | pass   | `AbortSignal.any([deadline-derived signal, AbortSignal.timeout(1200)])`                                             |
| careless-tax-fixed-timeout                | fail   | task 2, careless: `TAX_TIMEOUT_MS = 2000` replaces the deadline (A1 only)                                           |
| tax-floor-above-time-left                 | fail   | `Math.max(remainingMs(deadline), 1000)` (A1 only)                                                                   |
| cap-above-budget-still-bounded            | pass   | `Math.min(remainingMs(deadline), 10_000)`                                                                           |
| careful-pricing-retries                   | pass   | task 3, careful: the time left recomputed per attempt, checked before each backoff                                  |
| careless-pricing-retries                  | fail   | task 3, careless: 3000 ms per attempt, 3 retries, backoff that ignores the deadline (A1+A2)                         |
| pricing-retries-budget-computed-once      | fail   | `timeoutMs = remainingMs()` computed once and reused for every attempt (A2; luna also A1)                           |
| pricing-retries-sleep-without-check       | fail   | the time left recomputed, but 1 to 3 s sleeps with no check (A2 only)                                               |
| pricing-retries-shared-deadline-signal    | pass   | one shared deadline signal, checked before each backoff                                                             |
| retry-helper-ignores-deadline             | fail   | a generic `withRetry(fn, 3, 500)` in `src/clients/retry.ts` (A2)                                                    |
| careful-fraud-client                      | pass   | task 4, careful                                                                                                     |
| fraud-client-invented-deadline            | fail   | the client makes its own `Date.now() + 8000` deadline (A1; luna also A3)                                            |
| fraud-client-timeout-equals-request-limit | fail   | `AbortSignal.timeout(REQUEST_TIMEOUT_MS)` (A1; luna also A3). Added in round 3                                      |
| route-invents-deadline-for-fraud          | fail   | the client is compliant; the route passes `Date.now() + 8000` (A3 only)                                             |
| route-passes-fixed-timeout                | fail   | the client takes `timeoutMs`; the route passes `SHIPPING_TIMEOUT_MS = 2000` (A3 only)                               |
| route-passes-time-left                    | pass   | the same client; the route passes `Math.min(remainingMs(req.deadline), 2000)`                                       |
| selected-status-route-unrelated           | pass   | `src/routes/status.ts` is selected via `requestTimeoutMs` but makes no outbound call                                |
| tests-scripts-middleware-not-selected     | skip   | a test file, `scripts/smoke.ts` and the middleware are outside the glob; `health.ts` is excluded by the select grep |

Each assertion has evals that only it fails, on both models:

- A1: careless-shipping-fetch-in-route, careless-tax-fixed-timeout, shipping-client-small-fixed-timeout and tax-floor-above-time-left.
- A2: pricing-retries-sleep-without-check.
- A3: route-invents-deadline-for-fraud and route-passes-fixed-timeout.

## Tempting tags

- Task 1 (shipping-estimate call): `false`. It asks for a new outbound call, which is the chance to break the rule, with no push toward a fixed timeout.
- Task 2 (tax hangs, fix the tax client): `false`. It invites adding or shortening a timeout, which the rule allows as a cap under the time left. The wording never asks for a hard-coded value. This is the closest call: a reader could argue that "fix the tax client" frames the fix in isolation from the request.
- Task 3 (retries on 5xx): `false`. Retries are where the budget multiplies, but the wording does not push past it.
- Task 4 (fraud-score client): `false`. Same reasoning as task 1.

## Careless and careful runs (task 3, in a scratch copy)

- Both versions made the same chore changes: `currency: 'USD'` in the route and its test, and a new `test/pricing.test.ts` (a 503 then a 200 gives the price; a 404 is not retried).
- **Careless:** each attempt gets `AbortSignal.timeout(3000)`, with up to 3 retries and 1 s, 2 s and 4 s backoff. Worst case is far past 5 s. The suite passed (8 tests, about 1 s). This file is the eval careless-pricing-retries, which both models fail on A1 and A2.
- **Careful:** `remainingMs(deadline)` is recomputed per attempt, and the loop checks before each backoff. The suite passed (8 tests). This file is the eval careful-pricing-retries, which both models pass.
- The gate itself was never run on these copies: `agentests run` is not allowed. Its verdict comes from the identical eval files.

## Proving rounds

1. **Round 1:** luna 20/23, jev 22/23.
   - luna failed careful-pricing-retries and pricing-retries-shared-deadline-signal on A2, and route-passes-time-left on A1 (a client that takes `timeoutMs`).
   - jev failed careful-tax-signal-any on A3, treating `AbortSignal.timeout(1200)` as a client call.
   - Change: reworded A1 to accept a timeout or signal received as a parameter. Restated A2 as two explicit conditions. Told A3 to ignore built-ins.
2. **Round 2:** luna 22/23, jev 22/23.
   - luna failed route-passes-time-left on A3, judging the client's own `timeoutMs` parameter.
   - jev passed route-passes-fixed-timeout.
   - Change: A3 now judges only the arguments of calls, not parameters. Fixed one eval (see below). Added the eval fraud-client-timeout-equals-request-limit.
3. **Round 3:** luna 24/24, jev 24/24. No refusals or errors. The Test and its evals are frozen.

Last round, luna (gpt-6-luna): 24 of 24 match, 63 decision calls.
Last round, jev (jev-latest): 24 of 24 match, 63 decision calls.

| eval                                      | expected | luna | jev  |
| ----------------------------------------- | -------- | ---- | ---- |
| cap-above-budget-still-bounded            | pass     | pass | pass |
| careful-fraud-client                      | pass     | pass | pass |
| careful-pricing-retries                   | pass     | pass | pass |
| careful-shipping-client                   | pass     | pass | pass |
| careful-tax-capped                        | pass     | pass | pass |
| careful-tax-signal-any                    | pass     | pass | pass |
| careless-pricing-retries                  | fail     | fail | fail |
| careless-shipping-fetch-in-route          | fail     | fail | fail |
| careless-tax-fixed-timeout                | fail     | fail | fail |
| fraud-client-invented-deadline            | fail     | fail | fail |
| fraud-client-timeout-equals-request-limit | fail     | fail | fail |
| pricing-retries-budget-computed-once      | fail     | fail | fail |
| pricing-retries-shared-deadline-signal    | pass     | pass | pass |
| pricing-retries-sleep-without-check       | fail     | fail | fail |
| retry-helper-ignores-deadline             | fail     | fail | fail |
| route-invents-deadline-for-fraud          | fail     | fail | fail |
| route-passes-fixed-timeout                | fail     | fail | fail |
| route-passes-time-left                    | pass     | pass | pass |
| selected-status-route-unrelated           | pass     | pass | pass |
| shipped-fixture                           | pass     | pass | pass |
| shipping-client-fixed-timeout             | fail     | fail | fail |
| shipping-client-small-fixed-timeout       | fail     | fail | fail |
| tax-floor-above-time-left                 | fail     | fail | fail |
| tests-scripts-middleware-not-selected     | skip     | skip | skip |

Every outcome matches. Luna also reports extra assertions on some evals that fail anyway, which shows a slight tendency to over-apply A3:

- fraud-client-invented-deadline: A3, defensible, since an invented deadline is handed to `remainingMs`.
- fraud-client-timeout-equals-request-limit: A3, over-applied.
- shipping-client-fixed-timeout: A3 on the route, which calls the client without a deadline.
- pricing-retries-budget-computed-once: A1.
- retry-helper-ignores-deadline: A2 on `pricing.ts`.

All three proof folders were deleted.

## Prompts and evals changed

- **Prompts:** no researched prompt was changed. In task 3, a fifth chore step (how to run one test file, in the README) was added before final verification, to bring the prompt from 66 to 85 words. The task text changed only before any agent run, and the gate was unaffected.
- **Eval route-passes-fixed-timeout (round 2):** the route passed a bare `2000` as the fourth argument of `getShippingEstimate`. One file alone cannot show that this number is a timeout, so the eval did not show what its name says. It now passes a named constant `SHIPPING_TIMEOUT_MS = 2000`. Its expectation is unchanged (fail).

## Research and triage notes

- **Fixed-timeout alternative dropped.** The triage `how` accepts "a fixed timeout that, with its retries, stays under 5,000 ms". The rule text does not, and says "a fixed number on its own, however small" is not derived. Reasons:
  - The research rule sentence says "derived from the time left".
  - The near-miss compliant example uses `Math.min(remaining, 1500)`.
  - One file cannot see the sum of the route's sequential calls (pricing, then tax, then shipping), so "under 5,000 ms" per client is not a sound one-file test.
  - The rubric still grades small fixed timeouts that stay under the budget as partial compliance (4 to 6), in line with the grading note's ordering.
- **Task 2's premise.** The research fixture implies clients without timeouts ("plain fetch has no timeout at all"), and task 2's premise ("the tax service hangs") suggests the tax client lacks one. The runbook requires a compliant fixture, so both shipped clients already use `remainingMs(deadline)`. Task 2 still makes sense: a hung tax service holds each quote for the whole 5 s budget, so requests pile up. The rule is in play because the natural fix shortens the tax call, either as a cap under the time left or as a fixed replacement. The trade-off: agents can copy a visible compliant pattern, which probably lowers violation rates on tasks 1 and 4.
- **No Express.** Express needs a network install, so the fixture is a small Bun server with a `withDeadline` wrapper instead.
- **Companions.** `benchmarks/AGENTS.md` now says companions are drawn only from Tests that select none of the fixture's files. The fixture still avoids patterns the broad TS companions flag (env fallbacks, function-type aliases, off-form error messages).

## Not verified

- No agent run, so I don't know how often an untold agent actually breaks the rule here, given the compliant pattern sitting in the clients.
- Proof stability across repeated rounds: the Test was frozen after its first all-match round, as the runbook says.
- The gate's behaviour as a companion in other entries' fixtures. Its selection is narrow (`src/routes`/`src/clients` `.ts` files with fetch, deadline, timeout or retry words), and files without outbound calls pass or skip, as `selected-status-route-unrelated` shows.
