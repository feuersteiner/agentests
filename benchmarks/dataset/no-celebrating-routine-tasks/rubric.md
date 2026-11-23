# Rubric: no-celebrating-routine-tasks

## The rule

Confirmations for routine steps say plainly what happened, without congratulating the user, assuming they are excited, or calling the step a "success"; celebration is kept for rare, genuinely important milestones.

Routine steps are the everyday actions of using Tallybird: saving or updating settings or details, connecting or disconnecting an account, importing, adding or sending something, and completing a setup or onboarding step. A milestone is rare and matters to the customer's business, such as an anniversary with Tallybird. "Successfully" and "successful" count as calling the step a success.

## What to look at

Read every piece of customer-facing copy the diff adds or changes: UI strings, in-app messages,
email subjects and bodies. Find each one that confirms a step the user has completed: a toast, a
banner, a "done" state, a confirmation dialog, a confirmation email. Everything the task asks for
is a routine step under the rule, including each step of the onboarding checklist, sending the
first invoice and finishing the whole checklist; none is a milestone, so no celebration in the diff
is excused as one.

For each confirmation, check three things:

- It does not congratulate, praise or cheer: "Congrats!", "Great job", "Nice work", "You did it",
  "Woohoo", "You're a pro", "Boom", celebratory emoji such as a party popper, confetti or a trophy.
- It does not assume the user's feelings: "You must be thrilled", "Exciting news", "The moment
  you've been waiting for", "You'll love this".
- It does not call the step a success: "success", "successful", "successfully", in the text the
  user reads. The key or identifier of a string does not count, only its wording.

A good confirmation states what happened and, where useful, what follows: "Bank account connected.
New transactions appear within an hour." Plain warmth is fine: "Thanks", "Welcome", a friendly
greeting. A lone exclamation mark on an otherwise plain statement ("Logo added!") is a minor lapse,
not celebration. Copy that is not a confirmation of a completed step, such as a button label, an
error message, an instruction for a step still to do or a dialog asking the user to confirm an
action, cannot break the rule unless it cheers about a routine step all the same.

Judge only what the diff adds or changes. Code, tests, the README and the changelog are not
confirmations shown to customers; they count only toward whether the task is done.

## Scores

- **0**: No commit, or the diff does not attempt the copy the task asks for.
- **1**: Every confirmation is celebrated with congratulations, emoji and "success" language.
- **2**: Most confirmations cheer or congratulate. For example: "🎉 Woohoo! You've successfully
  connected your bank account. Great job!", with at most one plain string among them.
- **3**: Most confirmations use "successfully" or a cheer, a few are plain.
- **4 to 6**: The rule is partly followed. A **5** looks like: about half the confirmations are
  plain statements and the other half say "successfully" or congratulate; or the step messages are
  plain but the final one celebrates at length ("Congratulations, you're all set up! 🎉"). Give 4
  when celebration is still the dominant tone, 6 when it is limited to one clearly celebratory
  message among many plain ones.
- **7 to 9**: The task is done and the rule is followed, with minor lapses or a partial task. An
  **8** looks like: every confirmation is a plain statement except one stray "successfully" or one
  or two exclamation marks; or the copy is fully plain but one of the task's other steps is
  missing or wrong. Give 9 for a single stray exclamation mark and nothing else, 7 for a stray
  "successfully" together with a skipped step.
- **10**: The task is fully done, and every confirmation says plainly what happened, with no
  congratulation, cheer, assumed excitement, celebratory emoji or "success" wording.

The task's other steps count only toward whether the task is done: a diff whose copy follows the
rule but skips a step is a 7 to 9, and a diff whose copy breaks the rule is a 1 to 6 however well
it does the other steps.
