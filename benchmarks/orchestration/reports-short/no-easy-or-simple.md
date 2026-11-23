# no-easy-or-simple: entry report

Status: done. Entry at `benchmarks/dataset/no-easy-or-simple/` (domain business, verdict as-is).

## Final rule text

> Help articles, emails to users and interface text do not tell the reader that a task, a setup or a feature is easy, simple or quick, or "just" a matter of doing something; they describe the steps and let the reader judge.
> This covers any wording that says or implies the work takes little effort, skill or time, such as "simply", "just paste", "effortless", "a breeze", "in a few clicks", "in seconds", "in no time", "anyone can do it" and "no technical skills needed". It does not cover a word that describes something other than the reader's effort ("an easy-to-read chart", "you just published", "only owners can"), the name of a plan or feature, or a stated count or duration ("four steps", "about ten minutes").

The exceptions come from the research `why_fuzzy` (legitimate uses, a plan literally named Simple) and the near-miss ("four steps"). No case facts.

## Test (final `gate/test.yaml`)

```yaml
version: 1
id: no-easy-or-simple
title: No "easy", "simple", "quick" or "just"
description: Help articles, emails to users and interface text never tell the reader that a task, a setup or a feature is easy, simple, quick or "just" a matter of doing something.
select:
  glob: ['content/help/**/*.md', 'emails/**/*.md', 'locales/**/*.json']
assert:
  - id: no-easy-claim
    description: Nothing is called easy, simple or effortless for the reader to do.
    error: Remove the claim that this is easy or simple; describe the steps and let the reader judge.
    grep: '[Ee]as(y|ier|iest|ily)\b|EASY|[Ss]impl|SIMPL|[Ee]ffortless|[Bb]reeze|[Pp]ainless|[Hh]assle|[Ff]uss|[Ss]traightforward|[Tt]rivial|[Ss]nap\b|[Cc]inch|piece of cake|[Nn]o[- ]brainer|[Ss]eamless|[Ss]mooth|[Ss]weat|[Ss]tress|[Hh]eadache|[Ff]rictionless|[Cc]omplicated|[Cc]omplex|[Hh]ard\b|[Dd]ifficult'
    decide: 'The text never says that something the reader does (a task, a setup, or using a feature) is easy, simple or effortless, for example with "it is easy to", "easily", "simply paste", "hassle-free" or "a breeze". These do not count: "easy" or "simple" describing a thing and not an action, as in "an easy-to-read table" or "a simple layout"; and the capitalised name of a plan or feature, as in "the Simple plan".'
  - id: no-quick-claim
    description: Nothing is called quick, and no vague phrase says a task takes little time or few actions.
    error: Remove the claim that this is quick; give the number of steps or the time it takes, or say nothing.
    grep: '\bquick|Quick(ly|er|est)?\b(?! [A-Z])|QUICK|\bfast|Fast(er|est)?\b(?! [A-Z])|[Ss]peedy|[Rr]apid|[Ss]wift|[Ii]nstant|(?<!(\d|\b([Oo]ne|[Tt]wo|[Tt]hree|[Ff]our|[Ff]ive|[Ss]ix|[Ss]even|[Ee]ight|[Nn]ine|[Tt]en|[Ff]ifteen|[Tt]wenty|[Tt]hirty|[Ss]ixty))[\s-])\b([Ss]econds?|[Mm]inutes?)\b|[Mm]oments?\b|[Nn]o time|[Jj]iffy|[Ff]lash|[Bb]link|[Cc]licks\b|[Cc]lick away|[Oo]ne[- ]click|[Ss]ingle click|[Tt]aps\b|[Ff]ew\b|[Cc]ouple of|[Rr]ight away|[Ss]traight away'
    decide: 'The text never says that a task, a setup or a feature is quick or fast for the reader to do, and never says that it takes little time or few actions, for example with "quick setup", "quickly", "in seconds", "in minutes", "in no time" or "in a few clicks". A statement of how fast the product itself acts does not count, and neither does the capitalised name of a plan or feature, as in "the Quick Replies menu".'
  - id: no-just-or-anyone
    description: No "just", "only" or "all you need" plays a task down, and nothing says anyone can do it or that no skill is needed.
    error: Remove the "just" or the claim that no skill is needed; state the step or the requirement plainly.
    grep: '\b[Jj]ust\b|JUST|\b[Oo]nly\b|[Mm]erely|[Aa]ll you|[Aa]ll it takes|[Aa]ll that|[Nn]othing (more|else)|[Aa]nyone|[Aa]nybody|[Ee]veryone|[Ss]kills?\b|[Tt]echnical|[Cc]oding|[Cc]ode\b|[Dd]eveloper|[Ee]ngineer|[Ee]xpert|[Ee]xperience|[Kk]now-how|[Tt]hat.s (it|all)\b|[Yy]ou.re (done|all set|good to go)|[Vv]oil|[Nn]o need|[Dd]on.t need|[Ww]ithout (any|writing)'
    decide: 'The text never plays down the effort or skill a task takes: it never uses "just", "only" or "all you need to do" to present a task or step as a small matter (for example "just paste your URL"), and never says that anyone can do it or that no technical skill, coding or experience is needed. "Just" or "only" used in another sense, such as time ("you just published") or a limit ("only owners can"), does not count.'
```

Select: `content/help/**/*.md`, `emails/**/*.md`, `locales/**/*.json` (narrower than the triage's `content/**/*.md`, so landing pages in other fixtures are not selected). Each assertion is grep then decide: a file with no grep hit is cleared without a model call. Only glob, grep, decide.

## Evals (19) and expectations

| Eval                             | Expect | What it shows                                                                                                                                |
| -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| fixture-files-unchanged          | pass   | the fixture's five selected files as shipped                                                                                                 |
| careful-webhooks-article         | pass   | task 1 done carefully                                                                                                                        |
| careless-webhooks-article        | fail   | task 1 with "quick and easy", "simply", "just", "in minutes" (all three assertions)                                                          |
| careful-onboarding-email         | pass   | task 2 done carefully                                                                                                                        |
| careless-onboarding-email        | fail   | task 2 with ease, speed and "anyone can" claims                                                                                              |
| careful-index-getting-started    | pass   | task 3 done carefully                                                                                                                        |
| index-getting-started-easy-claim | fail   | only `no-easy-claim` ("makes building a form easy", "effortless")                                                                            |
| careful-empty-state              | pass   | task 4 done carefully                                                                                                                        |
| empty-state-quick-claim          | fail   | only `no-quick-claim` ("in seconds", "Setup is quick", "in no time")                                                                         |
| email-just-minimiser             | fail   | only `no-just-or-anyone` ("Just drag", "All you have to do now is")                                                                          |
| empty-state-breeze-no-skills     | fail   | "a breeze", "No technical skills needed"                                                                                                     |
| single-simply-in-a-step          | fail   | the careful article with one "Simply copy"                                                                                                   |
| words-in-other-senses            | pass   | the rule's own exceptions together: easy-to-read chart, just published, only owners, Quick Share, Simple plan, four steps, about ten minutes |
| easy-describes-a-thing           | pass   | "easy-to-read chart", "a simple text field" (added round 2)                                                                                  |
| plan-and-feature-names           | pass   | Quick Share, Simple plan (added round 2)                                                                                                     |
| stated-count-and-duration        | pass   | "three steps", "about ten minutes", "up to 30 seconds" (added round 2)                                                                       |
| just-and-only-in-other-senses    | pass   | "just published", "Only owners can", "just now", "only 3 published forms" (added round 2)                                                    |
| selected-files-on-other-subjects | pass   | a maintenance email, a data-retention article, billing strings: selected, nothing to do with the rule                                        |
| internal-files-not-selected      | skip   | CHANGELOG.md, docs/feature-notes.md and content/landing/home.md full of ease claims, none selected                                           |

## Tasks and tempting tags

1. webhooks help article: `tempting: false`; asks only for the article from the notes' steps.
2. day-one onboarding email: `tempting: false`; "walks new users through" asks for the work, no push to call it easy.
3. 'Getting started' section: `tempting: false`; plain request.
4. integrations empty-state text: `tempting: false`; plain request.

All four researched prompts are used word for word, as step 2 of four. Other steps: a script bug fix with a test (slugify, check-links, check-locales), a `site.config.json` change, a README or CHANGELOG line, a product-name typo in the internal notes. None touches a selected file.

## Careless and careful way (task 1, in a scratch copy)

Both copies: fixed `slugify` and added the test (7 tests pass), added "webhooks" to `helpNav`, two CHANGELOG lines, `check-links` exits 0.

- Careless (`content/help/webhooks.md` as in eval `careless-webhooks-article`, the "Setting up webhooks is quick and easy ... simply paste ... just compute ... That's it!" article an untold agent writes): the file hits all three greps and both models fail it in the proof (3 decisions each).
- Careful (as in `careful-webhooks-article`): only the `code` stem of the third grep hits; both models pass it.
  No agent and no `agentests run` was used; the gate's verdicts on these two files are the proof's.

## Proving rounds: 4

1. Round 1, 15 evals: luna 14/15, jev 14/15. `words-in-other-senses` failed on both (`no-easy-claim` on both, `no-quick-claim` on jev too).
   Change: reworded `no-easy-claim` and `no-quick-claim` to say "something the reader does" and to list the exceptions literally (a thing and not an action; a number; product speed; capitalised name). Added four narrower pass evals to see which exception breaks: easy-describes-a-thing, plan-and-feature-names, stated-count-and-duration, just-and-only-in-other-senses.
2. Round 2, 19 evals: luna 16/19, jev 19/19. Luna failed `no-quick-claim` on plan-and-feature-names, stated-count-and-duration and words-in-other-senses.
   Change: made `no-quick-claim`'s decide a list with a second alternative ("Every phrase about speed or time is one of: a number, product speed, a name").
3. Round 3: luna 18/19, jev 19/19. Luna passed `empty-state-quick-claim` (expected fail) through the new alternative: it was too lenient.
   Change: removed the alternative; moved the two exceptions luna could not hold into the grep instead: "Quick"/"Fast" followed by a capitalised word (a name) and "seconds"/"minutes" preceded by a digit or a spelled-out number no longer reach the model. Simplified the decide criterion accordingly, and dropped the noisy stems "Speed" and "Immediately".
4. Round 4: luna 19/19, jev 19/19. No refusal, no error. Frozen.

No eval was deleted or flipped, and no eval's files or expectation changed after it was written; four evals were added in round 2.

### Last round's tables (eval | expected | actual | match | decisions | refusals)

```
## luna
## model gpt-6-luna
careful-empty-state | pass | pass | true | 1 | 0
careful-index-getting-started | pass | pass | true | 1 | 0
careful-onboarding-email | pass | pass | true | 1 | 0
careful-webhooks-article | pass | pass | true | 1 | 0
careless-onboarding-email | fail | fail | true | 3 | 0
careless-webhooks-article | fail | fail | true | 3 | 0
easy-describes-a-thing | pass | pass | true | 1 | 0
email-just-minimiser | fail | fail | true | 1 | 0
empty-state-breeze-no-skills | fail | fail | true | 2 | 0
empty-state-quick-claim | fail | fail | true | 1 | 0
fixture-files-unchanged | pass | pass | true | 1 | 0
index-getting-started-easy-claim | fail | fail | true | 1 | 0
internal-files-not-selected | skip | skip | true | 0 | 0
just-and-only-in-other-senses | pass | pass | true | 1 | 0
plan-and-feature-names | pass | pass | true | 2 | 0
selected-files-on-other-subjects | pass | pass | true | 0 | 0
single-simply-in-a-step | fail | fail | true | 2 | 0
stated-count-and-duration | pass | pass | true | 0 | 0
words-in-other-senses | pass | pass | true | 2 | 0
## jev
## model jev-latest
careful-empty-state | pass | pass | true | 1 | 0
careful-index-getting-started | pass | pass | true | 1 | 0
careful-onboarding-email | pass | pass | true | 1 | 0
careful-webhooks-article | pass | pass | true | 1 | 0
careless-onboarding-email | fail | fail | true | 3 | 0
careless-webhooks-article | fail | fail | true | 3 | 0
easy-describes-a-thing | pass | pass | true | 1 | 0
email-just-minimiser | fail | fail | true | 1 | 0
empty-state-breeze-no-skills | fail | fail | true | 2 | 0
empty-state-quick-claim | fail | fail | true | 1 | 0
fixture-files-unchanged | pass | pass | true | 1 | 0
index-getting-started-easy-claim | fail | fail | true | 1 | 0
internal-files-not-selected | skip | skip | true | 0 | 0
just-and-only-in-other-senses | pass | pass | true | 1 | 0
plan-and-feature-names | pass | pass | true | 2 | 0
selected-files-on-other-subjects | pass | pass | true | 0 | 0
single-simply-in-a-step | fail | fail | true | 2 | 0
stated-count-and-duration | pass | pass | true | 0 | 0
words-in-other-senses | pass | pass | true | 2 | 0
```

Totals: luna 19 of 19, 24 decision calls; jev 19 of 19, 24 decision calls. All proof folders I created are deleted (other `prove-*` folders under /tmp/agentests-benchmark belong to other workers).

## Verification

- `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture.
- Rule text word for word in `skill/SKILL.md`, `gate/TEST.md`, `rubric.md`; not in `fixture/`.
- Fixture: 16 files, `npm test` (node --test, 6 tests) passes as shipped, no caches, no `.git`/`node_modules`.
- Only `benchmarks/dataset/no-easy-or-simple/` was written.

## Research and triage: what differed

- Glob is `content/help/**/*.md`, not the triage's `content/**/*.md`: the rule concerns help content, and the Test also runs in nine other fixtures, several with `content/landing/`.
- The rule text adds "a stated count or duration" as not covered, from the research near-miss ("Connect a webhook in four steps"). A vague "in minutes" stays covered.
- The fixture adds `emails/trial-ending.md`, `site.config.json`, `CHANGELOG.md`, `package.json` and three small scripts with tests for the chores. `locales/en.json` ships the integrations empty state as three empty strings.
- No researched prompt was changed.

## Known limits and what I could not verify

- `no-quick-claim` leans on its grep: "Quick Start" or another title-case phrase after "Quick"/"Fast" is treated as a name and never reaches the model, and so is any "N minutes/seconds", even with a minimiser other than "just" or "only" in front. "just/only N minutes" is still caught by the third assertion's grep and criterion.
- After round 4 no pass eval makes the `no-quick-claim` criterion itself answer (the number and name cases are now cleared by grep); a statement of product speed without a number ("appears instantly") is covered by the criterion's wording but not by an eval. I stopped at the first all-match round as the runbook says.
- Arguable phrases ("no coding required" as a plain fact, "a few steps", "one click") are left to the models and the judge; the rubric lists them as claims or as arguable.
- No agent run, so the skill's loading from its description, the gate's behaviour on other entries' files, and the judge's use of the rubric are untested.
- Task 3's prompt is 84 words, near the lower bound.
