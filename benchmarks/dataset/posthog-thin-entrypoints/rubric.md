# Rubric: thin entrypoints

## The rule

HTTP handlers, CLI commands and background task bodies only read input, wire dependencies and format output; every business decision or calculation they need lives in a function they call, placed in the area's existing logic module when there is one.

- Business logic for an area lives in that area's module under `app/logic/` (orders logic in `app/logic/orders.py`, carts logic in `app/logic/carts.py`); `app/views/*.py` and `app/cli.py` hold the entrypoints.
- A database query is business logic too: an entrypoint runs no SQL itself.
- Checking that an input is present and well-formed, turning an error from the logic into a status code or message, and shaping a result for output are the entrypoint's own work.

## What to look at

Look only at the entrypoints the diff adds or changes: route handlers in `app/views/*.py` and
command functions in `app/cli.py`. Sort each one's lines into two piles.

- **The entrypoint's own work**: reading the body, the query string, path parameters or command
  arguments; checking that an input is there and parses (a month that looks like `2026-10`, an
  integer id); getting the connection and the current time and passing them on; calling the logic;
  catching the logic's errors and choosing a status code or message; building the JSON or the
  printed line from what the logic returned, including converting a value for display.
- **Business logic that must not be there**: SQL or any direct use of the connection to read or
  write rows; a rule of the shop (the 30-day refund window, whether shipping is refunded, the
  14-day staleness cutoff, the credit limit and the trusted exception, which orders count toward
  revenue); arithmetic or aggregation on amounts, dates or counts (a refund amount, a cutoff date,
  a sum, an average, a top-3 ranking); a change of an order's or cart's status.

Then look at where the logic went. It belongs in a function in `app/logic/orders.py` for orders or
`app/logic/carts.py` for carts, taking the connection and plain values such as the current time, so
that a test can call it without HTTP or the command line. Logic moved into a helper function inside
the views file or `app/cli.py`, or into a new module although the area's module exists (for example
`app/refunds.py`, `app/services/summary.py` or `app/logic/refunds.py`), is extracted but misplaced.

Judge the code, not its comments. Do not lower the score for entrypoints the diff leaves as they
were, for a thin handler that validates input, or for a renamed call. Ignore style and naming.

The task's other steps (a bug fix, a test, a rename, the README, the changelog, a config line)
count only toward whether the task is done: keeping the rule but skipping one is a 7 to 9, never
lower for that alone; breaking the rule is a 1 to 6 however well the rest is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the new behaviour is written in the entrypoint. A **2**: the handler or command
  selects the rows itself, compares dates or amounts against the limit, computes the result, runs
  the `UPDATE` and returns it; nothing new appears under `app/logic/`, or only a token helper.
- **4 to 6**: about half is in a logic function and half inline, or all of it is extracted but
  none into the area's module. A **5**: the handler calls a new logic function for the main step
  but still runs a query of its own or decides part of the rule inline (it loads the customer and
  compares the total with the credit limit before calling the logic); or the handler is thin but
  everything went into a new `app/services.py` or a private helper beside the handler.
- **7 to 9**: every new or changed entrypoint is thin and the logic is in the area's module, with
  a minor lapse or a task only partly done. An **8**: one small piece of the rule stays inline
  (the command computes the 14-day cutoff date and passes it in), or the logic sits in a new
  module under `app/logic/` although the area's module exists, or one of the other steps is
  missing.
- **10**: the whole task is done; each new or changed entrypoint only reads input, calls the logic
  and formats the result, and the logic is in `app/logic/orders.py` or `app/logic/carts.py`. For
  example, the handler parses the id or the month, calls one function in `app/logic/orders.py`
  with the connection and the current time, maps its errors to 404 or 409, and returns JSON.
