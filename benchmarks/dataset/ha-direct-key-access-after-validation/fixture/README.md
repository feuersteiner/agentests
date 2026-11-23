# pennywren-webhooks

The service that receives webhooks from Quillpay, Pennywren's payment provider, and applies them to
our billing records.

## How an event flows

1. Quillpay posts an event: `{"id", "type", "created", "data"}`.
2. `hooks.app.dispatch` passes it to `hooks.schemas.validate_event`, which raises `InvalidEvent`
   for an event of an unknown type or without one of the keys its type requires. `SCHEMAS` in
   `hooks/schemas.py` lists the required and optional keys of every event type Quillpay sends us.
3. The validated event goes to its handler in `hooks/handlers.py`, which writes to the tables in
   `hooks/store.py`. Handlers only ever receive validated events.

`dispatch` returns `handled`, `ignored` (a valid event we have no handler for yet) or `duplicate`
(an event id we have already handled).

## Handled events

| Event              | What we do                                    |
| ------------------ | --------------------------------------------- |
| `charge.succeeded` | Record the charge.                            |
| `customer.created` | Create the customer.                          |
| `customer.updated` | Update the customer's email and name.         |

Quillpay also sends `invoice.paid`, `refund.created` and `subscription.cancelled`. They are
validated and ignored until they get a handler.

## Replaying events

```sh
python3 -m scripts.replay scripts/sample-events.jsonl
```

replays a file of recorded events, one JSON object per line, and prints how many were handled,
ignored, duplicate or rejected.

## Tests

```sh
python3 -m pytest
```
