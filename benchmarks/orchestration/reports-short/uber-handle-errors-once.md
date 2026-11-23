# Report: uber-handle-errors-once

Status: done. Entry at `benchmarks/dataset/uber-handle-errors-once/` (dev, `research/dev-conventions.yaml`, verdict `as-is`).

## Final rule text

```text
A function that receives an error handles it exactly once, either by logging it and degrading gracefully or by returning it (wrapped with context), never by logging it and then returning it.

- Logging is any call that writes the error to a log or to standard error, at any level, for example through `slog`, `log` or a logger a struct holds.
- Returning it means handing the caller that error, the error wrapped, or a new error in its place, so that the caller may handle it again. A function that logs an error and then carries on with a fallback, skips the item or writes the HTTP response has handled it once and returns no error for it.
- Logging an error in `main` and then exiting is handling it once.
```

The first sentence is the research rule word for word. The three bullets are definitions (what counts as logging, as returning, and the `main` case), not case facts.

## Fixture

`stockroom`, the inventory and order service of the fictional Pelham Supply: a Go module, standard library only (`log/slog`). `internal/store/store.go` (no logging), `internal/service/service.go` (holds a logger, used only for an "order created" info line; errors are wrapped and returned), `internal/httpapi/handlers.go` (the only place that logs errors, then writes the response), `internal/money/money.go`, `cmd/stockroom/main.go` (`run` returns wrapped errors, `main` logs and exits), four `_test.go` files, `warehouses.json`, `testdata/products.csv`, `docs/pricing-api.md`, `Makefile`, `README.md`, `CHANGELOG.md`, `go.mod`, `.gitignore`. `go vet` and `go test ./...` pass as shipped (Go 1.24 is on this machine, see "Did not work as written").

## Assertions (`gate/test.yaml`)

Select: glob `internal/**/!(*_test).go`, `cmd/**/!(*_test).go`; grep `[Ll]og(ger)?\.\w+\(|\bslog\.|\bzap\.|\blogrus\.|os\.Stderr|\bprintln\(` (only files that log at all are selected).

    assert:
      - id: no-log-then-return-same-error
        description: No function logs an error and then returns that error, as it is or wrapped.
        error: Handle the error once. Return it wrapped with context and drop the log line, or log it and carry on without returning it.
        grep: '\berror\b'
        decide: 'No function in this Go file writes an error value to a log or to standard error and then also returns that same error to its caller, as it is or wrapped, for the same failure. An example of what is forbidden is a logging call such as slog.Error("...", "err", err) followed by return err or return fmt.Errorf("...: %w", err). Judge each function on its own: the logging and the return must happen in the same function, or in a helper or deferred function it uses for the error it returns. These are allowed: a function that returns an error without logging it; a function that logs an error and then returns no error for it because it continues, uses a fallback, skips the item, writes an HTTP response or exits the program; a function such as main that logs an error another function returned to it and then exits, while that other function returned the error without logging it; and log lines that carry no error value.'
      - id: no-log-then-return-other-error
        description: No function logs an error and then returns a different error in its place.
        error: Handle the error once. Return an error that wraps the cause and drop the log line, or log it and carry on without returning an error.
        grep: '\berror\b'
        decide: 'In no function of this Go file is a logging call that records an error value, for example logger.Error("...", "err", err) or log.Printf("...: %v", err), followed inside that same function and on the same error path by a return statement that hands the caller some other non-nil error instead, such as a sentinel error variable like ErrInternal or a new error from errors.New("..."). Judge each function on its own: the logging call and the return statement must both be inside one function. After logging an error, a function may return nil or no error at all: it continues, uses a fallback value, skips the item, writes an HTTP response or exits the program. These are allowed too: returning an error, wrapped or not, on a path where no error was logged; log lines that carry no error value, such as a note that the server is listening; and a function such as main that logs an error another function returned to it and then exits.'

Both assertions have grep `\berror\b` first, so a selected file that never mentions the `error` type is cleared without a model call.

## Evals (20) and what each expects

| Eval                                         | Expects | What it shows                                                                                 |
| -------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| shipped-files                                | pass    | the fixture's five non-test Go files unchanged                                                |
| reserve-stock-wraps-and-returns              | pass    | task 1 done the careful way                                                                   |
| reserve-stock-logs-and-returns               | fail    | task 1 the careless way: `s.log.Error` then `return fmt.Errorf` on two paths (assertion 1)    |
| create-order-wraps-the-pricing-failure       | pass    | task 4 careful                                                                                |
| create-order-logs-one-failure-and-returns-it | fail    | task 4 with a single log-and-return among clean paths (assertion 1)                           |
| csv-import-logs-skipped-rows                 | pass    | task 3 careful: warns and skips bad rows, wraps the rest                                      |
| csv-import-logs-open-error-and-returns       | fail    | task 3: logs the open error, returns it bare (assertion 1)                                    |
| main-loads-warehouses-logs-once-and-exits    | pass    | task 2 careful, in `cmd/`: `run` wraps, `main` logs and exits                                 |
| main-run-logs-and-returns                    | fail    | task 2 careless in `cmd/` (assertion 1)                                                       |
| handler-logs-and-answers-500                 | pass    | new handler logs and writes the response, bare `return`                                       |
| warn-level-log-then-return                   | fail    | `log.Printf("warning...")` then `return err` (assertion 1)                                    |
| logging-helper-hands-the-error-back          | fail    | `return nil, logged(msg, err)` helper (assertion 1)                                           |
| deferred-log-of-the-returned-error           | fail    | a `defer` logs the named return error (assertion 1)                                           |
| pricing-client-logs-and-returns-sentinel     | fail    | logs the cause, returns a sentinel / `errors.New` in its place (only assertion 2 should fail) |
| pricing-client-falls-back-and-logs-once      | pass    | logs once and returns a fallback price                                                        |
| loader-logs-close-error-returns-decode-error | pass    | logs a close error, returns a different, unrelated decode error without logging it            |
| html-renderer-about-something-else           | pass    | selected file about something else (HTML table, one debug line)                               |
| rate-limiter-with-info-logs                  | pass    | selected file with no `error` at all, cleared by grep                                         |
| store-without-logging-is-not-selected        | skip    | `store.go` logs nothing                                                                       |
| tests-scripts-and-docs-are-not-judged        | skip    | a `_test.go`, `scripts/seed/main.go` and `docs/errors.md`, each with a log-and-return         |

## Tasks and tempting tags

- 1 `tempting: false`: "Add a ReserveStock ... method" only asks for the work in which the rule applies.
- 2 `tempting: false`: loading a file at startup and serving it gives the chance, no push.
- 3 `tempting: false`: "skips rows with an invalid price" invites the compliant log-and-continue, not a log-and-return.
- 4 `tempting: false`: an HTTP call before creating an order; no wording pushes toward logging.

Each researched prompt is word for word, as step 2 of 4 or 5 (86 to 117 words per prompt). Other steps: a `money.Format` bug with test cases, a README target name, a rename `All` to `Products`, a `vet` Makefile target, sorting products with a test, a README layout line, order IDs starting at 1, a `PRICING_URL` variable, CHANGELOG lines. No task prompt was changed.

## Task 1 done both ways (scratch copy, no agent)

- Careless: `ReserveStock` with `s.log.Error("failed to ...", "err", err)` before each `return fmt.Errorf(...)` (two log-and-return paths), plus the other steps. `go vet` and `go test ./...` pass; the file is the eval `reserve-stock-logs-and-returns`, which both models fail. The service already holds a logger, so this is the natural slip.
- Careful: the same method wrapping and returning, with only an info line on success. Builds, tests pass; it is the eval `reserve-stock-wraps-and-returns`, which both models pass.

## Proving rounds: 5

1. First proof, 18 evals. luna 16/18, jev 18/18. Luna failed `cmd/stockroom/main.go` on assertion 1 in `shipped-files` and `main-loads-warehouses-logs-once-and-exits`: it joined `main`'s log with `run`'s return.
2. Added to both criteria "judge each function on its own" and the allowed case of `main` logging an error another function returned. luna 18/18, jev 17/18: jev passed `pricing-client-logs-and-returns-sentinel`.
3. Rewrote assertion 2's criterion more literally (a logging call that records an error, followed on the same path by a return of some other non-nil error). Added two evals for task 4, `create-order-wraps-the-pricing-failure` and `create-order-logs-one-failure-and-returns-it`. luna 19/20 (shipped `main.go` failed assertion 2), jev 20/20.
4. Restored "judge each function on its own" in assertion 2 and listed the allowed cases (error returned on a path that logged nothing; log lines with no error such as "listening"). luna 20/20, jev 20/20.
5. Replaced two example names in assertion 2's criterion that also occurred in an eval (`ErrUnavailable` to `ErrInternal`, `c.log.Error` to `logger.Error`), so the criterion holds nothing particular to an eval. luna 20/20, jev 20/20. Frozen.

No eval was deleted, flipped or edited after it was first written (gofmt aside); two were added in round 3. No refusals or errors in any round. All proof folders deleted.

## Last round's tables

```text
Proving uber-handle-errors-once on luna: 20 eval(s)
uber-handle-errors-once on luna (gpt-6-luna): 20 of 20 eval(s) match; 38 decision call(s), 54344 input and 0 output token(s), 0.0054 USD
eval                                          expected  actual  match  decisions  error
create-order-logs-one-failure-and-returns-it  fail      fail    yes    2
create-order-wraps-the-pricing-failure        pass      pass    yes    2
csv-import-logs-open-error-and-returns        fail      fail    yes    2
csv-import-logs-skipped-rows                  pass      pass    yes    2
deferred-log-of-the-returned-error            fail      fail    yes    2
handler-logs-and-answers-500                  pass      pass    yes    2
html-renderer-about-something-else            pass      pass    yes    2
loader-logs-close-error-returns-decode-error  pass      pass    yes    2
logging-helper-hands-the-error-back           fail      fail    yes    2
main-loads-warehouses-logs-once-and-exits     pass      pass    yes    2
main-run-logs-and-returns                     fail      fail    yes    2
pricing-client-falls-back-and-logs-once       pass      pass    yes    2
pricing-client-logs-and-returns-sentinel      fail      fail    yes    2
rate-limiter-with-info-logs                   pass      pass    yes    0
reserve-stock-logs-and-returns                fail      fail    yes    2
reserve-stock-wraps-and-returns               pass      pass    yes    2
shipped-files                                 pass      pass    yes    6
store-without-logging-is-not-selected         skip      skip    yes    0
tests-scripts-and-docs-are-not-judged         skip      skip    yes    0
warn-level-log-then-return                    fail      fail    yes    2
Proving uber-handle-errors-once on jev: 20 eval(s)
uber-handle-errors-once on jev (jev-latest): 20 of 20 eval(s) match; 38 decision call(s), 57665 input and 836 output token(s), 0.0024 USD
eval                                          expected  actual  match  decisions  error
create-order-logs-one-failure-and-returns-it  fail      fail    yes    2
create-order-wraps-the-pricing-failure        pass      pass    yes    2
csv-import-logs-open-error-and-returns        fail      fail    yes    2
csv-import-logs-skipped-rows                  pass      pass    yes    2
deferred-log-of-the-returned-error            fail      fail    yes    2
handler-logs-and-answers-500                  pass      pass    yes    2
html-renderer-about-something-else            pass      pass    yes    2
loader-logs-close-error-returns-decode-error  pass      pass    yes    2
logging-helper-hands-the-error-back           fail      fail    yes    2
main-loads-warehouses-logs-once-and-exits     pass      pass    yes    2
main-run-logs-and-returns                     fail      fail    yes    2
pricing-client-falls-back-and-logs-once       pass      pass    yes    2
pricing-client-logs-and-returns-sentinel      fail      fail    yes    2
rate-limiter-with-info-logs                   pass      pass    yes    0
reserve-stock-logs-and-returns                fail      fail    yes    2
reserve-stock-wraps-and-returns               pass      pass    yes    2
shipped-files                                 pass      pass    yes    6
store-without-logging-is-not-selected         skip      skip    yes    0
tests-scripts-and-docs-are-not-judged         skip      skip    yes    0
warn-level-log-then-return                    fail      fail    yes    2
```

## Did not work as written in the research, triage or runbook

- The triage's `how` says to judge `internal/**/*.go`. The Test also selects `cmd/**/*.go`, because task 2 ("at startup") is naturally done in `cmd/stockroom/main.go`, and it leaves out `*_test.go` with the extglob `!(*_test).go` (minimatch supports it; `!` exclusions are not in the package yet). An eval covers each.
- The runbook says there is no Go toolchain, but `go` 1.24.7 is at `/usr/local/go/bin` on this machine; I used it to check that the fixture and the task-1 variants build and pass. If the agent's environment has no Go, the tasks can still be done but the agent cannot run the fixture's tests. The fixture ships Go tests (they pass here).
- The rule adds "a new error in its place" as returning: the Uber quote only names log-then-return, and I read a sentinel returned after logging as the same double handling. It is its own assertion, so it can be dropped separately if the owner disagrees.

## Could not verify

- Whether an untold agent actually logs and returns in this fixture (no agent run allowed); the service's logger makes it plausible, but Sonnet often wraps and returns by default, so the baseline may score high on this rule.
- How the Test behaves on other entries' Go fixtures beyond my two unrelated-file evals; it only selects `internal/` and `cmd/` Go files that contain a logging call.
- Whether the skill's description triggers next to nine others.
- A retry loop that logs each failed attempt and finally returns the last error is ambiguous under the rule and is not covered by an eval or the rubric.
