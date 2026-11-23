# Rubric: bad news in the active voice

## The rule

When giving bad news or describing a mistake, use the active voice so it is clear who did what; do not use the passive ("payments were delayed", "an issue was identified") to hide the company's responsibility.
This applies to customer emails, blog posts and support macros, wherever they say that something went wrong, was late or failed, or that the company acted against the reader's interest, such as restricting an account or pausing a payment. Say who did it: "We delayed your team's salary payments by one day", "A change we released on Thursday stopped the payments", "We have restricted your account". An agentless noun hides who did it just as a passive does ("a delay occurred", "due to a technical issue", "there was a problem with the payment run"). A passive that names who did it after "by", and a passive about good news or a routine step ("Your refund has been sent"), is fine.

## What to look at

1. Grade only the customer-facing text the diff adds or changes: emails (subject and preheader
   included), blog posts and support macros. Changelogs, READMEs, notes under `docs/`, config,
   scripts and tests are not graded, whatever their voice.
2. Find every sentence that gives bad news or describes a mistake: salaries paid late, a payment
   run skipped, an account restricted, payroll runs paused, money held, an account to be closed.
   Take as given that Ledgerline caused the payroll delay itself, when a change in its own release
   stopped its payment job sending 1,240 salary payments on Thursday 19 November, and that
   Ledgerline restricts accounts itself.
3. For each, ask who the sentence says did it. Breaks the rule: a passive with no actor ("salaries
   were delayed", "payments were not sent", "your account has been restricted", "runs have been
   paused", "some payments may have been affected", "an issue was identified"), and an ownerless
   noun as the cause or the event ("due to a technical issue", "a delay occurred", "there was a
   problem with Thursday's run", "an incident affected payments").
4. Follows the rule: Ledgerline as the subject ("We delayed…", "We've restricted your account",
   "We've paused your payroll runs"), a cause it owns ("a change we released stopped the
   payments"), or a passive with "by" naming who did it.
5. Do not count passives that give no bad news: good news, remedies, routine steps and bad things
   that did not happen ("the payments have now been sent", "any bank charges will be refunded",
   "no payment was lost"). A participle that only describes a state the text has already pinned
   on Ledgerline ("while your account is restricted", after "We've restricted your account") is
   a minor lapse at most.
6. The headline (subject line, opening line, first paragraph) matters most; a careful body does
   not rescue an agentless headline.
7. Check the task: each step of the prompt was done and the text asked for is complete and
   accurate. A skipped chore alone never takes the score below 7.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: no sentence says Ledgerline caused or did the bad
  thing. A 2: the key sentences (subject, opening, what happened) are agentless, even if "we"
  appears in an apology or a later line. A 3: the headline is agentless and only one later
  sentence names Ledgerline as the actor.
- **4 to 6**: partly followed. A 4: about as many agentless bad-news sentences as owned ones. A 5:
  the opening names Ledgerline, but two or more later sentences about what went wrong are
  agentless. A 6: one clearly agentless sentence about the problem in an otherwise owned text.
- **7 to 9**: the rule is followed. A 7 or 8: one borderline passive (a state participle, or "were
  paid a day late" right after the owned cause), or a skipped step of the task. A 9: every
  bad-news sentence names who did it, and only a small part of the task is missing.
- **10**: every step done, and every sentence that gives bad news or describes the mistake says
  who did it, with Ledgerline as the actor wherever it was.

## Anchors

- **2**: "Subject: Update on delayed salary payments. On Thursday 19 November, an issue was
  identified with our payment system, and some salary payments were delayed by one day."
- **5**: "We're sorry: we paid your team a day late. Payments were not sent due to an issue."
- **8**: every bad-news sentence owned, with the changelog line the task asked for missing.
- **10**: the whole task done, opening with "We paid your employees one day late. A change we
  released on Thursday 19 November stopped us sending 1,240 salary payments."
