# Form error messages say how to fix the field

Each form error message says what is wrong with that specific field and how to fix it, in plain, positive language, rather than a generic or decorative message such as "Invalid input" or "Oops, something went wrong".
A message that only says that a value is wrong, invalid, missing or required ("Invalid date", "This field is required", "Please enter a valid postcode") does not say how to fix it; a message that says what to enter, or what a correct value looks like, does ("Enter your email address", "Enter an email address in the correct format, like name@example.com"). The fix a message gives must agree with the field's rule. Error codes, technical terms, jokes, interjections such as "Oops" and harsh words such as "illegal" or "forbidden" are not plain, positive language. Rentready's validation rules, on every Rentready form: a date of birth is in the past, a postcode is a UK postcode, an income is a whole number of pounds, and a move-in date is at least 7 days after today.

This applies to the form strings under `locales/`: each field's error messages and the heading of a
form's error summary. Labels, hints and other strings are not error messages.

Engineering notes under `docs/`, the changelog, the README, configuration and scripts are not shown
to applicants and are out of scope. Another company's forms follow their own validation rules, not
Rentready's.
