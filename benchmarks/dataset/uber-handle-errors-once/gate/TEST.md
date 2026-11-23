# Handle errors once

The Go code under `internal/` and `cmd/` deals with each error in one place:

A function that receives an error handles it exactly once, either by logging it and degrading gracefully or by returning it (wrapped with context), never by logging it and then returning it.

- Logging is any call that writes the error to a log or to standard error, at any level, for example through `slog`, `log` or a logger a struct holds.
- Returning it means handing the caller that error, the error wrapped, or a new error in its place, so that the caller may handle it again. A function that logs an error and then carries on with a fallback, skips the item or writes the HTTP response has handled it once and returns no error for it.
- Logging an error in `main` and then exiting is handling it once.

Test files (`*_test.go`) are not judged. A log line that carries no error, such as a note that an
order was created, is not error handling. A file that logs nothing cannot break the rule.
