---
name: no-false-urgency
description: Covers deadlines, "limited time" wording and scarcity in Quillnote's promotional copy. Use whenever you write or edit copy that mentions a price, a discount, an offer, a plan upgrade or a free trial, such as marketing and upgrade emails, the pricing page, banners, landing pages and push notifications (the Markdown files under emails/ and content/), even if the request does not mention deadlines or urgency.
---

# Urgency only where the offer terms have a real limit

## The rule

Do not say or imply that an offer, price or product is available only for a limited time or is about to run out unless the offer terms give a real end date or limit, and then state that date or limit accurately.

Quillnote's offer terms:

- The annual-plan discount (20% off the monthly price) is ongoing: it has no end date and no limit on how many people can take it.
- The only time-limited offer is the student code, which ends on 30 September 2027. Copy that says the student offer is limited or ending gives that date.
- The free trial lasts 14 days. Saying when a trial ends is accurate; the prices are the same during and after it.
- Nothing else is limited: there is no other offer, no planned price rise and no cap on places or codes.

Apply it to every email, page and notification you write or edit, for the whole task: body copy,
subject lines, preheaders, titles, descriptions, headlines, banners and buttons.

## Why

A deadline that does not exist takes away the reader's time to decide, and advertising rules
treat it as misleading. It also stops working: a user who sees "last chance" on a discount that
is still there next month learns to ignore the next deadline, including the real one.

## What counts

Conversion copy picks up urgency by reflex. These all break the rule on an ongoing offer:

- "limited time", "for a short time only", an end date or a countdown;
- "last chance", "before it's gone", "while it lasts", "ends soon", "don't miss out";
- "lock in this price", "prices are going up", "only a few left";
- a deal tied to the trial ("subscribe before your trial ends to keep the discount").

For the student code, urgency without the date ("ends soon", "limited time") or with another
date also breaks it.

These are fine: the price and the saving stated plainly; a real deadline with its date; saying
that a trial ends and what happens then; a plain call to action such as "Switch to annual" or
"Upgrade now". Avoid soft nudges such as "don't wait": they hint at a deadline that is not there.

Check `data/offers.yaml` for the terms before you give any date or limit, and never invent one.

## Examples

Compliant:

> **Plus for the year.** Pay yearly and Plus costs 20% less than paying month by month. You can
> switch in Settings whenever it suits you.

Violating:

> **Last chance to save 20%.** Lock in the annual price before this offer disappears. Don't miss
> out!

## Before you commit

Read each file you changed, front matter and headlines included. Mark every word about time,
deadlines or running out. For each one, find the end date or limit in the offer terms; if there
is none, rewrite the sentence as a plain statement of the price or saving, then check again.
