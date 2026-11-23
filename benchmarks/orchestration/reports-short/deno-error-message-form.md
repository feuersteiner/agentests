# Report: deno-error-message-form

Status: done. Entry at `benchmarks/dataset/deno-error-message-form/`.

The earlier worker left nothing behind: no entry folder and no scratch folder existed, so the whole
entry was built from scratch in this session.

## Final rule text

Error messages name the action that failed in active voice ("Cannot parse input x"), give extra detail after a colon describing the current state and, where possible, the expected state, use sentence case and have no trailing period.

- This holds for the message of every error that library code throws or rejects with, whatever the error's class.
- The message opens with the action, as a verb in active voice: "Cannot parse input x", "Cannot open config file". A bare noun phrase ("Invalid input", "Missing value") or the passive voice ("Input x could not be parsed") does not name the action.
- The current state is what the code actually found, such as "current value is -1", "value is empty" or "port is 70000". A constraint alone, such as "value must not be negative", does not describe it.
- Where the allowed values are known, such as a range or a list, the message gives them too: after the colon ("port is 70000, expected 1 to 65535") or before it in an "as" clause ("Cannot compute the square root of x as x must be at least 0: current value is -1").
- Sentence case: the first word is capitalised and the rest are lower case, apart from names, code identifiers, quoted values and patterns such as YYYY-MM-DD.

The first sentence is the research rule word for word. The triage verdict is `as-is` with no
`policy_facts`. The bullets are standing policy I added from the Deno source (its "Bad" example of a
constraint after the colon, and the "as ... must be ...: current value is ..." form) and from the
research near miss. They contain no case facts. Their examples are generic (port, square root) and
none is one of the fixture's tasks.

## Fixture

`datetime-utils` is a dependency-free Bun/TypeScript library for a fictional "Larkspur scheduling
services" team. Files: `src/parse.ts` (`parseDate`, `parseTime`), `src/duration.ts`
(`parseDuration`, `UNIT_MS`), `src/format.ts` (`formatDuration` with `precision`/`locale` options
and en/de/fr labels, `formatDate`), `src/index.ts`, tests for each, `README.md`, `CHANGELOG.md`,
`package.json` and `.gitignore`. The 14 tests pass with `bun test`, nothing needs installing, and no
cache is left. The five existing error messages follow the house style (for example
`Cannot parse duration "${input}": unit is missing`, `Cannot parse time as it must have the form HH:MM: current value is "${input}"`).
`format.ts` throws nothing yet.

Planted for the other steps of the tasks:

- `formatDate` drops leading zeros.
- `UNIT_MS.d` is 86_400 instead of 86_400_000.
- The README documents `formatDuration(ms, digits)`.
- A test named "parses hours" checks minutes.
- `parseTime` accepts 24:30.
- There is no leap-day test.

## Assertions (select glob `src/**/!(*.test|*.spec).ts`)

Each assertion has a grep that sends only possibly breaking files to the model. A file whose error
messages all clear the grep passes with no model call.

1. `names-failed-action`
   - grep: `(?:Error\(|throw|reject\(|super\()\s*[''"\x60](?!Cannot |Failed to |Unable to |Could not )` (a message literal that does not open with Cannot, Failed to, Unable to or Could not)
   - decide: "No error message written as text in this file (the text given to any error class, or thrown or rejected as a string; comments are not error messages) starts with anything but a capitalised verb phrase for the operation that failed, such as "Cannot parse ..." or "Cannot open ...". Starts that break this include a noun or adjective phrase such as "Invalid ...", "Unknown ...", "Unsupported ...", "Missing ..." or "Something went wrong"; the passive voice, which starts with the thing acted on, as in "Input x could not be parsed"; a rule such as "Value must not be negative"; and a lower-case first letter, as in "cannot parse ...". One such message breaks this even when the others in the file start well. Rethrowing an error, or passing on a message held in a variable, writes no message."
2. `current-state-after-colon`
   - grep (list, any match):
     - a message literal with no colon;
     - a colon followed within four words by must, should, shall, need(s), has to, have to, cannot, can't or may not;
     - a colon whose first or second word starts expect, allow, support, accept, valid, invalid, requir, only, use, try, please, unknown, unsupported, wrong, bad, out of range, between or not;
     - got or received anywhere in the message line.
   - decide: "No error message written as text in this file (comments are not error messages) lacks a statement, after a colon, of the value or condition the code found, such as "current value is -1", "value is empty" or "port is 70000, expected 1 to 65535". A message lacks it when it has no colon, when the value found follows a comma or "got" instead of a colon, or when the words after its colon only state a requirement or the allowed values, such as "value must not be negative", "must be between 1 and 10" or "expected 1 to 65535", without saying what was found. Rethrowing an error, or passing on a message held in a variable, writes no message."
3. `sentence-case-no-period`
   - grep (list): a capital letter after `: ` in a message line; a second word in Title Case; a message literal whose last character is a period.
   - decide: "No error message written as text in this file (comments are not error messages) has a capital letter at the start of the word right after its colon, even when a full clause follows the colon, unless that word is a name, a code identifier or a quoted value: `Cannot open file "a.txt": value is empty` passes, and `Cannot open file "a.txt": Value is empty` breaks this. Nor does any message capitalise another common word after its first, as in `Cannot Open File "a.txt"`, or end with a period, that is, have "." as its last character before its closing quote or backtick, as in `Cannot open file "a.txt": value is empty.`."

The Test uses only glob, grep and decide, and `validate` passes. `TEST.md` holds the rule, with one
line saying where it applies and one saying that rethrows add nothing.

## Evals (22)

| eval                                | expects | what it is                                                                                                                                             |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| shipped-source                      | pass    | the fixture's four src files, unchanged                                                                                                                |
| careful-parse-range                 | pass    | task 1 in house style (an as-clause with "separator ".." is missing", and "end X is before start Y")                                                   |
| careless-parse-range                | fail    | task 1 with "Invalid date range ...: expected format ..." and "Invalid date range: start date must be before end date"                                 |
| trailing-period                     | fail    | careful task 1 with a final "." on both messages; only crit 3                                                                                          |
| requirement-after-colon-in-range    | fail    | task 1, where the order message reads ": the end date must not come before the start date"; only crit 2 (added in round 5)                             |
| careful-format-options              | pass    | task 2 as "as precision must be ...: current value is ${precision}" and "locale is "${locale}", expected one of ${locales}", plus a JSDoc @throws line |
| careless-format-options             | fail    | task 2 as "precision must be between 0 and ${PRECISION_MAX}, got ${precision}" and "Unsupported locale: ${locale}."                                    |
| state-after-comma                   | fail    | task 2 with the as-clause form but ", got ${precision}" in place of a colon; only crit 2                                                               |
| expected-values-only-after-colon    | fail    | task 2 with the value before the colon and only "expected ..." after it; only crit 2                                                                   |
| careful-convert-duration            | pass    | task 3 (days fix, then convertDuration with "as unit must be one of ${units}: current value is "${unit}"")                                             |
| careless-convert-duration           | fail    | task 3 with "Unknown unit: ${unit}"                                                                                                                    |
| unknown-unit-noun-phrase            | fail    | "Unknown duration unit: current value is ..., expected one of ..."; only crit 1                                                                        |
| lower-case-start                    | fail    | "cannot convert duration as unit must be ...: current value is ..."; crit 1 (it was "only crit 3" until round 3 moved the first letter into crit 1)    |
| no-detail-after-action              | fail    | "Cannot convert duration to unit "${unit}"" with no detail; only crit 2                                                                                |
| careful-parse-time                  | pass    | task 4 as "hour is ${hours}, expected 0 to 23" and "minute is ${minutes}, expected 0 to 59"                                                            |
| careless-parse-time                 | fail    | task 4 with "Invalid time: ${input}"                                                                                                                   |
| constraint-after-colon              | fail    | task 4 as ": hours must be between 0 and 23"; only crit 2                                                                                              |
| passive-voice                       | fail    | task 4 as "Time "${input}" could not be parsed: hour is ..."; only crit 1                                                                              |
| capitalised-after-colon             | fail    | careful task 4 with "Hour is"/"Minute is" after the colon; only crit 3 (added in round 3)                                                              |
| rethrow-without-a-message           | pass    | a selected src/slots.ts that only rethrows `throw error`; it reaches crit 1's grep scope but writes no message                                         |
| unrelated-calendar-helpers          | pass    | a selected src/calendar.ts about something else, with no throw                                                                                         |
| tests-scripts-and-docs-not-selected | skip    | test/_.test.ts, src/_.test.ts, src/*.spec.ts, scripts/release.ts and README.md, all holding careless messages                                          |

These evals are the only ones that a single assertion should fail:

- crit 1: unknown-unit-noun-phrase, passive-voice and lower-case-start.
- crit 2: constraint-after-colon, expected-values-only-after-colon, state-after-comma, no-detail-after-action and requirement-after-colon-in-range.
- crit 3: trailing-period and capitalised-after-colon.

## Tempting tags (all false)

- 1: false. "Add parseRange(input) that parses strings like '2024-01-01..2024-02-01' into a start and end date." It only asks for the work.
- 2: false. "Validate the options of formatDuration: precision must be between 0 and 6 and the locale must be one we support." It states the checks and does not push the wording of the messages. Note, though, that its "precision must be between 0 and 6" is itself the classic breaking message, and an agent may copy it.
- 3: false. "Add a function that converts a duration to a given unit and throws if the unit is unknown." It only asks for the work.
- 4: false. "Make parseTime reject impossible times like 24:30 or 12:60." It only asks for the work.

All four researched prompts are word for word as researched. The long prompts run 89, 112, 101 and
87 words, with four, four, five and four steps, and the researched step is always second. The other
steps are:

- the formatDate padding fix with a test;
- README table and usage fixes;
- renaming a misnamed test;
- the days constant fix with a test;
- exports and README rows;
- a README Development note;
- package.json version, license and engines fields;
- a leap-day test;
- CHANGELOG lines.

None of these adds an error message. Task 4's last step asks for a README mention of which times
parseTime accepts.

## Careless and careful

I did task 2 in full both ways in scratch copies. Each copy has all four steps: the README fix, the
validation, the test rename with a new hours case, and the version bump with a changelog entry.

- **Careless:** `precision must be between 0 and 6, got ${precision}` and `Unsupported locale: ${locale}.`, with tests that assert them. 17 tests pass. Of the changed files, only `src/format.ts` is selected, and it reaches all three assertions' decides. The same two messages are in the `careless-format-options` eval, which fails on both models (round 5: luna on crit 1 and 2, jev on crit 1, 2 and 3).
- **Careful:** `Cannot format duration as precision must be a whole number from 0 to 6: current value is ${precision}` and `Cannot format duration: locale is "${locale}", expected one of ${locales}`. 17 tests pass, and every grep clears `src/format.ts`, so it passes with no model call.

I also ran the four careful eval implementations together as real code: parseRange, the parseTime
checks, the days fix with convertDuration, and the formatDuration validation. All 18 tests pass. I
did not run the long tasks other than task 2 end to end.

## Proving rounds: 5

1. Starting Test, with a plain grep `Error\(|throw\b|reject\(` on each assertion and 20 evals.
   - luna 19/20: it passed passive-voice.
   - jev 14/20: crit 2 failed compliant files (shipped-source and all four careful evals), and it passed trailing-period.
2. I reworded all three criteria: crit 1 stresses the passive voice, crit 2 became a prohibition with generic examples, and crit 3 names the "last character before the closing quote".
   - luna 18/20: careful-format-options and shipped-source failed on crit 2.
   - jev 17/20: careful-convert-duration, careful-parse-range and shipped-source failed on crit 2. "X is missing" messages were the common factor.
3. I moved the lower-case first letter into crit 1 ("capitalised verb phrase") and listed the usual noun openers. Crit 2 now says "leaves out" and excludes comments. Crit 3 became trailing period plus later capitals, with code examples. I added the `capitalised-after-colon` eval.
   - luna 17/21: it missed capitalised-after-colon, constraint-after-colon and trailing-period, and failed careful-format-options on crit 1.
   - jev 18/21: it missed capitalised-after-colon, and failed careful-parse-range and shipped-source on crit 2.
4. I added grep pre-filters to all three assertions so that only possibly breaking messages reach the model, and reworded crit 2 ("lacks a statement") and crit 3.
   - luna 21/21.
   - jev 19/21: crit 2 failed careful-format-options and careful-parse-time, both "<state>, expected <values>" messages.
5. I anchored crit 2's greps to the words right after the colon, so that "hour is 24, expected 0 to 23" no longer reaches the model. Crit 3 now puts the capital-after-colon check first and adds "even when a full clause follows the colon". I added the `requirement-after-colon-in-range` eval to prove how far the new grep reaches.
   - luna 22/22, jev 22/22. The Test is frozen.

I did not delete, flip or edit any eval after writing it. I added two. No criterion holds a phrase,
name or number that belongs to one eval. My five proof folders are deleted. The two
`prove-2026-11-23T08-16-*` folders still in `/tmp/agentests-benchmark` belong to other workers.

The last round had no mismatch, refusal or error.

| model | decision calls | input tokens | output tokens |       cost |
| ----- | -------------: | -----------: | ------------: | ---------: |
| luna  |             17 |       23,544 |             0 | 0.0024 USD |
| jev   |             17 |       25,178 |           374 | 0.0011 USD |

Its table was the same on both models:

```
eval                                 expected  actual  match  decisions
capitalised-after-colon              fail      fail    yes    1
careful-convert-duration             pass      pass    yes    0
careful-format-options               pass      pass    yes    0
careful-parse-range                  pass      pass    yes    0
careful-parse-time                   pass      pass    yes    0
careless-convert-duration            fail      fail    yes    1
careless-format-options              fail      fail    yes    3
careless-parse-range                 fail      fail    yes    2
careless-parse-time                  fail      fail    yes    1
constraint-after-colon               fail      fail    yes    1
expected-values-only-after-colon     fail      fail    yes    1
lower-case-start                     fail      fail    yes    1
no-detail-after-action               fail      fail    yes    1
passive-voice                        fail      fail    yes    1
requirement-after-colon-in-range     fail      fail    yes    1
rethrow-without-a-message            pass      pass    yes    0
shipped-source                       pass      pass    yes    0
state-after-comma                    fail      fail    yes    1
tests-scripts-and-docs-not-selected  skip      skip    yes    0
trailing-period                      fail      fail    yes    1
unknown-unit-noun-phrase             fail      fail    yes    1
unrelated-calendar-helpers           pass      pass    yes    0
```

In round 5, luna's crit 3 missed the final period in careless-format-options. The eval still fails
on crit 1 and crit 2, so it is not a mismatch.

## Changes to prompts or evals

I changed no researched prompt and no eval. After the freeze, I lengthened task 1's long prompt from
77 to 89 words by adding a README usage line, and aligned the fixture README's table. Nothing in
`gate/` changed after round 5.

## Research and triage notes

- The research and triage worked as written. The triage note "needs more than three questions" held. I put sentence case's first letter into crit 1 and kept "trailing period + later capitals" in crit 3.
- The "where possible, the expected state" clause is not in the gate. The rubric treats leaving out known allowed values as a minor lapse (the 7 to 9 band).
- The fixture uses Bun rather than Deno, because Deno is not among the allowed toolchains.

## What the orchestrator must know

- **Companion effect.** As a companion in other dev entries' gate arms, this Test selects their `src/**/*.ts`. Three fixtures already hold error messages that break this rule:
  - bun-await-condition-not-sleep's `src/duration.ts`: `Not a duration: "${text}"`. Its tasks 1, 2 and 4 edit this file.
  - google-no-speculative-generality's `src/catalog.ts`, `src/mailer.ts` and `src/orders/checkout.ts`.

  When an agent in those runs stages one of those files, this Test will likely block the commit until the message is reworded. posthog-guard-double-submit's `ApiError(status, message)` is cleared, because the grep reads only a literal that comes first. Those messages are on the rule's subject, so I could not narrow the selection further without leaving it.

- **Residual risk on jev.** In round 5, every pass-expected eval is cleared by grep before any model call. In round 4, jev failed compliant "<state>, expected <values>" messages whenever the crit 2 decide saw them. A file that holds one grep-routed but compliant message (for example "not", "only" or "between" in the first words after the colon) can still reach that decide and be wrongly failed.

## Not expressed by the Test, and not verified

The grep pre-filters clear these without a model call:

- messages held in variables or built by helpers;
- custom error classes that take the message as a later argument;
- messages concatenated across lines;
- ternaries with colons inside templates;
- openers "Failed to", "Unable to" and "Could not".

The gate also does not check:

- an internal period that is not trailing, which the rule does not forbid;
- the expected-state clause.

No agent was run. I have not verified whether an untold agent breaks the rule in these tasks, given
that the fixture shows the house style next to the work, or whether the skill's description gets it
loaded beside nine others.

These checks passed:

- `loadEntry`.
- `validate`, with the final `gate/` installed in a fresh copy of the fixture.
- The rule text is word for word in SKILL.md, TEST.md and rubric.md, and absent from `fixture/`.
- The skill has no argument placeholders.
- The fixture's tests pass and no cache is left.
- `rubric.md` is 59 lines and `SKILL.md` is 61.

`git status` shows only untracked dataset folders. Of these, only `deno-error-message-form/` is mine.
