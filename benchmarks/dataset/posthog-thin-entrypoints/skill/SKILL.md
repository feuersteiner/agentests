---
name: posthog-thin-entrypoints
description: Use whenever you add or change an HTTP endpoint, route handler or view in app/views/, or a command in app/cli.py, or any scheduled job or background task, including new endpoints, new CLI commands and changes to what an existing endpoint accepts, rejects or returns. Covers what belongs in the entrypoint itself and where queries, business rules and calculations go under app/logic/.
---

# Thin entrypoints

## The rule

HTTP handlers, CLI commands and background task bodies only read input, wire dependencies and format output; every business decision or calculation they need lives in a function they call, placed in the area's existing logic module when there is one.

- Business logic for an area lives in that area's module under `app/logic/` (orders logic in `app/logic/orders.py`, carts logic in `app/logic/carts.py`); `app/views/*.py` and `app/cli.py` hold the entrypoints.
- A database query is business logic too: an entrypoint runs no SQL itself.
- Checking that an input is present and well-formed, turning an error from the logic into a status code or message, and shaping a result for output are the entrypoint's own work.

This holds for the whole task: every handler and command you add or touch, not only the first.

## Why

A rule written inside a handler can only be tested through HTTP or the command line, and it cannot
be reused: the day a command needs what an endpoint already does, the rule gets copied and the two
copies drift. A function in the logic module takes a connection and plain values, so a test calls
it directly and every entrypoint shares one version of the rule.

## How to apply it

1. Before writing the handler or command, write the function it will call, in the area's module
   under `app/logic/`. Give it the connection and plain values (ids, amounts, the current time as
   a `now` argument) and have it return a result or raise the module's error.
2. Keep the entrypoint to three moves: read and check the input, call that function, turn the
   result or the error into the response or the printed line.
3. Test the function directly, next to the module's other tests.
4. Before you commit, reread each entrypoint you touched. Any SQL, any comparison against a limit,
   a date or a status, any sum, average, ranking or date arithmetic still there moves into the
   logic function. Then check again.

## Example

A request to let customers cancel an order within one hour of placing it.

Breaks the rule: the query, the one-hour rule and the status change are in the handler.

```python
@router.post("/orders/<int:order_id>/cancel")
def cancel_order(request, db, order_id):
    row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if row is None:
        return json_response({"error": "no such order"}, 404)
    if utcnow() - datetime.fromisoformat(row["created_at"]) > timedelta(hours=1):
        return json_response({"error": "too late to cancel"}, 409)
    db.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", (order_id,))
    db.commit()
    return json_response({"id": order_id, "status": "cancelled"})
```

Follows the rule: `cancel_order` in `app/logic/orders.py` holds all of that, and the handler reads,
calls and formats.

```python
@router.post("/orders/<int:order_id>/cancel")
def cancel_order(request, db, order_id):
    try:
        order = orders.cancel_order(db, order_id, now=utcnow())
    except orders.OrderNotFound as error:
        return json_response({"error": str(error)}, 404)
    except orders.OrderError as error:
        return json_response({"error": str(error)}, 409)
    return json_response(order.to_dict())
```

## Common slips

- Loading a row in the handler "just to check it exists" before calling the logic.
- Computing a cutoff date, a total or a default business value in the command and passing it in:
  the number of days or the limit is the rule, so it lives in the logic function.
- Extracting the rule into a private helper beside the handler, or into a new module such as
  `app/services.py`, when the area already has its module under `app/logic/`.
- Leaving one "trivial" comparison inline because the rest was moved.
