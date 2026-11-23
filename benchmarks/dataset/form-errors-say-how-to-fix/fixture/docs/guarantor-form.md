# Guarantor form

Engineering notes for the guarantor form, a page of its own that we email to the guarantor an
applicant names. RentReady asks for a guarantor when an applicant's annual income is under 30 times
the monthly rent.

The form's strings are in `locales/guarantor/en.json`. It checks every field when the guarantor
presses Submit and shows the message under `errors.<field>.<check>`, as the tenant application
does.

| Field         | Key                          | Fails when                                                         |
| ------------- | ---------------------------- | ------------------------------------------------------------------ |
| Full name     | `errors.fullName.missing`    | empty                                                              |
| Date of birth | `errors.dateOfBirth.missing` | day, month or year empty                                           |
|               | `errors.dateOfBirth.future`  | today or a later date                                              |
| Relationship  | `errors.relationship.missing`| no option chosen                                                   |
| Postcode      | `errors.postcode.missing`    | empty                                                              |
|               | `errors.postcode.format`     | not a UK postcode; a guarantor must live in the UK                 |
| Annual income | `errors.income.missing`      | empty                                                              |
|               | `errors.income.wholeNumber`  | anything but digits once a leading £ and any commas are removed    |
| Homeowner     | `errors.homeowner.missing`   | neither Yes nor No chosen                                          |

The guarantor's details go to the referencing team with the application. RentReady never runs a
credit check on a guarantor without the consent they give on the form's last page.
