# Tenant application: validation

Engineering notes for the checks on the "About you", "Your income" and "Your move" steps. The form
runs them when the applicant presses Continue. For each field that fails, the page shows a message
under the field and repeats it in the error summary at the top; the message is looked up in
`locales/en.json` under `errors.<field>.<check>`. A field shows one message at a time: the first
check in the table that fails.

| Field         | Key                          | Fails when                                                                          |
| ------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| Full name     | `errors.fullName.missing`    | empty                                                                               |
| Date of birth | `errors.dateOfBirth.missing` | day, month or year empty                                                            |
|               | `errors.dateOfBirth.future`  | today or a later date                                                               |
| Phone number  | `errors.phone.format`        | not 10 or 11 digits starting with 0, or +44 then 9 or 10 digits, once spaces go     |
| Postcode      | `errors.postcode.missing`    | empty                                                                               |
|               | `errors.postcode.format`     | not a UK postcode; case and spaces do not matter, so `ls14ap` passes                |
| Annual income | `errors.income.missing`      | empty                                                                               |
|               | `errors.income.wholeNumber`  | anything but digits once a leading £ and any commas are removed, so `32000.50` fails |
| Move-in date  | `errors.moveInDate.missing`  | day, month or year empty                                                            |
|               | `errors.moveInDate.tooSoon`  | earlier than 7 days after today                                                     |

The phone number is optional; every other field is required.

The move-in minimum is new in November. Until then any date from today was accepted. The 7 days
give the referencing team time to check an application before the tenancy starts.
