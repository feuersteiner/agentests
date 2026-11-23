# Side effects run after the commit

The Python modules of the `orders` package write to the database inside transactions and talk to
the mail relay, the payment provider, the warehouse webhook and the task queue. In every one of
them:

Only the database writes that must succeed or fail together go inside a transaction, never a whole view function, and irreversible side effects (emails, webhooks, external API calls, task dispatch) are kept out of it and scheduled to run after the commit.

- A transaction is a `with transaction.atomic():` block, or a function decorated with `@transaction.atomic()`, from `store.db`.
- A side effect runs after the commit when it is called after the block has ended, or when it is passed to `transaction.on_commit()` inside the block.
- The irreversible side effects in this repository are the email functions of `orders/emails.py`, the payment-provider calls of `orders/payments.py`, the warehouse webhook of `orders/webhooks.py`, and `.delay()` on a task of `orders/tasks.py`. Reading or writing rows with the functions of `orders/models.py` is not a side effect.

A module with no transaction is not judged, and neither are the tests under `orders/tests/`.
