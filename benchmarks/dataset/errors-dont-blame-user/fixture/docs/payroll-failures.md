# Payroll runs: failure cases

Engineering notes on what happens when a scheduled payroll run does not go through. Each case
fires a trigger; the transactional email for it is listed in `app.config.json`.

## Bank details rejected: `payroll.failed.bank_details`

The employer typed a wrong sort code or account number under Settings > Bank account, so Bacs
rejects the whole submission when the run starts. Nobody is paid and no money leaves the account.
The run stays in the state "Failed" on the Payroll page.

To recover, the employer corrects the sort code (6 digits) and account number (8 digits) under
Settings > Bank account, then presses "Run again" on the Payroll page. A run restarted before
15:00 on a working day pays employees on the next working day.

Placeholders for the email: `{{first_name}}`, `{{pay_date}}` (the date the run was scheduled for),
`{{employee_count}}`.

## HMRC submission timed out: `payroll.delayed.hmrc`

Our RTI submission to HMRC timed out. We retry every 30 minutes for 6 hours and the employer has
nothing to do. Employees are still paid on time. No email yet.

## Not enough funds: `payroll.failed.funds`

The bank returned the collection for lack of funds. No email yet; support phones the employer.
