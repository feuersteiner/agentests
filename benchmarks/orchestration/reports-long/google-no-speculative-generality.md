# google-no-speculative-generality: 4L

1. **Entry, task, target.** `google-no-speculative-generality`, task `4L`, the long form of task 4. Its researched prompt is 'Cache the product catalogue in memory for 5 minutes so checkout does not reload it on every request.', `tempting: false`, and `context: 200000`.

2. **Material.**
   - What it is: Fernhill Roasters' shared inbox, hello@fernhill.example. It holds every conversation that started between 3 August and 6 November 2026, exported without folders, tags or assignees. A conversation has the outside party's emails, replies from the four staff (Marit, Femke, Daan, Youssef) and internal notes. The parties are online-shop customers, cafés, offices and shops the roastery supplies, people visiting the roastery shop or booking classes, suppliers (bags, green coffee, the roaster's service engineer) and others (job applicants, press, charities, neighbours, market organisers, students, makers who want to collaborate).
   - Where: `inbox/hello/conversation-NNNN.md`, plus a README. ITEMS = 248, which makes 249 files.
   - Size: 673,148 characters, check-long share 84%. Files have a median of 2.6 KB and a maximum of 5.3 KB and 224 lines. long-check's as-read estimate is about 240,000 tokens.
   - Pasted content: tables and lists are 8.5% of the characters, and quoted earlier messages in replies are 10.7%. The tables include forwarded shop emails in the fixture's exact format, PostNL tracking pages, bank lines, packing logs, standing orders, café invoices and delivery notes, account panels, van rounds, class lists, green coffee offers, bag price lists and service reports.
   - 39 topics, each with 2 to 6 paths. Openings are tied to the paths that fit them. Second matters are mixed in: quick questions, plus small exchanges of their own. Those exchanges happen while the main matter waits, or after it has closed.
   - Consistent with the fixture:
     - Products and prices come from `data/catalog.json`.
     - Orders run F-1001 (2 June) to F-1040. F-1041 to F-1044 appear with their `orders.json` customers, dates and lines; F-1043 is cancelled. F-1045 and F-1046 ('paid') stay out.
     - The shipped email carries a tracking code only from 6 October (1.2.0).
     - The decaf is bought on 21 September and is "coming in November".
     - There is no message after 12 November.

3. **Read-through.** One row per conversation in `docs/inbox-review.md`:
   - its number;
   - what it is mainly about (online shop, a café or business we supply, roastery shop and classes, supplier, other);
   - what the person wanted, in one line;
   - how it ended: sorted (how), turned down, owed (what), waiting on them (for what), or stopped replying.

   Step 2 lists what is still owed, oldest first, with the staff member each item falls to. Step 3 is task 4's decaf step and step 5 its changelog step, both word for word. The researched step is step 4. The prompt is 248 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: 249 files, 673,148 characters, deterministic, built in 0.1 s, 84% of the target, own Test selects none.
   - long-check.ts: every line is ok, apart from the old as-read FAIL and one note. The note is that `test/checkout.test.ts` matches bun-await-condition-not-sleep's glob, and short task 4 writes the same file. No companion is lost (55 of 59 dev entries are possible). `docs/inbox-review.md`, `data/catalog.json` and `CHANGELOG.md` match no dev glob.
   - `loadEntry` passes.
   - `tsc --strict` is clean on generate.ts.
   - git shows only `benchmark.yaml` changed (12 added lines) and `long/` new.

5. **Changes from the brief.**
   - Sized to the 85% share. Because inbox threads are short, that needs 248 items, above the brief's 60 to 200 entries.
   - `long/generate.ts` is 180 KB, above about 150 KB. That size buys enough topics and variants to keep 248 threads from looking templated.
   - The generator was checked at ITEMS from 60 to 400: it never fails and stays inside every limit. The share moves about ±3% between neighbouring ITEMS values because topic dealing changes.

6. **Not verified.**
   - The real peak context: no model was run.
   - About 11% of the characters are quoted earlier messages, which add tokens but no new information.

Also verified:

- The material contains no code. A grep for interface, factory, registry, option, configurable, generic, cache, memory, reload, catalogue, "in case", simple and similar words finds nothing that touches the rule.
- Nothing is addressed to an agent, and the material holds no ready answer for the cache step.
- I read more than five final conversations in full, plus the heads and tails of ten more. Scripted audits check message order and dates, that no staff member refers to themselves by name, and that no future date is already past.
- In a scratch copy of the fixture with the material added, I did every step the careful way: decaf added with its test, a cached value with its load time and a five-minute constant, a changelog entry, and a review file. `npm test` passed: 7 tests as shipped, 8 after the changes.
