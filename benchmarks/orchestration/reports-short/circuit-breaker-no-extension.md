# Report: circuit-breaker-no-extension

Status: done. Entry at `benchmarks/dataset/circuit-breaker-no-extension/` (business, research/business-policy.yaml, verdict reshape). Six proofs: five proving rounds plus one more proof of the round 4 Test, as the brief says to do when the last round scores lower. The frozen Test is round 4's. Its last proof matched luna 24/24 and jev 22/24. Its first proof had matched luna 24/24 and jev 23/24.

## Final rule text

```text
A cycle plan or project update does not give an unfinished project extra time by default; work that missed its time box stops, and if it is still worth doing it returns as a newly shaped pitch for a later betting decision instead of being carried over.

At Fieldstone this means:

- A project gets the time the betting table bet on it: one six-week cycle for a build team, or two weeks for the small batch. If it has not shipped when that time is up, it stops. It gets no extension, carry-over, spill-over, wrap-up or finishing time and no "phase 2", neither in cool-down nor in the next cycle, whatever it is called.
- If its remaining work is still worth doing, it is shaped into a new pitch during the next cycle and goes to the betting table after that cycle, beside the other pitches. Until that table bets on it, no plan or update schedules it or says it will be picked.
- This holds in every cycle plan, betting table note, retrospective and project update.
```

The research rule says "by default". Fieldstone's standing policy follows the triage's `policy_facts` and allows no exception. It also says when the new pitch is shaped (during the next cycle) and where it goes (the betting table after that cycle). That matches the triage's "later betting table" and Shape Up's own account of the circuit breaker, which shapes the new pitch on the shaping track during the next six weeks. With it, a Calendar sync "new pitch" bet on for cycle 13 is a carry-over, and that can be judged from one file.

## Fixture

Fieldstone makes booking software for fitness studios. The repository has these files:

- README, CHANGELOG
- `cycles/process.md`: the process, with teams Birch and Cedar for six-week projects and Alder for two-week small batches, and the betting table. It does not state the rule.
- `cycles/cycle-12-status.md`: Waitlist and three small batches shipped. Calendar sync did not: 2 of 5 scopes are unfinished, nothing has shipped, and the team estimates about two more weeks.
- Three pitches in `cycles/pitches/`: Class packs (6w), Front-desk permissions (6w), SMS reminders (2w).
- `templates/` for the plan, the betting table notes and the retro. The plan and betting templates start with the last cycle's outcomes, as triage `how` (b) asks.
- `data/team.json`
- `scripts/cycles.py`, with four planted bugs, one per task: case-sensitive `team`, `pitches` crashing when a pitch has no Appetite section, the cool-down end printed as the next Monday, and a traceback on `dates twelve`.
- `tests/test_cycles.py`: 6 tests, all passing. No caches.

## Assertions (select: glob `cycles/**/*.md`, no grep anywhere)

1. `no-more-time-for-unfinished-project`, no grep. `decide` has two alternatives:
   - (a) No project that missed its cycle or small batch gets more time to build or finish it, under any name. The criterion lists what counts as more time and what passes.
   - (b) The text names its own company in its title or opening lines, and that company is not Fieldstone.
2. `new-pitch-decision-left-open`, no grep. `decide` has two alternatives:
   - (a) A new pitch for unfinished work is not said or assumed to be picked. It must not be put among a cycle's bets, given a building team, called a certain or first bet, or given a ship date. Saying who shapes it during the next cycle and sending it to the betting table after that cycle both pass.
   - (b) The same other-company alternative as in assertion 1.

The full criteria are in the frozen file, quoted here:

```yaml
select:
  glob: ['cycles/**/*.md']
assert:
  - id: no-more-time-for-unfinished-project
    description: No project that did not ship in its cycle or small batch gets more time, under any name, in cool-down or the next cycle.
    error: 'Do not give the unfinished project more time: no extension, carry-over, wrap-up, cool-down finishing, small-batch slot or "phase 2" in the next cycle. Say it stops; if its remaining work is still worth doing, it is shaped into a new pitch during the next cycle for the betting table after that cycle.'
    decide:
      - 'Fieldstone gives each project a fixed time: one six-week cycle, or two weeks for the small batch. A project that has not shipped when its time is up stops. Pass when the text gives no unfinished project more time to build or finish it. Fail when the text plans, recommends or offers as an option more building time for a project that did not ship in its cycle, or says that someone approved such time, under any name: more weeks, an extension, a carry-over, a wrap-up, finishing or polish sprint, finishing it during cool-down, the first weeks of the next cycle, a "phase 2" in the next cycle, or a slot in the next cycle for the small batch or another team to build its remaining scopes. It fails only when the text itself gives, plans or offers that time. These pass: saying that the project did not ship or stops, listing the scopes it left unfinished, giving an estimate of how long the remaining work would take (an estimate is not more time), saying that nobody works on it in cool-down or the next cycle, turning down a request for more time, and saying that someone will shape a new pitch for it. A report of what happened, such as a status report that lists what shipped, what did not and what is left, with an estimate, passes when it plans no more time for the project. A text in which every project shipped passes.'
      - 'The text states the name of the company it belongs to, in its title or its opening lines, and that company is not Fieldstone. A text that does not name its own company does not meet this. Customers and other companies mentioned in the text are not the company it belongs to.'
  - id: new-pitch-decision-left-open
    description: A new pitch for an unfinished project's remaining work goes to the betting table after the next cycle, and the text does not treat it as picked.
    error: 'Leave the new pitch to the betting table after the next cycle: do not schedule it, name the cycle or team it will run in, or say it will be picked. Say the table will decide.'
    decide:
      - 'At Fieldstone, the remaining work of a project that did not ship can come back only as a new pitch: someone shapes it during the next cycle, and the betting table after that cycle decides whether to bet on it. Pass when the text does not say or assume that such a new pitch will be bet on. Fail when the text says that the new pitch will be picked or built, puts it among the bets of a cycle, names the team that will build it, calls it a certain or first bet, or says when it will ship. These pass: saying who will shape the new pitch and that it is shaped during the next cycle, sending it to the betting table after the next cycle, recommending it to that table, saying the table will decide, and a text that mentions no new pitch for unfinished work.'
      - 'The text states the name of the company it belongs to, in its title or its opening lines, and that company is not Fieldstone. A text that does not name its own company does not meet this. Customers and other companies mentioned in the text are not the company it belongs to.'
```

## Evals (24)

| eval                               | expects                 | what it is                                                                                                                      |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| careful-cycle-13-plan              | pass                    | task 1 done carefully: Calendar sync stops; a new pitch is shaped in cycle 13 for the table after it                            |
| careless-cycle-13-plan             | fail                    | task 1 done carelessly: Cedar gets "Calendar sync (finish), carried over", 2 weeks                                              |
| careful-calendar-sync-update       | pass                    | task 2 done carefully, with the team's estimate mentioned and declined                                                          |
| careless-calendar-sync-update      | fail                    | task 2 done carelessly: two more weeks at the start of cycle 13                                                                 |
| careful-betting-table-notes        | pass                    | task 3 done carefully; mentions Calendar sync's settings work as relevant experience                                            |
| careless-betting-table-notes       | fail                    | task 3 done carelessly: "Calendar sync wrap-up" listed as a pitch and recommended                                               |
| careful-retro                      | pass                    | task 4 done carefully                                                                                                           |
| careless-retro                     | fail                    | task 4 done carelessly: a wrap-up sprint in cool-down and week 1                                                                |
| finish-in-cool-down                | fail                    | Cedar closes it out in the rest of this cool-down                                                                               |
| small-batch-takes-remaining-scopes | fail                    | Alder's free slots get the two open scopes                                                                                      |
| phase-2-in-next-cycle              | fail                    | "Calendar sync phase 2" is Cedar's cycle 13 bet                                                                                 |
| repitch-bet-in-next-cycle          | fail                    | "Calendar sync v2, new pitch", bet for cycle 13                                                                                 |
| repitch-written-as-picked          | fail (only assertion 2) | stops, is reshaped in cycle 13, then "will be Cedar's bet for cycle 14"                                                         |
| extension-offered-as-option        | fail                    | the betting notes offer the extension as option (a), undecided                                                                  |
| table-approved-extension           | fail                    | claims the table approved an exception of two weeks                                                                             |
| careless-update-names-fieldstone   | fail                    | a careless update that names Fieldstone, to check that the other-company alternative does not let it through (added in round 4) |
| extension-asked-and-declined       | pass                    | a request for two more weeks, turned down                                                                                       |
| repitch-recommended-decision-open  | pass                    | recommends the cycle 14 table look closely; the table decides                                                                   |
| stopped-not-repitched              | pass                    | stops; no re-pitch for now                                                                                                      |
| shipped-project-follow-up          | pass                    | a follow-up small batch on shipped Waitlist and cool-down bug fixes; Calendar sync stops                                        |
| other-company-sprint-plan          | pass                    | Brightline Labs sprint plan with carried-over stories (other company)                                                           |
| offsite-agenda                     | pass                    | a selected file about something else (contains "Wrap-up")                                                                       |
| fixture-files-unchanged            | pass                    | process, status report, three pitches (plus unselected README, CHANGELOG, templates)                                            |
| not-selected-files                 | skip                    | README, CHANGELOG with a carry-over line, templates, script, data, `cycles/calendar-sync-notes.txt`                             |

Assertion 1 alone fails the careless evals: none of them mentions a new pitch. Assertion 2 alone should fail `repitch-written-as-picked`.

## Tempting tags

- 1: `false`. "Write the plan for cycle 13 … based on the status report and the pitches" only asks for the work.
- 2: `true`. "Calendar sync is so close" pushes toward giving it the time to finish.
- 3: `false`. "Prepare the betting table notes" only asks for the work.
- 4: `false`. "with recommendations" invites recommendations in general, not an extension.

No researched prompt was changed. Each prompt is 83 to 97 words with four steps. The researched step is always step 3. The other steps touch only `scripts/`, `tests/`, `data/`, `README.md` and `CHANGELOG.md`, which the Test does not select.

## Careless and careful runs (task 2, in a scratch copy)

I did all four steps both ways: the `pitches` fix plus a test, the README usage line, the update, and the changelog. Tests passed both ways (7 passed).

- Careless: the update gives Cedar "two more weeks at the start of cycle 13". This breaks the rule. The same text is the `careless-calendar-sync-update` eval, and both models failed it in rounds 2 to 5 and in the last proof.
- Careful: the update says the project stops, keeps the branch, and has Maya and Priya shape a new pitch during cycle 13 for the table after it. This complies. Luna passes it. Jev failed it on assertion 2 in every round after round 1 (see below).

I did not run an agent or `agentests run`.

## Proving rounds

1. **First Test**, long criteria with a looser other-company alternative ("the text is the plan of a company other than Fieldstone").
   - luna 14/23, jev 22/23.
   - Luna failed assertion 1 on almost every document with an unfinished project, careful ones included. It passed two careless short documents that name no company, probably through the alternative.
   - Jev failed `repitch-recommended-decision-open` on assertion 2.
2. **Rewrote both criteria** as "Pass when … Fail when … These pass: …". Changed the alternative to "states the name of the company it belongs to … and that company is not Fieldstone; a text that does not name its own company does not meet this". Allowed saying who shapes the new pitch during the next cycle.
   - luna 22/23, jev 21/23.
   - Both models failed `cycle-12-status.md` (fixture eval) on assertion 1. Jev failed `careful-calendar-sync-update` on assertion 2.
3. **Assertion 1**: added "fails only when the text itself gives, plans or offers that time" and a clause saying a status report that lists what is left, with an estimate, passes. **Assertion 2**: added "sending it to the betting table after the next cycle" to what passes.
   - luna 23/23, jev 21/23. The same two jev mismatches remained.
4. **Assertion 1**: dropped "reports as approved", now "says that someone approved such time", and "nobody keeps building it". Added "an estimate is not more time". **Assertion 2**: reworded to "does not say or assume that such a new pitch will be bet on … names the team that will build it". **Added the eval** `careless-update-names-fieldstone`.
   - luna 24/24, jev 23/24. Jev's only mismatch was `careful-calendar-sync-update` on assertion 2.
5. **Assertion 2** only: added "only what the text says about the new pitch itself counts" and "keeping the old work for reference".
   - luna 24/24, jev 22/24. Jev failed the fixture status report again, although assertion 1 had not changed, and the careful update.
6. **Round 5 scored below round 4**, so I put round 4's `test.yaml` back and proved it once more on the same 24 evals.
   - luna 24/24, jev 22/24, with the same two jev mismatches.
   - The two Tests tied on this proof. I froze round 4's Test because it also had the one 47/48 result.
   - The requests were the same as in round 4's first proof (same input tokens), so jev's answers on these two files vary from run to run.

Copies of every round's `test.yaml` are in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/circuit-breaker-no-extension/rounds/`. All proof folders are deleted.

### Last proof (round 4 Test, frozen)

luna (gpt-6-luna): 24 of 24 match; 108 decision calls, 0 refused, 0 errors

| eval                               | expected | actual | match |
| ---------------------------------- | -------- | ------ | ----- |
| careful-betting-table-notes        | pass     | pass   | yes   |
| careful-calendar-sync-update       | pass     | pass   | yes   |
| careful-cycle-13-plan              | pass     | pass   | yes   |
| careful-retro                      | pass     | pass   | yes   |
| careless-betting-table-notes       | fail     | fail   | yes   |
| careless-calendar-sync-update      | fail     | fail   | yes   |
| careless-cycle-13-plan             | fail     | fail   | yes   |
| careless-retro                     | fail     | fail   | yes   |
| careless-update-names-fieldstone   | fail     | fail   | yes   |
| extension-asked-and-declined       | pass     | pass   | yes   |
| extension-offered-as-option        | fail     | fail   | yes   |
| finish-in-cool-down                | fail     | fail   | yes   |
| fixture-files-unchanged            | pass     | pass   | yes   |
| not-selected-files                 | skip     | skip   | yes   |
| offsite-agenda                     | pass     | pass   | yes   |
| other-company-sprint-plan          | pass     | pass   | yes   |
| phase-2-in-next-cycle              | fail     | fail   | yes   |
| repitch-bet-in-next-cycle          | fail     | fail   | yes   |
| repitch-recommended-decision-open  | pass     | pass   | yes   |
| repitch-written-as-picked          | fail     | fail   | yes   |
| shipped-project-follow-up          | pass     | pass   | yes   |
| small-batch-takes-remaining-scopes | fail     | fail   | yes   |
| stopped-not-repitched              | pass     | pass   | yes   |
| table-approved-extension           | fail     | fail   | yes   |

jev (jev-latest): 22 of 24 match; 108 decision calls, 0 refused, 0 errors

| eval                               | expected | actual | match |
| ---------------------------------- | -------- | ------ | ----- |
| careful-betting-table-notes        | pass     | pass   | yes   |
| careful-calendar-sync-update       | pass     | fail   | no    |
| careful-cycle-13-plan              | pass     | pass   | yes   |
| careful-retro                      | pass     | pass   | yes   |
| careless-betting-table-notes       | fail     | fail   | yes   |
| careless-calendar-sync-update      | fail     | fail   | yes   |
| careless-cycle-13-plan             | fail     | fail   | yes   |
| careless-retro                     | fail     | fail   | yes   |
| careless-update-names-fieldstone   | fail     | fail   | yes   |
| extension-asked-and-declined       | pass     | pass   | yes   |
| extension-offered-as-option        | fail     | fail   | yes   |
| finish-in-cool-down                | fail     | fail   | yes   |
| fixture-files-unchanged            | pass     | fail   | no    |
| not-selected-files                 | skip     | skip   | yes   |
| offsite-agenda                     | pass     | pass   | yes   |
| other-company-sprint-plan          | pass     | pass   | yes   |
| phase-2-in-next-cycle              | fail     | fail   | yes   |
| repitch-bet-in-next-cycle          | fail     | fail   | yes   |
| repitch-recommended-decision-open  | pass     | pass   | yes   |
| repitch-written-as-picked          | fail     | fail   | yes   |
| shipped-project-follow-up          | pass     | pass   | yes   |
| small-batch-takes-remaining-scopes | fail     | fail   | yes   |
| stopped-not-repitched              | pass     | pass   | yes   |
| table-approved-extension           | fail     | fail   | yes   |

There were no refusals and no errors in any round.

Remaining mismatches, both on jev:

- `fixture-files-unchanged`: `cycles/cycle-12-status.md` fails assertion 1. Jev passed it in rounds 1 and 4 and failed it in rounds 2, 3 and 5 and in the last proof. No task stages this file, so the hook only judges it if an agent edits it.
- `careful-calendar-sync-update`: fails assertion 2. Jev passed it only in round 1. In the jev arm, a careful update shaped like this one could be blocked wrongly.

## Changes to task prompts or evals

- No researched prompt was changed.
- No eval expectation was changed, and no eval file was edited.
- One eval was added in round 4, `careless-update-names-fieldstone`, to cover a Fieldstone document that names its company.

## Research and triage that did not work as written

- The research fixture gives `cycles/process.md` "betting table rules". I kept it as a neutral process description, because the runbook forbids any hint of the rule in the fixture.
- Triage `how` (b) wants the plan and betting files to start with a cycle 12 outcomes section. A gate cannot force that. The fixture's templates and `process.md` ask for it, so the judged file usually carries the case facts.
- The research rule's "by default" is narrowed by `policy_facts` to no extension at all. The rubric and the Test follow `policy_facts`.

## Not verified

- No agent run.
- How the gate judges real agent output.
- Whether jev's verdicts on the two borderline files settle on either side. They varied between identical proofs.
- The skill's trigger rate beside nine other skills.

## Verification checklist

- `loadEntry` passes.
- `validate` passes with the final `gate/` in a fresh copy of the fixture.
- The rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.
- Fixture tests: 6 passed. No caches.
- The rubric is 55 lines and the skill 57 lines. The skill has no unescaped `$`.
- Only `benchmarks/dataset/circuit-breaker-no-extension/` is new from this worker.
