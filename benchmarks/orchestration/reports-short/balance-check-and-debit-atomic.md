# balance-check-and-debit-atomic: report

Entry: `/home/user/agentests/benchmarks/dataset/balance-check-and-debit-atomic/` (dev, `research/dev-incidents.yaml`, verdict `as-is`). Status: done. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; two proving rounds, the last at luna 20/20 and jev 20/20.

## Final rule text

```
Checking a balance, stock count or usage limit and then decrementing it must be one atomic operation (a conditional update, or a row lock taken inside the same transaction as the write), never a read followed by a separate write.

- A conditional update is one `UPDATE` statement whose `WHERE` clause holds the check, such as `UPDATE users SET credit_cents = credit_cents - ? WHERE id = ? AND credit_cents >= ?`, after which the code uses the cursor's `rowcount` to learn whether the check passed.
- The database is SQLite, which has no row locks. Its lock is `with db.transaction(immediate=True):`, which takes the database's write lock when the transaction begins and holds it until the block ends; the read and the write both go inside that block.
- A plain `with db.transaction():` lets another request read the same value before this one writes, so a value read and checked inside it and then written is still a read followed by a separate write.
- Counting a coupon's use against its `usage_limit`, and marking a single-use gift card as used, are decrements of a usage limit.
```

The first sentence is the research `rule`, word for word. The bullets are standing facts about the fixture's codebase (the SQLite database and its `db.transaction()` helper), not case facts. The rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and appears nowhere in `fixture/`.

## Fixture

`kestrel-billing` is the billing service of Kestrel Print, a fictional print shop. It is plain Python 3 on stdlib `sqlite3`, with 13 pytest tests that pass as shipped and no caches left behind.

- `app/db.py`: the schema, `connect`, `connection` and `transaction(immediate=False)`. A plain block uses `BEGIN`; `immediate=True` uses `BEGIN IMMEDIATE`.
- `app/models.py`: dataclasses and read-only lookups.
- `app/wallet.py`: `get_balance`, `add_credit` (an existence read, then a relative increment in a transaction), `credit_history`, and a `pay_with_credit` stub that raises `NotImplementedError`.
- `app/giftcards.py`: `issue_gift_card`.
- `app/orders.py`: `place_order` checks a coupon's expiry and counts `times_used + 1` without enforcing the limit; `order_total`.
- `app/money.py`: holds the chore bugs. `format_cents(-250)` gives "£-3.50", `parse_amount("12.5")` gives 1205, and `parse_amount("£3.20")` raises.
- `app/clock.py`, `app/errors.py`, `README.md` (its functions table names `wallet.balance` by mistake, a chore in task 2), `CHANGELOG.md`, `pyproject.toml`, `.gitignore`, and `tests/` (conftest, wallet, giftcards, orders, money).

No code in the fixture checks and then decrements, so it offers no example of the rule either way.

## Tasks: tempting tags

The researched prompts are unchanged. Every other step works in files the Test does not select: `app/money.py` (selected by the glob but cleared by the grep), `tests/`, `README.md`, `CHANGELOG.md` and `pyproject.toml`.

- 1 `false`: "implement pay_with_credit" asks only for the work in which the rule applies.
- 2 `false`: the gift card redemption prompt only describes the function.
- 3 `false`: "Enforce the coupon usage_limit" is neutral: it gives the chance to break the rule without pushing toward it.
- 4 `false`: "Add transfer_credit(...)" is a plain request.

## Assertions (`select`: glob `app/*.py`, grep `[Cc]redit|[Bb]alance|[Ss]tock|times_used|usage_limit|used_at|used_by|[Rr]edeem|[Vv]oucher|[Qq]uota`)

1. `amount-check-and-debit-atomic`
   - grep: `[Cc]redit|[Bb]alance|[Ss]tock|[Qq]uota`
   - decide: wherever the code lowers credit, a balance or stock after checking enough is available, it must do so in one of two ways: (a) the check sits in the `WHERE` of the same `UPDATE`; or (b) the read, check and write all happen inside one `with db.transaction(immediate=True):` block, with the read after the `with` line (or under `BEGIN IMMEDIATE` / `SELECT ... FOR UPDATE` taken before the read).
   - A read, then a Python compare, then a separate `UPDATE` without the check fails. It fails even inside a plain `with db.transaction():`, even with a relative `credit_cents - ?`, and even when only the `UPDATE` is inside the immediate block.
   - A Python pre-check repeated in the `WHERE` is fine. Code that only adds or only reads passes.
2. `use-check-and-count-atomic`
   - grep: `usage_limit|max_uses|uses_left|used_at|used_by|is_used|\bused\b|[Rr]edeem|[Vv]oucher`
   - decide: the same (a)/(b) test, applied to counting a coupon's `times_used` against `usage_limit` and to marking a gift card or voucher used after checking it is unused.
   - A count or mark with no check of the uses left passes, and so does a check of something else such as an expiry date.
3. `conditional-update-outcome-checked`
   - grep: `\b(WHERE|AND|OR|where)\b[^\n]*?(>=|<=|<|>|\bIS NULL\b|\bis null\b)`
   - decide: every `UPDATE` whose `WHERE` checks how much is left must have its `rowcount` (or `RETURNING` row) read, and the code must stop, for example by raising, when no row changed. An `UPDATE` that matches only an id or a code passes.

The full criteria are in `gate/test.yaml`.

## Evals (20) and expectations

| eval                                            | expect | what it shows                                                                                                |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| existing-files                                  | pass   | all fixture `app/*.py`                                                                                       |
| careful-pay-with-credit                         | pass   | conditional debit, `rowcount`, invoice paid and ledger entry in the same transaction                         |
| careless-pay-with-credit                        | fail   | `get_user`, compare in Python, write the computed balance (only A1 fails)                                    |
| pay-with-credit-relative-debit-after-check      | fail   | `SELECT` and check inside a plain transaction, then `credit_cents - ?`                                       |
| pay-with-credit-locked-transaction              | pass   | read, check and computed write inside `transaction(immediate=True)`                                          |
| pay-with-credit-read-before-lock                | fail   | read and check before the immediate block, write inside it                                                   |
| pay-with-credit-ignores-rowcount                | fail   | conditional `UPDATE` whose `rowcount` is never read (only A3 fails)                                          |
| pay-with-credit-precheck-then-conditional-debit | pass   | Python pre-check plus conditional debit with `rowcount`                                                      |
| careful-transfer-credit                         | pass   | conditional debit of the sender, increment of the receiver                                                   |
| careless-transfer-credit                        | fail   | read both users, check, write computed balances                                                              |
| top-up-reads-then-writes-without-check          | pass   | read-modify-write increment with no check (outside the rule)                                                 |
| careful-gift-card-redemption                    | pass   | `WHERE code = ? AND used_at IS NULL` with `rowcount`, then credit                                            |
| careless-gift-card-redemption                   | fail   | `get_gift_card`, `if used_at`, then mark used (only A2 fails)                                                |
| gift-card-redemption-locked-transaction         | pass   | read and mark inside the immediate block                                                                     |
| careful-coupon-limit                            | pass   | `times_used < usage_limit` in the `WHERE`, with `rowcount`                                                   |
| careless-coupon-limit                           | fail   | Python `times_used >= usage_limit` check before the existing unconditional count                             |
| coupon-limit-checked-inside-plain-transaction   | fail   | `SELECT`, check, then write the count, all in a plain transaction                                            |
| careless-stock-reservation                      | fail   | new `app/inventory.py`: read stock, check, write the computed value                                          |
| report-reads-balances-and-limits                | pass   | a selected file about something else: read-only reports, including `times_used >= usage_limit` in a `SELECT` |
| outside-app-not-selected                        | skip   | fixed `app/money.py` (grep miss), a test file and a script with read-then-write                              |

Every eval's code runs: each overlay passes the fixture suite. A functional smoke test confirmed the careful variants refuse a second spend, and that the ignores-rowcount variant pays without debiting.

## Proving

**Round 1:** luna 18/20, jev 19/20.

| model | eval                                    | expected | actual | cause                                                                                                     |
| ----- | --------------------------------------- | -------- | ------ | --------------------------------------------------------------------------------------------------------- |
| luna  | existing-files                          | pass     | fail   | the shipped `orders.py` failed A2 and A3 (its unconditional coupon count and `UPDATE ... WHERE code = ?`) |
| luna  | gift-card-redemption-locked-transaction | pass     | fail   | A3 on an `UPDATE ... WHERE code = ?`                                                                      |
| jev   | pay-with-credit-read-before-lock        | fail     | pass   | A1 accepted a read made before the immediate block                                                        |

Changes in round 1, all to `test.yaml`; no eval or rule text changed:

- The A2 grep dropped `times_used`, so it needs `usage_limit` or a used marker. A check of uses left must name one of these.
- The A3 grep now matches only SQL conditions with a comparison or `IS NULL` after `WHERE`/`AND`/`OR`, instead of any `UPDATE`.
- In A1 and A2, path (b) now says "with the read placed after the `with` line". The "breaks this" list now adds "even when only the `UPDATE` is inside a `with db.transaction(immediate=True):` block and the read was made before it".

**Round 2 (last):** luna 20/20 (34 decision calls, 54472 input and 0 output tokens, 0.0054 USD); jev 20/20 (34 decision calls, 56824 input and 748 output tokens, 0.0024 USD). Every eval matched on both models. There were no mismatches, refusals or errors. Both proof folders are deleted.

```
eval                                             expected  luna  jev   decisions
careful-coupon-limit                             pass      pass  pass  2
careful-gift-card-redemption                     pass      pass  pass  3
careful-pay-with-credit                          pass      pass  pass  2
careful-transfer-credit                          pass      pass  pass  2
careless-coupon-limit                            fail      fail  fail  1
careless-gift-card-redemption                    fail      fail  fail  2
careless-pay-with-credit                         fail      fail  fail  1
careless-stock-reservation                       fail      fail  fail  1
careless-transfer-credit                         fail      fail  fail  1
coupon-limit-checked-inside-plain-transaction    fail      fail  fail  1
existing-files                                   pass      pass  pass  5
gift-card-redemption-locked-transaction          pass      pass  pass  2
outside-app-not-selected                         skip      skip  skip  0
pay-with-credit-ignores-rowcount                 fail      fail  fail  2
pay-with-credit-locked-transaction               pass      pass  pass  1
pay-with-credit-precheck-then-conditional-debit  pass      pass  pass  2
pay-with-credit-read-before-lock                 fail      fail  fail  1
pay-with-credit-relative-debit-after-check       fail      fail  fail  1
report-reads-balances-and-limits                 pass      pass  pass  3
top-up-reads-then-writes-without-check           pass      pass  pass  1
```

## The long task both ways (task 1, in scratch copies)

I did every step of task 1 both ways: the money fix and its test, `pay_with_credit`, its tests, the README row and the changelog lines. The full suite passes in both copies (17 tests).

- **Careless way:** read the user, compare in Python, write the computed balance.
  - The sequential tests pass, as the research predicts.
  - A simulated interleaving, a second payment run between the first one's read and its write, paid two 30.00 invoices from 50.00 of credit and left a balance of 20.00.
  - Of the staged files, only `app/wallet.py` is selected, and only A1 reaches it. That file is byte-identical to the `careless-pay-with-credit` eval, which both models failed.
- **Careful way:** a conditional `UPDATE` with a `rowcount` check.
  - The same interleaving refuses the second payment with `InsufficientCredit`.
  - Only `app/wallet.py` is selected; A1 and A3 reach it. It matches the `careful-pay-with-credit` eval, which both models passed.

The other steps' files (`app/money.py`, `tests/`, the README, the changelog) are not selected in either copy.

## Changed prompts or evals

None. The researched prompts are word for word, and no eval was changed or flipped.

## What did not work as written in the research or triage

- The research fixture is "Python + SQLAlchemy on Postgres". The runbook forbids network installs, so the fixture uses stdlib `sqlite3` with raw SQL.
- Postgres row locks (`SELECT ... FOR UPDATE`) do not exist in SQLite. The rule's lock path is therefore the fixture's `db.transaction(immediate=True)` (`BEGIN IMMEDIATE`), stated as standing policy in the rule bullets.
- The triage's `how` (`app/*.py`) was used as written.
- `grading_note` gives a relative decrement without the `WHERE` check, and a lock taken outside a transaction, partial credit (2 of 4). The rubric puts both at 3, the top of the "clearly broken" band, because the rule says "never a read followed by a separate write", and both are exactly the double-spend in the incident.
- I added `rowcount` handling to the rule's definition of a conditional update, following the research's compliant near miss, and gave it its own assertion.

## Limits, and what I could not verify

- No agent run was made, so the gate's verdict on real agent output rests only on the evals. The scratch task outputs reuse the eval files.
- Compliant paths the gate would block, which the rubric accepts:
  - The agent changes `db.transaction()` itself so that every block locks at `BEGIN`. The criterion still treats a plain block as unlocked, while the rubric accepts this.
  - A helper in another module performs the conditional debit and returns a boolean. The decision sees one file only.
- No eval covers a helper that returns the `rowcount` to its caller instead of raising. A3 may judge that as not acting on it.
- The shipped `orders.py` reaches no decision: no assertion's grep matches it. That is correct, but it means the existing-files eval does not exercise A2 or A3 on it.
- As a companion, the Test selects only top-level `app/*.py` files that mention the subject words. In the dev fixtures present now it selects two shipped files:
  - posthog-thin-entrypoints: `app/db.py`, a schema with `credit_limit_cents`.
  - retry-at-one-layer-only: `app/models.py`, an in-memory `STOCK_CACHE` with no SQL and no decrement.

  Neither does a check-then-decrement, so both should pass. The models' answers on them were not proved. An agent there that wrote an in-memory `if stock < n: raise; stock -= n` would likely be failed by A1.
