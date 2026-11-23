# Rubric: no idioms in copy for translation

## The rule

Copy that will be translated avoids idioms, colloquial expressions and culture-specific references such as sports metaphors, local holidays and pop-culture jokes.
Every interface string in locales/en.json and every help article under content/help/ is translated. An idiom is a phrase whose meaning does not follow from its words, such as "hit the ground running", "a blank slate", "touch base" or "in the driver's seat"; a colloquial expression is slang or casual speech, such as "gonna", "no biggie", "awesome" or "heads-up"; a culture-specific reference is a sports metaphor ("knock it out of the park", "your new MVP"), a named holiday of one country or culture, or a film, show, song, meme or celebrity. Plain literal wording, ordinary phrasal verbs such as "sign in" and "set up", and standard software terms such as "dashboard" and "drag and drop" are fine.

## What to look at

1. Grade only the translated copy the diff adds or changes: the string values in locales/en.json
   and the help articles under content/help/. The changelog, README, internal notes,
   configuration, scripts, tests, JSON keys and placeholders are not graded, whatever words they use.
2. In that copy, list every phrase a word-for-word translation would garble or a reader in another
   country would not understand:
   - idioms, such as "a blank slate", "hit the ground running", "keep tabs on", "on the same page",
     "get the ball rolling", "do the heavy lifting", "set it and forget it", "never drop the ball";
   - colloquial expressions, such as "gonna", "awesome", "no biggie", "heads-up", "nothing to see
     here", "you're all caught up", "kick back";
   - culture-specific references: sports metaphors ("knock it out of the park", "a slam dunk", "a
     home run", "your MVP", "game plan"), named holidays or events of one country or culture
     (Thanksgiving, the Fourth of July, Black Friday), and films, shows, songs, memes or celebrities.
3. Do not count: literal wording; ordinary phrasal verbs (sign in, set up, log out, find out);
   standard software terms (dashboard, inbox, toolbar, drag and drop); a literal mention of a
   generic subject, such as the public holidays an admin adds to a calendar setting; product,
   plan and feature names.
4. Weigh each phrase. A title, heading, button or opening sentence built on an idiom or reference
   is worse than one phrase in body text. A clear idiom, slang word or culture reference counts in
   full; a mild, widely understood phrase such as "keep track of" or "at a glance" is a minor lapse.
5. Check the task: each step of the prompt was done, and the strings or article asked for are
   complete, consistent with the feature as the diff shows it, and usable by their reader. Do not
   lower the score for a skipped chore beyond the 7 to 9 band.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: idioms, slang or culture references in most of the
  new strings or throughout the article. A 2: three or more clear ones, or a title, heading or
  opening built on one with more in the body. A 3: two clear ones.
- **4 to 6**: partly followed. A 4: one clear idiom or reference in a title, heading or button. A 5:
  one clear idiom, slang word or culture reference in body text, the rest literal. A 6: two mild,
  widely understood phrases.
- **7 to 9**: the rule is followed. Use 7 or 8 when a step of the task was skipped or the copy is
  thin or inaccurate; 9 when the copy holds one mild, widely understood phrase, or a small part of
  the task is missing.
- **10**: every step of the task is done, and every new or changed string and article says
  literally what it means, in words that translate one to one.

## Anchors

- **2**: empty states that read "Your board is a blank slate. Hit the ground running by adding your
  first task!" and "Inbox zero! Time to kick back."
- **5**: a "What's new" modal that is literal except for "Let Orbitly do the heavy lifting."
- **8**: literal copy, where the changelog line the task asked for is missing; or complete work
  with one phrase such as "keep track of".
- **10**: the whole task done; the strings say what the screen shows and what the reader can do,
  with the real names of buttons and views, and nothing a translator would have to interpret.
