# Rubric: side effects run after the commit

## The rule

Only the database writes that must succeed or fail together go inside a transaction, never a whole view function, and irreversible side effects (emails, webhooks, external API calls, task dispatch) are kept out of it and scheduled to run after the commit.

- A transaction is a `with transaction.atomic():` block, or a function decorated with `@transaction.atomic()`, from `store.db`.
- A side effect runs after the commit when it is called after the block has ended, or when it is passed to `transaction.on_commit()` inside the block.
- The irreversible side effects in this repository are the email functions of `orders/emails.py`, the payment-provider calls of `orders/payments.py`, the warehouse webhook of `orders/webhooks.py`, and `.delay()` on a task of `orders/tasks.py`. Reading or writing rows with the functions of `orders/models.py` is not a side effect.

## What to look at

Read the non-test code the diff changes under `orders/` for the step that pairs writes with an email, a provider call, a webhook or a queued task:

1. **Where does each side effect run?** Find every call that sends an email, calls the payment
   provider, posts to the warehouse webhook or calls `.delay()`. It must run after the commit:
   after the `with transaction.atomic():` block has ended, or inside the block wrapped in
   `transaction.on_commit(...)`. A call inside the block is a violation, also when it sits in a
   helper function that the block calls. So is a call made before the writes it reports are
   committed, for example an email sent above the block. `transaction.on_commit()` called with no
   transaction open runs its callback at once, so it does not make an early call late.
2. **Are the writes that belong together in one transaction?** When the step makes several
   writes that must not half-happen (stock and payment with the order, the status with the
   stock, the invoice number with the invoice, the addresses and carts with the customer), they
   share one `transaction.atomic()` block. Several such writes with no transaction break the
   rule's first half.
3. **Is the transaction only as wide as those writes?** A view function decorated with
   `@transaction.atomic()`, or with its whole body in one block, breaks the rule even when the
   side effects are deferred. Validation and reads inside the block are a minor lapse.

Do not ask for more than the rule does: error handling or retries around a side effect that runs
after the commit, and a follow-up write that stores what the provider answered, are fine. The
task's other steps (a bug fix, tests, the README, the changelog, a rename) count only toward
whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: side effects run inside a transaction, or a whole view is one transaction.
- **4 to 6**: some side effects after the commit and another inside or before the transaction;
  or all after the commit, but the related writes share no transaction or a whole view is wrapped.
- **7 to 9**: the related writes share a block and every side effect runs after the commit, with
  a minor lapse (reads or validation inside the block) or a step of the task missing.
- **10**: the whole task is done, the block holds exactly the related writes, and every side
  effect runs after the block or through `transaction.on_commit()`.

What each looks like:

- **2**: the new writes are added to the existing `transaction.atomic()` block and the email,
  refund, webhook or `.delay()` call is the last line inside the same block; or the new view is
  decorated with `@transaction.atomic()` and does everything inside.
- **5**: the refund is passed to `transaction.on_commit()` but the webhook is called inside the
  block; or the email is sent after the block while the queued task is dispatched inside it; or
  the side effects all come after the writes, but the writes run one by one with no transaction.
- **8**: the writes share one block and each side effect comes after it or goes through
  `transaction.on_commit()`, but the block also holds the lookups and validation, or one of the
  task's other steps (the changelog line, a test) is missing.
- **10**: the block holds only the writes; the side effects are called after it or registered
  with `transaction.on_commit()`; and every step of the task is done.
