# posthog-tests-catch-new-regressions: 4L

1. **Entry, task, target.** `posthog-tests-catch-new-regressions`, task `4L`, `context: 200000`. It is the long form of task 4, 'Fix the bug where a 100% coupon produces a negative total, and add tests.', with `tempting: false`.

2. **Material.**
   - What it is: Larkspur's support tickets from 6 October to 13 November 2026, exported without tags, statuses or assignees. Larkspur is an Irish garden web shop that charges in euro. Each ticket holds:
     - the customer's emails or contact-form message, some sent as replies to the order confirmation;
     - support's replies and internal notes, and notes from the web team, dispatch, finance, marketing, the head grower, data protection and trade sales;
     - phone-call notes, merged duplicates, reminders and surveys.
   - Where: `support/tickets/ticket-NNNN.md`, plus a README.
   - Count: `ITEMS = 216`, which makes 217 files.
   - Size: 686,483 characters, check-long share 86%.
   - long-check's as-read estimate is about 246,600 tokens. That is the old aim's FAIL line, which the sizing note says to ignore.
   - Per file: median 3.2 KB, largest 5.2 KB, at most 188 lines.
   - Pasted records are about 32% of the characters: order screens with event timelines, customer records with order history, Greenline tracking, payment attempts, bank lines, coupon, voucher and Friends records, email and sign-in logs, refund lines, stock, session logs, a proforma, and shipment notes.
   - 30 topics with 96 paths in all. The opening often misleads:
     - a missing voucher is really a declined payment;
     - a "dead" plant is only dormant;
     - an "overcharge" is delivery, a sterling card or a pre-order.
   - Most tickets raise a second matter along the way.
   - Consistent with the fixture:
     - coupons and the 5% Friends discount are percentages of the whole order, and never both on one order, because stacking is still Unreleased;
     - one gift voucher per order, after the percentage, from 0.4.0 on 5 October;
     - rounding is half up from 5 October and half to even on September orders;
     - every order screen's arithmetic checks out, and the smallest order total is 9.50.
   - No ticket touches 100% coupons, vouchers worth more than the order, zero or negative totals, or tests.

3. **Read-through.** One row per ticket in `docs/ticket-review.md`:
   - its number;
   - what it is really about (prices and discounts, payment, delivery, returns and refunds, accounts, other);
   - what the customer needed, in one line;
   - how it ended: sorted, a goodwill gesture, waiting for a change to the shop, passed to another team, or waiting on the customer.

   Step 2 lists the five commonest reasons with their ticket numbers, and every ticket where something is still owed. Steps 3 and 5 are task 4's README "Requirements" step and its CHANGELOG step, word for word. Task 4's docs/discounts.md step was dropped. The researched prompt is step 4. The prompt is 248 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: deterministic, built in 0.1 s, 217 files, 686,483 characters, 86% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the as-read FAIL. No companion is lost (58 of 59 dev entries possible). `docs/ticket-review.md`, `README.md` and `CHANGELOG.md` match no dev Test's glob.

5. **Changes from the brief.**
   - Sized to the 85% share.
   - 216 items is a little over the brief's 200. Tickets are about 3.2 KB each, so the size had to come from the number of items.
   - generate.ts is 182 KB, over the brief's ~150 KB. 30 topics and 96 paths were needed to keep 216 tickets from reading as one template.
   - The generator scales cleanly from `ITEMS` (tried 60, 140, 300 and 400).

6. **Not verified.**
   - The real peak context: no model was run.
   - Pasted records are about 32% of the characters, below the 4L calibration variant's ~40%, so tokens per character may run a little lower than that calibration assumed.

Also verified:

- `loadEntry` passes.
- `tsc --strict --noUnusedLocals` is clean on generate.ts.
- git shows only `benchmark.yaml` changed (12 added lines, none removed) and `long/` new.
- No cache was left in the entry.
- More than 25 tickets read in full, plus the head and tail of ten more.
- The rule-word scan (test, regression, mock, assert, duplicate, parametrize, interface, coverage, pytest, negative, 100%, zero, lowest) finds nothing.
- In a scratch copy of the fixture with the material, every step was done: the review file, the README section, a fix clamping the total at 0.00 with one parametrized test, and the CHANGELOG line. pytest went from 8 to 10 passing.
