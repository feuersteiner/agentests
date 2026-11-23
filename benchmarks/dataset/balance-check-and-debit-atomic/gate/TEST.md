# The check and the decrement are one atomic operation

The Python modules directly under `app/` spend account credit, count coupon uses against their
limits and redeem gift cards on a SQLite database. In every one of them:

Checking a balance, stock count or usage limit and then decrementing it must be one atomic operation (a conditional update, or a row lock taken inside the same transaction as the write), never a read followed by a separate write.

- A conditional update is one `UPDATE` statement whose `WHERE` clause holds the check, such as `UPDATE users SET credit_cents = credit_cents - ? WHERE id = ? AND credit_cents >= ?`, after which the code uses the cursor's `rowcount` to learn whether the check passed.
- The database is SQLite, which has no row locks. Its lock is `with db.transaction(immediate=True):`, which takes the database's write lock when the transaction begins and holds it until the block ends; the read and the write both go inside that block.
- A plain `with db.transaction():` lets another request read the same value before this one writes, so a value read and checked inside it and then written is still a read followed by a separate write.
- Counting a coupon's use against its `usage_limit`, and marking a single-use gift card as used, are decrements of a usage limit.

Code that only adds to a balance, only reads it, or checks something other than how much is
left (whether a row exists, who owns it, an invoice's status, a coupon's expiry date) is not
judged. Neither are the tests under `tests/`.
