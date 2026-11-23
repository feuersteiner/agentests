---
name: ha-direct-key-access-after-validation
description: Use whenever you write or change Python code that reads keys from a validated payload in this repository, above all the webhook handlers under hooks/ (adding a handler for a new event type, saving a new field of an event, editing an existing handle_* function), even if the request only describes what the handler should do. Covers when to index a key directly and when .get() or a default is appropriate.
---

# Direct key access after validation

## The rule

When a schema or validator already guarantees that a key is present, read it with direct indexing (`data["key"]`) rather than `.get()` or a fallback default, so a broken contract fails loudly instead of being silently masked; `.get()` stays for keys that are genuinely optional.

- Webhook handlers (the `handle_*` functions under `hooks/`) only receive events that `validate_event` in `hooks/schemas.py` has accepted, and it rejects any event that lacks a required key. Every event has the keys `id`, `type`, `created` and `data`.
- The keys of `data` that each event type requires, and the ones that are optional:
  - `charge.succeeded` requires `charge_id`, `customer_id`, `amount` and `currency`; `description` is optional.
  - `customer.created` requires `customer_id` and `email`; `name` is optional.
  - `customer.updated` requires `customer_id` and `email`; `name` and `tax_id` are optional.
  - `invoice.paid` requires `invoice_id`, `amount` and `currency`.
  - `refund.created` requires `refund_id`, `charge_id` and `amount`; `note` is optional.
  - `subscription.cancelled` requires `subscription_id`, `reason` and `effective_date`; `feedback` is optional.

## Why

A handler that reads a required key with `.get()` or a default keeps running when the contract is
broken: the validator changed, the handler was called without validation, or the key was
misspelled. It then writes `None`, `0` or an invented currency into a billing record, and nobody
finds out until the numbers are wrong. Direct indexing turns the same mistake into a `KeyError` at
the line that caused it, on the first event. A reader also learns the contract from the code:
`data["x"]` says "always there", `data.get("x")` says "may be absent".

## How to apply it

For every key you read from an event or its `data`:

1. Look the key up in the lists above (or in the validator) for that event type.
2. Required, or one of the envelope keys: index it, `event["data"]`, `data["amount"]`. No
   `.get()`, with or without a default, no `x if "x" in data else ...`, no `except KeyError`, no
   early return when it is missing.
3. Optional: use `.get()`, with a default if the record needs one, or an `in` check. Do not index
   an optional key directly; an event without it would crash.
4. Leave the validator's lists as they are. Making a key optional so that a fallback looks
   justified hides the same problem.

`.get()` on something that is not the validated payload, such as a lookup table or a registry, is
not covered by this rule.

Common slips: starting a handler with `data = event.get("data", {})`; a "safe" default for an
amount or a currency; `.get()` on an id; treating a key as optional because another event type
has an optional key of the same name.

## Example

A validator guarantees that a `shipment.delivered` message has `shipment_id` and `delivered_at`;
`signed_by` is optional.

Violating: the guaranteed keys are read as if they might be missing.

```python
def on_shipment_delivered(message: dict) -> None:
    body = message.get("body", {})
    shipments.mark_delivered(
        body.get("shipment_id"),
        at=body.get("delivered_at", ""),
        signed_by=body.get("signed_by"),
    )
```

Compliant: guaranteed keys are indexed, and only the optional key uses `.get()`.

```python
def on_shipment_delivered(message: dict) -> None:
    body = message["body"]
    shipments.mark_delivered(
        body["shipment_id"],
        at=body["delivered_at"],
        signed_by=body.get("signed_by"),
    )
```

## Before you commit

Go through every key read in the handlers you touched. For each one, say whether its event type
requires it; replace any `.get()`, default or presence check on a required key with direct
indexing, and check that each optional key is still read safely. Then review the staged diff once
more.
