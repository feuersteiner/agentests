# Credential rotations target production and confirm before revoking

Shell scripts under `ops/`, `scripts/` and `bin/`, and GitHub Actions workflows under
`.github/workflows/`, sometimes rotate a credential: they create a new key, token, password or
database login, store it where a service reads it or deploy it, and delete, revoke or drop the old
one. In every such script or workflow:

A credential rotation names the production environment explicitly in every command that stores or deploys the new credential, and deletes or revokes the old credential only after confirming that production actually uses the new one, stopping without deleting it when that confirmation does not come.

- Explicit means the command itself names production, such as `wrangler secret put NAME --env production`; a command that falls back to a default environment does not target production, even when production is what the author meant.
- Confirmation is evidence that only production using the new credential can produce, such as an access log, a last-used record or an open connection showing the production service using the new key, token or login. A successful deploy, a fixed wait, or a check that would also pass with the old credential is not confirmation.
- Changing a password in place revokes the old password at that moment.

A file that rotates no credential, such as one that rotates log files or backups, has nothing to
check, and neither does a helper library whose functions each do one thing, such as only creating
or only deleting a key.
