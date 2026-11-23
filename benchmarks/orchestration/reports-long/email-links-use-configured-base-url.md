# email-links-use-configured-base-url: 3L

1. **Entry, task, target.** `email-links-use-configured-base-url`, task `3L` (the long form of task 3, 'Add email verification on sign-up with a confirmation link.', `tempting: false`), `context: 200000`.

2. **Material.**
   - What it is: Plover Rota's support-desk tickets from 5 October to 13 November 2026, exported without tags or statuses. Each ticket has the customer's emails, support's replies and internal notes, notes from the web, planner and billing teams, reminders and surveys.
   - Where: `docs/support-tickets/ticket-NNNN.md`, plus a README. ITEMS = 185, which makes 186 files.
   - Size: 681,850 characters, check-long share 85%.
   - long-check.ts's as-read estimate is about 243,000 tokens, against its old aim of 145,000 to 165,000. That aim predates the sizing correction.
   - Pasted output is 41% of the characters: account and team lookups, production log extracts, members tables, rota tables, rota settings, payroll CSV, invoices, a security questionnaire.
   - 31 topics with 2 to 4 paths each, over 20 kinds of business. The opening often misleads: two accounts look like a rota problem, a screen-reader problem turns out to be either the sign-up form or the rota grid. Most tickets raise a second matter along the way.
   - Consistent with the fixture:
     - Teams exist only from 15 September (1.3.0).
     - Invitations and admin resets exist only from 29 October (1.4.0), so pending-invitation tickets start on 30 October, and resets before 29 October go through the web team.
     - The 500 on `POST /login` without a password is reported.
     - All dates run from 5 October to 20 November.
   - No word of it touches hosts, links, URLs, staging, domains or verification. The only reset emails mentioned are support's.

3. **Read-through.** One row per ticket in `docs/ticket-review.md`:
   - its number;
   - the area (accounts and sign-in, teams, planner, billing, other);
   - what the customer needed, in one line;
   - how it ended: sorted, a workaround the customer accepted, waiting for a change to plover-web, passed to another team, or waiting on the customer.

   Step 2 lists the plover-web changes that tickets are waiting for, most-asked first. Steps 3 and 5 are task 3's rename step and its version/changelog step, word for word, then "Keep `python3 -m pytest` green." The prompt is 258 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: 186 files, 681,850 characters, deterministic, built in 0.1 s, 85% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the as-read FAIL above. No companion is lost (56 of 59 dev entries possible), and `docs/ticket-review.md` matches no dev Test's glob.

5. **Changes from the brief.**
   - Sized to the coordinator's 85% share, not the brief's as-read aim.
   - Files are smaller than the brief's 5 to 12 KB: median 3.3 KB, range 0.4 to 9.3 KB, at most 169 lines. Tickets are short by nature, and generate.ts is already 143.6 KB, near the 150 KB cap. So the total comes from 185 items, still within the 60 to 200 entries.
   - The prompt gives no count, as the orchestrator asked.

6. **Not verified.**
   - The real peak context: no model was run.
   - The material holds more tables than the 4L calibration variant (41% against about 40%), so chars/4 may sit slightly higher in real tokens than the calibration assumed.

Also verified:

- `loadEntry` passes.
- `tsc --strict` is clean on generate.ts.
- git shows only `benchmark.yaml` changed (additions only) and `long/` new.
- In a scratch copy of the fixture with the material added, every step was done the careful way, verification link from `config.PUBLIC_BASE_URL + url_for(...)` included, and pytest passed: 15 tests before, 16 after.
- More than five tickets read in full, and the heads and tails of ten more.
