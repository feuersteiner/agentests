---
name: deno-error-message-form
description: Use whenever you write or change code in a TypeScript or JavaScript library's source (`src/**/*.ts`) that throws an error or rejects a promise - input validation, parsing, option and range checks, unknown or unsupported values - even if the request only says "validate", "reject" or "throw if". Covers how every error message is worded.
---

# Error messages: the failed action, then the current state

## The rule

Error messages name the action that failed in active voice ("Cannot parse input x"), give extra detail after a colon describing the current state and, where possible, the expected state, use sentence case and have no trailing period.

- This holds for the message of every error that library code throws or rejects with, whatever the error's class.
- The message opens with the action, as a verb in active voice: "Cannot parse input x", "Cannot open config file". A bare noun phrase ("Invalid input", "Missing value") or the passive voice ("Input x could not be parsed") does not name the action.
- The current state is what the code actually found, such as "current value is -1", "value is empty" or "port is 70000". A constraint alone, such as "value must not be negative", does not describe it.
- Where the allowed values are known, such as a range or a list, the message gives them too: after the colon ("port is 70000, expected 1 to 65535") or before it in an "as" clause ("Cannot compute the square root of x as x must be at least 0: current value is -1").
- Sentence case: the first word is capitalised and the rest are lower case, apart from names, code identifiers, quoted values and patterns such as YYYY-MM-DD.

## Why

A caller meets the message far from the code, often as one line in a log. "Invalid input" says
neither what was being done nor what was wrong; "Cannot parse input x: value is empty" says both,
and a message that also gives the expected state says how to fix the call. One form across the
codebase also makes messages easy to scan and to search for.

## How to write one

1. Open with the operation that failed, as a verb in active voice: `Cannot <verb> <object>`.
2. Add a colon, then what you found: `current value is ${value}`, `value is empty`,
   `<field> is ${value}`.
3. If you know what was allowed, say it: `, expected 1 to 65535` after the state, or an
   `as <field> must be ...` clause before the colon.
4. Capitalise only the first word (and names, identifiers, quoted values); no full stop at the end.

Slips to watch for: `Invalid X`, `Unknown X`, `Unsupported X`, `X out of range`; a message that is
only the constraint (`Limit must be positive`), or puts it after the colon in place of the value; `X
could not be ...`; `got ${value}` after a comma; a trailing `.` in a template literal; a lower-case
first word.

## Example

`connect(options)` accepts a port from 1 to 65535.

Violating:

```ts
if (port < 1 || port > 65535) throw new RangeError('Port must be between 1 and 65535.');
```

Compliant:

```ts
if (port < 1 || port > 65535) {
	throw new RangeError(`Cannot connect as port must be between 1 and 65535: current value is ${port}`);
}
```

## Before you commit

Search the source files you touched for `throw`, `Error(` and `reject(`. Check every message you
added or changed against the four steps above, fix it, re-run the tests, and update any test that
asserts the old text.
