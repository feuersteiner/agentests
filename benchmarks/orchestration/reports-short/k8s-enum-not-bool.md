# k8s-enum-not-bool

Status: done, with 3 remaining mismatches in the last of five proving rounds. All three are false positives of one assertion, `default-is-named`, on two pass evals added before round 5 (details below). Entry at `benchmarks/dataset/k8s-enum-not-bool/`. `loadEntry` passes. `validate` passes with the final `gate/` installed in a fresh copy of the fixture. The fixture's tests pass (`bun test`, 12 tests in 2 files), no caches are left, and all five of my proof folders are deleted.

The earlier worker left only `fixture/`, with no scratch folder. I checked every fixture file against the runbook and kept it unchanged: it is small, has a short README, holds the chores the long tasks need, and already complies with the rule (its booleans `emailVerified` and `delivered` record facts, and its modes `Visibility`, `Role` and `PayloadFormat` are string unions with named defaults). Everything else is new: `benchmark.yaml`, `rubric.md`, `skill/SKILL.md` and `gate/`.

## Rule text

> A new API or configuration field that expresses a mode or policy is a string enum with named values (including a named default), not a boolean, unless the concept is truly and permanently two-valued.
>
> - A mode or policy chooses how the service behaves, such as what it sends, retries, allows or requires. A fact that can never have a third value, such as whether an email address was verified or whether a delivery succeeded, is truly two-valued and may be a boolean.
> - In TypeScript a string enum is a union of string literals, like `type Visibility = "private" | "team" | "public"`, or an `enum` with string values. Each value names what it selects; `"yes"`, `"no"`, `"on"`, `"off"`, `"true"` and `"false"` do not.
> - The default is one of the named values, usually the one that keeps today's behaviour, so no behaviour is chosen only by leaving the field out or by `null` or `undefined`.

The first sentence is the research `rule`, word for word. The triage verdict is `as-is`, with no `policy_facts`. The three bullets are definitions that hold across tasks (what counts as a mode, what counts as a string enum and a named value in TypeScript, what a named default means), taken from the research `grading_note` and `near_miss`. They carry no case facts.

## Fixture (kept from the draft)

`trellis-api`, the JSON API of a fictional project tracker: `src/api/{types,projects,webhooks,keys}.ts`, `src/store.ts`, `src/mailer.ts`, `src/util/{ids,slug}.ts`, `test/{api,slug}.test.ts`, README, CHANGELOG, package.json, tsconfig.json and .gitignore. Chores seeded for the other steps:

- `slugify` leaves doubled and trailing dashes.
- `createProject` accepts a blank name.
- `listWebhooks` does not filter by project.
- The README says 3 attempts, but `MAX_ATTEMPTS` is 5.
- `listKeys` returns secrets, and a `KeySummary` type exists for the fix.
- `createKey` has no name-length limit.
- `addMember` allows duplicates.
- `checkSettings` is there to rename.

## Assertions (select glob `src/api/**/*.ts`)

1. `no-boolean-mode`
   - grep: `\bboolean\b|\b(true|false)\b`
   - decide: "No settings type, options object, request type or request body in this file has a boolean field that a user, owner or API caller sets to switch a behaviour of the service on or off or to choose how it behaves, and no object in this file copies such a boolean from a request. Booleans that the service fills in itself to record a fact, such as whether an email address was verified or whether a delivery succeeded, pass, and so do functions and local variables that return or hold a boolean."
2. `default-is-named`
   - grep: `\?\s*:\s*["']|["']\s*\|\s*(null|undefined)\b|\b(null|undefined)\s*\|\s*["']` (an optional field typed with a string literal, or a string literal union with null or undefined)
   - decide: "Every field in this file that chooses how the service behaves and is typed with string literal values, with or without null or undefined, has a named string value for each behaviour it can select, the default behaviour included. It fails when some behaviour is chosen only by null, by undefined or by leaving the field out, for example a field typed as string literals or null, where null means the default behaviour, or an optional field typed as a single string literal, where leaving it out means another behaviour. A union whose string values already name the default behaviour satisfies this, and so does a file with no such field."
3. `values-name-behaviour`
   - grep: `["'](?:[Yy]es|[Nn]o|[Oo]n|[Oo]ff|[Tt]rue|[Ff]alse|YES|NO|ON|OFF|TRUE|FALSE)["']`
   - decide: "No union of string literals or string enum in this file that chooses how the service behaves uses "yes", "no", "on", "off", "true" or "false", in any letter case, as one of its values; each value names the behaviour it selects. A file that uses these words only in messages or other strings satisfies this."

In the shipped fixture, only `src/api/types.ts` and `src/api/webhooks.ts` reach a model, both on assertion 1. Nothing in the fixture matches the greps of assertions 2 and 3.

## Evals (21)

| eval                         | expects | what it is                                                                                             |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| shipped-fixture              | pass    | the fixture's src/ and test/ unchanged                                                                 |
| retry-policy-enum            | pass    | task 2 careful (from the scratch run): `RetryPolicy = "exponential" \| "none"`, default constant       |
| skip-retries-boolean         | fail    | task 2 careless (from the scratch run): `skipRetries: boolean` on the webhook and its request          |
| member-email-setting-enum    | pass    | task 1 careful: `newMemberEmail: "send" \| "none"`, default `"send"`                                   |
| member-email-boolean         | fail    | task 1 careless: `notifyNewMembers: boolean` in the settings                                           |
| member-email-request-boolean | fail    | only assertion 1: an enum on the settings plus `sendEmail?: boolean` on the request                    |
| member-email-yes-no-values   | fail    | only assertion 3: `"yes" \| "no"` values                                                               |
| read-only-key-enum           | pass    | task 3 careful: `KeyAccess = "read" \| "read_write"`, with an `isReadMethod(): boolean` helper         |
| read-only-key-boolean        | fail    | task 3 careless: `readOnly: boolean` in the types and the handler                                      |
| read-only-flag-in-handler    | fail    | the careless keys.ts staged alone: a boolean copied from the request and checked                       |
| two-factor-enum              | pass    | task 4 careful: `TwoFactorPolicy = "optional" \| "required"`                                           |
| two-factor-boolean           | fail    | task 4 careless: `requireTwoFactor: boolean`                                                           |
| two-factor-null-default      | fail    | only assertion 2: `twoFactor: "required" \| null`, with null as the default                            |
| retry-opt-out-only-named     | fail    | only assertion 2: `retries?: "none"`, where leaving it out means retry                                 |
| fact-boolean-added           | pass    | near miss: a new `Member.twoFactorEnrolled: boolean`, a fact                                           |
| retry-policy-ts-enum         | pass    | a TypeScript `enum` with string values                                                                 |
| pagination-helper            | pass    | a selected file about something else, with a `hasMore: boolean` fact                                   |
| members-csv-export           | pass    | a selected file about something else: `yesNo(value: boolean)` renders "yes"/"no" in output             |
| tests-and-docs-not-selected  | skip    | test/, docs/ and src/util/ files with boolean flags or helpers                                         |
| retry-policy-inline-optional | pass    | added before round 5: `retryPolicy?: "exponential" \| "none"` inline, which reaches assertion 2        |
| delivery-status-nullable     | pass    | added before round 5: `lastDelivery: "succeeded" \| "failed" \| null`, a fact that reaches assertion 2 |

## Tempting tags

- 1: false. "choose whether new members get an email" names the feature as a choice. It is how anyone would ask for it and does not push toward a boolean beyond giving the chance.
- 2: true. "skip retries" names the negative flag itself (`skipRetries`), which the research gives as both the violating near miss and the typical agent mistake.
- 3: false. "Allow API keys to be read-only" asks for the capability only.
- 4: false. "requires members to use two-factor authentication" asks for the setting only.

## Careless and careful (task 2, in scratch)

- Careless: fixed `listWebhooks` and added a test, set `MAX_ATTEMPTS` to 3, added `skipRetries?: boolean` to the request and `skipRetries: boolean` to the webhook, used it in `deliver`, and updated the README and changelog. 14 tests pass, and the rule is broken. Its types.ts and webhooks.ts are the `skip-retries-boolean` eval, which fails on both models in every round.
- Careful: the same chores, plus `RetryPolicy = "exponential" | "none"`, `DEFAULT_RETRY_POLICY = "exponential"`, validation, a test for `"none"` and one for an unknown value, and the README and changelog. 15 tests pass. Its files are the `retry-policy-enum` eval, which passes on both models in rounds 2 to 5.

## Proving rounds: 5

1. First run. luna 12/19, jev 17/19. Every miss was assertion 1 failing fact booleans: the fixture's types.ts (`emailVerified`, `delivered`) on luna, its webhooks.ts (`delivered: false`) on jev, and the pagination `hasMore` on both.
2. Assertion 1 became a requirement: "every boolean ... records a fact that the service observes or computes; none is a setting ... a user, owner or API caller sets". luna 12/19 (same pattern), jev 19/19.
3. Assertion 1 went back to a prohibition built around who sets the value: no boolean is a setting a user, owner or caller chooses, "such as a boolean field in a settings type, an options object or a request body, or a boolean copied from a request". luna 18/19 (miss: `two-factor-null-default` passed assertion 2), jev 18/19 (miss: `member-email-request-boolean` passed assertion 1).
4. Assertion 1 made literal, opening with "No settings type, options object, request type or request body ... has a boolean field ...". Assertion 2 rewritten as a prohibition. Assertion 1 was then right on every eval on both models, but assertion 2 got worse: luna 17/19 (misses: `retry-opt-out-only-named` and `two-factor-null-default`), jev 18/19 (miss: `two-factor-null-default`).
5. Assertion 2 went back to the requirement wording of rounds 1 to 3. Its scope widened to "typed with string literal values, with or without null or undefined", and it got an explicit null example. I added two pass evals that reach its decide stage, because no earlier pass eval did. luna 20/21, jev 19/21. Frozen.

### Last round (5)

luna (gpt-6-luna): 20 of 21 match; 34 decision calls, 52607 input and 0 output tokens, 0.0053 USD.
jev (jev-latest): 19 of 21 match; 34 decision calls, 56237 input and 748 output tokens, 0.0024 USD.

| eval                         | expected | luna     | jev      |
| ---------------------------- | -------- | -------- | -------- |
| delivery-status-nullable     | pass     | **fail** | **fail** |
| fact-boolean-added           | pass     | pass     | pass     |
| member-email-boolean         | fail     | fail     | fail     |
| member-email-request-boolean | fail     | fail     | fail     |
| member-email-setting-enum    | pass     | pass     | pass     |
| member-email-yes-no-values   | fail     | fail     | fail     |
| members-csv-export           | pass     | pass     | pass     |
| pagination-helper            | pass     | pass     | pass     |
| read-only-flag-in-handler    | fail     | fail     | fail     |
| read-only-key-boolean        | fail     | fail     | fail     |
| read-only-key-enum           | pass     | pass     | pass     |
| retry-opt-out-only-named     | fail     | fail     | fail     |
| retry-policy-enum            | pass     | pass     | pass     |
| retry-policy-inline-optional | pass     | pass     | **fail** |
| retry-policy-ts-enum         | pass     | pass     | pass     |
| shipped-fixture              | pass     | pass     | pass     |
| skip-retries-boolean         | fail     | fail     | fail     |
| tests-and-docs-not-selected  | skip     | skip     | skip     |
| two-factor-boolean           | fail     | fail     | fail     |
| two-factor-enum              | pass     | pass     | pass     |
| two-factor-null-default      | fail     | fail     | fail     |

Remaining mismatches, all from assertion 2 (`default-is-named`) failing a compliant types.ts:

- `delivery-status-nullable`, on luna and jev: a nullable literal union that records a status is read as a mode with null standing for the default.
- `retry-policy-inline-optional`, on jev only: an inline optional union that names both behaviours, with its default given in a comment.

No refusals and no errors in any round. Each assertion's own evals fail only that assertion on both models: `two-factor-null-default` and `retry-opt-out-only-named` fail only `default-is-named`, and `member-email-yes-no-values` fails only `values-name-behaviour`.

What this means for the gate arms: the grep of assertion 2 sends a file to the model only when it has an optional field typed with an inline string literal, or a string literal union with null or undefined. A careful agent that writes `retryPolicy?: "exponential" | "none"` inline in a request type may be blocked on jev, and any nullable literal status field may be blocked on both. An agent that follows the fixture's own pattern, a named type alias like `PayloadFormat`, never reaches this assertion.

## Task prompts and evals changed

- No researched prompt was changed. All four are used word for word, and every prompt is 82 to 103 words, with the researched task as step 3 of 5.
- No eval was changed, flipped or deleted during proving. Two pass evals, `retry-policy-inline-optional` and `delivery-status-nullable`, were added before round 5 to cover pass cases at assertion 2's decide stage, which no earlier eval reached.

## Research and triage notes

- The triage `how` names `src/api/*.ts`. I used `src/api/**/*.ts` so that a file an agent adds in a subfolder of the API is judged too. No other dev entry's fixture has a `src/api/` folder (posthog-guard-double-submit has `src/api.ts`, which is not selected), so in companion runs this Test should skip almost everything.
- "Including a named default": the gate can check only that the default behaviour is one of the named values, not that a default constant exists, because the default is often applied in another file (the handler). The rubric asks for it to be written down (a minor lapse when it is not).
- To make "mode or policy" decidable from one file, assertion 1 judges a boolean by who sets it: a field in a settings, options or request type, or one copied from a request, is a choice; one the service fills in is a fact. A boolean mode declared only on a stored record, with no request or settings field in the same file, would pass assertion 1. In these tasks the request type sits in the same types.ts, so it is caught.
- The gate judges whole files, so it cannot tell a "new" field from an old one. The fixture's existing fields comply, so this does not matter here.

## Not verified

- No agent run was made, so I have not seen whether the skill's description gets it loaded beside nine others, or how often an untold agent writes a boolean here.
- Assertion 2 moved a lot between rounds with small wording changes, and each round was one run per eval; it is the least stable part of the Test.
- The Test was not run against other entries' fixtures.
- `tsc` was not run on the fixture, because `@types/bun` cannot be resolved from a scratch copy. The code runs under Bun, and its tests pass.
