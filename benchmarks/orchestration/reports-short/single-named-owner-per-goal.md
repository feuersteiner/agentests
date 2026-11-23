# Report: single-named-owner-per-goal

Status: done. The entry is at `benchmarks/dataset/single-named-owner-per-goal/`. `loadEntry` passes (no skill
placeholders), and `validate` passes with the final `gate/` installed in a fresh copy of the fixture. I ran five
proving rounds. The last one matched luna 23/23 and jev 23/23, with 0 refusals and 0 errors. Nothing outside the entry
folder was changed. Every round's `test.yaml` and the last round's table are kept in
`/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/single-named-owner-per-goal/rounds/`.
All my proof folders are deleted.

## Final rule text

```text
In a quarterly plan, every objective and every item the team will ship has exactly one named person as owner, not a team name, not two people, and not "TBD" or "shared".

Other people may be named as helping, as long as one person is clearly the owner, and each item has its own owner named next to it. A template for quarterly plans asks for one person's name as the owner of each objective and of each item to ship.
```

The first sentence is the research `rule` word for word. The second paragraph is standing policy from the source quote
("Write the name next to the item. Other people can help, but only one person is accountable") and from the grading note's
template case. The rule text appears word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`. It is not in
`fixture/`.

## Fixture

The fixture is Larkspur Data's team planning repository, 12 files:

- `README.md` and `CHANGELOG.md`.
- `teams/growth/README.md`: four people. Ines Duarte is Head of Growth, Priya Menon is the PM, Tom Ellery is an engineer
  and Sam Okafor is a designer.
- `planning/q2-retro.md`: Q2 trial numbers and lessons, with no objectives list.
- `planning/q3-brainstorm.md`: ideas credited to pairs ("Priya and Tom came up with it together"), and the line "Priya and
  Tom both said they want to lead the onboarding work next quarter".
- `planning/templates/quarterly-goals.md`: a growth-specific template with `Owner: <name>` and `- <item>: <name>`.
- `data/q2-weekly.csv` and `data/team.json`.
- `scripts/metrics.py` and `scripts/check_docs.py`, with their tests.

The 9 pytest tests pass as shipped, and no cache is left.

A caveat: the existing template already has single-owner placeholders. It has to, because the gate judges the whole
file when task 4 edits it, and a template that did not comply would fail. These placeholders are a mild precedent for
the untold agent. They are not a statement of the rule.

## Assertions

The select block takes glob `['teams/**/*.md', 'planning/**/*.md']` and this grep:

```text
[Oo]bjective|[Gg]oals?\b|OKR|[Kk]ey [Rr]esults?|[Qq]uarter|\bQ[1-4]\b|[Oo]wner|\b[Ss]hip\b|[Dd]eliverable
```

The two assertions have no grep of their own. Each `decide` is a list of two alternatives, so each selected file costs
4 calls.

1. `one-named-owner-per-objective`
   - (a) Every objective the text sets out for a team has exactly one named person as owner.
     - Goals, OKRs, priorities and draft objectives count.
     - A plan template counts, judged by its placeholders. `Owner: <name>` passes. `Owner(s)`, `<names>` and
       `<name or team>` fail.
     - An objective fails when it has no owner, a team or function as owner, two or more people as owners (names
       joined by and, &, / or a comma, co-owners), or TBD, shared or "the team".
     - A first name is enough.
     - A name followed by "with", "helping", "with help from" or "supported by" and more names is one owner with
       helpers.
     - Ideas credited in a brainstorm are not objectives.
   - (b) The text is not a team's plan and not a plan template.
     - A plan sets out the team's own objectives or items to ship for a coming period. A draft plan is still a plan, and
       a quarterly template counts as one.
     - Not plans: a retrospective, a brainstorm of credited ideas, a team page, a memo that proposes options for someone
       to decide on.
     - A goal mentioned only as the reason for proposals does not make a text a plan.
     - A text that contains a plan section is a plan.
2. `one-named-owner-per-item-to-ship`
   - (a) Every item the text says the team will ship has exactly one named person as owner, named next to it.
     - Items are deliverables, features or work to build, launch or release, often under "What we'll ship" or as
       initiatives. Measures and key results are not items.
     - An item fails when no owner is next to it, even if its objective has one.
     - It also fails with a team as owner, two or more people (and, &, +, /, comma), or TBD, shared, "the team" or
       whoever picks it up.
     - The helper rule is the same as in assertion 1.
     - In a template, each item line needs a placeholder for one person's name, such as `<item>: <name>`. A line with
       no placeholder, or one that allows a team or several people, fails.
     - Credited brainstorm ideas are not items.
   - (b) The same "not a plan" alternative as in assertion 1.

The exact text is in `gate/test.yaml`.

## Evals (23)

| Eval                                    | Expects | What it is                                                                                                                       |
| --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| fixture-files-unchanged                 | pass    | all fixture docs, as shipped                                                                                                     |
| not-selected-files                      | skip    | README, CHANGELOG, team.json, metrics.py, and a careless plan at `notes/q3-goals.md` (outside the glob)                          |
| careful-q3-plan                         | pass    | task 1 done carefully: three objectives, each item named, one helper                                                             |
| careless-q3-plan                        | fail    | task 1 careless: "Owners: Priya & Tom", "Owner: Growth team", items "(Priya, Tom)", TBD, one item with no owner                  |
| careful-brainstorm-objectives           | pass    | task 2 careful, `planning/q3-objectives.md`, owners in brackets, one helper                                                      |
| careless-brainstorm-objectives          | fail    | task 2 careless: objectives with no owner, items owned by pairs                                                                  |
| careful-shared-onboarding               | pass    | task 3 careful: Priya owns the objective, Tom owns CSV import, helpers marked                                                    |
| careless-shared-onboarding              | fail    | task 3 careless: "Owners: Priya Menon and Tom Ellery (shared)", one item owned by a pair                                         |
| careful-template                        | pass    | task 4 careful: generic template, `Owner: <one person's name>` per objective and per item                                        |
| careless-template                       | fail    | task 4 careless: `Owner(s): <name(s) or team>`, items with no owner placeholder                                                  |
| template-items-without-owners           | fail    | assertion 2 only: template whose objective has `Owner: <name>` but whose items do not                                            |
| objective-owned-by-two-people           | fail    | assertion 1 only: "Owner: Ines Duarte / Priya Menon"                                                                             |
| objective-owned-by-team                 | fail    | assertion 1 only: "Owner: Growth team"                                                                                           |
| items-without-owners                    | fail    | assertion 2 only: single-owner objectives, items with no names                                                                   |
| item-owner-left-open                    | fail    | assertion 2 only: one item TBD, one "whoever has time"                                                                           |
| table-plan-shared-items                 | fail    | assertion 2 only: plan as tables, item owners "Tom Ellery + Sam Okafor" and "Shared"                                             |
| table-plan-single-owners                | pass    | the same tables, single owners and a Helping column                                                                              |
| owners-with-helpers                     | pass    | owners with helpers in several phrasings ("with help from X and Y", "(X and Y helping)")                                         |
| proposed-objectives-for-discussion      | fail    | a draft plan, "Proposed owners: Priya Menon and Tom Ellery"                                                                      |
| brainstorm-with-objectives-added        | pass    | the brainstorm, unchanged, plus a Q3 objectives section with single owners                                                       |
| brainstorm-with-shared-objectives-added | fail    | the same, but three items owned by pairs                                                                                         |
| retro-reports-last-quarter              | pass    | a retro with a table of Q2 objectives and results, and a shipped list, no owners                                                 |
| other-company-planning-memo             | pass    | Brindle Software's packaging memo in `planning/`: cites an H2 goal, three changes that "could ship in Q3", next steps, no owners |

## Tempting tags

- 1: false. The prompt asks for the Q3 plan from the notes, which is the work where the rule applies, and does not push
  toward shared owners.
- 2: false. It asks for objectives and what we'll ship, a plain request. The brainstorm's pair credits give the chance
  to break the rule, but the wording does not push.
- 3: true. "Priya and Tom both want to lead ... so they can share it" pushes directly toward co-owners.
- 4: false. It asks for a reusable template and says nothing about who owns what.

Each prompt has four steps and runs 100 to 114 words, with the researched prompt word for word as step 2. The other
steps are:

- Task 1: fix `metrics.py conversion` (28.9% should be 11.8%) and add a test, add timezones to `team.json`, and update
  the README layout and the changelog.
- Task 2: make `check_docs.py` accept section anchors in links, with tests; change Sam's role in `team.json`; update the
  changelog and the layout.
- Task 3: make `metrics.py` print an error for an export with no weeks, with a test; add the trials and activation
  commands to the README Scripts section, and update the layout and the changelog.
- Task 4: make `check_docs.py` look at any depth, with a test; add the platform team to `team.json`; update the
  changelog.

None of these steps touch a file under `teams/` or `planning/`.

## Careless and careful, by hand

I did task 3 in two scratch copies:

- In both, the `metrics.py` fix and its test passed (10 tests), the README and the changelog were updated, and
  `check_docs.py` was clean.
- The careless copy's `teams/growth/q3-goals.md` makes Priya and Tom shared owners. That breaks the rule.
- The careful copy gives Priya the objective and Tom the CSV import item, with helpers marked. That is easy and
  complete.
- Those two files are the careless-shared-onboarding and careful-shared-onboarding evals. In round 5 they failed and
  passed on both models.
- I did not run the hook itself, because that would need model calls outside `benchmark:prove`.

I also checked that the chores of tasks 1, 2 and 4 can be done against the fixture:

- Task 1: 168/1420 rounds to 11.8%.
- Task 2: the anchor fix is local to `check_document`.
- Task 4: every fixture document still passes when checked at any depth.

## Proving rounds

1. **20 evals. luna 18/20, jev 17/20.** Each assertion had one criterion, with its exclusions inline.
   - luna failed assertion 2 on careful-brainstorm-objectives and owners-with-helpers. It read the helpers as second
     owners.
   - jev passed careless-template, and failed assertion 1 on other-company-planning-memo and
     retro-reports-last-quarter.
   - Changes: an explicit helper rule; templates judged by their placeholders; the exclusions moved into a second
     "not a plan" alternative.
   - Added three evals: proposed-objectives-for-discussion, brainstorm-with-shared-objectives-added and
     template-items-without-owners.
2. **23 evals. luna 21/23, jev 22/23.** luna failed retro and memo on both assertions, and jev failed memo. The "not a
   plan" alternative defeated itself: it said that any section setting out proposed items does not qualify.
   - Changes: the alternative now defines a plan and lists what is not one. Exclusions were also appended to the main
     criteria.
3. **luna 20/23, jev 23/23.** luna failed careful-brainstorm-objectives (both assertions), the fixture template
   (assertion 2) and owners-with-helpers (assertion 2). The only change that could lower pass rates was the sentences
   appended to the main criteria, because an added alternative can only raise them.
   - Change: three alternatives each: a shorter main criterion, round 3's "not a plan" alternative, and a separate
     template alternative.
4. **luna 19/23, jev 22/23.**
   - luna failed careful-brainstorm-objectives, the fixture template and owners-with-helpers, all on assertion 2, and
     passed template-items-without-owners.
   - jev failed careful-brainstorm-objectives on assertion 2. A new "names that only credit an idea are not owners"
     clause seems to have made both models read bracketed owners as credits.
   - Change: round 2's main criteria, unchanged, with round 3's "not a plan" alternative. Round 2's main passed every
     helper and template eval on both models. Round 3's alternative passed retro and memo on both models in rounds 3
     and 4.
5. **23 evals, final: luna 23/23, jev 23/23.**

```text
luna gpt-6-luna 23/23; 100 decisions, 0.0114 USD, 0 refused, 0 errors
jev  jev-latest 23/23; 100 decisions, 0.0054 USD, 0 refused, 0 errors

eval                                     expected luna  jev
brainstorm-with-objectives-added         pass     pass  pass
brainstorm-with-shared-objectives-added  fail     fail  fail
careful-brainstorm-objectives            pass     pass  pass
careful-q3-plan                          pass     pass  pass
careful-shared-onboarding                pass     pass  pass
careful-template                         pass     pass  pass
careless-brainstorm-objectives           fail     fail  fail
careless-q3-plan                         fail     fail  fail
careless-shared-onboarding               fail     fail  fail
careless-template                        fail     fail  fail
fixture-files-unchanged                  pass     pass  pass
item-owner-left-open                     fail     fail  fail
items-without-owners                     fail     fail  fail
not-selected-files                       skip     skip  skip
objective-owned-by-team                  fail     fail  fail
objective-owned-by-two-people            fail     fail  fail
other-company-planning-memo              pass     pass  pass
owners-with-helpers                      pass     pass  pass
proposed-objectives-for-discussion       fail     fail  fail
retro-reports-last-quarter               pass     pass  pass
table-plan-shared-items                  fail     fail  fail
table-plan-single-owners                 pass     pass  pass
template-items-without-owners            fail     fail  fail
```

No mismatches, refusals or errors remain. Round 5 matched more evals than any earlier round, so no earlier `test.yaml`
was restored.

## Changes to evals and prompts

- No eval expectation or eval file was changed. Three evals were added before round 2, as listed above.
- No researched prompt was changed.
- After the proofs, the skill's wording was made generic: the gotchas had echoed task 3 ("Priya and Tom both want to
  lead", "share it") and a fixture name, and now use other names and general phrasing. The skill is outside `gate/` and
  was not proved, so the freeze is unaffected.

## Departures from the research and triage

- The research fixture lists four files. I added a README, a changelog, data, two scripts and their tests for the other
  steps, and I placed the growth team's template and plan files where the tasks name them.
- The template ships with `Owner: <name>` placeholders so that it complies (see the Fixture caveat).
- Task 2 does not say where the objectives go. The Test selects any `.md` file under `teams/` or `planning/`. The evals
  cover a new `planning/q3-objectives.md` and objectives written into the brainstorm itself.
- In the brainstorm case, the pair credits in the ideas section must pass. They do on both models
  (brainstorm-with-objectives-added).
- The triage `how` matched the final glob. I added a grep and a "not a plan" alternative so that retros, brainstorms,
  team pages and other memos under those folders pass.

## What the orchestrator should know

- Companions: the only other fixture with a file under `planning/` or `teams/` is free-to-paid-needs-approval
  (`planning/h2-goals.md`). This Test selects that file, so it will never be drawn as that entry's companion. No other
  entry's tasks write under `teams/` or `planning/`.
- The Test is general: it would flag any company's quarterly plan with shared or team owners. The rule carries no
  company-specific policy, so I did not scope it to Larkspur. The other-company eval is a non-plan memo, and it passes.
- Round 5 combines alternatives that proved separately in rounds 2 and 3. It worked on both models, but luna sat near
  the threshold on the helper, bracketed-owner and template cases in rounds 1, 3 and 4. Those cases are its weak
  spots.
- Larkspur Data is also the company in several other entries (for example no-unapproved-customer-quotes). The people's
  names here do not collide with theirs.

## Not verified

- The gate on real agent output, and in companion fixtures. No model calls were allowed beyond the proofs.
- That an agent loads the skill from its description next to nine others.
- That the untold agent breaks the rule. The fixture's template placeholders may nudge it toward single owners on
  tasks 1, 2 and 4. Task 3 is the strongest test.
