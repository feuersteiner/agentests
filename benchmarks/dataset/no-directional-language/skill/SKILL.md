---
name: no-directional-language
description: Covers how user-facing copy sends readers to things in the app. Use whenever writing or editing a help article, a how-to or setup guide, an email to users, or interface text such as tooltips, onboarding tours, empty states and error messages, especially when it tells the reader where to click or which button, menu, tab or panel to use, even if the request only mentions a layout, a screenshot or a UI description.
---

# Name the control; never say where it is or what it looks like

Help articles, emails to users and interface text name the control, menu, tab, section or label the reader should find or use and never locate it by its position on the screen or page, its colour or the look of its icon ("in the right sidebar", "the button above", "the green icon at the top", "the gear icon"), even alongside its name.
This covers words such as left, right, top, bottom, corner, sidebar, above, below, next to and "scroll down", and a control's colour, shape or icon picture ("the pencil icon", "the three dots"). It does not cover a reference to a part of the text by its order ("the steps below", "the next section"), a control's own label that contains such a word ("select **Align left**"), or alt text that says what an image shows.

Apply this to every piece of user-facing copy you write or change, for the whole task, and check
it again before you commit.

## Why

- A screen reader user hears the control's name, not where it sits or what colour it is. "The gear
  icon in the corner" means nothing to them; "**Settings**" does.
- Layouts move. On a phone the sidebar is a menu and the top bar wraps; the next redesign moves the
  button. Names survive both, positions do not.
- Colour and icon shapes are not seen the same way by everyone, and an icon's picture is not its
  name.

## What to write instead

- Use the label exactly as the app shows it, in bold: "Select **Publish**".
- Give the path through menus and tabs by name: "Open **Settings** > **Members**".
- For a control inside a list or table, name the row and the control: "In the teammate's row, open
  **More**, then select **Remove**."
- In an email, name the link or button by its label: "Select **Open your dashboard**", not "click the
  button below".
- Design notes and UI maps describe where things sit for designers. Take the names from them,
  leave the positions, colours and icon descriptions out.

## Gotchas

- "in the top right corner", "on the left", "in the sidebar", "along the top", "at the bottom of
  the panel"
- "the button below" or "the link above" in an email
- "the green button", "the blue **Save** button", "the red **Delete** button"
- "the gear icon", "the pencil", "the three dots", "the + button", "the trash can"
- "scroll down to", "scroll up to"
- Tour and tooltip text: "Over here on the left are your fields" introduces the panel by place;
  "The **Fields** panel lists every field type" introduces it by name.

These are fine: "the steps below", "the table below", "in the next section" (parts of the text),
"select **Align left**" (a label), "right away", "top tips" (other senses).

## Example

From a help article about inviting teammates.

Compliant:

```markdown
1. Open **Settings** > **Members**.
2. Select **Invite**, and enter one email address per line.
3. Choose a role, then select **Send invitations**.
```

Violating:

```markdown
1. Click the gear icon at the bottom of the left-hand menu.
2. Hit the blue **Invite** button in the top right corner.
3. Pick a role and click the green button below the list.
```

## Before you commit

Reread every help article, email and interface string you created or changed, titles, tooltips
and subject lines included. For each instruction, ask: could someone who cannot see the screen
follow it from the names alone? Remove every position, colour and icon description, then check
again.
