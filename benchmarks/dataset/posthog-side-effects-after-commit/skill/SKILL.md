---
name: posthog-side-effects-after-commit
description: Use whenever you write or change Python code under orders/ that writes to the database and also sends an email, calls the payment provider, posts to a webhook or queues a background task, or that adds, widens or moves a transaction.atomic() block, for example in orders/services.py or orders/views.py, even if the request does not mention transactions. Covers what belongs inside a transaction and where emails, provider calls, webhooks and .delay() calls go so that they run only after the commit.
---

# Side effects run after the commit

## The rule

Only the database writes that must succeed or fail together go inside a transaction, never a whole view function, and irreversible side effects (emails, webhooks, external API calls, task dispatch) are kept out of it and scheduled to run after the commit.

- A transaction is a `with transaction.atomic():` block, or a function decorated with `@transaction.atomic()`, from `store.db`.
- A side effect runs after the commit when it is called after the block has ended, or when it is passed to `transaction.on_commit()` inside the block.
- The irreversible side effects in this repository are the email functions of `orders/emails.py`, the payment-provider calls of `orders/payments.py`, the warehouse webhook of `orders/webhooks.py`, and `.delay()` on a task of `orders/tasks.py`. Reading or writing rows with the functions of `orders/models.py` is not a side effect.

## Why

A rollback undoes rows. It does not unsend an email, take back a refund or recall a webhook. When
such a call sits inside the block and a later statement raises, the customer has been told about
data that no longer exists. A task queued inside the block can also be picked up by the worker
before the commit and not find the row it was sent for. And a transaction that wraps a whole view
holds the database for as long as the slowest outside system takes to answer.

## How to apply it

1. List the writes of the operation that must not half-happen. Those, and only those, go in one
   `with transaction.atomic():` block. Lookups and validation come before it.
2. List the calls that leave the process: an email, a provider call, a webhook, `.delay()`.
   Put each one after the block, or register it inside the block with
   `transaction.on_commit(lambda: ...)`. Inside a function that may itself be called from
   another transaction, prefer `transaction.on_commit()`: it waits for the outermost commit.
3. Never decorate a view with `@transaction.atomic()` or put its whole body in one block.

Common slips:

- Adding the notification as the last line of the block because it reads as the last step.
- Calling a helper inside the block that sends the email or queues the task further down.
- Sending the email above the block, before the writes it describes have been committed.
- Calling `transaction.on_commit()` outside any block: with no transaction open it runs at once.
- Dropping the transaction altogether to avoid the question, so related writes can half-happen.

## Example

A gift card is issued and the recipient is told. `giftcards` and `ledger` write rows.

Violating: the email and the task are sent inside the block, before the commit.

```python
def issue_gift_card(recipient, amount_cents):
    with transaction.atomic():
        card_id = giftcards.create(recipient["id"], amount_cents)
        ledger.record_liability(card_id, amount_cents)
        emails.send_gift_card(recipient, card_id)
        tasks.render_gift_card_image.delay(card_id)
    return card_id
```

Compliant: the block holds the two writes; the side effects run once they are committed.

```python
def issue_gift_card(recipient, amount_cents):
    with transaction.atomic():
        card_id = giftcards.create(recipient["id"], amount_cents)
        ledger.record_liability(card_id, amount_cents)
        transaction.on_commit(lambda: emails.send_gift_card(recipient, card_id))
        transaction.on_commit(lambda: tasks.render_gift_card_image.delay(card_id))
    return card_id
```

Calling `emails.send_gift_card(recipient, card_id)` on the line after the block is equally fine.

## Before you commit

Read each `transaction.atomic()` in the staged diff. For every line inside it, say whether it is a
database write that must share the transaction; move anything else out. For every email, provider
call, webhook and `.delay()` you added, confirm it runs after the block or through
`transaction.on_commit()`. Fix what fails and check again.
