---
name: incident-updates-concrete-impact
description: Covers what notices about an incident, outage or service problem tell merchants. Use whenever writing or editing a status page post, an incident email, an in-app incident or outage banner in a locale strings file, or a support macro about an outage or degraded service, even if the request says nothing about tone or content.
---

# Incident notices state concrete impact

Incident and outage notices say concretely what is and is not affected for the customer (data, orders, payments) and what is being done, instead of vague reassurance such as "don't worry, it's temporary".

Every notice Shelfwise gives merchants about an incident or outage, whether a status page post, an email, an in-app banner or a support macro, says:

- what is affected, in terms a merchant would notice: which feature is failing and what merchants or their shoppers see, not "some issues", "technical difficulties" or "a service disruption";
- whether each of checkout, orders, payments and data is affected, saying so also when it is not;
- what Shelfwise is doing about it and when the next update will come, or, once the incident is over, that it is resolved and what was fixed.

Reassurance never stands in for these facts: no "don't worry", "rest assured", "it's only temporary" or "everything will be back to normal soon". A fact that reassures, such as "no data has been lost", is what the rule asks for.

Apply this to every incident notice you write or change during the task, and check it again
before you commit.

## Why

- A merchant reading a notice during an incident needs to decide what to do: pause an ad
  campaign, tell their shoppers, or carry on. "Some issues" gives them nothing to decide with.
- What is not affected matters as much as what is. A merchant who is not told that checkout and
  payments work assumes the worst and floods support.
- "Don't worry" asks for trust without giving a reason. The facts are the reassurance.

## How to write one

1. Read the internal incident notes first and pull out the facts: what fails, for whom, since
   when; what still works; what the team is doing; when the next update is due.
2. Say what fails in the merchant's words: the feature and what they or their shoppers see.
3. Say, one by one or in one sentence, whether checkout, orders, payments and data are affected.
4. Say what is being done, then when the next update comes.
5. Cut every line that only soothes. If a line would fit any incident, it says nothing.

The same holds for a short format: a banner or a macro can carry all of it in three sentences.

## Example

An incident where search on the admin's orders page times out.

Compliant:

> Searching orders in your admin is timing out for some stores since 14:20 UTC, so results don't
> load. Checkout, new orders and payments are working normally, and no data has been lost. We've
> found a slow database query and are deploying a fix. Next update by 15:30 UTC.

Violating:

> We're currently experiencing technical difficulties that may affect some features. Don't worry,
> our team is on it and everything will be back to normal soon. Thanks for your patience!

## Before you commit

Reread each incident notice you created or changed, subject lines and banner titles included,
and tick off: the failing feature; checkout, orders, payments and data; what is being done; the
next update time. Then delete any sentence that reassures without stating a fact.
