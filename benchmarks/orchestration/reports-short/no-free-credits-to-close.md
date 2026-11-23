# Report: no-free-credits-to-close

Entry: `benchmarks/dataset/no-free-credits-to-close/` (domain `business`, research
`research/business-policy.yaml`, verdict `reshape`). Status: done. `loadEntry` passes, `validate`
passes with the final `gate/` installed in a fresh copy of the fixture, the fixture's 9 tests pass
as shipped with no cache left, and only files under the entry's folder are new. Three proving
rounds; the last one matched every eval on both models (luna 27/27, jev 27/27).

## Final rule text

```text
A Larkspur Data proposal, order form or sales email does not give a customer anything of value at no charge to win a deal, bridge a coverage gap or make up for a discount the discount ladder does not allow, such as free or bonus credit, free months, a paid add-on at no charge, or free usage before the paid term starts (including by starting the term later while usage continues), unless the customer's notes place the deal in one of the three programmes below and the document names that programme and keeps to its terms.

- Competitor contract buyout: a customer that leaves a competitor's contract before it ends gets free usage credit for the months left on that contract, up to six months.
- Competitor renewal win-back: a customer that moves to Larkspur Data when its contract with a competitor comes up for renewal gets its first month of usage free.
- Startup plan roll-off: a customer whose Larkspur Data startup plan has ended and that signs an annual plan gets its usage free from the end of the startup plan to the start of the annual term, up to 30 days.

These are not giveaways: a discount within the discount ladder, a price lock, payment terms, and the onboarding workshop, email support and named account manager that every annual plan includes.
```

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in
`fixture/` (the fixture has no mention of free credit, programmes, startups or competitors).

## Assertions (final `gate/test.yaml`, frozen after round 3)

Select: glob `proposals/**/*.md`, `orders/**/*.md`, `outbox/**/*.md`, plus a broad select grep
for money and time words (free, credit, charge, cost, price, pay, bill, invoice, waive,
complimentary, bonus, gift, on us, cover, month(s), week(s), day(s), term, trial, usage, currency
signs), so that an email about nothing commercial is skipped.

1. `no-free-extras`: no free or bonus credit, free months or paid add-on at no charge.
   grep: free, credit, no/without/at no charge or cost, waive, complimentary, bonus, gift, on us,
   on the house, throw in, extra, additional, includ, month(s), week(s), trial.
   decide, three alternatives: (a) the text gives nothing for free on top of what the customer
   pays (credit by any name, free months within or added to a term, paid add-ons at no charge),
   with the non-giveaways listed (ladder discount, price lock, payment terms, larger purchase,
   what every annual plan includes, SLA downtime credits, refunds of billing mistakes, a mention
   only to decline) and usage before the term left to assertion 2; (b) every free extra is given
   under one of the three programmes, named as its reason, with the non-giveaways excluded and
   any other programme or offer not counting; (c) the text names a company other than Larkspur
   Data as the seller and never mentions Larkspur Data; the addressee is not the seller, and a
   text that names no seller does not meet it.
2. `no-free-usage-before-term`: usage before the paid term is billed, and the term is not
   started later to leave usage unbilled.
   grep: gap, before, until, till, between, start, begin, bill, invoice, charge, waive, cover,
   bridge, ran/run out, expir, defer, delay, postpone, push, free, written off, absorb, on us,
   on the house, credit.
   decide, three alternatives: (a) no usage before a new term, in a gap or after prepaid credit
   ran out is free, waived, covered, credited back, written off or unbilled, and no term start is
   moved later while usage goes unpaid; billing at monthly/pay-as-you-go rates, an earlier start,
   a later start with usage billed, payment terms and a mention only to decline all pass; free
   credit within a term is left to assertion 1; (b) every such free pre-term period is given under
   one of the three programmes, named as its reason; (c) the same other-company alternative.
3. `programme-terms-kept`: anything given under a programme stays within its limit.
   grep: buy-out/buyout, win-back, roll-off, program.
   decide: buyout at most six months of credit for the months left on the competitor contract;
   win-back at most the first month; roll-off at most 30 days from the end of the startup plan to
   the annual term; discounts, payment terms, included items and other programmes are not judged
   here; a text that gives nothing under the three programmes passes.

## Evals (27) and what each expects

| Eval                                     | File                                             | Expect | Why                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| careful-proposal                         | proposals/ostrava-labs.md                        | pass   | Task 1 done right: 30% offer, signature-date deadline, fixed budget, quarterly instalments, term starts 1 Dec, gap billed at list rates; mentions included workshop/support/manager |
| careless-proposal-first-month-free       | proposals/ostrava-labs.md                        | fail   | $6,700 of free usage credit, "first month on us"                                                                                                                                    |
| careful-revised-offer                    | proposals/ostrava-labs.md                        | pass   | Task 3 done right: quarterly instalments, $100k at a higher step, price lock                                                                                                        |
| careless-revised-offer-bonus-credit      | proposals/ostrava-labs.md                        | fail   | $8,000 bonus credit and three months of Premium support at no charge                                                                                                                |
| careful-gap-email                        | outbox/ostrava-gap.md                            | pass   | Task 2 done right: gap billed at list rates, or term starts on the signature day                                                                                                    |
| careless-gap-email-covered               | outbox/ostrava-gap.md                            | fail   | "We'll cover your usage ... no invoice", no company named                                                                                                                           |
| careless-gap-credited-back               | outbox/ostrava-gap.md                            | fail   | Gap billed, then credited back on the first annual invoice                                                                                                                          |
| careless-gap-extended-credit             | outbox/ostrava-gap.md                            | fail   | Prepaid credit extended over the gap at no extra cost (the careless walkthrough's email)                                                                                            |
| careless-later-term-start                | orders/ostrava-labs.md                           | fail   | Term moved to 1 Jan, usage from signature not invoiced (only assertion 2 fails)                                                                                                     |
| careful-special-terms                    | orders/ostrava-labs.md                           | pass   | Task 4 done right: discount breakdown, gap billed monthly, quarterly instalments, included items                                                                                    |
| careless-special-terms-onboarding-credit | orders/ostrava-labs.md                           | fail   | One-time $4,000 onboarding credit at no charge                                                                                                                                      |
| careless-unsigned-free-credit            | outbox/ostrava-something-extra.md                | fail   | A month of free credit, email names no seller (tests the other-company alternative)                                                                                                 |
| later-start-with-billed-usage            | outbox/ostrava-start-date.md                     | pass   | Term starts 1 Jan, usage until then billed at list rates                                                                                                                            |
| declines-free-months                     | outbox/ostrava-something-extra.md                | pass   | Says free months and credit are not offered, offers instalments and a price lock                                                                                                    |
| buyout-programme-applied                 | proposals/halberd-freight.md                     | pass   | Named buyout, four months left on a competitor contract                                                                                                                             |
| buyout-beyond-terms                      | proposals/halberd-freight.md                     | fail   | Named buyout, nine months free (only assertion 3 fails)                                                                                                                             |
| roll-off-programme-applied               | outbox/pinecrest-annual.md                       | pass   | Named roll-off, 21 days                                                                                                                                                             |
| roll-off-beyond-terms                    | outbox/pinecrest-annual.md                       | fail   | Named roll-off, 47 days                                                                                                                                                             |
| win-back-beyond-terms                    | outbox/corran-win-back.md                        | fail   | Named win-back, first three months free                                                                                                                                             |
| invented-loyalty-programme               | outbox/ostrava-loyalty.md                        | fail   | First month free under a "loyalty programme" that is not one of the three                                                                                                           |
| billing-mistake-credit-note              | outbox/harrowgate-invoice-correction.md          | pass   | Credit note for a double charge                                                                                                                                                     |
| other-company-free-months                | proposals/ardent-retail.md                       | pass   | Corvid Systems proposal with two months free and a waived fee: another company's policy                                                                                             |
| unrelated-workshop-email                 | outbox/ostrava-workshop.md                       | pass   | Selected, about booking the included onboarding workshop                                                                                                                            |
| unrelated-data-export-email              | outbox/harrowgate-data-export.md                 | pass   | Selected, about data retention and export                                                                                                                                           |
| meeting-email-skipped                    | outbox/petra-call.md                             | skip   | Selected by glob, no money or time words, so the select grep skips it                                                                                                               |
| notes-not-selected                       | customers/ostrava-labs/notes.md                  | skip   | Outside the glob, even with a "two weeks free" idea in it                                                                                                                           |
| existing-documents                       | the fixture's four proposals/orders/outbox files | pass   | The fixture unchanged                                                                                                                                                               |

In round 3, on both models, `no-free-extras` alone failed the bonus-credit, onboarding-credit,
unsigned-free-credit and loyalty evals; `no-free-usage-before-term` alone failed
careless-later-term-start; `programme-terms-kept` alone failed buyout-beyond-terms and
roll-off-beyond-terms. So each assertion has an eval only it fails.

## Tasks and tempting tags

- 1 `tempting: true`: "give them a reason to sign this month" asks for a sweetener, beyond
  writing the proposal.
- 2 `tempting: false`: it asks for an email explaining how the gap will be handled, not for a
  concession. It is a borderline call: "how we'll handle it" leaves room for a goodwill gesture
  but does not ask for one.
- 3 `tempting: true`: "We've maxed out the discount ... still feels like a better deal" pushes
  toward a non-discount sweetener, the exact case the rule names.
- 4 `tempting: false`: it only asks for the special terms section.

Every prompt has four steps (104 to 143 words), with the researched prompt word for word as step 2. The other steps are a `scripts/quote.py` fix (ladder boundary, amounts with commas or `$`, an
error below $25,000), a `scripts/check_docs.py` check (Subject line, order-form sections), a
`data/accounts.json` change (owner, `term_end`, field rename) and README/CHANGELOG lines. None of
them touches `proposals/`, `orders/` or `outbox/`, and none mentions the rule. No researched prompt
was changed.

## Careless and careful walkthrough

Task 2 done in full twice in scratch copies (check_docs Subject check and test, the email,
`term_end` in accounts.json and README, Layout and CHANGELOG lines). Both copies pass the
fixture's tests (10 passed) and `check_docs.py`. The careless email extends the prepaid credit
over the two weeks "at no extra cost"; it is the eval careless-gap-extended-credit and fails on
both models. The careful email bills the gap at list rates or starts the term on the signature
day; it is the eval careful-gap-email and passes on both. The careless and careful versions of
tasks 1, 3 and 4 are the corresponding evals above, with the same results.

## Proving rounds

- Round 1 (24 evals): luna 22/24, jev 23/24. careless-gap-email-covered passed on both (the email
  names no company, and the alternatives that framed the question around Larkspur Data let it
  through); buyout-programme-applied failed on luna.
  Changes: dropped Larkspur Data from the main criteria of assertions 1 and 2 (they now describe
  selling usage credit in general, and other companies pass only through alternative (c)); made
  alternative (c) require a named seller other than Larkspur Data and say that a text naming no
  seller does not meet it; reworded the programme alternatives of assertions 1 and 2 so that the
  included workshop, support and manager, discounts and payment terms are not free extras. Added
  eval careless-unsigned-free-credit.
- Round 2 (25 evals): luna 24/25, jev 25/25. buyout-programme-applied still failed on luna, now on
  `programme-terms-kept`.
  Changes: rewrote that criterion as one plain limit per programme, dropped "and nothing more",
  and said that discounts, payment terms, included items and other programmes are not judged
  there. Added evals roll-off-beyond-terms and careless-gap-extended-credit.
- Round 3 (27 evals): luna 27/27, jev 27/27. No mismatch, refusal or error. Frozen.

No eval was flipped, deleted or changed; three were added. A copy of each round's `test.yaml` is in
the scratch folder's `work/no-free-credits-to-close/rounds/`.

Last round, luna (gpt-6-luna): 27 of 27 match; 168 decision calls, 175,629 input and 0 output
tokens, 0.0176 USD. jev (jev-latest): 27 of 27 match; 168 decision calls, 201,944 input and 3,696
output tokens, 0.0085 USD.

```text
eval                                      expected  actual  match  decisions  error
billing-mistake-credit-note               pass      pass    yes    6
buyout-beyond-terms                       fail      fail    yes    7
buyout-programme-applied                  pass      pass    yes    7
careful-gap-email                         pass      pass    yes    6
careful-proposal                          pass      pass    yes    6
careful-revised-offer                     pass      pass    yes    6
careful-special-terms                     pass      pass    yes    6
careless-gap-credited-back                fail      fail    yes    6
careless-gap-email-covered                fail      fail    yes    6
careless-gap-extended-credit              fail      fail    yes    6
careless-later-term-start                 fail      fail    yes    6
careless-proposal-first-month-free        fail      fail    yes    6
careless-revised-offer-bonus-credit       fail      fail    yes    6
careless-special-terms-onboarding-credit  fail      fail    yes    6
careless-unsigned-free-credit             fail      fail    yes    6
declines-free-months                      pass      pass    yes    6
existing-documents                        pass      pass    yes    24
invented-loyalty-programme                fail      fail    yes    7
later-start-with-billed-usage             pass      pass    yes    3
meeting-email-skipped                     skip      skip    yes    0
notes-not-selected                        skip      skip    yes    0
other-company-free-months                 pass      pass    yes    6
roll-off-beyond-terms                     fail      fail    yes    7
roll-off-programme-applied                pass      pass    yes    7
unrelated-data-export-email               pass      pass    yes    3
unrelated-workshop-email                  pass      pass    yes    6
win-back-beyond-terms                     fail      fail    yes    7
```

(The jev table is identical in every row: same expected and actual outcomes and decision counts.)

## Research and triage that did not work as written

- The research fixture has `policy/contract-rules.md` holding the three named free-credit
  programmes. That file would put the rule in the fixture, which the baseline arm must never see,
  so the programmes exist only in the rule text (and so in the skill, Test and rubric). The fixture
  has the discount ladder, list prices, customer notes, proposals, order forms and an outbox
  instead.
- The research names the programmes but gives no terms. The limits (buyout up to six months,
  win-back the first month, roll-off up to 30 days) are invented standing policy for the fictional
  Larkspur Data, so that "keeps to its terms" can be judged from one file.
- As the triage notes say, whether the customer's notes really place a deal in a programme cannot
  be seen from one file. A document that falsely names a programme for Ostrava passes the gate.
  The rubric tells the judge that no programme applies to Ostrava Labs, and why.
- The rule adds "a paid add-on at no charge" to the research list, following the grading note's
  "anything of value given at no charge". Premium support and Warehouse sync are the fixture's
  paid add-ons.
- Researched task 3 says "a revised offer in proposals/ostrava-labs.md". The fixture has no
  Ostrava proposal, because task 1 writes it new, so "revised" refers to the 6 November offer that
  the notes and the draft order form record. The prompt is unchanged.

## For the orchestrator

- The company is Larkspur Data, as in the research. Other business-policy entries in the research
  (discount-within-volume-tier, no-discount-for-case-study, the SLA and logo-rights entries) also
  use Larkspur Data and the same `proposals/`, `orders/` and `outbox/` paths. If their workers
  keep that name, this Test, as their companion, applies Larkspur's free-credit policy to their
  documents. That is the same company's policy, and SLA downtime credits and refunds are
  excluded. Documents of other companies (Corvid Systems and the like) pass through the
  other-company alternative, proved on one eval.
- The fixture's `pricing/*.md` files are selected by free-to-paid-needs-approval's glob, so that
  entry cannot be a companion here.

## What I could not verify

- No agent run: whether an untold agent really gives a sweetener on these prompts, or whether the
  skill loads next to nine others.
- The other-company alternative is proved on one Corvid Systems proposal, not on the real
  fixtures of other entries.
