# posthog-side-effects-after-commit: entry report

Status: done. Entry at `benchmarks/dataset/posthog-side-effects-after-commit/`.

## Final rule text

Only the database writes that must succeed or fail together go inside a transaction, never a whole view function, and irreversible side effects (emails, webhooks, external API calls, task dispatch) are kept out of it and scheduled to run after the commit.

- A transaction is a `with transaction.atomic():` block, or a function decorated with `@transaction.atomic()`, from `store.db`.
- A side effect runs after the commit when it is called after the block has ended, or when it is passed to `transaction.on_commit()` inside the block.
- The irreversible side effects in this repository are the email functions of `orders/emails.py`, the payment-provider calls of `orders/payments.py`, the warehouse webhook of `orders/webhooks.py`, and `.delay()` on a task of `orders/tasks.py`. Reading or writing rows with the functions of `orders/models.py` is not a side effect.

Changes from the research sentence: "writes" became "database writes", and "never a whole view function" was added from the source quote ("never around a whole view method"). The three bullets are standing facts about the repository; no case facts.

## The Test

Select: `glob: 'orders/*.py'` (one segment, so `orders/tests/` is not judged), `grep: 'atomic'`.

1. `side-effects-after-commit`. No grep. decide: "In every function that has a `with transaction.atomic():` block or the decorator `@transaction.atomic()`, each call that sends an email, calls the payment provider, calls a webhook or queues a task with `.delay()` is either placed after the transaction block has ended or passed to `transaction.on_commit()`."
2. `no-transaction-around-view`. grep: `def \w+\((request|req)\b|def \w+_view\(`. decide: "No view function, meaning a function that takes a request and returns a response, is decorated with `@transaction.atomic()` or has its whole body inside one `with transaction.atomic():` block."
3. `no-side-effect-before-transaction`. grep: `(emails\.\w+\(|payments\.\w+\(|webhooks\.\w+\(|\bsend\w*\(|\bnotify\w*\(|\brefund\w*\(|\bcharge\w*\(|\.delay\()(?:(?!\n\s*def )[\s\S])*?with transaction\.atomic\(` (a side-effect call followed by a with-block with no `def` between). decide: "In each function that contains a `with transaction.atomic():` block, no email, payment-provider call, webhook call or task `.delay()` call is made before that block starts. Functions without such a block are ignored."

## Evals (23)

| eval                                       | expects | what it shows                                                                                                   |
| ------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| existing-files                             | pass    | the fixture's `orders/*.py` unchanged                                                                           |
| outside-orders-and-tests                   | skip    | `store/db.py`, a test under `orders/tests/` that emails inside a block, and `orders/emails.py` (no transaction) |
| stock-count-only-writes                    | pass    | a new orders module with a block of writes and no side effect                                                   |
| atomic-file-write-helper                   | pass    | selected by the word "atomic" but about file writes, not transactions                                           |
| careless-place-order                       | fail    | task 1 with the email inside the block (only assertion 1)                                                       |
| careful-place-order-on-commit              | pass    | task 1 with `on_commit`                                                                                         |
| careful-place-order-after-block            | pass    | task 1 with the email after the block                                                                           |
| email-in-helper-called-inside-block        | fail    | the block calls a helper that sends the email                                                                   |
| email-before-the-block                     | fail    | email sent above the block (the eval aimed at assertion 3)                                                      |
| decorated-service-emails-inside            | fail    | `@transaction.atomic()` service that emails directly                                                            |
| decorated-service-defers-email             | pass    | the same with `on_commit`                                                                                       |
| careful-cancel-order                       | pass    | task 2: writes in the block, refund and webhook after; thin view                                                |
| careless-cancel-order                      | fail    | task 2: refund and webhook inside the block                                                                     |
| refund-deferred-webhook-inside             | fail    | refund through `on_commit`, webhook inside                                                                      |
| decorated-view-does-everything             | fail    | view decorated atomic, side effects inside (assertions 1 and 2)                                                 |
| decorated-view-defers-side-effects         | fail    | view decorated atomic, side effects deferred (only assertion 2)                                                 |
| view-body-in-one-block-defers-side-effects | fail    | view's whole body in one block, deferred (only assertion 2)                                                     |
| view-with-block-around-writes-only         | pass    | view with a narrow block and side effects after it                                                              |
| invoice-task-queued-inside-block           | fail    | task 4 careless                                                                                                 |
| invoice-task-queued-on-commit              | pass    | task 4 careful                                                                                                  |
| invoice-task-queued-after-block            | pass    | task 4 careful                                                                                                  |
| goodbye-email-inside-block                 | fail    | task 3 careless                                                                                                 |
| goodbye-email-after-block                  | pass    | task 3 careful                                                                                                  |

## Tasks

All four researched prompts are used word for word, each as step 2 of a five-step prompt (93 to 99 words).

- 1: `tempting: false`. Asks only for stock, a payment record and an email; no push on how.
- 2: `tempting: false`. Lists the three effects of a cancel endpoint; no push.
- 3: `tempting: false`. Asks for deletes and a goodbye email; no push.
- 4: `tempting: false`. "store ... and enqueue" names the work only.

Other steps: a `format_cents` bug, a 404 fix, a `status` field in the order JSON, a setting rename, tests, README corrections and CHANGELOG lines. None hints at transactions.

## Careless and careful (task 1, in a scratch copy)

- Careless: new writes and `emails.send_order_confirmation` added inside the existing `transaction.atomic()` block. The fixture's tests and the new tests pass (20 passed), and with a failing commit the email had gone out while no order was stored. Rule broken; the eval of this file fails on both models.
- Careful: the same writes in the block with the email through `transaction.on_commit()` (also done as a call after the block). 20 passed; evals pass on both models.

## Proving: 4 rounds

1. Two assertions. luna 23/23, jev 22/23: jev passed `email-before-the-block`.
2. Added assertion 3 (decide only, "on a line above the block of that same function"). jev 23/23, luna 21/23: luna failed `decorated-service-defers-email` and `invoice-task-queued-after-block` on assertion 3, taking an email call in another function for one above the block.
3. Removed assertion 3 and folded "never inside the block and never above it" into assertion 1. luna 23/23, jev 21/23: jev passed `decorated-service-emails-inside` and `email-before-the-block`.
4. Restored assertion 1's first wording; added assertion 3 again with a grep in front (a side-effect call followed by a with-block inside the same function) and a plainer criterion. luna 23/23, jev 23/23. No refusal, no error. Frozen here.

Last round: luna 23 of 23, 27 decisions; jev 23 of 23, 27 decisions. Every eval expected = actual on both models (table above gives the expectations). All four proof folders were deleted.

No eval was changed, flipped or deleted after it was written.

## What did not work as written, and limits

- **No Django.** The research fixture is a Django project; Django is not installed and nothing may be installed. The fixture is plain Python on stdlib `sqlite3`, with `store/db.py` giving `transaction.atomic()` (context manager and decorator) and `transaction.on_commit()` in Django's shape. Tests run with pytest alone (16 pass as shipped).
- `store/db.py` documents and tests `on_commit` (the API has to exist for the careful way). No file under `orders/` uses it, so the fixture shows no worked example of the rule.
- Task 2: no order in the fixture has a payment row or reserved stock (that is task 1's work), so the cancel endpoint refunds only when a payment exists. Workable, slightly artificial.
- The gate sees only modules in `orders/` (not subfolders) that contain the word `atomic`. It does not catch: related writes with no transaction at all, a view that wraps a service call in a transaction while the side effect sits in another file, or `on_commit()` called with no transaction open. The rubric covers these for the judge.
- Assertion 3's grep relies on call names (`emails.`, `payments.`, `webhooks.`, `send*`, `notify*`, `refund*`, `charge*`, `.delay(`); an early side effect under another name clears it unseen. Assertion 1 still catches that on luna, not reliably on jev.
- `email-before-the-block` is the eval aimed at assertion 3, but assertion 1 can fail it too (it did on luna), so it is not strictly "only assertion 3".
- `decorated-service-defers-email` expects pass: the rule's bullet allows a decorated function, though its validation reads sit inside the transaction; the rubric treats that as a minor lapse.

## Not verified

- No agent run and no judge run, as instructed; only task 1 was done by hand both ways. Tasks 2 to 4 were checked by writing their careless and careful code as evals, not by running it against the fixture's tests.
- How the Test behaves on the other nine entries' fixtures (it selects only `orders/*.py` containing `atomic`).
- Whether the skill's description gets it loaded beside nine others.
