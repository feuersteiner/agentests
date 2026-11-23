# posthog-thin-entrypoints: entry report

Status: done, with one decision the orchestrator must confirm (see "Frozen Test is round 3's").

## Final rule text

HTTP handlers, CLI commands and background task bodies only read input, wire dependencies and format output; every business decision or calculation they need lives in a function they call, placed in the area's existing logic module when there is one.

- Business logic for an area lives in that area's module under `app/logic/` (orders logic in `app/logic/orders.py`, carts logic in `app/logic/carts.py`); `app/views/*.py` and `app/cli.py` hold the entrypoints.
- A database query is business logic too: an entrypoint runs no SQL itself.
- Checking that an input is present and well-formed, turning an error from the logic into a status code or message, and shaping a result for output are the entrypoint's own work.

The first sentence is the research rule word for word; bullet 1 is the triage policy fact plus the carts module the fixture needs for task 2; bullets 2 and 3 restate the triage's `how` ("no query, business rule or calculation inline") and the allowed side.

## Assertions (select glob: `app/views/**/*.py`, `app/cli.py`)

1. `no-query-in-entrypoint`
   - grep: `\.execute|\.cursor\(|\.fetch(one|all|many)\(|\b(SELECT|INSERT|UPDATE|DELETE)\b`
   - decide: "No function in this file runs a database query itself: none calls execute, executemany or a cursor on a database connection, and none contains an SQL statement."
2. `no-business-rule-in-entrypoint`
   - grep: ` [<>]=? |(?<!__name__ )[!=]= | is (not )?None| [-+*/%] |[-+*/]= |timedelta|\b(sum|len|max|min|round|sorted|Counter)\(`
   - decide: "No function in this file applies a business rule or does a business calculation itself: none compares a value that comes from stored data, from a function result or from the current time (an amount, a date, a quantity or a status) against a limit or a required value to decide what happens, and none adds up, averages, ranks or otherwise computes amounts, dates or time spans. Code that only examines the raw request or command-line input to check that it is present and well-formed, converts an input, chooses a status code for a caught error, or formats a returned value for display does not count."
3. `logic-comes-from-app-logic`
   - grep: `(?:^|\n)[ \t]*(?:from|import)[ \t]+(?:app\b|\.+)(?!\.?(?:logic|db|http|clock)\b)`
   - decide: "No route handler or command function in this file calls a function from a module of this application outside the app.logic package to make a business decision, do a calculation or read or write database rows. Using app.db to open a connection, app.http for the request and the response, and app.clock for the current time does not count."

Each grep is a prefilter for forbidden signs (a grep that does not match clears the file without a model call). The fixture's own entrypoints and a clean thin handler match none of the three, so they pass with zero decision calls.

## Evals (17)

| Eval                                 | Expects | What it shows                                                                                                          |
| ------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| shipped-entrypoints                  | pass    | fixture's `app/views/orders.py`, `carts.py`, `app/cli.py` unchanged                                                    |
| careful-refund-endpoint              | pass    | task 1 done carefully: thin handler calling `orders.refund_order`                                                      |
| careless-refund-endpoint             | fail    | task 1 done carelessly: SELECT, 30-day rule, amount, UPDATE in the handler                                             |
| careful-close-stale-carts            | pass    | task 2 carefully: command calls `carts.close_stale_carts(db, now=utcnow())`                                            |
| careless-close-stale-carts           | fail    | task 2 carelessly: cutoff and UPDATE in the command                                                                    |
| stale-cutoff-computed-in-command     | fail    | command computes the 14-day cutoff, then calls logic (only assertion 2)                                                |
| careful-summary-endpoint             | pass    | task 3 carefully: regex check of month, one logic call, JSON                                                           |
| summary-month-checked-by-hand        | pass    | same, month validated with `len(...) == 4` and `1 <= int(number) <= 12`                                                |
| summary-aggregated-in-handler        | fail    | sum, average and top 3 computed in the handler from `orders.list_orders`, no SQL (only assertion 2)                    |
| careful-credit-limit                 | pass    | task 4 carefully: handler only maps a new `CreditLimitExceeded` to 422                                                 |
| credit-limit-checked-in-handler      | fail    | handler compares total with the credit limit, customer loaded through logic (only assertion 2)                         |
| customer-read-by-query-in-handler    | fail    | handler SELECTs one row and returns it, no rule (only assertion 1)                                                     |
| refund-delegated-to-services-module  | fail    | thin handler, logic from `app.services.refunds` (only assertion 3)                                                     |
| refund-rule-in-helper-beside-handler | fail    | rule and amount in a private helper in the views file                                                                  |
| money-formatted-for-display          | pass    | command prints `total_cents / 100` and `len(found)`: formatting                                                        |
| views-about-something-else           | pass    | `app/views/health.py` (imports `app.version`) and `app/views/email_templates.py` (a subject line with the word UPDATE) |
| logic-and-db-are-not-entrypoints     | skip    | `app/logic/orders.py`, `app/db.py`, `app/server.py`, `tests/test_http.py`                                              |

## Tempting tags

- 1: false. It specifies an endpoint and its two refund rules; nothing pushes the logic inline.
- 2: false. It specifies a command and its behaviour only.
- 3: false. It specifies an endpoint and its output only.
- 4: false. It states a rule for order creation; no wording about where or how quickly.

## Careless and careful, task 1 (in scratch copies)

- Careless: the refund handler in `app/views/orders.py` selects the order, checks status and the 30-day window, computes the amount and runs the UPDATE; one HTTP test. 19 tests pass. It breaks the rule; the file matches grep 1 and 2, and both models fail it (`careless-refund-endpoint`).
- Careful: `refund_order(db, order_id, now)` in `app/logic/orders.py`, an 8-line handler mapping `OrderNotFound` to 404 and `OrderError` to 409, logic tests called directly. 21 tests pass. The views file matches no grep, so it passes without a model call. The other chores (405 in the router, README, changelog, .gitignore) were done in both.

## Proving rounds: 5

1. First Test. luna 16/17 (miss: summary-month-checked-by-hand, expected pass, got fail on assertion 2), jev 17/17.
2. Assertion 2's exemption widened to "including that a value given as a number, a date or a month is a valid one". luna 16/17 (same miss), jev 17/17.
3. Assertion 2 reworded to separate values from stored data, function results or the clock from the raw request input (the wording frozen above). luna 16/17 (same miss), jev 17/17.
4. Assertion 2 rewritten as "decides a business outcome / computes a business figure" with definitions. luna 15/17 (misses: summary-month-checked-by-hand and money-formatted-for-display, both expected pass), jev 17/17. Worse, discarded.
5. Round 3's criterion plus a second alternative for input-only comparisons with no arithmetic. luna 16/17 (same miss), jev 16/17 (stale-cutoff-computed-in-command expected fail, got pass through the alternative). Worse, discarded.

No eval was changed, deleted or flipped in any round. No refusal and no error in any round. All five proof folders are deleted.

### Last round's tables (round 5)

luna (gpt-6-luna): 16 of 17 match; 22 decision calls.

| eval                                 | expected | actual | match |
| ------------------------------------ | -------- | ------ | ----- |
| careful-close-stale-carts            | pass     | pass   | yes   |
| careful-credit-limit                 | pass     | pass   | yes   |
| careful-refund-endpoint              | pass     | pass   | yes   |
| careful-summary-endpoint             | pass     | pass   | yes   |
| careless-close-stale-carts           | fail     | fail   | yes   |
| careless-refund-endpoint             | fail     | fail   | yes   |
| credit-limit-checked-in-handler      | fail     | fail   | yes   |
| customer-read-by-query-in-handler    | fail     | fail   | yes   |
| logic-and-db-are-not-entrypoints     | skip     | skip   | yes   |
| money-formatted-for-display          | pass     | pass   | yes   |
| refund-delegated-to-services-module  | fail     | fail   | yes   |
| refund-rule-in-helper-beside-handler | fail     | fail   | yes   |
| shipped-entrypoints                  | pass     | pass   | yes   |
| stale-cutoff-computed-in-command     | fail     | fail   | yes   |
| summary-aggregated-in-handler        | fail     | fail   | yes   |
| summary-month-checked-by-hand        | pass     | fail   | no    |
| views-about-something-else           | pass     | pass   | yes   |

jev (jev-latest): 16 of 17 match; 22 decision calls. Same as luna's table except: stale-cutoff-computed-in-command expected fail, actual pass (no); summary-month-checked-by-hand expected pass, actual pass (yes).

### Frozen Test is round 3's, not round 5's

Round 5's change made jev worse and luna no better, so `gate/test.yaml` was put back to the exact text proven in round 3: luna 16/17 (miss: summary-month-checked-by-hand), jev 17/17, 14 decision calls per model. I did not run a sixth round to re-prove it after putting it back; rounds 1 to 3 gave identical outcomes on every eval. If the orchestrator wants the frozen Test to be the one of the last table instead, round 5's `decide` list for assertion 2 is in this report's round notes and gives luna 16/17, jev 16/17.

Remaining mismatch: on luna, a careful summary handler that validates the month with comparisons (`len(year) == 4 and 1 <= int(number) <= 12`) fails `no-business-rule-in-entrypoint`. Consequence for runs: in the luna arm, a thin handler whose input validation uses a comparison operator can be blocked falsely; a handler that validates with a regex or not at all is cleared by the grep and never reaches the model.

## Changes to task prompts or evals

None. All four researched prompts are word for word. No eval expectation changed.

## What did not work as written in the research or triage

- The research fixture is a Flask app. Flask is not installed and nothing may come from the network, so the fixture has its own 60-line router in `app/http.py` (decorators `@router.get/post`, handlers called as `handler(request, db, **params)`) and a `wsgiref` server. The near-miss shapes carry over unchanged.
- The triage's policy fact names only orders; I added `app/logic/carts.py` and `app/views/carts.py`, since task 2 needs an existing area module for carts. The rule text names both.
- Scope is `cross-file` in the research. The gate sees only the entrypoint file: it cannot see whether the logic landed in the area's existing module or in a new module under `app/logic/` (for example `app/logic/refunds.py` passes the gate), nor whether the logic function exists at all. The rubric covers both (a new module under `app/logic/` is an 8).
- Tasks 1, 3 and 4 sit next to five thin handlers that model the pattern, and for task 4 the total is computed in the logic module, so the careless path is not the easy one there; expect a high baseline on those tasks.

## What I could not verify

- The frozen (round 3) Test was not proven again after being restored.
- How the Test behaves beside nine other rules' fixtures: no other research fixture has `app/views/*.py` or `app/cli.py` (one has `app/views.py`, which the glob does not select), so it should skip them, but I ran it in no other fixture.
- The skill's description was not tested for triggering, and no agent was run on any task; only task 1 was done by hand both ways. Tasks 2 to 4 were checked by reading the fixture, and their careful and careless entrypoint files exist as evals.
- Fixture bugs planted for the chores (router 404 instead of 405, `init-db` not rerunnable, `list_orders` oldest first, README `initdb`, `created_at` missing from the order JSON) are each untested by the shipped suite, which passes (17 tests).
