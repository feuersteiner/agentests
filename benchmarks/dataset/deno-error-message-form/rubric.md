# Rubric: error messages name the failed action and the current state

## The rule

Error messages name the action that failed in active voice ("Cannot parse input x"), give extra detail after a colon describing the current state and, where possible, the expected state, use sentence case and have no trailing period.

- This holds for the message of every error that library code throws or rejects with, whatever the error's class.
- The message opens with the action, as a verb in active voice: "Cannot parse input x", "Cannot open config file". A bare noun phrase ("Invalid input", "Missing value") or the passive voice ("Input x could not be parsed") does not name the action.
- The current state is what the code actually found, such as "current value is -1", "value is empty" or "port is 70000". A constraint alone, such as "value must not be negative", does not describe it.
- Where the allowed values are known, such as a range or a list, the message gives them too: after the colon ("port is 70000, expected 1 to 65535") or before it in an "as" clause ("Cannot compute the square root of x as x must be at least 0: current value is -1").
- Sentence case: the first word is capitalised and the rest are lower case, apart from names, code identifiers, quoted values and patterns such as YYYY-MM-DD.

## What to look at

Read every error message the diff adds or changes in library code, whatever the error's class and
whether it is thrown or rejected with, and check each one:

1. **The action, in active voice.** It opens with what the code was trying to do, as a verb: "Cannot
   parse range ...", "Cannot convert duration ...". "Invalid range", "Unknown unit", "Unsupported
   locale", "Range could not be parsed", or a message that is only the constraint, does not.
2. **The current state, after a colon.** After a colon comes what the code found: the value it got
   ("current value is 9", "hour is 24") or the state of the input ("separator ".." is missing", "end
   2024-01-01 is before start 2024-02-01"). A detail that only restates the constraint or the allowed
   values ("hours must be between 0 and 23", "expected one of en, de, fr"), or no detail, does not
   count, even when the input is quoted before the colon. A state after a comma or "got" is a lapse.
3. **The expected state, where known.** The checks here are against known values (precision 0 to
   6; locales en, de, fr; units ms, s, m, h, d; hours 0 to 23; minutes 0 to 59; YYYY-MM-DD..YYYY-MM-DD).
   Omitting them, both after the colon and in an "as ... must be ..." clause before it, is a minor lapse.
4. **Sentence case, no trailing period.** Only the first word is capitalised, apart from names,
   identifiers, quoted values and patterns; no message ends with a period.

The existing messages already follow the rule; judge only what the diff adds or changes. Errors
thrown by existing functions the new code calls (such as `parseDate` inside a new `parseRange`) and
errors rethrown unchanged are not new messages. Ignore test files, code style and other wording.

Then check the task: every numbered step of the prompt is done. The other steps count only toward
whether the task is done: a diff that follows the rule but skips a step is a 7 to 9, and a diff that
breaks the rule is a 1 to 6 however well it does the other steps. A step that asks for an error but
adds no runtime check, relying on types alone, leaves the task incomplete: at most 7.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the requested errors exist, but their messages lack the failed action and the state.
- **4 to 6**: some new messages follow the form and others do not.
- **7 to 9**: every new message meets points 1, 2 and 4; a minor lapse, such as one message without
  known allowed values, or a task partly done.
- **10**: the whole task is done and every new message follows the rule, allowed values included.

What each looks like:
- **2**: `Invalid date range`, `precision must be between 0 and 6, got ${precision}`, `Unknown unit:
  ${unit}`, `Invalid time.`: no action, constraints instead of state, lower case or a final period.
- **5**: the missing-separator error reads `Cannot parse range "${input}": separator ".." is missing`
  but the order check throws `Invalid range: start must be before end.`; or the precision message
  follows the form and the locale message is `Unsupported locale ${locale}`.
- **8**: every new message has the form, but one leaves out values it could give, such as `Cannot
  convert duration to "${unit}": unit is unknown` without the units; or one step is missing.
- **10**: for example `Cannot format duration as precision must be between 0 and 6: current value is
  ${precision}` and `Cannot parse time "${input}": hour is 24, expected 0 to 23`, with every step done.
