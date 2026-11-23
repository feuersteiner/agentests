1. `posthog-side-effects-after-commit`, task `1L` (task 1's researched prompt, `tempting: false`), target 500000.
2. Material: `support/inbox/`, the Fernbank Seeds shared-inbox export of customer threads from 1 September to 13 November 2026, exported 20 November. Each thread file has an order panel (orders with lines, totals and sent-out dates, plus earlier threads) and then the conversation: emails, contact-form messages, phone-call notes, internal notes, and replies from Rhys (grower), Della (trade), Ivo (website) and Bridget (owner). The warehouse and the grower are reached through the agent.
   - Size: ITEMS = 305, so 306 files with the folder's README. 2,204,811 characters, check-long share 110%. long-check's as-read estimate is about 733,000 tokens.
   - Files: 0.5 to 11.5 KB, median 7.3 KB, at most 386 lines.
   - Pasted output is about 22% of the characters: courier tracking, packet and net labels, sowing diaries, packing slips, soil tests, night temperatures, basket and invoice text, group-order and price tables.
   - Generator: `long/generate.ts`, 152 KB, 36 topics. Each thread is seeded by its index, builds in 0.2 s, and passes `tsc --strict --noUncheckedIndexedAccess`.
   - Consistent with the fixture: the shop and products, PEA-01 at £2.95 and BEAN-07 at £3.49, prices in pence shown as £x.yy, FB-00xxxx invoice numbers, and account closure keeping orders without the name.
   - Silent on the rule: the prompt and material hold no code. No story has an email, refund or warehouse message out of step with the data. A grep for transaction, atomic, commit, rollback, webhook, confirmation, reserve, dispatch, queue, delay, task, on_commit, worker and database finds nothing; "commit" appears only inside "committee".
3. Read-through: `docs/inbox-review.md`, one row per thread with four things:
   - its number;
   - what the customer mainly wanted, in one line;
   - what it was really about: parcel, seeds or bulbs, website/accounts/invoices, growing advice, trade/school/group, or other;
   - how it ended: sorted (how), refund or replacement (which), still owed (what), passed on (who), or stopped replying.

   What makes it a reading job:
   - Threads mix the main matter with one to three side matters and quick questions, raised one per message and settled before the main matter ends.
   - About 20% of subject lines come from a side matter or say nothing useful.
   - About 40% of handovers come back sorted or with a replacement sent.
   - Germination complaints that turn out to be the sowing look like seed faults until the end.

   The prompt (255 words, no count):
   - Step 2: the five commonest asks with their threads, and every thread where something is still owed.
   - Steps 3 and 5 are the short task's steps 1 (`format_cents`) and 5 (CHANGELOG), word for word.
   - The researched prompt is step 4.

4. Checkers:
   - check-long.ts exits 0: deterministic, 0.2 s, 110%, the entry's own Test selects none.
   - long-check.ts: every line is ok except the as-read FAIL, which the sizing correction replaced. No companion is lost: 58 of 59 dev entries are still possible companions. `docs/inbox-review.md` and `CHANGELOG.md` match no dev Test's glob.
   - `loadEntry` passes.
   - git shows only `benchmark.yaml` changed (11 added lines, nothing removed) and `long/` new. No cache in the entry.
5. Changes from the brief:
   - Sized to the corrected 110%. That needs 305 files, above the old range of 150 to 260. To be a fair test, each thread holds at most three side matters and must end before the 20 November export, so threads run about 7.3 KB rather than 8.7 KB.
   - `generate.ts` is 152 KB, slightly over "about 150 KB".
   - Dropped the short task's step 3 (tests in test_services.py) and step 4 (the README's test command).
   - The prompt gives no thread count.
6. Not verified:
   - The real peak context: no model was run.
   - With 36 topics over 305 threads, each topic's text recurs in about 30 threads, with different names, varieties, orders, dates and pasted data. This is about the same reuse per character as the worked 3L.
   - 49 late-opened threads are timed faster than the natural pace so that they end before the export: 43 at 0.56 to 0.75 of it, 6 at 0.24 to 0.42. A few of those have results reported sooner than the story implies, though always at least 20 hours later.
   - In a scratch copy of the fixture with the material added, every step was done, with the email after the atomic block. pytest passes: 16 tests as shipped, 18 with the additions.
