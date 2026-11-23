---
name: errors-dont-blame-user
description: Covers how error messages talk to the user about what went wrong. Use whenever writing or editing error or validation strings in a locale or interface-strings file, or an email or notification that tells a customer something failed, was rejected or could not be done, even if the request says nothing about tone.
---

# Error messages do not blame the user

Error messages focus on the problem and how to fix it and never blame or judge the user, even when the user caused the error; when the fault is the company's, they say so.
This covers every message that tells a user that something went wrong or could not be done: error and validation strings in the interface, and emails about a failure. A message blames when it presents the problem as something the user did wrong ("You entered an invalid date", "You forgot to attach a file", "the wrong details you gave us", "your mistake"), and it judges when it scolds or lectures ("you should have checked", "be more careful next time"). Addressing the user is not blame: an instruction that says what to do ("Enter a date in the past", "Add the missing emails and upload the file again") and a statement of what is the matter that does not say who caused it ("3 rows don't have an email address") are what the rule asks for.

Apply this to every error message and failure email you write or change, for the whole task, and
check it again before you commit.

## Why

- Someone reading an error is already stuck. Being told it is their fault does not help them fix
  it, and it makes them trust the product less.
- Developer notes describe causes from the system's side: "user left the field empty", "user
  picked the wrong file". Copied into a message, the cause turns into an accusation.
- The same facts fit in a message about the thing: what is the matter with it, and what to do.

## How to write one

1. Say what is the matter, with the thing as the subject and not the person: the file, the field,
   the payment, the date.
2. Say what to do next, as a plain instruction.
3. If the failure is on our side, say so in plain words ("Something went wrong on our side") and
   say what happens next. Do not hint that the user might have caused it.
4. Do not swap blame for a lecture. Leave out "make sure you", "remember to", "next time" and
   "should have".

## Gotchas

These slip in when the cause is known to be the user's action:

- "You entered…", "You uploaded…", "You selected…", "You left … empty", "You didn't…"
- "You forgot to…", "You failed to…", "You must have…"
- "because you…", "due to the incorrect details you provided", "your mistake", "your error"
- "Please check your entries before submitting", "be more careful", "as the instructions say"

These are fine: "Enter your password" (an instruction), "Your invoice has no due date" (whose
invoice it is, not who is at fault), "You can copy last month's figures" (help).

## Example

From an invoice form whose due date must not be before the invoice date.

Compliant:

```json
{
  "dueDateBeforeInvoiceDate": "The due date is before the invoice date. Choose a due date on or after {{invoiceDate}}.",
  "saveFailed": "Something went wrong on our side and this invoice was not saved. Try again in a few minutes."
}
```

Violating:

```json
{
  "dueDateBeforeInvoiceDate": "You entered a due date that is before the invoice date. Please check your dates more carefully.",
  "saveFailed": "The invoice could not be saved. Check that you filled in the form correctly."
}
```

## Before you commit

Reread every error string and failure email you created or changed, subject lines included. For
each sentence, ask who it presents as having done something wrong. If the answer is the reader,
rewrite it so that it names the problem and the next step.
