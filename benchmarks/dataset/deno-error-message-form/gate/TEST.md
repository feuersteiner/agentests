# Error messages name the failed action and the current state

Every error message in the library's TypeScript source under `src/` (not its test files) follows one form:

Error messages name the action that failed in active voice ("Cannot parse input x"), give extra detail after a colon describing the current state and, where possible, the expected state, use sentence case and have no trailing period.

- This holds for the message of every error that library code throws or rejects with, whatever the error's class.
- The message opens with the action, as a verb in active voice: "Cannot parse input x", "Cannot open config file". A bare noun phrase ("Invalid input", "Missing value") or the passive voice ("Input x could not be parsed") does not name the action.
- The current state is what the code actually found, such as "current value is -1", "value is empty" or "port is 70000". A constraint alone, such as "value must not be negative", does not describe it.
- Where the allowed values are known, such as a range or a list, the message gives them too: after the colon ("port is 70000, expected 1 to 65535") or before it in an "as" clause ("Cannot compute the square root of x as x must be at least 0: current value is -1").
- Sentence case: the first word is capitalised and the rest are lower case, apart from names, code identifiers, quoted values and patterns such as YYYY-MM-DD.

Rethrowing an error unchanged, or passing on a message the code did not write, adds no message to judge.
