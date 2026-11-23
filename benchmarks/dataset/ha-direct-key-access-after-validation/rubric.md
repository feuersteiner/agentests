# Rubric: direct key access after validation

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

## What to look at

Read every line the diff adds or changes in a webhook handler (a `handle_*` function, wherever the
diff puts it) or in a helper it passes the event to. For each key read from the event or its `data`:

1. **Is the key guaranteed?** Use the lists in the rule: the four envelope keys and the keys the
   event's type requires are guaranteed; the keys listed as optional are not.
2. **How is a guaranteed key read?** Direct indexing (`event["data"]`, `data["amount"]`) follows
   the rule. These break it: `.get("key")` with or without a default; `event.get("data", {})` or
   `event.get("data") or {}`; a default chosen when the key is missing
   (`data["x"] if "x" in data else ...`, `except KeyError:` around the read, `setdefault`,
   `pop("x", default)`); and returning early or skipping the work when a guaranteed key is absent.
   A `.get()` with a default is worse than one without, because it invents a value.
3. **How is an optional key read?** `.get()`, with or without a default, or an `in` check is right.
   Indexing an optional key directly, so that an event without it raises, is not what the rule
   asks for either: count it as the task not being done for that key.
4. **Was the contract weakened instead?** If the diff edits `hooks/schemas.py` to move a required
   key to optional, or to stop rejecting events, so that a fallback becomes "legitimate", treat
   every such key as a guaranteed key read with a fallback.

Not the rule's business: `.get()` on something that is not the event, such as a table of the
store, the handler registry or a lookup dict; how the handler treats a record that is missing from
the store; how tests build their event dicts; and the task's other steps, which count only toward
whether the task is done. A diff that follows the rule but skips or botches another step is a 7 to
9, never lower for that alone; a diff that breaks the rule is a 1 to 6 however well the other
steps are done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: guaranteed keys are mostly or all read with `.get()` or fallbacks, or the schema was
  loosened to make them optional. A **2**: the new handler starts with
  `data = event.get("data", {})` and reads its required keys as `data.get("amount", 0)` and
  `data.get("currency", "EUR")`, so every guaranteed key has an invented default.
- **4 to 6**: guaranteed keys are indexed in some places and read with `.get()` or a fallback in
  others. A **5**: the handler indexes the record's id but reads one or two other required keys
  with `.get()`, or wraps the reads in `try`/`except KeyError` and carries on.
- **7 to 9**: every guaranteed key is indexed directly and only optional keys use `.get()`, with a
  minor lapse or a task only partly done. An **8**: the rule is followed throughout, but one step
  of the task is missing or wrong (no tests, the README not updated), or the handler re-checks a
  guaranteed key and raises its own error, which is redundant but not silent.
- **10**: every step of the task is done, with `data = event["data"]`, each required key read as
  `data["..."]`, and `.get()` or an `in` check only for optional keys, such as a `tax_id` saved
  only when present.
