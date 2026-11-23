# Rubric: handle errors once

## The rule

A function that receives an error handles it exactly once, either by logging it and degrading gracefully or by returning it (wrapped with context), never by logging it and then returning it.

- Logging is any call that writes the error to a log or to standard error, at any level, for example through `slog`, `log` or a logger a struct holds.
- Returning it means handing the caller that error, the error wrapped, or a new error in its place, so that the caller may handle it again. A function that logs an error and then carries on with a fallback, skips the item or writes the HTTP response has handled it once and returns no error for it.
- Logging an error in `main` and then exiting is handling it once.

## What to look at

Read every Go error path the diff adds or changes outside `_test.go` files: each place where a
function holds a non-nil error (`if err != nil`, a failed lookup, a bad status code, a row that
does not parse). For each one, ask what the function does with that error:

1. **Returned only.** It returns the error, usually wrapped with `fmt.Errorf("...: %w", err)`, and
   writes nothing to a log. Compliant.
2. **Logged and absorbed.** It logs the error and then degrades: uses a fallback value, skips the
   row or item and continues, or (in an HTTP handler) writes the error response. No error for that
   failure goes back to the caller. Compliant. A handler's bare `return` after writing the response
   returns no error.
3. **Logged and returned.** It writes the error to a log (`slog.Error`, `s.log.Warn`,
   `log.Printf`, a print to standard error) and also returns it, wrapped or not, or returns a new
   error that stands for the same failure. This breaks the rule, at any log level, and also when
   the logging is hidden in a helper or a `defer` that logs the error the function returns.

Count the new or changed error paths and how many are of the third kind. A log line that carries
no error (such as "order created" or "imported 4 products") is not error handling and is neither
good nor bad. The request-boundary logging that was already in the HTTP handlers before the change,
and `main` logging the error it got and exiting, are compliant. Swallowing an error silently,
missing wrap context and other style points are outside this rule: do not lower the score for them.

Then check the task: every numbered step of the prompt is done. The other steps count only toward
whether the task is done, never toward the rule.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the task is attempted, but most or all new error paths log the error and return it,
  so one failure would be logged at several layers.
- **4 to 6**: mixed: about half of the new error paths log and return, or the code is clean except
  for two or three paths that log and return.
- **7 to 9**: the rule is followed with a minor lapse (a single log-and-return among several clean
  error paths is a 7), or the rule is fully followed but a step of the task is missing or wrong.
- **10**: every step is done and every new or changed error path handles its error exactly once.

What each looks like:

- **2**: the new function logs before every `return`: `s.log.Error("failed to ...", "err", err)`
  followed by `return fmt.Errorf("...: %w", err)` on each of its error paths, and the caller or
  handler logs the same failure again.
- **5**: the new function wraps and returns most errors cleanly, but two of its paths, for example
  the file that cannot be opened and the response that cannot be decoded, log the error and then
  return it; or half the paths do.
- **8**: every error path either returns the wrapped error or logs it and carries on, and logging
  stays where the error is finally dealt with, but one requested step (a test, a README or
  changelog line, a rename) is missing; a 7 when the steps are done and exactly one path logs and
  returns.
- **10**: all steps done; errors that go up are wrapped and not logged on the way; errors that are
  absorbed (a skipped row, a fallback, an HTTP error response) are logged once and not returned.
