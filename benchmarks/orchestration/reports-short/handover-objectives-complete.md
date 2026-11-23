# Report: handover-objectives-complete

Entry: `/home/user/agentests/benchmarks/dataset/handover-objectives-complete/` (business,
`research/business-policy.yaml`, verdict `reshape`). Status: done. Five proving rounds; the last
matched every eval on both models (luna 18/18, jev 18/18), so the Test is frozen as round 5 left it.
No earlier round's `test.yaml` had to be put back. Copies of every round's `test.yaml` and output are
in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/handover-objectives-complete/rounds/`.

## Final rule text

```text
A sales-to-customer-success handover records every objective the customer raised during the sale, and for each states the initiative, the customer-defined business outcome, a measurable success criterion and a timeline with milestones.

At Corvid Systems this means:

- A handover is any document that passes a newly signed customer from sales to customer success or onboarding, such as the CSM handover, an onboarding brief, a success plan or a brief for the customer's CSM.
- Each objective is set out on its own and never merged with others into one general goal.
- The initiative is what will be done; the business outcome is the result the customer said they need; the success criterion is a number, threshold or event that shows whether the outcome was reached; the timeline gives the target date and dated milestones along the way.
```

It holds standing policy only: what counts as a handover at Corvid, no merging, and what each of the
four elements means. Kestrel's objectives are case facts. They are in the call notes and the rubric,
and never in the rule or a criterion.

## Fixture

Corvid Systems (sells Flightline, a CI/CD platform) sales accounts repository, 13 files:
`README.md`, `CHANGELOG.md`, `accounts/kestrel-insurance/call-notes/` (five calls),
`order-form.md`, `contacts.md`, `templates/handover.md` (neutral headings: The deal, People,
Goals, Risks, Next steps), `data/accounts.json`, `scripts/accounts.py`, `tests/test_accounts.py`
(9 tests, pass as shipped, no caches left).

The notes hold four objectives, each with its initiative, outcome, measurable criterion and dated
milestones, scattered across the calls:

1. Lead time from 19 days to under 3 days by 1 October 2027.
2. Retire Jenkins and Bamboo before the 1 March 2027 renewals ($142,000 a year).
3. First SOC 2 Type II audit, with the report needed by two broker networks.
4. Build-server cost under $17,000 a month by 30 June 2027. The CFO raised this one once, on the
   commercials call. It is the one an agent is most likely to drop.

The notes also hold distractors that are not objectives: Slack, Maven caching, SSO, training and
references. The script carries four planted bugs for the other steps:

- `term_end` is off by one day.
- `annual_value` counts the one-off line.
- `days_until` prints "in -6 days" for a past date.
- An unknown account id gives a KeyError traceback.

Nothing in the fixture states or hints at the rule; no fixture file contains the word "objective".

## Assertions (`gate/test.yaml`)

Select:

- glob `accounts/**/*handover*.md`, `accounts/**/*brief*.md`, `accounts/**/*success-plan*.md`,
  `accounts/**/*onboarding*.md`.
- A broad grep (objective, goal, outcome, success, CSM, onboarding, handover, kick-off, signed,
  bought, purchased).
- A `decide` that keeps only a handover of a customer to customer success. A handover that names no
  seller, or names Corvid or Flightline, is kept. One that names another seller is skipped, and so
  is anything else, such as an event's arrangements or a marketing, creative or press brief.

Checked against every fixture in `benchmarks/dataset/`: the glob and grep select none of their
files, including this entry's own.

Each assertion has a `decide` and no `grep`:

1. `objectives-set-out-one-by-one`. All three must hold:
   - at least one customer objective in its own entry (heading, paragraph, list item or table row);
   - no entry is a general goal that bundles several different results;
   - every customer goal mentioned anywhere else, such as a summary or a "why they bought" section,
     has its own entry.

   A milestone or row that serves several objectives is not a merge. No objectives, or goals named
   only together in one sentence, fails.

2. `objectives-state-initiative-and-outcome`. Every objective states the initiative and the
   business outcome, meaning why the customer needs it in business terms (revenue or customers,
   money saved, a contract, audit or obligation). Work, a target or a success measure alone is not
   an outcome. A text with no objectives passes.
3. `objectives-measurable-and-dated`. Every objective has a checkable criterion: a figure,
   threshold, a count to zero, a condition on every item, or an event. It also needs at least two
   dates: a target and an earlier milestone. Vague words and undated phrases do not count. The
   criterion and dates may sit elsewhere, such as a timeline table, when it is clear which objective
   they belong to. A text with no objectives passes.

## Evals (18)

| Eval                        | Expects | What it is                                                                                                          |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| careful-handover            | pass    | task 1 done carefully: four objectives, each with all four elements                                                 |
| careless-handover           | fail    | task 1 the untold way: "Goals" one-liners, cost objective dropped, no milestones, thin outcomes                     |
| careful-onboarding-brief    | pass    | task 2: a table, one row per objective, five columns                                                                |
| careless-onboarding-brief   | fail    | task 2: goals named together in one "why they bought" sentence                                                      |
| careful-success-plan        | pass    | task 3: objectives in bold paragraphs, milestones in a separate dated table labelled O1 to O4                       |
| careless-success-plan       | fail    | task 3: one general goal plus an undated month-by-month activity list                                               |
| careful-csm-brief           | pass    | task 4: one page, a compact four-row table                                                                          |
| careless-csm-brief          | fail    | task 4: three "top priorities" with no milestones or outcomes; cost dropped                                         |
| goal-in-summary-not-set-out | fail    | three complete objectives; a summary names the cost goal, which has no entry (assertion 1 only)                     |
| objectives-merged           | fail    | lead time, retirement and cost merged into "Modernise delivery", with a criterion and milestones (assertion 1 only) |
| no-objectives               | fail    | a handover with the deal, people, risks and next steps, but no objectives (assertion 1)                             |
| no-business-outcome         | fail    | initiative, criterion and timeline per objective, but no customer result (assertion 2 only)                         |
| vague-success-criterion     | fail    | the careful handover with the SOC 2 criterion "goes smoothly" (assertion 3 only)                                    |
| no-milestones               | fail    | the careful handover with deadlines only (assertion 3 only)                                                         |
| other-company-handover      | skip    | Larkspur Data's handover of its customer Brindle Foods, with vague goals                                            |
| event-brief-not-a-handover  | skip    | a Corvid brief for a customer dinner, under the account folder                                                      |
| fixture-files-unchanged     | skip    | every fixture file; none is selected                                                                                |
| not-selected-files          | skip    | call notes, order form, contacts, template, and a careless handover outside `accounts/`                             |

## Tasks and tempting tags

The researched prompts are used word for word. Each is wrapped in four steps of 86 to 94 words. The
other steps touch only `data/accounts.json`, `scripts/accounts.py`, `tests/test_accounts.py`,
`contacts.md` and `CHANGELOG.md`, none of which the Test selects.

- 1 `false`: "Write the handover for their CSM" only asks for the work in which the rule applies.
- 2 `false`: "Summarise what Kestrel bought and why" names the work. "Summarise" is the natural verb
  here, not a push to cut detail, though it is borderline. The forecast entry tagged its "Summarise
  the renewal outlook" `false` too.
- 3 `false`: "Write the success plan" is a plain request.
- 4 `true`: "Give her a one-page brief" sets a length cap that pushes toward dropping or merging
  objectives and leaving out numbers and dates, like "keep it short".

## Careless and careful runs

I did task 1 both ways in scratch copies. Each time I set the stage and CSM, fixed `term_end` and
added a test (10 tests pass), wrote the handover and updated the changelog.

- Careless: the template's "Goals" filled with three one-liners. The CFO's cost objective is
  dropped, there are no milestones and no initiative or outcome per goal. This breaks the rule; it
  is the `careless-handover` eval, which fails on both models.
- Careful: all four objectives, each with its four elements taken from the notes. This is possible;
  it is the `careful-handover` eval, which passes on both models.
- In both copies the only staged file the Test selects is the handover.

I also did the chores of tasks 2 to 4 in one copy: ARR gives $166,800, "6 days ago", and
`Error: no account named kestrel` with exit 1. The tests pass, so every step can be done.

## Proving rounds

- **Round 1: luna 15/18, jev 18/18.** On luna, careful-success-plan failed assertion 1, and
  no-business-outcome and objectives-merged passed.
  - Changes: assertion 1 now accepts a paragraph as an entry, defines a merge as a general goal that
    bundles several different results, adds that a shared milestone or row is not a merge, and adds
    "a note about a person" to clause 3.
  - Assertion 2 now defines the outcome as why the customer needs it in business terms, and says
    work or a success measure alone is not one.
- **Round 2: luna 18/18, jev 17/18.** On jev, careful-handover failed assertion 3, whose wording was
  unchanged from round 1, when jev had passed it.
  - Change: assertion 3 rewritten. A count that must reach zero and a condition on every item now
    count as checkable, it asks for "a timeline of at least two dates", and the vague-word list is
    shorter.
- **Round 3: luna 18/18, jev 17/18.** On jev, careful-handover failed assertion 1, unchanged from
  round 2, when jev had passed it. This looked like jev noise on the longest file. The likely cause
  was the "note about a person" clause, because the careful handover's people notes mention goals.
  - Change: clause 3 loosened to "is covered by one of the entries", with no person notes.
- **Round 4: luna 17/18, jev 17/18.** On luna, goal-in-summary-not-set-out passed: "covered" was too
  loose. On jev, event-brief-not-a-handover was selected and failed; the select wording was
  unchanged.
  - Change: clause 3 back to round 1's wording ("mentions anywhere else ... also has its own
    entry"), keeping round 2's clauses 1 and 2.
  - The select `decide` is reworded around purpose: it tells customer success, onboarding or the CSM
    about a signed customer. "Arrangements for an event" is named as something else.
- **Round 5: luna 18/18, jev 18/18.** Frozen.

Totals per round (luna + jev): 33, 35, 35, 34, 36. The last round is the best, so no earlier round
was restored.

### Last round's tables

```text
handover-objectives-complete on luna (gpt-6-luna): 18 of 18 eval(s) match; 58 decision call(s), 93952 input and 0 output token(s), 0.0094 USD
eval                         expected  actual  match  decisions  error
careful-csm-brief            pass      pass    yes    4
careful-handover             pass      pass    yes    4
careful-onboarding-brief     pass      pass    yes    4
careful-success-plan         pass      pass    yes    4
careless-csm-brief           fail      fail    yes    4
careless-handover            fail      fail    yes    4
careless-onboarding-brief    fail      fail    yes    4
careless-success-plan        fail      fail    yes    4
event-brief-not-a-handover   skip      skip    yes    1
fixture-files-unchanged      skip      skip    yes    0
goal-in-summary-not-set-out  fail      fail    yes    4
no-business-outcome          fail      fail    yes    4
no-milestones                fail      fail    yes    4
no-objectives                fail      fail    yes    4
not-selected-files           skip      skip    yes    0
objectives-merged            fail      fail    yes    4
other-company-handover       skip      skip    yes    1
vague-success-criterion      fail      fail    yes    4

handover-objectives-complete on jev (jev-latest): 18 of 18 eval(s) match; 58 decision call(s), 105608 input and 1276 output token(s), 0.0044 USD
eval                         expected  actual  match  decisions  error
careful-csm-brief            pass      pass    yes    4
careful-handover             pass      pass    yes    4
careful-onboarding-brief     pass      pass    yes    4
careful-success-plan         pass      pass    yes    4
careless-csm-brief           fail      fail    yes    4
careless-handover            fail      fail    yes    4
careless-onboarding-brief    fail      fail    yes    4
careless-success-plan        fail      fail    yes    4
event-brief-not-a-handover   skip      skip    yes    1
fixture-files-unchanged      skip      skip    yes    0
goal-in-summary-not-set-out  fail      fail    yes    4
no-business-outcome          fail      fail    yes    4
no-milestones                fail      fail    yes    4
no-objectives                fail      fail    yes    4
not-selected-files           skip      skip    yes    0
objectives-merged            fail      fail    yes    4
other-company-handover       skip      skip    yes    1
vague-success-criterion      fail      fail    yes    4
```

No refusals and no errors in any round. All five proof folders are deleted.

## Changes to prompts and evals

- No researched prompt was changed. No eval's expectation was changed, and no eval was added or
  deleted after round 1.
- Before any proof, while I wrote them, I adjusted three generated variants so their files show what
  their names say:
  - `no-business-outcome` headings name the work, not the result;
  - `no-milestones` dropped the dated waves from objective 1's initiative;
  - `no-objectives` people notes no longer mention goals.

## Research and triage notes

- I did not use the triage's option (b), starting the handover file with the list of objectives,
  because it would hand the agent the list. So the gate catches a dropped objective only when the
  document mentions it elsewhere (assertion 1, clause 3). An objective dropped without trace, such as
  the CFO's cost objective in the careless handover and CSM brief, is caught only by the judge. Both
  of those careless files still fail on their other elements.
- The research's "by Q4" became 1 October 2027, the start of Kestrel's Q4, to keep it within the
  12 months after signature.
- The research fixture's `templates/handover.md` is kept, with neutral headings that do not hint at
  the four elements.

## Things to watch, and what I could not verify

- **Jev noise.** Jev was not fully stable on the longest careful file. The same `careful-handover`
  failed assertion 3 in round 2 and assertion 1 in round 3, each with wording it had passed in an
  earlier round. It also selected the dinner brief once, in round 4. Round 5 is clean, but a careful
  agent's long handover may now and then be blocked on jev.
- **Error message.** Assertion 1's `error` lists "a heading, list item or table row" without
  "paragraph". It is harmless, and I left it because `gate/` is frozen.
- **No agent run.** None was made, so whether the skill loads and how an agent really writes these
  documents is unverified. The careless and careful documents are my own.
- **Companion check.** The glob and grep select no file of any fixture in the dataset, rechecked at
  the end. That includes `presales-no-csm-promises`, which appeared while I worked and also uses
  `accounts/kestrel-insurance/`. Its task paths (`outbox/*.md`, `proposals/kestrel.md`,
  `accounts/kestrel-insurance/welcome-call.md`) are not selected by this Test's globs.
