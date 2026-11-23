---
name: no-easy-or-simple
description: Covers how user-facing copy talks about effort. Use whenever writing or editing a help article, a getting-started or setup guide, an onboarding or other email to users, or interface text such as empty states, tooltips and button labels, even if the request says nothing about tone or wording.
---

# Do not call anything easy, simple, quick or "just"

Help articles, emails to users and interface text do not tell the reader that a task, a setup or a feature is easy, simple or quick, or "just" a matter of doing something; they describe the steps and let the reader judge.
This covers any wording that says or implies the work takes little effort, skill or time, such as "simply", "just paste", "effortless", "a breeze", "in a few clicks", "in seconds", "in no time", "anyone can do it" and "no technical skills needed". It does not cover a word that describes something other than the reader's effort ("an easy-to-read chart", "you just published", "only owners can"), the name of a plan or feature, or a stated count or duration ("four steps", "about ten minutes").

Apply this to every piece of user-facing copy you write or change, for the whole task, and check
it again before you commit.

## Why

- What is easy for the writer may not be easy for the reader. Someone who gets stuck on a step
  that was called simple blames themselves, or stops trusting the page.
- The words carry no information. The sentence almost always says the same without them, and the
  steps themselves show how much work there is.
- Readers of help content are often there because something already went wrong.

## What to write instead

- Say what the reader needs before starting, then give the steps in order, with the real names of
  buttons and settings.
- Give a number when you know it: how many steps, how long it takes, what the limit is. "Takes
  about ten minutes" lets the reader judge; "takes no time at all" does not.
- Delete the word and reread the sentence. "Simply click **Save**" becomes "Click **Save**".

## Gotchas

These slip in by habit, mostly in titles, subject lines, opening sentences and sign-offs:

- "Getting started is quick and easy", "It's easy to …", "easily connect …"
- "Simply …" and "Just …" in front of a step, and "all you need to do is …"
- "in seconds", "in minutes", "in no time", "in just a few clicks"
- "effortless", "painless", "hassle-free", "a breeze", "straightforward"
- "no technical skills needed", "anyone can …", "no coding required"
- "That's it!", "It's that simple", "You're all set in no time"

These are fine: "a simple text field" (describes the field), "you just saved a draft" (time),
"only admins can invite members" (a limit), "the Quick Share menu" (a name), "three steps" and
"about five minutes" (stated facts).

## Example

From a help article about inviting teammates.

Compliant:

```markdown
# Invite teammates

You need the Admin role. Each invitation is valid for 7 days.

1. Open **Settings > Members**.
2. Click **Invite** and enter one email address per line.
3. Choose a role for the new members, then click **Send invitations**.
```

Violating:

```markdown
# Invite teammates in seconds

Adding your team is quick and easy. Just open **Settings > Members**, simply paste their email
addresses and you're done!
```

## Before you commit

Reread every help article, email and interface string you created or changed, titles and subject
lines included. Find each word or phrase that comments on how easy, simple, quick or small a task
is, remove it or replace it with the fact behind it, then check again.
