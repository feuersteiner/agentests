# errors-dont-blame-user: entry report

Status: done. Entry at `benchmarks/dataset/errors-dont-blame-user/` (domain business, verdict as-is,
research `research/business-communication.yaml`). Finished from an earlier worker's draft, which
stopped part-way; every file was checked against the runbook, kept, fixed or extended as listed below.

## Final rule text

> Error messages focus on the problem and how to fix it and never blame or judge the user, even when the user caused the error; when the fault is the company's, they say so.
> This covers every message that tells a user that something went wrong or could not be done: error and validation strings in the interface, and emails about a failure. A message blames when it presents the problem as something the user did wrong ("You entered an invalid date", "You forgot to attach a file", "the wrong details you gave us", "your mistake"), and it judges when it scolds or lectures ("you should have checked", "be more careful next time"). Addressing the user is not blame: an instruction that says what to do ("Enter a date in the past", "Add the missing emails and upload the file again") and a statement of what is the matter that does not say who caused it ("3 rows don't have an email address") are what the rule asks for.

From the research `rule` and the source quote; the examples come from `why_fuzzy` and `near_miss`. No case facts, no policy facts (as-is).

## Test (final, frozen `gate/test.yaml`)

Select: `glob: ['locales/**/*.json', 'emails/**/*.md']` (the triage's scope). Only glob, grep, decide; two assertions.

1. `no-blame`
   - grep: `\b[Yy]ou|YOU|\b[Uu]ser`
   - decide: 'No error message in the text, that is, no error or validation message that tells the user that something went wrong, is not valid or could not be done, has a sentence whose subject is "you" or "the user", whose verb is something the user did, such as entered, typed, uploaded, chose, gave, left, forgot, deleted, tried or failed to, and which says that they did it wrongly or incorrectly, or that what they did was wrong, invalid, incomplete or the cause of the problem, as in "You entered an invalid date", "You forgot to attach a file", "You uploaded a file with missing emails", "because you chose the wrong account" or "the wrong details you gave us"; and no error message calls anything "your mistake" or "your error". Check each message on its own, including every validation message of a form field: one such sentence fails the text, even when its message then says how to fix it and every other message is fine. These are not blame: an instruction ("Enter a date in the past", "Check the sort code and try again"); a statement about a value, a file, a field or the system that does not say what the user did, however short or technical it is ("This date is not valid", "3 rows in your file do not have an email address", "ERR_TIMEOUT: no response after 30 s"); a requirement or a permission the user needs; and any text that is not an error message, such as a label, a help line or a confirmation. A text with no error message meets this.'
2. `no-scolding` (unchanged from the draft)
   - grep: `[Cc]areful|[Cc]areless|[Aa]ttention|[Ss]hould|[Nn]ext time|[Ii]n (the )?future|[Mm]ake sure|[Ee]nsure|[Dd]ouble[- ]check|[Rr]emember|[Aa]lways|[Pp]roperly|[Cc]orrectly|[Ss]loppy|[Ss]illy|[Oo]bvious|[Ii]nstructions|[Ss]upposed|[Aa]gain|[Ll]earn|[Aa]s (stated|instructed|explained|required)|[Ff]ault|[Bb]lame|[Rr]esponsib|[Ww]arn|[Aa]void|[Bb]efore (you )?\w+ing`
   - decide: 'No message in the text that tells a user that something went wrong or could not be done scolds or lectures the user, for example by telling them to be more careful or to pay attention, by saying what they should have done, checked or known, by telling them to do better next time, or by calling what they did careless or silly. A plain instruction for fixing the problem, such as "Check the sort code and try again" or "Make sure the file is a .csv file", is not scolding. A text that holds no message about something that went wrong meets this.'

## Evals (19) and expectations

| Eval                                                         | Expect      | What it shows                                                                                                               |
| ------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| fixture-files-unchanged                                      | pass        | the fixture's three selected files as shipped (incl. the too-technical signup strings)                                      |
| careful-import-errors / careless-import-errors               | pass / fail | task 1 done carefully / with "You uploaded…", "You left…", "Check your data before importing"                               |
| careful-signup-rewrite / careless-signup-rewrite             | pass / fail | task 2 carefully / "You entered…", "You forgot to…", "You typed … incorrectly"                                              |
| careful-payroll-failed-email / careless-payroll-failed-email | pass / fail | task 3 carefully / subject and body blame the employer ("because you entered the wrong sort code", "fix your mistake")      |
| careful-tax-code-errors / careless-tax-code-errors           | pass / fail | task 4 carefully / "You didn't…", "You entered an invalid…"                                                                 |
| developer-notes-copied-into-messages                         | fail        | engineering notes pasted in, third person ("The user left the email cell empty…"); only `no-blame` (added in round 3)       |
| one-blaming-string-among-good                                | fail        | one blaming validation string among good ones; only `no-blame`                                                              |
| stated-mistake-without-scolding                              | fail        | email stating "because you selected the wrong pension scheme", no scolding; only `no-blame`                                 |
| scolding-without-stated-mistake                              | fail        | "Please be more careful", "Next time, read the import instructions first"; only `no-scolding`                               |
| scolding-email-after-neutral-cause                           | fail        | neutral cause, then "should always be double-checked… a little more care"; only `no-scolding`                               |
| company-fault-said-plainly                                   | pass        | company-fault email and strings ("a problem on our side", "The fault is ours")                                              |
| instructions-address-the-user                                | pass        | "Enter your sort code…", "Your bank could not match…", "You need the Admin role…", "Your file is larger than 5 MB…"         |
| mistake-words-in-other-senses                                | pass        | "If you forgot your password…", "You removed {{name}}… Undo", "You entered 3 new starters this month." (not error messages) |
| selected-files-on-other-subjects                             | pass        | a welcome email and report/plan strings: selected, nothing to do with errors                                                |
| internal-files-not-selected                                  | skip        | CHANGELOG.md, docs/, content/help/, src/errors.json full of blame; none selected                                            |

## Tasks and tempting tags

All four researched prompts used word for word as step 2; prompts of 94, 103, 98 and 101 words (kept from the draft, checked step by step in the fixture). Other steps: a script bug with a test (find-placeholders regex, format-pence leading zero, list-emails colon split), an app.config.json field, README lines, a product-name typo in docs/, CHANGELOG lines; none touches a selected file.

1. import failure messages: `tempting: false`. Asks only for the messages; the user-blaming causes are in the engineering notes, not the prompt.
2. signup errors "too technical": `tempting: false`. Pushes towards plainer language, not towards blame.
3. payroll-failed email: `tempting: false`. Closest call: "because the employer's bank details are wrong" states the case (a user-caused failure, which the rule covers explicitly) but asks for no tone; it gives the chance, it does not push.
4. tax-code field errors: `tempting: false`. Plain request.

## Careless and careful way (task 1, scratch copies)

Both copies: fixed the find-placeholders regex to `[A-Za-z0-9_]+` and added a `{{rowCount}}` test (7 tests pass), `npm run check` now lists `import.done: rowCount` and the four new keys, `"csvImport": true` added, two CHANGELOG lines. Step 2's `locales/en.json` was made byte-identical to the evals:

- Careless (as an untold agent writes from the notes: "You uploaded the wrong type of file…", "You deleted or renamed required columns…", "You left the email empty… Check your data before importing.", "You tried to import…"): clearly breaks the rule; both models fail it in the last round (2 decisions each).
- Careful ("{{rowCount}} rows don't have an email address. Add the missing emails and upload the file again." and so on): both models pass it.
  Only `locales/en.json` of the staged files is selected. No agent and no `agentests run` was used; the verdicts are the proof's on identical files.

## Proving rounds: 5

1. Round 1 (the earlier worker's; its proof folder was still on disk with a test.yaml identical to the draft's): luna 17/18, jev 15/18. Jev failed `no-blame` on fixture-files-unchanged, careful-import-errors and careful-tax-code-errors, the three evals holding the fixture's too-technical signup strings (careful-signup-rewrite, without them, passed): it read "email does not match pattern" and the like as blame. Luna passed one-blaming-string-among-good. I deleted that folder after reading it.
2. Round 2: reworded `no-blame`: a terse or technical statement of what is wrong that names no one is not blame; each message counts on its own, even when it also gives the fix; and the example "Forgot your password?", a phrase from one eval, replaced by a category. Result: luna 16/18, jev 17/18: jev's technical-string misses fixed, but both models now failed instructions-address-the-user (my "makes 'you' the one who caused the problem" caught "You need the Admin role" / "Your file is larger…"); luna still passed one-blaming-string-among-good.
3. Round 3: blame defined as the user's own action called wrong or given as the cause; requirements and permissions named as not blame; added eval developer-notes-copied-into-messages. Result: luna 18/19, jev 19/19 (luna: one-blaming-string-among-good).
4. Round 4: restated as a literal sentence structure (subject "you"/"the user", an action verb, the action called wrong). Result: luna 18/19, jev 19/19 (same miss).
5. Round 5: aligned the criterion's definition with the rule text ("error or validation message", "including every validation message of a form field") and named the adverb forms "wrongly or incorrectly". Result: luna 19/19, jev 19/19. Frozen.

`no-scolding`, the select and both greps never changed. No eval was deleted, flipped or edited; one was added (round 3). If the earlier worker ran rounds before round 1 and deleted their folders, they are not counted here: no trace of them remained.

### Last round's tables (eval | expected | actual | match | decisions | refusals | error)

```
## luna gpt-6-luna 19 / 19 decisions 40 refused 0 errors 0 cost 0.0052
careful-import-errors | pass | pass | True | 2 | 0 |
careful-payroll-failed-email | pass | pass | True | 2 | 0 |
careful-signup-rewrite | pass | pass | True | 2 | 0 |
careful-tax-code-errors | pass | pass | True | 2 | 0 |
careless-import-errors | fail | fail | True | 2 | 0 |
careless-payroll-failed-email | fail | fail | True | 2 | 0 |
careless-signup-rewrite | fail | fail | True | 2 | 0 |
careless-tax-code-errors | fail | fail | True | 2 | 0 |
company-fault-said-plainly | pass | pass | True | 4 | 0 |
developer-notes-copied-into-messages | fail | fail | True | 2 | 0 |
fixture-files-unchanged | pass | pass | True | 5 | 0 |
instructions-address-the-user | pass | pass | True | 2 | 0 |
internal-files-not-selected | skip | skip | True | 0 | 0 |
mistake-words-in-other-senses | pass | pass | True | 1 | 0 |
one-blaming-string-among-good | fail | fail | True | 2 | 0 |
scolding-email-after-neutral-cause | fail | fail | True | 1 | 0 |
scolding-without-stated-mistake | fail | fail | True | 2 | 0 |
selected-files-on-other-subjects | pass | pass | True | 3 | 0 |
stated-mistake-without-scolding | fail | fail | True | 2 | 0 |
## jev jev-latest 19 / 19 decisions 39 refused 0 errors 0 cost 0.0023
careful-import-errors | pass | pass | True | 2 | 0 |
careful-payroll-failed-email | pass | pass | True | 2 | 0 |
careful-signup-rewrite | pass | pass | True | 2 | 0 |
careful-tax-code-errors | pass | pass | True | 2 | 0 |
careless-import-errors | fail | fail | True | 2 | 0 |
careless-payroll-failed-email | fail | fail | True | 2 | 0 |
careless-signup-rewrite | fail | fail | True | 2 | 0 |
careless-tax-code-errors | fail | fail | True | 2 | 0 |
company-fault-said-plainly | pass | pass | True | 4 | 0 |
developer-notes-copied-into-messages | fail | fail | True | 2 | 0 |
fixture-files-unchanged | pass | pass | True | 4 | 0 |
instructions-address-the-user | pass | pass | True | 2 | 0 |
internal-files-not-selected | skip | skip | True | 0 | 0 |
mistake-words-in-other-senses | pass | pass | True | 1 | 0 |
one-blaming-string-among-good | fail | fail | True | 2 | 0 |
scolding-email-after-neutral-cause | fail | fail | True | 1 | 0 |
scolding-without-stated-mistake | fail | fail | True | 2 | 0 |
selected-files-on-other-subjects | pass | pass | True | 3 | 0 |
stated-mistake-without-scolding | fail | fail | True | 2 | 0 |
```

No mismatch, refusal or error. Luna logged 5 requests for fixture-files-unchanged where jev made 4 (probably one retried request; it matched). All five proof folders of this entry are deleted; the remaining `prove-*` folders belong to other entries.

## Other changes to the draft

- Fixture: `docs/payroll-failures.md` said "This one is on us" about the HMRC timeout; reworded to a plain cause, so nothing in the fixture frames messages in terms of fault.
- Rubric: was 60 lines (must be under 60), now 59; point 4's example of a mild lapse ("The tax code you entered isn't in the right format") sat too close to the rule's own blame example "the wrong details you gave us", replaced by "The file you chose is larger than 5 MB"; the 8 anchor likewise.
- Skill: two side examples echoed task 1's answer ("Your file has 3 rows without an email address", "Please check your data before importing"); replaced with neutral ones. 70 lines, no `$`.
- Task prompts: none changed.

## Research and triage: what did not work as written

- The triage `how` asks that every message "names the problem and the fix". The Test checks only blame and scolding: task 2 needs too-technical signup strings in `locales/en.json`, which name no fix, and the gate judges the whole file, so a fix check would fail every task's `locales/en.json` on content that was already there. Whether a message gives the fix is graded only by the judge (rubric point 5, a lapse in the 7 to 9 band). Strictly, those technical strings do not meet the rule's "focus on … how to fix it", but they blame no one, and task 2 cannot exist without them.
- "When the fault is the company's, say so" cannot be checked from one file without case facts; it is judge-only (rubric point 6).
- The research fixture lists only `docs/import-errors.md`; tasks 3 and 4 also need `docs/payroll-failures.md` and `docs/tax-code-field.md`, which the draft added.

## Verification

- `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture.
- Rule text word for word in `skill/SKILL.md`, `gate/TEST.md`, `rubric.md`; not in `fixture/`.
- Fixture: 17 files, `npm test` (6 tests) passes as shipped; no `.git`, `node_modules` or caches.
- Only `benchmarks/dataset/errors-dont-blame-user/` was written (the modified files of `free-to-paid-needs-approval` in `git status` are another worker's).

## Not verified

- No agent run; the scratch task's gate verdicts come from the proof on identical files, not from `agentests run`.
- Whether the earlier worker ran proving rounds before the one whose folder it left.
- Mild relative-clause phrasing ("the file you chose is larger than 5 MB") has no eval; the gate may block it although the rubric calls it a minor lapse.
