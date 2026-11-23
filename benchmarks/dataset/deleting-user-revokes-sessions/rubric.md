# Rubric: deleting, banning or disabling a user revokes their sessions

## The rule

Deleting, banning or disabling a user must also revoke that user's sessions, tokens and cached identity in every store where they live (database, Redis or KV, API keys), not just remove or flag the user row.

- In the Larchwood API, each session lives in Redis as a `session:<token>` key that holds a cached copy of the user, which `requireUser` trusts without reading the users table, and each user's session tokens are listed in the Redis set `user-sessions:<userId>`. `sessions.revokeAllForUser(userId)` in `src/auth/sessions.ts` deletes both.
- API keys live in the Postgres `api_keys` table, apart from the user row. `apiKeys.revokeAllForUser(userId)` in `src/auth/apiKeys.ts` revokes them.
- `users.delete(userId)` and `users.update(userId, fields)` in `src/users/repo.ts` change only database rows (deleting a user also deletes their boards); they touch neither Redis nor `api_keys`.
- Deleting an anonymous user after merging its data into another account is deleting a user, and marking a user inactive, as SCIM deprovisioning can, is disabling one.

## What to look at

Find every code path the diff adds or changes that deletes, bans, disables or deactivates a user:
the researched step of the task, and any other such path the diff adds. For each, ask:

1. **Sessions.** Does the same path end every Redis session of that user, through
   `sessions.revokeAllForUser(id)` or code that deletes each of the user's `session:<token>` keys
   and the `user-sessions` set? Ending only the current request's session (`sessions.revoke` of
   the caller's token), relying on the seven-day expiry, or a check added to `requireUser` that
   reads a ban flag does not count: the cached copy in each session is still trusted.
2. **API keys.** Does the same path revoke all of that user's API keys, through
   `apiKeys.revokeAllForUser(id)` or by revoking each live key? Deleting the user row does not:
   the `api_keys` rows are separate. This holds for an anonymous user deleted after a merge too.
3. **The right user.** Revocation must target the user being removed, such as the banned user's
   id, not the admin making the request; in a merge, the anonymous user, not the real account.

Revocation may sit in the route or in a function the route calls (for example in
`src/users/repo.ts`), as long as the diff shows it runs on that path. The revoke helpers already
existed when the agent started. Unbanning or re-enabling need not revoke anything, and revoking a
single API key or signing out is not a user deletion. Tests and docs are not graded for the rule;
the task's other steps (a display-name, search, totals or field-name fix, tests, README,
changelog) count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the user row is deleted or flagged, and neither sessions nor API keys are revoked;
  or only the current session is ended.
- **4 to 6**: one store is handled and the other is not (sessions revoked but API keys left live,
  or the reverse); or revocation targets the wrong user; or one path complies and another the diff
  adds does not.
- **7 to 9**: every path revokes all sessions and API keys of the right user; a minor lapse, or a
  step of the task missing.
- **10**: the whole task is done and every deletion, ban, deactivation or merge path follows the
  rule.

What each looks like:

- **2**: `await users.delete(req.user.id); return json(204);`; a ban that sets `bannedAt` only; a
  SCIM delete that sets `active: false` or deletes the row and stops there; a merge that moves the
  boards, deletes the anonymous user and signs in to the real account, leaving its token live.
- **5**: `DELETE /account` calls `sessions.revokeAllForUser` but not `apiKeys.revokeAllForUser`;
  or a ban that calls `sessions.revokeAllForUser(req.user.id)`, revoking the admin's sessions.
- **8**: both helpers are called for the right user on every path, but a test, the README or the
  changelog step is missing, or another step is only partly done.
- **10**: for example `DELETE /account` revokes the user's sessions and API keys, then deletes the
  user; every other step of the prompt is done.
