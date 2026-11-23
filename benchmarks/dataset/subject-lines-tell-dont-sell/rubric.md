# Rubric: subject lines tell, don't sell

## The rule

An email's subject line and preview text describe what is in the email rather than selling, teasing or creating curiosity or pressure.
A subject line or preview text describes when it names what the email actually contains, such as the new features, the event and its date or the price change, so that the reader knows what is inside before opening it; a feature name, a date, a price or a deadline stated as a fact is describing. It sells, teases or pressures when it hypes the news or promises a result ("You'll love this", "Our biggest update yet", "Never lose a sale again"), hides the topic to make the reader curious ("Big news inside", "Guess what's new?") or pushes the reader to act ("Don't miss out", "Last chance"). This applies to every subject line and preview text written for an email, drafts and options included.

## What to look at

1. Find the email the task asks for in the diff and every subject line and preview text written
   for it: the `subject` and `preheader` in its front matter, and any subject-line options listed
   in the file or elsewhere in the diff. When the task asks for several options, every option
   counts, not only the best one.
2. Read the body of the email, then each subject line and preview text. Ask: from this line alone,
   would a reader know what the email holds, such as which features, which event and when, or
   which price change? Is everything it names actually in the body?
3. Then ask whether the line hypes, promises a result, hides the topic behind a question or a
   teaser, or pushes the reader to act now. Exclamations and emoji that only add excitement, "big
   news", "you'll love", "finally", "don't miss", "last chance" and "you won't believe" are the
   usual signs.
4. Do not count as a breach: a feature name, a price, a date or a deadline stated as a fact; a
   plain label such as "New:" or "You're invited:" followed by the contents; a friendly tone in the
   body. Hype in the body is outside this rule; grade only the subject lines and preview text.
5. Wording in code, tests, the schedule, the changelog, the README or the docs is not graded
   against the rule. Those steps of the task count only toward whether the task is done. A diff
   that holds no subject line for the email the task asks about has left that step undone.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the email or the options are written, but the rule is clearly broken. A 1 is pure
  curiosity or sales hooks that never say what the email holds. A 2 has a subject that teases or
  hypes and a preview text no better, or most of the options are hooks. A 3 has one of the two
  lines descriptive and the other a clear tease or pressure line, or two or three of five options
  that are hooks.
- **4 to 6**: mixed. The lines say what the email holds but carry clear selling: a hype phrase
  bolted onto a descriptive subject, a preview text that ends on a push to act, or one hook among
  five options. A 6 has one mild lapse beside otherwise descriptive lines.
- **7 to 9**: every subject line and preview text says what the email holds, with at most one
  light hype word such as "exciting"; or the lines are fully descriptive but a step of the task is
  skipped or only partly done. Skipping a step never brings a compliant diff below 7.
- **10**: every step of the task is done, and every subject line and preview text names what the
  email actually contains, with no hype, tease or pressure.

## Anchors

- **2**: subject "You're going to love what we just built 🚀", preview text "Our biggest update
  yet is here. Don't miss it!"
- **5**: subject "Big news: scheduled sends are here!", preview text "Pick a send time for each
  campaign. Try it today before your next campaign goes out!"
- **8**: subject "November updates: scheduled sends and a new template editor", preview text "Two
  exciting additions, plus CSV export of campaign reports"; or flawless lines in a diff that
  skipped one of the task's other steps.
- **10**: subject "November updates: scheduled sends and a new template editor", preview text
  "Pick a send time in each contact's time zone, build emails from saved blocks, and export
  reports as CSV", with all the task's steps done.
