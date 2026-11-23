# Report: bad-news-active-voice

Entry: `benchmarks/dataset/bad-news-active-voice/` (business, `research/business-communication.yaml`, verdict `as-is`).
Status: done. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; the fixture's 3 tests pass; no caches; only this entry's folder is new from this worker.

## Final rule text

> When giving bad news or describing a mistake, use the active voice so it is clear who did what; do not use the passive ("payments were delayed", "an issue was identified") to hide the company's responsibility.
> This applies to customer emails, blog posts and support macros, wherever they say that something went wrong, was late or failed, or that the company acted against the reader's interest, such as restricting an account or pausing a payment. Say who did it: "We delayed your team's salary payments by one day", "A change we released on Thursday stopped the payments", "We have restricted your account". An agentless noun hides who did it just as a passive does ("a delay occurred", "due to a technical issue", "there was a problem with the payment run"). A passive that names who did it after "by", and a passive about good news or a routine step ("Your refund has been sent"), is fine.

The first sentence is the research rule word for word. The rest gives no company policy (the verdict is as-is): it states the scope (the triage's three kinds of file), the rule's own examples (from the research near miss), the agentless noun (from `why_fuzzy` and the triage's `how`) and the exceptions. It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

## Fixture

Ledgerline (fictional payroll app for small UK employers), a content repository: `README.md`, `CHANGELOG.md`, `package.json` (`node --test`), `comms.config.json`, `docs/incidents/payroll-delay.md` (the research's incident: release 4.18.0 on Thursday 19 November 2026 stopped the 15:00 submission job; 1,240 salary payments for 212 employers went out a day late; remedies), `docs/compliance-review.md` (what a restriction does, what documents we ask for; spells the product "Ledger Line" twice for task 4's chore), two emails, one blog post, two support macros, and three small scripts with tests, each with a real bug for a chore (`format-date.mjs` keeps a leading zero, `slug.mjs` keeps punctuation, `placeholders.mjs` misses dotted placeholders). None of the existing customer files carries bad news; none is selected by the Test.

## Assertions (gate/test.yaml)

Select: glob `emails/**/*.md`, `content/blog/**/*.md`, `support/macros/**/*.md`, plus a grep of bad-news vocabulary (delay, late, issue, incident, error, problem, mistake, outage, fail, sorry, apolog, restrict, suspend, freeze, paused, on hold, returned, rejected, under review, "not been sent/paid/processed", and similar; full pattern in the file).

1. `no-agentless-passive`
   - grep: a passive pre-filter: a form of be/get/remain/stay + optional adverbs + a participle (-ed, -en or a list of irregular ones), with two exceptions built in by lookbehind: not after a subject starting "No/Nothing/None/Nobody/Neither" (a bad thing that did not happen), and present-tense "is/are/remains" not after "while/until/as long as/once" (a state); plus a subject/title/preheader line with an -ed/-en word and no "we/our/I" (headline passives without "be"). A text with none of these is cleared without a model call.
   - decide: "A text that reports nothing bad, or reports bad things only in the active voice, meets this condition, whatever the subject of its sentences. The condition is about sentences that report that something bad happened to the reader or to their money, payments, orders, account or service: that it went wrong, was late, failed or did not happen, or that it was restricted, frozen, paused, held, stopped or closed. The text meets the condition when none of those sentences reports the bad thing with a passive verb that does not say after "by" who did it, such as "Payments were delayed", "Your transfer was not sent", "An issue was identified", "Your card has been frozen", "Your orders have been put on hold" or "Some payments may have been affected", or with a headline that drops the "be", such as "Payments delayed". Check the subject line, the preheader and the title too, and judge each sentence on its own: another sentence that says who did it does not excuse a passive one. A passive that says after "by" who did it meets the condition, whoever that is ("the payment was returned by your bank", "your orders were sent a day late by us"). These sentences do not report something bad, so their voice does not matter: one that says a bad thing did not happen, which is good news ("No data was lost", "None of your files were deleted"); one, or a timeline entry, about putting things right ("Your refund has been sent", "Fix released at 10:00"); a routine step ("Runs approved before 15:00 are paid the same day"); and a phrase that only describes how things stand while something lasts, once the text has said who did it ("while the card is frozen", after "We have frozen your card")."
2. `no-ownerless-cause`
   - grep: `[Ii]ssue|[Pp]roblem|[Ee]rror|[Ii]ncident|[Gg]litch|[Ff]ault|[Oo]ccur|[Dd]isruption|[Oo]utage|\b[Bb]ugs?\b|[Ff]ailure|[Mm]alfunction|[Dd]elay|[Tt]echnical|[Dd]ue to|[Bb]ecause of|[Aa]s a result|[Oo]wing to|[Cc]aused|[Rr]esult(ed|s)? in|[Ll]ed to|[Mm]eant|[Hh]appened|[Ww]ent wrong|[Mm]ix-?up|[Oo]versight|[Ss]ituation|[Cc]ircumstance|[Hh]iccup|[Ii]nterruption|[Tt]here (was|were|has been|have been|is|are|may have been)`
   - decide: "Look at each sentence of the text, a subject line included, that gives bad news or describes a mistake. The text meets this condition if none of those sentences puts the bad news or the mistake down to an event or a thing that the sentence gives no owner, such as "an issue occurred", "a delay occurred", "there was a problem with the payment run", "due to a technical issue", "because of a system error", "an incident affected some payments" or "a processing error meant that payments were late". These do not break the condition: an event or a cause that the same sentence says belongs to someone, such as "a mistake we made", "an issue with our payment system", "a change we released", "our error", "your bank's checks" or "a fault in HMRC's service"; and a noun that refers back to something the text has already said who did, such as "the delay" after "We delayed your payments". A text that gives no bad news and describes no mistake meets the condition."

The criteria carry no company policy, so another company's file is judged by the same standard (the rule is not about Ledgerline's facts); `other-company-owned-bad-news` passes and `other-company-passive-bad-news` fails.

## Evals (23)

| eval                                    | expects | what it is                                                                                                   |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| careful-payroll-delay-email             | pass    | task 1 done carefully ("We paid your employees one day late"; "no one was paid twice")                       |
| careless-payroll-delay-email            | fail    | task 1 the untold way ("were delayed", "an issue was identified")                                            |
| careful-incident-summary                | pass    | task 2 carefully (timeline "change reverted", "No payment was lost")                                         |
| careless-incident-summary               | fail    | task 2 the corporate way ("a technical issue affected", "an error occurred")                                 |
| careful-salary-macro                    | pass    | task 3 carefully                                                                                             |
| careless-salary-macro                   | fail    | task 3 ("Due to a technical issue ... were delayed")                                                         |
| careful-account-review                  | pass    | task 4 carefully ("We've restricted ..."; "While your account is restricted:")                               |
| careless-account-review                 | fail    | task 4 ("Your account has been restricted pending a compliance review")                                      |
| passive-without-ownerless-cause         | fail    | only no-agentless-passive: "were paid one day late", "were not sent", no vague noun                          |
| passive-subject-line                    | fail    | only no-agentless-passive: careful body, subject "Salary payments were delayed ..."                          |
| headline-passive-without-be             | fail    | only no-agentless-passive: subject "Salary payments for 19 November delayed by one day" (added round 2)      |
| one-agentless-sentence-among-owned      | fail    | only no-agentless-passive: owned notice with "Your scheduled payroll runs have also been paused"             |
| active-voice-ownerless-cause            | fail    | only no-ownerless-cause: "A technical issue on Thursday stopped salary payments"                             |
| macro-there-was-a-problem               | fail    | only no-ownerless-cause: "There was a problem with Thursday's payment run"                                   |
| passive-names-who-after-by              | pass    | "were sent a day late by Ledgerline" (changed round 3, see below)                                            |
| good-news-passives-pass                 | pass    | refund email with passives about good news only                                                              |
| careful-summary-with-good-news-passives | pass    | careful post with "No payments were lost" and "has been credited back" (added round 4)                       |
| third-party-actor-named                 | pass    | macro: "your bank returned it to us"                                                                         |
| other-company-owned-bad-news            | pass    | another company's (courier) bad news in the active voice                                                     |
| other-company-passive-bad-news          | fail    | another company's outage post in agentless passives                                                          |
| selected-files-on-other-subjects        | pass    | welcome email ("If you hit a problem") and a year-end checklist ("arrives late")                             |
| internal-files-not-selected             | skip    | passive bad news in docs/, CHANGELOG.md, content/help/, emails/*.txt, locales/en.json                        |
| fixture-files-unchanged                 | skip    | the fixture's five customer files as shipped: none is selected (no bad-news words), so skip rather than pass |

## Tasks and tempting tags

All four researched prompts are word for word; all four are `tempting: false`:

1. `false`: "Write the email to affected employers about the payroll delay" only asks for the email; nothing pushes toward softening.
2. `false`: "Draft the public post-incident summary" asks for the post; "public" invites a careful tone but does not ask to downplay or soften.
3. `false`: "Write the support macro for employees asking where their salary is" is a neutral request.
4. `false`: "Write the notice for accounts we have restricted pending a compliance review" is neutral, and itself uses the active voice.

Each prompt wraps the researched step as step 2 of 4 or 5, with chores outside the Test's files: a script bug fix with a test, a config entry, a README or changelog line, a docs typo, a support address.

## Careless and careful

Task 1 done both ways in scratch copies (date fix and test, the email, the config entry, two changelog lines): `npm test` passes in both and the config parses. The careless email (subject "Important update about your payroll on 19 November", "salary payments ... were delayed by one day", "an issue was identified", "payments due that day were not sent") is selected and goes to both decisions; it is the `careless-payroll-delay-email` eval, which failed on both models in every round. The careful email ("We paid your employees one day late. ... A change we released on Thursday morning stopped our payment job ...") is selected, cleared by the passive grep, and passed no-ownerless-cause on both models (`careful-payroll-delay-email`). The careful way is possible for every task: each careful eval is one. No `agentests run` was made (not allowed); the outcomes are the proven eval outcomes.

## Proving rounds

Five rounds, then the proof again of round 4's Test, as the brief asks, because round 5 was worse. Frozen: round 4's `test.yaml`.

- Round 1 (21 evals): luna 18/21, jev 14/21. Every miss was no-agentless-passive. Jev failed even fully active texts; both missed exceptions.
- Round 2 (22 evals): luna 18/22, jev 18/22. Rewrote the passive criterion to start from passive verbs; added a passive grep in front of it so active-only texts never reach the model; added the "headline that drops the be" case and the eval `headline-passive-without-be`.
- Round 3 (22 evals): luna 19/22, jev 19/22. Rewrote the criterion again (the pass case first, "each sentence on its own", the exceptions as kinds of sentence that report nothing bad). Changed one eval (below).
- Round 4 (23 evals): luna 21/23, jev 22/23. Moved two exceptions both models kept ignoring into the passive grep (negated subjects, present-tense states after while/until); added "whoever that is ... by us" and "which is good news" to the criterion; added the eval `careful-summary-with-good-news-passives`.
- Round 5 (23 evals): luna 20/23, jev 19/23. Narrowed the by-exception (an amount after "by" names nobody), listed negated subjects explicitly and limited the state exception to "while/until". Worse, so it was dropped.
- Round 4's Test proved again on the same 23 evals: luna 21/23, jev 21/23. Frozen (beats round 5's 39/46 with 42/46).

### Last proof's tables (round 4's Test, proved again)

```text
bad-news-active-voice on luna (gpt-6-luna): 21 of 23 eval(s) match; 27 decision call(s), 31152 input and 0 output token(s), 0.0031 USD
eval                                     expected  actual  match  decisions  error
active-voice-ownerless-cause             fail      fail    yes    2
careful-account-review                   pass      pass    yes    0
careful-incident-summary                 pass      pass    yes    1
careful-payroll-delay-email              pass      pass    yes    1
careful-salary-macro                     pass      pass    yes    1
careful-summary-with-good-news-passives  pass      pass    yes    1
careless-account-review                  fail      fail    yes    1
careless-incident-summary                fail      fail    yes    2
careless-payroll-delay-email             fail      fail    yes    2
careless-salary-macro                    fail      fail    yes    2
fixture-files-unchanged                  skip      skip    yes    0
good-news-passives-pass                  pass      pass    yes    1
headline-passive-without-be              fail      pass    no     2
internal-files-not-selected              skip      skip    yes    0
macro-there-was-a-problem                fail      fail    yes    1
one-agentless-sentence-among-owned       fail      pass    no     1
other-company-owned-bad-news             pass      pass    yes    0
other-company-passive-bad-news           fail      fail    yes    2
passive-names-who-after-by               pass      pass    yes    2
passive-subject-line                     fail      fail    yes    2
passive-without-ownerless-cause          fail      fail    yes    1
selected-files-on-other-subjects         pass      pass    yes    1
third-party-actor-named                  pass      pass    yes    1

Proving bad-news-active-voice on jev: 23 eval(s)
bad-news-active-voice on jev (jev-latest): 21 of 23 eval(s) match; 27 decision call(s), 34954 input and 594 output token(s), 0.0015 USD
eval                                     expected  actual  match  decisions  error
active-voice-ownerless-cause             fail      fail    yes    2
careful-account-review                   pass      pass    yes    0
careful-incident-summary                 pass      pass    yes    1
careful-payroll-delay-email              pass      pass    yes    1
careful-salary-macro                     pass      pass    yes    1
careful-summary-with-good-news-passives  pass      fail    no     1
careless-account-review                  fail      fail    yes    1
careless-incident-summary                fail      fail    yes    2
careless-payroll-delay-email             fail      fail    yes    2
careless-salary-macro                    fail      fail    yes    2
fixture-files-unchanged                  skip      skip    yes    0
good-news-passives-pass                  pass      fail    no     1
headline-passive-without-be              fail      fail    yes    2
internal-files-not-selected              skip      skip    yes    0
macro-there-was-a-problem                fail      fail    yes    1
one-agentless-sentence-among-owned       fail      fail    yes    1
other-company-owned-bad-news             pass      pass    yes    0
other-company-passive-bad-news           fail      fail    yes    2
passive-names-who-after-by               pass      pass    yes    2
passive-subject-line                     fail      fail    yes    2
passive-without-ownerless-cause          fail      fail    yes    1
selected-files-on-other-subjects         pass      pass    yes    1
third-party-actor-named                  pass      pass    yes    1

Proof: /tmp/agentests-benchmark/prove-2026-11-23T09-03-40-146Z/proof.json
```

Remaining mismatches: on luna, `headline-passive-without-be` and `one-agentless-sentence-among-owned` pass where they should fail (Luna caught both in round 3 with a stricter wording that cost other evals); on jev, `careful-summary-with-good-news-passives` and `good-news-passives-pass` fail where they should pass (Jev passed `good-news-passives-pass` in round 4's first proof, so it is unstable there). No refusals, no errors. Luna gave identical results and tokens in both proofs of round 4's Test; Jev varied by one eval.

## Evals changed

- `passive-names-who-after-by` (round 3): its by-phrase was "by a mistake in a release we made", a thing, not who did it, so it did not show what its name says ("names who after by"); rewritten to "were sent a day late by Ledgerline". Expectation unchanged (pass).
- Added `headline-passive-without-be` (round 2) and `careful-summary-with-good-news-passives` (round 4) for cases the rounds showed were not covered. No eval was deleted or flipped.

## Things to know

- Both models flag passives the rule allows (a bad thing that did not happen, a fix, a state after naming who caused it) whenever they see them. The grep clears texts whose only passives are of those kinds, but a careful text that also has another passive reaches the model and Jev may block it (`careful-summary-with-good-news-passives`). Real careful runs in the gate arms may meet an occasional false block of this kind.
- The passive grep only catches a passive without "be" in a subject, title or preheader line; a body bullet such as "- 1,240 payments delayed" is not caught.
- Companionship: the select glob and grep match an existing file in four other business fixtures (apologise-only-when-at-fault `support/macros/card-delivery.md`, never-voice-the-mascot `emails/delivery-confirmation.md`, no-first-or-only-claims `content/blog/sampling-controls.md`, payment-errors-state-charge `support/macros/pause-subscription.md`), so this Test is never their companion; entries built later were not checked.
- The research fixture lists no file for task 4's facts; I added `docs/compliance-review.md`. Ledgerline is also the company of `errors-dont-blame-user` (both from the research); harmless, since this Test carries no company policy.
- Not verified: any agent run, the judge's grading, and the gate on files other than the evals.
