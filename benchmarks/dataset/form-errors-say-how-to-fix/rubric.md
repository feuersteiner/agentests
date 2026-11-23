# Rubric: form error messages say how to fix the field

## The rule

Each form error message says what is wrong with that specific field and how to fix it, in plain, positive language, rather than a generic or decorative message such as "Invalid input" or "Oops, something went wrong".
A message that only says that a value is wrong, invalid, missing or required ("Invalid date", "This field is required", "Please enter a valid postcode") does not say how to fix it; a message that says what to enter, or what a correct value looks like, does ("Enter your email address", "Enter an email address in the correct format, like name@example.com"). The fix a message gives must agree with the field's rule. Error codes, technical terms, jokes, interjections such as "Oops" and harsh words such as "illegal" or "forbidden" are not plain, positive language. Rentready's validation rules, on every Rentready form: a date of birth is in the past, a postcode is a UK postcode, an income is a whole number of pounds, and a move-in date is at least 7 days after today.

## What to look at

1. Grade only the form error messages the diff adds or changes, that is the strings shown when a
   form field fails a check, and the heading of a form's error summary. Labels, hints, changelogs,
   READMEs, engineering notes, config, scripts and tests are not graded, whatever they say.
2. For each message, ask whether it tells the person how to fix that field: what to enter or
   choose, or what a correct value looks like. An instruction that implies the problem counts as
   saying both ("Enter a date of birth in the past", "Enter a UK postcode, like LS1 4AP"); for an
   empty field, "Enter your date of birth" is enough. A message that only names the failure does
   not: "Invalid date", "Required", "This field is required", "Date of birth is required", "Enter a
   valid postcode", "Invalid card number", "Card expired".
3. Check each fix against Rentready's rules above. A specific message whose fix the check would
   still reject is wrong: a move-in date "after today" or "in the future" when at least 7 days
   ahead is needed, an income "in pounds and pence", a "postcode or ZIP code".
4. Check the wording: no error codes or technical terms ("ERR_", "422", "null", "regex",
   "validation failed"), no jokes, emoji or interjections ("Oops", "Whoops", "Uh-oh"), no harsh
   words ("illegal", "forbidden"). An error summary heading should be plain, such as "There is a
   problem"; "Oops, something went wrong" breaks the rule.
5. A placeholder left in a message the task asked to write ("Error 1", "TODO") counts as a generic
   message, and the task is then also incomplete.
6. A polite "Please" before a specific instruction, or a missing example where one would help, is
   a minor lapse at most.
7. Check the task: every step of the prompt was done and every message it asked for exists. Do not
   lower the score for a skipped chore beyond the 7 to 9 band.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: the messages are generic or decorative throughout.
  A 2: most messages name the failure but not the fix, as in point 2. A 3: about half the messages
  are generic, or a decorative heading comes with several generic messages.
- **4 to 6**: partly followed. A 4: several generic messages beside good ones. A 5: two messages
  are generic, or one gives a fix that contradicts Rentready's rules, and the rest are good. A 6:
  one message is generic, or one message or the heading uses a code, a joke or an interjection,
  and the rest are specific and plain.
- **7 to 9**: the rule is followed. A 7 or 8: every message is specific and plain, with a minor
  lapse as in point 6, or a step of the task skipped. A 9: every message is right and only a small
  part of the task is missing.
- **10**: every step of the task is done, and every message says what is wrong and how to fix it,
  in plain words that agree with Rentready's rules.

## Anchors

- **2**: "Invalid date of birth", "This field is required", "Please enter a valid postcode",
  "Invalid amount".
- **5**: seven messages like "Enter your income in whole pounds, like 32000", and one that reads
  "Enter a move-in date after today".
- **8**: every message specific and plain, with the changelog line the task asked for missing.
- **10**: the whole task done, with messages such as "Enter a move-in date at least 7 days after
  today" and, for the payment step, the heading "There is a problem".
