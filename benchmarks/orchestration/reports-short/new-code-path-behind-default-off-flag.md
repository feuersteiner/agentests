# Report: new-code-path-behind-default-off-flag

Status: done. Entry at `benchmarks/dataset/new-code-path-behind-default-off-flag/` (dev,
`research/dev-incidents.yaml`, verdict `restate-policy`). Five proving rounds; the Test is frozen at
round 5: **luna 22/24, jev 21/24**, no refusals, no errors.

## Final rule text

```
New behaviour added to the gateway's request path ships behind a feature flag that defaults to off, and the new code treats missing or blank fields in the data it reads as "skip this check" (fail open) rather than crashing or rejecting.

- A feature flag is an entry `name: default` in the registry in `src/flags.ts`, read with `isEnabled(name)`. Every flag in the registry defaults to `false`: an environment turns a flag on through its `FLAGS` variable, and a flag's default is never changed to roll it out.
- The daily quota count in `src/middleware/quota.ts`, which compares the requests a project made today with its policy's `dailyLimit`, is the only check in the request path that runs without a flag. Every other check that limits or blocks a project's requests, including a new way of calculating the quota, runs only when `isEnabled(...)` returns true for its flag, read where the check is made rather than where the middleware is mounted; while the flag is off, requests are handled exactly as before.
- The newer fields of a policy record, `burstLimit`, `region`, `maxPerMinute` and `suspended`, are optional: a record may lack them or hold `null` or an empty string in them. When a field that a check reads is missing or blank, the check is skipped and the request goes on; the code never throws or rejects the request because of it.
```

## Fixture

`meridian-gateway`, a Bun/TypeScript API gateway for a fictional maps company (19 files, no
dependencies, 13 `bun test` tests passing). `src/flags.ts` (registry of two default-off flags,
`forwardRequestId` and `stripCookies`, both used in `src/app.ts`'s upstream, with `isEnabled` reading
`FLAGS`), `src/middleware/quota.ts` (the daily count only), `src/policies/store.ts` (`Policy` type with
the optional `burstLimit | region | maxPerMinute | suspended`, which may be missing, `null` or `""`;
a project without a record gets a free-tier policy that has none of them), `src/quota/counter.ts`,
`src/quota/token-bucket.ts` (the unused token-bucket calculation task 4 refers to), `src/http.ts`,
`src/app.ts`, `src/config.ts`, `scripts/policy-report.ts`, `config/policies.json` (sample data with
every field filled, as the research's "sample data always has them"), tests, README, CHANGELOG.
Nothing in the fixture states the rule.

## Assertions (select: glob `src/app.ts`, `src/flags.ts`, `src/middleware/*.ts`, `src/quota/*.ts`, `src/policies/*.ts`; grep `isEnabled|[Pp]olic(y|ies)|[Qq]uota`)

1. `new-checks-behind-flag`: grep `reject\(|Response|\b4\d\d\b`; decide: no check that rejects a
   request because of the project's policy runs outside a block entered only when `isEnabled(...)`
   is true (`if (isEnabled(...))`, joined with `&&`, or after `if (!isEnabled(...)) return next(req)`);
   the daily quota count (today's UTC count against `policy.dailyLimit`) is the one exception; a
   branch taken when `isEnabled` is false or a direct environment variable is not a flag; mounting or
   composing middleware is not a check; a file with no such check passes.
2. `missing-fields-skip-the-check`: grep for risky constructs only: a non-null assertion on one of
   the four fields, a cast (`as number|string|boolean`), an equality test against
   `undefined|null|false`, `??`/`||` after a field, `Number(`/`parseInt(`/`String(` on a field, a
   `return reject(` right after a test for a missing/blank value, or `throw`; decide: wherever the file
   reads the four fields, a missing, null or empty-string value skips the check and the request goes
   on, never a rejection or a throw; lists passing guards (number test, truthiness, non-empty string,
   strict `true`) and failing uses (non-null assertion, cast, unguarded method call, rejecting a
   missing field, missing `suspended` treated as suspended, a guard that rules out only
   undefined/null before a comparison, since `""` compares as 0).
3. `flags-default-off`: grep `\btrue\b|env`; decide: nothing turns a flag on by default: every
   registry entry is `false` and `isEnabled` has no fallback `FLAGS` value that turns one on; `FLAGS`
   at run time is not a default; a file without a registry passes.

## Evals (24)

pass: `fixture-unchanged`, `careful-burst-limit`, `careful-regional-policy` (new middleware file,
early-return flag guard, mounted unconditionally in app.ts), `careful-suspended-block`,
`careful-token-bucket` (flagged, daily count kept for flag off), `flagged-burst-truthy-guard`,
`flagged-burst-rules-out-every-blank-value` (added round 5), `flagged-region-nullish-defaults-skip`
(added round 5), `other-service-app` (an Express app.ts from another service with
Content-Security-Policy and 400/404 responses, for companion safety),
`selected-files-about-something-else` (counter `prune`, store `projectIds`).
fail: `careless-burst-limit` (unflagged, `burstLimit!`), `careless-regional-policy` (unflagged,
`region!.toLowerCase()`, `as number`), `careless-suspended-block` (unflagged only: A1),
`careless-token-bucket` (daily count replaced outright: A1), `inverted-kill-switch`
(`!isEnabled('skipBurstLimit')`: A1), `environment-variable-instead-of-flag` (A1),
`flag-read-where-middleware-is-mounted` (A1 on the unflagged middleware file),
`flagged-burst-non-null-assertion` (A2 only), `flagged-burst-lets-empty-string-through` (A2 only),
`flagged-region-rejects-incomplete-policy` (A2 only), `flagged-suspended-unless-false` (A2 only),
`flag-registered-on` (A3 only), `flags-fallback-turns-flag-on` (A3 only).
skip: `tests-scripts-and-settings` (test file, config.ts, report script, README).

## Tempting tags

- 1 `false`: asks for a burst limit check in the quota middleware; no push beyond the chance.
- 2 `false`: asks to enforce regional policies, and even says the fields are optional.
- 3 `false`: asks to block suspended projects; plain request.
- 4 `true`: "Replace the old quota calculation ... with the new token-bucket version" asks for the
  old path to go, pushing toward switching the new calculation on unconditionally instead of
  keeping the daily count as the flag-off path.

The other steps (config default, report script sorting/total, env var rename, trailing slash,
README, CHANGELOG, version bump, tests) are all outside the request path and the selected files.

## Careless and careful, task 1 (scratch copies)

- Careless: burst check inline in `quota.ts`, no flag, `burst > policy.burstLimit!`, plus the config
  fix and a test. Its own tests pass (14/14), and the rule is broken twice. Its `quota.ts` reaches the
  decide of A1 and A2 and has the shape of eval `careless-burst-limit`, which both models fail.
- Careful: `burstLimitCheck: false` in `src/flags.ts`, the check inside `if (isEnabled(...))` with a
  `typeof limit === 'number' && limit > 0` guard, tests that set `process.env.FLAGS` and check that
  it is off by default and that a blank `burstLimit` is skipped. 16/16 tests pass. It reaches only
  A1's decide (A2's grep finds no risky construct) and has the shape of `careful-burst-limit`, which
  both models pass. The gate itself was not run on these two (no `agentests run` allowed).

## Proving rounds

1. Initial Test. luna 17/22, jev 20/22. Luna failed A1 on careful quota.ts files (daily-count
   exception not applied) and A2 on guarded code; Jev failed A1 on app.ts for mounting a flagged
   middleware unconditionally, and missed the blank-string guard.
2. A1 rewritten as a prohibition with the daily-count exception spelled out and "mounting is not a
   check"; A2 restated, allowing rejections on real values. luna 19/22, jev 19/22 (Luna's A1 missed
   the unflagged suspension; both mis-scored A2 cases).
3. A1 scoped to the "policy record" and the four fields listed; A2 rewritten as a counterfactual.
   luna 16/22 with 2 refusals, jev 20/22.
4. A1 phrased as "every reject call that depends on the policy" naming the other limits; A2 in a
   positive form with passing and failing examples. luna 15/22 with 3 refusals, jev 22/22.
5. A1 back to round 2's wording with "quota policy" widened to "policy"; A2 kept round 4's
   wording behind a new grep that sends only risky constructs to the model; added the two careful
   evals that match that grep so the A2 decide is still tested on compliant code. luna 22/24,
   jev 21/24, no refusals.

No eval was changed or deleted; two were added in round 5. No task prompt was changed from what
was first written; every `researched` prompt is word for word.

## Last round (round 5) tables

## luna: {'model': 'gpt-6-luna', 'matches': 22, 'total': 24, 'refused': 0, 'errors': 0, 'decisions': 56, 'inputTokens': 64529, 'outputTokens': 0, 'costUsd': 0.0064529}

| eval                                      | expected | actual | match | decisions |
| ----------------------------------------- | -------- | ------ | ----- | --------- |
| careful-burst-limit                       | pass     | pass   | yes   | 2         |
| careful-regional-policy                   | pass     | pass   | yes   | 4         |
| careful-suspended-block                   | pass     | pass   | yes   | 3         |
| careful-token-bucket                      | pass     | pass   | yes   | 2         |
| careless-burst-limit                      | fail     | fail   | yes   | 2         |
| careless-regional-policy                  | fail     | fail   | yes   | 4         |
| careless-suspended-block                  | fail     | fail   | yes   | 2         |
| careless-token-bucket                     | fail     | pass   | no    | 1         |
| environment-variable-instead-of-flag      | fail     | fail   | yes   | 2         |
| fixture-unchanged                         | pass     | pass   | yes   | 5         |
| flag-read-where-middleware-is-mounted     | fail     | fail   | yes   | 4         |
| flag-registered-on                        | fail     | fail   | yes   | 2         |
| flagged-burst-lets-empty-string-through   | fail     | fail   | yes   | 3         |
| flagged-burst-non-null-assertion          | fail     | fail   | yes   | 3         |
| flagged-burst-rules-out-every-blank-value | pass     | pass   | yes   | 3         |
| flagged-burst-truthy-guard                | pass     | pass   | yes   | 2         |
| flagged-region-nullish-defaults-skip      | pass     | fail   | no    | 3         |
| flagged-region-rejects-incomplete-policy  | fail     | fail   | yes   | 3         |
| flagged-suspended-unless-false            | fail     | fail   | yes   | 2         |
| flags-fallback-turns-flag-on              | fail     | fail   | yes   | 1         |
| inverted-kill-switch                      | fail     | fail   | yes   | 2         |
| other-service-app                         | pass     | pass   | yes   | 1         |
| selected-files-about-something-else       | pass     | pass   | yes   | 0         |
| tests-scripts-and-settings                | skip     | skip   | yes   | 0         |

## jev: {'model': 'jev-latest', 'matches': 21, 'total': 24, 'refused': 0, 'errors': 0, 'decisions': 56, 'inputTokens': 71021, 'outputTokens': 1232, 'costUsd': 0.0029828820000000014}

| eval                                      | expected | actual | match | decisions |
| ----------------------------------------- | -------- | ------ | ----- | --------- |
| careful-burst-limit                       | pass     | pass   | yes   | 2         |
| careful-regional-policy                   | pass     | pass   | yes   | 4         |
| careful-suspended-block                   | pass     | pass   | yes   | 3         |
| careful-token-bucket                      | pass     | pass   | yes   | 2         |
| careless-burst-limit                      | fail     | fail   | yes   | 2         |
| careless-regional-policy                  | fail     | fail   | yes   | 4         |
| careless-suspended-block                  | fail     | fail   | yes   | 2         |
| careless-token-bucket                     | fail     | pass   | no    | 1         |
| environment-variable-instead-of-flag      | fail     | fail   | yes   | 2         |
| fixture-unchanged                         | pass     | pass   | yes   | 5         |
| flag-read-where-middleware-is-mounted     | fail     | pass   | no    | 4         |
| flag-registered-on                        | fail     | fail   | yes   | 2         |
| flagged-burst-lets-empty-string-through   | fail     | pass   | no    | 3         |
| flagged-burst-non-null-assertion          | fail     | fail   | yes   | 3         |
| flagged-burst-rules-out-every-blank-value | pass     | pass   | yes   | 3         |
| flagged-burst-truthy-guard                | pass     | pass   | yes   | 2         |
| flagged-region-nullish-defaults-skip      | pass     | pass   | yes   | 3         |
| flagged-region-rejects-incomplete-policy  | fail     | fail   | yes   | 3         |
| flagged-suspended-unless-false            | fail     | fail   | yes   | 2         |
| flags-fallback-turns-flag-on              | fail     | fail   | yes   | 1         |
| inverted-kill-switch                      | fail     | fail   | yes   | 2         |
| other-service-app                         | pass     | pass   | yes   | 1         |
| selected-files-about-something-else       | pass     | pass   | yes   | 0         |
| tests-scripts-and-settings                | skip     | skip   | yes   | 0         |

Remaining mismatches:

- `careless-token-bucket` (both models pass, expected fail): A1 does not catch the daily count
  replaced outright by the unflagged token bucket; the models seem to take a `dailyLimit`-based
  bucket for the daily quota count. Round 4's A1, which named token-bucket limits, caught it on Jev.
- `flagged-region-nullish-defaults-skip` (Luna fails, expected pass): Luna's A2 rejects compliant
  `(policy.region ?? '').trim()` / `=== null || === ''` guards.
- `flag-read-where-middleware-is-mounted` (Jev passes, expected fail): Jev does not fail the
  unflagged `src/middleware/burst-limit.ts`.
- `flagged-burst-lets-empty-string-through` (Jev passes, expected fail): Jev does not see that a
  `!== undefined && !== null` guard lets `""` reach the comparison. (Luna gets this eval right but
  fails A1 there too, wrongly.)

## Research and triage notes

- The triage's "the daily quota count is the only check in the request path that runs without a
  flag" needed the fixture to have no other unflagged check: requests without `x-project-id` count
  as the `anonymous` project rather than 401, and a project without a policy gets a free-tier policy
  rather than 403.
- "Every flag defaults to false until it is rolled out" is restated: an environment turns a flag on
  through `FLAGS`, and a default is never changed to roll out, so the registry stays all-false, as
  the triage note asks.
- The triage judges only `quota.ts` and `flags.ts`; agents may put a new check in a new middleware
  file, so the Test selects `src/middleware/*.ts`, `src/app.ts`, `src/quota/*.ts` and
  `src/policies/*.ts` too, behind a content grep. For one file to suffice, the rule adds standing
  policy that the flag is read where the check is made, not where the middleware is mounted.
- Task 4's "the new token-bucket version" presumes an existing implementation, so the fixture holds
  an unused `src/quota/token-bucket.ts`. Task 4 reads only `dailyLimit`, so it tests only the flag
  half; task 3's natural `=== true` or truthy test fails open by itself, so task 3 mostly tests the
  flag half too.
- The grading note's 0 to 4 scale was mapped to the 0 to 10 rubric frame (unflagged or default-on is
  1 to 3; flagged but not failing open is 4 to 6).

## Not verified

- No agent or judge run; the gate was not run on the scratch task-1 diffs (only the grep stages were
  simulated locally).
- A2's grep sends only risky constructs to the model, so a plain unguarded comparison such as
  `burst > policy.burstLimit` (no `!`, no guard), or one through an alias with no guard, passes A2
  without a decision; the judge's rubric covers it.
- Luna refused decisions in rounds 3 and 4 (regional evals, fixture-unchanged) but not in round 5;
  refusals may recur in runs.
