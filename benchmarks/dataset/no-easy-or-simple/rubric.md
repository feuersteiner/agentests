# Rubric: no "easy", "simple", "quick" or "just"

## The rule

Help articles, emails to users and interface text do not tell the reader that a task, a setup or a feature is easy, simple or quick, or "just" a matter of doing something; they describe the steps and let the reader judge.
This covers any wording that says or implies the work takes little effort, skill or time, such as "simply", "just paste", "effortless", "a breeze", "in a few clicks", "in seconds", "in no time", "anyone can do it" and "no technical skills needed". It does not cover a word that describes something other than the reader's effort ("an easy-to-read chart", "you just published", "only owners can"), the name of a plan or feature, or a stated count or duration ("four steps", "about ten minutes").

## What to look at

1. Grade only reader-facing text the diff adds or changes: help articles, emails to users
   (subject line and preheader included) and interface strings. Changelogs, READMEs, internal
   notes, config, scripts, tests and code comments are not graded, whatever words they use.
2. In that text, list every phrase that tells the reader a task, setup or feature takes little
   effort, skill or time, in any wording: easy, easily, simple, simply, quick, quickly, fast,
   effortless, painless, hassle-free, straightforward, a breeze, a snap; "just" or "only" used to
   shrink a step ("just paste", "it only takes a moment", "all you need to do is"); vague speed or
   size claims ("in seconds", "in minutes", "in no time", "in a few clicks"); claims about skill
   ("anyone can", "no technical skills needed", "no coding required"); and sign-offs that present
   the work as slight ("That's it!", "It's that simple").
3. Do not count: a word that describes something other than the reader's effort (a simple text
   field, an easy-to-read chart, a short form); "just" or "only" in another sense (you just
   published, only owners can, at least one field); how fast the product itself acts (deliveries
   arrive within 10 seconds); a plan or feature name; a stated count or duration (six steps, about
   ten minutes, 3 forms).
4. Weigh where each claim sits. A title, heading, subject line, preheader, opening sentence or
   interface title that promises ease is worse than a filler "just" inside a step.
5. Check the task: each step of the prompt was done, and the text asked for is complete, accurate
   to the product notes it was to be written from, and usable by its reader. Do not lower the score
   for a skipped chore beyond the 7 to 9 band.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: ease is the pitch of the piece, in its title, subject
  or opening and again through the body. A 2: the opening, a heading or the subject promises that
  the task is easy, simple or quick, or ease claims recur (four or more). A 3: no promise up
  front, but several ease claims in the body (three or so).
- **4 to 6**: partly followed. A 4: two ease claims in body text. A 5: one clear ease claim in body
  text ("simply paste the URL", "takes just a minute") in text that otherwise describes the steps.
  A 6: one faint one, such as a single filler "just" before a step or a closing "That's it."
- **7 to 9**: the rule is followed. Use 7 or 8 when a step of the task was skipped or the text is
  thin or inaccurate, or when one phrase is arguable under point 3; 9 when the rule is fully
  followed and only a small part of the task is missing.
- **10**: every step of the task is done and no reader-facing text states or implies that anything
  is easy, simple, quick or "just" a matter of doing something.

## Anchors

- **2**: a help article that opens "Setting up the integration is quick and easy" and whose steps
  say "simply click" and "just paste".
- **5**: an article whose opening and steps are factual, with one step that reads "Simply copy the
  key and paste it into your app."
- **8**: text with no ease claim, where the changelog line the task asked for is missing; or
  complete work where one phrase, such as "a short form", could be read either way.
- **10**: the whole task done; the text says what the reader needs before starting, gives the steps
  in order with their real names and limits, and never comments on how easy or fast they are.
