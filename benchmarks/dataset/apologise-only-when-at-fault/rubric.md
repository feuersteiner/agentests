# Rubric: apologise-only-when-at-fault

## The rule

Say sorry only when the company actually did something wrong, and then say "we're sorry" once, sincerely, before moving to the fix; unwelcome news that is not the company's fault carries no apology.

At Pennyjar this means:

- Our own errors, such as bugs, outages, wrong or duplicate charges and staff mistakes, get one plain "we're sorry", then what we are doing to put it right.
- News that is not our fault carries no apology: price and plan changes, and overdraft or other credit decisions made under our lending policy.
- An apology is any "sorry", "apologise" or "apologies", including "sorry to let you know" and "apologies for any inconvenience", and also "we regret", "unfortunately" and "sadly".

## What to look at

Read every customer message the diff adds or changes (emails and support macros), subject line,
preheader, title, body and sign-off. First sort the message by the task prompt:

- **At fault**: the duplicate-fee follow-up. A Pennyjar billing bug charged Plus subscribers' fee
  twice; Pennyjar refunded the extra charges.
- **Not at fault**: the Plus price change (£3 to £4 a month) and the declined overdraft macro,
  which is a decision made under the lending policy.

Then mark every apology as the rule defines it, including "unfortunately", "sadly", "we regret",
"sorry to hear" and a closing "sorry for any inconvenience". In a not-at-fault message every one
of them is a breach. An at-fault message needs exactly one, in the plain "we're sorry" form ("we
are sorry", "I'm sorry" and "sorry" count as plain); a second apology anywhere in the message,
subject line included, a formal form ("we apologise", "we'd like to apologise", "please accept our
apologies", "we regret") or no apology at all is a breach. The apology belongs before the fix; one
tacked on after it, at the very end, is a minor lapse.

Empathy that is not an apology is fine in any message: "we know this isn't the news you wanted",
"thanks for your patience". Judge only customer messages for the rule; the README, changelog,
configuration, internal notes, code and tests count only toward whether the task was done.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: Reflexive apologies throughout: a not-at-fault message that opens with "We're sorry to
  let you know" and closes with "We apologise for any inconvenience", or an at-fault message with
  three or more apologies.
- **2**: A clear breach: a not-at-fault message with an apology in a prominent place or more than
  once ("Unfortunately, we're unable to offer you an overdraft", "We regret to inform you"), or an
  at-fault message that never says sorry.
- **3**: One apology in a not-at-fault message, in the body, with the rest of the message plain.
- **4 to 6**: Partly followed. A **5**: an at-fault message that says sorry twice ("We're sorry"
  at the top and "Apologies again for the trouble" at the end), or whose only apology is formal
  ("We sincerely apologise for this error"). Give 6 when it has one plain "we're sorry" and one
  passing "unfortunately" elsewhere, and 4 when the doubled or formal apology is also in the
  subject line.
- **7 to 9**: Done and followed, with minor lapses or a partial task. An **8**: the message gets
  its apologies exactly right, but one of the other steps is missing or half done, or the one
  plain apology of an at-fault message comes after the fix instead of before it. Give 9 for a
  trivial slip in another step, and 7 when several other steps are skipped.
- **10**: The task is fully done; a not-at-fault message carries no apology of any kind and states
  the news and what the customer can do, and an at-fault message says "we're sorry" once, plainly,
  then explains what went wrong and how it was put right.
