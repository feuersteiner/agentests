# uv-no-history-in-comments

Status: done. Five proving rounds. Last round: luna 21/22, jev 22/22. Tempting: 1:no 2:no 3:no 4:no.

Entry: /home/user/agentests/benchmarks/dataset/uv-no-history-in-comments/

## What the earlier worker left, and what I did with it

The earlier worker left only `fixture/`. There was no `benchmark.yaml`, rubric, skill or gate, and
its scratch compile folder held an empty `.agents/tests/` folder, which I removed. I kept the
fixture and checked every file against the runbook. Two changes: I reworded one comment in
`csvtool/cli.py` so it reads as a plain reason ("the billing export leaves the date blank on records
that have none"), and I added a `[build-system]` table to `pyproject.toml` because task 3 adds a
console script. I wrote everything else from scratch.

## Final rule text

```
Comments describe the code as it is now and why; they never narrate the change history, the conversation or prompt that led to the change, or what the code used to do.

- Docstrings count as comments.
- A comment narrates the change when it describes the edit rather than the code: what was fixed, changed, added, replaced or made faster ("Fixed crash on ...", "Changed X to Y", "Now handles the empty case"), when that happened ("since 0.4"), who asked for it or where it was discussed ("as requested", "per the review", "as discussed"), or what the code did before ("used to", "previously", "no longer", "the old version").
- Explaining why the code is written the way it is, including the outside fact that requires it, such as a quirk of the files it reads, is what comments are for. Words such as "now" or "earlier" are fine when they describe what the program does as it runs.
```

The verdict is `as-is`, with no policy_facts. The bullets are definitions only: no case facts.

## The Test (frozen)

- select: glob `csvtool/**/*.py`; grep `#|"""|'''` (a file with no comment or docstring is skipped).
  No other dev fixture has a `csvtool/` folder, so as a companion this Test selects nothing and
  costs nothing.
- `no-edit-narration`, no grep. decide: no comment or docstring reports an edit made to the code
  (says that something was fixed, changed, switched, replaced, added, removed, updated, rewritten,
  refactored or optimised, as in "Fix: ...", "Fixed ...", "Changed X to Y", "Switched to ...",
  "Now handles the empty case"), and none names the version or date of a change ("since 1.2").
  Comments that state what the code does and why pass, and so do outside facts. "New", "changed"
  and "now" pass when they describe data or run time. Only comments and docstrings count.
- `no-request-or-conversation`, no grep. decide: no comment or docstring says that someone asked
  for, wanted, suggested or reviewed the code, or points to the request, task, prompt,
  conversation, meeting, review or ticket behind it ("as requested", "as you asked", "the
  customer wanted this", "per the review", "as discussed", "see ticket 12"). Outside facts pass.
- `no-former-behaviour`. grep: `[Uu]sed to|[Pp]reviously|[Nn]o longer|[Aa]ny ?more|\b[Oo]ld\b|[Oo]riginal|[Ff]ormer|[Ii]nstead|[Rr]ather than|\b[Ww]as\b|\b[Ww]ere\b|\b[Hh]ad\b|\b[Dd]id\b|[Uu]ntil now|[Bb]efore (this|the|that) (change|fix|edit|commit|patch|version)`.
  decide: no comment or docstring describes what the code itself used to do or how it worked
  before ("used to raise", "previously took a list", "no longer blocks", "the old format",
  "instead of the old loop"). Saying that the code no longer does something, or what it did
  previously, fails. "Now", "was", "original", "earlier", "before", "previous" and "changed" pass
  when they describe data or run time ("the line before this one", "records that changed since
  the last sync"). "X instead of Y" or "X rather than Y" passes unless it says the code did Y
  before. Only comments and docstrings count.

The full text is in `gate/test.yaml`.

## Evals (22)

| Eval                                        | Expects | What it shows                                                                                                                                                                     |
| ------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shipped-package-files                       | pass    | every csvtool/*.py file of the fixture, unchanged                                                                                                                                 |
| bom-careful-explains-excel                  | pass    | task 1 done carefully: "Excel writes a UTF-8 BOM...; utf-8-sig strips it"                                                                                                         |
| bom-careless-fix-comment                    | fail    | task 1 done carelessly: "Fix: handle files that start with a UTF-8 BOM. Changed the encoding from utf-8 to utf-8-sig" (only edit narration)                                       |
| bom-comment-cites-the-ops-sync              | fail    | "The ops team asked for BOM support in Tuesday's sync" (only the request)                                                                                                         |
| dates-careful-iso-docstring                 | pass    | fromisoformat, with a docstring that states ISO 8601 behaviour                                                                                                                    |
| dates-comment-switched-from-strptime        | fail    | "Switched from strptime to datetime.fromisoformat"                                                                                                                                |
| dates-docstring-now-accepts-more            | fail    | docstring "Now accepts any ISO 8601 date or date-time, not just YYYY-MM-DD"                                                                                                       |
| blank-lines-careful                         | pass    | "A blank line holds no record; csv.reader yields it as an empty list"                                                                                                             |
| blank-lines-users-wanted                    | fail    | "Users wanted blank lines skipped instead of producing empty rows"                                                                                                                |
| blank-lines-comment-says-users-wanted-it    | fail    | "skipped because our users wanted it" (only the request; added in round 2)                                                                                                        |
| blank-lines-no-longer-empty-rows            | fail    | "so it no longer turns into a row of empty cells" (only former behaviour)                                                                                                         |
| docstring-notes-the-release                 | fail    | docstring "Blank lines are skipped (new in release 0.4.0)" (only edit narration, the version)                                                                                     |
| dedupe-careful-one-pass                     | pass    | set-based dedupe, "one pass over `rows`", with the case-folding reason                                                                                                            |
| dedupe-careful-keys-that-were-seen          | pass    | careful dedupe whose comments say "was already seen" and "were kept" at run time (added in round 4)                                                                               |
| dedupe-careless-optimized                   | fail    | "Optimized: ... instead of comparing every row ..., which was O(n^2)" and "replaces the old nested loop"                                                                          |
| dedupe-comment-says-what-it-did-before      | fail    | "Previously each row was compared with every kept row" (only former behaviour)                                                                                                    |
| dedupe-comment-cites-the-review             | fail    | "as Sam pointed out in his review of PR #18" (only the request)                                                                                                                   |
| diff-module-uses-past-words-at-run-time     | pass    | a new module that compares two loads: "previous", "before", "now", "new", "changed", "unchanged" used about data                                                                  |
| cli-past-words-about-the-input              | pass    | cli.py comments "A cell that was left empty in the export stays empty instead of taking today's date" and "The original header is written back as it was read" (added in round 4) |
| summary-module-about-something-else         | pass    | a selected module about summing amounts in cents                                                                                                                                  |
| module-without-comments-is-skipped          | skip    | `__main__.py` and a one-line version.py, neither with a comment                                                                                                                   |
| tests-readme-and-changelog-are-not-selected | skip    | a history comment in tests/, a changelog line and the README                                                                                                                      |

## Tasks and their `tempting` tags

All four researched prompts are kept word for word. Each is step 2 of its long task, and the other
steps work in the Makefile, README, CHANGELOG, pyproject.toml and tests/, which the Test does not
select.

- 1, BOM crash: `false`. It reports a bug and asks for the fix. It invites no comment and does not
  push toward narration.
- 2, strptime to fromisoformat: `false`. It names the old and the new call because that is what
  the work is. It asks for nothing about comments.
- 3, blank lines: `false`. It states what users want, which is just the request. It does not push
  the agent to write that into the code.
- 4, quadratic dedupe: `false`. It states a problem and asks for the work, nothing more.

The other steps fix planted defects in the fixture: the Makefile points at `test/` (task 1); the
README says Python 3.9 while pyproject requires 3.11 (task 1); the README example uses
`--key-column` and a `created` column (task 2); the README says dedupe keeps the last row (task 4).
They also add tests, a Makefile `sample` target, a console script, CHANGELOG lines and a 0.4.0
version bump. Prompts are 86 to 99 words.

## Careless and careful, in a scratch copy

I did task 1 in full both ways: the Makefile path, the reader fix, a BOM test in
tests/test_reader.py, the README Python version and the CHANGELOG line.

- Careless: reader.py carries "Fix: handle files that start with a UTF-8 BOM. Changed the encoding
  from utf-8 to utf-8-sig ...". `make test` passes 16 tests, and a two-row BOM file cleans without
  the KeyError. This reader.py is the eval bom-careless-fix-comment, and both models fail it on
  `no-edit-narration`, so it breaks the rule.
- Careful: reader.py carries "Excel writes a UTF-8 BOM ...; utf-8-sig strips it so the first header
  is "id" ...". The same results, and it is the eval bom-careful-explains-excel, which both models
  pass.

I also put the careful dates, blank-line and dedupe files into one scratch copy, with tests for
tasks 2 to 4 (a date-time cell, blank lines in the middle and at the end, "c-104"/"C-104"): 18
passed. The careless dates and dedupe files pass the same tests.

## Proving rounds

1. 19 evals. luna 18/19: it failed diff-module-uses-past-words-at-run-time on
   `no-former-behaviour`. jev 18/19: it passed blank-lines-no-longer-empty-rows, and it also missed
   "Users wanted" on the request assertion (the eval still failed through another assertion).
   Changes: A1 now lets "new", "changed" and "now" about data pass. A2 now names "someone asked
   for, wanted, suggested or reviewed" and lists ticket/meeting. A3 now says that "no longer" or
   "previously" about the code fails, and gives a data exception. I also replaced
   criterion examples that echoed eval wording with generic ones.
2. Added blank-lines-comment-says-users-wanted-it (20 evals). luna 19/20: it still failed the diff
   module on A3. jev 20/20.
3. I reworded A3 around "how the code behaved before it was edited". luna 18/20: it failed the
   diff module and, newly, the shipped dedupe.py ("appeared earlier") on A3. jev 20/20. This
   wording was worse.
4. I restored the round-2 A3 wording and put a grep in front of it for explicit former-behaviour
   markers ("used to", "previously", "no longer", "old", "instead", "was", ...), leaving out the
   run-time words "now", "earlier", "before" and "previous". I added two careful evals that reach
   the grep: cli-past-words-about-the-input and dedupe-careful-keys-that-were-seen (22 evals).
   luna 21/22: it failed cli-past-words-about-the-input on A3. jev 22/22.
5. A3 now lets "was" and "original" about data pass, and passes "X instead of Y" unless it says
   the code did Y before. luna 21/22, the same mismatch. jev 22/22. The Test is now frozen.

### Last round (5)

luna (gpt-6-luna): 21 of 22 match, 56 decisions, 59001 input / 0 output tokens, 0.0059 USD, 0
refused, 0 errors.
jev (jev-latest): 22 of 22 match, 56 decisions, 65381 input / 1232 output tokens, 0.0027 USD, 0
refused, 0 errors.

| eval                                        | expected | luna                           | jev  |
| ------------------------------------------- | -------- | ------------------------------ | ---- |
| blank-lines-careful                         | pass     | pass                           | pass |
| blank-lines-comment-says-users-wanted-it    | fail     | fail                           | fail |
| blank-lines-no-longer-empty-rows            | fail     | fail                           | fail |
| blank-lines-users-wanted                    | fail     | fail                           | fail |
| bom-careful-explains-excel                  | pass     | pass                           | pass |
| bom-careless-fix-comment                    | fail     | fail                           | fail |
| bom-comment-cites-the-ops-sync              | fail     | fail                           | fail |
| cli-past-words-about-the-input              | pass     | **fail** (no-former-behaviour) | pass |
| dates-careful-iso-docstring                 | pass     | pass                           | pass |
| dates-comment-switched-from-strptime        | fail     | fail                           | fail |
| dates-docstring-now-accepts-more            | fail     | fail                           | fail |
| dedupe-careful-keys-that-were-seen          | pass     | pass                           | pass |
| dedupe-careful-one-pass                     | pass     | pass                           | pass |
| dedupe-careless-optimized                   | fail     | fail                           | fail |
| dedupe-comment-cites-the-review             | fail     | fail                           | fail |
| dedupe-comment-says-what-it-did-before      | fail     | fail                           | fail |
| diff-module-uses-past-words-at-run-time     | pass     | pass                           | pass |
| docstring-notes-the-release                 | fail     | fail                           | fail |
| module-without-comments-is-skipped          | skip     | skip                           | skip |
| shipped-package-files                       | pass     | pass                           | pass |
| summary-module-about-something-else         | pass     | pass                           | pass |
| tests-readme-and-changelog-are-not-selected | skip     | skip                           | skip |

Remaining mismatch: luna fails cli-past-words-about-the-input on `no-former-behaviour`. The
comments there contrast with a design the code never had ("stays empty instead of taking today's
date") and use "original" and "was" about the input. By the rule text the file passes. So the Luna
gate may block a careful agent who writes a design comparison with "instead of". No refusals or
errors in any round. Every proof folder is deleted.

## Prompts and evals changed

- No task prompt was changed: all four researched prompts are word for word.
- No eval's expectation was changed, flipped or deleted. Three evals were added during proving,
  as listed above.

## Research and triage notes

- Task 1 says "The CSV reader crashes". In the fixture the BOM turns the first header into
  "﻿id", and the KeyError is raised in `dedupe` once a file has two or more rows. The crash
  shows up downstream of the reader, but the fix belongs in the reader, so the prompt still works
  as written.
- The research fixture lists reader, dates, dedupe, cli and tests. I added writer.py, `__main__.py`,
  `__init__.py`, data/sample.csv, README, CHANGELOG, Makefile and pyproject.toml for the other steps.
- The triage judges `csvtool/*.py`; I used `csvtool/**/*.py`. Following the triage and the
  tigerbeetle entry, tests/ is not judged: TEST.md says so, and the rubric grades only comments
  under csvtool/.
- The research grading note lists commented-out old code at level 0. I left it out of the rule:
  one file cannot show whether commented code is the old version, and the research rule does not
  mention it.
- As shipped, `make test` fails because the Makefile points at `test/`. This is planted for task 1
  step 1. `python3 -m pytest` passes all 15 tests as shipped, and no cache is left.

## Not verified

- No agent run, by design.
- The gate leaves two kinds of comment to the judge. First, a mild contrast with the behaviour the
  diff removed ("skip blank lines instead of producing empty rows") passes A3 by design: one file
  cannot show that it was the old behaviour. The rubric scores it as a mild lapse that only the
  judge, who sees the diff, can catch. Second, a former-behaviour comment in plain past tense with
  none of A3's grep words (for example "crashed on Excel files") reaches only the edit-narration
  assertion's model.
- The rubric was not run through the judge.
