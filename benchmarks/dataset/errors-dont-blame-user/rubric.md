# Rubric: error messages do not blame the user

## The rule

Error messages focus on the problem and how to fix it and never blame or judge the user, even when the user caused the error; when the fault is the company's, they say so.
This covers every message that tells a user that something went wrong or could not be done: error and validation strings in the interface, and emails about a failure. A message blames when it presents the problem as something the user did wrong ("You entered an invalid date", "You forgot to attach a file", "the wrong details you gave us", "your mistake"), and it judges when it scolds or lectures ("you should have checked", "be more careful next time"). Addressing the user is not blame: an instruction that says what to do ("Enter a date in the past", "Add the missing emails and upload the file again") and a statement of what is the matter that does not say who caused it ("3 rows don't have an email address") are what the rule asks for.

## What to look at

1. Grade only the messages the diff adds or changes that tell a user something went wrong or
   could not be done: error and validation strings, and an email about a failure, with its subject
   and preheader. Changelogs, READMEs, internal notes, config, scripts, tests, labels and help text
   are not graded, whatever they say.
2. Read each message for who is presented as at fault. It blames when the user's action is the
   subject of the problem: "You uploaded…", "You entered a wrong…", "You forgot…", "You didn't…",
   "You failed to…", "because you…", "the incorrect details you provided", "your mistake". It
   judges when it scolds or lectures: "you should have", "be more careful", "next time, check your
   data before importing", "as the instructions say".
3. Do not count: an instruction for the fix ("Enter…", "Check the sort code and run payroll
   again", "Upload a .csv file"); a statement of what is the matter with the data, file or details
   that names no culprit ("3 rows don't have an email address", "This file isn't a CSV file", "The
   bank could not match the sort code and account number"); or "you" and "your" used to address
   the reader or to say whose thing it is ("your file", "your bank details", "you can export").
4. A mild focus on the user's action, where the thing is still the subject and nothing is called
   wrong ("The file you chose is larger than 5 MB"), is a minor lapse, not blame.
5. Each message should also say what the problem is and what to do about it. A message that blames
   nobody but leaves the user without the problem or without a next step is a lapse.
6. Whose fault it is comes from the task prompt and the diff only. Where they show that the
   failure is on the company's side, the message should say so and must not put it on the user.
   Where the user did cause it, the message still names the problem without pointing at them.
7. Check the task: each step of the prompt was done and the messages asked for are complete and
   accurate. Do not lower the score for a skipped chore beyond the 7 to 9 band.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: most messages blame or scold, or the tone is
  accusatory throughout. A 2: accusatory phrasing ("you forgot", "you failed to", a scolding line)
  or several messages that frame the user as the cause; for an email, the subject or opening does.
  A 3: two messages, or one prominent sentence of an email, state the user's mistake.
- **4 to 6**: partly followed. A 4: one message plainly blames and others lean on the user's
  action. A 5: one message, or one body sentence of an email, plainly states the user's mistake
  ("You entered a tax code in the wrong format") and the rest name the problem and the fix. A 6:
  no plain blame, but two or more messages are mildly user-focused as in point 4.
- **7 to 9**: the rule is followed. A 7 or 8: one mildly user-focused phrase, a message that lacks
  the fix, or a step of the task skipped. A 9: no blame at all and only a small part of the task
  is missing.
- **10**: every step of the task is done, and every message names the problem and the fix without
  blaming or judging the user.

## Anchors

- **2**: "You uploaded a file with missing emails. Check your data before importing."
- **5**: four messages, three like "This file has more than 500 rows. Split it into smaller files
  and upload them one at a time.", and one that reads "You left the date empty."
- **8**: every message neutral and useful, with the changelog line the task asked for missing; or
  the whole task done with one phrase such as "the date you picked is after the pay date".
- **10**: the whole task done; each message says what is the matter and what to do next, such as
  "3 rows don't have an email address. Add the missing emails and upload the file again."
