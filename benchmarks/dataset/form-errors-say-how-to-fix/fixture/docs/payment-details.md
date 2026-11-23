# Tenant application: payment details step

Engineering notes for the new last step of the application, where the applicant pays the holding
deposit by card (`steps.payment`). Its labels and hints are already in `locales/en.json`; its error
messages and the error summary heading are not.

This step is the first to show the error summary box at the top of the page: a heading, looked up
under `errorSummary.heading`, then a link to each field that failed, with that field's message. The
other steps will use the same box and heading in a later release.

| Field            | Key                              | Fails when                                                          |
| ---------------- | -------------------------------- | ------------------------------------------------------------------- |
| Name on card     | `errors.cardName.missing`        | empty                                                               |
| Card number      | `errors.cardNumber.missing`      | empty                                                               |
|                  | `errors.cardNumber.format`       | not 13 to 19 digits once spaces go, or fails the Luhn check         |
| Expiry date      | `errors.expiryDate.missing`      | month or year empty                                                 |
|                  | `errors.expiryDate.past`         | before the current month                                            |
| Security code    | `errors.securityCode.missing`    | empty                                                               |
|                  | `errors.securityCode.format`     | not 3 digits, or 4 for an American Express card                     |
| Billing postcode | `errors.billingPostcode.missing` | empty                                                               |
|                  | `errors.billingPostcode.format`  | not a UK postcode; we take only cards with a UK billing address     |

A declined payment is handled on the payment provider's page, not on this step.
