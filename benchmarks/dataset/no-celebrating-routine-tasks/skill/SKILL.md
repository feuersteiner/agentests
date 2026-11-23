---
name: no-celebrating-routine-tasks
description: Covers the tone of Tallybird's confirmation copy. Use whenever you write or edit text a customer reads after completing a step, such as success and confirmation strings, toasts, banners and dialogs in the locale files, in-app onboarding or checklist messages, and confirmation or notification emails, even if the request does not mention tone or voice.
---

# Confirm routine steps plainly

## The rule

Confirmations for routine steps say plainly what happened, without congratulating the user, assuming they are excited, or calling the step a "success"; celebration is kept for rare, genuinely important milestones.

Routine steps are the everyday actions of using Tallybird: saving or updating settings or details, connecting or disconnecting an account, importing, adding or sending something, and completing a setup or onboarding step. A milestone is rare and matters to the customer's business, such as an anniversary with Tallybird. "Successfully" and "successful" count as calling the step a success.

Apply it to every string, in-app message and email you write or change, for the whole task, and
check it again before you commit.

## Why

- Our customers do their bookkeeping in Tallybird. A step that took them twenty minutes, or that
  they had to do, is not a party, and cheering about it reads as noise or as mockery.
- We cannot know how someone feels. "You must be excited" is wrong as often as it is right.
- When everything is a success, the word tells the customer nothing. They need to know what
  happened and what happens next.
- Celebration that is kept for a real milestone still means something when it comes.

## How to write a confirmation

1. Say what happened, in the past tense or as a state: "Tax rate saved.", "Bank account connected."
2. Add what follows or what the customer can do next, when that is useful: "New invoices use 21%."
3. Stop. No praise, no cheer, no emoji, no feelings.

Warmth is fine: "Thanks", "Welcome", a friendly greeting. So is a plain "Done." or "You're set up."

## Gotchas

Each of these breaks the rule, and each is what a first draft tends to say:

- "successfully" as filler: "Your logo was successfully uploaded." Write "Logo uploaded."
- A "Success!" title on a banner or dialog. Name the thing instead: "Client list imported".
- Praise: "Great job", "Nice work", "Well done", "You did it", "You're a pro", "superstar".
- Cheers: "Woohoo", "Yay", "Hooray", "Boom", "Congrats", "Congratulations".
- Celebratory emoji: party popper, confetti, trophy, rocket, raised hands, sparkles.
- Assumed feelings: "Exciting news", "You'll love this", "You must be thrilled", "The wait is
  over".
- The last step of a flow or a checklist. Finishing setup is still a routine step: "Setup is
  complete." is enough.
- A first time. The first invoice sent or the first client added is an onboarding step, not a
  milestone.

The key of a string may be named how the code needs it; the rule is about the wording the
customer reads.

## Example

A toast shown after a customer adds a payment method.

Compliant:

```json
"payment_method_added": "Card ending {last4} added. It will be charged on your next renewal."
```

Violating:

```json
"payment_method_added": "🎉 Success! You've successfully added your card. You're all set, great job!"
```

## Before you commit

Reread every string, message and email you added or changed. For each one that tells the customer
a step is done, check that it states what happened and what follows, and remove any congratulation,
praise, cheer, emoji, assumed feeling and any "success", "successful" or "successfully". Then check
again.
