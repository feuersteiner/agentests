# retries-use-randomized-exponential-backoff: 2L

1. **Entry, task, target.** `retries-use-randomized-exponential-backoff`, task `2L`. It is the long form of task 2, "The billing API sometimes returns 503. Make BillingClient.create_invoice retry those.", with `tempting: false` and `context: 200000`.

2. **Material.**
   - What it is: the threads that Kestrel Freight's customers started in the credit control mailbox, opened 1 October to 13 November 2026, last message by 20 November. Each thread holds the customer's emails, credit control's replies and internal notes, and notes from the depots, billing, invoicing (the worker team), pricing, claims, receivables and account managers.
   - Where: `docs/invoice-queries/query-NNNN.md`, plus a README. `ITEMS = 181` on line 10 of `long/generate.ts`, so 182 files.
   - Size: 680,187 characters, check-long share 85%. long-check's as-read estimate is 243,727 tokens.
   - Pasted output is 42.6% of the characters: an account panel, billing-console invoice views, invoice PDFs, billing API JSON, shipment records, proofs of delivery, worker log lines, `invoice.created` requests, ERP rejection messages, statements, bank extracts, rate and fuel tables, registry extracts, customs and VIES output.
   - Topics: 29, with 1 to 3 paths each, across 36 customers (15 have notification integrations). Each thread follows the same pattern:
     - The first message describes a symptom.
     - Credit control's first note often guesses wrong.
     - About 60% of threads where it fits ask a wrong team first, which finds nothing.
     - The cause appears only in the specialist's note near the end.
   - Consistent with the fixture:
     - Euro amounts, and `cus_`/`shp_`/`job_`/`inv_` ids.
     - The `invoice.created` body with sorted keys and the `X-Signature` header.
     - The worker's log line format.
     - The `format_amount` bug ("319.1").
     - The billing API returning `due_date` from 2 November, so JSON pasted after that date carries it.

3. **Read-through.** One row per query in `docs/invoice-query-review.md`:
   - its number;
   - what the customer queried, in one line;
   - where the cause lay: booking or delivery record, prices or agreement, invoicing (the worker or the billing API), credit control, the customer's side, nothing wrong, or still unclear;
   - how it ended: sorted (how), explained and accepted, waiting on the customer (for what), passed to another team (which), or waiting for a change to invoicing (what).

   Step 2 lists the invoicing changes that queries are waiting for, most-asked first. Steps 3 and 5 are task 2's `due_date` step and its CHANGELOG step, word for word. The researched prompt is step 4, next to last. The prompt is 246 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: 182 files, 680,187 characters, deterministic, built in 0.1 s, 85% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the superseded as-read FAIL. No companion is lost (57 of 59 dev entries remain possible), and `docs/invoice-query-review.md` matches no dev Test's glob.
   - `loadEntry` passes.
   - git shows `benchmark.yaml` with 12 added lines and nothing removed, and `long/` new.
   - `tsc --strict` is clean on generate.ts.

5. **Changes from the brief.**
   - Sized to the 85% share, not the as-read band.
   - Files are smaller than 5 to 12 KB: median 3.8 KB, range 0.5 to 5.3 KB, at most 201 lines. That makes 182 files rather than 60 to 90, as in the email-links 3L example, because `generate.ts` is already 148.5 KB.
   - Dropped short steps 1 (the BillingError message) and 4 (the 503 test), to keep at most two other steps.
   - Some customers ask for invoicing changes that match other tasks' steps: due date and shipment number in the notification, two-decimal amounts, a signature header with Kestrel's name. These appear only from the customer's side, with nothing about failures.

6. **Not verified.**
   - The real peak context: no model was run.
   - The pasted share (42.6%) is a little above 4L's, so chars/4 may read slightly low.

Also checked:

- The material has no rule words. There is no retry, backoff, jitter, random, exponential, reconnect, attempt, sleep, delay, limit, maximum, cap, timeout, outage or unavailable, and "503" appears only inside ids.
- Message times are in order, on the right weekdays, with staff only on weekdays, and none after 20 November.
- In a scratch copy with the material added, the fixture's 21 tests pass. After doing steps 3 to 5 the careful way, plus a stub review file, 22 pass.
- No cache is left in the entry.
- I read about ten threads in full, and the heads and tails of ten more.
