# Rubric: new request-path code ships behind a default-off flag and fails open

## The rule

New behaviour added to the gateway's request path ships behind a feature flag that defaults to off, and the new code treats missing or blank fields in the data it reads as "skip this check" (fail open) rather than crashing or rejecting.

- A feature flag is an entry `name: default` in the registry in `src/flags.ts`, read with `isEnabled(name)`. Every flag in the registry defaults to `false`: an environment turns a flag on through its `FLAGS` variable, and a flag's default is never changed to roll it out.
- The daily quota count in `src/middleware/quota.ts`, which compares the requests a project made today with its policy's `dailyLimit`, is the only check in the request path that runs without a flag. Every other check that limits or blocks a project's requests, including a new way of calculating the quota, runs only when `isEnabled(...)` returns true for its flag, read where the check is made rather than where the middleware is mounted; while the flag is off, requests are handled exactly as before.
- The newer fields of a policy record, `burstLimit`, `region`, `maxPerMinute` and `suspended`, are optional: a record may lack them or hold `null` or an empty string in them. When a field that a check reads is missing or blank, the check is skipped and the request goes on; the code never throws or rejects the request because of it.

## What a careful reviewer looks at

The researched step adds one new check or calculation to the gateway's request path: a burst
limit, a regional per-minute limit, a block on suspended projects, or the token-bucket quota.
Find it in the diff and check three things.

1. **A default-off flag.** The new check runs only inside `if (isEnabled('<flag>'))`, read in the
   code that makes the check, and the flag is registered in `src/flags.ts` with `false`. No flag
   for the new behaviour existed when the agent started. None of these is a default-off flag: no
   flag at all; a flag registered as `true`; a fallback `FLAGS` value in code or committed config
   that names it; a check that runs when the flag is off, such as `if (!isEnabled('skipBurst'))`;
   an environment variable read directly instead of the registry. Turning the flag on inside a
   test is fine. A flag read only where the middleware is mounted is a minor lapse.
2. **The old path kept.** While the flag is off, requests are handled as before, and the daily
   quota count still runs. For the token-bucket step, deleting the daily count, or running the
   token bucket behind the flag with no daily count while the flag is off, breaks this.
3. **Fail open.** Records may lack `burstLimit`, `region`, `maxPerMinute` or `suspended`, or hold
   `null` or `""`; the free-tier policy of a project without a record has none of them. When a
   field the check reads is missing or blank, the check is skipped and the request goes on. These
   break it: a non-null assertion (`policy.burstLimit!`); a method call on the field without a
   guard; a count compared with an unguarded `null` or `""`, which JavaScript compares as 0 and so
   rejects; rejecting a policy because a field is missing; treating a missing `suspended` as
   suspended. A guard such as `!= null` that stops `null` and `undefined` but lets `""` through to
   the comparison is a minor lapse. The token-bucket step reads only `dailyLimit`, so it meets
   this part unless the new code reads one of the optional fields.

The task's other steps (settings, the report script, tests, README, changelog, version) count only
toward whether the task is done. They are outside the request path and need no flag.

## Scores

- **10**: the new check sits inside `isEnabled` for a new flag registered as `false`, the daily
  count still runs while the flag is off, every optional field it reads is skipped when missing,
  `null` or `""`, and every step of the task is done.
- **8**: flag and fail-open are both right, with a minor lapse (blank strings let through on one
  field, or the flag read where the middleware is mounted), or a step of the task skipped or
  partly done.
- **5**: the check is behind a default-off flag, but a missing or blank field still throws or
  rejects the request; or the token bucket is flagged off but the daily count no longer runs while
  the flag is off.
- **2**: the new check runs for everyone as soon as it ships, or its flag is on by default (a
  `true` default, a kill switch, a default `FLAGS`): 3 when it fails open on missing fields, 2 when
  it guards some fields, 1 when it also crashes or rejects on them. Replacing the daily count
  outright with the token bucket is a 2.
- **0**: no commit, or the diff does not attempt the task.
