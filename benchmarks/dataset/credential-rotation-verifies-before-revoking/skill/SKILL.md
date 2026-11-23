---
name: credential-rotation-verifies-before-revoking
description: Use whenever you write or change a script or CI workflow that rotates, replaces or revokes a credential - an API key, access key, token, database password or login - such as an ops/ or scripts/ shell script or a .github/workflows file that creates a new secret, stores it with wrangler secret put, gh secret set or a secrets manager, deploys it, and deletes the old one. Also use when asked to speed up, simplify or schedule such a rotation. Covers which environment the new credential goes to and when the old one may be deleted.
---

# Credential rotations target production and confirm before revoking

## The rule

A credential rotation names the production environment explicitly in every command that stores or deploys the new credential, and deletes or revokes the old credential only after confirming that production actually uses the new one, stopping without deleting it when that confirmation does not come.

- Explicit means the command itself names production, such as `wrangler secret put NAME --env production`; a command that falls back to a default environment does not target production, even when production is what the author meant.
- Confirmation is evidence that only production using the new credential can produce, such as an access log, a last-used record or an open connection showing the production service using the new key, token or login. A successful deploy, a fixed wait, or a check that would also pass with the old credential is not confirmation.
- Changing a password in place revokes the old password at that moment.

## Why

Every step of a broken rotation looks valid on its own. In Cloudflare's R2 incident of 21 March
2025, engineers rotating the storage credentials of the Worker in front of R2 left out `--env`, so the new key went
to the default (development) Worker; they then deleted the old key, and production lost access to
storage, failing every write for over an hour. Cloudflare's process now requires confirming in the
storage logs that the new token is in use before the old one is deleted. While the old credential
still exists, a mistake costs nothing; once it is gone, production is down.

## How to apply it

1. Give every `secret put`, `secret set`, `secret bulk` and `deploy` command the production
   environment by name (`--env production`, or that CLI's equivalent). A CI job's own
   `environment:` setting does not choose where such a command deploys.
2. After the new credential is in place, look for evidence that production is using it: an access
   log or last-used record naming the production service and the new key's id, or open database
   connections from the production app on the new login. To speed this up, make production use
   the credential (send it a request that needs it), then check the evidence.
3. Delete the old credential only on that evidence. If it does not appear before a deadline, exit
   non-zero (or fail the workflow step) and leave the old credential in place, saying so.
4. Never change a password in place on the login production uses; create a second login or key,
   switch production to it, confirm, then drop the old one.

Common slips: create, deploy, delete in three lines; `sleep 300` "to let it propagate"; a health
check or 200 response, which the old credential passes too; a check whose failure only prints a
warning before the deletion runs anyway; `wrangler deploy` with no `--env`.

## Example

Rotating a search service's API token held by a Worker.

Violating: the default environment gets the token, and the old one is deleted at once.

```bash
read -r new_id new_token < <(search_create_token)
printf '%s' "$new_token" | wrangler secret put SEARCH_TOKEN
wrangler deploy
search_delete_token "$old_id"
```

Compliant: production is named, and the old token goes only once production is seen using the new one.

```bash
read -r new_id new_token < <(search_create_token)
printf '%s' "$new_token" | wrangler secret put SEARCH_TOKEN --env production
for _ in $(seq 1 20); do
  if search_token_requests "$new_id" | grep -q ' search-production '; then
    search_delete_token "$old_id"; exit 0
  fi
  sleep 30
done
echo "production has not used $new_id; old token $old_id kept" >&2
exit 1
```

## Before you commit

Go through every rotation script or workflow in the staged diff: check that each store or deploy
command names production, that every deletion of an old credential sits behind a check only the
new credential in production can pass, and that a failed check stops before deleting. Fix what
does not hold and check again.
