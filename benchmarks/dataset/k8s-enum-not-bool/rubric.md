# Rubric: modes and policies are named string enums, not booleans

## The rule

A new API or configuration field that expresses a mode or policy is a string enum with named values (including a named default), not a boolean, unless the concept is truly and permanently two-valued.

- A mode or policy chooses how the service behaves, such as what it sends, retries, allows or requires. A fact that can never have a third value, such as whether an email address was verified or whether a delivery succeeded, is truly two-valued and may be a boolean.
- In TypeScript a string enum is a union of string literals, like `type Visibility = "private" | "team" | "public"`, or an `enum` with string values. Each value names what it selects; `"yes"`, `"no"`, `"on"`, `"off"`, `"true"` and `"false"` do not.
- The default is one of the named values, usually the one that keeps today's behaviour, so no behaviour is chosen only by leaving the field out or by `null` or `undefined`.

## What to look at

Find every field the diff adds to a request, response, settings or stored type, or to an options
or config object, and the code that sets and reads it.

1. **Which fields are modes or policies.** Whether new members are emailed, whether a failed
   delivery is retried, whether a key may write, whether members need a second factor: each is a
   choice of how the service behaves, even when the task words it as yes or no ("choose whether",
   "skip retries", "allow ... to be read-only", "requires"). That wording never makes the concept
   two-valued. A comment saying the boolean may become an enum later does not help either.
2. **The type.** Compliant: a union of string literals or a string enum whose values name the
   behaviours, such as `"email" | "none"`, `"exponential" | "none"`, `"read" | "read_write"`,
   `"optional" | "required"`. Broken: a `boolean`, worst when negatively named (`skipRetries`,
   `disableEmail`, `noRetry`); a plain `string` or a number standing for the mode.
3. **The default.** Today's behaviour (members are emailed, deliveries are retried, keys can
   write, two-factor is not required) should be one of the values, and a field left out of a
   request should mean that value. A union that names only the new behaviour, where leaving the
   field out or `null` means the old one, has no named default.
4. **The values.** `"yes"`/`"no"`, `"on"`/`"off"` or `"true"`/`"false"` are a boolean in disguise.
   `"enabled"`/`"disabled"` are names, but weaker than names of the behaviour: a minor lapse.
5. **What is fine.** A new boolean that records a fact (an address was verified, a member has
   enrolled a second factor), a function or local variable that returns or holds a boolean
   (`isWriteMethod(method)`), and booleans the diff does not add.

Every new mode or policy field counts, including a second field for the same choice (an enum on
the settings plus `sendEmail?: boolean` on the request). The task's other steps (bug fixes,
tests, rename, README, changelog) count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the new mode or policy is a boolean field. 1 when it is negatively named, such as
  `skipRetries: boolean`; 2 or 3 for a plain boolean such as `requireTwoFactor: boolean`.
- **4 to 6**: an enum for the main field, but with a boolean for the same or another new policy
  beside it; or values that are a boolean in disguise (`"yes" | "no"`); or no named default.
- **7 to 9**: a named enum with today's behaviour as named default, with a minor lapse
  (`"enabled"`/`"disabled"`, a default not written down) or a step missing or incomplete.
- **10**: every step done; each new mode or policy a named enum with a named default.

What each looks like:

- **2**: `notifyNewMembers: boolean` in the project settings, defaulting to `true`, checked in
  addMember; or `readOnly?: boolean` on the key request and the key.
- **5**: `retryPolicy: "exponential" | "none"` on the webhook, but the create request takes
  `skipRetries?: boolean` and maps it; or `twoFactor: "required" | null`, null meaning not required.
- **8**: `access: "read" | "read_write"` with `"read_write"` the default, enforced in authorize,
  but the README not updated or one bug fix skipped.
- **10**: for example `newMemberEmail: "send" | "none"` with `"send"` in the default settings and
  addMember honouring it, tests and README updated, the other steps done.
