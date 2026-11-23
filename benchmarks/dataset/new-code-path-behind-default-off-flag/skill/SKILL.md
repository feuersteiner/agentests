---
name: new-code-path-behind-default-off-flag
description: Use whenever you add or change a check, limit or calculation in the API gateway's request path - middleware under src/middleware/, the quota calculation under src/quota/, code that reads quota policy records from src/policies/ - or add a feature flag to src/flags.ts, even if the request does not mention flags or rollout. Covers shipping new request-path behaviour behind a feature flag that is off by default, keeping the old path while the flag is off, and handling policy fields that are missing, null or blank.
---

# New request-path code ships dark and fails open

## The rule

New behaviour added to the gateway's request path ships behind a feature flag that defaults to off, and the new code treats missing or blank fields in the data it reads as "skip this check" (fail open) rather than crashing or rejecting.

- A feature flag is an entry `name: default` in the registry in `src/flags.ts`, read with `isEnabled(name)`. Every flag in the registry defaults to `false`: an environment turns a flag on through its `FLAGS` variable, and a flag's default is never changed to roll it out.
- The daily quota count in `src/middleware/quota.ts`, which compares the requests a project made today with its policy's `dailyLimit`, is the only check in the request path that runs without a flag. Every other check that limits or blocks a project's requests, including a new way of calculating the quota, runs only when `isEnabled(...)` returns true for its flag, read where the check is made rather than where the middleware is mounted; while the flag is off, requests are handled exactly as before.
- The newer fields of a policy record, `burstLimit`, `region`, `maxPerMinute` and `suspended`, are optional: a record may lack them or hold `null` or an empty string in them. When a field that a check reads is missing or blank, the check is skipped and the request goes on; the code never throws or rejects the request because of it.

## Why

On 12 June 2025 a new quota policy check in Google Cloud's Service Control took down every region
at once. The check had shipped two weeks earlier with no feature flag, so it was live everywhere
the moment a policy reached it. When a policy with blank fields replicated worldwide, the new code
dereferenced a missing value and the binary crash-looped. Google's lesson: changes to critical
binaries are feature-flag protected and disabled by default, and new code handles missing data
instead of crashing. A default-off flag lets a check be turned on one environment at a time and
off again without a deploy; failing open means bad policy data costs one skipped check, not an
outage.

## How to apply it

1. Register a new flag in `src/flags.ts` with the default `false`. Never set a default to `true`,
   and never give `FLAGS` a fallback value in code.
2. In the code that makes the check, wrap the whole check in `if (isEnabled('yourFlag')) { ... }`.
   With the flag off, a request must take exactly the path it took before the change.
3. Replacing existing behaviour, such as a new algorithm for a limit, is new behaviour too: keep
   the old path for while the flag is off.
4. Read each optional field once, check that it holds a usable value (`typeof limit === 'number'`,
   a non-empty string, `=== true`), and skip the check otherwise. `!= null` alone lets `""`
   through, and `count > ""` is `count > 0`.
5. In tests, turn the flag on for the new check's tests (for example set `process.env.FLAGS` and
   restore it afterwards), and add a test that a record without the field is let through.

Slips to watch for: `policy.someField!`; `if (!isEnabled(...))`, which is a kill switch and so on
by default; `newCheck: true` in the registry; `if (!policy.someField) return reject(...)`; deleting
the old calculation in the same change that adds the new one.

## Example

A policy gains an optional `allowedReferrers` list, and requests from any other referrer should be
refused.

Violating: live for everyone at once, and a record without the list crashes the request.

```ts
const referrer = req.request.headers.get('referer') ?? '';
if (!policy.allowedReferrers!.some((allowed) => referrer.startsWith(allowed))) {
	return reject(403, 'Referrer not allowed.');
}
```

Compliant: off until an environment turns `referrerCheck` on, and skipped when the list is missing
or empty.

```ts
// src/flags.ts: referrerCheck: false
if (isEnabled('referrerCheck')) {
	const allowed = policy.allowedReferrers;
	const referrer = req.request.headers.get('referer') ?? '';
	if (Array.isArray(allowed) && allowed.length > 0 && !allowed.some((a) => referrer.startsWith(a))) {
		return reject(403, 'Referrer not allowed.');
	}
}
```

## Before you commit

For each check or calculation the diff adds to the request path: find the `isEnabled` call around
it, find its flag in `src/flags.ts` and check that it is `false`, and check that with the flag off
the old path still runs. For each optional field the new code reads, check what happens when it is
missing, `null` or `""`: the check must be skipped, with no throw and no rejection. Fix what fails
and check again.
