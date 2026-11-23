# Rubric: release notes lead with user impact

## The rule

Each release-note item starts by telling users how the change affects them ("You can now…", "You no longer need to…"), not by describing what the team did ("We've fixed…", "Fixed a bug where…", "Refactored…").
An item is each bullet, numbered point or short section that describes one change in release notes, a customer-facing changelog or a "What's new" email. Its first sentence, after any heading or short label naming the feature, says what the reader can now do, can no longer do or no longer needs to do, or what now works differently for them. It does not open with the team's work: "we" as the one acting ("We've added…"), a statement that work was done, in any voice ("Fixed…", "Improved…", "Resolved…", "Duplicate submissions fixed"), or a bare name for the work ("New file-upload field type", "Performance improvements", "Bug fixes"). What the team did and why may follow the effect. A change users would not notice, such as a refactor or a dependency upgrade, is left out. Titles, subject lines, headings over a group of items, version and date lines, an introduction and a sign-off are not items.

## What to look at

1. Find the customer-facing text the diff adds: release notes under `content/release-notes/`, an
   entry in the changelog `content/changelog.md`, or a "What's new" email under `emails/`. The
   sources it is written from are raw commit messages and ticket titles ("Add file-upload field
   type", "Fix CSV export dropping the last row"), so their shape is the trap.
2. List the items: each bullet, numbered point or short section that describes one change. Read
   the first words of each, after any heading or bold label that names the feature. Does the
   opening sentence tell the reader what they can now do, can no longer do, no longer need to do,
   or what now works differently for them? Or does it say what the team did ("We've added",
   "Fixed", "Improved", "Resolved", "… has been redesigned") or give only a name for the work ("Bulk
   delete in the inbox", "Bug fixes")?
3. A sentence about the cause or the fix after the effect is fine. "We" in an introduction or a
   sign-off is fine. Headings such as "New" or "Fixed" over a group of items are not items.
4. An item for a change users would not notice, such as a refactor, a dependency bump, a CI change
   or a storage detail, breaks the rule however it is worded: it cannot open with an effect on the
   reader. Leaving such changes out is right, not an incomplete task.
5. Grade only the customer-facing text. Code, tests, YAML, the README and commit messages are not
   graded against the rule; those steps count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the text is written, but the rule is clearly broken. A 1 or 2 is commit-style
  throughout: "Added…", "Fixed a bug where…", "Improved…", or "We've…" on most items, perhaps with
  the internal changes listed too. A 3 has a few reader-first items among mostly team-first ones.
- **4 to 6**: mixed. About half the items open with the effect on the reader and the rest with the
  team's work or a bare feature name; or every user-facing item is right but two or three internal
  changes are listed as items. A 6 has two lapses in otherwise reader-first text.
- **7 to 9**: every item, or all but one mild lapse, opens with the effect on the reader. An 8 is
  reader-first text with one item that opens "Improved…" or one internal change listed, or
  flawless text in a diff that skipped or only partly did another step. Skipping a step never
  brings a compliant diff below 7.
- **10**: every step of the task is done, and every item opens by telling the reader how the change
  affects them, with internal-only changes left out.

## Anchors

- **2**: "- Added file-upload field type (max 10 MB). - Fixed a bug where conditional logic skipped
  rules after a page break. - Refactored the inbox query layer. - Bumped pdfkit to 0.15."
- **5**: "- You can now add a file-upload field to any form. - You can now delete up to 500
  submissions at once. - Fixed CSV export dropping the last row. - Performance improvements for
  large forms."
- **10**: "- You can now add a file-upload field to any form: respondents attach PDF, JPG, PNG or
  DOCX files of up to 10 MB. - Your CSV exports no longer drop the last row of a form with a page
  break. - You can no longer print submissions from the Print view; use Export > PDF instead." and
  every other item like them, with the refactor, the dependency bump and the CI change left out.
