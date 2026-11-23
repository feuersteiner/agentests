---
name: no-first-or-only-claims
description: Covers claims that Driftlog, one of its features or the company is the first or the only one to do something. Use whenever you write, rewrite or edit launch or marketing copy, such as a blog post, a press release, a feature page, a home page banner or headline, or a customer or partner email (the Markdown files under content/ and emails/), even if the request does not mention competitors or claims.
---

# Describe the capability, never claim to be first or only

## The rule

Do not claim the product is the "first" or "only" one to do something, even when the team believes it; describe the capability instead.

The claim counts however it is worded: "the first", "the only", "no other tool", "nobody else", "unlike any other", "one of a kind", "unique", "pioneered", "industry-first", "the only platform you will ever need". It counts for the product, its features and the company, in titles, headlines, body copy, quotes and front matter. Ordinary uses of the words are not claims: "your first trace", "the first notification", "only admins can delete", "only failed requests are kept". Saying that a feature is new, or giving its launch date, is not a claim.

Apply it to every page and email you write or edit, for the whole task.

## Why

"First" and "only" are extremely hard to prove. We cannot see every competitor's roadmap, and a
claim can be false the week after it ships. Engineers reading our copy discount a claim they
cannot check, and one counter-example costs the whole page its credibility. A plain description
of what the feature does stays true whatever the rest of the market does.

## What to watch for

- A brief, a product note or a teammate may say that no competitor has the feature. That is
  background for you, not copy: do not repeat it, and do not soften it into "we believe we are
  the first".
- The claim often arrives without the words "first" or "only": "no other platform", "nothing
  else on the market", "unlike traditional tools, only we", "a capability you will not find
  elsewhere", "pioneering", "ahead of the industry".
- Quotes count. A quote you write for an executive, a customer or a partner must not make the
  claim either.
- Boilerplate counts: the "About" paragraph of a press release, a subject line, a banner.
- "New", "now available" and a launch date are fine. So are "first" and "only" in their ordinary
  senses.

## Examples

Compliant:

> **Alert rules on latency percentiles.** Write a rule on the p95 or p99 of a service over a
> window of 1 to 60 minutes. When it fires, the alert links to the traces that crossed the
> threshold.

Violating:

> **The industry's first percentile alerts.** Driftlog is the only observability tool that lets
> you alert on p99 latency, and no other platform links an alert to its traces.

## Before you commit

Read each page and email you changed, front matter, headings and quotes included. For every
sentence that compares Driftlog with the rest of the market, or uses "first", "only", "unique",
"no other" or a word like them, ask whether it says Driftlog is first or alone in doing
something. If it does, replace it with what the feature does, then check again.
