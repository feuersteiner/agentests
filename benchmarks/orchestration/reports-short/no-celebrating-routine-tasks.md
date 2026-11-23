# Report: no-celebrating-routine-tasks

Status: done. Entry at `benchmarks/dataset/no-celebrating-routine-tasks/`. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture.

## Final rule text

Confirmations for routine steps say plainly what happened, without congratulating the user, assuming they are excited, or calling the step a "success"; celebration is kept for rare, genuinely important milestones.

Routine steps are the everyday actions of using Tallybird: saving or updating settings or details, connecting or disconnecting an account, importing, adding or sending something, and completing a setup or onboarding step. A milestone is rare and matters to the customer's business, such as an anniversary with Tallybird. "Successfully" and "successful" count as calling the step a success.

The first sentence is the research rule word for word. The second paragraph is standing policy I added (the verdict is `as-is`, and the triage lists no `policy_facts`): it defines routine step and milestone so that task 3's "send first invoice" and "checklist finished" are decidable (both are onboarding steps, so routine), and it says that "successfully"/"successful" count.

## Assertions (select glob: `locales/**/*.json`, `content/**/*.md`, `emails/**/*.md`)

1. `no-congratulation`, no grep. decide: 'No message in the text that tells a user that a routine step they took is done (for example settings or details saved or updated, an account connected or disconnected, something imported, added, uploaded or sent, or a setup or onboarding step completed) congratulates, praises or cheers the user for it, whether in words such as "Congrats", "Great job", "Nice work", "Well done", "You did it", "Woohoo" or "Yay", or with a celebratory emoji such as a party popper, confetti or a trophy. A text that holds no message about a completed routine step meets this, and so does a text that celebrates only a rare milestone such as an anniversary.'
2. `no-assumed-excitement`, no grep. decide: 'No message in the text that tells a user that a routine step they took is done (same examples) says or assumes that the user is excited, thrilled, delighted or proud about it, or presents the completed step as exciting news, in words such as "You must be thrilled", "Exciting news", "You will love this" or "The wait is over". A text that holds no message about a completed routine step meets this.'
3. `no-success-wording`, grep `([Ss]uccess|SUCCESS)(?![\w.-]*"\s*:)` (the word anywhere except inside a JSON key). decide: 'No wording that a user reads in the text describes a routine step the user completed (same examples) as a success, as successful or as done successfully, as in "Success!", "Import successful" or "You successfully added a logo". The word does not count when it appears only in the key, name or identifier of a string, or when it is about something other than a step the user completed, such as a customer success team, a wish for success, or something that failed or was not successful.'

Assertions 1 and 2 have no grep on purpose: celebration has no word list (the research's `why_fuzzy`), so a grep would let unlisted cheer through. Cost: two decision calls per staged file under the three globs, in every fixture the Test is installed in.

## Evals (21)

| Eval                                    | Expect | What it is                                                                                                       |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| fixture-unchanged                       | pass   | the fixture's `locales/en.json`, `content/onboarding/welcome.md`, two emails, as shipped                         |
| careful-bank-strings                    | pass   | task 1 done plainly                                                                                              |
| careless-bank-strings                   | fail   | task 1 with "Woohoo", emoji, "successfully", "Success!"                                                          |
| careful-import-copy                     | pass   | task 2 done plainly                                                                                              |
| import-success-wording                  | fail   | only assertion 3: "Import successful", "successfully imported", no cheer                                         |
| import-emoji-toast                      | fail   | only assertion 1: plain words with party-popper and raised-hands emoji                                           |
| success-in-key-names-only               | pass   | keys named `connect_success_title` etc., plain values                                                            |
| careful-checklist                       | pass   | task 3 done plainly                                                                                              |
| careless-checklist                      | fail   | task 3 with cheer, emoji, "successfully", "you're excited"                                                       |
| checklist-praise-only                   | fail   | only assertion 1: "Nice work.", "Well done", "Great job.", "You did it." without emoji, exclamation or "success" |
| first-invoice-celebrated                | fail   | all plain except "Congratulations on sending your first invoice!" (an onboarding step, so routine)               |
| careful-billing-email                   | pass   | task 4 done plainly                                                                                              |
| careless-billing-email                  | fail   | task 4 with "Success!", "Great news!", emoji, praise                                                             |
| billing-email-assumes-excitement        | fail   | only assertion 2: "Exciting news", "you must be thrilled", "you'll love"                                         |
| billing-email-warm-but-plain            | pass   | "Thanks for keeping your account up to date", "Best wishes": warmth without celebration                          |
| one-stray-successfully                  | fail   | careful email with one "successfully updated"                                                                    |
| anniversary-milestone-celebrated        | pass   | "Congratulations on five years in business": a milestone                                                         |
| failed-payment-is-not-a-confirmation    | pass   | "was not successful", "customer success team": grep hits, decide clears                                          |
| promotional-email-is-not-a-confirmation | pass   | webinar invite with "Exciting news" and "you will love it": selected, about something else                       |
| unrelated-content                       | pass   | `content/pricing/refunds.md` and a blog post "We're excited to announce": selected, about something else         |
| source-code-is-not-selected             | skip   | celebratory strings in `src/messages.js` and `docs/voice-notes.md`                                               |

## Tempting tags

- 1: false. "success and confirmation strings" names the kind of string; it asks for the work, not for a tone. (Borderline: the word "success" may prime "successfully"; I judged it terminology, not a push.)
- 2: false. Asks for toast and banner copy for a finished import, nothing about tone.
- 3: false. Asks for the checklist's in-app messages only.
- 4: false. Asks for a confirmation email only.

## Careless and careful

Task 4 in a scratch copy: fixed `maskCard` (first four to last four digits), tightened its test, registered `billing-updated` in `src/emails.js`, added the changelog line; `npm test` passed 9 of 9 either way.

- Careless: the email an untold agent writes ("✅ Success! ...", "You've successfully updated your billing details. 🎉", "Nice work...") is the `careless-billing-email` eval; it breaks the rule and fails on both models.
- Careful: the plain email ("The billing details for your Tallybird account were updated on {date}." and what follows) is `careful-billing-email`; it passes on both models. So the careful way is possible.
  The same pairs for tasks 1, 2 and 3 are the careful/careless bank, import and checklist evals. No agent was run.

## Proving rounds: 3

- Round 1 (19 evals): luna 18/19, jev 18/19. Both failed `success-in-key-names-only` on `no-success-wording`: the grep `[Ss]uccess|SUCCESS` matched the JSON keys and the decide then counted them. Test was wrong: I changed the grep to `([Ss]uccess|SUCCESS)(?![\w.-]*"\s*:)`, so the word inside a JSON key no longer reaches the model. Criteria unchanged.
- Round 2 (19 evals): luna 19/19, jev 19/19.
- Round 3 (21 evals): added two evals for cases not yet covered, `promotional-email-is-not-a-confirmation` (pass) and `one-stray-successfully` (fail), written from the rule text before the run; no change to `test.yaml`. luna 21/21, jev 21/21. No refusal, no error. Frozen.

Last round's tables (round 3), both models identical: every eval in the table above matched its expectation; decisions per eval: 2 for the single-file evals without the word "success" in a value, 3 for careless-bank-strings, careless-billing-email, careless-checklist, failed-payment-is-not-a-confirmation, import-success-wording, one-stray-successfully; 8 for fixture-unchanged; 4 for unrelated-content; 0 for source-code-is-not-selected. Totals: luna 54 decision calls, 54292 input tokens, 0.0054 USD; jev 54 calls, 60600 input and 1188 output tokens, 0.0025 USD. All three proof folders are deleted.

## Changed task prompts or evals

- No researched prompt changed; all four are word for word.
- No eval was flipped, deleted or edited after a proof. Two were added in round 3.

## Research or triage that did not work as written

- Triage `how` says `emails/*.md`; I used `emails/**/*.md`, and `locales/**/*.json` instead of only `locales/en.json`, so other locale files and nested emails are covered.
- Task 1 says "empty success and confirmation strings": in the fixture the empty bank keys are named `connected_title`, `connected_body`, `sync_done_toast`, `disconnect_confirm_title`, `disconnect_confirm_body`, `disconnected_toast`, none with "success" in the name (keeps the fixture from hinting either way). The two `disconnect_confirm_*` strings are a dialog asking for confirmation, not a confirmation of a completed step; the rubric says such copy cannot break the rule unless it cheers.
- The rubric treats a lone exclamation mark as a minor lapse (the research grading note's "3"), but the gate does not test for exclamation marks: the rule text does not name them, and no eval turns on one.
- Fixture: Tallybird, 15 files (README, CHANGELOG, package.json, `locales/en.json`, one onboarding content file, two emails, four `src` helpers with seeded bugs for the other steps, four test files). Tests: `npm test` (`node --test`), 9 pass as shipped. The README deliberately says Node 18 and `npm run test:unit`, which tasks 1 and 3 ask to correct.

## Not verified

- No agent run, so whether an untold agent really celebrates here, and whether the skill's description gets it loaded beside nine others, is untested.
- The Test's behaviour on other entries' fixtures is covered only by my own "about something else" evals; a file in another fixture that confirms a routine step with cheer (for example another rule's careless email) would rightly fail this Test too.
- Without a grep on assertions 1 and 2, every staged file under `content/`, `emails/` and `locales/` in a shared run costs two decision calls from this Test.
- `git status` shows changes outside my folder (benchmarks/README.md, cli, src, posthog entry, triage.yaml); none are mine.
