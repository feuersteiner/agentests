---
name: no-idioms-for-translation
description: Covers the wording of text that is translated into other languages. Use whenever writing or editing interface strings in a locale file such as locales/en.json (onboarding tours, empty states, "What's new" announcements, buttons, error messages) or a help-centre article under content/help/, even if the request says nothing about translation, tone or wording.
---

# No idioms in copy for translation

Copy that will be translated avoids idioms, colloquial expressions and culture-specific references such as sports metaphors, local holidays and pop-culture jokes.
Every interface string in locales/en.json and every help article under content/help/ is translated. An idiom is a phrase whose meaning does not follow from its words, such as "hit the ground running", "a blank slate", "touch base" or "in the driver's seat"; a colloquial expression is slang or casual speech, such as "gonna", "no biggie", "awesome" or "heads-up"; a culture-specific reference is a sports metaphor ("knock it out of the park", "your new MVP"), a named holiday of one country or culture, or a film, show, song, meme or celebrity. Plain literal wording, ordinary phrasal verbs such as "sign in" and "set up", and standard software terms such as "dashboard" and "drag and drop" are fine.

Apply this to every string and article you write or change, for the whole task, and check it
again before you commit.

## Why

- Translators, and the machine translation they start from, render the words, not the intent.
  "Hit the ground running" arrives in German or Japanese as a sentence about running.
- Many people read the English interface as a second language and meet the same problem.
- A sports, holiday or film reference that sounds friendly in one country means nothing, or
  something else, in another.

## What to write instead

- Say literally what the screen shows and what the reader can do next.
- Replace each figure of speech with its plain meaning: "a blank slate" becomes "empty", "touch
  base" becomes "contact", "keep tabs on" becomes "follow" or "check".
- Use the real names of buttons, views and settings.
- Ask of each phrase: would a word-for-word translation still say what I mean?

## Gotchas

These slip in by habit, mostly in titles, announcements, empty states and sign-offs:

- "a blank slate", "hit the ground running", "get the ball rolling", "nothing to see here"
- "do the heavy lifting", "set it and forget it", "never drop the ball", "on the same page"
- "a game-changer", "knock it out of the park", "a slam dunk", "your new MVP"
- "gonna", "awesome", "no biggie", "heads-up", "you're all caught up", "kick back"
- "just in time for Thanksgiving", "Fourth of July", quotes from films, shows or memes

These are fine: "Sign in", "Set up two-factor authentication", "Drag the card", "dashboard",
"public holidays" as a calendar setting, and the product's own names.

## Example

From the interface strings of a comments panel.

Compliant:

```json
"comments": {
  "emptyTitle": "No comments yet",
  "emptyBody": "Comments on this task appear here. Type @ and a name to notify a teammate.",
  "action": "Add a comment"
}
```

Violating:

```json
"comments": {
  "emptyTitle": "Crickets... nothing to see here!",
  "emptyBody": "Get the ball rolling and loop in your MVPs with an @mention.",
  "action": "Let's do this"
}
```

## Before you commit

Reread every string and article you created or changed, titles and buttons included. Find each
idiom, casual expression or culture-specific reference, replace it with the literal meaning, then
check again.
