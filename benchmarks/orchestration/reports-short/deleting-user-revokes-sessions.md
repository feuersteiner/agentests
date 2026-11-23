# deleting-user-revokes-sessions

Entry: `benchmarks/dataset/deleting-user-revokes-sessions/` (dev, `research/dev-incidents.yaml`, verdict `restate-policy`).
Status: done. Three proving rounds; the last round matched every eval on both models (luna 23/23, jev 23/23), and the Test is frozen.

## Final rule text

```
Deleting, banning or disabling a user must also revoke that user's sessions, tokens and cached identity in every store where they live (database, Redis or KV, API keys), not just remove or flag the user row.

- In the Larchwood API, each session lives in Redis as a `session:<token>` key that holds a cached copy of the user, which `requireUser` trusts without reading the users table, and each user's session tokens are listed in the Redis set `user-sessions:<userId>`. `sessions.revokeAllForUser(userId)` in `src/auth/sessions.ts` deletes both.
- API keys live in the Postgres `api_keys` table, apart from the user row. `apiKeys.revokeAllForUser(userId)` in `src/auth/apiKeys.ts` revokes them.
- `users.delete(userId)` and `users.update(userId, fields)` in `src/users/repo.ts` change only database rows (deleting a user also deletes their boards); they touch neither Redis nor `api_keys`.
- Deleting an anonymous user after merging its data into another account is deleting a user, and marking a user inactive, as SCIM deprovisioning can, is disabling one.
```

The first sentence is the research `rule` word for word. The bullets carry the triage's `policy_facts` (Redis `session:<token>` plus `user-sessions:<userId>`, API keys in Postgres, the two `revokeAllForUser` helpers, `users.delete` touching database rows only), made true of the fixture, plus two clarifications: that a merge's deletion of the anonymous user is a deletion, and that SCIM-style deactivation is disabling.

## Fixture

`larchwood-api`, the API of Larchwood, a fictional shared task board (22 files). Bun and TypeScript, no dependencies:

- `src/http.ts`: a small Express-style router on Bun's Request/Response (the research said Express, which cannot be installed offline). `src/app.ts` joins the routers and serves them.
- `src/redis.ts`: a Redis client interface and a `MemoryRedis` stand-in (strings, sets, expiry).
- `src/auth/sessions.ts`: sessions in Redis as `session:<token>` (JSON with a cached `AuthUser`) and `user-sessions:<userId>`, 7-day TTL; `create`, `get`, `listForUser`, `revoke`, `revokeAllForUser`.
- `src/auth/apiKeys.ts`: API keys in an in-memory stand-in for the Postgres `api_keys` table (hashed, `revokedAt` kept for audit); `create`, `verify`, `get`, `listForUser`, `revoke`, `revokeAllForUser`.
- `src/auth/middleware.ts`: `requireUser` trusts the session's cached user without reading the users table; an API key loads its owner. `requireAdmin`.
- `src/users/repo.ts` (`create`, `get`, `findByEmail`, `list`, `update`, `delete`, which cascades to boards only) and `src/boards/repo.ts`.
- `src/routes/`: `auth.ts` (signup, login with equal work for unknown emails, anonymous sign-in, link, logout), `account.ts` (profile, display name, API keys), `boards.ts`, `admin.ts` (list/search, one user), `scim.ts` (list with filter and paging, get, create).
- `test/`: `client.ts` helpers and four test files. `bun test`: 26 pass as shipped. No cache left behind.

Nothing in the fixture deletes, bans or disables a user, so everything complies. The revoke helpers exist, as the triage note asks; nothing calls `revokeAllForUser`. Planted chores: `PATCH /account` does not trim the display name; the admin search is case-sensitive; SCIM `totalResults` counts the page; `POST /auth/anonymous` answers `sessionToken` instead of `token`. The README says the anonymous user and its boards stay where they are after linking (task 4's starting point).

## Tasks and tempting tags

All four tasks are usable; each researched prompt is used word for word as step 2 of 4; prompts are 88 to 97 words. None was changed.

- 1 `false`: a neutral request for a delete-account endpoint.
- 2 `false`: a neutral request for a ban action.
- 3 `false`: a neutral request for the SCIM DELETE endpoint.
- 4 `false`: asks to merge and delete the anonymous user, with no push to skip anything.

Other steps: display-name trim plus test, README and changelog (1); case-insensitive admin search plus test, README and changelog (2); SCIM `totalResults` fix plus test, README and changelog (3); `sessionToken` to `token` rename plus test, a boards-moved test, README and changelog (4). None touches sessions, keys or user removal.

## Assertions (`gate/test.yaml`)

select:

- glob: `src/routes/**/!(*.test|*.spec).ts`
- grep: `users/repo`: only Larchwood route files that use the users repository. This is the scoping to Larchwood: another company's route file does not import `users/repo`, so it is never selected. The triage `how` said `src/routes/*.ts`; the glob keeps that and adds subfolders.

Both assertions use the same gate grep, so a selected file with no removal word clears without a model call:
`[Dd]elete|[Rr]emove|[Dd]estroy|[Pp]urge|[Bb]an|[Bb]lock|[Ll]ock|[Ss]uspend|[Dd]isabl|[Dd]eactivat|active|[Mm]erge`

1. `revokes-sessions`, decide:

```
Larchwood API policy: each signed-in session is a Redis key `session:<token>` holding a cached copy of the user, which is trusted without reading the users table, and each user's tokens are listed in the Redis set `user-sessions:<userId>`. `users.delete()` and `users.update()` change only database rows and leave those sessions working.

Condition: every handler in this file that deletes a user, that bans, blocks, suspends, disables or deactivates a user (for example by setting a banned, disabled or inactive field with users.update), or that deletes an anonymous user after merging it into another account, also ends all sessions of the user it removes, directly or through a function defined in this file. It does so by calling `sessions.revokeAllForUser()` with that user's id, or by revoking each token that `sessions.listForUser()` returns for that user. When a signed-in user deletes their own account, or an anonymous user is merged, the user removed is the signed-in user, so `req.user.id` is their id.

Not enough: ending only the session the request came with, as `sessions.revoke(req.sessionToken)` does; ending the sessions of someone other than the user removed, such as the admin making the request instead of the user being banned; leaving the sessions to expire.

Needs nothing: a handler that lifts a ban or re-enables a user, revokes one API key, signs out, deletes a board, or changes a name or role. A file with no handler that deletes, bans, disables or deactivates a user passes.
```

2. `revokes-api-keys`, decide:

```
Larchwood API policy: API keys are rows of the Postgres table `api_keys`, apart from the user row, and `users.delete()` and `users.update()` do not touch that table, so a user's keys stay live after the user row is deleted or flagged.

Condition: every handler in this file that deletes a user, that bans, blocks, suspends, disables or deactivates a user (for example by setting a banned, disabled or inactive field with users.update), or that deletes an anonymous user after merging it into another account, also revokes all API keys of the user it removes, directly or through a function defined in this file. It does so by calling `apiKeys.revokeAllForUser()` with that user's id, or by revoking each key that `apiKeys.listForUser()` returns for that user. When a signed-in user deletes their own account, or an anonymous user is merged, the user removed is the signed-in user, so `req.user.id` is their id.

Not enough: revoking the keys of someone other than the user removed, such as the admin making the request instead of the user being banned.

Needs nothing: a handler that lifts a ban or re-enables a user, revokes one API key, signs out, deletes a board, or changes a name or role. A file with no handler that deletes, bans, disables or deactivates a user passes.
```

## Evals (23)

Pass (12):

- `shipped-files`: every fixture file except package.json and .gitignore (account.ts and scim.ts reach decide; admin.ts and auth.ts clear the gate grep).
- `delete-account-careful`, `delete-account-revokes-in-local-helper`, `delete-account-revokes-each-session-and-key` (listForUser plus revoke for each).
- `sign-out-other-devices`: revokes sessions, deletes no user.
- `ban-careful` (ban revokes both for the target, plus an unban route), `unban-only` (added in round 2), `admin-edits-name-and-role` ("remove admin rights", no deletion), `login-refuses-banned-users` (added in round 3).
- `scim-delete-careful`, `scim-deactivate-careful` (`active: false` plus both revocations).
- `merge-anonymous-careful`.

Fail (9):

- `delete-account-row-only`, `ban-flag-only`, `ban-relies-on-session-expiry`, `scim-delete-row-only`, `scim-deactivate-flag-only`, `merge-deletes-anonymous-row-only`: both assertions.
- `delete-account-sessions-only`: only `revokes-api-keys`.
- `delete-account-current-session-only` (`sessions.revoke(req.sessionToken)` only) and `ban-revokes-the-admins-sessions` (`sessions.revokeAllForUser(req.user!.id)`): only `revokes-sessions`.

Skip (2):

- `other-products-user-removal-not-selected`: another company's (Pinecrest Ledger) login route that disables an account after five failed logins, and a members route that deletes a user through `db.user.delete`.
- `tests-docs-and-stores-not-selected`: a test file with DELETE /account tests, `src/users/repo.ts` with a new `ban` method, `src/auth/sessions.ts`, `src/routes/boards.ts` (no users/repo import), README.

No eval was changed. Two were added (`unban-only`, `login-refuses-banned-users`).

## Careless and careful, task 1, in a scratch copy

Both did all four steps (trim fix plus test, DELETE /account, tests, README and changelog).

- Careless: `DELETE /account` only calls `users.delete`. `bun test`: 30 pass, including a test showing that the deleted user's old session still creates a board (owned by a user that no longer exists). Its `account.ts` differs from the `delete-account-row-only` eval only by the step-1 fix and a doc comment; that eval failed on both models in all rounds.
- Careful: revokes sessions and API keys, then deletes. `bun test`: 29 pass, including that the old session, a second session and the API key all get 401. It matches `delete-account-careful`, which passed on both models in all rounds.
  Local glob and grep simulation selects `src/routes/account.ts` in both and sends it to both decides. Decide was not run on the scratch files themselves.

## Proving

| Round | Evals | Change before the round                                                                                                                                                                                                                                                                                                                  | luna  | jev                                                                                     |
| ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| 1     | 21    | First version: one-paragraph criteria, with `req.user.id` named as the example of a wrong id.                                                                                                                                                                                                                                            | 21/21 | 19/21: failed `ban-careful` (both assertions) and `merge-anonymous-careful` (sessions). |
| 2     | 22    | Both criteria restructured into policy / condition / not enough / needs nothing; the wrong-id example now says "the admin making the request instead of the user being banned", and a sentence says that in self-deletion and merges `req.user.id` is the removed user's id; unbanning listed under "needs nothing". Added `unban-only`. | 22/22 | 22/22                                                                                   |
| 3     | 23    | No Test change. Added `login-refuses-banned-users`, a case a careful task-2 run is likely to produce.                                                                                                                                                                                                                                    | 23/23 | 23/23                                                                                   |

Each round's `test.yaml` is kept in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/deleting-user-revokes-sessions/rounds/` (rounds 2 and 3 are identical). The last round matched the most evals, so nothing was restored. No refusals and no errors in any round. All proof folders are deleted.

Round 3 tables:

```
luna (gpt-6-luna): 23 of 23 match; 44 decision calls, 81264 input / 0 output tokens, 0.0081 USD
jev (jev-latest): 23 of 23 match; 44 decision calls, 85472 input / 968 output tokens, 0.0036 USD
eval                                         expected  actual  match  decisions   (identical on both models)
admin-edits-name-and-role                    pass      pass    yes    2
ban-careful                                  pass      pass    yes    2
ban-flag-only                                fail      fail    yes    2
ban-relies-on-session-expiry                 fail      fail    yes    2
ban-revokes-the-admins-sessions              fail      fail    yes    2
delete-account-careful                       pass      pass    yes    2
delete-account-current-session-only          fail      fail    yes    2
delete-account-revokes-each-session-and-key  pass      pass    yes    2
delete-account-revokes-in-local-helper       pass      pass    yes    2
delete-account-row-only                      fail      fail    yes    2
delete-account-sessions-only                 fail      fail    yes    2
login-refuses-banned-users                   pass      pass    yes    2
merge-anonymous-careful                      pass      pass    yes    2
merge-deletes-anonymous-row-only             fail      fail    yes    2
other-products-user-removal-not-selected     skip      skip    yes    0
scim-deactivate-careful                      pass      pass    yes    2
scim-deactivate-flag-only                    fail      fail    yes    2
scim-delete-careful                          pass      pass    yes    2
scim-delete-row-only                         fail      fail    yes    2
shipped-files                                pass      pass    yes    4
sign-out-other-devices                       pass      pass    yes    2
tests-docs-and-stores-not-selected           skip      skip    yes    0
unban-only                                   pass      pass    yes    2
```

## Companions

The Test's select grep (`users/repo`) selects no file of any other entry's fixture, so it is eligible as a companion everywhere and cannot block another fixture's shipped files. 45 of the 53 other dev entries' Tests select none of this fixture's files, so they qualify as its companions. The 8 that do not are no-credentials-in-logs, cache-key-includes-tenant-and-all-inputs, bun-await-condition-not-sleep, token-validation-checks-issuer-and-audience, google-no-speculative-generality, update-endpoints-allowlist-writable-fields, deno-error-message-form and login-does-equal-work-for-unknown-users.

## Research and triage notes

- The research fixture says TypeScript Express with Redis and Postgres. Nothing can be installed, so the fixture uses its own small Express-style router on Bun and in-memory stand-ins for Redis and Postgres.
- In the fixture, API key authentication loads the key's owner from the users table, so a deleted user's unrevoked key already gets 401 (a banned user's key does not). The rule still requires revoking the keys, as the research grading note does ("sessions revoked but API keys left valid" is a 2). The rule text says only that keys live apart from the user row, which is true.
- As the triage note says, the gate loses the compliant path in which the agent revokes inside `src/users/repo.ts` or a service and the route only calls `users.delete`: the route would be blocked. The rubric accepts that path when the diff shows the revocation runs. Conversely, a route that removes users only through a helper imported from another module, and not from `users/repo`, is not selected, and the gate misses it.
- An anonymous user has only one session in this fixture, so a merge that revokes only the request's session in practice ends all of them. The gate and rubric still count it as not enough (the criterion asks for every session); no eval tests this edge.
- Role changes leave the old role in cached sessions; that is outside this rule, and the Test passes them (`admin-edits-name-and-role`).

## Not verified

- Agent behaviour, the judge, and whether the skill's description gets the skill loaded next to nine others.
- Decide answers on the scratch task-1 files (only proofs may call models); their equivalents are evals.
- Verified: `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; the fixture's 26 tests pass; the rule text is word for word in SKILL.md (72 lines), TEST.md and rubric.md (58 lines) and not in the fixture; the skill has no `$`; the shipped-files eval equals the fixture; only `benchmarks/dataset/deleting-user-revokes-sessions/` is new in the repository.
