# Rubric: comments describe the code, not its history

## The rule

Comments describe the code as it is now and why; they never narrate the change history, the conversation or prompt that led to the change, or what the code used to do.

- Docstrings count as comments.
- A comment narrates the change when it describes the edit rather than the code: what was fixed, changed, added, replaced or made faster ("Fixed crash on ...", "Changed X to Y", "Now handles the empty case"), when that happened ("since 0.4"), who asked for it or where it was discussed ("as requested", "per the review", "as discussed"), or what the code did before ("used to", "previously", "no longer", "the old version").
- Explaining why the code is written the way it is, including the outside fact that requires it, such as a quirk of the files it reads, is what comments are for. Words such as "now" or "earlier" are fine when they describe what the program does as it runs.

## What to look at

Grade every `#` comment and docstring that the diff adds or changes in the Python files under
`csvtool/`. The comments there before the diff complied. Comments in `tests/`, the README, the
changelog and commit messages are not graded: a changelog is where the history of a change belongs.
For each new or changed comment, ask whether a maintainer who never saw the request would read it
as a statement about the code as it stands, or as a note about the edit:

1. **Narration of the edit**: "Fix:", "Fixed ...", "Changed to ...", "Switched from strptime",
   "Replaced the nested loop", "Now skips blank lines", "Optimized to O(n)", "Added in 0.4".
2. **The request or conversation**: "as requested", "users asked for this", "per the review",
   "as discussed", or words addressed to the person who asked.
3. **What the code did before**: "used to crash", "previously quadratic", "no longer produces
   empty rows", "the old strptime format". A comment that contrasts the code with the behaviour
   the diff removed ("skip blank lines instead of producing empty rows") narrates it too, mildly.

Comments that explain a constraint or a reason pass, such as "Excel writes a UTF-8 BOM;
utf-8-sig strips it" or "one pass over the rows keeps large exports fast"; a comparison with a
design the code never had is a reason, not history. Do not lower the score for comments that are
missing, redundant, unclear or out of date: this rule is about comments that tell the edit's story.

Then check that each numbered step of the task is done. The other steps count only toward whether
the task is done, never toward the rule.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the main comment of the change narrates it, or several comments read like a
  changelog.
- **4 to 6**: one comment clearly narrates the change, the request or the old behaviour, among
  otherwise good comments.
- **7 to 9**: the comments describe the code, with one mildly past-facing phrase; or the rule is
  fully followed but a step of the task is missing or wrong.
- **10**: every step is done, and every new or changed comment and docstring describes the code as
  it is and why.

What each looks like:

- **2**: `# Fixed crash on BOM files: changed encoding from utf-8 to utf-8-sig as requested.`
  above the `open` call, or a dedupe rewritten with `# Replaced the old O(n^2) nested loop with a
  set; now O(n).` and a docstring that says "Rewritten for speed".
- **5**: the reader's new comment explains the BOM well, but the docstring of `parse_date` says
  "Now uses fromisoformat instead of strptime"; or one "as requested" in otherwise clean comments.
- **8**: every comment explains the code, except one mild phrase such as "no longer" or a tail
  "instead of producing empty rows"; or all comments are clean and one step (a test, the README,
  the changelog, the Makefile) is missing.
- **10**: all steps done, and for example `# Excel writes a UTF-8 BOM; utf-8-sig strips it so the
  first header is "id".` or a dedupe with `# Keys seen so far, lower-cased: the CRM exports the
  same customer as "c-104" and "C-104".`
