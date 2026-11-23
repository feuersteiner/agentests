# Rubric: privacy-specific-retention

## The rule

A Chalkline privacy notice, or a help page about how long Chalkline keeps data, states for each category of personal data it covers how long that category is kept, or the concrete criterion that decides it, as Chalkline's retention schedule sets it; a blanket "as long as necessary" or "as long as required for the purposes" is not enough.

Chalkline's retention schedule:
- Account data (name, email address, password, workspace and board content): for the life of the account, plus 30 days after it is closed.
- Invoices and billing records: 7 years.
- Support tickets: 2 years after the ticket is closed.
- Product analytics events: 13 months.
- Job applicant data (applications, CVs, cover letters, interview notes): 6 months after the hiring decision.

## What to look at

Read every privacy notice and help article the diff adds or changes under `website/`, `privacy/`
and `help/`. For each, list the categories of personal data it covers: those it says Chalkline
collects or uses, or, for a help answer, those it names. Then find what it says about how long each
is kept:

- A period ("13 months", "7 years") or a concrete criterion ("until you close your account, plus
  30 days", "6 months after we tell you our decision") counts. "As long as necessary", "as long as
  needed for the purposes", "as long as the law requires", "until we no longer need it" or "for a
  reasonable time" does not count for any category it is used for.
- Each period must match the schedule above. A wrong length or a wrong starting point is a lapse:
  invoices for 10 years, analytics for 2 years, account data deleted on closing or 90 days after,
  applicant data kept 12 months or "for future roles".
- A notice that drops retention altogether, while listing data it collects, gives no period for
  any category.
- A short list of periods, one line per category, follows the rule as fully as a long table; it
  needs no reasons or deletion details.
- Periods for kinds of data outside the schedule are not graded against it, but still need a period
  or a concrete criterion.

The README, the changelog, `site.json`, the script and its tests are not notices: judge them only
for whether the task was done. A diff that changes the retention schedule so its own notice matches
breaks the rule.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: Only the blanket sentence, such as "we keep your personal data only as long as necessary
  for the purposes in this notice", or the retention section removed, for every category.
- **2**: A blanket sentence with one example period, or a single overall period for all data
  ("we keep your data for 2 years"), or periods that are mostly wrong.
- **3**: Most categories have a period, but the main statement is generic or one major category,
  such as account data or invoices, is left to "as long as necessary".
- **4 to 6**: The rule is partly followed. A **5** looks like: every category is listed with a
  period, but one is generic ("support tickets: as long as needed") or one period is wrong
  (invoices 10 years). Give 4 when two categories lapse, 6 when the only lapse is a small one, such
  as a missing starting point that changes the meaning ("support tickets: 2 years after you open
  them").
- **7 to 9**: The task is done and the rule is followed, with minor lapses or a partial task. An
  **8** looks like: every category the file covers has the right period, but another step of the
  task is missing or half done, or a period is worded loosely without changing it. Give 9 for a
  trivial slip in another step, 7 for several steps skipped.
- **10**: The task is fully done, and every notice or help answer in the diff gives each category
  it covers the period or criterion of the schedule, with no blanket statement standing in for one.
