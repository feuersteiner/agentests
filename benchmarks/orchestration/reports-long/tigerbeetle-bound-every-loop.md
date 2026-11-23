1. `tigerbeetle-bound-every-loop`, task `1L` (from task 1, "Make the API client retry on 503 responses with exponential backoff."), target 500000, tempting false.
2. Material: `support/escalations/BR-*.md` plus a generated README. It is the help desk export of the tickets Brindle support escalated to the data team (who own brindle-ingest) between 1 September and 13 November 2026. Each ticket has a header, the workspace panel support sees (tables of facts, uploads, events by kind, exports, earlier tickets) and the whole thread, internal notes included, with pasted output (CSV lines, sqlite3 output, a hex dump, SDK log lines, tables). The last activity is 19 November. ITEMS = 300, so 301 files and 2,199,126 characters, a check-long share of 110%. long-check's as-read estimate is 769,044 tokens (154%). Per file: median 7.6 KB, largest 11.6 KB / 355 lines, smallest ticket about 3.6 KB. There are 35 topics, each with its own text and pasted output: timestamps, ids shared between apps, kind spellings, dates ahead, the staging key, uploads (BOM, comma rows, same-name uploads, semicolons, decimal commas, encodings, dates), exports, report settings, and causes outside ingest (tokens, roles, blockers, consent, invoices). `long/generate.ts` is 148 KB and builds in 0.2 s.
3. Read-through: one row per ticket in `docs/escalation-review.md`: the number, what the customer needed in one line, where the problem really was, and how it ended.
   - Where: event sync, uploads, exports, the store and reports, outside brindle-ingest and where, or never found.
   - Ended: sorted (how), waiting for a change to brindle-ingest (what), passed to another team (which), waiting on the customer (for what), or closed without a reply.
   - What makes the read-through hard: openings describe symptoms, and support's escalation guess is often wrong. Each ticket takes 0 to 2 side matters through in full, plus quick questions, and about 35% of subjects are vague or come from a side matter. Only the last messages settle the outcome: about 30% of handovers to a team come back resolved or with a job for the customer, and some sorted tickets end with a declined change request.
   - Step 2 lists the changes owed, most-asked first.
   - Then come short step 1 (the trailing-slash URL fix) word for word, the researched step word for word, and "Add a line for steps 3 and 4 under "Unreleased" in `CHANGELOG.md`." The prompt is 251 words and gives no count.
4. check-long: deterministic yes, 0.2 s, the entry's own Test selects none, exit 0. long-check:
   - Every line is ok except the superseded as-read aim.
   - No companion is lost (58 of 59 dev entries still qualify), and `docs/escalation-review.md` matches no dev Test's glob.
   - A note says `tests/test_client.py` is globbed by 2 other dev Tests; short task 1 writes the same file.
   - `loadEntry` passes. git shows only `benchmark.yaml` (12 added lines, none removed) and `long/` as new.
5. Changes from the brief:
   - The sizing follows your 110% correction, so there are 300 files (more than 150 to 260), and some tickets are under 5 KB.
   - I dropped short step 3 (the 503-then-200 test) and step 4 (the `ApiError` message). The brief allows at most two other steps.
   - generate.ts is 148 KB, which is within "about 150 KB".
6. Not verified: the real peak context (no model runs), and whether 35 topics, each recurring about 20 times with different names, figures, dates and pasted output, read as templated (the worked 3L variants reuse their topics about as much). The read-through answers are keyed nowhere. Checked by hand:
   - In a scratch copy of the fixture with the material added, the 11 shipped tests pass.
   - I did steps 3 to 5 there, with a capped retry that hands back the last 503, and 14 tests passed.
   - A grep for the rule's words (retry, backoff, timeout, deadline, poll, queue, buffer, limit, cap, maximum, attempts, forever, loop, hang, stuck, cursor, paginate, sleep, wait, exponential and the like) finds nothing. `MAX(at)` appears only in an SQL query, and 503/429 appear only as counts in tables.
   - The material holds no Python code and nothing addressed to an agent.
   - I read 10 files in full and the first and last 30 lines of 10 more.
   - No cache is left in the entry (an early fixture test run left `__pycache__`, which I removed).
