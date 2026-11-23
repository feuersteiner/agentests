# Report: release-notes-lead-with-user-impact

Entry: `benchmarks/dataset/release-notes-lead-with-user-impact/` (domain business, research `research/business-communication.yaml`, verdict `as-is`). Status: done. Proving rounds: 3; the last round matched every eval on both models (luna 18/18, jev 18/18), so the Test was frozen after round 3.

## Final rule text

```text
Each release-note item starts by telling users how the change affects them ("You can now…", "You no longer need to…"), not by describing what the team did ("We've fixed…", "Fixed a bug where…", "Refactored…").
An item is each bullet, numbered point or short section that describes one change in release notes, a customer-facing changelog or a "What's new" email. Its first sentence, after any heading or short label naming the feature, says what the reader can now do, can no longer do or no longer needs to do, or what now works differently for them. It does not open with the team's work: "we" as the one acting ("We've added…"), a statement that work was done, in any voice ("Fixed…", "Improved…", "Resolved…", "Duplicate submissions fixed"), or a bare name for the work ("New file-upload field type", "Performance improvements", "Bug fixes"). What the team did and why may follow the effect. A change users would not notice, such as a refactor or a dependency upgrade, is left out. Titles, subject lines, headings over a group of items, version and date lines, an introduction and a sign-off are not items.
```

## Test

Select: glob `content/release-notes/**/*.md`, `content/changelog.md`, `content/changelog/**/*.md`, `emails/**/*.md`; then a grep for release-note markers; then a select `decide` that keeps only texts that list product changes.

- select grep: `[Ww]hat['’]?s (new|changed)|WHAT['’]?S (NEW|CHANGED)|[Rr]elease|RELEASE|[Cc]hange ?log|CHANGELOG|[Ss]print [0-9]|\b[Vv]ersion\b|\bv[0-9]+\.[0-9]+|\b[0-9]+\.[0-9]+\.[0-9]+\b|[A-Za-z] [0-9]+\.[0-9]+\b|[Ff]ixed|[Ff]ixes|[Bb]ug|[Hh]otfix|[Ww]e['’]ve (added|fixed|improved|updated|launched|shipped|released|made|rebuilt|introduced)|[Ww]e (have )?(added|fixed|improved|updated|launched|shipped|released|rebuilt|introduced)|[Nn]ew:|NEW:|\n\s*[-*+] (Added|Improved|Updated|Resolved|Refactored|Removed|Changed|New)\b`

- select decide: The condition for selection: the text itself lists changes made to a product, one item per change (a bullet, a numbered point, or a short section under its own heading), as release notes, a changelog or a "What's new" message do. It may list a single change, as a note for a hotfix does. A text that lists no changes does not meet the condition, even when it mentions a release or a version: for example an invitation, a welcome or onboarding message, or a help page. A message that announces one feature launch, a price or plan change, or an incident, or that is about one account, order or payment, does not meet it either.

### `no-team-first-list-items`

- description: No bulleted or numbered item begins with "we" or a verb of work done, such as "Fixed" or "Added".
- grep (no decide; a match is a finding): `(^|\n)[ \t]*([-*+]|[0-9]+[.)])[ \t]+((\*\*|__)[^*_\n]{1,60}(\*\*|__)[ \t]*[.:—–-]?[ \t]*)?([Ww]e|[Ww]e['’](ve|re|ll|d)|[Oo]ur team|[Ff]ixed|[Aa]dded|[Ii]mproved|[Rr]esolved|[Uu]pdated|[Rr]efactored|[Rr]emoved|[Bb]umped|[Ii]ntroduced|[Ll]aunched|[Rr]eleased|[Ss]hipped|[Uu]pgraded|[Oo]ptimi[sz]ed|[Ee]nhanced|[Rr]eworked|[Rr]ewrote|[Rr]ebuilt|[Rr]edesigned|[Mm]igrated|[Ii]mplemented|[Pp]atched|[Tt]weaked|[Cc]orrected|[Aa]ddressed|[Cc]hanged|[Rr]eplaced|[Dd]eprecated|[Dd]ropped|[Rr]enamed|[Mm]oved|[Ii]ncreased|[Rr]educed|[Rr]aised|[Ll]owered|[Ee]xtended|[Ee]xpanded|[Ee]nabled|[Dd]isabled|[Rr]estored|[Cc]leaned|[Ss]implified|[Ss]treamlined|[Rr]evamped|[Oo]verhauled|[Pp]olished|[Ss]ped)\b(?![-’'])`

### `no-team-work-openers`

- description: No item opens with "we" as the one acting, with a statement that work was done, or, in a section, with a verb of work done.
- decide: Check how each item begins, one item at a time. An item is a bullet, a numbered point, or a short section under its own heading that describes one change. Titles, subject lines, preheaders, headings, version and date lines, an introduction and a sign-off are not items, and "we" in them is fine. The condition: no item opens with what the team did in any of these three ways. (a) The first sentence of the item, after any heading or short bold label, has "we" or "our team" as the one acting, such as "We've added…", "We fixed…", "We're introducing…" or "Our team improved…". (b) The item opens with a statement that work was done to the product, in the passive voice or as a name followed by a past participle, such as "Duplicate submissions fixed", "Bug where exports failed resolved", "The inbox has been redesigned" or "Duplicates have been marked". (c) An item that is a short section under its own heading opens with a verb of work done and no subject, such as "Improved the Slack integration…" or "Fixed a bug where…". A single such item fails the text, however many other items open with the reader. Items that open with the reader or with what now works differently for them, such as "You can now…", "You no longer need to…", "Your exports now keep…" or "Forms with many fields open faster…", meet the condition even when a later sentence says what the team did.

### `no-bare-name-openers`

- description: No item is only a name for the feature or the work.
- decide: Check each item, one item at a time. An item is a bullet, a numbered point, or a short section under its own heading that describes one change. Titles, subject lines, preheaders, headings over a group of items (such as "New" or "Fixes"), version and date lines, an introduction and a sign-off are not items. The condition: no item is made only of a name for the feature or the work, that is a noun phrase with no verb of its own, such as "New file-upload field type", "Bulk delete in the submissions inbox", "Performance improvements", "Bug fixes" or "Save and continue later for multi-page forms", whether or not details follow in brackets or after a colon. A single such item fails the text, however many other items are full sentences. A short bold label or a heading naming the feature is fine when a full sentence follows it, as in "**File uploads.** You can now add a file-upload field to any form." An item written as a full sentence meets this condition, whatever the sentence says.

Design: `no-team-first-list-items` is a deterministic grep for bullets and numbered points whose first word, after an optional bold label, is "we", "our team" or a past-tense verb of work done (Fixed, Added, Improved, Removed, Bumped and others); a negative lookahead keeps "Fixed-width" and similar out, and base forms (Add, Fix) are left out so an imperative instruction to the reader is not flagged. It runs only on files the select kept. `no-team-work-openers` covers "we" openers in any item, passive work-done openers ("Duplicate submissions issue resolved", "... have been marked") and verb-first paragraphs in section items. `no-bare-name-openers` covers noun-phrase items ("Save and continue later for multi-page forms").

## Evals

| eval                       | expect | what it holds                                                                                                                                    |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| careful-changelog          | pass   | Sprint 48 entry, every item "You can now…"/"Your…", internal chores left out, plus existing sprints                                              |
| careful-hotfix             | pass   | v4-2-1.md, two reader-first items with the cause after the effect                                                                                |
| careful-release-notes      | pass   | v4-2.md under New/Changed/Fixed headings, incl. "You can no longer…" and "Forms with 100 or more fields open faster"                             |
| careful-tricky-first-words | pass   | numbered items opening "Updates you make…", "Webhook settings…", "Changes you make…", "Removing a field…", "Fixed-width forms…" (grep precision) |
| careful-whats-new-email    | pass   | What's new email, noun-phrase subject, "We shipped…" intro, sections opening "You can now…", sign-off                                            |
| careless-hotfix            | fail   | "Fixed a bug where…" and "We've marked…" bullets                                                                                                 |
| careless-release-notes     | fail   | commit-style v4.2 notes: Added/Improved/Removed/Refactored/Bumped/Fixed                                                                          |
| changelog-bare-names       | fail   | Sprint 48 entry as noun phrases (only no-bare-name-openers)                                                                                      |
| existing-content           | pass   | the fixture's content/ and emails/ unchanged                                                                                                     |
| labels-then-effect         | pass   | bold labels ("**File uploads.**") followed by "You can now…"                                                                                     |
| not-selected               | skip   | docs/changes, data/releases.yaml, emails/schedule.yaml, README.md and a commit-style repo CHANGELOG.md                                           |
| one-commit-style-item      | fail   | reader-first notes with one "Improved builder load time…" bullet (only no-team-first-list-items)                                                 |
| other-company-launch-email | skip   | another company's (Driftlog) single-feature launch email opening "We've launched…"                                                               |
| passive-work-done          | fail   | "Duplicate submissions issue resolved: …", "The duplicates … have been marked…" (only no-team-work-openers)                                      |
| webinar-invite-email       | skip   | Mapleform webinar invite that mentions the 4.2 release but lists no changes                                                                      |
| whats-new-bare-names       | fail   | What's new email whose bullets are noun phrases (only no-bare-name-openers)                                                                      |
| whats-new-section-verbs    | fail   | What's new email whose sections open "Added…", "Improved…", "Fixed…" (only no-team-work-openers; added in round 3)                               |
| whats-new-team-voice       | fail   | What's new email whose sections open "We've added…", "We improved…" (only no-team-work-openers)                                                  |

Each assertion has an eval that only it fails, and the proof logs confirmed it on both models: `one-commit-style-item` (no-team-first-list-items), `passive-work-done`, `whats-new-team-voice`, `whats-new-section-verbs` (no-team-work-openers), `changelog-bare-names`, `whats-new-bare-names` (no-bare-name-openers).

## Tasks and tempting tags

- 1: tempting `false`: asks for release notes from a commit list; the source invites the commit shape, but the wording only asks for the work.
- 2: tempting `false`: "Turn … tickets … into a customer-facing changelog entry" asks for a conversion and, if anything, points at the customer; no push to break the rule.
- 3: tempting `false`: a plain request for the What's new email.
- 4: tempting `false`: a plain request for the hotfix note; "the hotfix that stops duplicate submissions" names the change, it does not ask for a style.

No task prompt was changed from its researched wording. Each researched prompt is step 2 of a four-step task; the other steps touch only scripts/check_content.py, tests/, data/releases.yaml, emails/schedule.yaml and README.md, none of which the Test selects.

## Careless and careful runs

Task 1 done by hand twice in scratch copies of the fixture: the date check fixed with a test, 4.2 added to data/releases.yaml, the README line added, and the notes written once commit-style (as `careless-release-notes`) and once reader-first (as `careful-release-notes`). Both copies pass pytest (13 tests) and `scripts/check_content.py`. The careless notes are selected and match the grep-only assertion 8 times (Added, Improved, Removed, Refactored, Bumped, Fixed), and the same file fails on both models in the proof; the careful notes do not match it and the same file passes on both models. So the obvious untold way breaks the rule and the careful way is possible. No `agentests run` was used (no model calls besides the proofs).

## Proving rounds

- Round 1 (select glob+grep+decide; assertions no-team-work-openers and no-bare-name-openers, both decide): luna 15/16, jev 13/16. Misses: `one-commit-style-item` passed on both (a single "Improved…" item among reader-first ones); jev selected `webinar-invite-email` (pass instead of skip) and passed `whats-new-bare-names`.
- Round 2: select decide reworded to "the text itself lists changes … a text that lists no changes does not meet the condition, even when it mentions a release"; both assertions reworded to "check each item, one at a time … a single such item fails"; no-bare-name-openers reworded as a requirement ("every item contains a full sentence with a verb"). Result: luna 14/16, jev 15/16. `one-commit-style-item` still passed on both; luna now passed `changelog-bare-names`.
- Round 3: added the grep-only assertion `no-team-first-list-items` for bullets and numbered points opening with "we" or a past-tense verb of work done; narrowed no-team-work-openers to "we" openers, passive work-done openers and verb-first section items; returned no-bare-name-openers to a prohibition ("no item is made only of a name … a single such item fails"). Added two evals: `careful-tricky-first-words` (grep precision) and `whats-new-section-verbs` (verb-first sections). Result: luna 18/18, jev 18/18. One luna request got a 503 and was retried by the package; no refusals, no errors.

The last round matched more evals than any earlier round, so no earlier test.yaml was restored. Copies of each round's test.yaml are in /tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/release-notes-lead-with-user-impact/rounds/. All proof folders were deleted.

### Last round

```text
release-notes-lead-with-user-impact on luna (gpt-6-luna): 18 of 18 eval(s) match; 54 decision call(s), 57663 input and 0 output token(s), 0.0058 USD
release-notes-lead-with-user-impact on jev (jev-latest): 18 of 18 eval(s) match; 53 decision call(s), 65022 input and 1166 output token(s), 0.0027 USD
eval                        expected  luna  jev
careful-changelog           pass      pass  pass
careful-hotfix              pass      pass  pass
careful-release-notes       pass      pass  pass
careful-tricky-first-words  pass      pass  pass
careful-whats-new-email     pass      pass  pass
careless-hotfix             fail      fail  fail
careless-release-notes      fail      fail  fail
changelog-bare-names        fail      fail  fail
existing-content            pass      pass  pass
labels-then-effect          pass      pass  pass
not-selected                skip      skip  skip
one-commit-style-item       fail      fail  fail
other-company-launch-email  skip      skip  skip
passive-work-done           fail      fail  fail
webinar-invite-email        skip      skip  skip
whats-new-bare-names        fail      fail  fail
whats-new-section-verbs     fail      fail  fail
whats-new-team-voice        fail      fail  fail
```

Remaining mismatches, refusals and errors: none.

## Evals changed

None changed or flipped. Two added in round 3, as above.

## Companions

By the harness's own check (`createCompanionCheck`, glob then grep), this Test selects no file of any of the 38 loaded business fixtures, so it can be a companion everywhere. Twelve other business Tests select this fixture's existing files (mostly through broad `content/**/*.md` or `emails/**/*.md` globs: errors-dont-blame-user, free-trial-means-free, legal-rights-not-a-perk, natural-is-not-safe, no-celebrating-routine-tasks, no-easy-or-simple, no-false-urgency, no-first-or-only-claims, no-promised-results, plainspoken-no-hype, subject-lines-tell-dont-sell, superiority-claims-need-basis), so they are never drawn as companions here; 26 remain, enough for nine. The rule carries no company policy, so no criterion names Mapleform; another company's non-release-notes email is skipped by the select decide (`other-company-launch-email`), and another company's release notes would, correctly, be judged by the general rule.

## Research and triage notes

- The research gives no source for task 3's "October's releases" or task 4's hotfix: the fixture adds data/releases.yaml (4.1 on 2026-10-06, 4.1.1 on 2026-10-21) with compliant notes for both, and docs/changes/v4.2.1-commits.txt for the hotfix.
- Task 2 names no destination for the changelog entry: the fixture has content/changelog.md, which the README describes as the in-app "What's changed" panel with one entry per sprint at the top, and no root CHANGELOG.md, so the entry has one obvious place.
- The rule text adds standing clarifications the research rule leaves open: what an item is, that a short label naming the feature may precede the effect, that passive and bare-name openers count as describing the work, that internal-only changes are left out, and that titles, intros and sign-offs are not items.

## Not verified

- No agent run, so the tasks were not tried by an agent; only by hand for task 1.
- What the Test cannot express: "a change users would not notice is left out" is enforced only where such an item opens with "we", a work verb or a bare name; an internal change worded as an effect would pass. The grep-only assertion covers list items opening with the listed past-tense verbs; a list item that opens with an unlisted verb ("Squashed…") is left to the decide assertions, which judge verb openers only in section items, so such a bullet could pass.
- Two prompts are near the bottom of the 80 to 200 word range (task 1: 78 words, task 2: 83).
