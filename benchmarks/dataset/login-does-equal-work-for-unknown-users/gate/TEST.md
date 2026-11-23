# A login does equal work for unknown users

The service's TypeScript source under `src/` signs people in: the web app's `POST /login` in
`src/routes/web.ts`, any other login endpoint, and any helper that checks a submitted password
against an account. In every source file that does so:

A login or credential check must do the same expensive work (for example verify against a dummy hash) and return the same response whether the account exists, has no usable password or is disabled, so timing and messages do not reveal which accounts exist.

- The expensive work is the argon2id check, `verifyPassword()` from `src/auth/password.ts`. Every login attempt runs it once: against the account's `passwordHash` when it has one, and against a dummy hash made in advance, not on each request, when no account has the email or the account's `passwordHash` is `null`, as it is for an account that signs in only with SSO.
- A disabled or locked account is refused only after that check has run.
- Every refused attempt gets the same status code and the same body: an unknown email, an SSO-only account, a disabled or locked account and a wrong password are refused alike, and no message, field or header tells them apart.

The tests under `test/`, and any `*.test.ts` or `*.spec.ts` file, are not judged. A source file
that does not check a submitted password against an account, such as the password helpers, the
account store, a sign-up handler or the API's session check, has nothing to judge. A response
chosen from the submitted input alone, such as a 400 for a missing email or password, is the same
for every account and is not a refusal of the account.
