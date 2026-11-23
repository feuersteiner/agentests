---
name: never-voice-the-mascot
description: Covers how Pip, the dog in the Parcelpup logo, may appear in copy. Use whenever you write or edit customer-facing Parcelpup copy that could include Pip or a Pip illustration, such as an email or newsletter in emails/, a website page in content/, or app strings in locales/ (empty states, error screens, onboarding), even if the request only asks for an illustration and says nothing about how Pip is written.
---

# Pip is a picture, never a voice

## The rule

Parcelpup's brand mascot never speaks, is never quoted, and no content is written from its point of view; it appears only as an illustration or a passive visual element.

The mascot is a dog called Pip, who appears only in the illustrations listed in brand/assets.md, such as sleeping-pip.svg. Emails, pages and app strings give Pip no words (not even a bark), thoughts, feelings, opinions or actions, and credit nothing to Pip, such as "Pip's tips"; they may place an illustration and say in its alt text or caption what it shows.

Apply it to every piece of copy you write or edit, for the whole task: subject lines, headings,
body, buttons, sign-offs and app strings.

## Why

Parcelpup speaks to customers in one voice, its own: "we", plain and direct. A talking dog is a
second voice that has to be kept up everywhere, gets in the way when the message is serious (a
lost parcel, a failed payment), and reads as childish to many customers. So Pip stays what a logo
is: a drawing. The warmth comes from the illustration and from how we write, not from a character.

## How to use Pip

- Pick an illustration from brand/assets.md and reference it by filename, the way that file says
  for emails, pages and app strings.
- Write alt text or a caption that says what the picture shows: "Pip, the Parcelpup dog, running
  past a row of front doors".
- Write everything else in Parcelpup's own voice. It can be friendly or funny without Pip in it.
- "Featuring Pip", "with Pip", "starring Pip" in a request means: use an illustration.

## Gotchas

Each of these breaks the rule, though only the first looks like dialogue:

- "Woof! Pip here." or any first-person line as the dog, and any "Woof!" or "Arf!".
- A quote or speech bubble from Pip, or a sign-off such as "Tail wags, Pip".
- "Pip is so happy you're here", "Pip can't wait": feelings.
- "Pip fetched your parcel", "Pip is keeping watch", "Pip went looking": actions in body copy.
- "Pip's tips", "Pip's picks", "Pip recommends": content credited to Pip.
- "Say hi to Pip" or "Pip will let you know": Pip as someone the reader deals with.

## Example

A "payment failed" banner in the app.

Compliant:

```json
{
  "illustration": "pip-searching.svg",
  "illustrationAlt": "Pip, the Parcelpup dog, beside an empty box",
  "title": "Your payment did not go through",
  "body": "Check your card details and try again. Your parcels stay tracked in the meantime."
}
```

Violating:

```json
{
  "illustration": "pip-searching.svg",
  "illustrationAlt": "Pip looking sad",
  "title": "Ruh-roh! Pip couldn't fetch your payment",
  "body": "I've checked under every doormat. Could you try your card again? - Pip"
}
```

## Before you commit

Reread every piece of copy you created or changed and search it for "Pip", "pup", "dog", "woof",
"paw", "tail" and "sniff". For each hit outside a filename, alt text or caption, rewrite the line
in Parcelpup's own voice without Pip in it. Then check again.
