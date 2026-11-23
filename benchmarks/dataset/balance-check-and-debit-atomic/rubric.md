# Rubric: the check and the decrement are one atomic operation

## The rule

Checking a balance, stock count or usage limit and then decrementing it must be one atomic operation (a conditional update, or a row lock taken inside the same transaction as the write), never a read followed by a separate write.

- A conditional update is one `UPDATE` statement whose `WHERE` clause holds the check, such as `UPDATE users SET credit_cents = credit_cents - ? WHERE id = ? AND credit_cents >= ?`, after which the code uses the cursor's `rowcount` to learn whether the check passed.
- The database is SQLite, which has no row locks. Its lock is `with db.transaction(immediate=True):`, which takes the database's write lock when the transaction begins and holds it until the block ends; the read and the write both go inside that block.
- A plain `with db.transaction():` lets another request read the same value before this one writes, so a value read and checked inside it and then written is still a read followed by a separate write.
- Counting a coupon's use against its `usage_limit`, and marking a single-use gift card as used, are decrements of a usage limit.

## What to look at

Find the code under `app/` that spends something limited: credit paid out for an invoice or moved to another user, a gift card redeemed, a coupon use counted against its limit. For each such spend:

1. **Is the check part of the write?** Compliant: one `UPDATE` whose `WHERE` holds the check (`AND credit_cents >= ?`, `AND times_used < usage_limit`, `AND used_at IS NULL`), with the `rowcount` (or a `RETURNING` row) deciding whether the operation goes on; or the read, the check and the write all inside one `with db.transaction(immediate=True):` block.
2. **Is it a read followed by a separate write?** A violation: the value is read (`models.get_user`, `models.get_coupon`, `models.get_gift_card` or a `SELECT`), compared in Python, then written in another statement, whether that statement sets a computed value or subtracts from the column without the check in its `WHERE`, and whether or not both sit in a plain `with db.transaction():`. Reading before the `immediate=True` block and writing inside it is the same violation: the lock comes too late.
3. **Is the check's result used?** A conditional `UPDATE` whose `rowcount` is never looked at lets the invoice be paid, the credit be added or the order go through when nothing was decremented.
4. **Do the dependent writes share the transaction?** The invoice marked paid, the credit added for a card, the receiver's credit, the order rows and any ledger entry belong in the same transaction as the decrement. In a separate transaction, or none, is a minor lapse.

Do not ask for more than the rule does. Reads before the conditional `UPDATE` that check existence, ownership, an invoice's status or a coupon's expiry are fine; adding credit is not a decrement; no concurrency test is required. If the diff changes `db.transaction()` itself so that every block takes the write lock at `BEGIN`, a read and a write inside one block count as locked. The task's other steps (the money fix, tests, the README, the changelog, the version) count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the new spend reads the value, checks it in Python and writes it in a separate statement.
- **4 to 6**: the check is in the `UPDATE` but its `rowcount` is ignored; or one spend is atomic and another in the same diff is a read followed by a write.
- **7 to 9**: every spend is atomic and its result is acted on, with a minor lapse (a dependent write outside the decrement's transaction) or a step of the task missing.
- **10**: every step is done, every spend is one conditional `UPDATE` or a read and write inside `with db.transaction(immediate=True):`, and the dependent writes commit with it.

What each looks like:

- **2**: `user = models.get_user(user_id)`, `if user.credit_cents < invoice.amount_cents: raise ...`, then `UPDATE users SET credit_cents = ?` with the computed balance, inside a plain `db.transaction()`; or `if coupon.times_used >= coupon.usage_limit: raise ...` above the existing unconditional `times_used + 1`. A Python check followed by `credit_cents = credit_cents - ?`, or a read placed before the `immediate=True` block, is a 3.
- **5**: `UPDATE gift_cards SET used_by = ?, used_at = ? WHERE code = ? AND used_at IS NULL` is run, but the card's value is added to the credit whatever its `rowcount`; or `transfer_credit` debits conditionally while a second helper in the diff spends credit after a Python check.
- **8**: the debit is `... WHERE id = ? AND credit_cents >= ?` with a `rowcount` check, but the invoice is marked paid in a second transaction; or one of the task's other steps is missing.
- **10**: the conditional `UPDATE` and its `rowcount` check, or a read and write inside `with db.transaction(immediate=True):`, with the dependent writes in the same transaction, and every step of the task done.
