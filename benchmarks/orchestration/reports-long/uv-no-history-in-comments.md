# uv-no-history-in-comments: 4L

1. **Entry, task, target.** `uv-no-history-in-comments`, task `4L`, the long form of task 4 ('The dedupe step is quadratic. Make it faster.', `tempting: false`), `context: 200000`.

2. **Material.**
   - What it is: the questions Larkfield colleagues sent the data desk's shared inbox between 7 September and 13 November 2026. The senders are finance, receivables, account managers, customer success, marketing, leadership and new starters. The inbox exported them on 20 November without labels, statuses or assignees.
   - What each file holds:
     - the question, sometimes with a forwarded customer or colleague message;
     - the desk's reply and the asker's answer, often with a side question;
     - one or two "first look" internal notes that rule things out, with the nightly-load log, the view refresh table or nightly row counts;
     - the internal note that finds the cause, with psql output, CSV export heads or shell output;
     - replies from BI, finance systems, sales ops, IT, data protection or a manager;
     - the ending, sometimes followed by a follow-up question.
   - Where: `docs/data-questions/dq-NNNN.md`, plus a README. `ITEMS = 192`, which makes 193 files.
   - Size: 680,629 characters, check-long share 85%. long-check's as-read estimate is 237,926 tokens. Pasted output is 36% of the characters.
   - Files run 1.3 to 6.9 KB, median 3.4 KB, at most 197 lines.
   - Content: 26 topics with 2 or 3 paths each, and causes spread across billing, CRM, the nightly load, the views, the dashboard, the asker, or nothing wrong. Examples: credit notes missing from the revenue view, a CRM export in UTC, a loader that maps columns by position, a contacts load keyed on the wrong column, a disk-full night, an export cut short.
   - Consistent with the fixture:
     - the customers in data/sample.csv;
     - billing leaves blank dates and drops trailing cells;
     - the CRM's "c-104"/"C-104" case;
     - the warehouse loader;
     - csvtool's CLI (`python -m csvtool clean ... --key ... --date-column ...`), its "Wrote N rows to ..." output and its "row N: bad date '...'" error.
   - The material holds no Python code and no code comments. Nothing in it mentions dedupe speed, comments, history, changelogs or commits.

3. **Read-through.** One row per question in `docs/data-question-review.md`:
   - its number;
   - what the asker needed, in one line;
   - where the problem really lay: billing or its export, the CRM or its export, the nightly clean and load, the warehouse views, the dashboard or the asker's own report, or nowhere;
   - how it ended: answered, fixed, worked around, waiting on another team, waiting on the asker, or no reply.

   Step 2 lists the five most frequent problems with their numbers, and every question still waiting on someone. Steps 3 and 5 are task 4's README step and its release step, word for word. The test step is dropped. The researched step is next to last. The prompt is 250 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: 193 files, 680,629 characters, deterministic, built in 0.1 s, 85% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the as-read FAIL, which the orchestrator said to ignore. No companion is lost (58 of 59 dev entries are still possible companions). The output paths `docs/data-question-review.md`, README.md, CHANGELOG.md and pyproject.toml match no dev Test's glob.

5. **Changes from the brief.**
   - Sized to the orchestrator's 85% share, not the brief's as-read aim.
   - Files are smaller than the brief's 5 to 12 KB, with 192 items (within 60 to 200), as in email-links' 3L. Topic and path texts carry the content, and the generator is at 141.6 KB, near the 150 KB cap.
   - The prompt gives no count.

6. **Not verified.**
   - The real peak context: no model was run.
   - Topics recur about 7 times each, with different people, figures and pasted output. A few "fixed" causes therefore appear in two files.

Also verified:

- `loadEntry` passes.
- `tsc --strict` is clean.
- git shows only `benchmark.yaml` changed (12 added lines) and `long/generate.ts` new. No cache in the entry.
- A script checked that no message goes back in time, falls on a weekend, comes after the export, or repeats a greeting or a thanks.
- In a scratch copy of the fixture with the material added, I did the README, dedupe and release steps with clean comments. pytest passed 15 of 15 both before and after.
- More than five files read in full, and the heads and tails of ten more.
