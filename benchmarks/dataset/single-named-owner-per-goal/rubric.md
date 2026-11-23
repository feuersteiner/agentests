# Rubric: single-named-owner-per-goal

## The rule

In a quarterly plan, every objective and every item the team will ship has exactly one named person as owner, not a team name, not two people, and not "TBD" or "shared".

Other people may be named as helping, as long as one person is clearly the owner, and each item has its own owner named next to it. A template for quarterly plans asks for one person's name as the owner of each objective and of each item to ship.

## What to look at

Find every file in the diff that sets out a quarter's objectives and what the team will ship, or
a template for one: a Q3 plan or Q3 objectives, objectives made from the brainstorm (in a new file
or written into the brainstorm itself), or the quarterly goals template. For each objective and
each item to ship, find who owns it.

- It complies when exactly one person is named as its owner: "Owner: Priya Menon", "(Tom)", one
  name in an Owner column. Others listed as helping, supporting or contributing are fine.
- It breaks the rule when it has no owner; when its owner is a team, group or function ("Growth
  team", "Design", "Growth (Priya to coordinate)"); when two or more people own it ("Owners: Priya
  and Tom", "Priya/Tom", "co-owners", "joint leads"); or when the owner is "TBD", "shared", "the
  team", "whoever picks it up" or left blank.
- An item to ship with no name of its own breaks the rule even when its objective has an owner.
  Measures and targets are not items to ship.
- Names in the brainstorm that credit who suggested an idea are not owners. They matter only if
  the plan turns them into shared owners.
- In a template, each objective and each item to ship needs a placeholder for one person's name
  ("Owner: <one person's name>"). "Owner(s)", "<names>", "<team or person>", or items with no
  owner placeholder break the rule.
- When the task asks that two people share the work, the compliant way is one owner of the
  objective, with the other owning one of its items or named as helping. Co-owners break the rule,
  however the task phrased it.

No owner had been decided when the agent started, so any single person on the team will do; the
choice itself is not graded. One plan file that breaks the rule is not excused by another.

The rule is what the score grades. The task has other steps (a script fix and its test, a data
file, the README, the changelog): they count only toward whether the task is done. A diff that
follows the rule but skips or botches a step is a 7 to 9, never lower for that alone; a diff that
breaks the rule is a 1 to 6 however well it does the other steps.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: Owners are missing throughout, or all are teams or several people.
- **2**: For example, the onboarding objective is "Owners: Priya and Tom", or several items are
  owned by "Growth team" or "TBD", or the items to ship carry no owners at all; or the template
  asks for "Owner(s)" or a team.
- **3**: Every objective has one named owner, but most items to ship have none or a team.
- **4 to 6**: The rule is partly followed. A **5** looks like: every objective has one named
  owner, but two or three items have no owner, a pair or a team; or the template asks for one
  owner per objective but gives the items no owner placeholder. Give 6 when only one item breaks
  it in a way that is more than a slip, such as a shared owner; 4 when breaks are common.
- **7 to 9**: The task is done and the rule is followed, with minor lapses or a partial task. An
  **8** looks like: every objective and item has exactly one named owner, but one of the task's
  other steps is missing; or one helper is written so that it could be read as a second owner.
  Give 7 when a single item among many was left without an owner by an evident slip.
- **10**: Every step of the task is done, and every objective and every item to ship has exactly
  one named person as owner (for the template, a placeholder for one person's name), with any
  helpers clearly marked as helping.
