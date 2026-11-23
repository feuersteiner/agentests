# Compliance reviews

Notes from the compliance team on what happens when we review an employer's account. Ledger Line
is regulated as a payment service, so we have to check whose money we move and where it comes from.

## When we open a review

We open a review when one of the checks we run on every account flags something: a director's
identity check that does not match, a change of bank account followed by a much larger payroll run,
or payments to a new country. The compliance team decides; support cannot open or close a review.

We must not tell the employer what flagged the account. The notice can say that we are reviewing
the account and what we need from them, never why.

## What the restriction does

While the review is open, we restrict the account:

- The employer can still sign in, see past payroll runs, download payslips and reports, and upload documents.
- They cannot approve a payroll run, change bank details or add employees.
- We pause scheduled payroll runs. A run due during the review goes out only when we finish it.

## What we ask for

Through Settings > Verification, within 10 working days:

- photo ID for every director
- proof of the business address, dated in the last 3 months
- the most recent statement of the business bank account

We aim to finish within 5 working days of receiving everything. If the documents do not arrive
within 10 working days, we close the account and return any money we hold to the account it came
from.

## The notice

The email goes out on the trigger `account.restricted`. Placeholders: `{{first_name}}`,
`{{company_name}}`, `{{documents_due}}` (10 working days after the restriction) and
`{{verification_url}}`.

Questions from the employer go to compliance, not to support. Ledger Line's compliance team
answers within one working day.
