# payment-retry-reuses-idempotency-key: 2L

1. **Entry, task, target.** `payment-retry-reuses-idempotency-key`, task `2L`, the long form of task 2 ('Add a refundPayment function that calls provider.refund, following the same pattern as capturePayment.', `tempting: false`). `context: 500000`.

2. **Material.**
   - What it is: Fernhill Market's Customer Care refund cases, opened 7 September to 13 November 2026 and exported on 20 November without tags or statuses.
   - Each case has a customer panel, earlier orders, the order as the back office shows it, and an order-events table (placed, authorised, packed, collected and captured, delivered). Then the whole conversation: the customer, care, internal notes, the warehouses (Shepton Mallet, Venlo, Edison), makers, and care-lead sign-offs.
   - Where: `docs/refund-cases/case-NNNNN.md`, plus a README the generator writes. `ITEMS = 391`, which makes 392 files.
   - Size: 2,197,281 characters, check-long share 110%. long-check's as-read estimate is about 779,500 tokens.
   - Files run 3.6 to 8.7 KB (median 5.6 KB), at most 297 lines. Pasted output (tables, fences, quoted emails) is 32% of the characters.
   - Topics: 33 refund reasons across six kinds of problem, with 3 to 5 endings each. Openings are often vague or misleading: a "missing" item turns out to be in a second parcel, "gone-off" honey has only crystallised, a bank "overcharge" is an authorisation hold. Some endings flip late: a replacement that also arrives broken becomes a refund.
   - Consistent with the fixture: GBP, EUR and USD only; Japan arrives "in December, with prices in yen"; captures happen at dispatch; the back office states are `captured`; the provider's dashboard is never described.
   - Silent on the rule: no idempotency, keys, retries, timeouts, duplicates, "twice", "again", records, errors or failures. A grep over the material for those words finds 0 lines, and nothing in it shows code or describes how a refund is made.

3. **Read-through.** One row per case in `docs/refund-review.md`:
   - its number;
   - what the request was really about: damaged or faulty, wrong or missing, lost or late, unwanted sent back, pricing or discount, or something else;
   - how it ended: refunded in full, refunded in part (how much), replaced or re-sent, voucher, turned down or withdrawn, or still open (and what is owed).

   Step 2 lists the five commonest reasons with their cases, and every open case. Steps 3 and 5 are task 2's JPY step and its README/CHANGELOG step, word for word. The researched prompt is step 4. Task 2's test step is dropped (at most two other steps). The prompt is 254 words and gives no count.

   Hidden labels (`bun long/generate.ts <dir> --labels`):
   - Kind of problem: damaged 114, wrong 67, lost 63, other 61, unwanted 54, pricing 32.
   - How it ended: refunded in part 102, turned down or withdrawn 99, replaced 68, refunded in full 56, voucher 47, open 19. Open cases are all from 19 October on.

4. **Checkers.**
   - check-long.ts exits 0: 392 files, 2,197,281 characters, deterministic, built in 0.2 s, 110% of the target, own Test selects none.
   - long-check.ts: every line is ok except the as-read FAIL, which predates the sizing correction. No companion is lost (55 of 59 dev entries still possible), and `docs/refund-review.md` matches no dev Test's glob.
   - `loadEntry` passes. `tsc --strict --noUncheckedIndexedAccess` is clean.
   - git shows only `benchmark.yaml` (12 lines added, none removed) and the new `long/generate.ts`.

5. **Changes from the brief.**
   - **ITEMS is 391, above the 150 to 260 files of the brief's table.** Refund correspondence runs about 5.6 KB a case, while the corrected sizing needs 2.2 MB. I added volume only through real case structure, not padding: panels, tracking, pick lists, return receipts, side questions, follow-ups. Lower ITEMS if fewer, longer reads matter more than the exact share.
   - **`generate.ts` is 159 KB, a little over the ~150 KB guidance.** Trimming further would have cost topics.

6. **Not verified.**
   - The real peak context: no model was run.
   - Each topic recurs in about 8 to 23 cases, and the side questions in about 25 to 35. Five files read side by side do not show the template, but a reader of the whole set will meet the same side questions again.
   - In a scratch copy of the fixture with the material added, every step was done the careful way: JPY; a refund record created through the repository whose id is the idempotency key; README and CHANGELOG. `bun test` passed: 8 tests as shipped, 11 after.
