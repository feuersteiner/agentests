---
name: apologise-only-when-at-fault
description: Covers when Pennyjar says sorry to customers, and how. Use whenever you write or edit a customer email or a support macro or reply (the Markdown files under emails/ and support/), especially one that brings unwelcome news, such as a price or plan change, a declined application, a fee, a refund, an outage or a mistake on our side, even if the request does not mention apologies or tone.
---

# Say sorry only when we got it wrong

## The rule

Say sorry only when the company actually did something wrong, and then say "we're sorry" once, sincerely, before moving to the fix; unwelcome news that is not the company's fault carries no apology.

At Pennyjar this means:

- Our own errors, such as bugs, outages, wrong or duplicate charges and staff mistakes, get one plain "we're sorry", then what we are doing to put it right.
- News that is not our fault carries no apology: price and plan changes, and overdraft or other credit decisions made under our lending policy.
- An apology is any "sorry", "apologise" or "apologies", including "sorry to let you know" and "apologies for any inconvenience", and also "we regret", "unfortunately" and "sadly".

It applies to every customer message you write or edit, for the whole task: subject lines,
preheaders, titles, the body and the sign-off.

## Why

An apology says we did something wrong. Said for a decision we stand by, such as a new price or a
declined application, it sounds insincere and suggests the decision is a mistake we could undo.
Said three times for a real mistake, it sounds like a template. One plain "we're sorry", followed
by what we have done about it, is what customers believe.

## How to apply it

1. Decide first whether the message is about something Pennyjar got wrong. Check the internal
   notes under `docs/` if you are not sure.
2. **Not our fault:** give the news plainly, say what it means for the customer and what they can
   do. No "unfortunately", no "sorry to let you know", no closing "apologies for any
   inconvenience". You can still be warm: "We know this isn't what you hoped to hear."
3. **Our fault:** open with "We're sorry." once, say what went wrong in plain words, then what we
   have done to fix it and whether the customer needs to do anything. Do not add a second apology
   at the end, and do not use the formal forms ("we apologise", "please accept our apologies").

## Examples

Compliant, our mistake:

> We're sorry. Our app was down for two hours on Tuesday morning, so you couldn't see your balance
> or move money. It's working again, and we've added a second server so one failure can't take it
> down.

Violating, not our fault:

> We're sorry to let you know that from March, Free accounts can have two pots instead of three.
> We apologise for any inconvenience this may cause.

Compliant version of the same news:

> From 1 March, Free accounts can have up to two pots. Pots you already have stay as they are, and
> Plus still has unlimited pots.

## Before you commit

Read each message you changed, subject line included. Mark every apology word from the list
above. If the message is not about our own mistake, remove every one. If it is, keep exactly one,
in the form "we're sorry", before the explanation of the fix.
