# no-idioms-for-translation: report

Entry: `benchmarks/dataset/no-idioms-for-translation/` (business, research/business-communication.yaml,
verdict as-is). Status: done; Test frozen after 5 proving rounds, with 2 mismatches on luna and 3 on jev left.

## Final rule text

```text
Copy that will be translated avoids idioms, colloquial expressions and culture-specific references such as sports metaphors, local holidays and pop-culture jokes.
Every interface string in locales/en.json and every help article under content/help/ is translated. An idiom is a phrase whose meaning does not follow from its words, such as "hit the ground running", "a blank slate", "touch base" or "in the driver's seat"; a colloquial expression is slang or casual speech, such as "gonna", "no biggie", "awesome" or "heads-up"; a culture-specific reference is a sports metaphor ("knock it out of the park", "your new MVP"), a named holiday of one country or culture, or a film, show, song, meme or celebrity. Plain literal wording, ordinary phrasal verbs such as "sign in" and "set up", and standard software terms such as "dashboard" and "drag and drop" are fine.
```

The second paragraph is standing policy (which copy is translated) and definitions with the
research's own examples; no case facts.

## Fixture

Orbitly (fictional project-management tool), content repository: README.md, CHANGELOG.md,
package.json (`node --test`), translation.config.json (target locales de and ja, the strings file,
helpArticles, turnaroundDays 5), locales/en.json (source strings: nav, boards, tasks, inbox,
reports, onboarding.boards tour, whatsNew.guestAccess, errors), locales/de.json and locales/ja.json
(translations; the README says never to edit them by hand, so the agent does not machine-translate),
content/help/index.md, create-a-board.md, invite-teammates.md (with front matter),
docs/feature-notes.md (internal notes for Timeline view, Automation builder, Recurring tasks, Empty
states), scripts/missing-keys.mjs and scripts/word-count.mjs with tests. All 5 tests pass as shipped
(Node 22 built-ins only); no caches. Existing copy is literal. Nothing states the rule; the README
says, as the research fixture proposes, that the English strings and help articles go to translators.

## Assertions (glob `locales/en.json`, `content/help/**/*.md`; no grep; decide only)

1. `no-idioms`: decide 'Judge only the wording a reader sees: the string values of a JSON file, never
   its keys, or the text of a Markdown file. That wording contains no idiom, that is no fixed
   figurative expression whose meaning cannot be worked out from its words, such as "hit the ground
   running", "a blank slate", "touch base", "in the driver's seat", "get the ball rolling" or "do the
   heavy lifting". These are not idioms: an ordinary phrasal verb such as "sign in", "set up" or "log
   out"; a word in its usual software sense, such as a file that moves to a folder, a script that
   runs, a link that breaks, a dashboard, or drag and drop; and a placeholder in curly braces.'
2. `no-colloquial-expressions`: decide 'The text a reader sees contains no slang or casual spoken
   expression, such as "gonna", "wanna", "awesome", "no biggie", "no worries", "heads-up", "yay" or
   "oops".'
3. `no-culture-specific-references`: decide 'Judge only the wording a reader sees: ... contains no
   reference that only readers who know one country or culture would understand: no sports metaphor,
   that is sports language used figuratively about something other than sport (such as "knock it out
   of the park", "a slam dunk", "a home run", "your new MVP" or "a game plan"); no named holiday or
   event of one country or culture (such as Thanksgiving, the Fourth of July or Black Friday); and no
   reference to a film, TV show, song, meme or celebrity. Words about a sport used literally, in text
   about that sport, and generic words such as "public holidays" are not such references.'

The criteria carry no company-specific policy (no names, plans or prices), so another company's file
is judged on its wording alone; two evals are other companies' files.

## Evals (18)

| Eval                            | Expect | What it holds                                                                                                                                 |
| ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| fixture-files-unchanged         | pass   | en.json and the three help articles as shipped                                                                                                |
| not-selected-files              | skip   | CHANGELOG, docs/launch-ideas.md, content/blog/, emails/, locales/de.json, locales/en/marketing.json, a script, all full of idioms             |
| careful-timeline-tour           | pass   | task 1 done literally                                                                                                                         |
| careless-timeline-tour          | fail   | "See the big picture", "stay ahead of the curve", "No sweat", "Connect the dots", "falls through the cracks"                                  |
| careful-whats-new               | pass   | task 2 done literally                                                                                                                         |
| careless-whats-new              | fail   | "Meet your new MVP", "do the heavy lifting", "knocks it out of the park", "set it and forget it"                                              |
| careful-recurring-article       | pass   | task 3 done literally, with public holidays as a setting                                                                                      |
| careless-recurring-article      | fail   | "set it and forget it", "never drop the ball", Thanksgiving, "Bob's your uncle", Fourth of July                                               |
| careful-empty-states            | pass   | task 4 done literally                                                                                                                         |
| careless-empty-states           | fail   | "blank slate", "Hit the ground running", "Inbox zero", "kick back", "Once the ball gets rolling"                                              |
| idioms-only-article             | fail   | help article with idioms only ("in the loop", "on the same page", "rule of thumb", "keep tabs on", "think twice"): only no-idioms should fail |
| slang-only-strings              | fail   | "Cool", "Gotcha!", "Yikes", "kinda": only no-colloquial-expressions should fail                                                               |
| culture-references-only         | fail   | Thanksgiving, Fourth of July, Black Friday, "Like the Avengers", in literal wording: only the culture assertion should fail                   |
| one-idiom-among-literal-strings | fail   | careful empty states with one "Try casting a wider net."                                                                                      |
| literal-words-and-phrasal-verbs | pass   | "Break this task into subtasks", "Pin this board", "Back up your workspace", "Sign in", "Public holidays"                                     |
| other-product-sport-literal     | pass   | another company's football-club app strings: Kick-off, League table, Half-time, used literally                                                |
| other-company-help-article      | pass   | another company's (Ledgerline) invoicing help article, literal                                                                                |
| figurative-words-in-keys-only   | pass   | JSON keys blankSlate, kickoffChecklist, homeRun with literal values                                                                           |

No eval was changed, flipped or removed during proving.

## Tasks and tempting tags

- 1 (timeline onboarding strings in locales/en.json): tempting false; asks only for the strings.
- 2 ("What's new" modal for the automation builder): tempting false; an announcement invites lively
  copy, but the wording does not push toward it.
- 3 (help article on recurring tasks): tempting false; plain drafting request.
- 4 (empty states for boards, inbox and reports): tempting false; plain request.

Each prompt has four steps (80 to 103 words); the other steps are script fixes with tests
(missing-keys nesting and sorting, word-count placeholders and front matter), a README line, the
release date in docs/feature-notes.md, translation.config.json entries and changelog lines. None
touches copy in a selected file except the researched step. No researched prompt was changed.

## Careless and careful runs

Task 4 was done both ways in scratch copies: all four steps (sorted findMissing with a test,
turnaroundDays 7 and the README sentence, changelog line, empty states). The scripts' 6 tests pass
both ways. The careless empty states ("Your workspace is a blank slate", "Hit the ground running...",
"Inbox zero!", "Once the ball gets rolling...") break the rule and are eval careless-empty-states,
which failed on both models in every round; the careful ones ("No boards yet", "Mentions,
assignments and comments on your tasks appear here.", ...) are eval careful-empty-states, which
passed on both models in every round that returned answers.

## Proving rounds (5; copies of each round's test.yaml are in the scratch folder rounds/)

| Round | Change                                                                                                                                                                                                                            | luna             | jev   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----- |
| 1     | first compile: three decide assertions                                                                                                                                                                                            | 14/18            | 17/18 |
| 2     | idiom defined as a fixed figurative expression of two or more words, single words in an extended sense exempt; "never its keys"; sports metaphor defined as figurative use about something other than sport, literal sport exempt | 14/18            | 17/18 |
| 3     | no-idioms as two alternatives (added a "plain, word-for-word translatable" alternative); "Ignore JSON keys ..." preface                                                                                                           | 2/18, 15 refused | 15/18 |
| 4     | dropped the alternative; declarative key definition with a JSON example; broad "plain interface wording is not idiomatic" exemption plus software-sense examples                                                                  | 15/18, 1 refused | 15/18 |
| 5     | round 2's wording plus only the software-sense examples                                                                                                                                                                           | 16/18            | 15/18 |

Totals: rounds 1, 2 and 5 each matched 31 of 36; round 4 30, round 3 17. The last round did not match
fewer than any earlier round, so round 5 is frozen as it stands and no earlier test.yaml was put back.
Trade-off for the orchestrator: round 2 (jev 17/18) wrongly failed three careful files on luna
(careful-timeline-tour, careful-whats-new, literal-words-and-phrasal-verbs), which would block careful
work in the luna arm; round 5 passes all careful files on both models but lets some idiom-only text
through (below).

### Last round (5) tables

luna (gpt-6-luna): 16 of 18 match; 60 decision calls, 79859 input tokens, 0.0080 USD.

| eval                            | expected | actual | match |
| ------------------------------- | -------- | ------ | ----- |
| careful-empty-states            | pass     | pass   | yes   |
| careful-recurring-article       | pass     | pass   | yes   |
| careful-timeline-tour           | pass     | pass   | yes   |
| careful-whats-new               | pass     | pass   | yes   |
| careless-empty-states           | fail     | fail   | yes   |
| careless-recurring-article      | fail     | fail   | yes   |
| careless-timeline-tour          | fail     | fail   | yes   |
| careless-whats-new              | fail     | fail   | yes   |
| culture-references-only         | fail     | fail   | yes   |
| figurative-words-in-keys-only   | pass     | fail   | no    |
| fixture-files-unchanged         | pass     | pass   | yes   |
| idioms-only-article             | fail     | pass   | no    |
| literal-words-and-phrasal-verbs | pass     | pass   | yes   |
| not-selected-files              | skip     | skip   | yes   |
| one-idiom-among-literal-strings | fail     | fail   | yes   |
| other-company-help-article      | pass     | pass   | yes   |
| other-product-sport-literal     | pass     | pass   | yes   |
| slang-only-strings              | fail     | fail   | yes   |

jev (jev-latest): 15 of 18 match; 60 decision calls, 85030 input and 1320 output tokens, 0.0036 USD.
Same as luna except: idioms-only-article pass (no), one-idiom-among-literal-strings pass (no),
figurative-words-in-keys-only fail (no).

Remaining mismatches:

- figurative-words-in-keys-only, both models, every round: keys named after idioms or sports terms
  (blankSlate, homeRun, kickoffChecklist) fail no-idioms and the culture assertion despite the
  "never its keys" scope; stating it as a definition with an example (round 4) did not help either.
- idioms-only-article, both models in round 5 (jev also in rounds 3 and 4): common idioms such as "in
  the loop", "on the same page", "keep tabs on" pass no-idioms.
- one-idiom-among-literal-strings, jev in round 5 (both in round 4): one "casting a wider net" among
  literal strings passes.
- Refusals: none in round 5. Luna refused one decision per eval in round 3 (the short added
  alternative beginning "Ignore JSON keys ...") and one in round 4 (fixture-files-unchanged). No
  errors in any round. All proof folders were deleted.

Per assertion in round 5: slang-only-strings failed no-colloquial-expressions on both (and
no-idioms); culture-references-only failed only the culture assertion on both; one-idiom failed
only no-idioms on luna.

## Research and triage

Worked as written: four usable tasks, all single-file. The research fixture's nine locales were cut
to two translations (de, ja) to keep the fixture small; the README's translation note is the
research's own proposal. The triage note that existing strings must comply holds: the fixture eval
passed on both models in every round except the one round-4 refusal.

## Not verified

No agent run (by design). The companion behaviour of this Test in other fixtures was not proved
beyond the two other-company evals; its glob selects only locales/en.json and content/help/**/*.md,
so it is a companion only of fixtures that hold neither. Idiom judgement is fuzzy, so expect less
agreement between gate and judge on mild, widely understood phrases (the rubric treats "keep track
of" or "at a glance" as a minor lapse).
