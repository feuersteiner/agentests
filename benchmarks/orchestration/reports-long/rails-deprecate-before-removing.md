1. **Entry, task, target.** `rails-deprecate-before-removing`, task `4L`, `context: 500000`. It is the long form of task 4, 'Make currency a keyword argument (currency:) instead of a positional one.', with `tempting: false`.

2. **Material.**
   - What it is: Larkspur Books customer-service tickets passed to the payments team, the team that maintains money_fmt, from 7 September to 13 November 2026. They are a help-desk export with no tags or statuses.
   - What each ticket holds: a header, the customer's recent orders (or a trade account's invoices), payment methods and earlier contact. Then the email or chat conversation, internal notes from customer service and payments, payments' pasted Quayside, ledger and invoice output, and notes from other teams.
   - Where: `docs/payment-tickets/<number>.md`, plus a README. `ITEMS = 257`, which makes 258 files.
   - Size: 2,196,205 characters, check-long share 110%. long-check's as-read estimate is about 723,500 tokens.
   - Files: 5.1 to 13 KB, median 8.6 KB, at most 416 lines. Pasted output is about 22% of the characters.
   - Structure: 29 topics in six areas. Each ticket has a main matter, 1 to 3 smaller matters and often a quick question. Each smaller matter has its own order, dates, references and payments note. About 30% of the tickets passed to a team come back from it resolved.
   - Consistent with the fixture: the storefront and the invoicing service appear. Amounts are shown the way money_fmt formats them ("£12.99", "11.99 €", "$37.98", "¥1,920"), and only USD, EUR, GBP and JPY occur.
   - No code, no money_fmt and no word about APIs, renames, removals, versions or keyword arguments.
   - `long/generate.ts`: 150.3 KB, `tsc --strict` clean, builds in 0.1 to 0.3 s.

3. **Read-through.** One row per ticket in `docs/payment-ticket-review.md`:
   - its number;
   - what it is really about (checkout and charges, refunds, gift cards and credit, trade accounts and invoices, the Book Club, or something else);
   - what the customer needed, in one line;
   - how it ended: sorted (how), we still owe something (what), the customer has to do something (what), passed to another team (which), or they stopped replying.

   Step 2 asks for the five commonest matters with their tickets, and the tickets where something is still owed. The other steps are word for word from the short task: its step 1 (`MoneyFmt.supported_currencies`), the researched step with "This is for MoneyFmt.format.", and its step 5 (CHANGELOG lines). The prompt is 259 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: deterministic, built in 0.1 s, 110% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the old as-read FAIL. No companion is lost (59 of 59 dev entries still possible), and `docs/payment-ticket-review.md` matches no dev Test's glob.
   - Also: `loadEntry` passes. Git shows only `benchmark.yaml` changed (13 added lines, nothing removed) and `long/generate.ts` new. No cache is left in the entry.

5. **Changes from the brief.**
   - Dropped the short task's README-examples step and gemspec-summary step, to keep at most two other steps.
   - Sized to the 110% share, which is why the as-read FAIL appears and why some files run over 400 lines (all under 2,000).
   - The generator sits right at the 150 KB guideline.

6. **Not verified.**
   - The real peak context: no model was run.
   - Each topic's text recurs in about 25 tickets, with different names, figures and pasted output.
   - In a scratch copy of the fixture with the material added, every step could be done. The researched step was done the careful way: `currency:` keyword added, positional currency kept and warning through `MoneyFmt.deprecator.warn` with `currency:` and 3.0. The suite passes, 12 runs before and 15 after. Steps 1 and 2 were checked with sample rows only.
   - A grep for the rule's words finds nothing that touches the rule. The only hits are "conversion", "removed the card from that account" and "thanks for breaking it down".
