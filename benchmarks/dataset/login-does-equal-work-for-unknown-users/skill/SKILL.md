---
name: login-does-equal-work-for-unknown-users
description: Use whenever you write or change a login, sign-in or password check in TypeScript under src/ - login route handlers in src/routes/, credential helpers in src/auth/, new login endpoints for another client, messages for SSO-only or passwordless accounts, disabled, suspended or locked accounts, lockout, or making login faster - even if the request does not mention security. Covers which work and which responses a login may vary by account.
---

# A login does equal work for unknown users

## The rule

A login or credential check must do the same expensive work (for example verify against a dummy hash) and return the same response whether the account exists, has no usable password or is disabled, so timing and messages do not reveal which accounts exist.

- The expensive work is the argon2id check, `verifyPassword()` from `src/auth/password.ts`. Every login attempt runs it once: against the account's `passwordHash` when it has one, and against a dummy hash made in advance, not on each request, when no account has the email or the account's `passwordHash` is `null`, as it is for an account that signs in only with SSO.
- A disabled or locked account is refused only after that check has run.
- Every refused attempt gets the same status code and the same body: an unknown email, an SSO-only account, a disabled or locked account and a wrong password are refused alike, and no message, field or header tells them apart.

## Why

An argon2id check takes around 100 ms. A login that returns early for an unknown email answers in
a millisecond, so anyone can time it and learn which emails have accounts, then target those with
phishing or password stuffing. Django shipped this bug in 2024 (CVE-2024-39329): `authenticate()`
skipped the hasher for accounts with unusable passwords, such as SSO-only users, and those logins
came back measurably faster. A message such as "no account with that email" or "use Google to
sign in" gives the same answer without any timing at all.

## How to apply it

1. Look the account up, then always call `verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)`,
   with `DUMMY_HASH` hashed once when the module loads.
2. Decide the outcome after the check, in one condition: no account, no `passwordHash`,
   disabled or locked, or a wrong password all fall into the same refusal.
3. Refuse with one status and one body. If SSO-only users need a pointer, put it in that one
   message for everyone ("If you signed up with Google or Okta, use that button instead").
4. A 400 for a missing field is fine: it depends on the input, not on the account.
5. To make login faster, change something that every path shares; never skip the check for one
   kind of account.

Slips to watch for: `if (!user) return ...` before the check; `if (!user.passwordHash) return ...`;
`if (user.disabled) return ...` before the check; `user ? await verifyPassword(...) : false`;
`await hashPassword('dummy')` on each request; a 403 or 423 for disabled or locked accounts; an
extra `sso` field for SSO-only accounts.

## Example

A staff console checks a support agent's PIN.

Violating: unknown agents return at once, and a suspended agent gets a message of its own.

```ts
const agent = agents.findByHandle(handle);
if (!agent) return json(401, { error: 'Wrong handle or PIN.' });
if (agent.suspended) return json(403, { error: 'Your access is suspended.' });
if (!(await verifyPassword(pin, agent.pinHash))) return json(401, { error: 'Wrong handle or PIN.' });
```

Compliant: every attempt pays for one check, and every refusal looks the same.

```ts
const agent = agents.findByHandle(handle);
const valid = await verifyPassword(pin, agent?.pinHash ?? DUMMY_HASH);
if (!agent || !agent.pinHash || agent.suspended || !valid) {
	return json(401, { error: 'Wrong handle or PIN.' });
}
```

## Before you commit

For every login or credential check in the diff, walk four cases through it: an unknown email,
an account with `passwordHash: null`, a disabled or locked account, and a wrong password. Each
must reach exactly one `verifyPassword()` call and end in the same status and body. Fix what
fails and check again.
