# tigerbeetle-units-last-in-names: 4L

1. **Entry, task, target.** `tigerbeetle-units-last-in-names`, task `4L`, the long form of task 4 ('Make the retry backoff configurable: initial delay, multiplier and maximum delay.', `tempting: false`), `context: 200000`.

2. **Material.**
   - What it is: the upload problems reported to desk tools (the team that maintains depot-uploader) between 7 September and 13 November 2026, exported from the old desk tools form without labels or statuses. Most come from Tallowmere photographers; some come from picture editors and one topic from the Depot team. Each report is a thread with:
     - the reporter's messages and pasted terminal output;
     - desk tools' replies;
     - internal notes from desk tools, Depot, IT, network or video;
     - picture-desk nudges, chasers and side questions.
       The last message is on 17 November.
   - Where: `docs/desk-reports/DT-NNNN.md`, plus a README for the folder. `ITEMS = 200`, so 201 files.
   - Size: 681,802 characters, check-long share 85%.
   - Pasted output is 48.7% of characters. It is:
     - Python 3.13 tracebacks, captured by running the fixture against stub servers and moved to macOS paths, so the frames match the fixture line for line;
     - uploader summaries in the fixture's own format;
     - `ls -l` listings, Depot console tables and Depot access-log lines;
     - `networkQuality`, pip, git and PowerShell sessions.
   - Files: median 2.8 KB, largest 14 KB, at most 281 lines.
   - long-check's as-read estimate is 264,267 tokens. That FAILs its old band, which the measured sizing replaced.
   - Content: 34 topics, each with 1 to 3 paths and 1 to 3 endings. Examples:
     - file names with spaces, accents or "&" that the uploader sends unencoded;
     - a missing or rejected token, a pattern matching nothing, a folder passed instead of files;
     - Python 3.9 on an old Mac, certificate errors, captive portals;
     - slow 4G from the van, the evening uplink, laptop sleep;
     - duplicates after a re-run, empty or unreadable card files;
     - Depot's maintenance page, a quota, an incident, form-post content type, previews;
     - Windows, camera counter rollover, captions in .xmp sidecars.
   - The first message usually shows the symptom, not the cause, and the outcome is settled in the last messages.
   - `generate.ts` is 148 KB and seeded per report. It is clean under `tsc --strict --noUncheckedIndexedAccess`.

3. **Read-through.** One row per report in `docs/desk-report-review.md`:
   - its number;
   - where the trouble really lay: the uploader, Depot, the connection, the reporter's machine or setup, or a request for something new;
   - what the reporter needed, in one line;
   - how it ended: sorted, a workaround accepted, waiting for a change to the uploader, passed to another team, or waiting on the reporter.

   Step 2 lists the uploader changes that reports are waiting for, most-asked first. Step 3 is task 4's README fix, word for word. Step 4 is the researched prompt plus "Keep today's behaviour as the default, and add a test…", word for word. Step 5 is task 4's version bump and 0.4.0 changelog, merged into one closing step. The prompt is 258 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: 201 files, 681,802 characters, deterministic, built in 0.1 s, 85% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the as-read FAIL above. No companion is lost (58 of 59 dev entries are possible). `docs/desk-report-review.md`, `README.md`, `CHANGELOG.md` and `pyproject.toml` match no dev Test's glob.
   - The `uploader/*.py` files written by step 4 and the version bump fall under the entry's own glob, as in short task 4.
   - `loadEntry` passes. git shows only `benchmark.yaml` changed (12 added lines, nothing removed) and `long/` new.

5. **Changes from the brief.**
   - ITEMS sits at 200, the brief's top of 60 to 200 entries. Reaching the 85% share took that, because files are smaller than 5 to 12 KB (median 2.8 KB) and `generate.ts` is near the 150 KB cap.
   - So the orchestrator can rescale down freely, but not up, without passing 200 entries.
   - Short steps 3 and 4 are merged into one closing step, as `email-links-use-configured-base-url` 3L did.

6. **Not verified.**
   - The real peak context: no model was run.
   - The material is token-dense: about 3.1 characters a token by est.ts, because of tracebacks with `~^` markers. The chars/4 share may understate its real tokens compared with the calibration material.

Rule silence:

- No report discusses retries, waits between attempts or backoff. The many requested uploader changes cover names, a plain error line, folders, skipping, carrying on, progress, content type, Windows patterns, capture order, sidecars, keychain and initials. None of them is about retries or backoff.
- The rule's words appear only in three places:
  - the fixture's own compliant code lines inside tracebacks (`request_timeout_s`, `timeout=timeout_s`, `file_bytes`, `chunk_bytes`);
  - standard-library frames (`timeout`, `nbytes`, `st_size`);
  - the error name `TimeoutError`.

Scratch run of the steps:

- In a copy of the fixture with the material added, steps 3 to 5 were done the careful way: `retry_delay_ms_initial` and `retry_delay_multiplier` beside `retry_delay_ms_max`, plus a test.
- pytest passed: 8 tests before, 9 after.
- No cache was left in the entry.
- More than ten reports were read in full, and the heads and tails of five more.
