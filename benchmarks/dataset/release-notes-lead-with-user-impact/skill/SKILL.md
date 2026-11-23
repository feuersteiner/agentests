---
name: release-notes-lead-with-user-impact
description: Our writing rule for telling customers what changed in the product. Use whenever writing or editing release notes, a hotfix note, a customer-facing changelog entry, a "What's new" email or any other list of product changes for customers, typically the Markdown under content/release-notes/, content/changelog.md and emails/, even when the request only asks to turn commit messages or tickets into notes.
---

# Release notes lead with user impact

## The rule

Each release-note item starts by telling users how the change affects them ("You can now…", "You no longer need to…"), not by describing what the team did ("We've fixed…", "Fixed a bug where…", "Refactored…").
An item is each bullet, numbered point or short section that describes one change in release notes, a customer-facing changelog or a "What's new" email. Its first sentence, after any heading or short label naming the feature, says what the reader can now do, can no longer do or no longer needs to do, or what now works differently for them. It does not open with the team's work: "we" as the one acting ("We've added…"), a statement that work was done, in any voice ("Fixed…", "Improved…", "Resolved…", "Duplicate submissions fixed"), or a bare name for the work ("New file-upload field type", "Performance improvements", "Bug fixes"). What the team did and why may follow the effect. A change users would not notice, such as a refactor or a dependency upgrade, is left out. Titles, subject lines, headings over a group of items, version and date lines, an introduction and a sign-off are not items.

Apply it to every item you write or change for the whole task, and check it again before you
commit.

## Why

Customers read release notes to find out what is different for them. Commit messages and tickets
describe the work from the team's side, and notes that keep that shape make every reader translate
"Fixed race in submit handler" into what it means for their forms. Opening with the effect answers
their question first; the cause can follow for those who care.

## How to write it

1. Go through the source changes and drop the ones customers would not notice: refactors,
   dependency bumps, CI, logging and storage details.
2. For each remaining change, ask "what can the reader do now, or stop doing, or what works
   differently for them?" and open the item with that answer.
3. Good openings: "You can now…", "You can no longer…", "You no longer need to…", "Your exports
   now…", "Forms with many fields open faster…".
4. Then add the details: limits, where to find it, and, if useful, what was wrong before.

## Gotchas

- Commit verbs at the start: "Added…", "Fixed…", "Improved…", "Updated…", "Resolved…".
- The team as the subject: "We've added…", "We're introducing…", "Our team fixed…".
- Passive work done: "Duplicate submissions fixed", "The inbox has been redesigned".
- A bare feature name as the whole item: "Bulk delete", "Performance improvements", "Bug fixes".
- A removal still affects someone: say what they can no longer do and what to use instead.
- Marketing emails follow it too: the intro may say "we", but each change opens with the reader.

## Example

From a calendar app's release notes.

Compliant:

```markdown
- You can now share a calendar with someone outside your organisation, as view-only.
- Your reminders no longer fire twice when you edit an event after setting them.
```

Violating:

```markdown
- Added external sharing for calendars (view-only).
- Fixed a bug where reminders fired twice after an event was edited.
- Refactored the notification scheduler.
```

## Before you commit

Reread every item you wrote, from the first word. If an item opens with "we", a verb of work
done, or a bare name, rewrite its first sentence around the reader. If it describes a change
nobody outside the team would notice, delete it. Then check again.
