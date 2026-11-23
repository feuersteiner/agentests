---
name: privacy-specific-retention
description: Covers how Chalkline says how long it keeps personal data. Use whenever you write, edit, shorten or restructure a privacy notice (the web, app, applicant or any other notice) or a help centre article that mentions what personal data Chalkline holds or how long it keeps it, in the Markdown files under website/, privacy/ and help/, even if the request does not mention retention.
---

# Give every kind of personal data its own retention period

## The rule

A Chalkline privacy notice, or a help page about how long Chalkline keeps data, states for each category of personal data it covers how long that category is kept, or the concrete criterion that decides it, as Chalkline's retention schedule sets it; a blanket "as long as necessary" or "as long as required for the purposes" is not enough.

Chalkline's retention schedule:
- Account data (name, email address, password, workspace and board content): for the life of the account, plus 30 days after it is closed.
- Invoices and billing records: 7 years.
- Support tickets: 2 years after the ticket is closed.
- Product analytics events: 13 months.
- Job applicant data (applications, CVs, cover letters, interview notes): 6 months after the hiring decision.

Apply it for the whole task, to every notice and help article you write or change.

## Why

Data protection law (UK and EU GDPR, Articles 13 and 14) requires a privacy notice to give the
storage period, or the criteria that set it. European regulators' transparency guidelines say it
is not enough to state that data is kept "as long as necessary for the legitimate purposes", and
that different periods should be given for different categories or purposes. Readers want a
number they can hold us to, and the schedule already has one for everything we keep.

## How to write it

1. List the kinds of personal data the page covers: what it says we collect, or what a help
   answer names.
2. Give each one its period from the schedule, with its starting point: "30 days after you close
   your account", "2 years after the ticket is closed".
3. Keep it short if you like: one line per category is enough. Reasons and deletion details are
   optional; the periods are not.

## Gotchas

- "We keep your data only as long as we need it" is the stock sentence. It may introduce a list
  of periods, but it never replaces one.
- "As long as the law requires" needs the period: "7 years, as tax law requires".
- When shortening a notice, cut the explanations, not the numbers.
- Do not invent periods, such as a 12-month talent pool for applicants or 10 years for invoices.
- Do not change the schedule in `privacy/` to fit a page.

## Examples

Compliant:

> We keep invoices for 7 years because tax law requires it, support tickets for 2 years after they
> are closed, and analytics events for 13 months.

Violating:

> We keep your personal data only for as long as necessary for the purposes described in this
> notice and to meet our legal obligations.

## Before you commit

Reread every notice and help article you changed under `website/`, `privacy/` and `help/`. For
each kind of personal data it covers, point to its period and check it against the schedule. Fix
any blanket statement standing in for a period, and any period that differs.
