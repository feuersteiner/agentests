---
name: deleting-user-revokes-sessions
description: Use whenever you write or change code in the Larchwood API that deletes, bans, suspends, disables or deactivates a user account, or removes one as part of another flow - delete-account endpoints, admin ban or block actions, SCIM deprovisioning (DELETE or active=false), merging an anonymous or duplicate user into another account, cleanup of old accounts - even if the request only asks to delete the user. Covers what else has to happen to the user's sign-in sessions and API keys when the user row goes away or is flagged.
---

# Deleting, banning or disabling a user revokes their sessions

## The rule

Deleting, banning or disabling a user must also revoke that user's sessions, tokens and cached identity in every store where they live (database, Redis or KV, API keys), not just remove or flag the user row.

- In the Larchwood API, each session lives in Redis as a `session:<token>` key that holds a cached copy of the user, which `requireUser` trusts without reading the users table, and each user's session tokens are listed in the Redis set `user-sessions:<userId>`. `sessions.revokeAllForUser(userId)` in `src/auth/sessions.ts` deletes both.
- API keys live in the Postgres `api_keys` table, apart from the user row. `apiKeys.revokeAllForUser(userId)` in `src/auth/apiKeys.ts` revokes them.
- `users.delete(userId)` and `users.update(userId, fields)` in `src/users/repo.ts` change only database rows (deleting a user also deletes their boards); they touch neither Redis nor `api_keys`.
- Deleting an anonymous user after merging its data into another account is deleting a user, and marking a user inactive, as SCIM deprovisioning can, is disabling one.

## Why

A database cascade does not reach Redis. Better Auth shipped exactly this bug
(GHSA-2vg6-77g8-24mp): its admin, anonymous-user and SCIM delete endpoints removed the user, but
the session payload, with its cached user object, stayed in secondary storage and kept working
until its seven-day TTL ran out. A deleted or banned user stayed signed in, and every request
carried a user that no longer existed or was no longer allowed in. A test that checks the row is
gone passes; a test that replays the old token would not.

## How to apply it

1. On every path that deletes, bans, disables or deactivates a user, call both
   `sessions.revokeAllForUser(id)` and `apiKeys.revokeAllForUser(id)` with the id of the user being
   removed, next to the `users.delete` or `users.update` call.
2. Revoke all sessions, not just the one the request came with: the user may be signed in on
   other devices.
3. Pass the right id: the banned or deprovisioned user's, not the admin's `req.user.id`; in a
   merge, the anonymous user's, before you sign in to the real account.
4. Do not rely on the session TTL, or on a new check of a ban flag somewhere else: each session
   already holds a copy of the user and is trusted as it is.

Slips to watch for: `await users.delete(req.user!.id); return json(204);`; a ban that only sets a
flag; `sessions.revoke(req.sessionToken)` as the only revocation; revoking sessions but leaving API
keys live; `sessions.revokeAllForUser(req.user!.id)` in an admin route.

## Example

A nightly job that deletes accounts which never verified their email.

Violating: the rows go, but any session or API key those users made keeps working.

```ts
export async function purgeUnverifiedUsers(cutoff: Date) {
	for (const user of await users.listUnverifiedBefore(cutoff)) {
		await users.delete(user.id);
	}
}
```

Compliant: each user's sessions and API keys are revoked, then the user is deleted.

```ts
export async function purgeUnverifiedUsers(cutoff: Date) {
	for (const user of await users.listUnverifiedBefore(cutoff)) {
		await sessions.revokeAllForUser(user.id);
		await apiKeys.revokeAllForUser(user.id);
		await users.delete(user.id);
	}
}
```

## Before you commit

For every `users.delete` call and every update that bans, disables or deactivates a user in the
diff, check that the same path revokes that user's sessions and API keys, with that user's id.
Fix what fails and check again.
