---
name: balance-check-and-debit-atomic
description: Use whenever you write or change Python code under app/ that spends, debits, reserves or uses up something limited (account credit or a balance, a stock count, a coupon's uses against its usage_limit, a single-use gift card or voucher), for example in app/wallet.py, app/orders.py or app/giftcards.py, even if the request does not mention concurrency. Covers how to make the "is there enough?" check and the decrement one atomic database operation, with a conditional UPDATE or a locking transaction, so two requests cannot both spend the same balance.
---

# The check and the decrement are one atomic operation

## The rule

Checking a balance, stock count or usage limit and then decrementing it must be one atomic operation (a conditional update, or a row lock taken inside the same transaction as the write), never a read followed by a separate write.

- A conditional update is one `UPDATE` statement whose `WHERE` clause holds the check, such as `UPDATE users SET credit_cents = credit_cents - ? WHERE id = ? AND credit_cents >= ?`, after which the code uses the cursor's `rowcount` to learn whether the check passed.
- The database is SQLite, which has no row locks. Its lock is `with db.transaction(immediate=True):`, which takes the database's write lock when the transaction begins and holds it until the block ends; the read and the write both go inside that block.
- A plain `with db.transaction():` lets another request read the same value before this one writes, so a value read and checked inside it and then written is still a read followed by a separate write.
- Counting a coupon's use against its `usage_limit`, and marking a single-use gift card as used, are decrements of a usage limit.

## Why

Two requests that arrive together both read the same balance, both see enough, and both
write. The customer pays two invoices with one balance, a coupon meant for 100 orders is used
101 times, a gift card is redeemed twice. Tests run one request at a time, so they pass. The
billing tool Paymenter shipped exactly this: it took a lock outside any transaction, the lock
held nothing, and users could spend their credit several times over.

## How to apply it

1. Put the check in the `WHERE` of the `UPDATE` that decrements, and read `rowcount`: 0 means
   the check failed, so raise and write nothing else.
2. Make the writes that depend on the decrement (the invoice marked paid, the credit added for a
   card, the order rows, a ledger entry) in the same `with db.transaction():` block, after the
   `rowcount` check.
3. If the check cannot be written as a `WHERE` clause, do the read, the check and the write all
   inside one `with db.transaction(immediate=True):` block.

Common slips:

- Reading with `models.get_user(...)` or a `SELECT`, comparing in Python, then updating.
- Writing `credit_cents = credit_cents - ?` without the check in the `WHERE`: no update is lost,
  but two requests can still both pass the earlier check and take the balance below zero.
- Wrapping the read and the write in a plain `with db.transaction():` and assuming it locks.
- Reading before the `immediate=True` block and writing inside it: the lock comes too late.
- Running the conditional `UPDATE` but never looking at its `rowcount`.

Reads that check something else first, such as whether the row exists or who owns it, are fine.

## Example

Reserving stock for a print run. `products.stock` counts the sheets left.

Violating: the stock is read, checked in Python, then written.

```python
def reserve_paper(sku, sheets):
    with db.transaction() as conn:
        stock = conn.execute("SELECT stock FROM products WHERE sku = ?", (sku,)).fetchone()[0]
        if stock < sheets:
            raise OutOfStock(sku)
        conn.execute("UPDATE products SET stock = ? WHERE sku = ?", (stock - sheets, sku))
        conn.execute("INSERT INTO reservations (sku, sheets) VALUES (?, ?)", (sku, sheets))
```

Compliant: the check is part of the `UPDATE`, and its `rowcount` decides.

```python
def reserve_paper(sku, sheets):
    with db.transaction() as conn:
        cursor = conn.execute(
            "UPDATE products SET stock = stock - ? WHERE sku = ? AND stock >= ?",
            (sheets, sku, sheets),
        )
        if cursor.rowcount == 0:
            raise OutOfStock(sku)
        conn.execute("INSERT INTO reservations (sku, sheets) VALUES (?, ?)", (sku, sheets))
```

## Before you commit

For every place in the staged diff that lowers a balance or a stock count, counts a limited use
or marks a single-use item used, find the check that comes before it. Confirm the check is in the
same `UPDATE`'s `WHERE` with its `rowcount` acted on, or that the read and the write sit in one
`with db.transaction(immediate=True):` block. Fix what fails and check again.
