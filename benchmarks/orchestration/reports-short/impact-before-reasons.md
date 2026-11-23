# Report: impact-before-reasons

Entry: `benchmarks/dataset/impact-before-reasons/` (business, research/business-communication.yaml, verdict as-is).
Status: done. 5 proving rounds, plus one re-proof of round 2's Test on the final evals (see below). Frozen: round 5's `test.yaml`.

## Final rule text

> In a message about a change or bad news, tell readers what changes for them (what, when, how much) before explaining why the company decided it.
> A change here is one readers will not welcome, such as a price or fee rise, a plan losing an allowance or feature, stricter terms or a service ending; good news, such as a new feature or a lower price, is not covered. The first statement of each change, saying what changes and, where they apply, from when and by how much, comes before the message gives any reason for it, such as rising costs, investment, background or the company's values. A greeting, a title or subject line, or a short line saying there is news may come before it, as long as none of them gives a reason.

The first sentence is the research rule word for word. The rest is clarification, not company policy (the verdict is as-is, so no criterion carries Fernway facts). It narrows "a change" to unwelcome changes. That keeps out good-news launch posts, which companion fixtures often hold, and it matches the source ("especially if it's an uncomfortable message") and the research's category and why_agent_breaks_it (price-rise and policy emails).

## Fixture

Fernway Mobile, a UK SIM-only network. 13 files: README, CHANGELOG, `docs/changes/2027-pricing.md` (the internal memo, reasons first: costs up 18%, £40m 5G, roaming charges; the changes: +£2 a month from 1 April 2027, free EU roaming ends on Basic, EU Day Pass £2.50 a day, 12-month customers may leave fee-free until 30 April 2027), `data/plans.json`, `data/schedule.yaml`, `site/help-nav.yaml`, `emails/welcome.md`, `content/help/{roaming,your-bill}.md`, `content/notices/data-low.md`, `content/sms/bill-ready.md`, `scripts/check_content.py` with four deliberate bugs (one per task's first step), and `tests/test_check_content.py`. There are 8 tests and they pass as shipped. No caches. The rule text appears nowhere in the fixture.

## Tasks and tempting tags

All four research tasks are used, with the researched prompts word for word as step 2. Each prompt has 4 steps of 79 to 86 words: a script bug fix with a test, the researched message, a `data/schedule.yaml` or `site/help-nav.yaml` entry, and CHANGELOG lines. None of the other steps touches a file the Test selects.

- 1 (email, `emails/april-price-change.md`): **false**. It only asks for the announcement.
- 2 (in-app notice, `content/notices/eu-roaming.md`): **false**. It only asks for the notice.
- 3 (help article, `content/help/price-rise.md`): **true**. "explaining why prices are going up" makes the article about the reasons, which pushes them to the top.
- 4 (SMS under 300 characters, `content/sms/april-change.md`): **false**. The length limit pushes toward brevity, not toward reasons first.

## Test (frozen, round 5)

select: glob `['emails/**/*.md', 'content/**/*.md']` and a select-level grep of unwelcome-change vocabulary: increase, go/goes/going up, raising prices, price rise/change, higher price, costs £X more, £X a month more, new price/fee, no longer, will end, is ending, ending free, discontinu, withdraw, sunset, phase out, won't include, lose access, "we're stopping/ending/removing...", unfortunately, sorry to, regret, difficult decision, decided to, had to, changes to your, what's changing, is changing, and "from/starting/effective 1 April"-style dates. When built, it selected no file in any other business fixture and only `content/help/your-bill.md` in this one.

Assertions:

1. `change-before-reasons`. No grep. decide alternatives:
   - (scope) 'The text does not tell its readers about bad news or about a change they would not welcome, such as a price or fee rise, a plan losing an allowance or a feature, stricter terms or a service ending. Good news, such as a new feature, a new option or a lower price, is not such a change, and neither is a text that only explains how something works.'
   - (order) 'Leaving aside the title, subject line and preview line, and reading the rest of the text from the top, the text says what changes for the reader before it gives any reason for that change. A reason is any sentence or clause about why the change is made: rising costs, investment, background, or the company's history, values or beliefs, even when it does not say "because" or "so". A clause before the change, such as "To keep investing in our service, ...", is a reason that comes first. A reason placed after the change, even in the same sentence, is fine. A greeting or a line that only says there is news may come before the change. When the text has several changes, check each change against its own reasons. A text that gives no reason meets this condition.'
2. `date-and-amount-before-reasons`. No grep. decide alternatives:
   - (scope) as above.
   - 'In this text, the date and the amount of each change are given, the first time they are mentioned, before the first reason for that change. The date is when the change starts; the amount is a new price, how much a price or fee goes up, or a new charge. A text that first says only that something is changing, then explains why, and only after that gives the date or the amount, fails. Mentioning the date or the amount again after the reasons is fine. A text that gives no reason, or that gives neither a date nor an amount, meets this condition.'
3. `no-reason-in-title`. Its grep gates the model to texts whose front matter subject/title/preheader/preview/description/name line, or `# ` heading, contains reason vocabulary (invest, rising, risen, improv, upgrad, better, faster, stronger, wider, 5G, network, believ, values, fair, sustain, inflation, energy, because, so (that) we, fund, help us, commit, grow, demand, reason). decide alternatives:
   - (scope) as above.
   - 'Look only at the title, subject and preheader lines in the front matter at the top of the text and at its first # heading, and ignore the rest of the text, including any reasons given in the body. None of those lines gives a reason for a change, such as costs, investment, improvements to the network or service, or the company's values. A line that names the change, says there is news, or asks why without answering, such as "Why are prices going up?", is fine.'

## Evals (24)

| eval                                    | expect | what it shows                                                                                   |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| careful-price-email                     | pass   | task 1 done carefully: change, table, roaming, options, then why                                |
| careless-price-email                    | fail   | task 1 the obvious way: values and costs, then the change in paragraph 3                        |
| careful-roaming-notice                  | pass   | task 2 careful, no reasons at all                                                               |
| careless-roaming-notice                 | fail   | task 2: partner charges first, "So from 1 April..."                                             |
| careful-price-article                   | pass   | task 3: "Why are prices going up?" title, What's changing, then Why                             |
| careless-price-article                  | fail   | task 3: reasons sections, "What this means for you" last                                        |
| careful-sms                             | pass   | task 4: change, exit right, then "because..."                                                   |
| careless-sms-leading-clause             | fail   | task 4: "to keep investing in 5G..., from 1 April..."                                           |
| amount-after-reasons                    | fail   | "price is going up" first, £2 only after the reasons (assertion 2)                              |
| date-after-reasons                      | fail   | roaming ending first, date only after the reasons (assertion 2)                                 |
| values-opener-email                     | fail   | founding values sentence before the change (assertion 1)                                        |
| reasons-first-no-date-or-amount         | fail   | paper bills ending after reasons, with no date or amount (only assertion 1)                     |
| subject-line-gives-reason               | fail   | subject "Investing in 5G means a new price...", body change-first (only assertion 3)            |
| title-names-reasons-without-giving-them | pass   | subject "Your new Fernway price, and the reason for it", body compliant (added round 5)         |
| news-line-then-change                   | pass   | "We have some news about your plan." before the change                                          |
| empathy-line-then-change                | pass   | "We know a price rise is never welcome news." before the change (added round 3)                 |
| change-then-reason-same-sentence        | pass   | "...£2 a month more, because..."                                                                |
| second-change-after-first-reasons       | pass   | change A, its reasons, change B, its reasons                                                    |
| good-news-reasons-first                 | pass   | Fernway Plus gets more data, reasons first; good news, out of scope (added round 3)             |
| other-company-feature-launch            | pass   | Tallyhive launch post, problem first; good news                                                 |
| other-company-price-change-impact-first | pass   | Brightwater standing-charge rise, impact first                                                  |
| unrelated-article-with-change-words     | pass   | Data Boost how-to ("goes up by 5GB"), selected but not a change message                         |
| fixture-files-unchanged                 | pass   | all 5 shipped messages (your-bill.md selected, the rest skipped by grep)                        |
| not-selected-files                      | skip   | the reasons-first memo, a reasons-first support note in docs/, README, CHANGELOG, schedule, nav |

No eval was flipped, deleted or changed. I added three, as listed.

## Proving rounds

1. Two assertions (order with title included; date and amount), each with a scope alternative. luna 18/21, jev 20/21. luna wrongly failed careful-sms, change-then-reason-same-sentence and second-change-after-first-reasons; jev passed date-after-reasons.
2. Rewrote both criteria to be plainer: "the first statement ... comes before the first reason", a reason after the change "even in the same sentence or the same paragraph" is fine, "check each change against its own reasons", and a generic description of the held-back amount. luna 21/21, jev 20/21 (jev passed values-opener-email).
3. Added that a sentence about the company's history, values, beliefs, costs or plans before the change counts as a reason, and added 2 evals. luna 21/23, jev 22/23: both passed subject-line-gives-reason, and luna passed reasons-first-no-date-or-amount.
4. Split the title out into a third assertion and made the order criterion body-only. luna 20/23, jev 19/23. The new title assertion failed compliant texts on both models (it judged reasons in the body). The body assertions were right on every eval on both models.
5. Gated the title assertion with a grep for reason words in title, subject and preheader lines, told it to ignore the body, and added the eval title-names-reasons-without-giving-them. luna 23/24, jev 22/24.

Re-proof per the brief: by match rate, round 5 (45/48) was below round 2 (41/42), so I put round 2's `test.yaml` back and proved it once on the current 24 evals: luna 24/24, jev 21/24 (jev passed amount-after-reasons, subject-line-gives-reason and values-opener-email). It is a tie at 45/48. I froze **round 5**, for three reasons:

- Its body assertions (shared with round 4) matched every body-order eval on both models in both runs. Round 2's let jev pass the values opener in both of its runs, and the amount-after-reasons case in one.
- Its misses are all on subject lines.
- It is more even between the two models (23/22 against 24/21).

`gate/test.yaml` is round 5's (copies of every round are in scratch `work/impact-before-reasons/rounds/<n>/test.yaml`). All proof folders I created are deleted.

### Last round (round 5) tables

luna (gpt-6-luna): 23 of 24 match; 99 decisions, 92407 input tokens, 0.0092 USD

| eval                                    | expected | actual | match                       |
| --------------------------------------- | -------- | ------ | --------------------------- |
| amount-after-reasons                    | fail     | fail   | yes                         |
| careful-price-article                   | pass     | pass   | yes                         |
| careful-price-email                     | pass     | pass   | yes                         |
| careful-roaming-notice                  | pass     | pass   | yes                         |
| careful-sms                             | pass     | pass   | yes                         |
| careless-price-article                  | fail     | fail   | yes                         |
| careless-price-email                    | fail     | fail   | yes                         |
| careless-roaming-notice                 | fail     | fail   | yes                         |
| careless-sms-leading-clause             | fail     | fail   | yes                         |
| change-then-reason-same-sentence        | pass     | pass   | yes                         |
| date-after-reasons                      | fail     | fail   | yes                         |
| empathy-line-then-change                | pass     | pass   | yes                         |
| fixture-files-unchanged                 | pass     | pass   | yes                         |
| good-news-reasons-first                 | pass     | pass   | yes                         |
| news-line-then-change                   | pass     | pass   | yes                         |
| not-selected-files                      | skip     | skip   | yes                         |
| other-company-feature-launch            | pass     | pass   | yes                         |
| other-company-price-change-impact-first | pass     | pass   | yes                         |
| reasons-first-no-date-or-amount         | fail     | fail   | yes                         |
| second-change-after-first-reasons       | pass     | pass   | yes                         |
| subject-line-gives-reason               | fail     | fail   | yes                         |
| title-names-reasons-without-giving-them | pass     | fail   | **no** (no-reason-in-title) |
| unrelated-article-with-change-words     | pass     | pass   | yes                         |
| values-opener-email                     | fail     | fail   | yes                         |

jev (jev-latest): 22 of 24 match; 98 decisions, 106202 input and 2156 output tokens, 0.0045 USD. All rows match except:

| eval                                    | expected | actual | match                       |
| --------------------------------------- | -------- | ------ | --------------------------- |
| subject-line-gives-reason               | fail     | pass   | **no**                      |
| title-names-reasons-without-giving-them | pass     | fail   | **no** (no-reason-in-title) |

No refusals and no errors in any round.

Remaining mismatches: both models still struggle with the subject-line cases. Both wrongly fail a subject that mentions "the reason" without giving it, and jev passes a reason-led subject over a change-first body. jev also varied between runs of the same Test (round 2's Test got 20/21 and then 21/24, with different misses).

## Careless and careful, done in a scratch copy (task 1)

I did all four steps both ways: the KeyError fix with a test, the email, the schedule entry and the CHANGELOG lines. In both copies the 9 tests pass, the script reports no problem, and the select grep picks up the email.

- Careless: the email opens with values and costs and reaches the £2 rise in paragraph 3. This is the research's violating pattern, and it breaks the rule. It is the same file as the careless-price-email eval, which both models failed in round 5.
- Careful: the change, the table and the roaming change, then the options, then the reasons. It is the careful-price-email eval, which both models passed.

## Research and triage notes

- The research rule's "a change" is narrowed to unwelcome changes, with good news stated as out of scope (reason above). Triage's `how` (emails/_.md and content/\**/_.md) is followed. I widened it to `emails/**/*.md`, the same as the other entries.
- The research fixture's memo is built as described. No case fact is in any criterion; the Fernway facts are only in the fixture, the evals and the rubric (for the judge).
- The research grading note's "follows one short greeting or framing line" (3 of 4) became an allowance in the rule text: a greeting, title or news line may come first if it gives no reason.

## What I could not verify, and what the orchestrator should know

- No agent or judge was run (as the brief requires), so whether agents actually lead with reasons is not measured here.
- After I froze the Test, other workers added fixtures. The frozen select grep now also matches existing files in 3 of the 32 other business fixtures: balanced-investment-promotions ("withdraw", "go up"), no-preannouncing-features ("lose access", "change to your") and subject-lines-tell-dont-sell ("From 2 Dec"). So this Test will not be drawn as a companion for those three. This does not block any run, and I did not change it because `gate/` was frozen.
- jev's answers varied from run to run on the same Test and evals.
