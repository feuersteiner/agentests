# Thin entrypoints

The route handlers in `app/views/` and the commands in `app/cli.py` are the entrypoints of the order service.

HTTP handlers, CLI commands and background task bodies only read input, wire dependencies and format output; every business decision or calculation they need lives in a function they call, placed in the area's existing logic module when there is one.

- Business logic for an area lives in that area's module under `app/logic/` (orders logic in `app/logic/orders.py`, carts logic in `app/logic/carts.py`); `app/views/*.py` and `app/cli.py` hold the entrypoints.
- A database query is business logic too: an entrypoint runs no SQL itself.
- Checking that an input is present and well-formed, turning an error from the logic into a status code or message, and shaping a result for output are the entrypoint's own work.

An entrypoint file may import `app.db` to open the connection, `app.http` for the request and the response, and `app.clock` for the current time. The logic modules themselves are not entrypoints.
