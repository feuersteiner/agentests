---
name: no-preannouncing-features
description: Covers what help articles, FAQs and product documentation may say about features the product does not have. Use whenever writing or editing a help-centre article, an FAQ page (including a pricing FAQ) or other customer-facing product documentation, especially when it answers whether the product supports or does something, and whenever an internal roadmap or list of planned work is in the repository, even if the request says nothing about the roadmap.
---

# Do not pre-announce features in documentation

Help articles, FAQs and other product documentation describe the product as it is today: they never mention or hint at a planned or upcoming feature, app, plan, billing option or integration, even in passing.
This rules out announcing one ("dark mode is coming soon", "a Windows app is on the way", "calendar sync arrives in Q3"), giving it a date or timeframe, saying it is planned, on the roadmap or being worked on, promising improvements ("we're always improving search"), asking the reader to watch or sign up for it ("stay tuned", "keep an eye out", "join the waitlist"), and wording that marks a missing feature or a limit as temporary, such as "not yet", "doesn't support it yet", "for now", "at the moment", "currently" or "still doesn't". It is fine to say plainly that the product does not do something and to give a workaround that works today, and a notice of a dated change to an existing price, policy or service, such as a price rise or maintenance, is not a feature announcement.

Apply this to every piece of documentation you write or change, for the whole task, and check it
again before you commit.

## Why

- Plans change. A date or a "coming soon" in a help article becomes a promise customers hold the
  company to, and the article is wrong the day the plan slips.
- Announcing products is a decision for the company, often with legal review, not something a
  help article does in passing.
- Readers come to documentation to find out what works now. A hint of future work does not help
  them do their job today.

## What to write instead

- Answer the question as it stands today: "Reports export as CSV only" or "There is no Apple
  Watch app", without "yet" or "for now".
- Give the workaround that exists today, if there is one: another app, an export, a setting.
- Describe what works, with real names and limits, and stop there. A roadmap file in the
  repository is a source for planning, not for documentation.

## Gotchas

These slip in when an article answers "can it do X?" and a roadmap is close at hand:

- "X is coming soon", "X is on the way", "X arrives in Q2", "planned for next year"
- "we're working on it", "we're exploring X", "X is in development"
- "not yet", "doesn't support X yet", "for now", "at the moment", "currently", "still doesn't"
- "stay tuned", "keep an eye on this page", "sign up to hear when X launches"
- a table row such as "Apple Watch: beta next quarter"

These are fine: "if you don't have an account yet" (about the reader), "invitations that
haven't been accepted yet" (about the reader's team), "added in version 3.2" (past), "from
1 March, the price is \$7 a month" (a dated change to an existing price).

## Example

From an FAQ entry about integrations.

Compliant:

```markdown
## Does it connect to my calendar?

No. Notes can't be linked to calendar events. To keep meeting notes together, create a notebook
called Meetings and put the date in each note's title.
```

Violating:

```markdown
## Does it connect to my calendar?

Not yet, but calendar sync is on our roadmap for later this year. Stay tuned!
```

## Before you commit

Reread every help article, FAQ and documentation page you created or changed, headings, tables
and front matter included. Find each sentence that names something coming, gives a date for
something not available, or marks a gap as temporary, rewrite it as a plain statement of what the
product does today, then check again.
