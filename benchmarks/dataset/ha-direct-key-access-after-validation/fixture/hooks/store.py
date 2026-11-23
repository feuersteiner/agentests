"""The billing tables the handlers write to.

In memory here; production binds the same names to the Postgres-backed tables. Each table maps a
record's id to the record, a plain dict.

- customers: email, name
- charges: customer_id, amount, currency, description, refunded (the amount refunded so far),
  received_at
- invoices: customer_id, status ("open" or "paid"), amount_due, currency
- refunds: charge_id, amount, note
- subscriptions: customer_id, plan, status ("active" or "cancelled")

Invoices and subscriptions are created by the billing app, not by a webhook.
"""


class Store:
    def __init__(self) -> None:
        self.customers: dict[str, dict] = {}
        self.charges: dict[str, dict] = {}
        self.invoices: dict[str, dict] = {}
        self.refunds: dict[str, dict] = {}
        self.subscriptions: dict[str, dict] = {}
        self.processed_events: set[str] = set()


store = Store()
