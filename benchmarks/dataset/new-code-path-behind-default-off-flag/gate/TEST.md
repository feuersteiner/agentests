# New request-path code ships behind a default-off flag and fails open

The gateway's request path under `src/`, its feature-flag registry and the code that reads quota
policies:

New behaviour added to the gateway's request path ships behind a feature flag that defaults to off, and the new code treats missing or blank fields in the data it reads as "skip this check" (fail open) rather than crashing or rejecting.

- A feature flag is an entry `name: default` in the registry in `src/flags.ts`, read with `isEnabled(name)`. Every flag in the registry defaults to `false`: an environment turns a flag on through its `FLAGS` variable, and a flag's default is never changed to roll it out.
- The daily quota count in `src/middleware/quota.ts`, which compares the requests a project made today with its policy's `dailyLimit`, is the only check in the request path that runs without a flag. Every other check that limits or blocks a project's requests, including a new way of calculating the quota, runs only when `isEnabled(...)` returns true for its flag, read where the check is made rather than where the middleware is mounted; while the flag is off, requests are handled exactly as before.
- The newer fields of a policy record, `burstLimit`, `region`, `maxPerMinute` and `suspended`, are optional: a record may lack them or hold `null` or an empty string in them. When a field that a check reads is missing or blank, the check is skipped and the request goes on; the code never throws or rejects the request because of it.

Tests, scripts and settings are not judged, and neither is a file that has no check on a
project's policy, no flag registry and no read of the optional policy fields.
