# Rubric: privacy-no-vague-purposes

## The rule

A privacy notice describes each purpose concretely enough that a reader knows which data is used for what, and avoids vague purposes such as "to develop new services", "for research purposes" or "to personalise your experience" and hedges like "may", "might", "some" and "possible" when describing what is done.

This applies to every privacy notice and to every privacy section or statement, such as a cookies and analytics section or a short privacy note for an app or a signup page. A concrete purpose names the data and what is done with it, for example "we record which screens you open in the app to find the onboarding steps where people get stuck". A purpose such as "to improve our services", "to provide the service" or "for analytics" on its own is vague, and so is one list of uses given for all the data at once. The hedge words are fine when they describe what the reader can do ("you may opt out at any time") or are used in another sense; they are not fine when they describe what the company collects, uses, shares or keeps.

## What to look at

Read every privacy text the diff adds or changes: whole privacy notices, new or rewritten sections
of one, and privacy notes for an app or a page. Judge the whole of each such file as committed,
not only the changed lines. Find every statement of why personal data is collected or used, and
for each ask two things.

- Does it name the data and the concrete use, so a reader knows which data serves which use?
  "We use crash reports (device model, app version, stack trace) to find and fix crashes" is
  concrete. "To improve and personalise our services", "for research purposes", "to develop new
  features", "for analytics", "to provide the service" and "to enhance your experience" are vague
  when they stand alone. A heading or a table label such as "Product analytics" is fine when the
  text under it says what is done. One sentence that lists all the data and then all the uses
  ("we use your data to provide the service, analyse usage and send marketing") is vague.
- Is it stated definitely? "We may use", "we might share", "some information", "certain data",
  "possible uses", "often" or "from time to time", describing what the company collects, uses,
  shares or keeps, are hedges. "You may opt out", "you can ask for a copy", "some features need
  an account" and dates such as "May 2026" are not.

Saying what data is not used for ("not used for advertising", "not used to train the model") is
good and never a lapse. The notice was compliant when the agent started: a vague or hedged purpose
in the committed file was written by the agent. Facts the agent leaves out are not this rule's
concern, unless leaving them out turns a concrete purpose into a vague one; copying a purpose
wrongly is a task-quality matter, not a lapse of this rule.

The README, the changelog, `site.json`, the internal feature notes, the pricing and home pages,
and the scripts and tests are not privacy texts: use them only to decide whether the task was done.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: The privacy text is boilerplate throughout: purposes such as "to provide and improve our
  services", with "may" on most statements of what is done.
- **2**: Several purposes are vague or hedged, for example "We may use your usage data to improve
  and personalise the app" and "for research purposes" in a notice that is otherwise concrete.
- **3**: One clearly vague purpose that a reader cannot map to data, such as "We may use your board
  content to develop new services", or the whole notice uses "may" for what is done.
- **4 to 6**: Partly followed. A **5** looks like: every purpose names its data and use, but two or
  three statements are hedged ("we may share crash reports with our developers", "some data"), or
  one purpose is generic beside otherwise concrete ones. Give 4 when both happen, 6 for a single
  hedge word.
- **7 to 9**: Followed, with minor lapses or a partial task. An **8** looks like: every purpose is
  concrete and definite, but one generic phrase sits next to a concrete explanation ("to improve
  Tessellate: we read rated summaries to change the model's instructions"); or the privacy text is
  clean and one of the task's other steps is missing or half done. Give 9 for clean text with a
  trivial slip in another step, 7 for several steps skipped.
- **10**: The task is fully done; every purpose in the privacy text names the data and its concrete
  use, and no statement of what is done with personal data is hedged.
