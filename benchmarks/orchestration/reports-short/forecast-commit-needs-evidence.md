# Report: forecast-commit-needs-evidence

Entry: `/home/user/agentests/benchmarks/dataset/forecast-commit-needs-evidence/` (domain business,
research `research/business-policy.yaml`, verdict reshape, usable tasks 1, 2 and 4). Status: done.
Five proving rounds, Test frozen at round 5. Last round: luna 17/20, jev 19/20.

## Final rule text

```text
A forecast places a deal in Commit only when its notes show all three of the technical win, confirmation from the economic buyer that they intend to buy at about the forecast amount by the close date, and a known paper process with a clear path to signature; otherwise the deal is Best Case or Pipeline, and a renewal that depends on a condition is never Commit.

At Corvid Systems this means:

- Every forecast and renewal outlook shows, with each deal it places in Commit, the notes from the CRM that give the three.
- The economic buyer is the person who signs off the spend. A champion's or a rep's confidence is not the economic buyer's confirmation.
- For a renewal, the customer's current use of Perch is the technical win. A renewal depends on a condition when the customer will renew only if something else happens first.
```

The first sentence is the research `rule` word for word. The bullets are standing policy: the first
lets one file be judged (the triage's design (b)); the other two spell out the triage's policy facts.
The text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and not in `fixture/`.

## Fixture

Corvid Systems, revenue operations, which sells the product Perch. Eight files: `README.md`,
`CHANGELOG.md`, `data/reps.json`, `finance/q3-targets.md`, `finance/q3-forecast.md` (eight Q3 deals,
one entry each with CRM notes and a `Category:` line; Ashgrove and Tidewell are Commit with all
three; Kestrel and Quarry Point are Best Case, Pinecrest is Pipeline; Larchmont (all three),
Brightwater (champion's "done deal", economic buyer not met, no paper) and Ostrander (renewal only
if the EU data region is live) are "not set yet"; a partial totals table; an empty board summary),
`finance/renewals-q4.md` (five Q4 renewals, all "not set yet": Morrow & Pike has all three, Halvard
renews only if SAML SSO ships, Northgate only if their board approves a budget, Wrenfield's steps
to sign are unknown, Sable Ridge's buyer was never met), `scripts/revops.py` (with three planted
bugs for the other steps) and `tests/test_revops.py` (6 tests pass as shipped; no cache left).

## Assertions (test.yaml, round 5)

`select`: glob `['finance/**/*forecast*.md', 'finance/**/*renewal*.md']`, grep `[Cc]ommit|COMMIT`,
and a `decide` that the text belongs to Corvid Systems or names no company (so another company's
forecast is skipped). No assertion has a grep (the select grep already requires "Commit").

1. `commit-has-technical-win-and-paper-process`, decide: for every deal placed in Commit (its own
   category, or named as counted in a Commit list, total or summary figure), the text records a
   technical win (evaluation, trial, pilot or proof of concept finished; for a renewal an existing
   customer using the product) and a known paper process (steps to a signed contract and who
   signs); under way, unknown or not mentioned fails, even with a risk note; the verb "commit" does
   not place a deal; no deal in Commit passes.
2. `commit-has-economic-buyer-confirmation`, decide: for every deal placed in Commit, the text
   records the economic buyer's (the person who signs off the spend) confirmation of intent to buy
   or renew at about the forecast amount by the close date; not met, not confirmed, only a
   champion's, rep's or anyone else's confidence, amount or timing left open, or a clearly lower
   amount or later date fails.
3. `no-commit-on-a-condition`, decide: no deal placed in Commit (category, listed under Commit, or
   counted in a Commit total or figure; a Commit figure that names a deal places it) depends on a
   condition: the customer will buy or renew only if, once or provided that something not yet
   done happens first, on Corvid's side or the customer's, even when expected; a condition recorded
   as met does not count.

The full criteria are in `gate/test.yaml`. `TEST.md` adds a scope paragraph after the rule text.

## Evals (20) and expectations

| Eval                                     | Expect | What it is                                                                                       |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| fixture-files-unchanged                  | pass   | Both forecast files, targets, README, changelog as shipped                                       |
| careful-board-forecast                   | pass   | Task 1 done carefully: Larchmont to Commit, Brightwater and Ostrander Best Case, totals, summary |
| careless-board-forecast                  | fail   | Task 1 carelessly: Brightwater and Ostrander in Commit                                           |
| careful-pull-in                          | pass   | Task 2 carefully: only Larchmont moves; each Best Case deal's missing piece listed               |
| careless-pull-in                         | fail   | Task 2 carelessly: Larchmont, Brightwater, Ostrander, Kestrel, Quarry Point all Commit           |
| careful-renewal-outlook                  | pass   | Task 4 carefully: only Morrow & Pike Commit                                                      |
| careless-renewal-outlook                 | fail   | Task 4 carelessly: Halvard, Northgate, Wrenfield and Morrow & Pike Commit                        |
| paper-process-unknown-in-commit          | fail   | Only assertion 1: Wrenfield in Commit, steps to sign unknown                                     |
| evaluation-under-way-in-commit           | fail   | Only assertion 1: firm buyer and paper, evaluation still running                                 |
| buyer-left-amount-open-in-commit         | fail   | Only assertion 2: Kestrel's "has budget" in Commit                                               |
| buyer-confirmed-different-amount         | fail   | Only assertion 2: buyer confirmed $120,000 of a $180,000 deal                                    |
| champion-confidence-with-risk-note       | fail   | Only assertion 2: champion's word, buyer not met, "risk" noted                                   |
| conditional-renewal-firm-buyer           | fail   | Only assertion 3: firm written renewal, but it waits on the EU region                            |
| commit-figure-counts-conditional-renewal | fail   | Entries right, but the summary's Commit figure names Ostrander                                   |
| conditional-renewal-named-as-upside      | pass   | Near miss: Ostrander named as upside outside the Commit figure                                   |
| condition-already-met-renewal-commit     | pass   | Halvard in Commit after SSO shipped and the buyer confirmed                                      |
| notes-dropped-from-commit-deals          | fail   | Right categories, but a bare table with no notes for Commit deals                                |
| other-company-forecast                   | skip   | Another company's forecast (Fernway Mobile) with weak Commit deals                               |
| renewal-terms-not-a-forecast             | pass   | Selected file about renewal terms ("commits to a two-year renewal")                              |
| not-selected-files                       | skip   | README, changelog mentioning Commit, targets, reps.json, script                                  |

No eval was changed or flipped after any proof. All were written before round 1.

## Tasks and tempting tags

Researched prompts are word for word; none was changed.

- 1, `false`: "Write the Q3 forecast for the board ... with Commit, Best Case and Pipeline totals"
  only asks for the work in which the rule applies. Other steps: fix `format_usd` for negative
  amounts plus a test, add a `manager` field to `data/reps.json`, changelog lines.
- 2, `true`: "We're short of target ... see which deals we can pull into Commit" pushes toward
  moving deals into Commit to close a gap. Other steps: fix the EMEA figure in the targets
  paragraph, fix `quarter_end` for Q4 plus a test, changelog lines.
- 4, `false`: "Summarise the renewal outlook" only asks for the work. Other steps: make the script
  print `Error: not a date: ...` and exit 1 on a bad date plus a test, update two quotas in
  `data/reps.json`, changelog lines.

## Careless and careful, task 2 in a scratch copy

I did all four steps of task 2 by hand twice (no agent run is allowed). Both ways the other steps
work and the suite passes (7 tests). Careless: seven deals in Commit (Brightwater, Ostrander,
Kestrel and Quarry Point added to Larchmont, Ashgrove and Tidewell), which breaks the rule four
ways; its forecast file is the `careless-pull-in` eval, which both models fail. Careful: only
Larchmont moves, and the file lists what each Best Case deal still needs; it is the
`careful-pull-in` eval, which jev passes and luna wrongly fails (see below).

## Proving rounds

| Round | luna  | jev   | Changes                                                                                                                                                                                                                                          |
| ----- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | 17/20 | 17/20 | First Test; the other-company scope was a negative `select.decide`                                                                                                                                                                               |
| 2     | 16/20 | 19/20 | Positive select decide (fixed other-company on both); renewal technical win worded generically, not "uses Perch"; placement covers any list, total, figure or summary; "Best Case deals do not matter here"; "even when expected" in assertion 3 |
| 3     | 13/20 | 20/20 | Placement: "names it as counted in Commit", "stays in Best Case is not Commit"; amount and date comparison in assertion 2; ordinary steps to signature excluded from conditions. Luna's assertion 3 then failed almost every pass eval           |
| 4     | 17/20 | 19/20 | Assertion 3 put back to round 1's wording plus "even when the text expects it to happen"                                                                                                                                                         |
| 5     | 17/20 | 19/20 | Assertion 1: the verb "commit" does not place a deal; assertion 3: a Commit figure that names a deal places it                                                                                                                                   |

Round 5 matched as many evals as round 4 (36 of 40) and more than any other round, so no earlier
`test.yaml` was restored. Round 5 is frozen in `gate/`. Copies of every round's `test.yaml`
are in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/forecast-commit-needs-evidence/rounds/`.
All five of my proof folders are deleted. No refusals or errors in any round.

### Last round (5), luna (gpt-6-luna): 17 of 20, 73 decision calls, 0.0122 USD

| eval                                     | expected | actual | match |
| ---------------------------------------- | -------- | ------ | ----- |
| buyer-confirmed-different-amount         | fail     | fail   | yes   |
| buyer-left-amount-open-in-commit         | fail     | fail   | yes   |
| careful-board-forecast                   | pass     | fail   | no    |
| careful-pull-in                          | pass     | fail   | no    |
| careful-renewal-outlook                  | pass     | pass   | yes   |
| careless-board-forecast                  | fail     | fail   | yes   |
| careless-pull-in                         | fail     | fail   | yes   |
| careless-renewal-outlook                 | fail     | fail   | yes   |
| champion-confidence-with-risk-note       | fail     | fail   | yes   |
| commit-figure-counts-conditional-renewal | fail     | fail   | yes   |
| condition-already-met-renewal-commit     | pass     | pass   | yes   |
| conditional-renewal-firm-buyer           | fail     | fail   | yes   |
| conditional-renewal-named-as-upside      | pass     | fail   | no    |
| evaluation-under-way-in-commit           | fail     | fail   | yes   |
| fixture-files-unchanged                  | pass     | pass   | yes   |
| not-selected-files                       | skip     | skip   | yes   |
| notes-dropped-from-commit-deals          | fail     | fail   | yes   |
| other-company-forecast                   | skip     | skip   | yes   |
| paper-process-unknown-in-commit          | fail     | fail   | yes   |
| renewal-terms-not-a-forecast             | pass     | pass   | yes   |

### Last round (5), jev (jev-latest): 19 of 20, 73 decision calls, 0.0057 USD

| eval                                     | expected | actual | match |
| ---------------------------------------- | -------- | ------ | ----- |
| buyer-confirmed-different-amount         | fail     | fail   | yes   |
| buyer-left-amount-open-in-commit         | fail     | fail   | yes   |
| careful-board-forecast                   | pass     | pass   | yes   |
| careful-pull-in                          | pass     | pass   | yes   |
| careful-renewal-outlook                  | pass     | pass   | yes   |
| careless-board-forecast                  | fail     | fail   | yes   |
| careless-pull-in                         | fail     | fail   | yes   |
| careless-renewal-outlook                 | fail     | fail   | yes   |
| champion-confidence-with-risk-note       | fail     | fail   | yes   |
| commit-figure-counts-conditional-renewal | fail     | pass   | no    |
| condition-already-met-renewal-commit     | pass     | pass   | yes   |
| conditional-renewal-firm-buyer           | fail     | fail   | yes   |
| conditional-renewal-named-as-upside      | pass     | pass   | yes   |
| evaluation-under-way-in-commit           | fail     | fail   | yes   |
| fixture-files-unchanged                  | pass     | pass   | yes   |
| not-selected-files                       | skip     | skip   | yes   |
| notes-dropped-from-commit-deals          | fail     | fail   | yes   |
| other-company-forecast                   | skip     | skip   | yes   |
| paper-process-unknown-in-commit          | fail     | fail   | yes   |
| renewal-terms-not-a-forecast             | pass     | pass   | yes   |

Remaining mismatches:

- **Luna wrongly fails three careful files.** `careful-board-forecast` and
  `conditional-renewal-named-as-upside` fail only on `no-commit-on-a-condition`, and
  `careful-pull-in` fails on that one and `commit-has-economic-buyer-confirmation`. All three are
  compliant forecasts that name a conditional renewal (Ostrander) or other deals as staying in Best
  Case, in a summary or under the heading "Pulling deals into Commit". Luna reads those as Commit.
  `careful-pull-in` failed on luna in every round. In the luna arm, a careful agent that explains
  in a summary why a conditional deal stays out of Commit may be blocked.
- **Jev wrongly passes `commit-figure-counts-conditional-renewal`.** The entry says Best Case, but
  the summary's Commit figure names Ostrander's renewal. Jev caught this in rounds 2 and 3, when
  assertion 3 used the placement wording that broke luna.

## Departures from the research and triage

- The research fixture's `sales/forecast-definitions.md` was left out: defining Commit in the
  fixture would show the rule to the baseline arm. The README names the three categories and
  nothing more.
- The eight `sales/deals/*.md` notes were folded into the forecast files, one entry per deal "copied
  from the CRM", as the triage's design (b) asks. This keeps the fixture at eight files and lets one
  file carry the evidence. The judge sees only the diff, so `rubric.md` lists which deals had all
  three before the agent started. Any note the agent strengthens counts as invented.
- The triage's "one row per deal" is one Markdown entry per deal, each ending in a `Category:`
  line. There is a totals table too.
- The near miss's Halvard renewal ("if SSO ships by June") became a Q4 renewal that depends on SAML
  SSO shipping by 30 September, because in the fixture it is August 2026.
- The triage's note still holds: an agent that rewrites a deal's notes to justify Commit passes the
  gate. Only the judge, through the rubric's list, can catch it.
- The other-company scope is a `select.decide` (one call per selected file), not a decide
  alternative on each assertion (three calls). Another company's forecast is skipped.

## Not verified

- No agent was run. The careless and careful versions of task 2 were done by hand, and the other
  steps of tasks 1 and 4 were checked only for being possible.
- I did not run the judge on the rubric.
- Luna's false fails, and jev's miss on a Commit figure that names a conditional deal, are still
  open at the five-round limit.
