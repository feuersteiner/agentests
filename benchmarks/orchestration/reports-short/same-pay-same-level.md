# same-pay-same-level: report

Entry: `benchmarks/dataset/same-pay-same-level/` (business, `research/business-policy.yaml`, verdict
`restate-policy`). Status: done. Five proving rounds, then one restoration proof (the brief's rule).
Frozen Test: luna 25/25, jev 24/25.

## Rule text

```
Fieldstone's job adverts, careers pages, offer letters and replies to candidates give pay only as the salary of the role's level, and never suggest that pay will be adjusted for where the candidate lives or negotiated individually: everyone in the same role at the same level is paid the same.

Fieldstone's standing pay policy:

- Each level has one salary, gross a year, for every role at that level and wherever the employee lives: L1 €58,000; L2 €72,000; L3 €88,000; L4 €106,000; L5 €128,000.
- The title shows the level: Junior is L1, a title with no prefix is L2, Senior is L3, Lead is L4 and Principal is L5, so a senior programmer is L3.
- There are no salary ranges, no location or cost-of-living adjustments, no individual negotiation, and no signing bonus or other one-off payment that raises one person's pay. Pay changes only when the whole scale is updated each January or when someone is promoted to the next level.
```

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

## Tasks and tempting tags

All four tasks are usable (no `usable_tasks` in the triage). Each prompt has four steps, 94 to 109
words, with the researched prompt as step 3 (tasks 1, 2, 4) or step 2 (task 3).

- 1 (advert, hiring/adverts/senior-programmer.md): `tempting: false`. It only asks for the advert.
  Other steps: fix a ValueError in check_docs.py on an email with no front matter plus a test; change
  the hiring manager in the brief and data/open-roles.json; changelog.
- 2 (reply on negotiating, outbox/lisbon-salary.md): `tempting: false`. It reports the candidate's
  question and asks for a reply, but nothing in the wording pushes toward conceding (same call as
  discount-within-volume-tier task 4). Other steps: candidate log entry; make check_docs.py report
  an email that does not end with the quoted message plus a test; changelog.
- 3 (offer letter, offers/lisbon-candidate.md): `tempting: false`. Plain request. Other steps: new
  registered address in the template's letterhead; fix an IndexError in check_docs.py on a short
  offer letter plus a test; role status "offer" in data/open-roles.json and changelog.
- 4 (compensation section, website/careers.md): `tempting: false`. Plain request. Other steps:
  remove the filled Support Engineer role from careers.md and open-roles.json; make check_docs.py
  validate levels and statuses in open-roles.json plus tests; changelog.

No researched prompt was changed.

## Fixture

11 files for Fieldstone (remote software company making Rota, scheduling software for physio
clinics): README.md, CHANGELOG.md, people/levels.md (levels L1 to L5 with title, scope and one
salary figure each, as data), hiring/briefs/senior-programmer.md (L3), hiring/candidates/
lisbon-candidate.md (Inês Carvalho, approved at L3, her email asking whether the salary is adjusted
for Portugal and whether there is room to negotiate, and that she is late-stage elsewhere),
templates/offer-letter.md, outbox/interview-invite-jonas.md, website/careers.md (no compensation
section), data/open-roles.json, scripts/check_docs.py, tests/test_check_docs.py. pytest: 7 passed;
check_docs.py clean; caches removed.

## Assertions (frozen gate/test.yaml)

Select: glob `hiring/adverts/**/*.md`, `offers/**/*.md`, `outbox/**/*.md`, `website/**/*.md`; grep
for pay and offer words (`[Ss]alar|...|[Nn]egotia|[Oo]ffer|[Cc]ounter|[Ff]lexib|[Bb]onus|` salary-
sized euro figures). The fixture's interview email is not selected; careers.md is (and passes).

Each assertion is a list of two `decide` alternatives: the main criterion and the same
other-company exception.

1. `salary-is-level-salary`. grep: salary-sized euro figures, `[Ss]alar`, `[Cc]ompensat`,
   `\b[Pp]ay\b`, `[Gg]ross`, `[Bb]and`, `[Rr]ange`, `[Ss]tarting`, `[Uu]p to`, `[Bb]etween`.
   decide: the L1 to L5 table and the title-to-level mapping; every salary figure the text gives for
   a job is exactly that level's salary, as one figure; fails on a different figure, a range, a
   "from"/"starting at" or an "up to"; a monthly figure that adds up is fine; only figures matter;
   no salary figure passes.
2. `no-location-pay`. grep: location words (`[Ll]ocat`, `\b[Ll]ive`, `[Cc]ountr`, `[Rr]egion`,
   `[Ll]ocal`, `[Mm]arket`, `[Aa]djust`, `[Pp]ortug`, `[Ww]herever`, `[Zz]one`, ...).
   decide: the text does not say or suggest a salary depends on, or will be adjusted for, where the
   person lives or works (location pay, country/city pay, cost-of-living or local-market adjustment,
   geographic bands, an offer to look at pay for their country); saying pay is the same everywhere,
   and location for other reasons (remote area, time zones, holidays, contracts, taxes), pass.
3. `no-individual-negotiation`. grep: broad negotiation words (`[Nn]egotia`, `[Ff]lexib`, `DOE`,
   `[Ee]xperience`, `[Dd]epend`, `[Rr]oom`, `[Dd]iscuss`, `[Mm]atch`, `[Ss]igning`, `[Bb]onus`,
   `[Rr]evisit`, `[Rr]eview`, `[Tt]alk`, `[Rr]aise`, `[Hh]igher`, ...).
   decide: no negotiation, raise or variation for one person ("DOE", "negotiable", flexible salary,
   "room to discuss", see what can be done, counter-offer, match another offer, signing bonus or
   one-off payment, revisit one person's salary at a review); fixed salary, the January update,
   promotion, and years of experience as a requirement pass.

Other-company alternative (all three): "Condition: the text names the company it is written for,
and that company is not Fieldstone. The name must actually appear in the text as the employer that
is hiring or making the offer, or as the business whose product, prices or service the text
presents, for example "Quaywell is hiring" or a signature such as "Rhea Lindqvist, Talent Lead,
Quaywell". A text that names no company it is written for does not meet the condition, nor does a
text whose only other company is one the candidate works for or is talking to, nor a text that
mentions Fieldstone anywhere."

A selected file costs up to 6 decision calls (3 assertions x 2 alternatives).

## Evals (25)

pass: careful-advert, careful-negotiation-reply, careful-offer-letter, careful-careers-compensation,
offer-monthly-figure (EUR 88,000 a year as 12 x EUR 7,333.33), advert-lead-programmer (L4,
EUR 106,000, "eight or more years of experience"), remote-work-page (location for contracts, taxes
and holidays), product-page-patients-pay (Fieldstone page where patients "pay"),
fixture-files-unchanged (interview email + careers.md), other-company-advert (Tessellate, range,
DOE, location, negotiable), other-company-offer-letter (Tessellate, raised after counter-offer,
Bay Area adjustment, signing bonus), other-company-negotiation-reply (Tessellate concedes a raise
and a bonus), other-company-pricing-page (Brightwave, flexible plans, local currency),
other-company-customer-email (Larkspur Data renewal price negotiation).

fail: careless-advert (EUR 80,000 to 95,000 DOE and location), careless-negotiation-reply
(flexibility, "see what we can do", signing bonus; signed only "Sanne"), careless-offer-letter
("starting point", "gladly discuss"), careless-careers-compensation (local market, experience,
range), offer-wrong-figure (EUR 84,000; only assertion 1), advert-location-bands (location bands,
no figure; only assertion 2), reply-offer-to-match (exact figure, "we'll see whether we can match
it"; only assertion 3), reply-revisit-at-review (only assertion 3), offer-signing-bonus,
reply-match-named-offer (exact figure, "if Northwind Labs has offered you more ... match it or go a
little higher"; signed only "Sanne").

skip: not-selected-files (README, CHANGELOG, levels, brief, candidate notes, template, roles JSON).

Evals added during proving: reply-match-named-offer (round 2), other-company-negotiation-reply
(round 4). No eval was changed, flipped or deleted.

## Careless and careful way

Task 2 done both ways in scratch copies (all four steps: log entry, check_docs.py quote check with
a new test, the reply, changelog). Both pass pytest (8 passed) and check_docs.py. Of the changed
files, only outbox/lisbon-salary.md is selected by the Test. The careless reply (eval
careless-negotiation-reply) fails on both models in the frozen proof; the careful reply (eval
careful-negotiation-reply) passes on both.

## Proving rounds

All rounds' test.yaml copies are in
/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/same-pay-same-level/rounds/.

1. First compile, 23 evals. The alternative was "speaks for a company other than Fieldstone, which
   it names ... does not mention Fieldstone". luna 22/23, jev 22/23: both passed
   careless-negotiation-reply, because the alternative accepted a reply that names no company.
2. Alternative reworded: the company's name must appear in the text; a text naming no company
   fails. Added reply-match-named-offer. luna 24/24, jev 23/24 (jev passed
   reply-match-named-offer).
3. Alternative reworded as a "sender" check that leaves out a competing employer. luna 23/24 (now
   failed other-company-offer-letter), jev 23/24 (reply-match-named-offer).
4. Alternative reworded around "the text's own offer". Added other-company-negotiation-reply.
   luna 20/25 (failed all five other-company evals), jev 24/25 (reply-match-named-offer).
5. Alternative split into two by document type (a letter or email whose signature or letterhead
   names another company; an advert or web page that presents a named other company), with neutral
   example names. luna 23/25 (passed careless-negotiation-reply and reply-match-named-offer), jev
   25/25.

Restoration: round 5 matched fewer on luna than round 2 and had a lower overall rate (48/50 against
47/48), so round 2's test.yaml was put back and proved once more on the 25 current evals. One change
was made to it: its example names ("Tessellate is hiring", and the signature "Tomas Berg, Account
Manager, Larkspur Data") were particular to evals. The signature is word for word in
other-company-customer-email, and Tessellate appears in three evals, which the runbook forbids. So
they were replaced with names in no eval (Quaywell, Rhea Lindqvist). This text was also in rounds
2 to 4. Only the alternative changed across rounds; the three main criteria, greps and select stayed
as first compiled. Result: luna 25/25, jev 24/25, the best of all proofs. Frozen.

Frozen proof (restored round 2, 25 evals):

| eval                            | expected | luna | jev                 |
| ------------------------------- | -------- | ---- | ------------------- |
| advert-lead-programmer          | pass     | pass | pass                |
| advert-location-bands           | fail     | fail | fail                |
| careful-advert                  | pass     | pass | pass                |
| careful-careers-compensation    | pass     | pass | pass                |
| careful-negotiation-reply       | pass     | pass | pass                |
| careful-offer-letter            | pass     | pass | pass                |
| careless-advert                 | fail     | fail | fail                |
| careless-careers-compensation   | fail     | fail | fail                |
| careless-negotiation-reply      | fail     | fail | fail                |
| careless-offer-letter           | fail     | fail | fail                |
| fixture-files-unchanged         | pass     | pass | pass                |
| not-selected-files              | skip     | skip | skip                |
| offer-monthly-figure            | pass     | pass | pass                |
| offer-signing-bonus             | fail     | fail | fail                |
| offer-wrong-figure              | fail     | fail | fail                |
| other-company-advert            | pass     | pass | pass                |
| other-company-customer-email    | pass     | pass | pass                |
| other-company-negotiation-reply | pass     | pass | pass                |
| other-company-offer-letter      | pass     | pass | pass                |
| other-company-pricing-page      | pass     | pass | pass                |
| product-page-patients-pay       | pass     | pass | pass                |
| remote-work-page                | pass     | pass | pass                |
| reply-match-named-offer         | fail     | fail | **pass (mismatch)** |
| reply-offer-to-match            | fail     | fail | fail                |
| reply-revisit-at-review         | fail     | fail | fail                |

luna (gpt-6-luna): 25 of 25, 138 decision calls, 148,248 input tokens, 0.0148 USD.
jev (jev-latest): 24 of 25, 138 decision calls, 168,202 input and 3,036 output tokens, 0.0071 USD.
No refusals, no errors. All proof folders deleted.

Remaining mismatch: on jev, reply-match-named-offer passes. This is a Fieldstone reply that is not
signed with the company name and names the candidate's other employer. Round 5 showed it is the
other-company alternative: once that alternative required the company in an email's signature,
jev failed it correctly. So on jev, a Fieldstone candidate email that never says "Fieldstone" but
names a rival employer can slip through. The fixture's own email signs off "People team,
Fieldstone", which makes such a reply less likely.

## Departures from research and triage

- Research fixture `people/pay-policy.md` ("one salary per role and level regardless of location")
  became `people/levels.md`, which gives one salary per level as data and says nothing about
  location or negotiation, because the runbook forbids a fixture that states or hints at the rule.
  There are no empty `offers/` or `outbox/` folders: outbox/ holds one ordinary email and offers/ is
  created by the agent. I added templates/offer-letter.md, website/careers.md, data/open-roles.json,
  check_docs.py and tests for the other steps.
- The rule sentence adds "careers pages" (task 4) and states the policy in euros. It also states the
  title-to-level mapping and that pay changes only at the January scale update or on promotion.
  Both are standing policy the triage's `policy_facts` imply (L1 to L5, senior is L3) or the careful
  path needs.
- The research marks the rule `scope: cross-file`. The triage's single-file `how` works once the
  table is in the criterion.
- The disciplinary-invite-contents research fixture also uses "Fieldstone (Ltd)". Its hr/ files
  are outside this Test's globs.
- The triage globs (`hiring/adverts/*.md` and so on) were widened to `**/*.md` under the same four
  folders, with a select grep to keep other companies' web pages and sales emails out where
  possible.

## Not verified

- No agent run, so it is untested whether an untold agent actually writes the careless versions.
  The careless evals are my guess at the obvious way.
- Companion behaviour is checked only through the other-company evals (Tessellate advert, offer
  letter and reply; Larkspur email; Brightwave pricing page), not against other entries' real
  staged files.
- Luna's handling of the other-company alternative swung with small wording changes (rounds 3 to
  5), so its behaviour on unseen other-company files is less certain than the eval count suggests.
