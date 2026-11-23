# Direct key access after validation

The webhook handlers under `hooks/` read keys from events that have already been validated.

When a schema or validator already guarantees that a key is present, read it with direct indexing (`data["key"]`) rather than `.get()` or a fallback default, so a broken contract fails loudly instead of being silently masked; `.get()` stays for keys that are genuinely optional.

- Webhook handlers (the `handle_*` functions under `hooks/`) only receive events that `validate_event` in `hooks/schemas.py` has accepted, and it rejects any event that lacks a required key. Every event has the keys `id`, `type`, `created` and `data`.
- The keys of `data` that each event type requires, and the ones that are optional:
  - `charge.succeeded` requires `charge_id`, `customer_id`, `amount` and `currency`; `description` is optional.
  - `customer.created` requires `customer_id` and `email`; `name` is optional.
  - `customer.updated` requires `customer_id` and `email`; `name` and `tax_id` are optional.
  - `invoice.paid` requires `invoice_id`, `amount` and `currency`.
  - `refund.created` requires `refund_id`, `charge_id` and `amount`; `note` is optional.
  - `subscription.cancelled` requires `subscription_id`, `reason` and `effective_date`; `feedback` is optional.

A `.get()` on something that is not the event, such as a table of the store or the handler
registry, is not a read of an event key. The validator itself, and code that runs before it, may
read the raw payload however it needs to.
