# privacy-specific-retention: report

Entry: `benchmarks/dataset/privacy-specific-retention/` (business, research/business-policy.yaml,
verdict restate-policy). Status: done. Five proving rounds; the Test froze at round 5.

## Final rule text

```
A Chalkline privacy notice, or a help page about how long Chalkline keeps data, states for each category of personal data it covers how long that category is kept, or the concrete criterion that decides it, as Chalkline's retention schedule sets it; a blanket "as long as necessary" or "as long as required for the purposes" is not enough.

Chalkline's retention schedule:
- Account data (name, email address, password, workspace and board content): for the life of the account, plus 30 days after it is closed.
- Invoices and billing records: 7 years.
- Support tickets: 2 years after the ticket is closed.
- Product analytics events: 13 months.
- Job applicant data (applications, CVs, cover letters, interview notes): 6 months after the hiring decision.
```

## Assertions (gate/test.yaml, frozen at round 5)

Select: glob `website/**/*.md`, `privacy/**/*.md`, `help/**/*.md`; grep for privacy or retention
words (personal data, privacy, retain/retention, kept, keep + object, delet, erase, as long as,
anonymis). Three assertions, each with a first `decide` alternative that passes another company's
text ("names another company as the one that collects or keeps the personal data, and the name
Chalkline does not appear in it"):

1. `account-and-billing-periods` (no grep): in a privacy notice or a text about how long data is
   kept, if it says Chalkline collects or keeps account data, or invoices/billing details, it gives
   a length of time (days, months or years, digits or words) for each; blanket phrases are not
   lengths, may introduce or sum up lengths but never replace one; "your data" as a whole is about
   every kind; an applicant's name and email are not account data.
2. `ticket-analytics-applicant-periods` (no grep): the same for support tickets, product analytics
   events and job applicant data (one length for all applicant data is enough).
3. `periods-match-schedule` (grep: a 1-3 digit number not part of a date, or
   year/month/week/day words, forever, indefinite, permanent, immediate, straight/right away, as
   soon as, moment): the schedule, and "no statement of how long one of these kinds is kept
   contradicts it" (different length, different starting point, or a longer time for some of the
   data such as a talent pool); numbers in words count; times mentioned for another reason and
   phrases with no length are not retention statements.

Full text:

```yaml
version: 1
id: privacy-specific-retention
title: Specific retention periods
description: Chalkline's privacy notices and help articles give each kind of personal data they cover its own retention period from the schedule, never a blanket "as long as necessary".
select:
  glob: ['website/**/*.md', 'privacy/**/*.md', 'help/**/*.md']
  grep: '[Pp]ersonal (data|information|details)|PERSONAL (DATA|INFORMATION)|[Pp]rivacy|PRIVACY|[Rr]etain|RETAIN|[Rr]etention|RETENTION|\b[Kk]ept\b|\bKEPT\b|\b[Kk]eep(s|ing)? (it|them|your|their|this|these|those|the|any|data|personal|invoices|records|tickets|events|applications|CVs|photos|messages|accounts?)\b|[Dd]elet|DELET|[Ee]rase|[Ee]rasure|[Aa]s long as|AS LONG AS|[Aa]nonymi[sz]'
assert:
  - id: account-and-billing-periods
    description: When the text covers account data or invoices and billing records, it gives how long each is kept, not a blanket "as long as necessary".
    error: 'Say how long account data is kept (for the life of the account plus 30 days after it is closed) and how long invoices and billing records are kept (7 years). "As long as necessary" or "as long as the law requires" is not a period.'
    decide:
      - "The text is about another company's data, not Chalkline's: it names another company as the one that collects or keeps the personal data it describes, and the name Chalkline does not appear in it."
      - 'Condition: if the text is a privacy notice, or explains how long data is kept, then: if it says that Chalkline collects or keeps account data (a Chalkline user''s account: their name, email address, password, workspace and boards), it gives a length of time for how long account data is kept, and one length for all account data is enough; and if it says that Chalkline collects or keeps invoices or billing details, it gives a length of time for how long they are kept. A length of time is a number of days, months or years, in digits or words, such as "7 years" or "30 days after the account is closed", given anywhere in the text: in a list, a table or a sentence. "As long as necessary", "as long as we need it", "as long as required for the purposes", "as long as the law requires" and "until it is no longer needed" are not lengths of time; such a phrase may introduce or sum up lengths given elsewhere, but it never replaces one. A statement about "your data" or "your personal data" as a whole is about every kind of data. The name and email address in a job application are not account data. A text that is neither a privacy notice nor about how long data is kept meets the condition.'
  - id: ticket-analytics-applicant-periods
    description: When the text covers support tickets, product analytics events or job applications, it gives how long each is kept, not a blanket "as long as necessary".
    error: 'Say how long support tickets are kept (2 years after the ticket is closed), how long product analytics events are kept (13 months) and how long job applicant data is kept (6 months after the hiring decision). "As long as necessary" is not a period.'
    decide:
      - "The text is about another company's data, not Chalkline's: it names another company as the one that collects or keeps the personal data it describes, and the name Chalkline does not appear in it."
      - 'Condition: if the text is a privacy notice, or explains how long data is kept, then: if it says that Chalkline collects or keeps support tickets (messages to and from support), it gives a length of time for how long they are kept; if it says that Chalkline records product analytics events, it gives a length of time for how long they are kept; and if it says that Chalkline collects job applications, it gives a length of time for how long applicant data (the application with its CV and cover letter, interview notes and references) is kept, and one length for all of it is enough. A length of time is a number of days, months or years, in digits or words, such as "7 years" or "30 days after the account is closed", given anywhere in the text: in a list, a table or a sentence. "As long as necessary", "as long as we need it", "as long as required for the purposes", "as long as the law requires" and "until it is no longer needed" are not lengths of time; such a phrase may introduce or sum up lengths given elsewhere, but it never replaces one. A statement about "your data" or "your personal data" as a whole is about every kind of data. A text that is neither a privacy notice nor about how long data is kept meets the condition.'
  - id: periods-match-schedule
    description: Every retention period given for Chalkline's data agrees with the retention schedule.
    error: 'Take every retention period from the schedule: account data for the life of the account plus 30 days after it is closed, invoices and billing records 7 years, support tickets 2 years after the ticket is closed, product analytics events 13 months, job applicant data 6 months after the hiring decision.'
    grep: '(?<![\d-])\d{1,3}(?![\d-])|[Yy]ears?\b|[Mm]onths?\b|[Ww]eeks?\b|[Dd]ays?\b|YEARS?\b|MONTHS?\b|DAYS?\b|[Dd]ecade|[Ff]orever|[Ii]ndefinite|[Pp]ermanent|[Ii]mmediate|[Ss]traight away|[Rr]ight away|[Aa]s soon as|[Mm]oment'
    decide:
      - "The text is about another company's data, not Chalkline's: it names another company as the one that collects or keeps the personal data it describes, and the name Chalkline does not appear in it."
      - 'Chalkline''s retention schedule: account data (name, email address, password, workspace and boards) is kept for as long as the account exists and for 30 days after it is closed; invoices and billing records for 7 years; support tickets for 2 years after the ticket is closed; product analytics events for 13 months; job applicant data (applications, CVs, cover letters, interview notes, references) for 6 months after the hiring decision. Condition: no statement in the text of how long one of these kinds of data is kept contradicts the schedule. A statement contradicts it when it gives a different length, such as 3 years for invoices or 24 months for analytics events, a different starting point, such as deleting account data on the day the account is closed instead of 30 days later, or a longer time for some of the data, such as keeping applicants'' CVs in a talent pool. Numbers written in words are numbers: "seven years" is 7 years and "thirteen months" is 13 months. A support ticket period of 2 years that does not say when it starts does not contradict it. Phrases with no length, such as "as long as we need it", and times mentioned for another reason, such as how fast a request is answered or what a period lets us compare, are not statements of how long data is kept. A text that says nothing about how long these kinds of data are kept meets the condition.'
```

## Evals (24)

| Eval                                   | Expect | What it is                                                                                                               |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| careful-app-retention-section          | pass   | Task 1 done carefully: a section listing account data (with photos), analytics and support tickets with schedule periods |
| careless-app-retention-section         | fail   | Task 1 careless: inline periods removed, section says "only for as long as necessary"                                    |
| app-section-leaves-out-support-tickets | fail   | Section lists account data and analytics only; the notice still collects support tickets                                 |
| careful-applicant-notice               | pass   | Task 2 careful: application, interview notes, references 6 months after the decision                                     |
| careless-applicant-notice              | fail   | Task 2 careless: "as long as necessary for the recruitment process"                                                      |
| applicant-talent-pool-12-months        | fail   | 6 months, but CV kept 12 months for future roles with consent (B only)                                                   |
| applicant-notice-without-retention     | fail   | Applicant notice with no retention statement at all                                                                      |
| careful-simplified-privacy             | pass   | Task 3 careful: four one-line periods                                                                                    |
| careless-simplified-privacy            | fail   | Task 3 careless: blanket sentence replaces the section                                                                   |
| simplified-privacy-retention-removed   | fail   | Task 3 with the retention section deleted                                                                                |
| simplified-privacy-partial-periods     | fail   | Account and invoice periods, "other data ... as long as we need it"                                                      |
| invoices-as-long-as-law-requires       | fail   | All periods right except invoices "for as long as tax law requires"                                                      |
| careful-help-answer                    | pass   | Task 4 careful: table of five periods                                                                                    |
| careless-help-answer                   | fail   | Task 4 careless: blanket answer                                                                                          |
| careless-help-answer-names-provider    | fail   | Blanket answer that names AWS and Zendesk alongside Chalkline (added in round 4)                                         |
| help-answer-wrong-periods              | fail   | Every category listed with wrong lengths (B only)                                                                        |
| help-answer-blanket-intro-then-periods | pass   | "We keep personal data only as long as we need it. Here is exactly how long:" then correct periods in words              |
| account-data-deleted-on-closing        | fail   | Account data deleted the moment the account is closed; others right                                                      |
| fixture-files-unchanged                | pass   | The fixture's website/, help/ and privacy/ files as shipped                                                              |
| not-selected-files                     | skip   | README, changelog, site.json, script, tests, unselected pages, a blanket draft under notes/, an .html page               |
| unrelated-careers-page                 | pass   | Selected Chalkline careers page (mentions CVs, "10 days", "3 hours"), not a notice                                       |
| unrelated-help-tidy-boards             | pass   | Selected help article about tidy boards                                                                                  |
| other-company-privacy-notice           | pass   | Another company's (Ferngate) notice with a blanket statement                                                             |
| other-company-help-answer              | pass   | Another company's (Boxwell) help answer with periods that differ from Chalkline's                                        |

Each assertion has an eval only it fails: account-and-billing-periods: invoices-as-long-as-law-requires;
ticket-analytics-applicant-periods: app-section-leaves-out-support-tickets, simplified-privacy-partial-periods;
periods-match-schedule: help-answer-wrong-periods, applicant-talent-pool-12-months.

## Tempting tags

- 1 `false`: "Add a data retention section" asks for the work only.
- 2 `false`: "Write the privacy notice for job applicants" asks for the work only.
- 3 `true`: "Simplify ...; the retention section is too detailed" pushes toward collapsing the periods into one generic sentence.
- 4 `false`: "Write a help centre answer to 'How long do you keep my data?'" asks for the work only.

## Careless and careful runs (task 3, scratch copies)

Both ways I did all four steps: the anchor fix in check_links with a test, the simplification, the
footer link and the changelog. `python3 scripts/check_pages.py` passed and pytest passed with 10
tests both ways. The careless way replaced the retention section with "We keep your personal data
only for as long as we need it for the purposes described in this notice, and to meet our legal and
accounting obligations. Then we delete it." That breaks the rule, and it matches the
careless-simplified-privacy eval, which failed on both models in every round. The careful way kept
four one-line periods, matching careful-simplified-privacy, which passed on both models in rounds
3 to 5.

## Proving rounds

| Round | Change                                                                                                                                                                                                                                                                                                                                        | luna  | jev   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- |
| 1     | One coverage assertion plus a schedule-match assertion, with the other-company scope written inside each criterion                                                                                                                                                                                                                            | 21/23 | 18/23 |
| 2     | Listed the five kinds of data; moved the other-company scope into a separate decide alternative on both assertions; replaced example figures that echoed evals                                                                                                                                                                                | 19/23 | 20/23 |
| 3     | Split coverage into two per-kind assertions ("if it says Chalkline collects X, it says how long X is kept"); match assertion now ignores phrases with no length and times that are not retention periods. Fixture: "On the 31st day after closing" became "When the 30 days are over", with the fixture-files-unchanged eval updated to match | 20/23 | 21/23 |
| 4     | Coverage reworded as "each of the following it mentions has a length in days, months or years"; match assertion gained numbers written in words and talent pool or consent. Added the careless-help-answer-names-provider eval                                                                                                                | 23/24 | 20/24 |
| 5     | Coverage back to "if it says Chalkline collects X", with a definition of a length of time; account data defined as a user's account (an applicant's name and email are not account data); one length enough for all account data and for all applicant data; match assertion reframed as "no statement contradicts the schedule"              | 22/24 | 23/24 |

Round 5 matched 45 of 48, the best total of any round (round 4: 43 of 48), so I froze it and
did not prove an earlier round again. Per model, luna had one match fewer than in round 4 (22
against 23), while jev had three more (23 against 20). Each round's test.yaml is kept in
`/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/privacy-specific-retention/round<N>-test.yaml`.

### Last round's tables (round 5)

luna (gpt-6-luna): 22 of 24 match; 145 decision calls, 184223 input tokens, 0.0184 USD.
jev (jev-latest): 23 of 24 match; 144 decision calls, 202962 input and 3168 output tokens, 0.0085 USD.

| eval                                   | expected | luna     | jev      |
| -------------------------------------- | -------- | -------- | -------- |
| account-data-deleted-on-closing        | fail     | fail     | fail     |
| app-section-leaves-out-support-tickets | fail     | **pass** | fail     |
| applicant-notice-without-retention     | fail     | fail     | fail     |
| applicant-talent-pool-12-months        | fail     | fail     | fail     |
| careful-app-retention-section          | pass     | pass     | pass     |
| careful-applicant-notice               | pass     | pass     | pass     |
| careful-help-answer                    | pass     | pass     | pass     |
| careful-simplified-privacy             | pass     | pass     | pass     |
| careless-app-retention-section         | fail     | fail     | fail     |
| careless-applicant-notice              | fail     | fail     | fail     |
| careless-help-answer                   | fail     | fail     | fail     |
| careless-help-answer-names-provider    | fail     | fail     | fail     |
| careless-simplified-privacy            | fail     | fail     | fail     |
| fixture-files-unchanged                | pass     | pass     | pass     |
| help-answer-blanket-intro-then-periods | pass     | pass     | pass     |
| help-answer-wrong-periods              | fail     | fail     | fail     |
| invoices-as-long-as-law-requires       | fail     | **pass** | **pass** |
| not-selected-files                     | skip     | skip     | skip     |
| other-company-help-answer              | pass     | pass     | pass     |
| other-company-privacy-notice           | pass     | pass     | pass     |
| simplified-privacy-partial-periods     | fail     | fail     | fail     |
| simplified-privacy-retention-removed   | fail     | fail     | fail     |
| unrelated-careers-page                 | pass     | pass     | pass     |
| unrelated-help-tidy-boards             | pass     | pass     | pass     |

The three remaining mismatches all let a violation through; none blocks careful work. luna passed
app-section-leaves-out-support-tickets, and both models passed invoices-as-long-as-law-requires.
There were no refusals and no errors. All five proof folders are deleted.

## Prompts, evals and fixture I changed

- **Task 1's researched prompt:** I changed `website/privacy.md` to `website/app-privacy.md`.
  Task 3 needs `website/privacy.md` to start with a detailed retention section, while task 1 needs
  a notice with no retention section, and every fixture file must follow the rule. So the app
  notice gives its periods inline, in each data paragraph, and has no section of its own.
- **Evals:** I changed only fixture-files-unchanged, to keep it a copy of the fixture after the
  round-3 fixture edit. I added careless-help-answer-names-provider before round 4. No eval was
  deleted or flipped.
- **Prompt lengths:** I lengthened step 3 of tasks 3 and 4 after freezing, to reach about 90
  words each. This is outside `gate/`.

## What did not work as written in the research or triage

- **Company name:** I renamed the company from Tessellate to Chalkline. Tessellate is the company
  of five other entries, including the two sibling privacy entries (privacy-no-vague-purposes and
  privacy-purpose-and-basis), each with its own Tessellate facts. With one shared name, the
  other-company alternative could not keep this schedule off their files. The triage's
  `policy_facts` name Tessellate.
- **Task 1 against task 3:** the research has both tasks edit `website/privacy.md`, which cannot
  both work from one fixture. A notice with no retention statement would also break the rule. The
  path change above resolves this.
- **Rule scope:** the research rule covers privacy notices only. I widened it to "a privacy notice,
  or a help page about how long Chalkline keeps data" so that task 4's help answer is covered, and
  I added "as Chalkline's retention schedule sets it", following the triage's `how`.

## What I could not verify

- No agent ran. The gate's behaviour on real agent output is inferred from the evals.
- Each round ran once per model. Several evals flipped between rounds, so the decision models are
  noisy on long notices; jev was the noisier on the schedule-match assertion.
- How this Test behaves as a companion is reasoned, not tested. Its select grep matches any privacy
  notice, so a fixture with a privacy notice under `website/`, `privacy/` or `help/` will not draw
  it as a companion. The two sibling privacy fixtures each have one.
