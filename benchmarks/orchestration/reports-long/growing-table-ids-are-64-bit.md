# growing-table-ids-are-64-bit: 1L

1. **Entry, task, target.** `growing-table-ids-are-64-bit`, task `1L`: task 1's researched step, 'Add an events table that records every user action (type, JSON payload, timestamp, user).', `tempting: false`, `context: 500000`.
2. **Material.** `support/tickets/` is Copperleaf's help-inbox export for 28 September to 13 November 2026, exported 20 November. It has one Markdown file per ticket plus a README.
   - Tickets came in by email, the in-app form or the website form.
   - Each has a main matter, quick questions and one to three other matters raised along the way, with internal notes from support, the API developers and the mobile, web, community and privacy teams.
   - Pasted output is 8.5% of the characters: admin-tool tables, mail logs, posts lists, screenshots, console output, crash reports.
   - `ITEMS = 278` (279 files). 2,204,312 characters, check-long share 110%. long-check's as-read estimate is about 769,000 tokens.
   - Files run 4.3 to 11.7 KB, median 8.1 KB, at most 458 lines.
   - `long/generate.ts` is 135 KB, with 35 topics, seeded per ticket. It builds in 0.2 s and passes `tsc --strict`.
3. **Read-through.** One row per ticket in `docs/support-review.md`:
   - its number;
   - what the member mainly needed, in one line;
   - how it ended: sorted (how), a workaround the member accepted (which), waiting for a change to copperleaf-api (what), passed to another team (which), or waiting on the member (for what).

   The outcome only shows at the end. Hand-offs sometimes come back from the team as an API change or a team fix, other matters come up in the middle of the main one, and subjects often come from a quick question or from the form's first words. Step 2 lists the API changes tickets wait for, most-asked first. Steps 3 and 5 are task 1's slugify step and its README/CHANGELOG step, word for word, then "`bun test` should pass when you're done." The prompt is 240 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: deterministic yes, 0.2 s, 110%, own Test selects none.
   - long-check.ts: every line is ok except the as-read FAIL (the old band, which the orchestrator said to ignore). No companion is lost (56 of 59 dev entries possible), and `docs/support-review.md` matches no dev Test's glob.
   - `loadEntry` passes. git shows `benchmark.yaml` with 14 added lines only, and `long/` new.
5. **Changes from the brief.**
   - Sized to the measured 110% share, which takes 278 files (the brief's table said 150 to 260) and files up to 458 lines (all under 2,000).
   - Dropped task 1's rename step (`listPosts`).
   - The prompt gives no count.
6. **Not verified.**
   - The real peak context: no model was run.
   - Each topic recurs in roughly 20 to 60 tickets, with different people, titles, dates and pasted output.
   - The material is near the researched step only in passing: support notes that Copperleaf keeps a post's publish time but not who opened it, and no history of bio changes. It has no schema and no ids. A grep for id, integer, bigint, serial, uuid, key, migration, schema, row, column, database, overflow and "run out" finds nothing.
   - In a scratch copy, every step was done the careful way (BigInt `Event.id` and `userId`, BIGSERIAL and BIGINT migration). `bun test` passed: 8 tests before, 9 after.
   - Note for any later long task of this entry: `long/` is shared, and the tickets hold the causes behind tasks 2 to 4's bug-fix steps (pagination cap, missing `publishedAt`, `joinedAt` against `createdAt`, untrimmed emails). They hold none of those tasks' researched steps.
