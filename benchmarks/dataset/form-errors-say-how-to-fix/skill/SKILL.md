---
name: form-errors-say-how-to-fix
description: Covers how form error messages are worded. Use whenever writing, filling in or editing the validation messages of a form, or an error summary heading, in a locale or interface-strings file such as locales/*.json, even if the request only asks to add the messages or replace placeholders.
---

# Form error messages say how to fix the field

Each form error message says what is wrong with that specific field and how to fix it, in plain, positive language, rather than a generic or decorative message such as "Invalid input" or "Oops, something went wrong".
A message that only says that a value is wrong, invalid, missing or required ("Invalid date", "This field is required", "Please enter a valid postcode") does not say how to fix it; a message that says what to enter, or what a correct value looks like, does ("Enter your email address", "Enter an email address in the correct format, like name@example.com"). The fix a message gives must agree with the field's rule. Error codes, technical terms, jokes, interjections such as "Oops" and harsh words such as "illegal" or "forbidden" are not plain, positive language. Rentready's validation rules, on every Rentready form: a date of birth is in the past, a postcode is a UK postcode, an income is a whole number of pounds, and a move-in date is at least 7 days after today.

Apply this to every form error message you write or change, for the whole task, and check them
again before you commit.

## Why

- Someone who sees an error is stuck on that field. "Invalid" tells them that they are stuck, not
  how to get unstuck, so they guess, fail again or give up on the form.
- Engineering notes describe the check from the code's side ("fails when the date is a Saturday or Sunday").
  The message has to turn that check into the value the person should enter.
- A message that gives the wrong rule is worse than a vague one: the person does what it says and
  the form still refuses.

## How to write one

1. Start from the field's check in the notes, and the rules above.
2. For an empty field, say what to enter: "Enter your phone number".
3. For a value that fails a check, say what a correct value is, with an example where the format
   matters: "Enter a phone number with 11 digits, like 07700 900 982".
4. Use the field's own name from its label, not a key name or "this field".
5. Keep it plain: no codes, no jokes, no "Oops", no "illegal".
6. An error summary heading is plain too: "There is a problem".

## Gotchas

These read like messages but do not say how to fix anything:

- "Invalid date", "Invalid format", "Wrong value", "Required", "This field is required"
- "Please enter a valid email address", "Enter a correct number" (valid how?)
- "Date of birth is required" (says it is missing, not what to put there)
- "Something went wrong. Please try again." on a field
- Placeholders left in place: "Error 1", "TODO", "Message here"

## Example

From a course booking form whose start date must be a weekday and whose group size is 2 to 12.

Compliant:

```json
{
  "startDate": {
    "missing": "Enter the date you want the course to start",
    "weekend": "Choose a start date from Monday to Friday"
  },
  "groupSize": {
    "range": "Enter a group size from 2 to 12"
  }
}
```

Violating:

```json
{
  "startDate": {
    "missing": "This field is required",
    "weekend": "Oops! Invalid start date."
  },
  "groupSize": {
    "range": "Please enter a valid number"
  }
}
```

## Before you commit

Reread every form error message you created or changed. For each one, ask: if this was the only
thing a person read, would they know exactly what to type or choose next, and would that value pass
the check? If not, rewrite it.
