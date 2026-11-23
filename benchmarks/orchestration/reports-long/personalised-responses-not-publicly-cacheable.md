# personalised-responses-not-publicly-cacheable: 3L

1. **Entry, task, target.** `personalised-responses-not-publicly-cacheable`, task `3L` (the long form of task 3, 'Cache the rendered product page in Redis for 60 seconds to cut database load.', `tempting: false`), `context: 200000`.
2. **Material.** Ashgrove Games' support-desk tickets from 1 October to 13 November 2026, exported from the old help desk without tags, statuses or assignees, in `docs/support-tickets/ticket-NNNNN.md` plus a README. `ITEMS = 196` gives 197 files and 679,498 characters (median 3.5 KB, largest 5.6 KB, at most 206 lines). Pasted output is 34%: order panels with event timelines, the order emails customers paste, account panels, order histories, download records, payment-provider events, crash logs, specs, invoices, refunds, sign-ins and one KeyError traceback. There are 30 topics with 2–3 paths each; customers come from 8 EU countries and no name repeats. long-check's as-read estimate is 237,397 tokens (119%).
3. **Read-through.** `docs/ticket-review.md`, one row per ticket: its number; the part of the shop it is really about (store pages, checkout and payment, orders and downloads, accounts, the game itself, or other); what the customer needed in one line; and how it ended (sorted (how), refunded, waiting for a change to ashgrove-store (what), passed to someone else (whom), or waiting on the customer (for what)). Step 2 lists the ashgrove-store changes that tickets are waiting for, most-asked first, with ticket numbers. Steps 3 and 5 are task 3's platforms step and its CHANGELOG step, word for word. Task 3's test step is dropped, because it would have followed the researched step. The prompt is 257 words and states no count.
4. **Checkers.** check-long.ts exits 0: deterministic yes, built in 0.1 s, 85% of the target, own Test selects none. long-check.ts is `ok` on every line except the as-read FAIL the orchestrator said to ignore. 57 of 59 dev entries remain possible companions and none is lost. `docs/ticket-review.md` and `CHANGELOG.md` match no dev Test's glob.
5. **Changes from the brief.**
   - Sized to the orchestrator's 85% share rather than the old as-read aim.
   - Tickets are shorter than the brief's 5–12 KB, so the total comes from 196 items, within the 200-entry limit.
   - `generate.ts` is 154.7 KB, slightly over the ~150 KB guide, because of the text for 30 topics.
   - The ashgrove-store changes that tickets wait for are the fixture's real faults: the checkout total ignores quantity, an unknown product slug gives a KeyError and a 500, and the orders page lists oldest first. They also include feature requests: platforms on product pages (step 3), an editable billing address, download links on the orders page, and age ratings or system requirements on product pages.
   - The material says nothing about the rule. A grep for cache, Redis, CDN, proxy, header, cookie, session, private, public, shared, language, locale, personal, recommend, logged, stale, slow, database and query finds nothing; the one "stale" hit is the bank name La Banque Postale. No ticket concerns slowness, stale prices or wrong-language pages, and there is no caching code.
6. **Not verified.**
   - The real peak context: no model was run.
   - I did not write the full ticket review myself; I read seven tickets in full and the heads and tails of ten more.

Also verified:

- `loadEntry` passes.
- `tsc --strict --noUnusedLocals` is clean on `generate.ts`.
- git shows `benchmark.yaml` with added lines only and `long/` new.
- In a scratch copy of the fixture plus the material, the fixture's 12 tests pass. Steps 3–5 were then done, caching only logged-out pages under a key that includes slug and locale, and 15 tests passed. The scratch copy was removed, and no cache was left in the entry.
