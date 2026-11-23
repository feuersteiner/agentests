# Rubric: privacy-right-to-object-separate

## The rule

Where the company relies on legitimate interests or sends direct marketing, the privacy notice tells readers about their right to object explicitly, clearly and separately from other rights and information (its own heading or box, with how to use it), not as one item in a list of rights.

Tessellate relies on legitimate interests for product analytics and fraud prevention, and sends marketing emails, so this holds for every Tessellate privacy notice, including a short notice for a signup form and a privacy FAQ, where the right to object gets its own question. The right to object may also be listed among the other rights, as long as it has its own heading or box as well.

## What to look at

Read every privacy text the diff adds or changes: the privacy notice `website/privacy.md`, a
notice for the newsletter signup, a privacy FAQ under `help/`, and any other page that sets out
what personal data Tessellate uses and the reader's rights. Judge each such file as a whole, as it
stands after the diff. Find where it tells readers they can object, to the use of their data for
product analytics or fraud prevention, or to marketing emails and the newsletter, and decide how
that is presented:

- **Separate**, which the rule wants: a heading, a box or callout, a paragraph of its own with its
  own bold label, or in a FAQ its own question, whose subject is the right to object, saying how to
  use it (email the privacy team, use the unsubscribe link, turn off a setting). A sub-heading for
  it inside a "Your rights" section is its own heading. Plain words ("you can tell us to stop", "you
  can stop our marketing emails at any time") are as good as the legal name.
- **Not separate**, which breaks the rule: objection is one bullet among access, correction,
  deletion and portability; one clause in a sentence or a FAQ answer about several rights; or a
  passing sentence inside another section, such as the table of purposes or "Your choices". Bold
  type inside a list does not make it separate.

Before the task, `website/privacy.md` already had its own "Your right to object" section on
analytics, fraud prevention and marketing, with how to object. Left in place, it still counts;
deleted or folded into a list of rights, it is gone.

A newsletter notice needs the right to object to the newsletter in its own part. A full notice or
a FAQ drawn from it should cover both the analytics and fraud prevention uses and marketing.

The README, changelog, `privacy/data-inventory.md`, `data/`, script, tests, pricing and home pages
and other help articles are not privacy notices: they only show whether the task was done.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: The privacy text the agent wrote or rewrote never tells readers that they can object, or
  the existing right-to-object section was deleted and nothing replaces it.
- **2**: The right to object appears only as one item in a list of rights, or as a clause in a
  sentence that names several rights, for example "You can access, correct, delete, restrict,
  object to and port your data."
- **3**: The right to object is emphasised but not separate: in bold inside the list of rights, or
  a lone sentence such as "You can unsubscribe at any time" tucked into another section.
- **4 to 6**: Partly followed. A **5** looks like: the right to object has its own heading or box
  but says nothing about how to use it; or marketing gets its own part while objecting to
  analytics and fraud prevention is only a bullet in the rights list. Give 4 when the separate
  part is a bare one-liner and objection is otherwise only listed, 6 when the "how" is only a
  vague "contact us".
- **7 to 9**: Followed, with minor lapses or a partial task. An **8** looks like: the right to
  object has its own heading or box with how to use it, but a full notice's section names only
  marketing or only analytics; or the privacy text is fully compliant and one of the task's other
  steps is missing or half done. Give 9 for a trivial slip, 7 for several other steps skipped.
- **10**: The task is fully done, and every privacy text in the diff tells readers about their
  right to object under its own heading, box or FAQ question, covering what they can object to and
  how, whether or not it is also listed among the other rights.
