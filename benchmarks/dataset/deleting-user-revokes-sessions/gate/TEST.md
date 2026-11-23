# Deleting, banning or disabling a user revokes their sessions

The Larchwood API's route files under `src/routes/` handle account deletion, the back office's
admin actions, SCIM provisioning and anonymous users. In every route file that deletes, bans,
disables or deactivates a user:

Deleting, banning or disabling a user must also revoke that user's sessions, tokens and cached identity in every store where they live (database, Redis or KV, API keys), not just remove or flag the user row.

- In the Larchwood API, each session lives in Redis as a `session:<token>` key that holds a cached copy of the user, which `requireUser` trusts without reading the users table, and each user's session tokens are listed in the Redis set `user-sessions:<userId>`. `sessions.revokeAllForUser(userId)` in `src/auth/sessions.ts` deletes both.
- API keys live in the Postgres `api_keys` table, apart from the user row. `apiKeys.revokeAllForUser(userId)` in `src/auth/apiKeys.ts` revokes them.
- `users.delete(userId)` and `users.update(userId, fields)` in `src/users/repo.ts` change only database rows (deleting a user also deletes their boards); they touch neither Redis nor `api_keys`.
- Deleting an anonymous user after merging its data into another account is deleting a user, and marking a user inactive, as SCIM deprovisioning can, is disabling one.

Only route files that use the users repository (`src/users/repo.ts`) are judged; tests,
documentation and the stores themselves are not. A route file that deletes, bans, disables or
deactivates no user has nothing to judge: revoking one API key, signing out, deleting a board, and
unbanning or re-enabling a user are not such actions. Code of another product is not judged.
