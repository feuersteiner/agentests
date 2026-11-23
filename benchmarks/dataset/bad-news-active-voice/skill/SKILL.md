---
name: bad-news-active-voice
description: Covers how customer communications deliver bad news and own mistakes. Use whenever writing or editing a customer email, blog post, incident or outage summary, status update, account notice or support macro that tells customers something went wrong, was late or failed, or that we restricted, paused or closed something of theirs, even if the request says nothing about tone or voice.
---

# Bad news in the active voice

When giving bad news or describing a mistake, use the active voice so it is clear who did what; do not use the passive ("payments were delayed", "an issue was identified") to hide the company's responsibility.
This applies to customer emails, blog posts and support macros, wherever they say that something went wrong, was late or failed, or that the company acted against the reader's interest, such as restricting an account or pausing a payment. Say who did it: "We delayed your team's salary payments by one day", "A change we released on Thursday stopped the payments", "We have restricted your account". An agentless noun hides who did it just as a passive does ("a delay occurred", "due to a technical issue", "there was a problem with the payment run"). A passive that names who did it after "by", and a passive about good news or a routine step ("Your refund has been sent"), is fine.

Apply this to every customer-facing sentence you write or change for the whole task, subject lines
and opening lines included, and check it again before you commit.

## Why

- When we give bad news we drift into the passive without noticing. It reads as if the problem
  happened by itself, and readers notice that we are distancing ourselves from it.
- Customers trust a company that says plainly what it did and what it is doing about it.
- Incident write-ups and account notices are where this slips most, because the usual corporate
  template is built from agentless phrases.

## How to write it

1. Find each sentence that says something went wrong or that we did something the reader will
   not like.
2. Ask who did it. If it was us, our release, our system or our team, make "we" or that thing of
   ours the subject: "We sent your payments a day late", "Our new release stopped the job".
3. If someone else did it, name them: "Your bank returned the payment".
4. Replace a vague cause ("a technical issue", "a system error") with what actually happened and
   whose it was.

## Gotchas

- "were delayed", "were not processed", "has been restricted", "have been paused", "was
  identified", "may have been affected", "were paid late"
- "an issue occurred", "a delay occurred", "there was a problem with", "due to a technical
  error", "an incident affected"
- A subject line or opening sentence in the passive, followed by "we" only in the apology

These are fine: "Your refund has been sent" (good news), "Payments approved before 15:00 are sent
the same day" (a routine step), "The order was cancelled by your bank" (says who).

## Example

From an online shop that charged some customers twice.

Compliant:

```markdown
We charged 300 customers twice for orders placed on Monday. A change we made to our checkout sent
each payment two times. We have refunded the second charge, and it reaches your card within 3 days.
```

Violating:

```markdown
Due to a technical issue, some customers were charged twice for orders placed on Monday. The issue
has been identified and duplicate charges are being refunded.
```

## Before you commit

Reread every customer-facing file you created or changed, subject and preheader included. For each
sentence that carries bad news or describes a mistake, check that it says who did it. If it uses a
passive without "by" or blames an ownerless "issue", "error" or "problem", rewrite it.
