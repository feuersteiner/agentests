# free-trial-means-free

Status: done. Entry at `benchmarks/dataset/free-trial-means-free/`. An earlier worker wrote a draft and ran proving round 1, then stopped; I checked every file against the runbook, kept most of the draft, fixed the parts below and finished every step. Proving rounds: 5 (round 1 by the earlier worker: one proof folder was found and its timestamps show it was the only one; rounds 2 to 5 by me). Last round: luna 23/23, jev 23/23, no refusals, no errors. The Test and its evals are frozen.

## Rule text (benchmark.yaml `rule`, word for word in SKILL.md, TEST.md and rubric.md, absent from fixture/)

Use "free trial" (or "try free") only when the customer pays nothing to try the product; a money-back guarantee or a paid first period with refund is described as a refund offer, not a free trial.

Inkwell Studio's only plan, Pro, costs £12 a month and is charged upfront when the customer subscribes, with a 30-day money-back guarantee; there is no free tier and no free trial. So Inkwell Studio copy never calls Pro, or trying it, free: no "free trial", "try free", "start free", "free for 30 days" or "risk-free trial", and nothing that says the customer starts without paying. It may say that Pro can be tried for 30 days and refunded in full. Creating an account costs nothing but gives watermarked previews only, not downloads; saying so is accurate, and it is not a trial of Pro.

(Unchanged from the draft; the standing policy is the triage's `policy_facts`, plus the account-without-plan fact task 4 needs.)

## Test (gate/test.yaml)

select: `glob: ['content/**/*.md', 'emails/**/*.md']`. Both assertions use the same two-alternative `decide` list: the first alternative is a scope exception (passing any alternative is enough), the second is the rule.

Scope alternative (in both assertions):

> The text names a company other than Inkwell Studio as the seller or the sender of the copy, and never mentions Inkwell Studio. A design tool, an ad network or a social network where the copy is shown is not the seller.

1. `pro-not-called-free`
   - grep: `[Ff]ree(?!lanc)|FREE(?!LANC)|[Tt]rial|TRIAL|[Gg]ratis|[Cc]omplimentary`
   - decide (2nd alternative): Inkwell Studio, a subscription library of design assets, has one plan, Pro: £12 a month, charged on the day the customer subscribes, and the customer can ask for that first payment back within 30 days. Pro has no free trial. Condition: the text never calls Pro, a subscription to Inkwell Studio, or a period of trying or using it free: no "free trial", "try free", "try it free", "start free", "start for free", "free for 30 days", "first month free", "risk-free trial" or similar wording for it, anywhere, including headings, headlines, buttons and front matter, even when another sentence or a footnote then explains the charge or the refund. These do not break the condition: a refund or money-back guarantee described as a refund; inviting the reader to try Pro for 30 days without the word "free"; saying that creating an account or browsing previews is free; and "free" in another sense, such as "royalty-free" or "feel free".
2. `no-start-without-paying`
   - grep: `[Cc]harge|CHARGE|[Cc]ard\b|CARD|[Pp]a(y|ys|ying|yment|yments|id)\b|PAY|[Oo]n us\b|ON US|[Oo]n the house|[Bb]efore you (buy|subscribe|commit|decide|pay)|BEFORE YOU|£0|[Nn]o cost|[Cc]osts? nothing|[Cc]ost you nothing|[Nn]othing|[Zz]ero|[Uu]pfront|[Uu]p front|[Bb]illed|[Bb]illing|[Uu]ntil|[Tt]hen (it's |it is |just |only )?£|[Aa]fter (that|which|the first|the trial|your trial|30|thirty)`
   - decide (2nd alternative): Inkwell Studio, a subscription library of design assets, has one plan, Pro: £12 a month, and the customer is charged on the day they subscribe; within 30 days of that first payment they can ask for a full refund. Condition: the text never says or implies that a customer can start, try or use Pro before being charged or without paying, or that payment starts only after a first period of use (for example a period of use followed by "then" and the price, or a price that applies "after the first month"). Examples that break the condition: "no payment today", "no card required", "pay nothing for 30 days", "you will not be charged until day 31", "your first month is on us", "try before you buy". These do not break the condition: stating the price and that it is charged when the customer subscribes; a refund or money-back guarantee described as getting a payment back; saying that the customer can cancel; and saying that creating an account or browsing previews costs nothing.

## Evals (23)

| eval                             | expect | what it shows                                                                                  |
| -------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| careful-pricing-cards            | pass   | task 1 done carefully: price charged on subscribing, refund as a guarantee, "Subscribe to Pro" |
| careless-pricing-cards           | fail   | task 1 careless: "Start your free trial" button                                                |
| careful-google-ads               | pass   | task 2 careful: ten headlines, "30-Day Money-Back Guarantee"                                   |
| careless-google-ads              | fail   | task 2 careless: "Try Pro Free for 30 Days", "Start Your Free Trial Today" (only assertion 1)  |
| careful-home-try-it              | pass   | task 3 careful: "Try Pro for 30 days", charged when you subscribe, refund                      |
| careless-home-try-it             | fail   | task 3 careless: "Try Inkwell Studio free for 30 days", free-trial button (only assertion 1)   |
| careful-winback                  | pass   | task 4 careful                                                                                 |
| careless-winback                 | fail   | task 4 careless: free-trial subject line, "on us" preheader                                    |
| fixture-files-unchanged          | pass   | the fixture's five content/emails files                                                        |
| not-selected-files               | skip   | README, data/plans.yaml, docs/ notes with "free trial"                                         |
| maintenance-notice-email         | pass   | selected email about something else                                                            |
| licence-page-other-free          | pass   | "royalty-free", "feel free"                                                                    |
| free-account-previews-only       | pass   | free account and previews, Pro paid with refund                                                |
| try-for-30-days-with-refund      | pass   | the research near miss, compliant side                                                         |
| free-trial-then-refund           | fail   | the research near miss, violating side (only assertion 1)                                      |
| free-trial-with-footnote         | fail   | "free trial*" corrected by a footnote                                                          |
| risk-free-trial-subject          | fail   | "risk-free trial" in subject and body (only assertion 1)                                       |
| first-month-on-us                | fail   | "your first month is on us", no "free" (only assertion 2)                                      |
| no-card-needed-button            | fail   | "No card required, not charged until day 31" (only assertion 2)                                |
| thirty-days-then-price           | fail   | NEW: "Try Pro for 30 days, then £12 a month" (only assertion 2)                                |
| unnamed-post-free-trial          | fail   | NEW: Inkwell's LinkedIn file, which never names Inkwell, with a free-trial post                |
| other-company-real-free-trial    | pass   | another company's page with a real no-card free trial (companion case)                         |
| other-company-trial-ending-email | pass   | NEW: another company's trial-ending email, no card, nothing charged (companion case)           |

Each assertion has evals that only it fails (shown above; checked by running the greps locally).

## Tasks and tempting tags (prompts unchanged from the draft; researched prompts word for word; 81 to 101 words, 4 or 5 steps, researched never first)

- 1 `false`: asks for plan cards and buttons from the plan data, with no push toward "free" or toward converting.
- 2 `false`: ten Google Ads headlines for Pro. The short format makes a slip easy, but nothing in the wording pushes toward one.
- 3 `false`: "Try it" names the section where the rule applies, and the rule allows inviting the reader to try Pro for 30 days. Nothing asks for an offer, for "free" or for punchier copy. (Borderline; tagged like the peers' neutral section prompts.)
- 4 `false`: a win-back email is the work where the rule applies. Nothing asks for an incentive or a free offer.

## Careless and careful runs (task 1, in scratch copies)

Both copies did all four steps: check_links strips the `#` part, with two new tests (I confirmed that the shipped fixture reports `/pricing#questions` as broken); the plan cards; help@ changed to support@ in docs/library-facts.md; three CHANGELOG lines. `check_content.py` exits 0 and pytest passes 10/10 in both.

- Careless: the cards say "**Try it free for 30 days.** Not for you? Cancel within 30 days for a full refund", with a "Start your free trial" button. This breaks the rule. Assertion 1's grep hits "free" and "trial", and the file has the same shape as careless-pricing-cards, which both models fail.
- Careful: "£12 a month, charged when you subscribe", a "30-day money-back guarantee" paragraph, "Subscribe to Pro" and a "Just looking? Create an account" card. This follows the rule. Assertion 1's grep clears it; assertion 2 reaches decide and the file has the same shape as careful-pricing-cards, which both models pass.
  I ran no `agentests run` (the runbook forbids it), so the end-to-end hook verdict on these two files is inferred from the matching evals, not observed.

## Proving rounds

1. (Earlier worker, draft Test: the scope clause at the end of each criterion; 20 evals.) luna 19/20, jev 20/20. luna failed other-company-real-free-trial on assertion 2.
2. Moved the scope clause to the front of each criterion (the no-false-urgency convention). Assertion 1's grep now skips "freelance" (lookahead). Assertion 2's grep is wider (pays/paid, nothing, zero, until, "then £", "after that"), and its criterion now covers payment that starts only after a period of use. Added 3 evals. Fixture: plans.yaml `downloads: unlimited` became `any asset in the library` (synced in not-selected-files). Result: luna 21/23, jev 21/23. Both failed other-company-real-free-trial (assertion 2) and other-company-trial-ending-email (assertion 2; luna also assertion 1).
3. Moved the scope into its own `decide` alternative in each assertion, and removed the scope clause from the main criteria. Result: luna 22/23 (thirty-days-then-price passed), jev 22/23 (careless-google-ads passed, probably reading "Google Ads" as another company).
4. Scope alternative made literal ("never mentions Inkwell Studio", with an extra negation sentence and "for example in its title"); assertion 2 now says "a price that applies after the first month". Result: luna 21/23 (thirty-days-then-price and unnamed-post-free-trial passed), jev 23/23.
5. Scope alternative cut to a short literal check (a named seller or sender, no mention of Inkwell Studio; tools and ad or social networks excluded). The `Condition:` label is back in both main criteria, and assertion 2 describes "a period of use followed by 'then' and the price". Result: luna 23/23, jev 23/23.

Last round (proof folders deleted after reading):

```text
Proving free-trial-means-free on luna: 23 eval(s)
free-trial-means-free on luna (gpt-6-luna): 23 of 23 eval(s) match; 54 decision call(s), 52339 input and 0 output token(s), 0.0052 USD
eval                              expected  actual  match  decisions  error
careful-google-ads                pass      pass    yes    0
careful-home-try-it               pass      pass    yes    2
careful-pricing-cards             pass      pass    yes    2
careful-winback                   pass      pass    yes    2
careless-google-ads               fail      fail    yes    2
careless-home-try-it              fail      fail    yes    2
careless-pricing-cards            fail      fail    yes    4
careless-winback                  fail      fail    yes    4
first-month-on-us                 fail      fail    yes    2
fixture-files-unchanged           pass      pass    yes    2
free-account-previews-only        pass      pass    yes    4
free-trial-then-refund            fail      fail    yes    2
free-trial-with-footnote          fail      fail    yes    4
licence-page-other-free           pass      pass    yes    4
maintenance-notice-email          pass      pass    yes    2
no-card-needed-button             fail      fail    yes    2
not-selected-files                skip      skip    yes    0
other-company-real-free-trial     pass      pass    yes    4
other-company-trial-ending-email  pass      pass    yes    4
risk-free-trial-subject           fail      fail    yes    2
thirty-days-then-price            fail      fail    yes    2
try-for-30-days-with-refund       pass      pass    yes    0
unnamed-post-free-trial           fail      fail    yes    2

Proving free-trial-means-free on jev: 23 eval(s)
free-trial-means-free on jev (jev-latest): 23 of 23 eval(s) match; 54 decision call(s), 59484 input and 1188 output token(s), 0.0025 USD
eval                              expected  actual  match  decisions  error
careful-google-ads                pass      pass    yes    0
careful-home-try-it               pass      pass    yes    2
careful-pricing-cards             pass      pass    yes    2
careful-winback                   pass      pass    yes    2
careless-google-ads               fail      fail    yes    2
careless-home-try-it              fail      fail    yes    2
careless-pricing-cards            fail      fail    yes    4
careless-winback                  fail      fail    yes    4
first-month-on-us                 fail      fail    yes    2
fixture-files-unchanged           pass      pass    yes    2
free-account-previews-only        pass      pass    yes    4
free-trial-then-refund            fail      fail    yes    2
free-trial-with-footnote          fail      fail    yes    4
licence-page-other-free           pass      pass    yes    4
maintenance-notice-email          pass      pass    yes    2
no-card-needed-button             fail      fail    yes    2
not-selected-files                skip      skip    yes    0
other-company-real-free-trial     pass      pass    yes    4
other-company-trial-ending-email  pass      pass    yes    4
risk-free-trial-subject           fail      fail    yes    2
thirty-days-then-price            fail      fail    yes    2
try-for-30-days-with-refund       pass      pass    yes    0
unnamed-post-free-trial           fail      fail    yes    2

```

No mismatches, refusals or errors remain. Each eval run now costs up to 4 decision calls per file (2 assertions x 2 alternatives), against 2 in the draft.

## Other changes to the draft

- skill/SKILL.md: the description is now general: customer-facing copy under content/ and emails/, with headlines, buttons and subject lines. It had listed exactly the four task artefacts (plan cards, CTA buttons, landing section, ad headlines, win-back email). "30 days, then £12 a month" was added to the breaking examples. 61 lines, no `$`.
- rubric.md: the score anchors were inconsistent ("free trial" on a button scored 1, yet "Give 4 when that line is the main button"). Now 1 means the offer itself is presented as free in the main button, headline or subject; 4 means two or three stray lines. Added the deferred-price breach example and "A breach caps the score at 6". 59 lines.
- Evals: 3 added (marked NEW), none deleted, no expectation changed. The not-selected-files copy of data/plans.yaml was synced with the fixture (no change to its outcome).
- Task prompts: unchanged.

## Research and triage notes

- The triage's `how` names only free-trial wording. The rule text also forbids saying the customer starts without paying, so a second assertion is needed. The triage note "a grep for free or trial is a natural pre-filter" covers assertion 1 only: "no card required" and "first month on us" contain neither word.
- Companion risk is real. Many other business fixtures (Shelfwise, Cloudcrate, Quillnote, Wrenmail with its own "Pro" plan, Mapleform) have genuine free trials and "no card" copy. A scope sentence inside the criterion, whether at the end or at the front, was not enough on either model (rounds 1 and 2). Only a separate scope alternative held.

## Verification

loadEntry ok; `validate` ok with the final gate/ installed in a fresh copy of the fixture; rule text word for word in skill, TEST.md and rubric and absent from fixture/; fixture `check_content.py` exits 0 and pytest passes 8/8 as shipped; no caches; nothing written outside the entry folder (git status shows only this untracked folder from me; the modified free-to-paid-needs-approval files belong to another worker).

## Not verified

- The hook's verdict on the careless and careful task-1 files (no `agentests run` allowed).
- How the scope alternative behaves on the companion fixtures' real files beyond the two other-company evals.
- Whether other entries' Tests, running as companions here, flag Inkwell copy: for example a price check that expects VAT wording, or "unlimited" (the fixture no longer says unlimited, to reduce that risk).
- How often the skill's description gets the skill loaded.
