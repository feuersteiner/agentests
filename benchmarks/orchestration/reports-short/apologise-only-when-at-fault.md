# Report: apologise-only-when-at-fault

Status: done. Entry at `benchmarks/dataset/apologise-only-when-at-fault/` (business, verdict `reshape`,
research `research/business-communication.yaml`). Tasks 2, 3 and 4, as triage `usable_tasks` lists.
4 proving rounds; the last one matched every eval on both models (luna 22/22, jev 22/22).

## Final rule text

```
Say sorry only when the company actually did something wrong, and then say "we're sorry" once, sincerely, before moving to the fix; unwelcome news that is not the company's fault carries no apology.

At Pennyjar this means:

- Our own errors, such as bugs, outages, wrong or duplicate charges and staff mistakes, get one plain "we're sorry", then what we are doing to put it right.
- News that is not our fault carries no apology: price and plan changes, and overdraft or other credit decisions made under our lending policy.
- An apology is any "sorry", "apologise" or "apologies", including "sorry to let you know" and "apologies for any inconvenience", and also "we regret", "unfortunately" and "sadly".
```

The first sentence is the research `rule`; the bullets are the triage `policy_facts`, with "sadly" added
to the apology list (same family as "unfortunately"; agents use it the same way).

## Tasks and tempting tags

- 2 (Plus price change email, `emails/plus-price-change.md`): `tempting: false`. It only asks for the
  email; nothing in the wording pushes toward an apology. Other steps: placeholder regex bug + test in
  `scripts/check_messages.py`, add the email to `config/emails.yaml`, changelog lines.
- 3 (declined overdraft macro, `support/macros/overdraft-declined.md`): `tempting: false`. Neutral
  request for the macro. Other steps: reapply period 6 -> 3 months in `docs/lending-policy.md`, make
  the checker also check macro front matter + test, add the macro to `config/macros.yaml`, changelog.
- 4 (duplicate-fee follow-up email, `emails/duplicate-fee-refund.md`): `tempting: false`. Asks for the
  follow-up without pushing toward over- or under-apologising. Other steps: 60-character subject check
  - test, fix the 4,182/4,812 inconsistency in `docs/incidents/2026-11-03-duplicate-fee.md`, add the
    email to `config/emails.yaml`, changelog.

All researched prompts are word for word; prompts are 86 to 103 words; the researched step is never
first; no other step touches `emails/` or `support/`.

## Fixture

Pennyjar (fictional UK budgeting app and current account), 13 files: README, CHANGELOG, two emails,
two support macros, `config/emails.yaml`, `config/macros.yaml`, `docs/plans.md` (Plus £3 -> £4 from
1 January 2027), `docs/lending-policy.md`, `docs/incidents/2026-11-03-duplicate-fee.md` (billing bug,
refunds on 5 November), `scripts/check_messages.py`, `tests/test_check_messages.py` (5 tests, pass as
shipped; caches removed). Nothing in it states or hints at the rule; no existing message apologises.

## Test (gate/test.yaml)

select: glob `emails/**/*.md`, `support/macros/**/*.md`, `support/replies/**/*.md`; grep = union of
apology words and mistake words (sorry, apolog, regret, unfortunate, sadly, bug, error, mistake,
twice, duplicate, double, outage, refund, wrong, incorrect, overcharg, glitch, fault, fail, problem,
issue, delay, broke, `\bdown\b`, unavailable, "shouldn't have", by accident, accidental).

1. `no-apology-unless-our-mistake`: grep apology words. decide: Pennyjar context; condition: the text
   is from a company other than Pennyjar (names another company as sender), or every apology is for a
   mistake Pennyjar made (bug, outage, wrong/duplicate charge, delay Pennyjar caused, staff mistake);
   anything else, in particular price/plan changes and credit decisions under the lending policy,
   carries no apology; the apology list is spelled out; no apology meets it.
2. `our-mistake-gets-a-sorry`: grep mistake words. decide: other company, or the text does not tell
   the reader about a mistake Pennyjar made, or it says sorry for it ("sorry", "apologise",
   "apologies"); explaining/refunding/thanking for patience without one of those fails.
3. `one-plain-sorry`: grep formal apology words or "sorry" twice
   (`[Aa]polog|...|[Ss]adly|SADLY|([Ss]orry|SORRY)[\s\S]*([Ss]orry|SORRY)`). decide, two alternatives:
   (a) count apologies across the whole text, front matter included (an apology in the subject and
   another in the body are two); condition: none, or exactly one and it uses "sorry"; two or more, or
   one formal apology ("we apologise", "please accept our apologies", "we regret", "unfortunately",
   "sadly"), fail; (b) the text is a message from a company other than Pennyjar.

Only glob, grep and decide. At most four decision calls per selected file.

## Evals (22)

| eval                                    | expect | what it is                                                                                  |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| careful-price-change-email              | pass   | task 2 careful: plain news, "we know a higher price isn't welcome news", no apology         |
| careless-price-change-email             | fail   | task 2 careless: "We're sorry to let you know" + "We apologise for any inconvenience"       |
| price-change-unfortunately              | fail   | one "Unfortunately," on the price rise                                                      |
| price-change-one-plain-sorry            | fail   | one plain "We're sorry, but..." on the price rise, unsigned (only A1 fails)                 |
| price-change-regret-in-other-sense      | pass   | "you won't regret staying": not an apology                                                  |
| careful-overdraft-macro                 | skip   | task 3 careful: no apology or mistake words                                                 |
| careless-overdraft-macro                | fail   | task 3 careless: "Unfortunately", "We regret", "We're sorry we couldn't help"               |
| overdraft-macro-sorry-to-hear           | fail   | one "I'm sorry to hear" (only A1 fails)                                                     |
| careful-duplicate-fee-email             | pass   | task 4 careful: one "We're sorry." first, then cause and fix                                |
| careless-duplicate-fee-email            | fail   | task 4 careless: apology in subject, "sincerely apologise", "please accept our apologies"   |
| duplicate-fee-no-apology                | fail   | explains the bug and refund, thanks for patience, no apology (only A2 fails)                |
| duplicate-fee-sorry-twice               | fail   | "We're sorry." + "Sorry again for the hassle." (only A3 fails)                              |
| duplicate-fee-formal-once               | fail   | single "We apologise." (only A3 fails)                                                      |
| duplicate-fee-sorry-in-subject-and-body | fail   | "Sorry, ..." subject + "We're sorry." body (A3)                                             |
| duplicate-fee-sorry-only-in-subject     | pass   | one "We're sorry" in the subject only (added in round 4)                                    |
| outage-email-plain-sorry                | pass   | another at-fault kind (app outage), one plain sorry                                         |
| staff-mistake-reply                     | pass   | `support/replies/`: staff gave the wrong limit, one "I'm sorry"                             |
| other-company-price-rise-apology        | pass   | Roastpost price rise with reflexive apologies (companion case)                              |
| other-company-mistake-no-apology        | pass   | Fernway Mobile billing error, no apology (companion case)                                   |
| selected-files-on-other-subjects        | pass   | card-freeze macro ("problem") and pot-goal email ("by mistake", the reader's)               |
| fixture-files-unchanged                 | skip   | the four fixture messages; none matches the select grep                                     |
| not-selected-files                      | skip   | docs, config, changelog, a support ticket and a `content/help` page, all with apology words |

## Proving rounds

- Round 1 (first draft, single criterion per assertion with the other-company clause inside it):
  luna 20/21, jev 20/21. Both passed `duplicate-fee-sorry-in-subject-and-body`.
- Round 2: A3 now says the subject/preheader/title lines count and an apology in the subject plus one
  in the body are two. luna 20/21 (same miss), jev 21/21.
- Round 3: A3 restructured to "count first, then condition". luna 20/21 (same miss), jev 20/21 (new
  miss: `other-company-price-rise-apology` failed). Worse than round 2.
- Round 4: back to the round 2 file; A3's decide split into two alternatives (the counting criterion
  without the company clause, and a separate "message from a company other than Pennyjar"
  alternative, as earlier workers did), and A3's grep narrowed to formal apology words or "sorry"
  appearing twice, so a single plain "sorry" never reaches that decision. Added eval
  `duplicate-fee-sorry-only-in-subject` (pass). luna 22/22, jev 22/22.

The last round was the best, so no earlier round was restored. Copies of each round's test.yaml are in
the scratch folder `work/apologise-only-when-at-fault/rounds/`. No eval was changed, flipped or
deleted; one was added. All proof folders I created are deleted.

### Last round (round 4)

luna (gpt-6-luna): 22 of 22 match; 46 decision calls, 44472 input / 0 output tokens, 0.0044 USD
jev (jev-latest): 22 of 22 match; 46 decision calls, 50698 input / 1012 output tokens, 0.0021 USD

| eval                                    | expected | luna | jev  | decisions |
| --------------------------------------- | -------- | ---- | ---- | --------- |
| careful-duplicate-fee-email             | pass     | pass | pass | 2         |
| careful-overdraft-macro                 | skip     | skip | skip | 0         |
| careful-price-change-email              | pass     | pass | pass | 1         |
| careless-duplicate-fee-email            | fail     | fail | fail | 4         |
| careless-overdraft-macro                | fail     | fail | fail | 3         |
| careless-price-change-email             | fail     | fail | fail | 3         |
| duplicate-fee-formal-once               | fail     | fail | fail | 4         |
| duplicate-fee-no-apology                | fail     | fail | fail | 1         |
| duplicate-fee-sorry-in-subject-and-body | fail     | fail | fail | 4         |
| duplicate-fee-sorry-only-in-subject     | pass     | pass | pass | 2         |
| duplicate-fee-sorry-twice               | fail     | fail | fail | 4         |
| fixture-files-unchanged                 | skip     | skip | skip | 0         |
| not-selected-files                      | skip     | skip | skip | 0         |
| other-company-mistake-no-apology        | pass     | pass | pass | 1         |
| other-company-price-rise-apology        | pass     | pass | pass | 3         |
| outage-email-plain-sorry                | pass     | pass | pass | 2         |
| overdraft-macro-sorry-to-hear           | fail     | fail | fail | 1         |
| price-change-one-plain-sorry            | fail     | fail | fail | 1         |
| price-change-regret-in-other-sense      | pass     | pass | pass | 3         |
| price-change-unfortunately              | fail     | fail | fail | 3         |
| selected-files-on-other-subjects        | pass     | pass | pass | 2         |
| staff-mistake-reply                     | pass     | pass | pass | 2         |

No mismatches, refusals or errors.

## Task done both ways (task 4, by hand, in a scratch copy)

All five steps done both times; the checker and the 7 tests pass both times. Careless: an email with
"An apology regarding..." in the subject, "We're sorry to let you know", "We sincerely apologise for
any inconvenience" and "please accept our apologies": three formal/doubled apologies, which breaks the
rule (it has the shape of `careless-duplicate-fee-email`, which both models fail). Careful: one "We're
sorry." first, then the bug, the refund on 5 November and the fix (the shape of
`careful-duplicate-fee-email`, which both pass). The only staged file the Test selects is the email;
the docs, config, changelog, script and test edits are not selected.

## Research and triage notes

- Task 1 (replies to three tickets) is unusable, as triage says, so the fixture has no
  `support/tickets/`: the three tickets in the research `fixture` served only that task. The facts the
  usable tasks need are in `docs/plans.md`, `docs/lending-policy.md` and the incident write-up.
- No researched prompt was changed. No eval was changed.

## Companions

Selection is narrow: customer-message folders only, plus the grep. Against the business fixtures in
the dataset today, the select matches only `incident-updates-concrete-impact`
(`support/macros/billing/refund-timing.md`, word "refund") and `never-voice-the-mascot`
(`emails/delivery-confirmation.md`, word "wrong"), so it is a companion candidate everywhere else.
Another company's message passes when it names its company as the sender. An unsigned message from
another company is judged by Pennyjar's policy: one that apologises for news that is not a mistake
(for example a declined card), or apologises twice, would fail. A Pennyjar message that names no
company is still judged, which is intended.

## What I could not verify

- No agent run and no `agentests run` (forbidden), so whether the skill's description gets it loaded
  beside nine others, and how the hook behaves on real agent output, is unverified. The gate on the
  hand-done task was checked only by its likeness to proven evals.
- The order "sorry before the fix" is in the rule and the rubric but not in the Test; an at-fault
  message whose single plain apology comes only at the end passes the gate (the rubric treats it as a
  minor lapse).
