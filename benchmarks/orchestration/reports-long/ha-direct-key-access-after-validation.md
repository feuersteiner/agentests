# ha-direct-key-access-after-validation 1L (500000)

1. Entry `ha-direct-key-access-after-validation`, task `1L`, target 500000. It is the long form of task 1 ('Handle the new invoice.paid webhook: mark the invoice as paid and store the amount and currency.'), with `tempting: false`.
2. **Material.**
   - What it is: the tickets Pennywren's billing desk handled between 1 September and 30 October 2026. The help desk exported them on 13 November, and every message is dated before that.
   - Where: `support/billing-desk/<number>.md`, plus a README that the generator writes. `ITEMS = 331`, which makes 332 files.
   - Size: 2,204,864 characters, a check-long share of 110%. long-check estimates about 726,000 tokens as read.
   - File sizes: median 6.5 KB, smallest ticket 1.4 KB, largest 11.5 KB. The longest file has 424 lines.
   - What a ticket holds:
     - An account panel: plan, seats, payment method, VAT number, billing contacts and owner.
     - Some of these tables: invoices from the billing app, payments in Quillpay, account history, earlier tickets.
     - The email, web-form or chat thread, with internal notes and replies from other teams.
   - Pasted output is about 23% of the characters: statements, mail bounces, Quillpay declines, seat lists, invoice and credit-note text, VAT checks, supplier forms, a phishing email's headers.
   - Topics: 33, in 7 areas. Each ticket has one main topic. It may also carry a quick question (55%) and up to three side matters that are settled inside the thread.
   - Endings: the main matter ends one of five ways. 30% of the tickets that end sorted or with a job for the customer get there through another team. Subject lines are vague or name a side matter about a third of the time.
   - Consistency: each topic lists the account facts it takes for granted, and topics whose facts clash are never combined. A ticket whose conversation would mention its next invoice date after that date has passed is regenerated, deterministically.
3. **Read-through.** One row per ticket in `docs/billing-desk-review.md`:
   - the ticket number;
   - what it was mainly about: invoices and receipts, payments and cards, plans and seats, refunds and credits, cancellations, company and VAT details, or other;
   - what the customer needed, in one line;
   - how it ended: sorted (how), we owe them something (what), they have to do something (what), passed to another team (which), or they stopped replying.

   Step 2 lists the five commonest problems with their tickets, and every ticket where something is still owed. Steps 3 and 5 are short task 1's steps 1 and 4, word for word. The researched prompt is step 4 of 5. The prompt is 256 words and does not give the count.

4. **Checkers.**
   - check-long.ts exits 0: deterministic yes, built in 0.2 s, 110%, and the entry's own Test selects none of the material.
   - long-check.ts: every line is ok except the as-read FAIL, which the sizing correction replaces. No companion is lost (58 of 59 dev entries can still be companions), and `docs/billing-desk-review.md`, README.md and CHANGELOG.md match no dev Test's glob.
   - `loadEntry` passes.
   - Only `benchmark.yaml` (12 added lines, none removed) and `long/` changed. There is no cache in the entry.
   - `tsc --strict --noUncheckedIndexedAccess` is clean on generate.ts.
5. **Changes from the brief.**
   - Sized to the corrected 110%. That needs 331 files rather than 150 to 260, and some files run over 400 lines (all under 2,000).
   - generate.ts is 155 KB, a little over the guide of about 150 KB. It holds 33 topics with four exchanges each, plus the pasted-output builders.
   - Dropped short task 1's step 3 (tests for the new handler), so that the README/CHANGELOG step can close the list.
   - The material holds no code and no payloads. A case-insensitive grep finds none of these words: .get(, default, missing, optional, required, KeyError, valid, schema, fallback, contract, guarantee, index, payload, webhook, event(s), handler, dispatch, duplicate, replay, key(s).
   - Some invoices stay Open after a customer paid by transfer, and finance matches them by hand. This fits the service ignoring invoice.paid today, but nothing says how a handler should work.
6. **Not verified.**
   - The real peak context, because no model was run.
   - The read-through itself: the generator writes no answer key.
   - What I did check: in a scratch copy of the fixture with the material added, I did steps 3 to 5 with direct indexing, and pytest went from 14 to 15 passed.
