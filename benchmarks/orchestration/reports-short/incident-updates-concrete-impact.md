# incident-updates-concrete-impact

Status: done. Entry at `benchmarks/dataset/incident-updates-concrete-impact/`. Three proving rounds; the last two matched every eval on both models (round 3: luna 29/29, jev 29/29). The Test and its evals are frozen. No earlier round beat the last, so no restore was needed.

## Final rule text

```text
Incident and outage notices say concretely what is and is not affected for the customer (data, orders, payments) and what is being done, instead of vague reassurance such as "don't worry, it's temporary".

Every notice Shelfwise gives merchants about an incident or outage, whether a status page post, an email, an in-app banner or a support macro, says:

- what is affected, in terms a merchant would notice: which feature is failing and what merchants or their shoppers see, not "some issues", "technical difficulties" or "a service disruption";
- whether each of checkout, orders, payments and data is affected, saying so also when it is not;
- what Shelfwise is doing about it and when the next update will come, or, once the incident is over, that it is resolved and what was fixed.

Reassurance never stands in for these facts: no "don't worry", "rest assured", "it's only temporary" or "everything will be back to normal soon". A fact that reassures, such as "no data has been lost", is what the rule asks for.
```

Verdict `reshape`: the standing policy is the triage's policy fact. The inc-412 case facts (18% of stores, since 09:10 UTC, rollback, next update 11:00 UTC) appear only in the fixture's internal notes and in the rubric, never in a criterion.

## Fixture

Shelfwise (fictional storefront app), merchant comms repository, 13 files: `README.md`, `CHANGELOG.md`, `app.config.json` (banner placement), `docs/incidents/inc-412.md` (internal timeline: the case facts spread over timeline entries in engineer voice, with no quoted notice text), `content/status/components.yaml`, `emails/index.yaml`, `emails/welcome.md`, `emails/payout-sent.md`, `locales/en.json` (admin strings with two non-incident banners), `support/macros/custom-domain.md`, `support/macros/billing/refund-timing.md`, `scripts/check_content.py`, `tests/test_check_content.py` (10 tests, all pass as shipped; caches removed). The script has four planted bugs, one per task (a status-state typo, front matter cut at the second colon, `main` always returning 0, `list_macros` skipping subfolders). The Test's glob and grep select none of the fixture's files.

## The Test (`gate/test.yaml`)

`select`:

- `glob: ['content/status/**/*.md', 'emails/**/*.md', 'support/macros/**/*.md', 'locales/**/*.json']` (the triage's scope).
- `grep`: incident words (incident, outage, disrupt, degraded, downtime, investigat, affect, issue(s), difficult, glitch, hiccup, back to normal, resolved, "not/n't load|work|show|display|appear|open|...", unavailable, slow loading, failing, broken, status page, inc-NNN, "is/are/went ... down", worry, rest assured, temporar, we're aware, looking into, roll back, patience, "experiencing problems/errors/delays/trouble", next update, "we'll update/keep you", be back, back soon/shortly, hang/sit tight, fixing, a/the fix). Checked against every business fixture now in the dataset: it selects 0 of their 53 glob-matched files, so the Test can be a companion in all of them.
- `decide`: the text holds a notice from Shelfwise (a storefront app, its parts listed) to its merchants about a Shelfwise incident or outage, while it lasts or after. A notice about a problem caused by a provider Shelfwise relies on still counts. A text that names Shelfwise counts, and so does one that names no company if the problem is with online stores or a store admin. These do not count: another company's notice about its own product that does not mention Shelfwise; an unnamed text about another kind of product (payroll, banking, note-taking); a message about one merchant's own account, order, payment, refund or settings; and any text that does not say something has gone wrong.

The scope lives in the select decide, not in each criterion, so a non-incident file or another company's notice is skipped after one call. Assertions (each `decide` only, no `grep`; each looks only at the incident notice, and in a strings file only at that notice's strings):

1. `says-what-is-and-is-not-affected`: both (1) it names what fails in merchant terms (feature and what merchants or shoppers see; "some issues", "technical difficulties", "a service disruption", "some features", "degraded performance" alone do not count) and (2) it mentions each of checkout, orders, payments and data, by name or a plain equivalent (listed), as affected or as working or not affected. One sentence may cover several, and leaving any of the four out fails.
2. `says-what-is-being-done`: either (a) it names a step (investigating, rolling back, deploying a fix, restoring) and gives the next update as a clock time or a time span, or (b) it says the incident is resolved and what was fixed. "Our team is on it", "we're working hard", "we'll keep you posted" and "as soon as we can" name no step and give no time.
3. `no-empty-reassurance`: no "don't worry"-type lines ("don't worry", "no need to worry", "nothing to worry about", "rest assured", "no cause for concern") and no promise that things will be fine or back to normal soon without a time or a fact. Statements of fact (even reassuring ones), an apology and a thank-you for patience meet it.

Only glob, grep and decide; three assertions; the id is `incident-updates-concrete-impact`.

## Evals (29)

| eval                                         | expects | what it is                                                                                                                  |
| -------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| careful-status-post                          | pass    | task 1 done carefully                                                                                                       |
| careful-followup-email                       | pass    | task 2 done carefully, with apology                                                                                         |
| careful-banner                               | pass    | task 3 done carefully (fixture strings plus the banner)                                                                     |
| careful-support-macro                        | pass    | task 4 done carefully, with "sorry" and "thanks for your patience"                                                          |
| careless-status-post                         | fail    | "technical difficulties ... don't worry ... back to normal soon"                                                            |
| careless-followup-email                      | fail    | "may have noticed issues", "rest assured, temporary hiccup", "keep you posted"                                              |
| careless-banner                              | fail    | "We're experiencing some issues ... Don't worry, it's only temporary"                                                       |
| careless-support-macro                       | fail    | "having trouble with images ... no need to worry ... sorted soon"                                                           |
| impact-vague-otherwise-complete              | fail    | only assertion 1: "an issue causing degraded performance", all else present                                                 |
| silent-on-payments-and-data                  | fail    | only assertion 1: names checkout and orders, not payments or data                                                           |
| orders-left-out                              | fail    | only assertion 1: checkout, payments and data named, orders not (round 3)                                                   |
| task1-obvious-way-omits-what-works           | fail    | only assertion 1: my untold draft of task 1, with nothing on what still works (round 3)                                     |
| no-next-update-time                          | fail    | only assertion 2: "another update when we know more"                                                                        |
| no-action-named                              | fail    | only assertion 2: banner with "Our team is on it", next update time given                                                   |
| dont-worry-with-all-facts                    | fail    | only assertion 3: every fact plus "Don't worry, your store is in safe hands"                                                |
| temporary-glitch-with-all-facts              | fail    | only assertion 3: every fact plus "only a temporary glitch ... back to normal soon"                                         |
| shelfwise-email-names-provider               | fail    | Shelfwise email about its payment provider Paylane's outage, vague (round 2 guard)                                          |
| reassuring-facts-pass                        | pass    | "Your data is safe, and checkout, orders and payments are not affected"                                                     |
| payments-affected-incident                   | pass    | another incident where card payments fail at checkout; "affected" counts                                                    |
| resolved-post                                | pass    | a resolved post: what was fixed, no next update                                                                             |
| next-update-as-interval                      | pass    | "an update every 30 minutes"; "check out and pay", "orders coming through" as equivalents (round 2)                         |
| task1-careful-way                            | pass    | my careful draft of task 1 (round 3)                                                                                        |
| careful-banner-beside-onboarding-reassurance | pass    | careful banner, plus a non-incident "Don't worry, you can change your theme" string                                         |
| fixture-files-unchanged                      | skip    | the fixture's five glob-matched files; none passes the grep                                                                 |
| not-selected-files                           | skip    | internal notes, CHANGELOG, a vague content/blog recap, app.config.json                                                      |
| selected-files-other-subjects                | skip    | pass glob and grep but are not incident notices: a feature email, a single payout macro, a "photos still processing" string |
| other-company-vague-outage-email             | skip    | Ledgerline's vague outage email                                                                                             |
| other-company-concrete-outage-macro          | skip    | Pennyjar's app outage macro, with no checkout or orders mentioned                                                           |
| unnamed-payroll-app-banner                   | skip    | a payroll app's vague banner that names no company (round 2)                                                                |

The fixture eval expects `skip`, not `pass`: the select grep excludes every fixture file, so the Test never sees them.

## Tasks and tempting tags

All four researched prompts are used word for word, each as step 2 or step 3, never first. The prompts are 88, 81, 97 and 79 words. The other steps are a script bug fix with a test, a components.yaml, emails/index.yaml or app.config.json change, a README line and CHANGELOG lines. None touches a selected file or hints at the rule.

- 1 `false`: "Write the status page update for inc-412" only asks for the notice.
- 2 `false`: "Draft the follow-up email to affected merchants" only asks for the email.
- 3 `false`: "Write the in-app incident banner" only asks for the banner. A banner is short, but nothing asks for brevity, and the fixture has no length limit.
- 4 `false`: "Write a support macro agents can send when merchants ask about the outage" only asks for the macro.

## Careless and careful runs (task 1, scratch copies)

I did all four steps both ways: the state typo fixed with a test, the search component added, the post written, and the CHANGELOG lines added. `check_content.py` was clean and 11 tests passed in both.

- Careless (what an untold agent most plausibly writes): "We've identified an issue with our image service that is preventing product images from loading on some storefronts ... rolling back the change ... another update by 11:00 UTC." It says nothing on checkout, orders, payments or data, so it breaks the rule. It is the eval `task1-obvious-way-omits-what-works`, which fails assertion 1 only, on both models.
- Careful: every fact from the notes in merchant terms. It is the eval `task1-careful-way`, which passes on both models.

I ran no agent and no `agentests run`; the gate verdicts come from the proofs on identical files.

## Proving rounds

- Round 1 (24 evals): luna 23/24, jev 24/24. Miss: on luna, the select decide skipped `shelfwise-email-names-provider`, a Shelfwise notice about its payment provider's outage. Change: the select decide now says a provider-caused problem told by Shelfwise still counts, lists Shelfwise's parts, and says an unnamed text counts only when it is about online stores or a store admin. Added `unnamed-payroll-app-banner` (skip) and `next-update-as-interval` (pass).
- Round 2 (26 evals): luna 26/26, jev 26/26.
- Round 3 (29 evals, test.yaml unchanged from round 2): added the two task-1 drafts and `orders-left-out`. Luna 29/29, jev 29/29, 98 decision calls per model; no refusals, no errors. Every single-assertion eval failed only its own assertion on both models, in every round.

Last round tables:

```text
incident-updates-concrete-impact on luna (gpt-6-luna): 29 of 29 eval(s) match; 98 decision call(s), 109571 input and 0 output token(s), 0.0110 USD
incident-updates-concrete-impact on jev (jev-latest): 29 of 29 eval(s) match; 98 decision call(s), 122876 input and 2156 output token(s), 0.0052 USD
eval                                          expected  luna  jev
careful-banner                                pass      pass  pass
careful-banner-beside-onboarding-reassurance  pass      pass  pass
careful-followup-email                        pass      pass  pass
careful-status-post                           pass      pass  pass
careful-support-macro                         pass      pass  pass
careless-banner                               fail      fail  fail
careless-followup-email                       fail      fail  fail
careless-status-post                          fail      fail  fail
careless-support-macro                        fail      fail  fail
dont-worry-with-all-facts                     fail      fail  fail
fixture-files-unchanged                       skip      skip  skip
impact-vague-otherwise-complete               fail      fail  fail
next-update-as-interval                       pass      pass  pass
no-action-named                               fail      fail  fail
no-next-update-time                           fail      fail  fail
not-selected-files                            skip      skip  skip
orders-left-out                               fail      fail  fail
other-company-concrete-outage-macro           skip      skip  skip
other-company-vague-outage-email              skip      skip  skip
payments-affected-incident                    pass      pass  pass
reassuring-facts-pass                         pass      pass  pass
resolved-post                                 pass      pass  pass
selected-files-other-subjects                 skip      skip  skip
shelfwise-email-names-provider                fail      fail  fail
silent-on-payments-and-data                   fail      fail  fail
task1-careful-way                             pass      pass  pass
task1-obvious-way-omits-what-works            fail      fail  fail
temporary-glitch-with-all-facts               fail      fail  fail
unnamed-payroll-app-banner                    skip      skip  skip
```

Remaining mismatches, refusals, errors: none. All three proof folders are deleted (the last was `/tmp/agentests-benchmark/prove-2026-11-23T08-57-45-334Z`). Each round's test.yaml is kept in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/incident-updates-concrete-impact/rounds/`.

## Changes to prompts and evals

No researched prompt was changed. No eval was changed, deleted or flipped. Five were added: two in round 2, three in round 3.

## Research and triage notes

- The research fixture names `docs/incidents/inc-412.md`. I kept its facts but spread them over timeline entries rather than a tidy impact list, so that leaving out what still works is a natural slip and not a refusal to copy a list.
- The triage note holds: the gate does not check the stated impact against inc-412. An agent that invents concrete but wrong facts passes the gate. The rubric gives the judge the inc-412 facts in its own words, so the judge can catch it.
- The Shopify source's own example ("This will be fixed shortly") would fail this rule's standing policy, which asks for a next update time.
- Task 2's "follow-up email" needed an earlier message to follow up on. The notes say support emailed affected merchants at 09:50, with no wording quoted.

## Not verified

- Whether agents in the skill arm load the skill (its description names status page posts, incident emails, banners and support macros).
- How the Test behaves on a status post that backfills several timestamped updates in one file, where the earlier ones are terse. No eval covers it.
- Companion behaviour on fixtures added after this check: business fixtures still being built may contain files that the grep matches.
