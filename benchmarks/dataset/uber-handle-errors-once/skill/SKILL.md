---
name: uber-handle-errors-once
description: Use whenever you write or change Go code that can fail in this repository, such as a new service or store method, an HTTP handler, a client for another service, a file loader or importer, or startup code, even if the request says nothing about errors or logging. Covers what to do with an `err` you receive, whether to log it or return it, and where error logging belongs.
---

# Handle each error once

## The rule

A function that receives an error handles it exactly once, either by logging it and degrading gracefully or by returning it (wrapped with context), never by logging it and then returning it.

- Logging is any call that writes the error to a log or to standard error, at any level, for example through `slog`, `log` or a logger a struct holds.
- Returning it means handing the caller that error, the error wrapped, or a new error in its place, so that the caller may handle it again. A function that logs an error and then carries on with a fallback, skips the item or writes the HTTP response has handled it once and returns no error for it.
- Logging an error in `main` and then exiting is handling it once.

## Why

When every layer logs an error before passing it up, one failure shows up in the logs three or
four times, each with less context than the last, and whoever is on call has to work out that the
lines are one event. The function that decides what happens next is the one that owns the error:
if that is the caller, give the caller a better error and stay quiet; if it is you, log it and
carry on. Adding a log line "to be safe" before a `return err` is the usual slip.

## How to apply it

For every `if err != nil` (or other failure) you write, pick exactly one:

- **Return it.** Wrap it with what this function was doing, `fmt.Errorf("load config %q: %w",
  path, err)`, and do not log. The context belongs in the wrap, not in a log line.
- **Log it and carry on.** Only when the function really can continue: a fallback value, skipping
  one item of many, or answering the request with an error status. Log once, with the error, and
  return no error for it.

Things that still count as logging and returning:

- a lower level: `log.Warn(...)` or `log.Debug(...)` before `return err`;
- a helper that logs and hands the error back, as in `return logged(err)`;
- a `defer` that logs the error the function is about to return;
- logging the original error and returning a different one for the same failure.

A log line with no error in it, such as `log.Info("cache refreshed", "entries", n)`, is fine.

## Example

Violating: the failure is logged here and again by whoever receives the returned error.

```go
func (c *Cache) Refresh(ctx context.Context) error {
	entries, err := c.source.Fetch(ctx)
	if err != nil {
		c.log.Error("failed to fetch entries", "err", err)
		return fmt.Errorf("fetch entries: %w", err)
	}
	c.replace(entries)
	return nil
}
```

Compliant: return it with context and let the caller decide.

```go
func (c *Cache) Refresh(ctx context.Context) error {
	entries, err := c.source.Fetch(ctx)
	if err != nil {
		return fmt.Errorf("fetch entries: %w", err)
	}
	c.replace(entries)
	return nil
}
```

Also compliant: the function can live with the failure, so it logs once and returns nothing.

```go
func (c *Cache) RefreshOrKeep(ctx context.Context) {
	entries, err := c.source.Fetch(ctx)
	if err != nil {
		c.log.Warn("keeping the old entries; fetch failed", "err", err)
		return
	}
	c.replace(entries)
}
```

## Before you commit

Read the staged Go changes once more. For each error path, check that it either returns the error
or logs it, not both, and remove the log line or the return where you find both. Then check again.
