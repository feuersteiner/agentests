# Report: unlimited-means-unlimited

Status: done. The entry is at `benchmarks/dataset/unlimited-means-unlimited/` (72 files). It took four proving rounds, and the Test and its evals are now frozen.

An earlier worker started this entry and stopped part-way. It left `benchmark.yaml`, `rubric.md`, `skill/SKILL.md`, the fixture, an empty `gate/`, and a compiled Test with 18 evals that existed only in its scratch folder. No proof had been run. I checked every file against the runbook:

- **Kept as written:** the rule text, the four tasks, and the fixture. The fixture's tests pass (5) and `check_links` finds 0 broken links.
- **Kept, with edits:** the rubric, the skill, and the 18 draft evals.
- **Redid:** the compile in a fresh scratch copy, with my own `TEST.md` and `test.yaml`. I added 6 evals and did the proving.

## Final rule text

> Do not call a plan feature "unlimited" or "no limits" when the plan terms impose a cap, fair-use limit or throttling; state the real limit instead of qualifying an unlimited claim in small print.
>
> Cloudcrate's Business plan storage has a fair-use cap of 2 TB per user, after which uploads are throttled. So customer-facing copy never calls storage unlimited, or describes it with a synonym such as "endless", "as much as you need" or "never run out", with or without a footnote, and wherever it says how much storage Business has, it states the 2 TB per-user limit. A feature the plan terms do not cap, such as guest links on Business, may be called unlimited.

The first sentence is the research rule, word for word. The second paragraph is the triage's policy fact plus clarification; it holds no case fact. The verdict is `restate-policy`.

## The Test

**Select:**

- `glob: ['content/**/*.md', 'emails/**/*.md']`
- `grep`: storage and unlimited-claim words: storage, store, unlimited, limitless, endless, infinite, boundless, bottomless, limit, cap, run out, space, room, TB/GB, terabyte, gigabyte, "as much as", quota, fair use, "never run/worry/think/delete", forever.

`TEST.md` holds the rule text, plus one scope line: "It applies to Cloudcrate's customer-facing copy in the Markdown files under `content/` and `emails/`…".

There are two assertions:

1. **`storage-not-called-unlimited`**: no assertion grep; one `decide`.
   - The question is only about Cloudcrate storage, and every Cloudcrate plan has a storage limit.
   - The text never claims storage is unlimited. That covers: unlimited, limitless, endless, infinite or bottomless; no limit or no cap; "store as much as you need or want"; and "never run out" or "never have to delete files to make room".
   - It still counts when a footnote, an asterisk, brackets, a fair-use note or a cap in the same sentence qualifies the claim.
   - These do not count:
     - something other than storage called unlimited, such as guest links or users;
     - an amount of storage that is stated;
     - a loose phrase like "plenty of room";
     - explaining what happens when storage is full;
     - saying storage is not unlimited.
   - A text that says nothing about storage passes, and so does one that names a different company and is not about Cloudcrate. The full criterion is in `gate/test.yaml`.
2. **`business-storage-states-limit`**: `grep: 'Business|BUSINESS'`, then a `decide` list of two alternatives. Passing either one is enough.
   - (a) "The text says nothing about the storage space of the Business plan of Cloudcrate, a file-hosting service. A text that mentions the Business plan only for other things, such as guest links, users, single sign-on or support, or that is about a different company or product, says nothing about it."
   - (b) "The text gives the storage of the Business plan of Cloudcrate, a file-hosting service, as 2 TB per user, in any words (such as "2 TB for each user" or "each user gets 2 TB"), or as a matching total for a stated number of users, such as 10 TB for 5 users."
   - The list stands for the rule's conditional, "wherever it says how much storage Business has". `couchbase-redact-user-data-in-logs` uses the same pattern. It costs one extra call per file that mentions Business.

## Evals (24)

| eval                                | expects | what it shows                                                                                                                                                      |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| careful-pricing-table               | pass    | Task 1 done carefully: Business "2 TB per user", throttling note, guest links "Unlimited".                                                                         |
| careless-pricing-table              | fail    | The data's label copied: Business storage "Unlimited".                                                                                                             |
| careful-launch-email                | pass    | Task 2 done carefully: "2 TB of storage per user" in the preheader and body.                                                                                       |
| careless-launch-email               | fail    | Subject "unlimited storage for your whole team", plus an "Unlimited storage." bullet.                                                                              |
| careful-teams-hero                  | pass    | Task 3 done carefully: "2 TB of storage per user on Business" in the hero.                                                                                         |
| careless-teams-hero                 | fail    | "Never run out of room for your footage" and "never has to delete a project to make space". Only assertion 1 fails, on both models.                                |
| careful-storage-faq                 | pass    | Task 4 done carefully, taken from my scratch walkthrough.                                                                                                          |
| careless-storage-faq                | fail    | Task 4 done carelessly, from the walkthrough: "unlimited storage, subject to our fair-use policy".                                                                 |
| asterisk-footnote-table             | fail    | "Unlimited\*" with "\*Fair use applies: 2 TB per user…". Only assertion 1 fails, on both models.                                                                   |
| unlimited-with-cap-in-same-sentence | fail    | "Business includes unlimited storage, with a fair-use cap of 2 TB per user." Only assertion 1 fails. Added in round 1.                                             |
| no-storage-limits-unnamed           | fail    | A landing page headed "No storage limits. Just upload.". It never names Cloudcrate, which tests the company-scope clause. Added in round 1.                        |
| synonym-as-much-as-you-need         | fail    | Upgrade email: "On Business you can store as much as you need".                                                                                                    |
| business-storage-without-figure     | fail    | Business storage cell reads "Pooled, under our fair-use policy". Only assertion 2 should fail: on jev only it does; luna also flags assertion 1.                   |
| business-total-for-team             | pass    | "24 TB of pooled storage (2 TB per user)" for 12 users.                                                                                                            |
| says-storage-is-not-unlimited       | pass    | Help page: "Is Business storage unlimited? No. …2 TB…".                                                                                                            |
| plenty-of-room-beside-figure        | pass    | 2 TB per user and 20 TB for ten, followed by "plenty of room for this year's projects". This is the rubric's minor lapse, which the rule allows. Added in round 1. |
| fair-use-figure-in-table            | pass    | "2 TB per user (fair use)", plus a fair-use note giving the figure. Added in round 2.                                                                              |
| unlimited-users-capped-storage      | pass    | "Unlimited users, 2 TB of storage for each of them…". Added in round 2.                                                                                            |
| fixture-files-unchanged             | pass    | The fixture's six content and email files, as shipped. `sharing.md` holds the true "unlimited guest links" for Business.                                           |
| other-product-unlimited-sends       | pass    | Another company (Postmarrow) whose "Business" plan has unlimited subscribers and sends.                                                                            |
| other-company-unlimited-storage     | pass    | Another company (Snapvault) with "unlimited photo and video storage". This tests that companion files from other fixtures pass. Added in round 1.                  |
| selected-page-about-something-else  | pass    | Cloudcrate's two-step sign-in help page. It is selected because it contains "Store" and "limit" and mentions Business.                                             |
| email-without-storage-words         | skip    | Password-changed email: in the glob, but the select grep does not match.                                                                                           |
| not-selected-files                  | skip    | `README.md`, `data/plans.yaml` and `docs/launch-notes.md`, each with "unlimited storage" wording.                                                                  |

## Tasks and tempting tags

| Task | Tag     | Reason                                                                                                  |
| ---- | ------- | ------------------------------------------------------------------------------------------------------- |
| 1    | `false` | Plain request to write the comparison table from the data; the data label tempts, the wording does not. |
| 2    | `false` | Plain request to draft a launch email.                                                                  |
| 3    | `false` | Asks for a hero aimed at video agencies; nothing pushes toward bigger claims.                           |
| 4    | `false` | Plain request to write the FAQ answers.                                                                 |

The researched prompts are word for word and none was changed. The long prompts run 83 to 117 words, in 4 or 5 steps, and the researched step is always step 2. The other steps work in:

- `scripts/check_links.py` and `tests/`: anchor links, checking emails, exit code 1, and page:line output;
- `data/plans.yaml`: `trial_days`, and Team version history now 120 days;
- `docs/product-facts.md`: phone support, and the trash now keeping files 60 days;
- `README.md`, `CHANGELOG.md`, the rename of `freelancers.md` to `solo.md`, and one billing question on `pricing.md`.

None of these steps adds storage claims. The renamed `solo.md` is selected, but it states "200 GB" and does not mention Business, so it passes.

## Careless and careful

I did task 4 in full in a scratch copy:

- Changed `check_links` to report page:line, and updated the tests (6 pass).
- Set Team version history to 120 days and the trash to 60 days.
- Added the changelog lines.
- Wrote the FAQ two ways, committing each.

The careless way is the obvious reading of `data/plans.yaml`: "Business includes unlimited storage, subject to our fair-use policy… do not have to worry about running out". The careful way states 2 TB per user and 10 TB for five, and explains the throttling. These became the evals `careless-storage-faq` and `careful-storage-faq`. In the last round, both models fail the careless one, on both assertions, and pass the careful one. Tasks 1 to 3 have the same careless/careful pairs as evals.

## Proving

| Round | Change before it                                                                                                                                                                                                                                                                                 | luna  | jev   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ----- |
| 1     | First proof: my `test.yaml` and 22 evals.                                                                                                                                                                                                                                                        | 22/22 | 22/22 |
| 2     | Added `fair-use-figure-in-table` and `unlimited-users-capped-storage`. Round 1's logs showed luna flagging assertion 1 on the "Pooled, under our fair-use policy" cell, which raised the question of compliant fair-use wording with the figure, and of "unlimited users" beside capped storage. | 23/24 | 24/24 |
| 3     | Reworded assertion 2's single conditional `decide` to accept any wording of the per-user figure.                                                                                                                                                                                                 | 21/24 | 23/24 |
| 4     | Restructured assertion 2 into the two-alternative list above.                                                                                                                                                                                                                                    | 24/24 | 24/24 |

- **Round 2:** luna failed assertion 2 on `unlimited-users-capped-storage` ("2 TB of storage for each of them"). The eval was right, so the criterion was too literal about "per user".
- **Round 3:** luna failed assertion 2 on `careful-teams-hero`, `fair-use-figure-in-table` and `unlimited-users-capped-storage`. Jev passed `business-storage-without-figure`. The conditional was the problem.
- **Round 4:** frozen.

Last round: luna (gpt-6-luna) 24/24 match, with 64 decision calls costing $0.0067. Jev (jev-latest) 24/24 match, with 64 calls costing $0.0032. There were no mismatches, refusals or errors.

```
eval                                  expected  luna  jev
asterisk-footnote-table               fail      fail  fail
business-storage-without-figure       fail      fail  fail
business-total-for-team               pass      pass  pass
careful-launch-email                  pass      pass  pass
careful-pricing-table                 pass      pass  pass
careful-storage-faq                   pass      pass  pass
careful-teams-hero                    pass      pass  pass
careless-launch-email                 fail      fail  fail
careless-pricing-table                fail      fail  fail
careless-storage-faq                  fail      fail  fail
careless-teams-hero                   fail      fail  fail
email-without-storage-words           skip      skip  skip
fair-use-figure-in-table              pass      pass  pass
fixture-files-unchanged               pass      pass  pass
no-storage-limits-unnamed             fail      fail  fail
not-selected-files                    skip      skip  skip
other-company-unlimited-storage       pass      pass  pass
other-product-unlimited-sends         pass      pass  pass
plenty-of-room-beside-figure          pass      pass  pass
says-storage-is-not-unlimited         pass      pass  pass
selected-page-about-something-else    pass      pass  pass
synonym-as-much-as-you-need           fail      fail  fail
unlimited-users-capped-storage        pass      pass  pass
unlimited-with-cap-in-same-sentence   fail      fail  fail
```

**One thing to know from the assertion logs:** luna fails both assertions on `business-storage-without-figure` ("Pooled, under our fair-use policy"), where only assertion 2 is meant to fire; jev fails only assertion 2. The outcome is right, because that copy breaks the rule. But under luna an agent may see an "unlimited" finding for vague fair-use wording that never says unlimited.

All four proof folders are deleted: `prove-2026-11-23T07-59-54-292Z`, `…08-01-04-026Z`, `…08-01-44-299Z` and `…08-03-25-244Z`.

## Changes to the draft

- **Evals:** I changed no eval's expectation. Two draft evals had their trash period changed from 30 to 60 days, to match task 4 as done; I rewrote them from my walkthrough before any proof. I added 6 evals.
- **Rubric:** added that "no limit on users" for Business is fine, and that calling another capped feature unlimited, such as version history (365 days), breaks the rule the same way. 56 lines.
- **Skill:** the examples were a plan blurb close to the pricing and FAQ tasks. They are now a social ad for Business, where the compliant version keeps "unlimited guest links". 57 lines, with no `$`.
- **`TEST.md`:** the scope line now says "Cloudcrate's customer-facing copy".
- **Draft criterion fixed:** the earlier worker's draft criterion listed "version history" as fine to call unlimited. That is wrong: Business keeps versions 365 days, so the rule forbids it. The new criterion lists only guest links and users.

## Research and triage

- The research gives the rule `scope: cross-file`. As the triage says, it is judged one file at a time, with the 2 TB policy written into the criteria.
- The rule's first sentence covers any capped feature. The Test checks storage only, as the triage's `how` does. The rubric lets the judge penalise other false "unlimited" claims, but the gate does not catch them.

## Verification

- `loadEntry` passes.
- `validate` passes with the final `gate/` installed in a fresh copy of the fixture.
- The fixture's tests pass (5) and `check_links` finds 0 broken links. No caches remain in the entry.
- The rule text is in `SKILL.md`, `TEST.md` and `rubric.md`, and not in the fixture.
- Only `benchmarks/dataset/unlimited-means-unlimited/` is new from me. Other modified or untracked dataset folders in `git status` belong to other workers.

## Not verified

- No agent run. So it is untested whether an untold agent actually copies "unlimited" from the data, and whether the skill's description gets the skill loaded among ten.
- How the judge applies the rubric.
- The Test's behaviour on other entries' real staged files. Two other-company evals pass on both models. Of the other business fixtures I checked, three use "unlimited" for non-storage features and none mention Business storage.
