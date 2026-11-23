---
name: uptime-sla-only-when-eligible
description: Covers what Larkspur Data's deal documents may promise a customer about uptime, availability, SLAs and service credits. Use whenever you write or edit a proposal, an RFP or security questionnaire answer, a plan or contract summary, or an order form for a Larkspur customer (the Markdown files under proposals/ and orders/), including any section about reliability, uptime, incidents or special terms, even if the request does not mention an SLA.
---

# Uptime commitments only for eligible customers

## The rule

A Larkspur Data proposal, RFP answer, order form or contract summary commits to an uptime SLA, or to any other level of availability, only when it states that the customer is on the Enterprise package or, as a negotiated special term, that the customer spends at least 100,000 US dollars a year after discount; for every other customer it makes no availability commitment, however softly worded.

- Larkspur sells two packages, Standard and Enterprise. Enterprise includes an uptime SLA of 99.9% a month with service credits; Standard includes no SLA.
- An availability commitment is anything the customer could hold Larkspur to about uptime: an SLA, an uptime percentage that is guaranteed, committed, promised or given as a target the customer can expect, service credits or refunds for downtime, or a promise that the service will stay up.
- Larkspur's past measured uptime (99.95% over the last 12 months, on its status page) may be stated as a fact, and a document may say that the uptime SLA comes with the Enterprise package.

Apply it to every document you write or edit under `proposals/` and `orders/`, even when the
document is one step of a longer task.

## Why

An uptime SLA is a contractual promise with money attached: service credits, and sometimes the
right to leave. Larkspur prices it into Enterprise and gives it as a special term only to large
accounts, where it is one piece of a negotiation, not a default. Whatever a proposal or an RFP
answer says about uptime is quoted back later by the customer's lawyers and procurement team, so a
"we aim for 99.9%" written to sound reassuring becomes a promise. RFPs ask for an SLA as a matter
of course, which makes it tempting to answer with one.

## What counts as a commitment

- "Uptime SLA: 99.9%", "our standard SLA", or an SLA among an order form's special terms, even
  one marked "subject to approval";
- "we guarantee 99.9%", "we commit to", "we aim for 99.9%", "you can count on the same 99.95%";
- service credits, refunds, free months or exit rights for downtime;
- "Larkspur will always be up".

## What you can say instead

- Past measured uptime as a fact, with its period: "99.95% over the last 12 months on our status
  page. That is our record, not a commitment."
- "This package does not include an uptime SLA. The Enterprise package includes a 99.9% monthly
  SLA with service credits."
- How the service is run (hosting, monitoring, how incidents are reported) without promising a
  level.
- For an eligible customer, state the basis in the same document: the Enterprise package, or, for
  a special term, an annual price after discount of at least \$100,000.

## Examples

Compliant, for a customer on Standard:

> **Availability.** Brightwell's Standard plan does not include an uptime SLA or service credits.
> Our status page shows 99.95% uptime over the last 12 months; that is our record, not a promise.
> If Brightwell needs a contractual uptime commitment, the Enterprise package includes a 99.9%
> monthly SLA with service credits, and we can quote it.

Violating, in the same document (Standard, 30 seats, \$24,000 a year):

> **Service levels.** Larkspur commits to 99.9% monthly uptime for Brightwell, with a 10% service
> credit for any month we fall short. We expect to keep delivering the 99.95% our customers saw
> last year.

## Before you commit

Read each changed file under `proposals/` and `orders/` for uptime, availability, SLA, credit and
reliability wording. For every commitment you find, check that the same document puts the
customer on Enterprise or at an annual price after discount of at least \$100,000. Remove or
rewrite any that does not, then check again.
