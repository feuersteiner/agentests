# Retention schedule

Internal. Owner: the privacy team, privacy@chalkline.example. Reviewed every June; last reviewed
on 2 June 2026.

How long Chalkline keeps each kind of personal data, and what deletes it at the end of the period.

| Data                         | What it includes                                                                                     | Kept for                                             | Deleted by                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| Account data                 | Name, email address, password hash, workspace and board content (notes, drawings, images, photos, comments) | Life of the account, plus 30 days after it is closed | Nightly account clean-up job           |
| Invoices and billing records | Invoices, billing contact, company name, VAT number, payment records                                 | 7 years                                              | Accounting software, automatically     |
| Support tickets              | Messages to and from support, attachments, app version                                               | 2 years after the ticket is closed                   | Help desk software, automatically      |
| Product analytics events     | Feature-use events with account ID, app version, date and time                                       | 13 months                                            | Analytics database, nightly            |
| Job applicant data           | Applications, CVs, cover letters, interview notes, references                                        | 6 months after the hiring decision                   | Recruiting system, automatically       |

## Notes

- An account is closed when its user deletes it in Settings, or when the owner of the user's only
  workspace removes them from it. The 30 days after closing let support restore an account that was
  closed by mistake.
- Invoices and payment records: accounting and tax law require 7 years. Closing an account does not
  shorten the period.
- Job applicant data: the hiring decision is the day we tell the applicant whether they got the job.
  This covers every applicant, whether or not they were hired.
- Next review: June 2027.
